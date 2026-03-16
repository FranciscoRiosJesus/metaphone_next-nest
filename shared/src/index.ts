export { normalizeName, normalizeEmail } from './normalize';
export { getPhoneticKeys } from './deduplication';
export {
  arePotentialDuplicates,
  type DuplicateCheckResult,
  type DuplicateLevel,
  type AthleteInput,
  type PhoneticKeys,
} from './deduplication';
export { doubleMetaphone } from './double-metaphone';
export { jaroWinklerSimilarity, jaroSimilarity } from './jaro-winkler';
