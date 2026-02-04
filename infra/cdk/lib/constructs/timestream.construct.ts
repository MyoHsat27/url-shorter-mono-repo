import * as timestream from "aws-cdk-lib/aws-timestream";
import { RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface TimestreamTableProps {
  databaseName: string;
  tableName: string;
  memoryRetentionHours?: number;
  magneticRetentionDays?: number;
  destroyOnRemoval?: boolean;
}

export class TimestreamTable extends Construct {
  public readonly database: timestream.CfnDatabase;
  public readonly table: timestream.CfnTable;
  public readonly databaseName: string;
  public readonly tableName: string;

  constructor(scope: Construct, id: string, props: TimestreamTableProps) {
    super(scope, id);

    this.databaseName = props.databaseName;
    this.tableName = props.tableName;

    const removalPolicy = props.destroyOnRemoval
      ? RemovalPolicy.DESTROY
      : RemovalPolicy.RETAIN;

    this.database = new timestream.CfnDatabase(this, "Database", {
      databaseName: props.databaseName,
    });
    this.database.applyRemovalPolicy(removalPolicy);

    this.table = new timestream.CfnTable(this, "Table", {
      databaseName: props.databaseName,
      tableName: props.tableName,
      retentionProperties: {
        memoryStoreRetentionPeriodInHours: String(
          props.memoryRetentionHours ?? 24,
        ),
        magneticStoreRetentionPeriodInDays: String(
          props.magneticRetentionDays ?? 30,
        ),
      },
      magneticStoreWriteProperties: {
        enableMagneticStoreWrites: true,
      },
    });
    this.table.addDependency(this.database);
    this.table.applyRemovalPolicy(removalPolicy);
  }
}
