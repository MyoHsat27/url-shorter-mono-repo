import { Module } from "@nestjs/common";
import { UrlService } from "./services/url.service";
import { RedirectService } from "./services/redirect.service";
import { UrlController } from "./url.controller";
import { DynamoUrlRepository, URL_REPOSITORY_TOKEN } from "./repository";

@Module({
  controllers: [UrlController],
  providers: [
    UrlService,
    RedirectService,
    {
      provide: URL_REPOSITORY_TOKEN,
      useClass: DynamoUrlRepository,
    },
  ],
})
export class UrlModule {}
