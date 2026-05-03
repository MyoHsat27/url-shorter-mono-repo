import { Inject, Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from "@url-shortner/nestjs-common";
import { IUserRepository, USER_REPOSITORY_TOKEN } from "../repository";
import { RegisterDto, LoginDto } from "../dto";
import { TokenService, TokenPayload } from "./token.service";

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    private readonly tokenService: TokenService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user already exists
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException("A user with this email already exists");
    }

    const id = uuidv4();
    const now = Date.now();
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    await this.userRepo.createUser({
      pk: `USER#${id}`,
      sk: "METADATA",
      id,
      email: dto.email,
      name: dto.name,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    // Generate tokens
    const payload: TokenPayload = {
      sub: id,
      email: dto.email,
      name: dto.name,
    };

    const tokens = await this.tokenService.generateTokenPair(payload);

    // Store refresh token
    await this.userRepo.storeRefreshToken({
      pk: `REFRESH#${tokens.refreshTokenId}`,
      sk: "METADATA",
      tokenId: tokens.refreshTokenId,
      userId: id,
      expiresAt: now + this.tokenService.getRefreshTokenExpiryMs(),
      createdAt: now,
    });

    return {
      user: {
        id,
        email: dto.email,
        name: dto.name,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    const tokens = await this.tokenService.generateTokenPair(payload);

    // Store refresh token
    await this.userRepo.storeRefreshToken({
      pk: `REFRESH#${tokens.refreshTokenId}`,
      sk: "METADATA",
      tokenId: tokens.refreshTokenId,
      userId: user.id,
      expiresAt: Date.now() + this.tokenService.getRefreshTokenExpiryMs(),
      createdAt: Date.now(),
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  async refresh(refreshTokenStr: string) {
    let decoded;
    try {
      decoded = await this.tokenService.verifyRefreshToken(refreshTokenStr);
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    // Check if refresh token exists in DB
    const stored = await this.userRepo.findRefreshToken(decoded.tokenId);
    if (!stored) {
      throw new UnauthorizedException("Refresh token has been revoked");
    }

    if (stored.expiresAt < Date.now()) {
      await this.userRepo.deleteRefreshToken(decoded.tokenId);
      throw new UnauthorizedException("Refresh token has expired");
    }

    // Get user
    const user = await this.userRepo.findById(decoded.sub!);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Delete old refresh token
    await this.userRepo.deleteRefreshToken(decoded.tokenId);

    // Generate new token pair
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    const tokens = await this.tokenService.generateTokenPair(payload);

    // Store new refresh token
    await this.userRepo.storeRefreshToken({
      pk: `REFRESH#${tokens.refreshTokenId}`,
      sk: "METADATA",
      tokenId: tokens.refreshTokenId,
      userId: user.id,
      expiresAt: Date.now() + this.tokenService.getRefreshTokenExpiryMs(),
      createdAt: Date.now(),
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }
}
