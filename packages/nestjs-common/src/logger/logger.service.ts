import {
  Inject,
  Injectable,
  LoggerService as NestLoggerService,
} from "@nestjs/common";
import { Logger as WinstonLogger } from "winston";
import { RequestContextService } from "../request-context/request-context.service";
import { WINSTON_LOGGER } from "../core/core.constants";

export interface LogMeta {
  [key: string]: unknown;
}

@Injectable()
export class AppLogger implements NestLoggerService {
  constructor(
    @Inject(WINSTON_LOGGER) private readonly logger: WinstonLogger,
    private readonly requestContext: RequestContextService,
  ) {}

  private enrich(meta?: LogMeta): LogMeta {
    return {
      ...(this.requestContext.getRequestId()
        ? { requestId: this.requestContext.getRequestId() }
        : {}),
      ...meta,
    };
  }

  log(message: string, context?: string): void;
  log(message: string, meta?: LogMeta): void;
  log(message: string, contextOrMeta?: string | LogMeta): void {
    const meta =
      typeof contextOrMeta === "string"
        ? { context: contextOrMeta }
        : contextOrMeta;
    this.logger.info(message, this.enrich(meta));
  }

  info(message: string, meta?: LogMeta): void {
    this.logger.info(message, this.enrich(meta));
  }

  error(message: string, trace?: string, context?: string): void;
  error(message: string, meta?: LogMeta): void;
  error(
    message: string,
    traceOrMeta?: string | LogMeta,
    context?: string,
  ): void {
    if (typeof traceOrMeta === "string") {
      this.logger.error(message, this.enrich({ trace: traceOrMeta, context }));
    } else {
      this.logger.error(message, this.enrich(traceOrMeta));
    }
  }

  warn(message: string, context?: string): void;
  warn(message: string, meta?: LogMeta): void;
  warn(message: string, contextOrMeta?: string | LogMeta): void {
    const meta =
      typeof contextOrMeta === "string"
        ? { context: contextOrMeta }
        : contextOrMeta;
    this.logger.warn(message, this.enrich(meta));
  }

  debug(message: string, context?: string): void;
  debug(message: string, meta?: LogMeta): void;
  debug(message: string, contextOrMeta?: string | LogMeta): void {
    const meta =
      typeof contextOrMeta === "string"
        ? { context: contextOrMeta }
        : contextOrMeta;
    this.logger.debug(message, this.enrich(meta));
  }

  verbose(message: string, context?: string): void;
  verbose(message: string, meta?: LogMeta): void;
  verbose(message: string, contextOrMeta?: string | LogMeta): void {
    const meta =
      typeof contextOrMeta === "string"
        ? { context: contextOrMeta }
        : contextOrMeta;
    this.logger.verbose(message, this.enrich(meta));
  }
}
