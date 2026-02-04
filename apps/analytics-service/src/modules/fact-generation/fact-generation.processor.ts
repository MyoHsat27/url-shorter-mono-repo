import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import {
  FactGenerationService,
  FACT_GENERATION_QUEUE,
  FACT_GENERATION_JOB,
} from "./fact-generation.service";

@Processor(FACT_GENERATION_QUEUE)
export class FactGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(FactGenerationProcessor.name);

  constructor(private readonly factGenerationService: FactGenerationService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job: ${job.name} (ID: ${job.id})`);

    switch (job.name) {
      case FACT_GENERATION_JOB:
        await this.factGenerationService.generateFacts();
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }

    this.logger.log(`Job ${job.id} completed`);
  }
}
