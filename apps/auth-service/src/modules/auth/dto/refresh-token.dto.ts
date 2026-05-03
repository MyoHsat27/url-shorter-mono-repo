import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class RefreshTokenDto {
  @ApiProperty({
    description: "Refresh token",
    example: "eyJhbGciOiJSUzI1NiIs...",
  })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
