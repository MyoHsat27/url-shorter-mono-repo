import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";

export class NetworkStack extends Stack {
  public readonly vpc: ec2.Vpc;
  public readonly cluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, "UrlVpc", {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC },
        { name: "private", subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      ],
    });

    this.cluster = new ecs.Cluster(this, "SharedCluster", {
      vpc: this.vpc,
    });
  }
}
