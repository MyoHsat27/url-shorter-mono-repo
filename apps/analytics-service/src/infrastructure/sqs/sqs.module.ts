import { Module, Global } from "@nestjs/common";
import { sqsClientProvider, SQS_CLIENT } from "./sqs.provider";

export { SQS_CLIENT };

@Global()
@Module({
  providers: [sqsClientProvider],
  exports: [sqsClientProvider],
})
export class SqsModule {}
