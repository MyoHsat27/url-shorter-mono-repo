import { ApiProperty } from "@nestjs/swagger";

export class UrlDto {
  @ApiProperty({
    description: "The long url to be shortened",
    example: "https://www.google.com",
    type: String,
  })
  longUrl: string;

  @ApiProperty({
    description: "The user id",
    example: "user-123",
    type: String,
  })
  userId?: string;

  @ApiProperty({
    description: "Absolute expiration time (ISO string)",
    example: "2026-06-10T12:00:00Z",
    required: false,
  })
  expiresAt?: string;
}
