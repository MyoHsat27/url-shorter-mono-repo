import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Observable, tap } from "rxjs";
import { RequestEnum } from "../enums";
import { AppLogger } from "./logger.service";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const startTime = Date.now();
    const { method, originalUrl } = req;

    const clientIp =
      typeof req.headers["x-forwarded-for"] === "string"
        ? req.headers["x-forwarded-for"]
        : (req.socket.remoteAddress ?? "unknown");

    this.logger.info("Incoming request", {
      event: RequestEnum.IN,
      method,
      path: originalUrl,
      clientIp,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startTime;

          this.logger.info("Outgoing response", {
            event: RequestEnum.OUT,
            method,
            path: originalUrl,
            statusCode: res.statusCode,
            durationMs,
          });
        },
        error: (err: unknown) => {
          const durationMs = Date.now() - startTime;

          const error = err instanceof Error ? err : new Error("Unknown error");

          this.logger.error("Request failed", {
            event: RequestEnum.ERROR,
            method,
            path: originalUrl,
            statusCode: res.statusCode,
            durationMs,
            errorName: error.name,
            errorMessage: error.message,
          });
        },
      }),
    );
  }
}
