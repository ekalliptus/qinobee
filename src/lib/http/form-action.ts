import type { APIContext } from "astro";
import type { SessionUser } from "@lib/auth/service";
import { AuthService } from "@lib/auth/service";
import { getSessionUser } from "@lib/auth/middleware";
import { getSqlDb } from "@lib/db/client";

const MAX_BODY = 65536; // 64 KiB — form actions carry only small metadata.

/**
 * Shared guard for mutating form endpoints under /api. These are NOT under
 * /app, so the middleware does not populate locals.user — authenticate here
 * exactly like autosave.ts does. Also enforce same-origin for state changes:
 * SameSite=Lax already blocks cross-site cookie sends, and rejecting a
 * mismatched Origin is a cheap CSRF backstop for same-site subresource abuse.
 * Returns the user on success, or a Response to short-circuit the handler.
 */
export async function guardFormAction(ctx: APIContext): Promise<SessionUser | Response> {
  const { request, cookies, locals } = ctx;

  // Same-origin: if an Origin header is present it must match this host.
  const origin = request.headers.get("origin");
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      return new Response("Bad Request", { status: 400 });
    }
    if (originHost !== ctx.url.host) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > MAX_BODY) {
    return new Response("Payload Too Large", { status: 413 });
  }

  const user = (await getSessionUser(new AuthService(getSqlDb()), cookies)) ?? locals.user;
  if (!user) return new Response("Unauthorized", { status: 401 });
  return user;
}
