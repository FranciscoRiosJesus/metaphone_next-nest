/**
 * Robust name normalization for deduplication.
 *
 * Steps:
 * 1. Trim whitespace
 * 2. Lowercase
 * 3. Strip accents/diacritics (NFD decomposition + remove combining marks)
 * 4. Remove non-alphanumeric characters (except spaces)
 * 5. Collapse multiple spaces into one
 * 6. Final trim
 */

const DIACRITICS_MAP: Record<string, string> = {
  ñ: 'n',
  Ñ: 'N',
};

export function normalizeName(value: string): string {
  if (!value) return '';

  let result = value.trim().toLowerCase();

  // Replace known special characters before NFD
  for (const [char, replacement] of Object.entries(DIACRITICS_MAP)) {
    result = result.replace(new RegExp(char, 'g'), replacement);
  }

  // NFD decomposition: separate base chars from combining diacritical marks
  result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Remove anything that's not a letter, digit, or space
  result = result.replace(/[^a-z0-9 ]/g, '');

  // Collapse multiple spaces
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

export function normalizeEmail(value: string): string {
  if (!value) return '';
  return value.trim().toLowerCase();
}
