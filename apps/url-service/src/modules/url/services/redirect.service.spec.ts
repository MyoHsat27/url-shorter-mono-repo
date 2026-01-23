/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { RedirectService } from "./redirect.service";
import { IUrlRepository, URL_REPOSITORY_TOKEN } from "../repository";
import { REDIS_CLIENT } from "src/infrastructure";
import Redis from "ioredis";
import { MAX_CACHE_TTL_SECONDS } from "../constants";

describe("RedirectService", () => {
  let service: RedirectService;
  let mockRedis: jest.Mocked<Redis>;
  let mockUrlRepository: jest.Mocked<IUrlRepository>;

  beforeEach(async () => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as unknown as jest.Mocked<Redis>;

    mockUrlRepository = {
      create: jest.fn(),
      findByShortCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedirectService,
        {
          provide: REDIS_CLIENT,
          useValue: mockRedis,
        },
        {
          provide: URL_REPOSITORY_TOKEN,
          useValue: mockUrlRepository,
        },
      ],
    }).compile();

    service = module.get<RedirectService>(RedirectService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("resolve", () => {
    it("should return cached URL when available in Redis", async () => {
      // Arrange
      const shortCode = "abc123d";
      const cachedUrl = "https://www.example.com";
      mockRedis.get.mockResolvedValue(JSON.stringify({ longUrl: cachedUrl }));

      // Act
      const result = await service.resolve(shortCode);

      // Assert
      expect(result).toEqual({ longUrl: cachedUrl, expiresAt: undefined });
      expect(mockRedis.get).toHaveBeenCalledWith(`url:${shortCode}`);
      expect(mockUrlRepository.findByShortCode).not.toHaveBeenCalled();
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it("should fetch from repository when cache miss", async () => {
      // Arrange
      const shortCode = "abc123d";
      const longUrl = "https://www.example.com";
      const mockRecord = {
        pk: `URL#${shortCode}`,
        sk: "METADATA" as const,
        shortCode,
        longUrl,
        createdAt: Date.now(),
      };

      mockRedis.get.mockResolvedValue(null);
      mockUrlRepository.findByShortCode.mockResolvedValue(mockRecord);
      mockRedis.set.mockResolvedValue("OK");

      // Act
      const result = await service.resolve(shortCode);

      // Assert
      expect(result).toEqual({ longUrl, expiresAt: undefined });
      expect(mockRedis.get).toHaveBeenCalledWith(`url:${shortCode}`);
      expect(mockUrlRepository.findByShortCode).toHaveBeenCalledWith(shortCode);
    });

    it("should cache URL after repository fetch", async () => {
      // Arrange
      const shortCode = "abc123d";
      const longUrl = "https://www.example.com";
      const mockRecord = {
        pk: `URL#${shortCode}`,
        sk: "METADATA" as const,
        shortCode,
        longUrl,
        createdAt: Date.now(),
      };

      mockRedis.get.mockResolvedValue(null);
      mockUrlRepository.findByShortCode.mockResolvedValue(mockRecord);
      mockRedis.set.mockResolvedValue("OK");

      // Act
      await service.resolve(shortCode);

      // Assert
      expect(mockRedis.set).toHaveBeenCalledWith(
        `url:${shortCode}`,
        JSON.stringify({ longUrl, expiresAt: undefined }),
        "EX",
        MAX_CACHE_TTL_SECONDS,
      );
    });

    it("should return null for non-existent short codes", async () => {
      // Arrange
      const shortCode = "nonexistent";
      mockRedis.get.mockResolvedValue(null);
      mockUrlRepository.findByShortCode.mockResolvedValue(null);

      // Act
      const result = await service.resolve(shortCode);

      // Assert
      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith(`url:${shortCode}`);
      expect(mockUrlRepository.findByShortCode).toHaveBeenCalledWith(shortCode);
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it("should handle Redis get errors gracefully", async () => {
      // Arrange
      const shortCode = "abc123d";
      const longUrl = "https://www.example.com";
      const mockRecord = {
        pk: `URL#${shortCode}`,
        sk: "METADATA" as const,
        shortCode,
        longUrl,
        createdAt: Date.now(),
      };

      mockRedis.get.mockRejectedValue(new Error("Redis connection error"));
      mockUrlRepository.findByShortCode.mockResolvedValue(mockRecord);
      mockRedis.set.mockResolvedValue("OK");

      // Act & Assert
      await expect(service.resolve(shortCode)).rejects.toThrow(
        "Redis connection error",
      );
    });

    it("should handle repository errors", async () => {
      // Arrange
      const shortCode = "abc123d";
      mockRedis.get.mockResolvedValue(null);
      mockUrlRepository.findByShortCode.mockRejectedValue(
        new Error("Database error"),
      );

      // Act & Assert
      await expect(service.resolve(shortCode)).rejects.toThrow(
        "Database error",
      );
    });

    it("should handle Redis set errors gracefully", async () => {
      // Arrange
      const shortCode = "abc123d";
      const longUrl = "https://www.example.com";
      const mockRecord = {
        pk: `URL#${shortCode}`,
        sk: "METADATA" as const,
        shortCode,
        longUrl,
        createdAt: Date.now(),
      };

      mockRedis.get.mockResolvedValue(null);
      mockUrlRepository.findByShortCode.mockResolvedValue(mockRecord);
      mockRedis.set.mockRejectedValue(new Error("Redis set error"));

      // Act & Assert
      await expect(service.resolve(shortCode)).rejects.toThrow(
        "Redis set error",
      );
    });

    it("should use correct cache key format", async () => {
      // Arrange
      const shortCode = "test123";
      const expectedCacheKey = `url:${shortCode}`;
      mockRedis.get.mockResolvedValue(
        JSON.stringify({ longUrl: "https://example.com" }),
      );

      // Act
      await service.resolve(shortCode);

      // Assert
      expect(mockRedis.get).toHaveBeenCalledWith(expectedCacheKey);
    });

    it("should delete expired URL from cache and return null", async () => {
      // Arrange
      const shortCode = "expired123";
      const nowSeconds = Math.floor(Date.now() / 1000);
      const expiredTime = nowSeconds - 100; // Expired 100 seconds ago

      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          longUrl: "https://www.example.com",
          expiresAt: expiredTime,
        }),
      );
      mockRedis.del.mockResolvedValue(1);

      // Act
      const result = await service.resolve(shortCode);

      // Assert
      expect(result).toBeNull();
      expect(mockRedis.del).toHaveBeenCalledWith(`url:${shortCode}`);
      expect(mockUrlRepository.findByShortCode).not.toHaveBeenCalled();
    });

    it("should return null for expired record from repository", async () => {
      // Arrange
      const shortCode = "expired456";
      const nowSeconds = Math.floor(Date.now() / 1000);
      const expiredTime = nowSeconds - 100;
      const mockRecord = {
        pk: `URL#${shortCode}`,
        sk: "METADATA" as const,
        shortCode,
        longUrl: "https://www.example.com",
        createdAt: Date.now(),
        expiresAt: expiredTime,
      };

      mockRedis.get.mockResolvedValue(null);
      mockUrlRepository.findByShortCode.mockResolvedValue(mockRecord);

      // Act
      const result = await service.resolve(shortCode);

      // Assert
      expect(result).toBeNull();
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it("should cache URL with calculated TTL when record has expiration", async () => {
      // Arrange
      const shortCode = "expiring123";
      const nowSeconds = Math.floor(Date.now() / 1000);
      const expiresAt = nowSeconds + 1800; // Expires in 30 minutes
      const mockRecord = {
        pk: `URL#${shortCode}`,
        sk: "METADATA" as const,
        shortCode,
        longUrl: "https://www.example.com",
        createdAt: Date.now(),
        expiresAt,
      };

      mockRedis.get.mockResolvedValue(null);
      mockUrlRepository.findByShortCode.mockResolvedValue(mockRecord);
      mockRedis.set.mockResolvedValue("OK");

      // Act
      const result = await service.resolve(shortCode);

      // Assert
      expect(result).toEqual({
        longUrl: mockRecord.longUrl,
        expiresAt: mockRecord.expiresAt,
      });
      expect(mockRedis.set).toHaveBeenCalledWith(
        `url:${shortCode}`,
        JSON.stringify({
          longUrl: mockRecord.longUrl,
          expiresAt: mockRecord.expiresAt,
        }),
        "EX",
        1800,
      );
    });

    it("should return null when calculated TTL is zero or negative", async () => {
      // Arrange
      const shortCode = "justExpired";
      const nowSeconds = Math.floor(Date.now() / 1000);
      const expiresAt = nowSeconds; // Expires right now
      const mockRecord = {
        pk: `URL#${shortCode}`,
        sk: "METADATA" as const,
        shortCode,
        longUrl: "https://www.example.com",
        createdAt: Date.now(),
        expiresAt,
      };

      mockRedis.get.mockResolvedValue(null);
      mockUrlRepository.findByShortCode.mockResolvedValue(mockRecord);

      // Act
      const result = await service.resolve(shortCode);

      // Assert
      expect(result).toBeNull();
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it("should use MAX_CACHE_TTL when remaining time exceeds max", async () => {
      // Arrange
      const shortCode = "longExpiry";
      const nowSeconds = Math.floor(Date.now() / 1000);
      const expiresAt = nowSeconds + 7200; // Expires in 2 hours
      const mockRecord = {
        pk: `URL#${shortCode}`,
        sk: "METADATA" as const,
        shortCode,
        longUrl: "https://www.example.com",
        createdAt: Date.now(),
        expiresAt,
      };

      mockRedis.get.mockResolvedValue(null);
      mockUrlRepository.findByShortCode.mockResolvedValue(mockRecord);
      mockRedis.set.mockResolvedValue("OK");

      // Act
      await service.resolve(shortCode);

      // Assert
      expect(mockRedis.set).toHaveBeenCalledWith(
        `url:${shortCode}`,
        JSON.stringify({
          longUrl: mockRecord.longUrl,
          expiresAt: mockRecord.expiresAt,
        }),
        "EX",
        MAX_CACHE_TTL_SECONDS,
      );
    });
  });
});
