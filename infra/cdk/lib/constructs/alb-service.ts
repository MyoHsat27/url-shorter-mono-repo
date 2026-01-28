import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";

export interface AlbServiceProps {
  vpc: ec2.IVpc;
  certificate?: acm.ICertificate;
  internetFacing?: boolean;
}

export class AlbService extends Construct {
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly httpsListener: elbv2.ApplicationListener;
  public readonly httpListener: elbv2.ApplicationListener;
  public readonly securityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: AlbServiceProps) {
    super(scope, id);

    this.alb = new elbv2.ApplicationLoadBalancer(this, "Alb", {
      vpc: props.vpc,
      internetFacing: props.internetFacing ?? true,
    });

    this.httpListener = this.alb.addListener("HttpListener", {
      port: 80,
      defaultAction: elbv2.ListenerAction.fixedResponse(404, {
        messageBody: "Not Found",
      }),
    });

    this.securityGroup = this.alb.connections.securityGroups[0];

    if (props.certificate) {
      this.httpListener.addAction("HttpToHttpsRedirect", {
        action: elbv2.ListenerAction.redirect({
          protocol: "HTTPS",
          port: "443",
          permanent: true,
        }),
        priority: 1,
      });

      this.httpsListener = this.alb.addListener("HttpsListener", {
        port: 443,
        certificates: [props.certificate],
        defaultAction: elbv2.ListenerAction.fixedResponse(404, {
          messageBody: "Not Found",
        }),
      });
    } else {
      this.httpsListener = this.httpListener;
    }
  }
}
