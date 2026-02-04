import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { SQS_CLIENT } from "src/infrastructure";

export interface ClickEvent {
  shortCode: string;
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
  referer?: string;
}

@Injectable()
export class ClickEventPublisher {
  private readonly logger = new Logger(ClickEventPublisher.name);
  private readonly queueUrl: string;

  constructor(
    @Inject(SQS_CLIENT)
    private readonly sqsClient: SQSClient,
    private readonly configService: ConfigService,
  ) {
    this.queueUrl = this.configService.get<string>("SQS_QUEUE_URL", "");
  }

  async publish(event: ClickEvent): Promise<void> {
    if (!this.queueUrl) {
      this.logger.warn("SQS_QUEUE_URL not configured, skipping click event");
      return;
    }

    try {
      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(event),
        MessageAttributes: {
          eventType: {
            DataType: "String",
            StringValue: "url_click",
          },
        },
      });

      await this.sqsClient.send(command);
      this.logger.debug(`Click event published for ${event.shortCode}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish click event: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
