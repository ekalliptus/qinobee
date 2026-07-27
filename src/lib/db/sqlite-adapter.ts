import { Database } from "bun:sqlite";
import type { SqlDb, SqlStatement } from "./adapter";

class BunSqlStatement implements SqlStatement {
  sql: string;
  args: unknown[] = [];
  private db: Database;

  constructor(db: Database, sql: string) {
    this.db = db;
    this.sql = sql;
  }

  bind(...args: unknown[]): SqlStatement {
    this.args = args;
    return this;
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    return (this.db.query(this.sql).get(...this.bindArgs()) as T | null) ?? null;
  }

  async all<T = Record<string, unknown>>(): Promise<T[]> {
    return this.db.query(this.sql).all(...this.bindArgs()) as T[];
  }

  async run(): Promise<{ changes: number }> {
    return { changes: this.db.query(this.sql).run(...this.bindArgs()).changes };
  }

  // bun:sqlite bind params must be SQLQueryBindings; args are validated by SQLite.
  bindArgs(): never[] {
    return this.args as never[];
  }
}

class BunSqlDb implements SqlDb {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  prepare(sql: string): SqlStatement {
    return new BunSqlStatement(this.db, sql);
  }

  async batch(stmts: SqlStatement[]): Promise<void> {
    this.db.transaction(() => {
      for (const stmt of stmts) {
        const s = stmt as BunSqlStatement;
        this.db.query(s.sql).run(...(s.args as never[]));
      }
    })();
  }

  async exec(sql: string): Promise<void> {
    this.db.run(sql);
  }
}

export function createSqliteAdapter(path = ":memory:"): SqlDb {
  const db = new Database(path);
  db.run("PRAGMA foreign_keys = ON;");
  if (path !== ":memory:") {
    db.run("PRAGMA journal_mode = WAL;");
  }
  return new BunSqlDb(db);
}
