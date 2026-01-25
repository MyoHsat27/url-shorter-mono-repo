import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elasticache from "aws-cdk-lib/aws-elasticache";
import { DynamoDbTable } from "../../constructs/dynamodb-table";
import { RedisCluster } from "../../constructs/redis";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

interface UrlDataStackProps extends StackProps {
  vpc: ec2.IVpc;
}

export class UrlDataStack extends Stack {
  public readonly table: DynamoDbTable;
  public readonly redis: RedisCluster;

  constructor(scope: Construct, id: string, props: UrlDataStackProps) {
    super(scope, id, props);

    this.table = new DynamoDbTable(this, "UrlsTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: "expiresAt",
      destroyOnRemoval: true,
    });

    const redisSg = new ec2.SecurityGroup(this, "RedisSG", {
      vpc: props.vpc,
      description: "Security Group for Redis",
      allowAllOutbound: true,
    });

    const subnetGroup = new elasticache.CfnSubnetGroup(
      this,
      "RedisSubnetGroup",
      {
        description: "Subnet group for Redis",
        subnetIds: props.vpc.privateSubnets.map((s) => s.subnetId),
      },
    );

    this.redis = new RedisCluster(this, "UrlRedis", {
      vpc: props.vpc,
      securityGroup: redisSg,
      subnetGroup: subnetGroup,
    });
  }
}
