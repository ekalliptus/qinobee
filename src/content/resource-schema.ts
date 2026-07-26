import { z } from "zod";

/**
 * Plain zod schema for content collection entries.
 * Kept in a standalone module (no `astro:content` import) so it can be
 * imported directly under `bun test` without pulling in Astro virtual modules.
 * Re-exported and reused by `src/content.config.ts`.
 */
export const resourceSchema = z.object({
  title: z.string(),
  description: z.string(),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
  type: z.enum(["blog", "guide", "update", "case-study"]),
  cover: z.string(),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  author: z.string(),
});

export type ResourceData = z.infer<typeof resourceSchema>;
