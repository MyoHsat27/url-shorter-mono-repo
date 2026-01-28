#!/bin/bash
set -e

# Usage: ./deploy.sh <CLUSTER_NAME> <SERVICE_NAME> <CONTAINER_NAME> <IMAGE_URI> <REGION> <CODEDEPLOY_APP_KEYWORD> <CONTAINER_PORT>

CLUSTER_NAME=$1
SERVICE_NAME=$2
CONTAINER_NAME=$3
IMAGE_URI=$4
AWS_REGION=$5
CODEDEPLOY_APP_KEYWORD=$6
CONTAINER_PORT=$7

if [ -z "$CLUSTER_NAME" ] || [ -z "$SERVICE_NAME" ] || [ -z "$CONTAINER_NAME" ] || [ -z "$IMAGE_URI" ] || [ -z "$AWS_REGION" ] || [ -z "$CODEDEPLOY_APP_KEYWORD" ]; then
  echo "Error: Missing required arguments."
  echo "Usage: ./deploy.sh <CLUSTER_NAME> <SERVICE_NAME> <CONTAINER_NAME> <IMAGE_URI> <REGION> <CODEDEPLOY_APP_KEYWORD> [CONTAINER_PORT]"
  exit 1
fi

if [ -z "$CONTAINER_PORT" ]; then
  CONTAINER_PORT=3000
fi

echo "Deploying to Cluster: $CLUSTER_NAME, Service: $SERVICE_NAME"
echo "Image: $IMAGE_URI"

# 1. Get current Task Definition
echo "Fetching current task definition..."
TASK_DEFINITION_ARN=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[0].taskDefinition' \
  --output text)

echo "Current Task Definition ARN: $TASK_DEFINITION_ARN"

# Get full task definition JSON
aws ecs describe-task-definition \
  --task-definition $TASK_DEFINITION_ARN \
  --region $AWS_REGION \
  --query 'taskDefinition' \
  > task-definition.json

# 2. Update Task Definition with new Image
echo "Updating task definition with new image..."

# Create a new task definition by replacing the image for the specific container
jq --arg IMAGE "$IMAGE_URI" --arg CONTAINER "$CONTAINER_NAME" \
  '.containerDefinitions |= map(if .name == $CONTAINER then .image = $IMAGE else . end) | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)' \
  task-definition.json > new-task-def.json

# Register the new task definition
NEW_TASK_DEF_ARN=$(aws ecs register-task-definition \
  --cli-input-json file://new-task-def.json \
  --region $AWS_REGION \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "Registered new Task Definition: $NEW_TASK_DEF_ARN"

# 3. Get CodeDeploy Info
echo "Finding CodeDeploy Application..."
APP_NAME=$(aws deploy list-applications \
  --region $AWS_REGION \
  --query "applications[?contains(@, '$CODEDEPLOY_APP_KEYWORD')]" \
  --output text | head -n 1)

if [ -z "$APP_NAME" ]; then
    echo "Error: CodeDeploy Application containing '$CODEDEPLOY_APP_KEYWORD' not found."
    exit 1
fi
echo "Found Application: $APP_NAME"

DEPLOYMENT_GROUP=$(aws deploy list-deployment-groups \
  --application-name $APP_NAME \
  --region $AWS_REGION \
  --query 'deploymentGroups[0]' \
  --output text)

echo "Found Deployment Group: $DEPLOYMENT_GROUP"

# 4. Create AppSpec
echo "Creating AppSpec..."
cat > appspec.json <<EOF
{
  "version": 0.0,
  "Resources": [
    {
      "TargetService": {
        "Type": "AWS::ECS::Service",
        "Properties": {
          "TaskDefinition": "$NEW_TASK_DEF_ARN",
          "LoadBalancerInfo": {
            "ContainerName": "$CONTAINER_NAME",
            "ContainerPort": $CONTAINER_PORT
          }
        }
      }
    }
  ]
}
EOF

# 5. Trigger Deployment
echo "Triggering CodeDeploy..."
DEPLOYMENT_ID=$(aws deploy create-deployment \
  --application-name $APP_NAME \
  --deployment-group-name $DEPLOYMENT_GROUP \
  --revision '{"revisionType":"AppSpecContent","appSpecContent":{"content":"'"$(cat appspec.json | jq -c .)"'"}}' \
  --description "Deployment triggered by script - Image: $IMAGE_URI" \
  --region $AWS_REGION \
  --query 'deploymentId' \
  --output text)

echo "Deployment ID: $DEPLOYMENT_ID"

# 6. Wait for Completion
echo "Waiting for deployment to complete..."
aws deploy wait deployment-successful \
  --deployment-id $DEPLOYMENT_ID \
  --region $AWS_REGION

echo "✅ Deployment completed successfully!"
