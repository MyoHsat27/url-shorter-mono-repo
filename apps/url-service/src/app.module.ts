import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UrlModule } from "./modules/url/url.module";
import { AppConfigModule } from "./config/config.module";
import { CoreModule, AuthModule } from "@url-shortner/nestjs-common";
import { DynamoDBModule, RedisModule, SqsModule } from "./infrastructure";

@Module({
  imports: [
    // Configuration
    AppConfigModule,

    // Core module
    CoreModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        env: configService.get<string>("NODE_ENV", "development"),
        serviceName: configService.get<string>("SERVICE_NAME", "url-service"),
        debug: configService.get<string>("NODE_ENV") !== "production",
      }),
      inject: [ConfigService],
    }),

    // Auth module
    AuthModule.forRoot({
      jwksUri:
        process.env.AUTH_JWKS_URI ||
        "http://localhost:3300/.well-known/jwks.json",
    }),

    // Infrastructure modules
    DynamoDBModule,
    RedisModule,
    SqsModule,

    // Feature modules
    UrlModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
