import { ShortUrlEntity } from "../entities/short-url.entity";

export const URL_REPOSITORY_TOKEN = Symbol("URL_REPOSITORY");

export interface IUrlRepository {
  create(item: ShortUrlEntity): Promise<void>;
  findByShortCode(shortCode: string): Promise<ShortUrlEntity | null>;
}
