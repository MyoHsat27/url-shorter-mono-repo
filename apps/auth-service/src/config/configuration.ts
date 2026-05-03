const configuration = () => ({
  app: {
    name: process.env.SERVICE_NAME,
    port: parseInt(process.env.PORT || "3300", 10),
    env: process.env.NODE_ENV || "development",
  },
  database: {
    dynamodb: {
      region: process.env.AWS_REGION || "us-east-1",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      endpoint: process.env.DYNAMODB_ENDPOINT || "http://localhost:4566",
      tableName: process.env.DYNAMODB_TABLE_NAME || "users",
    },
  },
});

export type AppConfig = ReturnType<typeof configuration>;
export default configuration;
