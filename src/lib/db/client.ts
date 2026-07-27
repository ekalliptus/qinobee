import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { SqlDb } from "./adapter";
import { createSqliteAdapter } from "./sqlite-adapter";
import { migrate } from "./migrate";

export function createDb(path?: string): Database {
  const file = path ?? process.env.DATABASE_URL ?? "./data/qinobee.sqlite";
  if (file !== ":memory:") {
    mkdirSync(dirname(file), { recursive: true });
  }
  const db = new Database(file);
  db.run("PRAGMA foreign_keys = ON;");
  if (file !== ":memory:") {
    db.run("PRAGMA journal_mode = WAL;");
  }
  return db;
}

/** Unmigrated bun:sqlite-backed SqlDb for tests. Callers run migrateDb. */
export function createSqliteTestDb(path = ":memory:"): SqlDb {
  return createSqliteAdapter(path);
}

let singleton: Database | null = null;

/** Shared application database (migrated once). Use in server code, not tests. */
export function getDb(): Database {
  if (singleton) return singleton;
  singleton = createDb();
  migrate(singleton);
  return singleton;
}
