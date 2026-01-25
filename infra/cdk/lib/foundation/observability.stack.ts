import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";

export class ObservabilityStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new cloudwatch.Dashboard(this, "GlobalDashboard", {
      dashboardName: "UrlShortener-Global",
    });
  }
}
