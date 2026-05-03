import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { EcsService } from "../../constructs/ecs-service";

interface AuthServiceStackProps extends StackProps {
  vpc: ec2.IVpc;
  cluster: ecs.ICluster;
  usersTable: dynamodb.ITable;
  listener: elbv2.IApplicationListener;
  environment?: string;
  imageUrl?: string;
}

export class AuthServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: AuthServiceStackProps) {
    super(scope, id, props);

    const envName = props.environment || "prod";
    const usingSampleImage = !props.imageUrl;

    const appSecrets = usingSampleImage
      ? undefined
      : secretsmanager.Secret.fromSecretNameV2(
          this,
          "AppSecrets",
          `url-shortner/${envName}/auth-service`,
        );

    const service = new EcsService(this, "AuthService", {
      vpc: props.vpc,
      cluster: props.cluster,
      serviceName: "AuthServiceStack-AuthService",
      imageUrl: props.imageUrl,
      containerName: "auth-service",
      containerPort: 3300,
      healthPath: "/health",
      loadBalancer: {
        listener: props.listener,
        pathPattern: "/auth/*",
        priority: 15,
      },
      enableCodeDeploy: true,
      environment: usingSampleImage
        ? undefined
        : {
            SERVICE_NAME: "Auth Service",
            PORT: "3300",
            NODE_ENV: envName,
            AWS_REGION: this.region,
            DYNAMODB_TABLE_NAME: props.usersTable.tableName,
            DYNAMODB_ENDPOINT: `https://dynamodb.us-east-1.amazonaws.com`,
          },
      secrets:
        usingSampleImage || !appSecrets
          ? undefined
          : {
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

    // Also add /.well-known/* path for JWKS endpoint
    if (service.targetGroup) {
      new elbv2.ApplicationListenerRule(this, "AuthJwksRule", {
        listener: props.listener,
        action: elbv2.ListenerAction.forward([service.targetGroup]),
        conditions: [elbv2.ListenerCondition.pathPatterns(["/.well-known/*"])],
        priority: 10,
      });
    }

    if (!usingSampleImage && appSecrets) {
      props.usersTable.grantReadWriteData(service.taskDefinition.taskRole);
      appSecrets.grantRead(service.taskDefinition.taskRole);
    }
  }
}
