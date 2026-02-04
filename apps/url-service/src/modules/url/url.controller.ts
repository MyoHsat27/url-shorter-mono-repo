import { Body, Controller, Get, Param, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { UrlService } from "./services/url.service";
import { RedirectService } from "./services/redirect.service";
import { ClickEventPublisher } from "./services/click-event.publisher";
import { NotFoundException } from "@url-shortner/nestjs-common";
import { CreateUrlDto } from "./dto";

@Controller()
export class UrlController {
  constructor(
    private readonly urlService: UrlService,
    private readonly redirectService: RedirectService,
    private readonly clickEventPublisher: ClickEventPublisher,
  ) {}

  @Post("/api")
  async create(@Body() dto: CreateUrlDto) {
    return this.urlService.createShortUrl(dto);
  }

  @Get("/:shortCode")
  async redirect(
    @Param("shortCode") shortCode: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.redirectService.resolve(shortCode);

    if (!result) {
      throw new NotFoundException();
    }

    if (result.expiresAt) {
      return res.status(410).send("Link expired");
    }

    this.clickEventPublisher
      .publish({
        shortCode,
        timestamp: new Date().toISOString(),
        userAgent: req.headers["user-agent"],
        ipAddress:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.ip,
        referer: req.headers["referer"] as string,
      })
      .catch(() => {});

    return res.redirect(302, result.longUrl);
  }
}
