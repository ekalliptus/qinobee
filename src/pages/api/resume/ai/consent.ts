import type { APIRoute } from "astro";
import { getSqlDb } from "@lib/db/client";
import { AuthService } from "@lib/auth/service";
import { getSessionUser } from "@lib/auth/middleware";
import { hasAiConsent, setAiConsent } from "@lib/auth/consent";

export const prerender = false;

const JSON_HEADERS = { "Content-Type": "application/json" };
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export const GET: APIRoute = async ({ locals, cookies }) => {
  const db = getSqlDb();
  const user = (await getSessionUser(new AuthService(db), cookies)) ?? locals.user;
  if (!user) return json({ ok: false }, 401);
  return json({ ok: true, consent: await hasAiConsent(db, user.id) }, 200);
};

export const POST: APIRoute = async ({ locals, cookies }) => {
  const db = getSqlDb();
  const user = (await getSessionUser(new AuthService(db), cookies)) ?? locals.user;
  if (!user) return json({ ok: false }, 401);
  await setAiConsent(db, user.id);
  return json({ ok: true, consent: true }, 200);
};
