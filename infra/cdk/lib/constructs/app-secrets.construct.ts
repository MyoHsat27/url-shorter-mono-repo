import { Construct } from "constructs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { RemovalPolicy } from "aws-cdk-lib";

export interface AppSecretsProps {
  secretName: string;
  description?: string;
  removalPolicy?: RemovalPolicy;
}

export class AppSecrets extends Construct {
  public readonly secret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: AppSecretsProps) {
    super(scope, id);

    this.secret = new secretsmanager.Secret(this, "Secret", {
      secretName: props.secretName,
      description: props.description || `Application secrets for ${id}`,
      removalPolicy: props.removalPolicy || RemovalPolicy.RETAIN,
    });
  }

  public getSecret(key: string): ecs.Secret {
    return ecs.Secret.fromSecretsManager(this.secret, key);
  }

  public grantRead(grantee: any) {
    this.secret.grantRead(grantee);
  }
}
