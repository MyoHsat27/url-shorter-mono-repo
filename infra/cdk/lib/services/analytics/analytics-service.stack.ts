import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { RemovalPolicy } from "aws-cdk-lib";
import { TimestreamTable } from "../../constructs/timestream.construct";

interface AnalyticsServiceStackProps extends StackProps {
  vpc: ec2.IVpc;
  cluster: ecs.ICluster;
  clickEventsQueue: sqs.IQueue;
  clicksTable: TimestreamTable;
  environment?: string;
  imageUrl?: string;
}

export class AnalyticsServiceStack extends Stack {
  public readonly service: ecs.FargateService;
  public readonly taskDefinition: ecs.FargateTaskDefinition;

  constructor(scope: Construct, id: string, props: AnalyticsServiceStackProps) {
    super(scope, id, props);

    const envName = props.environment || "prod";
    const usingSampleImage = !props.imageUrl;

    const logGroup = new logs.LogGroup(this, "LogGroup", {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDef", {
      cpu: 256,
      memoryLimitMiB: 512,
    });

    const container = this.taskDefinition.addContainer("analytics-service", {
      image: props.imageUrl
        ? ecs.ContainerImage.fromRegistry(props.imageUrl)
        : ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: "AnalyticsService",
        logGroup: logGroup,
      }),
      environment: usingSampleImage
        ? undefined
        : {
            SERVICE_NAME: "Analytics Service",
            NODE_ENV: envName,
            AWS_REGION: this.region,
            SQS_QUEUE_URL: props.clickEventsQueue.queueUrl,
            TIMESTREAM_DATABASE: props.clicksTable.databaseName,
            TIMESTREAM_TABLE: props.clicksTable.tableName,
          },
    });

    container.addPortMappings({
      containerPort: 3000,
    });

    this.service = new ecs.FargateService(this, "Service", {
      serviceName: "AnalyticsServiceStack-AnalyticsService",
      cluster: props.cluster,
      taskDefinition: this.taskDefinition,
      desiredCount: 1,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    if (!usingSampleImage) {
      props.clickEventsQueue.grantConsumeMessages(this.taskDefinition.taskRole);

      this.taskDefinition.taskRole.addToPrincipalPolicy(
        new iam.PolicyStatement({
          actions: ["timestream:WriteRecords", "timestream:DescribeEndpoints"],
          resources: ["*"],
        }),
      );

      this.taskDefinition.taskRole.addToPrincipalPolicy(
        new iam.PolicyStatement({
          actions: ["timestream:DescribeEndpoints"],
          resources: ["*"],
        }),
      );
    }
  }
}
