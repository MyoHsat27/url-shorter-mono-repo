import { Module } from "@nestjs/common";
import { RagService } from "./rag.service";
import { RagController } from "./rag.controller";
import { FactGenerationModule } from "../fact-generation/fact-generation.module";
import { ToolHandlerService } from "./tools/tool-handler.service";

@Module({
  imports: [FactGenerationModule],
  controllers: [RagController],
  providers: [RagService, ToolHandlerService],
  exports: [RagService, ToolHandlerService],
})
export class RagModule {}
