import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
} from "@nestjs/common";
import * as jose from "jose";
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from "./jwks-auth.guard";

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  private jwksCache: jose.JSONWebKeySet | null = null;
  private cacheExpiry = 0;
  private readonly cacheTtlMs: number;
  private readonly jwksUri: string;

  constructor(
    @Inject(AUTH_MODULE_OPTIONS)
    options: AuthModuleOptions,
  ) {
    this.jwksUri = options.jwksUri;
    this.cacheTtlMs = options.cacheTtlMs ?? 5 * 60 * 1000;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers["authorization"] as string | undefined;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      request.user = null;
      return true;
    }

    const token = authHeader.slice(7);

    try {
      const getKey = await this.getJWKS();
      const { payload } = await jose.jwtVerify(token, getKey, {
        issuer: "auth-service",
      });

      request.user = payload;
    } catch {
      request.user = null;
    }

    return true;
  }

  private async getJWKS() {
    if (this.jwksCache && Date.now() < this.cacheExpiry) {
      return jose.createLocalJWKSet(this.jwksCache);
    }

    const response = await fetch(this.jwksUri);
    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS from ${this.jwksUri}`);
    }

    this.jwksCache = (await response.json()) as jose.JSONWebKeySet;
    this.cacheExpiry = Date.now() + this.cacheTtlMs;

    return jose.createLocalJWKSet(this.jwksCache);
  }
}
