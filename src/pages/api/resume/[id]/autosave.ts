import type { APIRoute } from "astro";
import { getDb } from "@lib/db/client";
import { AuthService } from "@lib/auth/service";
import { getSessionUser } from "@lib/auth/middleware";
import { createResumeService } from "@modules/resume/services/resume-service";
import { updateResumeInputSchema } from "@modules/resume/schemas";
import { ConflictError, NotFoundError } from "@modules/resume/repository/errors";

export const prerender = false;

const MAX_BODY = 262144; // 256 KiB
const JSON_HEADERS = { "Content-Type": "application/json" };

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export const POST: APIRoute = async ({ params, request, locals, cookies }) => {
  const db = getDb();
  const auth = new AuthService(db);
  const user = (await getSessionUser(auth, cookies)) ?? locals.user;
  if (!user) return json({ ok: false }, 401);

  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > MAX_BODY) return json({ ok: false }, 413);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false }, 400);
  }

  if (typeof payload !== "object" || payload === null) {
    return json({ ok: false }, 400);
  }
  const { revision, patch } = payload as { revision?: unknown; patch?: unknown };
  if (!Number.isInteger(revision)) return json({ ok: false }, 400);

  const parsed = updateResumeInputSchema.safeParse(patch);
  if (!parsed.success) {
    return json({ ok: false, issues: parsed.error.issues }, 400);
  }

  try {
    const service = createResumeService(db);
    const updated = await service.update(user.id, params.id!, {
      revision: revision as number,
      patch: parsed.data,
      reason: "autosave",
    });
    return json({ ok: true, revision: updated.revision }, 200);
  } catch (err) {
    if (err instanceof ConflictError) return json({ ok: false, conflict: true }, 409);
    if (err instanceof NotFoundError) return json({ ok: false }, 404);
    return json({ ok: false }, 500);
  }
};
