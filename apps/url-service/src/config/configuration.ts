const configuration = () => ({
  app: {
    name: process.env.SERVICE_NAME,
    port: parseInt(process.env.PORT || "3000", 10),
    env: process.env.NODE_ENV || "development",
  },
  database: {
    dynamodb: {
      region: process.env.AWS_REGION || "ap-southeast-1",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      endpoint: process.env.DYNAMODB_ENDPOINT || "http://localhost:8000",
      tableName: process.env.DYNAMODB_TABLE_NAME || "urls",
    },
    redis: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      password: process.env.REDIS_PASSWORD || "",
    },
  },
});

export type AppConfig = ReturnType<typeof configuration>;
export default configuration;
