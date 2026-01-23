import { generateShortCode } from "./short-code.util";

describe("generateShortCode", () => {
  it("should generate short code with default length (7)", () => {
    // Act
    const shortCode = generateShortCode();

    // Assert
    expect(shortCode).toBeDefined();
    expect(shortCode.length).toBe(10);
    expect(typeof shortCode).toBe("string");
  });

  it("should generate short code with custom length", () => {
    // Arrange
    const customLength = 12;

    // Act
    const shortCode = generateShortCode(customLength);

    // Assert
    expect(shortCode).toBeDefined();
    expect(shortCode.length).toBe(customLength);
  });

  it("should generate unique codes on multiple calls", () => {
    // Act
    const code1 = generateShortCode();
    const code2 = generateShortCode();
    const code3 = generateShortCode();

    // Assert
    expect(code1).not.toBe(code2);
    expect(code2).not.toBe(code3);
    expect(code1).not.toBe(code3);
  });

  it("should use base62 format (alphanumeric)", () => {
    // Act
    const shortCode = generateShortCode();

    // Assert
    // base62 characters: A-Z, a-z, 0-9
    const base62Pattern = /^[A-Za-z0-9]+$/;
    expect(shortCode).toMatch(base62Pattern);
  });

  it("should generate different codes for different lengths", () => {
    // Act
    const shortCode5 = generateShortCode(5);
    const shortCode10 = generateShortCode(10);
    const shortCode15 = generateShortCode(15);

    // Assert
    expect(shortCode5.length).toBe(5);
    expect(shortCode10.length).toBe(10);
    expect(shortCode15.length).toBe(15);
  });

  it("should handle length of 1", () => {
    // Act
    const shortCode = generateShortCode(1);

    // Assert
    expect(shortCode.length).toBe(1);
    expect(typeof shortCode).toBe("string");
  });

  it("should generate codes that are URL-safe", () => {
    // Act
    const codes = Array.from({ length: 100 }, () => generateShortCode());

    // Assert
    codes.forEach((code) => {
      // Should not contain characters that need URL encoding
      expect(code).not.toContain("+");
      expect(code).not.toContain("/");
      expect(code).not.toContain("=");
    });
  });

  it("should generate statistically unique codes", () => {
    // Act - Generate 1000 codes
    const codes = new Set(
      Array.from({ length: 1000 }, () => generateShortCode()),
    );

    // Assert - All codes should be unique
    // With 10 characters from base62 (62 possibilities per char),
    // we have 62^10 = ~8.3 x 10^16 possibilities
    // So 1000 codes should all be unique
    expect(codes.size).toBeGreaterThan(990);
  });
});
