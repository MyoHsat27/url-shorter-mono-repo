/* eslint-disable @typescript-eslint/no-unused-vars */
import { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppLogger } from "@url-shortner/nestjs-common";
import Redis from "ioredis";
import { AppConfig } from "src/config/configuration";

export const REDIS_CLIENT = "REDIS_CLIENT";

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService, AppLogger],
  useFactory: (configSevice: ConfigService<AppConfig>, logger: AppLogger) => {
    const redisConfig = configSevice.get("redis", {
      infer: true,
    });

    if (!redisConfig) {
      logger.warn(
        "Redis Config not configured, session memory will not persist",
      );
      return null;
    }

    try {
      const redis = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        lazyConnect: false,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });
      redis.on("connect", () => {
        logger.info("Redis connected");
      });

      redis.on("error", (err) => {
        logger.error("Redis error", err.message, "RedisProvider");
      });

      return redis;
    } catch (error) {
      logger.error("Failed to connect to Redis");
      return null;
    }
  },
};
