import type { APIRoute } from "astro";
import { getDb } from "@/lib/db/client";
import { AuthService } from "@/lib/auth/service";
import { SESSION_COOKIE } from "@/lib/auth/cookies";

const handler: APIRoute = ({ cookies, redirect }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) new AuthService(getDb()).logout(token);
  cookies.delete(SESSION_COOKIE, { path: "/" });
  return redirect("/login");
};

export const GET = handler;
export const POST = handler;
