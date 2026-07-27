import type { Database } from "bun:sqlite";
import type { SqlDb } from "./adapter";
import { SCHEMA_SQL } from "./schema";

/** Sync migration for the legacy bun:sqlite Database. */
export function migrate(db: Database): void {
  db.transaction(() => {
    db.run(SCHEMA_SQL);
  })();
}

/** Async migration for the SqlDb abstraction (bun:sqlite adapter today, D1 later). */
export async function migrateDb(db: SqlDb): Promise<void> {
  await db.exec(SCHEMA_SQL);
}
