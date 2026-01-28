#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { NetworkStack } from "../lib/foundation/network.stack";
import { SecurityStack } from "../lib/foundation/security.stack";
import { ObservabilityStack } from "../lib/foundation/observability.stack";
import { AlbStack } from "../lib/foundation/alb.stack";
import { UrlDataStack } from "../lib/services/url/url-data.stack";
import { UrlServiceStack } from "../lib/services/url/url-service.stack";
import { WebStack } from "../lib/services/web/web.stack";

const app = new cdk.App();
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// Foundation
const network = new NetworkStack(app, "NetworkStack", { env });
new SecurityStack(app, "SecurityStack", { env });
new ObservabilityStack(app, "ObservabilityStack", {
  env,
});
const alb = new AlbStack(app, "AlbStack", {
  vpc: network.vpc,
  env,
});

// Services: URL
const urlData = new UrlDataStack(app, "UrlDataStack", {
  vpc: network.vpc,
  env,
});

const urlImage = app.node.tryGetContext("urlImage");
new UrlServiceStack(app, "UrlServiceStack", {
  vpc: network.vpc,
  cluster: network.cluster,
  table: urlData.table,
  listener: alb.albService.httpListener,
  redisSecurityGroup: urlData.redis.securityGroup,
  imageUrl: urlImage,
  env,
});

// Services: Web
const webImage = app.node.tryGetContext("webImage");
new WebStack(app, "WebStack", {
  vpc: network.vpc,
  cluster: network.cluster,
  listener: alb.albService.httpListener,
  imageUrl: webImage,
  env,
});

app.synth();
