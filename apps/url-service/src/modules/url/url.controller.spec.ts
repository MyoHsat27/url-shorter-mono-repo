/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { UrlController } from "./url.controller";
import { UrlService } from "./services/url.service";
import { RedirectService } from "./services/redirect.service";
import { NotFoundException } from "@url-shortner/nestjs-common";
import { CreateUrlDto } from "./dto";
import { ClickEventPublisher } from "./services/click-event.publisher";
import { Request, Response } from "express";

describe("UrlController", () => {
  let controller: UrlController;
  let urlService: jest.Mocked<UrlService>;
  let redirectService: jest.Mocked<RedirectService>;

  beforeEach(async () => {
    // Create mock services
    const mockUrlService = {
      createShortUrl: jest.fn(),
    };

    const mockRedirectService = {
      resolve: jest.fn(),
    };

    const mockClickEventPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UrlController],
      providers: [
        {
          provide: UrlService,
          useValue: mockUrlService,
        },
        {
          provide: RedirectService,
          useValue: mockRedirectService,
        },
        {
          provide: ClickEventPublisher,
          useValue: mockClickEventPublisher,
        },
      ],
    }).compile();

    controller = module.get<UrlController>(UrlController);
    urlService = module.get(UrlService);
    redirectService = module.get(RedirectService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a short URL successfully", async () => {
      // Arrange
      const dto: CreateUrlDto = {
        longUrl: "https://www.example.com",
      };
      const expectedResult = {
        shortCode: "abc123d",
        longUrl: dto.longUrl,
      };

      urlService.createShortUrl.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.create(dto);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(urlService.createShortUrl).toHaveBeenCalledWith(dto);
    });

    it("should create a short URL with userId", async () => {
      // Arrange
      const dto: CreateUrlDto = {
        longUrl: "https://www.example.com",
        userId: "user-123",
      };
      const expectedResult = {
        shortCode: "xyz789a",
        longUrl: dto.longUrl,
      };

      urlService.createShortUrl.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.create(dto);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(urlService.createShortUrl).toHaveBeenCalledWith(dto);
    });

    it("should propagate service errors", async () => {
      // Arrange
      const dto: CreateUrlDto = {
        longUrl: "https://www.example.com",
      };
      const error = new Error("Service error");

      urlService.createShortUrl.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(dto)).rejects.toThrow("Service error");
    });
  });

  describe("redirect", () => {
    const mockRequest = {
      headers: {
        "user-agent": "TestAgent",
        referer: "http://example.com",
      },
      ip: "127.0.0.1",
    } as unknown as Request;

    it("should redirect to long URL for valid short code", async () => {
      // Arrange
      const shortCode = "abc123d";
      const longUrl = "https://www.example.com";
      const mockResponse = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      redirectService.resolve.mockResolvedValue({ longUrl });

      // Act
      await controller.redirect(shortCode, mockRequest, mockResponse);

      // Assert
      expect(redirectService.resolve).toHaveBeenCalledWith(shortCode);
      expect(mockResponse.redirect).toHaveBeenCalledWith(302, longUrl);
    });

    it("should throw NotFoundException for non-existent short code", async () => {
      // Arrange
      const shortCode = "nonexistent";
      const mockResponse = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      redirectService.resolve.mockResolvedValue(null);

      // Act & Assert
      await expect(
        controller.redirect(shortCode, mockRequest, mockResponse),
      ).rejects.toThrow(NotFoundException);
      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });

    it("should return 410 for expired URLs", async () => {
      // Arrange
      const shortCode = "expired";
      const mockResponse = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      redirectService.resolve.mockResolvedValue({
        longUrl: "https://www.example.com",
        expiresAt: Math.floor(Date.now() / 1000) - 100,
      });

      // Act
      await controller.redirect(shortCode, mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(410);
      expect(mockResponse.send).toHaveBeenCalledWith("Link expired");
      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });

    it("should propagate service errors", async () => {
      // Arrange
      const shortCode = "abc123d";
      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;
      const error = new Error("Service error");

      redirectService.resolve.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.redirect(shortCode, mockRequest, mockResponse),
      ).rejects.toThrow("Service error");
      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });

    it("should call redirect service with correct short code", async () => {
      // Arrange
      const shortCode = "test123";
      const longUrl = "https://www.test.com";
      const mockResponse = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      redirectService.resolve.mockResolvedValue({ longUrl });

      // Act
      await controller.redirect(shortCode, mockRequest, mockResponse);

      // Assert
      expect(redirectService.resolve).toHaveBeenCalledWith(shortCode);
      expect(redirectService.resolve).toHaveBeenCalledTimes(1);
    });
  });
});
