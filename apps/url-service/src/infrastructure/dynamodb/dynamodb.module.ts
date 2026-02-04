import { Global, Module } from "@nestjs/common";
import { dynamoDbProvider, DYNAMODB_DOCUMENT } from "./dynamodb.provider";

export { DYNAMODB_DOCUMENT };

@Global()
@Module({
  providers: [dynamoDbProvider],
  exports: [dynamoDbProvider],
})
export class DynamoDBModule {}
