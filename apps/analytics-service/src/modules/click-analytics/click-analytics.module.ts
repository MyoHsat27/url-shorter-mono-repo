import { Module } from "@nestjs/common";
import { ClickAnalyticsService } from "./services/click-analytics.service";
import { SqsConsumerService } from "./services/sqs-consumer.service";
import { AnalyticsRepository } from "./repositories/analytics.repository";
import { AnalyticsController } from "./controllers/analytics.controller";

@Module({
  controllers: [AnalyticsController],
  providers: [ClickAnalyticsService, SqsConsumerService, AnalyticsRepository],
  exports: [ClickAnalyticsService, AnalyticsRepository],
})
export class ClickAnalyticsModule {}
