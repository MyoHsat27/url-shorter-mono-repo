import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppConfig } from "src/config/configuration";

export const DYNAMODB_DOCUMENT = "DYNAMODB_DOCUMENT";

export const dynamoDbProvider: Provider = {
  provide: DYNAMODB_DOCUMENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService<AppConfig>) => {
    const dynamodbConfig = configService.getOrThrow("database.dynamodb", {
      infer: true,
    });

    const client = new DynamoDBClient({
      region: dynamodbConfig.region,
      endpoint: dynamodbConfig.endpoint,
      credentials: {
        accessKeyId: dynamodbConfig.accessKeyId,
        secretAccessKey: dynamodbConfig.secretAccessKey,
      },
    });

    return DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
  },
};
