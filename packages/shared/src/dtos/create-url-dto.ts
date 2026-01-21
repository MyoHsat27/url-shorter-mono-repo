export interface CreateShortUrlDto {
  originalUrl: string;
  expiresAt?: Date;
}
