import { Inject, Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { REDIS_CLIENT } from "src/infrastructure";
import { IUrlRepository, URL_REPOSITORY_TOKEN } from "../repository";
import { MAX_CACHE_TTL_SECONDS } from "../constants";

@Injectable()
export class RedirectService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,

    @Inject(URL_REPOSITORY_TOKEN)
    private readonly urlRepo: IUrlRepository,
  ) {}

  async resolve(
    shortCode: string,
  ): Promise<{ longUrl: string; expiresAt?: number } | null> {
    const cacheKey = `url:${shortCode}`;
    const nowSeconds = Math.floor(Date.now() / 1000);

    const cached = await this.redis.get(cacheKey);

    if (cached) {
      const parsed = JSON.parse(cached) as {
        longUrl: string;
        expiresAt?: number;
      };

      if (parsed.expiresAt && parsed.expiresAt <= nowSeconds) {
        await this.redis.del(cacheKey);
        return null;
      }

      return { longUrl: parsed.longUrl, expiresAt: parsed.expiresAt };
    }

    const record = await this.urlRepo.findByShortCode(shortCode);
    if (!record) return null;

    if (record.expiresAt && record.expiresAt <= nowSeconds) return null;

    let ttl = MAX_CACHE_TTL_SECONDS;

    if (record.expiresAt) {
      const remaining = record.expiresAt - nowSeconds;
      ttl = Math.min(remaining, MAX_CACHE_TTL_SECONDS);

      if (ttl <= 0) {
        return null;
      }
    }

    await this.redis.set(
      cacheKey,
      JSON.stringify({
        longUrl: record.longUrl,
        expiresAt: record.expiresAt,
      }),
      "EX",
      ttl,
    );

    return { longUrl: record.longUrl, expiresAt: record.expiresAt };
  }
}
