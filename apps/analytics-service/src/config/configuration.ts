const configuration = () => ({
  app: {
    name: process.env.SERVICE_NAME,
    port: parseInt(process.env.PORT || "3000", 10),
    env: process.env.NODE_ENV || "development",
  },
  aws: {
    region: process.env.AWS_REGION || "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    endpoint: process.env.AWS_ENDPOINT || undefined,
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || "",
  },
  sqs: {
    queueUrl: process.env.SQS_QUEUE_URL || "",
  },
  timescale: {
    host: process.env.TIMESCALE_HOST || "localhost",
    port: parseInt(process.env.TIMESCALE_PORT || "5432", 10),
    user: process.env.TIMESCALE_USER || "analytics",
    password: process.env.TIMESCALE_PASSWORD || "analytics",
    database: process.env.TIMESCALE_DATABASE || "analytics",
  },
  bedrock: {
    modelId:
      process.env.BEDROCK_MODEL_ID ||
      "anthropic.claude-3-5-sonnet-20241022-v2:0",
    embeddingModelId:
      process.env.BEDROCK_EMBEDDING_MODEL_ID || "amazon.titan-embed-text-v2:0",
  },
});

export type AppConfig = ReturnType<typeof configuration>;
export default configuration;
