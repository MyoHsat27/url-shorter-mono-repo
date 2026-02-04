import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { BullBoardModule } from "@bull-board/nestjs";
import { ExpressAdapter } from "@bull-board/express";
import { AppService } from "./app.service";
import { AppController } from "./app.controller";
import { CoreModule } from "@url-shortner/nestjs-common";
import { AppConfigModule } from "./config/config.module";
import { SqsModule, TimescaleModule, OllamaModule } from "./infrastructure";
import { ClickAnalyticsModule } from "./modules/click-analytics/click-analytics.module";
import { FactGenerationModule } from "./modules/fact-generation/fact-generation.module";
import { RagModule } from "./modules/rag/rag.module";
import { RedisModule } from "./infrastructure";

@Module({
  imports: [
    // Configuration
    AppConfigModule,

    RedisModule,

    // BullMQ for job scheduling
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>("REDIS_HOST", "localhost"),
          port: configService.get<number>("REDIS_PORT", 6379),
        },
      }),
    }),

    // Bull Board UI (accessible at /admin/queues)
    BullBoardModule.forRoot({
      route: "/admin/queues",
      adapter: ExpressAdapter,
    }),

    // Core module
    CoreModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        env: configService.get<string>("NODE_ENV", "development"),
        serviceName: configService.get<string>(
          "SERVICE_NAME",
          "analytics-service",
        ),
        debug: configService.get<string>("NODE_ENV") !== "production",
      }),
      inject: [ConfigService],
    }),

    // Infrastructure modules
    SqsModule,
    TimescaleModule,
    OllamaModule,

    // Feature modules
    ClickAnalyticsModule,
    FactGenerationModule,
    RagModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
