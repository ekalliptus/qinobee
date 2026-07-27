import type { APIRoute } from "astro";
import type { SqlDb } from "@lib/db/adapter";
import { getSqlDb } from "@lib/db/client";
import { AuthService } from "@lib/auth/service";
import { getSessionUser } from "@lib/auth/middleware";
import { createResumeService } from "@modules/resume/services/resume-service";
import { scoreResume } from "@modules/resume/scoring/engine";
import { NotFoundError } from "@modules/resume/repository/errors";

export const prerender = false;

const JSON_HEADERS = { "Content-Type": "application/json" };
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

// Scoring is deterministic (not AI) — no consent required. Ownership enforced.
async function respond(db: SqlDb, userId: string, resumeId: string): Promise<Response> {
  try {
    const doc = await createResumeService(db).getOrThrow(userId, resumeId);
    return json({ ok: true, score: scoreResume(doc) }, 200);
  } catch (err) {
    if (err instanceof NotFoundError) return json({ ok: false }, 404);
    return json({ ok: false }, 500);
  }
}

export const GET: APIRoute = async ({ params, locals, cookies }) => {
  const db = getSqlDb(locals);
  const user = (await getSessionUser(new AuthService(db), cookies)) ?? locals.user;
  if (!user) return json({ ok: false }, 401);
  return respond(db, user.id, params.id!);
};

export const POST: APIRoute = async ({ params, locals, cookies }) => {
  const db = getSqlDb(locals);
  const user = (await getSessionUser(new AuthService(db), cookies)) ?? locals.user;
  if (!user) return json({ ok: false }, 401);
  return respond(db, user.id, params.id!);
};
