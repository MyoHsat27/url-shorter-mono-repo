import {
  InjectionToken,
  ModuleMetadata,
  OptionalFactoryDependency,
  Type,
} from "@nestjs/common";

export interface CoreModuleOptions {
  env: string;
  serviceName: string;
  debug?: boolean;
}

export interface CoreModuleOptionsFactory {
  createCoreModuleOptions(): Promise<CoreModuleOptions> | CoreModuleOptions;
}

export interface CoreModuleAsyncOptions extends Pick<
  ModuleMetadata,
  "imports"
> {
  useExisting?: Type<CoreModuleOptionsFactory>;
  useClass?: Type<CoreModuleOptionsFactory>;
  useFactory?: (
    ...args: unknown[]
  ) => Promise<CoreModuleOptions> | CoreModuleOptions;
  inject?: (InjectionToken | OptionalFactoryDependency)[];
}
