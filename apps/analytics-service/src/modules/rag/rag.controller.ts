import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { RagService } from "./rag.service";
import { ChatRequestDto, ChatResponseDto } from "./dto/chat.dto";
import { v4 as uuidv4 } from "uuid";
import {
  JwksAuthGuard,
  CurrentUser,
  AuthUser,
} from "@url-shortner/nestjs-common";

@ApiTags("Chat")
@Controller("chat")
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post()
  @ApiOperation({ summary: "Send a message to the analytics AI" })
  @ApiResponse({ status: 200, type: ChatResponseDto })
  async chat(@Body() dto: ChatRequestDto): Promise<ChatResponseDto> {
    const sessionId = dto.sessionId || uuidv4();

    const { response, facts } = await this.ragService.chat(
      sessionId,
      dto.message,
    );

    return {
      response,
      sessionId,
      facts: facts.map((f) => ({
        factText: f.factText,
        factType: f.factType,
        similarity: f.similarity,
      })),
    };
  }

  @Post("stream")
  @ApiOperation({ summary: "Stream a message to the analytics AI (global)" })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async chatStream(@Body() dto: ChatRequestDto, @Res() res: any) {
    const sessionId = dto.sessionId || uuidv4();

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      for await (const chunk of this.ragService.chatStream(
        sessionId,
        dto.message,
      )) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } catch {
      res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post("user/stream")
  @UseGuards(JwksAuthGuard)
  @ApiOperation({
    summary: "Stream a message to the analytics AI (user-scoped)",
  })
  async userChatStream(
    @Body() dto: ChatRequestDto,
    @CurrentUser() user: AuthUser,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Res() res: any,
  ) {
    const sessionId = dto.sessionId || `user-${user.sub}-${uuidv4()}`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      for await (const chunk of this.ragService.chatStream(
        sessionId,
        dto.message,
        user.sub,
      )) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } catch {
      res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Delete("session/:sessionId")
  @ApiOperation({ summary: "Clear a chat session" })
  @ApiResponse({ status: 200, description: "Session cleared" })
  async clearSession(
    @Param("sessionId") sessionId: string,
  ): Promise<{ cleared: boolean }> {
    await this.ragService.clearSession(sessionId);
    return { cleared: true };
  }
}
