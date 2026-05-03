import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ToolHandlerService } from "../rag/tools/tool-handler.service";

/**
 * MCP Server that wraps our existing ToolHandlerService.
 *
 * This exposes the SAME tools that the LLM uses internally,
 * but over the MCP protocol so external clients can use them too:
 *   - Claude Desktop
 *   - VS Code Copilot
 *   - Any MCP-compatible client
 *
 * Architecture:
 *   Internal (fast):  RagService -> ToolHandlerService -> TimescaleDB
 *   External (MCP):   Claude Desktop -> MCP Server -> ToolHandlerService -> TimescaleDB
 *
 * Both paths use the exact same tool logic.
 */
@Injectable()
export class AnalyticsMcpServer implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsMcpServer.name);
  readonly server: McpServer;

  constructor(private readonly toolHandler: ToolHandlerService) {
    this.server = new McpServer({
      name: "url-analytics",
      version: "1.0.0",
    });
  }

  onModuleInit() {
    this.registerTools();
    this.logger.log("MCP Server initialized with analytics tools");
  }

  private registerTools() {
    this.server.registerTool(
      "get_click_stats",
      {
        title: "Get Click Stats",
        description:
          "Get click statistics for a specific short URL. Returns total clicks, unique visitors, and recent click trend.",
        inputSchema: {
          short_code: z.string().describe("The short code of the URL"),
          hours: z
            .number()
            .optional()
            .default(24)
            .describe("Hours to look back (max 168)"),
        },
      },
      async ({ short_code, hours }) => {
        const result = await this.toolHandler.execute("get_click_stats", {
          short_code,
          hours,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result.data, null, 2),
            },
          ],
          isError: !result.success,
        };
      },
    );

    this.server.registerTool(
      "get_trending_links",
      {
        title: "Get Trending Links",
        description:
          "Get the most popular/trending links sorted by click count.",
        inputSchema: {
          limit: z
            .number()
            .optional()
            .default(5)
            .describe("Number of top links (max 20)"),
          hours: z
            .number()
            .optional()
            .default(24)
            .describe("Hours to look back (max 168)"),
        },
      },
      async ({ limit, hours }) => {
        const result = await this.toolHandler.execute("get_trending_links", {
          limit,
          hours,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result.data, null, 2),
            },
          ],
          isError: !result.success,
        };
      },
    );

    this.server.registerTool(
      "get_geo_breakdown",
      {
        title: "Get Geographic Breakdown",
        description: "Get geographic breakdown of clicks by country.",
        inputSchema: {
          short_code: z
            .string()
            .optional()
            .describe("Filter to a specific short URL"),
          hours: z
            .number()
            .optional()
            .default(24)
            .describe("Hours to look back (max 168)"),
        },
      },
      async ({ short_code, hours }) => {
        const result = await this.toolHandler.execute("get_geo_breakdown", {
          short_code,
          hours,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result.data, null, 2),
            },
          ],
          isError: !result.success,
        };
      },
    );

    this.server.registerTool(
      "get_traffic_pattern",
      {
        title: "Get Traffic Pattern",
        description: "Get hourly traffic patterns showing clicks per hour.",
        inputSchema: {
          short_code: z
            .string()
            .optional()
            .describe("Filter to a specific short URL"),
          hours: z
            .number()
            .optional()
            .default(24)
            .describe("Hours to look back (max 168)"),
        },
      },
      async ({ short_code, hours }) => {
        const result = await this.toolHandler.execute("get_traffic_pattern", {
          short_code,
          hours,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result.data, null, 2),
            },
          ],
          isError: !result.success,
        };
      },
    );
  }
}
