import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { resourceSchema } from "@/content/resource-schema";

// Re-export so the schema stays importable from a single well-known place.
export { resourceSchema };

const resources = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/resources" }),
  schema: resourceSchema,
});

export const collections = { resources };
