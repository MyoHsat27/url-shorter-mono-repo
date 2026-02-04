import { Global, Module } from "@nestjs/common";
import { redisProvider, REDIS_CLIENT } from "./redis.provider";

export { REDIS_CLIENT };

@Global()
@Module({
  providers: [redisProvider],
  exports: [redisProvider],
})
export class RedisModule {}
