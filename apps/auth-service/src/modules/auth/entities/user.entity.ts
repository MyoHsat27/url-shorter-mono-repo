export interface UserEntity {
  pk: string; // USER#<id>
  sk: "METADATA";
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: number;
  updatedAt: number;
}

export interface RefreshTokenEntity {
  pk: string; // REFRESH#<tokenId>
  sk: "METADATA";
  tokenId: string;
  userId: string;
  expiresAt: number;
  createdAt: number;
}
