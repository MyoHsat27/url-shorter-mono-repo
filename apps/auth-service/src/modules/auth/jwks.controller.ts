import { Controller, Get } from "@nestjs/common";
import { JwkService } from "./services/jwk.service";

@Controller(".well-known")
export class JwksController {
  constructor(private readonly jwkService: JwkService) {}

  @Get("jwks.json")
  getJwks() {
    return this.jwkService.getJwks();
  }
}
