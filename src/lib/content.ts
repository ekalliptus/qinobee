import { getCollection, type CollectionEntry } from "astro:content";

export type ResourceEntry = CollectionEntry<"resources">;

/**
 * All published resources, newest first.
 * Draft entries are excluded only in production builds so they remain
 * previewable during local development.
 */
export async function getPublishedResources(): Promise<ResourceEntry[]> {
  const entries = await getCollection("resources", ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true;
  });
  return entries.sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime(),
  );
}

export async function getResourcesByType(
  type: ResourceEntry["data"]["type"],
): Promise<ResourceEntry[]> {
  const all = await getPublishedResources();
  return all.filter((e) => e.data.type === type);
}

export const TYPE_LABEL: Record<ResourceEntry["data"]["type"], string> = {
  blog: "Blog",
  guide: "Guide",
  update: "Update",
  "case-study": "Case Study",
};

export const TYPE_TONE: Record<ResourceEntry["data"]["type"], string> = {
  blog: "blue",
  guide: "green",
  update: "purple",
  "case-study": "orange",
};
