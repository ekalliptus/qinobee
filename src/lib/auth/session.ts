import { randomBytes, createHash } from "node:crypto";

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionExpiry(now: Date = new Date()): string {
  return new Date(now.getTime() + SESSION_TTL_MS).toISOString();
}
