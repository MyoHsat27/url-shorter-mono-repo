import * as sqs from "aws-cdk-lib/aws-sqs";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface SqsQueueProps {
  queueName: string;
  visibilityTimeout?: Duration;
  retentionPeriod?: Duration;
  enableDlq?: boolean;
  maxReceiveCount?: number;
  destroyOnRemoval?: boolean;
}

export class SqsQueue extends Construct {
  public readonly queue: sqs.Queue;
  public readonly dlq?: sqs.Queue;

  constructor(scope: Construct, id: string, props: SqsQueueProps) {
    super(scope, id);

    const removalPolicy = props.destroyOnRemoval
      ? RemovalPolicy.DESTROY
      : RemovalPolicy.RETAIN;

    if (props.enableDlq !== false) {
      this.dlq = new sqs.Queue(this, "DLQ", {
        queueName: `${props.queueName}-dlq`,
        retentionPeriod: Duration.days(14),
        removalPolicy,
      });
    }

    this.queue = new sqs.Queue(this, "Queue", {
      queueName: props.queueName,
      visibilityTimeout: props.visibilityTimeout ?? Duration.seconds(30),
      retentionPeriod: props.retentionPeriod ?? Duration.days(4),
      deadLetterQueue: this.dlq
        ? {
            queue: this.dlq,
            maxReceiveCount: props.maxReceiveCount ?? 3,
          }
        : undefined,
      removalPolicy,
    });
  }
}
