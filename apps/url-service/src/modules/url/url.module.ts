import { Module } from "@nestjs/common";
import { UrlService } from "./services/url.service";
import { RedirectService } from "./services/redirect.service";
import { ClickEventPublisher } from "./services/click-event.publisher";
import { UrlController } from "./url.controller";
import { DynamoUrlRepository, URL_REPOSITORY_TOKEN } from "./repository";

@Module({
  controllers: [UrlController],
  providers: [
    UrlService,
    RedirectService,
    ClickEventPublisher,
    {
      provide: URL_REPOSITORY_TOKEN,
      useClass: DynamoUrlRepository,
    },
  ],
})
export class UrlModule {}
