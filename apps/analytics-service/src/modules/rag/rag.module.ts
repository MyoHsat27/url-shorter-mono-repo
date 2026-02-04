import { Module } from "@nestjs/common";
import { RagService } from "./rag.service";
import { RagController } from "./rag.controller";
import { FactGenerationModule } from "../fact-generation/fact-generation.module";

@Module({
  imports: [FactGenerationModule],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
