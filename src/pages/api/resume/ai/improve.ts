import type { APIRoute } from "astro";
import { getDb } from "@lib/db/client";
import { AuthService } from "@lib/auth/service";
import { getSessionUser } from "@lib/auth/middleware";
import { hasAiConsent } from "@lib/auth/consent";
import { rateLimit } from "@lib/rate-limit";
import { getAiService } from "@modules/resume/services/ai-service";
import { handleImprove } from "@modules/resume/services/ai-endpoint";

export const prerender = false;

const MAX_BODY = 65536; // 64 KiB
const JSON_HEADERS = { "Content-Type": "application/json" };
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const db = getDb();
  const user = (await getSessionUser(new AuthService(db), cookies)) ?? locals.user;
  if (!user) return json({ ok: false }, 401);

  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > MAX_BODY) return json({ ok: false }, 413);

  const rl = rateLimit(db, `ai:${user.id}`, 30, 60);
  if (!rl.allowed) return json({ ok: false, error: "rate_limited" }, 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false }, 400);
  }

  try {
    const result = await handleImprove({
      user,
      consentGiven: hasAiConsent(db, user.id),
      aiService: getAiService(),
      body,
    });
    return json(result.body, result.status);
  } catch {
    return json({ ok: false }, 500);
  }
};
