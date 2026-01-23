/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { UrlService } from "./url.service";
import { IUrlRepository, URL_REPOSITORY_TOKEN } from "../repository";
import { CreateUrlDto } from "../dto";
import { generateShortCode } from "../utils";

// Mock the utils module
jest.mock("../utils", () => ({
  generateShortCode: jest.fn(),
}));

const mockGenerateShortCode = generateShortCode as jest.MockedFunction<
  typeof generateShortCode
>;

describe("UrlService", () => {
  let service: UrlService;
  let mockUrlRepository: jest.Mocked<IUrlRepository>;

  beforeEach(async () => {
    // Create mock repository
    mockUrlRepository = {
      create: jest.fn(),
      findByShortCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlService,
        {
          provide: URL_REPOSITORY_TOKEN,
          useValue: mockUrlRepository,
        },
      ],
    }).compile();

    service = module.get<UrlService>(UrlService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createShortUrl", () => {
    it("should create a short URL successfully", async () => {
      // Arrange
      const dto: CreateUrlDto = {
        longUrl: "https://www.example.com",
      };
      const mockShortCode = "abc123d";
      const mockNow = 1234567890000;

      mockGenerateShortCode.mockReturnValue(mockShortCode);
      jest.spyOn(Date, "now").mockReturnValue(mockNow);
      mockUrlRepository.create.mockResolvedValue(undefined);

      // Act
      const result = await service.createShortUrl(dto);

      // Assert
      expect(result).toEqual({
        shortCode: mockShortCode,
        longUrl: dto.longUrl,
      });

      expect(mockUrlRepository.create).toHaveBeenCalledWith({
        pk: `URL#${mockShortCode}`,
        sk: "METADATA",
        shortCode: mockShortCode,
        longUrl: dto.longUrl,
        createdAt: mockNow,
        userId: undefined,
      });
    });

    it("should create a short URL with userId when provided", async () => {
      // Arrange
      const dto: CreateUrlDto = {
        longUrl: "https://www.example.com",
        userId: "user-123",
      };
      const mockShortCode = "xyz789a";
      const mockNow = 1234567890000;

      mockGenerateShortCode.mockReturnValue(mockShortCode);
      jest.spyOn(Date, "now").mockReturnValue(mockNow);
      mockUrlRepository.create.mockResolvedValue(undefined);

      // Act
      const result = await service.createShortUrl(dto);

      // Assert
      expect(result).toEqual({
        shortCode: mockShortCode,
        longUrl: dto.longUrl,
      });

      expect(mockUrlRepository.create).toHaveBeenCalledWith({
        pk: `URL#${mockShortCode}`,
        sk: "METADATA",
        shortCode: mockShortCode,
        longUrl: dto.longUrl,
        createdAt: mockNow,
        userId: "user-123",
      });
    });

    it("should generate unique short codes", async () => {
      // Arrange
      const dto: CreateUrlDto = {
        longUrl: "https://www.example.com",
      };

      const shortCodes = ["code1aa", "code2bb", "code3cc"];
      let callCount = 0;

      mockGenerateShortCode.mockImplementation(() => {
        return shortCodes[callCount++];
      });
      jest.spyOn(Date, "now").mockReturnValue(1234567890000);
      mockUrlRepository.create.mockResolvedValue(undefined);

      // Act
      const result1 = await service.createShortUrl(dto);
      const result2 = await service.createShortUrl(dto);
      const result3 = await service.createShortUrl(dto);

      // Assert
      expect(result1.shortCode).toBe("code1aa");
      expect(result2.shortCode).toBe("code2bb");
      expect(result3.shortCode).toBe("code3cc");
      expect(mockUrlRepository.create).toHaveBeenCalledTimes(3);
    });

    it("should propagate repository errors", async () => {
      // Arrange
      const dto: CreateUrlDto = {
        longUrl: "https://www.example.com",
      };
      const mockError = new Error("Database error");

      mockGenerateShortCode.mockReturnValue("abc123d");
      jest.spyOn(Date, "now").mockReturnValue(1234567890000);
      mockUrlRepository.create.mockRejectedValue(mockError);

      // Act & Assert
      await expect(service.createShortUrl(dto)).rejects.toThrow(
        "Database error",
      );
    });

    it("should use current timestamp for createdAt", async () => {
      // Arrange
      const dto: CreateUrlDto = {
        longUrl: "https://www.example.com",
      };
      const mockShortCode = "abc123d";
      const mockNow = Date.now();

      mockGenerateShortCode.mockReturnValue(mockShortCode);
      const dateNowSpy = jest.spyOn(Date, "now").mockReturnValue(mockNow);
      mockUrlRepository.create.mockResolvedValue(undefined);

      // Act
      await service.createShortUrl(dto);

      // Assert
      expect(dateNowSpy).toHaveBeenCalled();
      expect(mockUrlRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: mockNow,
        }),
      );
    });

    it("should call generateShortCode utility", async () => {
      // Arrange
      const dto: CreateUrlDto = {
        longUrl: "https://www.example.com",
      };
      mockGenerateShortCode.mockReturnValue("test123");
      jest.spyOn(Date, "now").mockReturnValue(1234567890000);
      mockUrlRepository.create.mockResolvedValue(undefined);

      // Act
      await service.createShortUrl(dto);

      // Assert
      expect(mockGenerateShortCode).toHaveBeenCalled();
    });

    it("should create short URL with valid expiresAt in the future", async () => {
      // Arrange
      const mockNow = 1234567890000; // milliseconds
      const futureDate = new Date(mockNow + 3600000); // 1 hour in future
      const dto: CreateUrlDto = {
        longUrl: "https://www.example.com",
        expiresAt: futureDate.toISOString(),
      };
      const mockShortCode = "abc123d";

      mockGenerateShortCode.mockReturnValue(mockShortCode);
      jest.spyOn(Date, "now").mockReturnValue(mockNow);
      mockUrlRepository.create.mockResolvedValue(undefined);

      // Act
      const result = await service.createShortUrl(dto);

      // Assert
      expect(result).toEqual({
        shortCode: mockShortCode,
        longUrl: dto.longUrl,
      });

      expect(mockUrlRepository.create).toHaveBeenCalledWith({
        pk: `URL#${mockShortCode}`,
        sk: "METADATA",
        shortCode: mockShortCode,
        longUrl: dto.longUrl,
        createdAt: mockNow,
        expiresAt: Math.floor(futureDate.getTime() / 1000),
      });
    });

    it("should throw ValidationException when expiresAt is in the past", async () => {
      // Arrange
      const mockNow = 1234567890000; // milliseconds
      const pastDate = new Date(mockNow - 3600000); // 1 hour in past
      const dto: CreateUrlDto = {
        longUrl: "https://www.example.com",
        expiresAt: pastDate.toISOString(),
      };

      mockGenerateShortCode.mockReturnValue("abc123d");
      jest.spyOn(Date, "now").mockReturnValue(mockNow);

      // Act & Assert
      await expect(service.createShortUrl(dto)).rejects.toThrow(
        "expiresAt must be in the future",
      );
      expect(mockUrlRepository.create).not.toHaveBeenCalled();
    });

    it("should throw ValidationException when expiresAt equals current time", async () => {
      // Arrange
      const mockNow = 1234567890000; // milliseconds
      const currentDate = new Date(mockNow);
      const dto: CreateUrlDto = {
        longUrl: "https://www.example.com",
        expiresAt: currentDate.toISOString(),
      };

      mockGenerateShortCode.mockReturnValue("abc123d");
      jest.spyOn(Date, "now").mockReturnValue(mockNow);

      // Act & Assert
      await expect(service.createShortUrl(dto)).rejects.toThrow(
        "expiresAt must be in the future",
      );
      expect(mockUrlRepository.create).not.toHaveBeenCalled();
    });
  });
});
