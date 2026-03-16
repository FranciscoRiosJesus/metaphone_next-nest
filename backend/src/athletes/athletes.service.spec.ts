import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { AthletesService } from './athletes.service';
import { PrismaService } from '../prisma/prisma.service';

const mockAthletes = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Smith',
    position: 'Forward',
    parentEmail: 'parent@test.com',
    normalizedFirstName: 'john',
    normalizedLastName: 'smith',
    normalizedParentEmail: 'parent@test.com',
    metaphoneFirstName: 'JN',
    metaphoneLastName: 'SM0',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockPrismaService = {
  athlete: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

describe('AthletesService', () => {
  let service: AthletesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AthletesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AthletesService>(AthletesService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all athletes', async () => {
      mockPrismaService.athlete.findMany.mockResolvedValue(mockAthletes);
      const result = await service.findAll();
      expect(result).toEqual(mockAthletes);
      expect(mockPrismaService.athlete.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('checkDuplicate', () => {
    it('should detect exact normalized duplicate', async () => {
      mockPrismaService.athlete.findMany.mockResolvedValueOnce(mockAthletes);
      const result = await service.checkDuplicate({
        firstName: 'john',
        lastName: 'smith',
        parentEmail: 'parent@test.com',
      });
      expect(result.isDuplicate).toBe(true);
      expect(result.level).toBe('exact');
    });

    it('should detect no duplicate for different names', async () => {
      mockPrismaService.athlete.findMany
        .mockResolvedValueOnce([])  // exact match query
        .mockResolvedValueOnce([]); // phonetic query
      const result = await service.checkDuplicate({
        firstName: 'Maria',
        lastName: 'Garcia',
      });
      expect(result.isDuplicate).toBe(false);
      expect(result.level).toBe('none');
    });

    it('should detect phonetic duplicate', async () => {
      mockPrismaService.athlete.findMany
        .mockResolvedValueOnce([])       // exact match query returns empty
        .mockResolvedValueOnce(mockAthletes); // phonetic query returns candidates
      const result = await service.checkDuplicate({
        firstName: 'Jon',
        lastName: 'Smyth',
        parentEmail: 'other@test.com',
      });
      expect(result.isDuplicate).toBe(true);
      expect(['phonetic', 'similar']).toContain(result.level);
    });
  });

  describe('create', () => {
    it('should create athlete when no duplicate', async () => {
      mockPrismaService.athlete.findMany.mockResolvedValue([]);
      mockPrismaService.athlete.create.mockResolvedValue({
        id: '2',
        firstName: 'Maria',
        lastName: 'Garcia',
        position: 'Goalkeeper',
        parentEmail: 'maria@test.com',
        normalizedFirstName: 'maria',
        normalizedLastName: 'garcia',
        normalizedParentEmail: 'maria@test.com',
        metaphoneFirstName: 'MR',
        metaphoneLastName: 'KRK',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create({
        firstName: 'Maria',
        lastName: 'Garcia',
        position: 'Goalkeeper',
        parentEmail: 'maria@test.com',
      });

      expect(result.firstName).toBe('Maria');
      expect(mockPrismaService.athlete.create).toHaveBeenCalled();
    });

    it('should reject exact duplicate', async () => {
      mockPrismaService.athlete.findMany.mockResolvedValueOnce(mockAthletes);

      await expect(
        service.create({
          firstName: 'John',
          lastName: 'Smith',
          position: 'Forward',
          parentEmail: 'parent@test.com',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle P2002 unique constraint violation', async () => {
      mockPrismaService.athlete.findMany.mockResolvedValue([]);
      mockPrismaService.athlete.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.create({
          firstName: 'Maria',
          lastName: 'Garcia',
          position: 'Goalkeeper',
          parentEmail: 'maria@test.com',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
