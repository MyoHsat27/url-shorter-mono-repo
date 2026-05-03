import { Inject, Injectable } from "@nestjs/common";
import { IUrlRepository, URL_REPOSITORY_TOKEN } from "../repository";
import { CreateUrlDto } from "../dto";
import { generateShortCode } from "../utils";
import {
  ValidationException,
  NotFoundException,
  ForbiddenException,
} from "@url-shortner/nestjs-common";

@Injectable()
export class UrlService {
  constructor(
    @Inject(URL_REPOSITORY_TOKEN)
    private readonly urlRepo: IUrlRepository,
  ) {}

  async createShortUrl(dto: CreateUrlDto) {
    const shortCode = generateShortCode();
    const nowMs = Date.now();

    let expiresAt: number | undefined;

    if (dto.expiresAt) {
      const expiresMs = new Date(dto.expiresAt).getTime();

      if (expiresMs <= nowMs) {
        throw new ValidationException("expiresAt must be in the future");
      }

      expiresAt = Math.floor(expiresMs / 1000);
    }

    await this.urlRepo.create({
      pk: `URL#${shortCode}`,
      sk: "METADATA",
      shortCode,
      longUrl: dto.longUrl,
      createdAt: nowMs,
      ...(dto.userId && { userId: dto.userId }),
      ...(expiresAt && { expiresAt }),
    });

    return {
      shortCode,
      longUrl: dto.longUrl,
    };
  }

  async getUserUrls(userId: string) {
    const urls = await this.urlRepo.findByUserId(userId);
    return urls.map((url) => ({
      shortCode: url.shortCode,
      longUrl: url.longUrl,
      createdAt: url.createdAt,
      expiresAt: url.expiresAt,
    }));
  }

  async getUserUrl(userId: string, shortCode: string) {
    const url = await this.urlRepo.findByShortCode(shortCode);

    if (!url) {
      throw new NotFoundException("URL not found");
    }

    if (url.userId !== userId) {
      throw new ForbiddenException("You do not own this URL");
    }

    return {
      shortCode: url.shortCode,
      longUrl: url.longUrl,
      createdAt: url.createdAt,
      expiresAt: url.expiresAt,
      userId: url.userId,
    };
  }

  async deleteUrl(userId: string, shortCode: string) {
    const url = await this.urlRepo.findByShortCode(shortCode);

    if (!url) {
      throw new NotFoundException("URL not found");
    }

    if (url.userId !== userId) {
      throw new ForbiddenException("You do not own this URL");
    }

    await this.urlRepo.delete(shortCode);

    return { deleted: true, shortCode };
  }
}
