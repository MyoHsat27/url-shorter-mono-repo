import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { JwksController } from "./jwks.controller";
import { AuthService } from "./services/auth.service";
import { JwkService } from "./services/jwk.service";
import { TokenService } from "./services/token.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { DynamoUserRepository, USER_REPOSITORY_TOKEN } from "./repository";

@Module({
  controllers: [AuthController, JwksController],
  providers: [
    AuthService,
    JwkService,
    TokenService,
    JwtAuthGuard,
    {
      provide: USER_REPOSITORY_TOKEN,
      useClass: DynamoUserRepository,
    },
  ],
  exports: [JwkService, TokenService],
})
export class AuthModule {}
