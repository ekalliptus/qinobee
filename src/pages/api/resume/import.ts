import type { APIRoute } from "astro";
import { z } from "zod";
import { getSqlDb, getEnv } from "@lib/db/client";
import { AuthService } from "@lib/auth/service";
import { getSessionUser } from "@lib/auth/middleware";
import { hasAiConsent } from "@lib/auth/consent";
import { getAiService } from "@modules/resume/services/ai-service";
import { rateLimit } from "@lib/rate-limit";
import { importResume } from "@modules/resume/import/build-import-input";

export const prerender = false;

// CV text is bounded to 100k chars by Zod; allow headroom for multibyte UTF-8
// (up to ~4 bytes/char) + JSON overhead so non-ASCII CVs aren't rejected early.
const MAX_BODY = 512 * 1024;

const JSON_HEADERS = { "Content-Type": "application/json" };
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

const importBodySchema = z.object({
  text: z.string().min(1).max(100000),
  title: z.string().trim().min(1).max(160).optional(),
  language: z.enum(["id", "en"]).optional(),
  templateId: z.string().min(1).max(80).optional(),
  useAi: z.boolean().optional().default(false),
});

export const POST: APIRoute = async (ctx) => {
  const { request, locals, cookies } = ctx;
  const db = getSqlDb(locals);

  // Same-origin backstop (SameSite=Lax already blocks cross-site sends).
  const origin = request.headers.get("origin");
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      return json({ ok: false }, 400);
    }
    if (originHost !== ctx.url.host) return json({ ok: false }, 403);
  }

  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > MAX_BODY) return json({ ok: false }, 413);

  const user = (await getSessionUser(new AuthService(db), cookies)) ?? locals.user;
  if (!user) return json({ ok: false }, 401);

  const rl = await rateLimit(db, `import:${user.id}`, 20, 60);
  if (!rl.allowed) return json({ ok: false, error: "rate_limited" }, 429);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false }, 400);
  }
  const parsedBody = importBodySchema.safeParse(raw);
  if (!parsedBody.success) return json({ ok: false }, 400);

  const { useAi, ...seed } = parsedBody.data;

  // AI sends CV text to the provider: require explicit, recorded consent.
  let aiService;
  if (useAi) {
    if (!(await hasAiConsent(db, user.id))) {
      return json({ ok: false, error: "consent_required" }, 403);
    }
    aiService = getAiService(getEnv(locals));
  }

  try {
    // Never log seed.text — it is user CV content.
    const { id, warnings, aiStructured } = await importResume(db, user.id, {
      ...seed,
      useAi,
      aiService,
    });

    // Form fallback: full-page POST (Accept: text/html) → redirect to editor.
    if ((request.headers.get("accept") ?? "").includes("text/html")) {
      return ctx.redirect(`/app/resume/${id}/edit`, 303);
    }
    return json({ ok: true, id, warnings, aiStructured }, 200);
  } catch {
    return json({ ok: false }, 500);
  }
};
