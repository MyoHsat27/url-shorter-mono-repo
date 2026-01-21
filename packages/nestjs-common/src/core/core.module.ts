import {
  DynamicModule,
  Global,
  MiddlewareConsumer,
  Module,
  NestModule,
  Provider,
  Type,
} from "@nestjs/common";
import {
  CoreModuleAsyncOptions,
  CoreModuleOptions,
  CoreModuleOptionsFactory,
} from "./core.interfaces";
import { CORE_MODULE_OPTIONS, WINSTON_LOGGER } from "./core.constants";
import { AppLogger } from "../logger/logger.service";
import { LoggingInterceptor } from "../logger/logging.interceptor";
import { createWinstonLogger } from "../logger/winston.factory";
import { RequestContextService } from "../request-context/request-context.service";
import { RequestContextMiddleware } from "../request-context/request-context.middleware";
import { HttpExceptionsFilter } from "../exceptions/http-exception.filter";
import { ResponseInterceptor } from "../response/response.interceptor";
import { AppValidationPipe } from "../validations/validation.pipe";

/**
 * Core module that provides common functionality for NestJS applications.
 *
 * This module bundles:
 * - Structured logging with Winston (enriched with request context)
 * - Request context tracking via AsyncLocalStorage
 * - Global exception handling with consistent error responses
 * - Response transformation and standardization
 * - Request validation with class-validator
 *
 * @example
 * ```typescript
 * // Synchronous configuration
 * @Module({
 *   imports: [
 *     CoreModule.forRoot({
 *       env: process.env.NODE_ENV ?? 'development',
 *       serviceName: 'my-service',
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * @example
 * ```typescript
 * // Async configuration with ConfigService
 * @Module({
 *   imports: [
 *     ConfigModule.forRoot(),
 *     CoreModule.forRootAsync({
 *       imports: [ConfigModule],
 *       useFactory: (configService: ConfigService) => ({
 *         env: configService.get('NODE_ENV'),
 *         serviceName: configService.get('SERVICE_NAME'),
 *       }),
 *       inject: [ConfigService],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({})
export class CoreModule implements NestModule {
  /**
   * Configure module with synchronous options
   */
  static forRoot(options: CoreModuleOptions): DynamicModule {
    const providers = this.createProviders(options);

    return {
      module: CoreModule,
      providers,
      exports: [
        AppLogger,
        LoggingInterceptor,
        RequestContextService,
        HttpExceptionsFilter,
        ResponseInterceptor,
        AppValidationPipe,
        CORE_MODULE_OPTIONS,
      ],
    };
  }

  /**
   * Configure module with asynchronous options
   */
  static forRootAsync(options: CoreModuleAsyncOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);

    return {
      module: CoreModule,
      imports: options.imports ?? [],
      providers: [
        ...asyncProviders,
        {
          provide: WINSTON_LOGGER,
          useFactory: (opts: CoreModuleOptions) =>
            createWinstonLogger(opts.env, opts.serviceName),
          inject: [CORE_MODULE_OPTIONS],
        },
        // Core providers
        RequestContextService,
        AppLogger,
        LoggingInterceptor,
        HttpExceptionsFilter,
        ResponseInterceptor,
        AppValidationPipe,
      ],
      exports: [
        AppLogger,
        LoggingInterceptor,
        RequestContextService,
        HttpExceptionsFilter,
        ResponseInterceptor,
        AppValidationPipe,
        CORE_MODULE_OPTIONS,
      ],
    };
  }

  /**
   * Creates providers for synchronous configuration
   */
  private static createProviders(options: CoreModuleOptions): Provider[] {
    return [
      {
        provide: CORE_MODULE_OPTIONS,
        useValue: options,
      },
      {
        provide: WINSTON_LOGGER,
        useFactory: () => createWinstonLogger(options.env, options.serviceName),
      },
      RequestContextService,
      AppLogger,
      LoggingInterceptor,
      HttpExceptionsFilter,
      ResponseInterceptor,
      AppValidationPipe,
    ];
  }

  /**
   * Creates providers for asynchronous configuration
   */
  private static createAsyncProviders(
    options: CoreModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: CORE_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
      ];
    }

    const useClass =
      options.useClass ??
      (options.useExisting as Type<CoreModuleOptionsFactory>);

    return [
      {
        provide: CORE_MODULE_OPTIONS,
        useFactory: async (factory: CoreModuleOptionsFactory) =>
          factory.createCoreModuleOptions(),
        inject: [useClass],
      },
      ...(options.useClass
        ? [{ provide: options.useClass, useClass: options.useClass }]
        : []),
    ];
  }

  /**
   * Apply RequestContextMiddleware to all routes
   */
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}
