import type { APIRoute } from "astro";
import { getSqlDb } from "@/lib/db/client";
import { AuthService } from "@/lib/auth/service";
import { SESSION_COOKIE } from "@/lib/auth/cookies";

const handler: APIRoute = async ({ cookies, redirect, locals }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) await new AuthService(getSqlDb(locals)).logout(token);
  cookies.delete(SESSION_COOKIE, { path: "/" });
  return redirect("/login");
};

export const GET = handler;
export const POST = handler;
