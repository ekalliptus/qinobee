import type { Database } from "bun:sqlite";

/** True if the user has recorded AI consent (ai_consent_at is non-null). */
export function hasAiConsent(db: Database, userId: string): boolean {
  const row = db
    .query("SELECT ai_consent_at FROM users WHERE id = ?")
    .get(userId) as { ai_consent_at: string | null } | null;
  return !!row && row.ai_consent_at !== null;
}

/** Record AI consent for the user (idempotent; stamps the current time). */
export function setAiConsent(db: Database, userId: string): void {
  db.query("UPDATE users SET ai_consent_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    userId,
  );
}
