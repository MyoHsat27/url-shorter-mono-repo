#!/bin/bash
set -e

echo "============================================"
echo "Initializing LocalStack services..."
echo "============================================"

# Wait for LocalStack to be ready
sleep 5

# DynamoDB: Create URLs table
echo "Creating DynamoDB table: urls"

awslocal dynamodb create-table \
  --table-name urls \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1 || echo "Table 'urls' already exists"

echo "DynamoDB table created successfully"

# SQS: Create click analytics queue
echo "Creating SQS queues..."

# Create Dead Letter Queue first
awslocal sqs create-queue \
  --queue-name analytics-click-events-dlq \
  --region us-east-1 || echo "DLQ already exists"

# Get DLQ ARN
DLQ_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/analytics-click-events-dlq \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text \
  --region us-east-1)

echo "DLQ ARN: $DLQ_ARN"

# Create main queue with DLQ redrive policy
awslocal sqs create-queue \
  --queue-name analytics-click-events \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}" \
  --region us-east-1 || echo "Main queue already exists"

echo "SQS queues created successfully"

# List created resources
echo ""
echo "============================================"
echo "LocalStack initialization complete!"
echo "============================================"
echo ""
echo "DynamoDB Tables:"
awslocal dynamodb list-tables --region us-east-1

echo ""
echo "SQS Queues:"
awslocal sqs list-queues --region us-east-1

echo ""
echo "============================================"
echo "Endpoints:"
echo "  DynamoDB: http://localhost:4566"
echo "  SQS:      http://localhost:4566"
echo "============================================"