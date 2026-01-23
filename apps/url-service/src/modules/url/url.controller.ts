import { Body, Controller, Get, Param, Post, Res } from "@nestjs/common";
import { Response } from "express";
import { UrlService } from "./services/url.service";
import { RedirectService } from "./services/redirect.service";
import { NotFoundException } from "@url-shortner/nestjs-common";
import { CreateUrlDto } from "./dto";

@Controller()
export class UrlController {
  constructor(
    private readonly urlService: UrlService,
    private readonly redirectService: RedirectService,
  ) {}

  @Post()
  async create(@Body() dto: CreateUrlDto) {
    return this.urlService.createShortUrl(dto);
  }

  @Get("/:shortCode")
  async redirect(@Param("shortCode") shortCode: string, @Res() res: Response) {
    const result = await this.redirectService.resolve(shortCode);

    if (!result) {
      throw new NotFoundException();
    }

    if (result.expiresAt) {
      return res.status(410).send("Link expired");
    }
    return res.redirect(302, result.longUrl);
  }
}
