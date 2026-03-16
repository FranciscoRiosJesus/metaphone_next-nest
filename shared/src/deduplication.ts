import { doubleMetaphone } from './double-metaphone';
import { normalizeName, normalizeEmail } from './normalize';
import { jaroWinklerSimilarity } from './jaro-winkler';

/**
 * Phonetic key pair: [primary, alternate] from Double Metaphone.
 */
export type PhoneticKeys = [string, string];

/**
 * Duplicate check result levels:
 * - 'exact'    → normalized names match exactly (BLOCK)
 * - 'phonetic' → phonetic codes match for both first+last (BLOCK)
 * - 'similar'  → high Jaro-Winkler similarity on both names (WARN)
 * - 'none'     → no duplicate detected
 */
export type DuplicateLevel = 'exact' | 'phonetic' | 'similar' | 'none';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  level: DuplicateLevel;
  confidence: number; // 0.0 - 1.0
  emailMatch: boolean;
  details: string;
}

export interface AthleteInput {
  firstName: string;
  lastName: string;
  parentEmail?: string;
}

// Thresholds
const JARO_WINKLER_THRESHOLD = 0.92;
const JARO_WINKLER_HIGH_THRESHOLD = 0.85;

/**
 * Get Double Metaphone phonetic keys for a name value.
 * The name is normalized before phonetic encoding.
 */
export function getPhoneticKeys(value: string): PhoneticKeys {
  const normalized = normalizeName(value);
  if (!normalized) return ['', ''];
  return doubleMetaphone(normalized);
}

/**
 * Check if two phonetic key pairs have any matching code.
 * Returns true if primary/primary, primary/alternate, or alternate/primary match.
 */
function phoneticKeysMatch(a: PhoneticKeys, b: PhoneticKeys): boolean {
  if (!a[0] || !b[0]) return false;

  // primary vs primary
  if (a[0] === b[0]) return true;
  // primary vs alternate
  if (a[0] === b[1] && b[1] !== '') return true;
  // alternate vs primary
  if (a[1] === b[0] && a[1] !== '') return true;
  // alternate vs alternate
  if (a[1] !== '' && b[1] !== '' && a[1] === b[1]) return true;

  return false;
}

/**
 * Core deduplication check between two athlete inputs.
 *
 * Strategy (multi-layer):
 *
 * 1. EXACT MATCH (normalized): If normalizedFirstName AND normalizedLastName
 *    are identical → level='exact', confidence=1.0, BLOCK.
 *
 * 2. PHONETIC MATCH: If Double Metaphone codes match for BOTH firstName AND
 *    lastName → level='phonetic', confidence=0.9, BLOCK.
 *
 * 3. SIMILARITY MATCH: If Jaro-Winkler similarity ≥ 0.92 for BOTH firstName
 *    AND lastName → level='similar', confidence=0.8, WARN.
 *
 * Email match amplifies confidence by +0.05 (capped at 1.0).
 *
 * If only ONE of first/last matches phonetically and the other has high
 * similarity (≥ 0.85), we still treat it as 'similar' (WARN).
 */
export function arePotentialDuplicates(
  a: AthleteInput,
  b: AthleteInput,
): DuplicateCheckResult {
  const normA = {
    firstName: normalizeName(a.firstName),
    lastName: normalizeName(a.lastName),
    email: normalizeEmail(a.parentEmail || ''),
  };
  const normB = {
    firstName: normalizeName(b.firstName),
    lastName: normalizeName(b.lastName),
    email: normalizeEmail(b.parentEmail || ''),
  };

  const emailMatch =
    normA.email !== '' && normB.email !== '' && normA.email === normB.email;

  // Layer 1: Exact normalized match
  if (normA.firstName === normB.firstName && normA.lastName === normB.lastName) {
    if (normA.firstName === '' && normA.lastName === '') {
      return {
        isDuplicate: false,
        level: 'none',
        confidence: 0,
        emailMatch,
        details: 'Both entries are empty',
      };
    }
    const confidence = Math.min(1.0, 1.0 + (emailMatch ? 0.05 : 0));
    return {
      isDuplicate: true,
      level: 'exact',
      confidence,
      emailMatch,
      details: `Exact normalized match: "${normA.firstName} ${normA.lastName}"`,
    };
  }

  // Layer 2: Phonetic match (Double Metaphone)
  const phoneticA = {
    firstName: getPhoneticKeys(a.firstName),
    lastName: getPhoneticKeys(a.lastName),
  };
  const phoneticB = {
    firstName: getPhoneticKeys(b.firstName),
    lastName: getPhoneticKeys(b.lastName),
  };

  const firstNamePhoneticMatch = phoneticKeysMatch(
    phoneticA.firstName,
    phoneticB.firstName,
  );
  const lastNamePhoneticMatch = phoneticKeysMatch(
    phoneticA.lastName,
    phoneticB.lastName,
  );

  if (firstNamePhoneticMatch && lastNamePhoneticMatch) {
    const confidence = Math.min(1.0, 0.9 + (emailMatch ? 0.05 : 0));
    return {
      isDuplicate: true,
      level: 'phonetic',
      confidence,
      emailMatch,
      details:
        `Phonetic match: "${a.firstName}" ≈ "${b.firstName}" ` +
        `[${phoneticA.firstName[0]}], "${a.lastName}" ≈ "${b.lastName}" ` +
        `[${phoneticA.lastName[0]}]`,
    };
  }

  // Layer 3: Jaro-Winkler similarity
  const firstNameSimilarity = jaroWinklerSimilarity(
    normA.firstName,
    normB.firstName,
  );
  const lastNameSimilarity = jaroWinklerSimilarity(
    normA.lastName,
    normB.lastName,
  );

  // Both names highly similar
  if (
    firstNameSimilarity >= JARO_WINKLER_THRESHOLD &&
    lastNameSimilarity >= JARO_WINKLER_THRESHOLD
  ) {
    const avgSimilarity = (firstNameSimilarity + lastNameSimilarity) / 2;
    const confidence = Math.min(
      1.0,
      avgSimilarity * 0.85 + (emailMatch ? 0.1 : 0),
    );
    return {
      isDuplicate: true,
      level: 'similar',
      confidence,
      emailMatch,
      details:
        `High similarity: firstName=${(firstNameSimilarity * 100).toFixed(1)}%, ` +
        `lastName=${(lastNameSimilarity * 100).toFixed(1)}%`,
    };
  }

  // Partial: one phonetic match + other has decent similarity
  if (
    (firstNamePhoneticMatch &&
      lastNameSimilarity >= JARO_WINKLER_HIGH_THRESHOLD) ||
    (lastNamePhoneticMatch &&
      firstNameSimilarity >= JARO_WINKLER_HIGH_THRESHOLD)
  ) {
    const confidence = Math.min(1.0, 0.7 + (emailMatch ? 0.1 : 0));
    return {
      isDuplicate: true,
      level: 'similar',
      confidence,
      emailMatch,
      details:
        `Partial phonetic+similarity match: firstName phonetic=${firstNamePhoneticMatch}, ` +
        `lastName phonetic=${lastNamePhoneticMatch}, ` +
        `firstName similarity=${(firstNameSimilarity * 100).toFixed(1)}%, ` +
        `lastName similarity=${(lastNameSimilarity * 100).toFixed(1)}%`,
    };
  }

  // With same email, lower the bar slightly
  if (
    emailMatch &&
    firstNameSimilarity >= JARO_WINKLER_HIGH_THRESHOLD &&
    lastNameSimilarity >= JARO_WINKLER_HIGH_THRESHOLD
  ) {
    const avgSimilarity = (firstNameSimilarity + lastNameSimilarity) / 2;
    return {
      isDuplicate: true,
      level: 'similar',
      confidence: avgSimilarity * 0.8,
      emailMatch,
      details:
        `Same email with moderate similarity: firstName=${(firstNameSimilarity * 100).toFixed(1)}%, ` +
        `lastName=${(lastNameSimilarity * 100).toFixed(1)}%`,
    };
  }

  return {
    isDuplicate: false,
    level: 'none',
    confidence: 0,
    emailMatch,
    details: 'No duplicate detected',
  };
}
