import type { APIContext } from "astro";

export const prerender = true;

export function GET(context: APIContext) {
  const site = (
    context.site?.href ??
    import.meta.env.PUBLIC_SITE_URL ??
    "http://localhost:4321"
  ).replace(/\/+$/, "");

  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    // Astro's sitemap integration outputs sitemap-index.xml.
    `Sitemap: ${site}/sitemap-index.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
