import type { SqlDb } from "@/lib/db/adapter";

/** True if the user has recorded AI consent (ai_consent_at is non-null). */
export async function hasAiConsent(db: SqlDb, userId: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT ai_consent_at FROM users WHERE id = ?")
    .bind(userId)
    .first<{ ai_consent_at: string | null }>();
  return !!row && row.ai_consent_at !== null;
}

/** Record AI consent for the user (idempotent; stamps the current time). */
export async function setAiConsent(db: SqlDb, userId: string): Promise<void> {
  await db
    .prepare("UPDATE users SET ai_consent_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), userId)
    .run();
}
