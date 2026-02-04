import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { BullBoardModule } from "@bull-board/nestjs";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import {
  FactGenerationService,
  FACT_GENERATION_QUEUE,
} from "./fact-generation.service";
import { FactGenerationController } from "./fact-generation.controller";
import { FactGenerationProcessor } from "./fact-generation.processor";
import { FactsRepository } from "./facts.repository";
import { ClickAnalyticsModule } from "../click-analytics/click-analytics.module";

@Module({
  imports: [
    ClickAnalyticsModule,
    BullModule.registerQueue({
      name: FACT_GENERATION_QUEUE,
    }),
    BullBoardModule.forFeature({
      name: FACT_GENERATION_QUEUE,
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [FactGenerationController],
  providers: [FactGenerationService, FactGenerationProcessor, FactsRepository],
  exports: [FactGenerationService, FactsRepository],
})
export class FactGenerationModule {}
