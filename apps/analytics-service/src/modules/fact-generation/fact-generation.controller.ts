import { Controller, Post } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { FactGenerationService } from "./fact-generation.service";

@ApiTags("Facts")
@Controller("facts")
export class FactGenerationController {
  constructor(private readonly factGenerationService: FactGenerationService) {}

  @Post("generate")
  @ApiOperation({ summary: "Manually trigger fact generation" })
  @ApiResponse({ status: 201, description: "Facts generated successfully" })
  async triggerGeneration(): Promise<{ generated: number }> {
    return this.factGenerationService.triggerGeneration();
  }
}
