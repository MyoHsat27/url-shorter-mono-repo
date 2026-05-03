import {
  Controller,
  Post,
  Get,
  Delete,
  Req,
  Res,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { AnalyticsMcpServer } from "./analytics-mcp.server";
import type { IncomingMessage, ServerResponse } from "http";

/**
 * HTTP endpoint for MCP clients to connect to.
 *
 * MCP uses JSON-RPC 2.0 over HTTP. This controller handles:
 *   POST /mcp   -> MCP messages (tool calls, list tools, etc.)
 *   GET  /mcp   -> SSE stream for server-to-client notifications
 *   DELETE /mcp  -> Close session
 *
 * How to connect from Claude Desktop:
 *   Add to claude_desktop_config.json:
 *   {
 *     "mcpServers": {
 *       "url-analytics": {
 *         "url": "http://localhost:3200/mcp"
 *       }
 *     }
 *   }
 */
@ApiTags("MCP")
@Controller("mcp")
export class McpController {
  private readonly logger = new Logger(McpController.name);
  private transport: StreamableHTTPServerTransport | null = null;

  constructor(private readonly mcpServer: AnalyticsMcpServer) {}

  private async getTransport(): Promise<StreamableHTTPServerTransport> {
    if (!this.transport) {
      this.transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await this.mcpServer.server.connect(this.transport);
      this.logger.log("MCP transport connected");
    }
    return this.transport;
  }

  @Post()
  @ApiOperation({ summary: "MCP message endpoint (JSON-RPC)" })
  async handlePost(@Req() req: IncomingMessage, @Res() res: ServerResponse) {
    try {
      const transport = await this.getTransport();
      await transport.handleRequest(req, res);
    } catch (error) {
      this.logger.error(`MCP POST error: ${error}`);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "MCP request failed" }));
      }
    }
  }

  @Get()
  @ApiOperation({ summary: "MCP SSE stream endpoint" })
  async handleGet(@Req() req: IncomingMessage, @Res() res: ServerResponse) {
    try {
      const transport = await this.getTransport();
      await transport.handleRequest(req, res);
    } catch (error) {
      this.logger.error(`MCP GET error: ${error}`);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "MCP SSE failed" }));
      }
    }
  }

  @Delete()
  @ApiOperation({ summary: "Close MCP session" })
  async handleDelete(@Req() req: IncomingMessage, @Res() res: ServerResponse) {
    try {
      const transport = await this.getTransport();
      await transport.handleRequest(req, res);
    } catch (error) {
      this.logger.error(`MCP DELETE error: ${error}`);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "MCP session close failed" }));
      }
    }
  }
}
