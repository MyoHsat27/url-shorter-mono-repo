/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import { ErrorCode } from "../enums";
import { Request, Response } from "express";
import { AppLogger } from "../logger/logger.service";
import { RequestContextService } from "../request-context/request-context.service";
import { CORE_MODULE_OPTIONS } from "../core/core.constants";
import { CoreModuleOptions } from "../core/core.interfaces";

@Catch()
export class HttpExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly logger: AppLogger,
    private readonly requestContext: RequestContextService,
    @Inject(CORE_MODULE_OPTIONS) private readonly options: CoreModuleOptions,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
    let validationErrors = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;

      message = res.message ?? exception.message;
      errorCode = res.errorCode ?? errorCode;

      if (res.details) {
        validationErrors = res.details;
        message = "Validation failed";
      }
    }

    const shouldLog = this.options.debug ?? this.options.env !== "production";

    if (shouldLog || status >= (500 as HttpStatus)) {
      this.logger.error("Unhandled exception", {
        requestId: this.requestContext?.getRequestId(),
        method: request.method,
        path: request.url,
        status,
        error: exception instanceof Error ? exception.message : "Unknown error",
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    }

    response.status(status).json({
      requestId: this.requestContext?.getRequestId(),
      message,
      errorCode,
      statusCode: status,
      timestamp: new Date().toISOString(),
      ...(validationErrors ? { details: validationErrors } : {}),
    });
  }
}
