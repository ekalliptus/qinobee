import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { siteConfig } from "@/config/site";
import { getPublishedResources } from "@/lib/content";

export const prerender = true;

export async function GET(context: APIContext) {
  const resources = await getPublishedResources();
  const items = resources.filter(
    (e) => e.data.type === "blog" || e.data.type === "update",
  );
  const site = context.site?.href ?? import.meta.env.PUBLIC_SITE_URL;

  return rss({
    title: `${siteConfig.name} — Blog & Updates`,
    description: siteConfig.description,
    site: site ?? "http://localhost:4321",
    items: items.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.publishedAt,
      link: `/resources/${entry.id}`,
      categories: [entry.data.type, ...entry.data.tags],
    })),
  });
}
