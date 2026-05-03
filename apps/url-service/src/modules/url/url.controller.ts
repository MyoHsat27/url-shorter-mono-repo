import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { UrlService } from "./services/url.service";
import { RedirectService } from "./services/redirect.service";
import { ClickEventPublisher } from "./services/click-event.publisher";
import {
  NotFoundException,
  OptionalAuthGuard,
  JwksAuthGuard,
  CurrentUser,
  AuthUser,
} from "@url-shortner/nestjs-common";
import { CreateUrlDto } from "./dto";

@Controller()
export class UrlController {
  constructor(
    private readonly urlService: UrlService,
    private readonly redirectService: RedirectService,
    private readonly clickEventPublisher: ClickEventPublisher,
  ) {}

  @Post("/api")
  @UseGuards(OptionalAuthGuard)
  async create(
    @Body() dto: CreateUrlDto,
    @CurrentUser() user: AuthUser | null,
  ) {
    // If user is authenticated, use their ID
    if (user) {
      dto.userId = user.sub;
    }
    return this.urlService.createShortUrl(dto);
  }

  @Get("/api/urls")
  @UseGuards(JwksAuthGuard)
  async getUserUrls(@CurrentUser() user: AuthUser) {
    return this.urlService.getUserUrls(user.sub);
  }

  @Get("/api/urls/:shortCode")
  @UseGuards(JwksAuthGuard)
  async getUserUrl(
    @Param("shortCode") shortCode: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.urlService.getUserUrl(user.sub, shortCode);
  }

  @Delete("/api/urls/:shortCode")
  @UseGuards(JwksAuthGuard)
  async deleteUrl(
    @Param("shortCode") shortCode: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.urlService.deleteUrl(user.sub, shortCode);
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
        longUrl: result.longUrl,
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
