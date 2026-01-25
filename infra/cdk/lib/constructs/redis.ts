import * as elasticache from "aws-cdk-lib/aws-elasticache";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export interface RedisClusterProps {
  vpc: ec2.IVpc;
  subnetGroup: elasticache.CfnSubnetGroup;
  securityGroup: ec2.ISecurityGroup;
  nodeType?: string;
  numCacheNodes?: number;
}

export class RedisCluster extends Construct {
  public readonly cluster: elasticache.CfnCacheCluster;
  public readonly securityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: RedisClusterProps) {
    super(scope, id);

    this.securityGroup = props.securityGroup;

    this.cluster = new elasticache.CfnCacheCluster(this, "Redis", {
      engine: "redis",
      cacheNodeType: props.nodeType || "cache.t4g.micro",
      numCacheNodes: props.numCacheNodes || 1,
      vpcSecurityGroupIds: [props.securityGroup.securityGroupId],
      cacheSubnetGroupName: props.subnetGroup.ref,
    });
  }
}
