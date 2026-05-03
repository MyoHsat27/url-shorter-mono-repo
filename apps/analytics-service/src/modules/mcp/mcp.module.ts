import { Module } from "@nestjs/common";
import { McpController } from "./mcp.controller";
import { AnalyticsMcpServer } from "./analytics-mcp.server";
import { RagModule } from "../rag/rag.module";

@Module({
  imports: [RagModule],
  controllers: [McpController],
  providers: [AnalyticsMcpServer],
})
export class McpModule {}
