import { randomBytes } from "crypto";

const BASE62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const BASE = BASE62.length;

export function generateShortCode(length = 10): string {
  const bytes = randomBytes(length);
  let result = "";

  for (let i = 0; i < length; i++) {
    result += BASE62[bytes[i] % BASE];
  }

  return result;
}
