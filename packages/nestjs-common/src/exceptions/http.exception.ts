/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCode } from "../enums";

export class BusinessException extends HttpException {
  constructor(
    message: string | string[] | object,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    errorCode?: string,
    details?: any,
  ) {
    const finalMessage = Array.isArray(message)
      ? message.join(", ")
      : typeof message === "object"
        ? JSON.stringify(message)
        : message;

    super(
      {
        details,
        message: finalMessage,
        errorCode: errorCode || ErrorCode.BUSINESS_ERROR,
        statusCode,
      },
      statusCode,
    );
  }
}

export class NotFoundException extends BusinessException {
  constructor(message: string = "Resource not found", errorCode?: string) {
    super(message, HttpStatus.NOT_FOUND, errorCode || ErrorCode.NOT_FOUND);
  }
}

export class ValidationException extends BusinessException {
  constructor(errors: any) {
    const msg = typeof errors === "string" ? errors : "Validation failed";
    const details = typeof errors !== "string" ? errors : undefined;

    super(
      msg,
      HttpStatus.UNPROCESSABLE_ENTITY,
      ErrorCode.VALIDATION_ERROR,
      details,
    );
  }
}

export class UnauthorizedException extends BusinessException {
  constructor(message: string = "Unauthorized", errorCode?: string) {
    super(
      message,
      HttpStatus.UNAUTHORIZED,
      errorCode || ErrorCode.UNAUTHORIZED,
    );
  }
}

export class ForbiddenException extends BusinessException {
  constructor(message: string = "Forbidden", errorCode?: string) {
    super(message, HttpStatus.FORBIDDEN, errorCode || ErrorCode.FORBIDDEN);
  }
}

export class ConflictException extends BusinessException {
  constructor(message: string = "Resource conflict", errorCode?: string) {
    super(message, HttpStatus.CONFLICT, errorCode || ErrorCode.CONFLICT);
  }
}

export class InternalServerException extends BusinessException {
  constructor(message: string = "Internal server error", errorCode?: string) {
    super(
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
    );
  }
}

export class BadRequestException extends BusinessException {
  constructor(message: string = "Bad request", errorCode?: string) {
    super(message, HttpStatus.BAD_REQUEST, errorCode || ErrorCode.BAD_REQUEST);
  }
}
