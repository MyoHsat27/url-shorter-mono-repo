import { Provider } from "@nestjs/common";
import { SQSClient } from "@aws-sdk/client-sqs";
import { ConfigService } from "@nestjs/config";

export const SQS_CLIENT = "SQS_CLIENT";

export const sqsClientProvider: Provider = {
  provide: SQS_CLIENT,
  useFactory: (configService: ConfigService): SQSClient => {
    const region = configService.get<string>("AWS_REGION", "us-east-1");

    return new SQSClient({
      region,
    });
  },
  inject: [ConfigService],
};
