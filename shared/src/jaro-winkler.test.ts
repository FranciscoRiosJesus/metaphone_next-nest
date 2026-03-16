import { jaroSimilarity, jaroWinklerSimilarity } from "./jaro-winkler";

describe("jaroSimilarity", () => {
  it("should return 1.0 for identical strings", () => {
    expect(jaroSimilarity("john", "john")).toBe(1.0);
  });

  it("should return 0.0 for empty strings", () => {
    expect(jaroSimilarity("", "john")).toBe(0.0);
    expect(jaroSimilarity("john", "")).toBe(0.0);
  });

  it("should return 0.0 for completely different strings", () => {
    expect(jaroSimilarity("abc", "xyz")).toBe(0.0);
  });

  it("should return high similarity for similar strings", () => {
    const score = jaroSimilarity("smith", "smyth");
    expect(score).toBeGreaterThan(0.8);
  });
});

describe("jaroWinklerSimilarity", () => {
  it("should return 1.0 for identical strings", () => {
    expect(jaroWinklerSimilarity("john", "john")).toBe(1.0);
  });

  it("should give bonus for common prefix", () => {
    const jaro = jaroSimilarity("smith", "smyth");
    const jaroWinkler = jaroWinklerSimilarity("smith", "smyth");
    expect(jaroWinkler).toBeGreaterThanOrEqual(jaro);
  });

  it("should return high similarity for gonzalez vs gonzales", () => {
    const score = jaroWinklerSimilarity("gonzalez", "gonzales");
    expect(score).toBeGreaterThanOrEqual(0.95);
  });

  it("should return moderate similarity for jon vs john", () => {
    const score = jaroWinklerSimilarity("jon", "john");
    expect(score).toBeGreaterThan(0.8);
  });

  it("should return low similarity for very different strings", () => {
    const score = jaroWinklerSimilarity("john", "maria");
    expect(score).toBeLessThan(0.6);
  });
});
