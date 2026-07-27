import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
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

let singleton: Database | null = null;

/** Shared application database (migrated once). Use in server code, not tests. */
export function getDb(): Database {
  if (singleton) return singleton;
  singleton = createDb();
  migrate(singleton);
  return singleton;
}
