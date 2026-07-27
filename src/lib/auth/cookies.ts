import { SESSION_TTL_MS } from "./session";

export const SESSION_COOKIE = "qb_session";

export interface CookieOptions {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
}

export function cookieOptions(secure: boolean): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}
