import type { APIRoute } from "astro";
import { getDb } from "@lib/db/client";
import { createResumeService } from "@modules/resume/services/resume-service";
import { nonEmpty } from "@lib/validation/primitives";
import { ConflictError, NotFoundError } from "@modules/resume/repository/errors";
import { guardFormAction } from "@lib/http/form-action";

export const prerender = false;

const titleSchema = nonEmpty(160);

export const POST: APIRoute = async (ctx) => {
  const guard = await guardFormAction(ctx);
  if (guard instanceof Response) return guard;

  const form = await ctx.request.formData();
  const parsed = titleSchema.safeParse(form.get("title"));
  if (!parsed.success) return new Response("Bad Request", { status: 400 });

  const svc = createResumeService(getDb());
  const id = ctx.params.id!;
  // Load current revision, then optimistic update. A stale revision (e.g. an
  // autosave landed in between) retries once against the fresh revision.
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const current = await svc.getOrThrow(guard.id, id);
      try {
        await svc.update(guard.id, id, {
          revision: current.revision,
          patch: { title: parsed.data },
          reason: "rename",
        });
        return ctx.redirect("/app/resume", 303);
      } catch (err) {
        if (err instanceof ConflictError && attempt === 0) continue;
        throw err;
      }
    }
    return new Response("Conflict", { status: 409 });
  } catch (err) {
    if (err instanceof NotFoundError) return new Response("Not found", { status: 404 });
    if (err instanceof ConflictError) return new Response("Conflict", { status: 409 });
    throw err;
  }
};
