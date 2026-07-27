import type { APIRoute } from "astro";
import { getSqlDb } from "@lib/db/client";
import { createResumeService } from "@modules/resume/services/resume-service";
import { createResumeInputSchema } from "@modules/resume/schemas";
import { guardFormAction } from "@lib/http/form-action";

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const guard = await guardFormAction(ctx);
  if (guard instanceof Response) return guard;
  const user = guard;

  const form = await ctx.request.formData();
  const parsed = createResumeInputSchema.safeParse({
    title: form.get("title"),
    language: form.get("language"),
    templateId: form.get("templateId"),
    startingPoint: form.get("startingPoint") ?? undefined,
  });
  if (!parsed.success) return new Response("Bad Request", { status: 400 });

  const svc = createResumeService(getSqlDb(ctx.locals));
  const created = await svc.create({ userId: user.id, input: parsed.data });
  return ctx.redirect(`/app/resume/${created.id}/edit`, 303);
};
