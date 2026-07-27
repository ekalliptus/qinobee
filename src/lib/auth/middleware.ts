import type { AstroCookies } from "astro";
import type { AuthService, SessionUser } from "./service";
import { SESSION_COOKIE } from "./cookies";

export { SESSION_COOKIE, cookieOptions } from "./cookies";

export function getSessionUser(
  auth: AuthService,
  cookies: AstroCookies,
): Promise<SessionUser | null> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return Promise.resolve(null);
  return auth.validateSession(token);
}

/** Ensure a `next` redirect target is a local path (no open redirect). */
export function safeNext(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  if (next.includes("\\")) return null; // some browsers normalize \ to /
  return next;
}
