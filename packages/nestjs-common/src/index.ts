// Core Module - Single entry point for all common functionality
export {
  CoreModule,
  CoreModuleOptions,
  CoreModuleAsyncOptions,
  CoreModuleOptionsFactory,
  CORE_MODULE_OPTIONS,
  WINSTON_LOGGER,
} from "./core";

// DTOs - Data Transfer Objects for common use cases
export * from "./dtos";

// Enums - Common enumeration types
export * from "./enums";

// Interfaces - Type definitions
export * from "./interfaces";

// Utilities - Helper functions
export * from "./utils";

// Logger - Structured logging with Winston
export { AppLogger } from "./logger/logger.service";
export type { LogMeta } from "./logger/logger.service";
export { LoggingInterceptor } from "./logger/logging.interceptor";
export { createWinstonLogger } from "./logger/winston.factory";

// Exceptions - Exception classes and global filter
export { HttpExceptionsFilter } from "./exceptions/http-exception.filter";
export {
  BusinessException,
  NotFoundException,
  ValidationException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  InternalServerException,
  BadRequestException,
} from "./exceptions/http.exception";

// Response - Response transformation and standardization
export { ResponseInterceptor } from "./response/response.interceptor";
// Request Context - Request tracking via AsyncLocalStorage
export { RequestContextService } from "./request-context/request-context.service";
export {
  RequestContextMiddleware,
  createRequestContextMiddleware,
} from "./request-context/request-context.middleware";

// Validation - Request validation with class-validator
export { AppValidationPipe } from "./validations/validation.pipe";
