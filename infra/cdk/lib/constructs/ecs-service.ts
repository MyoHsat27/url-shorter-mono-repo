import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as codedeploy from "aws-cdk-lib/aws-codedeploy";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { Duration, RemovalPolicy } from "aws-cdk-lib";

export interface EcsServiceProps {
  vpc: ec2.IVpc;
  cluster: ecs.ICluster;
  cpu?: number;
  memory?: number;
  imageUrl?: string;
  containerPort?: number;
  environment?: { [key: string]: string };
  secrets?: { [key: string]: ecs.Secret };
  loadBalancer?: {
    listener: elbv2.IApplicationListener;
    pathPattern: string;
    priority?: number;
  };
  enableCodeDeploy?: boolean;
  albSecurityGroup?: ec2.ISecurityGroup;
}

export class EcsService extends Construct {
  public readonly service: ecs.FargateService;
  public readonly taskDefinition: ecs.FargateTaskDefinition;
  public readonly targetGroup?: elbv2.ApplicationTargetGroup;

  constructor(scope: Construct, id: string, props: EcsServiceProps) {
    super(scope, id);

    const cpu = props.cpu || 512;
    const memory = props.memory || 1024;

    // Determine if we are using the sample image
    const isSampleImage =
      !props.imageUrl || props.imageUrl.includes("amazon-ecs-sample");

    // Sample image listens on port 80, otherwise use provided port or default to 3000
    const containerPort = isSampleImage ? 80 : props.containerPort || 3000;
    const healthCheckPath = isSampleImage ? "/" : "/health";

    // Logging
    const logGroup = new logs.LogGroup(this, "LogGroup", {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDef", {
      cpu,
      memoryLimitMiB: memory,
    });

    const container = this.taskDefinition.addContainer("Container", {
      image: props.imageUrl
        ? ecs.ContainerImage.fromRegistry(props.imageUrl)
        : ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: id,
        logGroup: logGroup,
      }),
      environment: props.environment,
      secrets: isSampleImage ? undefined : props.secrets,
    });

    container.addPortMappings({
      containerPort,
    });

    let blueTargetGroup: elbv2.ApplicationTargetGroup | undefined;
    let greenTargetGroup: elbv2.ApplicationTargetGroup | undefined;

    if (props.loadBalancer && props.enableCodeDeploy) {
      blueTargetGroup = new elbv2.ApplicationTargetGroup(this, "BlueTG", {
        vpc: props.vpc,
        port: containerPort,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targetType: elbv2.TargetType.IP,
        healthCheck: {
          path: healthCheckPath,
          interval: Duration.seconds(30),
          timeout: Duration.seconds(29),
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 3,
        },
        deregistrationDelay: Duration.seconds(30),
      });

      greenTargetGroup = new elbv2.ApplicationTargetGroup(this, "GreenTG", {
        vpc: props.vpc,
        port: containerPort,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targetType: elbv2.TargetType.IP,
        healthCheck: {
          path: healthCheckPath,
          interval: Duration.seconds(30),
          timeout: Duration.seconds(29),
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 3,
        },
        deregistrationDelay: Duration.seconds(30),
      });

      this.targetGroup = blueTargetGroup;

      new elbv2.ApplicationListenerRule(this, `${id}Rule`, {
        listener: props.loadBalancer.listener,
        action: elbv2.ListenerAction.forward([blueTargetGroup]),
        conditions: [
          elbv2.ListenerCondition.pathPatterns([
            props.loadBalancer.pathPattern,
          ]),
        ],
        priority: props.loadBalancer.priority ?? 1,
      });
    }

    // Create the ECS service with load balancer config if using CodeDeploy
    this.service = new ecs.FargateService(this, "Service", {
      cluster: props.cluster,
      taskDefinition: this.taskDefinition,
      deploymentController: props.enableCodeDeploy
        ? {
            type: ecs.DeploymentControllerType.CODE_DEPLOY,
          }
        : undefined,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      healthCheckGracePeriod: props.loadBalancer
        ? Duration.seconds(60)
        : undefined,
    });

    if (props.enableCodeDeploy && blueTargetGroup && props.loadBalancer) {
      this.service.attachToApplicationTargetGroup(blueTargetGroup);

      // Allow traffic from ALB security group
      if (props.albSecurityGroup) {
        this.service.connections.allowFrom(
          props.albSecurityGroup,
          ec2.Port.tcp(containerPort),
          "Allow inbound from ALB",
        );
      } else {
        // Fallback: allow from anywhere (for testing without ALB SG)
        this.service.connections.allowFrom(
          ec2.Peer.anyIpv4(),
          ec2.Port.tcp(containerPort),
          "Allow inbound from anywhere",
        );
      }
    }

    // Setup CodeDeploy deployment group
    if (
      props.loadBalancer &&
      props.enableCodeDeploy &&
      blueTargetGroup &&
      greenTargetGroup
    ) {
      const application = new codedeploy.EcsApplication(this, "CodeDeployApp", {
        applicationName: id,
      });

      new codedeploy.EcsDeploymentGroup(this, "CodeDeployGroup", {
        application,
        service: this.service,
        blueGreenDeploymentConfig: {
          blueTargetGroup,
          greenTargetGroup,
          listener: props.loadBalancer.listener,
        },
        deploymentConfig: codedeploy.EcsDeploymentConfig.ALL_AT_ONCE,
      });
    }

    // Handle non-CodeDeploy load balancer attachment
    if (props.loadBalancer && !props.enableCodeDeploy) {
      this.targetGroup = new elbv2.ApplicationTargetGroup(this, "TargetGroup", {
        vpc: props.vpc,
        port: containerPort,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targetType: elbv2.TargetType.IP,
        healthCheck: {
          path: healthCheckPath,
          interval: Duration.seconds(30),
          timeout: Duration.seconds(29),
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 3,
        },
        deregistrationDelay: Duration.seconds(30),
        targets: [this.service],
      });

      new elbv2.ApplicationListenerRule(this, `${id}Rule`, {
        listener: props.loadBalancer.listener,
        action: elbv2.ListenerAction.forward([this.targetGroup]),
        conditions: [
          elbv2.ListenerCondition.pathPatterns([
            props.loadBalancer.pathPattern,
          ]),
        ],
        priority: props.loadBalancer.priority ?? 1,
      });
    }
  }
}
