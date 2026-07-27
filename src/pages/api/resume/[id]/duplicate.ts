import type { APIRoute } from "astro";
import { getDb } from "@lib/db/client";
import { createResumeService } from "@modules/resume/services/resume-service";
import { NotFoundError } from "@modules/resume/repository/errors";
import { guardFormAction } from "@lib/http/form-action";

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const guard = await guardFormAction(ctx);
  if (guard instanceof Response) return guard;

  const svc = createResumeService(getDb());
  try {
    await svc.duplicate(guard.id, ctx.params.id!);
  } catch (err) {
    if (err instanceof NotFoundError) return new Response("Not found", { status: 404 });
    throw err;
  }
  return ctx.redirect("/app/resume", 303);
};
