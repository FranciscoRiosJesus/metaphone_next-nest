import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAthleteDto } from './dto/create-athlete.dto';
import { CheckDuplicateDto } from './dto/check-duplicate.dto';
import {
  normalizeName,
  normalizeEmail,
  getPhoneticKeys,
  arePotentialDuplicates,
  DuplicateCheckResult,
  DuplicateLevel,
} from '@athlete-dedup/shared';

export interface DuplicateCheckResponse {
  isDuplicate: boolean;
  level: DuplicateLevel;
  confidence: number;
  details: string;
  matchedAthlete?: {
    id: string;
    firstName: string;
    lastName: string;
    parentEmail: string;
  };
}

@Injectable()
export class AthletesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.athlete.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async checkDuplicate(dto: CheckDuplicateDto): Promise<DuplicateCheckResponse> {
    const normalizedFirst = normalizeName(dto.firstName);
    const normalizedLast = normalizeName(dto.lastName);
    const [metaphoneFirst] = getPhoneticKeys(dto.firstName);
    const [metaphoneLast] = getPhoneticKeys(dto.lastName);
    const normalizedEmail = dto.parentEmail
      ? normalizeEmail(dto.parentEmail)
      : '';

    // Step 1: Check exact normalized match
    const exactMatches = await this.prisma.athlete.findMany({
      where: {
        normalizedFirstName: normalizedFirst,
        normalizedLastName: normalizedLast,
      },
    });

    if (exactMatches.length > 0) {
      const match = exactMatches[0];
      return {
        isDuplicate: true,
        level: 'exact',
        confidence: 1.0,
        details: `Exact normalized match found: "${match.firstName} ${match.lastName}"`,
        matchedAthlete: {
          id: match.id,
          firstName: match.firstName,
          lastName: match.lastName,
          parentEmail: match.parentEmail,
        },
      };
    }

    // Step 2: Check phonetic matches from DB
    const phoneticCandidates = await this.prisma.athlete.findMany({
      where: {
        OR: [
          {
            metaphoneFirstName: metaphoneFirst,
            metaphoneLastName: metaphoneLast,
          },
          ...(normalizedEmail
            ? [{ normalizedParentEmail: normalizedEmail }]
            : []),
        ],
      },
    });

    // Step 3: Run full deduplication logic against each candidate
    let bestMatch: DuplicateCheckResponse | null = null;

    for (const candidate of phoneticCandidates) {
      const result: DuplicateCheckResult = arePotentialDuplicates(
        {
          firstName: dto.firstName,
          lastName: dto.lastName,
          parentEmail: dto.parentEmail,
        },
        {
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          parentEmail: candidate.parentEmail,
        },
      );

      if (result.isDuplicate) {
        if (!bestMatch || result.confidence > bestMatch.confidence) {
          bestMatch = {
            isDuplicate: true,
            level: result.level,
            confidence: result.confidence,
            details: result.details,
            matchedAthlete: {
              id: candidate.id,
              firstName: candidate.firstName,
              lastName: candidate.lastName,
              parentEmail: candidate.parentEmail,
            },
          };
        }
      }
    }

    if (bestMatch) {
      return bestMatch;
    }

    return {
      isDuplicate: false,
      level: 'none',
      confidence: 0,
      details: 'No duplicate detected',
    };
  }

  async create(dto: CreateAthleteDto) {
    // Always run dedup check server-side before creating
    const dupCheck = await this.checkDuplicate({
      firstName: dto.firstName,
      lastName: dto.lastName,
      parentEmail: dto.parentEmail,
    });

    if (dupCheck.isDuplicate && (dupCheck.level === 'exact' || dupCheck.level === 'phonetic')) {
      throw new ConflictException({
        message: 'Duplicate athlete detected',
        duplicateCheck: dupCheck,
      });
    }

    if (dupCheck.isDuplicate && dupCheck.level === 'similar') {
      throw new ConflictException({
        message: 'Possible duplicate athlete detected',
        duplicateCheck: dupCheck,
      });
    }

    // Compute derived fields
    const normalizedFirstName = normalizeName(dto.firstName);
    const normalizedLastName = normalizeName(dto.lastName);
    const normalizedParentEmail = normalizeEmail(dto.parentEmail);
    const [metaphoneFirstName] = getPhoneticKeys(dto.firstName);
    const [metaphoneLastName] = getPhoneticKeys(dto.lastName);

    try {
      return await this.prisma.athlete.create({
        data: {
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          position: dto.position.trim(),
          parentEmail: dto.parentEmail.trim(),
          normalizedFirstName,
          normalizedLastName,
          normalizedParentEmail,
          metaphoneFirstName,
          metaphoneLastName,
        },
      });
    } catch (error: any) {
      // Handle unique constraint violation (race condition safety net)
      if (error?.code === 'P2002') {
        throw new ConflictException({
          message: 'Duplicate athlete detected (database constraint)',
          duplicateCheck: {
            isDuplicate: true,
            level: 'exact' as DuplicateLevel,
            confidence: 1.0,
            details: 'Database unique constraint violation',
          },
        });
      }
      throw new InternalServerErrorException('Failed to create athlete');
    }
  }
}
