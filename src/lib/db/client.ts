import { Database } from "bun:sqlite";

export function createDb(path?: string): Database {
  const file = path ?? process.env.DATABASE_URL ?? "./data/qinobee.sqlite";
  const db = new Database(file);
  db.run("PRAGMA foreign_keys = ON;");
  if (file !== ":memory:") {
    db.run("PRAGMA journal_mode = WAL;");
  }
  return db;
}
