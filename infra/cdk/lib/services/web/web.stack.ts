import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { EcsService } from "../../constructs/ecs-service";

interface WebStackProps extends StackProps {
  vpc: ec2.IVpc;
  cluster: ecs.ICluster;
  listener: elbv2.IApplicationListener;
}

export class WebStack extends Stack {
  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);

    new EcsService(this, "WebService", {
      vpc: props.vpc,
      cluster: props.cluster,
      memory: 1024,
      cpu: 512,
      enableCodeDeploy: true,
      loadBalancer: {
        listener: props.listener,
        pathPattern: "/*",
        priority: 20,
      },
    });
  }
}
