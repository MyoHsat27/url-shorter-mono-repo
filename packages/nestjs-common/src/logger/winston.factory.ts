/* eslint-disable @typescript-eslint/no-base-to-string */
import * as winston from "winston";

const INTERNAL_KEYS = ["service", "context", "timestamp", "level", "message"];

function formatMeta(meta: Record<string, unknown>): string {
  const filteredMeta = Object.entries(meta).filter(
    ([key]) => !INTERNAL_KEYS.includes(key),
  );

  if (filteredMeta.length === 0) {
    return "";
  }

  const formatted = filteredMeta
    .map(([key, value]) => {
      if (value === undefined || value === null) {
        return `${key}=${String(value)}`;
      }
      if (typeof value === "object") {
        return `${key}=${JSON.stringify(value)}`;
      }
      return `${key}=${String(value)}`;
    })
    .join(" ");

  return ` | ${formatted}`;
}

export function createWinstonLogger(
  env: string,
  serviceName?: string,
): winston.Logger {
  const transports: winston.transport[] = [];

  if (env === "production") {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    );
  } else {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
          winston.format.printf((info: winston.Logform.TransformableInfo) => {
            const { level, message, timestamp, ...meta } = info;

            const context =
              typeof meta.context === "string" ? meta.context : "App";

            const metaStr = formatMeta(meta);

            return `${String(timestamp)} [${context}] ${level}: ${String(message)}${metaStr}`;
          }),
        ),
      }),
    );
  }

  return winston.createLogger({
    level: env === "production" ? "info" : "debug",
    defaultMeta: {
      service: serviceName,
    },
    transports,
  });
}
