import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { EcsService } from "../../constructs/ecs-service";

interface UrlServiceStackProps extends StackProps {
  vpc: ec2.IVpc;
  cluster: ecs.ICluster;
  table: dynamodb.ITable;
  listener: elbv2.IApplicationListener;
  environment?: string;
  redisSecurityGroup: ec2.ISecurityGroup;
  imageUrl?: string;
}

export class UrlServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: UrlServiceStackProps) {
    super(scope, id, props);

    const envName = props.environment || "prod";
    const usingSampleImage = !props.imageUrl;

    const appSecrets = usingSampleImage
      ? undefined
      : secretsmanager.Secret.fromSecretNameV2(
          this,
          "AppSecrets",
          `url-shortner/${envName}/url-service`,
        );

    const service = new EcsService(this, "UrlService", {
      vpc: props.vpc,
      cluster: props.cluster,
      serviceName: "UrlServiceStack-UrlServiceService",
      imageUrl: props.imageUrl,
      containerName: "url-service",
      containerPort: 3100,
      healthPath: "/health",
      loadBalancer: {
        listener: props.listener,
        pathPattern: "/api/*",
        priority: 10,
      },
      enableCodeDeploy: true,
      environment: usingSampleImage
        ? undefined
        : {
            SERVICE_NAME: "URL Service",
            PORT: "3100",
            NODE_ENV: envName,
            AWS_REGION: this.region,
            DYNAMODB_TABLE_NAME: props.table.tableName,
            DYNAMODB_ENDPOINT: `https://dynamodb.us-east-1.amazonaws.com`,
          },
      secrets:
        usingSampleImage || !appSecrets
          ? undefined
          : {
              REDIS_HOST: ecs.Secret.fromSecretsManager(
                appSecrets,
                "REDIS_HOST",
              ),
              REDIS_PORT: ecs.Secret.fromSecretsManager(
                appSecrets,
                "REDIS_PORT",
              ),
              REDIS_PASSWORD: ecs.Secret.fromSecretsManager(
                appSecrets,
                "REDIS_PASSWORD",
              ),
              CORS_ORIGIN: ecs.Secret.fromSecretsManager(
                appSecrets,
                "CORS_ORIGIN",
              ),
              AWS_ACCESS_KEY_ID: ecs.Secret.fromSecretsManager(
                appSecrets,
                "AWS_ACCESS_KEY_ID",
              ),
              AWS_SECRET_ACCESS_KEY: ecs.Secret.fromSecretsManager(
                appSecrets,
                "AWS_SECRET_ACCESS_KEY",
              ),
            },
    });

    if (service.targetGroup) {
      new elbv2.ApplicationListenerRule(this, "UrlServiceRedirectRule", {
        listener: props.listener,
        action: elbv2.ListenerAction.forward([service.targetGroup]),
        conditions: [elbv2.ListenerCondition.pathPatterns(["/*"])],
        priority: 100,
      });
    }

    if (!usingSampleImage && appSecrets) {
      props.table.grantReadWriteData(service.taskDefinition.taskRole);
      appSecrets.grantRead(service.taskDefinition.taskRole);
    }

    new ec2.CfnSecurityGroupIngress(this, "RedisIngress", {
      groupId: props.redisSecurityGroup.securityGroupId,
      ipProtocol: "tcp",
      fromPort: 6379,
      toPort: 6379,
      sourceSecurityGroupId:
        service.service.connections.securityGroups[0].securityGroupId,
      description: "Allow inbound from URL Service",
    });
  }
}
