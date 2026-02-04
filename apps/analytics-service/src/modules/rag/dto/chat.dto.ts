import { IsString, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ChatRequestDto {
  @ApiProperty({ description: "User message/question" })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: "Session ID for conversation continuity",
  })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class ChatResponseDto {
  @ApiProperty({ description: "AI-generated response" })
  response: string;

  @ApiProperty({ description: "Session ID for follow-up questions" })
  sessionId: string;

  @ApiProperty({ description: "Relevant facts used for the response" })
  facts: Array<{
    factText: string;
    factType: string;
    similarity?: number;
  }>;
}
