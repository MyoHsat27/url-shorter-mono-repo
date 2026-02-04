import { Provider } from "@nestjs/common";
import { SQSClient } from "@aws-sdk/client-sqs";
import { ConfigService } from "@nestjs/config";
import { AppConfig } from "src/config/configuration";

export const SQS_CLIENT = "SQS_CLIENT";

export const sqsClientProvider: Provider = {
  provide: SQS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService<AppConfig>): SQSClient => {
    const awsConfig = configService.getOrThrow("aws", {
      infer: true,
    });

    return new SQSClient({
      region: awsConfig.region,
      endpoint: awsConfig.endpoint,
      credentials: {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
      },
    });
  },
};
