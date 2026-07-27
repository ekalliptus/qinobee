import { b64url } from "./encoding";

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function newSessionToken(): string {
  return b64url(crypto.getRandomValues(new Uint8Array(32))); // ~43 chars
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function sessionExpiry(now: Date = new Date()): string {
  return new Date(now.getTime() + SESSION_TTL_MS).toISOString();
}
