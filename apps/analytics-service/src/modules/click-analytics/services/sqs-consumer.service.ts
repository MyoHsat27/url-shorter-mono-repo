import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import { SQS_CLIENT } from "src/infrastructure/sqs/sqs.module";
import { ClickAnalyticsService } from "./click-analytics.service";
import { ClickEvent } from "../interfaces/click-event.interface";
import { AppConfig } from "src/config/configuration";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SqsConsumerService implements OnModuleInit {
  private readonly logger = new Logger(SqsConsumerService.name);
  private readonly queueUrl: string;
  private isPolling = false;

  constructor(
    @Inject(SQS_CLIENT)
    private readonly sqsClient: SQSClient,
    private readonly configService: ConfigService<AppConfig>,
    private readonly clickAnalyticsService: ClickAnalyticsService,
  ) {
    this.queueUrl =
      this.configService.get("sqs.queueUrl", { infer: true }) || "";
  }

  onModuleInit() {
    if (!this.queueUrl) {
      this.logger.warn("SQS_QUEUE_URL not configured, consumer not started");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.startPolling();
  }

  private async startPolling(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;
    this.logger.log(`Starting SQS polling... Queue URL: ${this.queueUrl}`);

    while (this.isPolling) {
      try {
        await this.pollMessages();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? `${error.name}: ${error.message}`
            : JSON.stringify(error);
        this.logger.error(`Polling error: ${errorMessage}`);
        await this.sleep(5000);
      }
    }
  }

  private async pollMessages(): Promise<void> {
    const command = new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,
      MessageAttributeNames: ["All"],
    });

    const response = await this.sqsClient.send(command);

    if (!response.Messages || response.Messages.length === 0) {
      return;
    }

    for (const message of response.Messages) {
      try {
        if (message.Body) {
          const event: ClickEvent = JSON.parse(message.Body);
          await this.clickAnalyticsService.recordClick(event);
        }

        if (message.ReceiptHandle) {
          await this.sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: this.queueUrl,
              ReceiptHandle: message.ReceiptHandle,
            }),
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to process message: ${error instanceof Error ? error.message : "Unknown"}`,
        );
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  stopPolling(): void {
    this.isPolling = false;
  }
}
