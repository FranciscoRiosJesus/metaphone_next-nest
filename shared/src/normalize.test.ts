import { normalizeName, normalizeEmail } from './normalize';

describe('normalizeName', () => {
  it('should trim and lowercase', () => {
    expect(normalizeName('  SMITH  ')).toBe('smith');
  });

  it('should remove accents', () => {
    expect(normalizeName(' Nicolás ')).toBe('nicolas');
    expect(normalizeName('José')).toBe('jose');
    expect(normalizeName('García')).toBe('garcia');
    expect(normalizeName('Müller')).toBe('muller');
  });

  it('should handle ñ', () => {
    expect(normalizeName('Muñoz')).toBe('munoz');
    expect(normalizeName('Señor')).toBe('senor');
  });

  it('should collapse multiple spaces', () => {
    expect(normalizeName('De   La   Cruz')).toBe('de la cruz');
  });

  it('should remove special characters', () => {
    expect(normalizeName("O'Brien")).toBe('obrien');
    expect(normalizeName('Smith-Jones')).toBe('smithjones');
  });

  it('should handle empty and null-like values', () => {
    expect(normalizeName('')).toBe('');
    expect(normalizeName('   ')).toBe('');
  });

  it('should handle mixed case with accents and spaces', () => {
    expect(normalizeName('  GONZÁLEZ  PÉREZ  ')).toBe('gonzalez perez');
  });
});

describe('normalizeEmail', () => {
  it('should trim and lowercase email', () => {
    expect(normalizeEmail('  John@Example.COM  ')).toBe('john@example.com');
  });

  it('should handle empty values', () => {
    expect(normalizeEmail('')).toBe('');
  });
});
