import { nowInSeconds, secondsFromNow } from "./time.util";

describe("Time Utilities", () => {
  describe("nowInSeconds", () => {
    it("should return current time in seconds", () => {
      // Arrange
      const beforeMs = Date.now();

      // Act
      const result = nowInSeconds();

      // Assert
      const afterMs = Date.now();
      const expectedMin = Math.floor(beforeMs / 1000);
      const expectedMax = Math.floor(afterMs / 1000);

      expect(result).toBeGreaterThanOrEqual(expectedMin);
      expect(result).toBeLessThanOrEqual(expectedMax);
      expect(Number.isInteger(result)).toBe(true);
    });

    it("should return value without decimal places", () => {
      // Act
      const result = nowInSeconds();

      // Assert
      expect(result % 1).toBe(0); // No decimal part
    });

    it("should return consistent values within same second", () => {
      // Act
      const result1 = nowInSeconds();
      const result2 = nowInSeconds();

      // Assert
      // Should be same or differ by at most 1 second
      expect(Math.abs(result1 - result2)).toBeLessThanOrEqual(1);
    });
  });

  describe("secondsFromNow", () => {
    it("should calculate future time correctly", () => {
      // Arrange
      const offset = 3600; // 1 hour
      const now = nowInSeconds();

      // Act
      const result = secondsFromNow(offset);

      // Assert
      expect(result).toBeGreaterThan(now);
      expect(result - now).toBeGreaterThanOrEqual(offset - 1); // Allow for timing
      expect(result - now).toBeLessThanOrEqual(offset + 1);
    });

    it("should handle large time offsets", () => {
      // Arrange
      const offset = 86400 * 365; // 1 year in seconds
      const now = nowInSeconds();

      // Act
      const result = secondsFromNow(offset);

      // Assert
      expect(result).toBeGreaterThan(now);
      expect(result - now).toBeGreaterThanOrEqual(offset - 1);
      expect(result - now).toBeLessThanOrEqual(offset + 1);
    });

    it("should handle zero offset", () => {
      // Arrange
      const offset = 0;
      const now = nowInSeconds();

      // Act
      const result = secondsFromNow(offset);

      // Assert
      expect(Math.abs(result - now)).toBeLessThanOrEqual(1);
    });

    it("should handle negative offset (past time)", () => {
      // Arrange
      const offset = -3600; // 1 hour ago
      const now = nowInSeconds();

      // Act
      const result = secondsFromNow(offset);

      // Assert
      expect(result).toBeLessThan(now);
      expect(now - result).toBeGreaterThanOrEqual(Math.abs(offset) - 1);
      expect(now - result).toBeLessThanOrEqual(Math.abs(offset) + 1);
    });

    it("should return integer values", () => {
      // Arrange
      const offsets = [100, 1000, 10000, 86400];

      // Act & Assert
      offsets.forEach((offset) => {
        const result = secondsFromNow(offset);
        expect(Number.isInteger(result)).toBe(true);
      });
    });

    it("should be consistent with nowInSeconds", () => {
      // Arrange
      const offset = 7200; // 2 hours

      // Act
      const now = nowInSeconds();
      const future = secondsFromNow(offset);

      // Assert
      expect(future - now).toBeCloseTo(offset, 0);
    });
  });
});
