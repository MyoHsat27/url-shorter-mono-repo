import { RemovalPolicy } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export interface DynamoDbTableProps extends dynamodb.TableProps {
  destroyOnRemoval?: boolean;
}

export class DynamoDbTable extends dynamodb.Table {
  constructor(scope: Construct, id: string, props: DynamoDbTableProps) {
    const { destroyOnRemoval, ...tableProps } = props;

    super(scope, id, {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: destroyOnRemoval
        ? RemovalPolicy.DESTROY
        : RemovalPolicy.RETAIN,
      ...tableProps,
    });
  }
}
