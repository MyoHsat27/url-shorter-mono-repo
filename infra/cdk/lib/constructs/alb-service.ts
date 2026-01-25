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

    if (props.certificate) {
      // If certificate is provided, redirect HTTP to HTTPS
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
      // No certificate - HTTP listener is already configured above
      // Create a dummy HTTPS listener that points to the same HTTP listener
      // This is needed for compatibility with code that expects httpsListener to exist
      this.httpsListener = this.httpListener;
    }
  }
}
