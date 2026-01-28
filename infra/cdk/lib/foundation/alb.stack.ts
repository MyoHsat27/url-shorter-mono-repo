import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { AlbService } from "../constructs/alb-service";
import * as ec2 from "aws-cdk-lib/aws-ec2";

interface AlbStackProps extends StackProps {
  vpc: ec2.IVpc;
}

export class AlbStack extends Stack {
  public readonly albService: AlbService;

  constructor(scope: Construct, id: string, props: AlbStackProps) {
    super(scope, id, props);

    this.albService = new AlbService(this, "SharedAlb", {
      vpc: props.vpc,
    });
  }
}
