import { Global, Module } from "@nestjs/common";
import { dynamoDbProvider } from "./dynamodb.provider";

@Global()
@Module({
  providers: [dynamoDbProvider],
  exports: [dynamoDbProvider],
})
export class DynamoDBModule {}
