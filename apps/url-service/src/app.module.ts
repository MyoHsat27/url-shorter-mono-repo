import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UrlModule } from "./modules/url/url.module";
import { ConfigModule } from "./config/config.module";
import { CoreModule } from "@url-shortner/nestjs-common";
import { DynamoDBModule, RedisModule } from "./infrastructure";

@Module({
  imports: [
    // Configuration
    ConfigModule,

    // Core module
    CoreModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        env: configService.get<string>("NODE_ENV", "development"),
        serviceName: configService.get<string>("SERVICE_NAME", "url-service"),
        debug: configService.get<string>("NODE_ENV") !== "production",
      }),
      inject: [ConfigService],
    }),

    // Infrastructure modules
    DynamoDBModule,
    RedisModule,

    // Feature modules
    UrlModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
