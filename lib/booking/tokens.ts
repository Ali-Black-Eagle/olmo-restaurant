import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** 32 random bytes, URL-safe. Only the SHA-256 hash is ever stored. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison of hashes. */
export function verifyToken(token: string | undefined | null, storedHash: string): boolean {
  if (!token) return false;
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// No 0/O, 1/I/L: easy to read out over the phone.
const REF_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateRef(): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += REF_CHARS[randomInt(REF_CHARS.length)];
  return `OLM-${s}`;
}
