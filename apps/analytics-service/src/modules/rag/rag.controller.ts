import { Body, Controller, Delete, Param, Post } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { RagService } from "./rag.service";
import { ChatRequestDto, ChatResponseDto } from "./dto/chat.dto";
import { v4 as uuidv4 } from "uuid";

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
