#!/bin/sh

aws dynamodb create-table \
  --table-name urls \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000 \
  --region ap-southeast-1 || true

aws dynamodb update-time-to-live \
  --table-name urls \
  --time-to-live-specification \
    Enabled=true,AttributeName=expiresAt \
  --endpoint-url http://localhost:8000 \
  --region ap-southeast-1

aws dynamodb list-tables \
  --endpoint-url http://localhost:8000
