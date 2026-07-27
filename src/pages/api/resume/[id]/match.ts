import type { APIRoute } from "astro";
import { z } from "zod";
import { getDb } from "@lib/db/client";
import { AuthService } from "@lib/auth/service";
import { getSessionUser } from "@lib/auth/middleware";
import { createResumeService } from "@modules/resume/services/resume-service";
import { matchJob } from "@modules/resume/matcher/matcher";
import { NotFoundError } from "@modules/resume/repository/errors";

export const prerender = false;

const MAX_BODY = 65536;
const JSON_HEADERS = { "Content-Type": "application/json" };
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

const bodySchema = z.object({
  jobDescription: z.string().min(1).max(8000),
  saveTailored: z.boolean().optional(),
});

export const POST: APIRoute = async ({ params, request, locals, cookies }) => {
  const db = getDb();
  const user = getSessionUser(new AuthService(db), cookies) ?? locals.user;
  if (!user) return json({ ok: false }, 401);

  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > MAX_BODY) return json({ ok: false }, 413);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false }, 400);
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return json({ ok: false }, 400);

  try {
    const service = createResumeService(db);
    // Ownership check (404 no-enumeration for missing/not-owned).
    const doc = await service.getOrThrow(user.id, params.id!);
    // Matching is deterministic (not AI) — no consent required.
    const result = matchJob(doc, parsed.data.jobDescription);

    if (parsed.data.saveTailored) {
      // Duplicate creates a NEW resume; the master is never modified.
      const tailored = await service.duplicate(user.id, params.id!);
      return json({ ok: true, result, tailoredId: tailored.id }, 200);
    }
    return json({ ok: true, result }, 200);
  } catch (err) {
    if (err instanceof NotFoundError) return json({ ok: false }, 404);
    return json({ ok: false }, 500);
  }
};
