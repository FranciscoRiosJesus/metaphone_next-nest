import { arePotentialDuplicates, getPhoneticKeys } from './deduplication';

describe('getPhoneticKeys', () => {
  it('should return phonetic keys for a name', () => {
    const keys = getPhoneticKeys('John');
    expect(keys[0]).toBeTruthy();
    expect(keys[0].length).toBeLessThanOrEqual(4);
  });

  it('should return same primary key for John and Jon', () => {
    const john = getPhoneticKeys('John');
    const jon = getPhoneticKeys('Jon');
    expect(john[0]).toBe(jon[0]);
  });

  it('should return same primary key for Sara and Sarah', () => {
    const sara = getPhoneticKeys('Sara');
    const sarah = getPhoneticKeys('Sarah');
    expect(sara[0]).toBe(sarah[0]);
  });

  it('should handle accented names', () => {
    const nicolas = getPhoneticKeys('Nicolás');
    const nicolas2 = getPhoneticKeys('Nicolas');
    expect(nicolas[0]).toBe(nicolas2[0]);
  });

  it('should return empty for empty input', () => {
    expect(getPhoneticKeys('')).toEqual(['', '']);
  });
});

describe('arePotentialDuplicates', () => {
  describe('exact normalized match', () => {
    it('should detect exact match with same casing', () => {
      const result = arePotentialDuplicates(
        { firstName: 'John', lastName: 'Smith', parentEmail: 'parent@test.com' },
        { firstName: 'John', lastName: 'Smith', parentEmail: 'parent@test.com' },
      );
      expect(result.isDuplicate).toBe(true);
      expect(result.level).toBe('exact');
      expect(result.confidence).toBe(1.0);
    });

    it('should detect exact match with different casing', () => {
      const result = arePotentialDuplicates(
        { firstName: 'JOHN', lastName: 'SMITH' },
        { firstName: 'john', lastName: 'smith' },
      );
      expect(result.isDuplicate).toBe(true);
      expect(result.level).toBe('exact');
    });

    it('should detect exact match with extra spaces', () => {
      const result = arePotentialDuplicates(
        { firstName: '  John  ', lastName: '  Smith  ' },
        { firstName: 'John', lastName: 'Smith' },
      );
      expect(result.isDuplicate).toBe(true);
      expect(result.level).toBe('exact');
    });

    it('should detect exact match with accents', () => {
      const result = arePotentialDuplicates(
        { firstName: 'Nicolás', lastName: 'García' },
        { firstName: 'Nicolas', lastName: 'Garcia' },
      );
      expect(result.isDuplicate).toBe(true);
      expect(result.level).toBe('exact');
    });
  });

  describe('phonetic match', () => {
    it('should detect phonetic duplicate: Jon vs John + Smith vs Smyth', () => {
      const result = arePotentialDuplicates(
        { firstName: 'Jon', lastName: 'Smith' },
        { firstName: 'John', lastName: 'Smyth' },
      );
      expect(result.isDuplicate).toBe(true);
      expect(result.level).toBe('phonetic');
    });

    it('should detect phonetic duplicate: Sara vs Sarah', () => {
      const result = arePotentialDuplicates(
        { firstName: 'Sara', lastName: 'Gonzalez' },
        { firstName: 'Sarah', lastName: 'Gonzales' },
      );
      expect(result.isDuplicate).toBe(true);
      // Could be exact (if normalization makes them equal) or phonetic
      expect(['exact', 'phonetic']).toContain(result.level);
    });

    it('should detect phonetic duplicate: Luis vs Luiz', () => {
      const result = arePotentialDuplicates(
        { firstName: 'Luis', lastName: 'Martinez' },
        { firstName: 'Luiz', lastName: 'Martinez' },
      );
      expect(result.isDuplicate).toBe(true);
    });

    it('should detect phonetic duplicate: Philip vs Filip', () => {
      const result = arePotentialDuplicates(
        { firstName: 'Philip', lastName: 'Brown' },
        { firstName: 'Filip', lastName: 'Brown' },
      );
      expect(result.isDuplicate).toBe(true);
    });
  });

  describe('no match', () => {
    it('should NOT flag completely different names', () => {
      const result = arePotentialDuplicates(
        { firstName: 'John', lastName: 'Smith' },
        { firstName: 'Maria', lastName: 'Garcia' },
      );
      expect(result.isDuplicate).toBe(false);
      expect(result.level).toBe('none');
    });

    it('should NOT flag same first name but different last name', () => {
      const result = arePotentialDuplicates(
        { firstName: 'John', lastName: 'Smith' },
        { firstName: 'John', lastName: 'Garcia' },
      );
      // Only first name matches, last names are completely different
      expect(result.level !== 'exact').toBe(true);
    });
  });

  describe('email influence', () => {
    it('should increase confidence with matching email', () => {
      const withEmail = arePotentialDuplicates(
        { firstName: 'Jon', lastName: 'Smith', parentEmail: 'parent@test.com' },
        { firstName: 'John', lastName: 'Smyth', parentEmail: 'parent@test.com' },
      );
      const withoutEmail = arePotentialDuplicates(
        { firstName: 'Jon', lastName: 'Smith', parentEmail: 'a@test.com' },
        { firstName: 'John', lastName: 'Smyth', parentEmail: 'b@test.com' },
      );
      expect(withEmail.emailMatch).toBe(true);
      expect(withoutEmail.emailMatch).toBe(false);
      expect(withEmail.confidence).toBeGreaterThanOrEqual(
        withoutEmail.confidence,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty inputs', () => {
      const result = arePotentialDuplicates(
        { firstName: '', lastName: '' },
        { firstName: '', lastName: '' },
      );
      expect(result.isDuplicate).toBe(false);
    });

    it('should handle compound last names', () => {
      const result = arePotentialDuplicates(
        { firstName: 'Carlos', lastName: 'De La Cruz' },
        { firstName: 'Carlos', lastName: 'de la cruz' },
      );
      expect(result.isDuplicate).toBe(true);
      expect(result.level).toBe('exact');
    });
  });
});
