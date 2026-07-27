import type { SqlDb } from "@/lib/db/adapter";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Fixed-window rate limiter backed by the rate_limits table.
 * @param windowSeconds size of the window in seconds.
 * @param limit max hits allowed within a window.
 */
export async function rateLimit(
  db: SqlDb,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (key, window_start, count)
       VALUES (?, ?, 1)
       ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1
       RETURNING count`,
    )
    .bind(key, windowStart)
    .first<{ count: number }>();
  const count = row?.count ?? 0;
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
  };
}
