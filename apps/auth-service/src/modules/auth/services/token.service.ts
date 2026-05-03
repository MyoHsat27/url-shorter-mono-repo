import { Injectable } from "@nestjs/common";
import * as jose from "jose";
import { JwkService } from "./jwk.service";
import { v4 as uuidv4 } from "uuid";

export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenId: string;
  expiresIn: number;
}

@Injectable()
export class TokenService {
  private readonly ACCESS_TOKEN_EXPIRY = "15m";
  private readonly REFRESH_TOKEN_DAYS = 7;

  constructor(private readonly jwkService: JwkService) {}

  async generateTokenPair(payload: TokenPayload): Promise<TokenPair> {
    const refreshTokenId = uuidv4();

    const accessToken = await new jose.SignJWT({
      email: payload.email,
      name: payload.name,
    })
      .setProtectedHeader({
        alg: "RS256",
        kid: this.jwkService.getKid(),
      })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime(this.ACCESS_TOKEN_EXPIRY)
      .setIssuer("auth-service")
      .sign(this.jwkService.getPrivateKey());

    const refreshToken = await new jose.SignJWT({
      tokenId: refreshTokenId,
      type: "refresh",
    })
      .setProtectedHeader({
        alg: "RS256",
        kid: this.jwkService.getKid(),
      })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime(`${this.REFRESH_TOKEN_DAYS}d`)
      .setIssuer("auth-service")
      .sign(this.jwkService.getPrivateKey());

    return {
      accessToken,
      refreshToken,
      refreshTokenId,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  async verifyAccessToken(
    token: string,
  ): Promise<jose.JWTPayload & { email: string; name: string }> {
    const { payload } = await jose.jwtVerify(
      token,
      this.jwkService.getPublicKey(),
      {
        issuer: "auth-service",
      },
    );

    return payload as jose.JWTPayload & { email: string; name: string };
  }

  async verifyRefreshToken(
    token: string,
  ): Promise<jose.JWTPayload & { tokenId: string; type: string }> {
    const { payload } = await jose.jwtVerify(
      token,
      this.jwkService.getPublicKey(),
      {
        issuer: "auth-service",
      },
    );

    if ((payload as { type?: string }).type !== "refresh") {
      throw new Error("Invalid token type");
    }

    return payload as jose.JWTPayload & { tokenId: string; type: string };
  }

  getRefreshTokenExpiryMs(): number {
    return this.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000;
  }
}
