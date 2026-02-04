import { Logger, Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool } from "pg";
import { AppConfig } from "src/config/configuration";

export const TIMESCALE_POOL = "TIMESCALE_POOL";

export const timescalePoolProvider: Provider = {
  provide: TIMESCALE_POOL,
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService<AppConfig>,
  ): Promise<Pool> => {
    const logger = new Logger("TimescaleProvider");
    const config = configService.getOrThrow("timescale", { infer: true });

    const pool = new Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Test connection
    try {
      const client = await pool.connect();
      await client.query("SELECT 1");
      client.release();
      logger.log(`Connected to TimescaleDB at ${config.host}:${config.port}`);
    } catch (error) {
      logger.error(`Failed to connect to TimescaleDB: ${error}`);
      throw error;
    }

    return pool;
  },
};
