/* eslint-disable @typescript-eslint/no-explicit-any */
export abstract class ICacheService {
  abstract get<T>(key: string): Promise<T | null>;
  abstract set(key: string, value: any, ttl?: number): Promise<void>;
  abstract del(key: string): Promise<void>;
  abstract clear(): Promise<void>;
}
