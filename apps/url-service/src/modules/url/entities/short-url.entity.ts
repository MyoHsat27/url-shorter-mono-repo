export interface ShortUrlEntity {
  pk: string;
  sk: "METADATA";
  shortCode: string;
  longUrl: string;
  createdAt: number;
  expiresAt?: number;
  userId?: string;
}
