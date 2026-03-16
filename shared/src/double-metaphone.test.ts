import { doubleMetaphone } from './double-metaphone';

describe('doubleMetaphone', () => {
  it('should return empty for empty input', () => {
    expect(doubleMetaphone('')).toEqual(['', '']);
  });

  it('should produce same primary code for John and Jon', () => {
    const [johnPrimary] = doubleMetaphone('John');
    const [jonPrimary] = doubleMetaphone('Jon');
    expect(johnPrimary).toBe(jonPrimary);
  });

  it('should produce same primary code for Sara and Sarah', () => {
    const [saraPrimary] = doubleMetaphone('Sara');
    const [sarahPrimary] = doubleMetaphone('Sarah');
    expect(saraPrimary).toBe(sarahPrimary);
  });

  it('should produce same primary code for Smith and Smyth', () => {
    const [smithPrimary] = doubleMetaphone('Smith');
    const [smythPrimary] = doubleMetaphone('Smyth');
    expect(smithPrimary).toBe(smythPrimary);
  });

  it('should produce same code for Gonzalez and Gonzales', () => {
    const [gonzalezPrimary] = doubleMetaphone('Gonzalez');
    const [gonzalesPrimary] = doubleMetaphone('Gonzales');
    expect(gonzalezPrimary).toBe(gonzalesPrimary);
  });

  it('should produce same code for Luis and Luiz', () => {
    const [luisPrimary] = doubleMetaphone('Luis');
    const [luizPrimary] = doubleMetaphone('Luiz');
    expect(luisPrimary).toBe(luizPrimary);
  });

  it('should produce consistent codes for common names', () => {
    expect(doubleMetaphone('Michael')[0]).toBeTruthy();
    expect(doubleMetaphone('William')[0]).toBeTruthy();
    expect(doubleMetaphone('Robert')[0]).toBeTruthy();
  });

  it('should handle names starting with silent letters', () => {
    const [knightPrimary] = doubleMetaphone('Knight');
    const [nightPrimary] = doubleMetaphone('Night');
    expect(knightPrimary).toBe(nightPrimary);
  });

  it('should produce codes for names with PH', () => {
    const [philPrimary] = doubleMetaphone('Philip');
    const [filPrimary] = doubleMetaphone('Filip');
    expect(philPrimary).toBe(filPrimary);
  });

  it('should handle double letters', () => {
    const result = doubleMetaphone('Matthew');
    expect(result[0]).toBeTruthy();
    expect(result[0].length).toBeLessThanOrEqual(4);
  });
});
