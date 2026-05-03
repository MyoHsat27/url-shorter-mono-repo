import { UserEntity, RefreshTokenEntity } from "../entities";

export const USER_REPOSITORY_TOKEN = Symbol("USER_REPOSITORY");

export interface IUserRepository {
  createUser(user: UserEntity): Promise<void>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  storeRefreshToken(token: RefreshTokenEntity): Promise<void>;
  findRefreshToken(tokenId: string): Promise<RefreshTokenEntity | null>;
  deleteRefreshToken(tokenId: string): Promise<void>;
}
