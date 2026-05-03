import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import {
  AppLogger,
  AppValidationPipe,
  HttpExceptionsFilter,
  LoggingInterceptor,
  ResponseInterceptor,
  RequestContextService,
  createRequestContextMiddleware,
} from "@url-shortner/nestjs-common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  const config = new DocumentBuilder()
    .setTitle("Auth Service")
    .setDescription("Authentication service API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, documentFactory);

  const logger = app.get(AppLogger);
  const requestContextService = app.get(RequestContextService);

  app.useLogger(logger);

  app.use(createRequestContextMiddleware(requestContextService));

  app.useGlobalFilters(app.get(HttpExceptionsFilter));

  app.useGlobalInterceptors(
    app.get(LoggingInterceptor),
    app.get(ResponseInterceptor),
  );

  app.useGlobalPipes(app.get(AppValidationPipe));

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  });

  const port = process.env.PORT ?? 3300;

  await app.listen(port);

  logger.info(`Application is running on: http://localhost:${port}`, {
    context: "Bootstrap",
  });
}

void bootstrap();
