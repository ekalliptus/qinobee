import { defineMiddleware } from "astro:middleware";
import { SESSION_COOKIE } from "@/lib/auth/cookies";

export const onRequest = defineMiddleware(async (context, next) => {
  // Prerendered (static) routes have no per-request session; skip cookie/DB work.
  // Also avoids reading request.headers during the build, which Astro warns about.
  if (context.isPrerendered) return next();

  const path = context.url.pathname;
  const isAppRoute = path.startsWith("/app");
  const hasCookie = context.cookies.has(SESSION_COOKIE);

  // Only touch the DB when there is a session to validate or a guarded route.
  // Keeps bun:sqlite out of the module graph for prerendered pages at build.
  if (hasCookie || isAppRoute) {
    const { getDb } = await import("@/lib/db/client");
    const { AuthService } = await import("@/lib/auth/service");
    const { getSessionUser } = await import("@/lib/auth/middleware");
    const auth = new AuthService(getDb());
    context.locals.user = getSessionUser(auth, context.cookies) ?? undefined;
  }

  if (isAppRoute && !context.locals.user) {
    return context.redirect(`/login?next=${encodeURIComponent(path)}`);
  }
  return next();
});
