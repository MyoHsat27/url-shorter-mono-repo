import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { DynamoDbTable } from "../../constructs/dynamodb-table";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export class AuthDataStack extends Stack {
  public readonly usersTable: DynamoDbTable;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.usersTable = new DynamoDbTable(this, "UsersTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      destroyOnRemoval: true,
    });

    // Add email GSI for login lookups
    this.usersTable.addGlobalSecondaryIndex({
      indexName: "email-index",
      partitionKey: { name: "email", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
  }
}
