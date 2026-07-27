import type { Database } from "bun:sqlite";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Fixed-window rate limiter backed by the rate_limits table.
 * @param windowSeconds size of the window in seconds.
 * @param limit max hits allowed within a window.
 */
export function rateLimit(
  db: Database,
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const row = db
    .query(
      `INSERT INTO rate_limits (key, window_start, count)
       VALUES (?, ?, 1)
       ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1
       RETURNING count`,
    )
    .get(key, windowStart) as { count: number };
  return {
    allowed: row.count <= limit,
    remaining: Math.max(0, limit - row.count),
  };
}
