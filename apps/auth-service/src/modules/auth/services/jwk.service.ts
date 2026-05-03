import { Injectable, OnModuleInit } from "@nestjs/common";
import * as jose from "jose";
import { AppLogger } from "@url-shortner/nestjs-common";

@Injectable()
export class JwkService implements OnModuleInit {
  private privateKey!: jose.CryptoKey | jose.KeyObject;
  private publicKey!: jose.CryptoKey | jose.KeyObject;
  private jwk!: jose.JWK;
  private kid!: string;

  constructor(private readonly logger: AppLogger) {}

  async onModuleInit() {
    await this.generateKeyPair();
  }

  private async generateKeyPair() {
    const { publicKey, privateKey } = await jose.generateKeyPair("RS256", {
      extractable: true,
    });

    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.kid = `key-${Date.now()}`;

    const exportedPublicKey = await jose.exportJWK(publicKey);
    this.jwk = {
      ...exportedPublicKey,
      kid: this.kid,
      alg: "RS256",
      use: "sig",
    };

    this.logger.info("RSA key pair generated for JWT signing", {
      context: "JwkService",
      kid: this.kid,
    });
  }

  getPrivateKey(): jose.CryptoKey | jose.KeyObject {
    return this.privateKey;
  }

  getPublicKey(): jose.CryptoKey | jose.KeyObject {
    return this.publicKey;
  }

  getKid(): string {
    return this.kid;
  }

  getJwks(): { keys: jose.JWK[] } {
    return {
      keys: [this.jwk],
    };
  }
}
