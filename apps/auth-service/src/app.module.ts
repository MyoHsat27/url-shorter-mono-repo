import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./modules/auth/auth.module";
import { AppConfigModule } from "./config/config.module";
import { CoreModule } from "@url-shortner/nestjs-common";
import { DynamoDBModule } from "./infrastructure";

@Module({
  imports: [
    // Configuration
    AppConfigModule,

    // Core module
    CoreModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        env: configService.get<string>("NODE_ENV", "development"),
        serviceName: configService.get<string>("SERVICE_NAME", "auth-service"),
        debug: configService.get<string>("NODE_ENV") !== "production",
      }),
      inject: [ConfigService],
    }),

    // Infrastructure modules
    DynamoDBModule,

    // Feature modules
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
