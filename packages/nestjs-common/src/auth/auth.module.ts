import { DynamicModule, Module, Provider } from "@nestjs/common";
import {
  JwksAuthGuard,
  AUTH_MODULE_OPTIONS,
  AuthModuleOptions,
} from "./jwks-auth.guard";
import { OptionalAuthGuard } from "./optional-auth.guard";

@Module({})
export class AuthModule {
  static forRoot(options: AuthModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: AUTH_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: AuthModule,
      global: true,
      providers: [optionsProvider, JwksAuthGuard, OptionalAuthGuard],
      exports: [JwksAuthGuard, OptionalAuthGuard, AUTH_MODULE_OPTIONS],
    };
  }
}
