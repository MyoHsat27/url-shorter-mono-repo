import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { SqsQueue } from "../../constructs/sqs.construct";
import { TimestreamTable } from "../../constructs/timestream.construct";

interface AnalyticsDataStackProps extends StackProps {
  environment?: string;
}

export class AnalyticsDataStack extends Stack {
  public readonly clickEventsQueue: SqsQueue;
  public readonly clicksTable: TimestreamTable;

  constructor(scope: Construct, id: string, props?: AnalyticsDataStackProps) {
    super(scope, id, props);

    const envName = props?.environment || "prod";

    this.clickEventsQueue = new SqsQueue(this, "ClickEventsQueue", {
      queueName: `url-shortner-click-events-${envName}`,
      enableDlq: true,
      maxReceiveCount: 3,
      destroyOnRemoval: true,
    });

    this.clicksTable = new TimestreamTable(this, "ClicksTimestream", {
      databaseName: `url-shortner-analytics-${envName}`,
      tableName: "clicks",
      memoryRetentionHours: 24,
      magneticRetentionDays: 30,
      destroyOnRemoval: true,
    });
  }
}
