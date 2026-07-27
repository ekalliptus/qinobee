import type { D1Database, D1PreparedStatement } from "./d1-types";
import type { SqlDb, SqlStatement } from "./adapter";

/**
 * D1-backed SqlDb. Keeps the underlying (bound) D1 prepared statement on the
 * wrapper so `batch` can hand real D1 statements to `db.batch()`.
 */
class D1SqlStatement implements SqlStatement {
  constructor(public stmt: D1PreparedStatement) {}

  bind(...args: unknown[]): SqlStatement {
    // D1 .bind returns a NEW bound statement; wrap it.
    return new D1SqlStatement(this.stmt.bind(...args));
  }

  first<T = Record<string, unknown>>(): Promise<T | null> {
    return this.stmt.first<T>();
  }

  async all<T = Record<string, unknown>>(): Promise<T[]> {
    return (await this.stmt.all<T>()).results;
  }

  async run(): Promise<{ changes: number }> {
    return { changes: (await this.stmt.run()).meta.changes };
  }
}

export function d1Adapter(db: D1Database): SqlDb {
  return {
    prepare(sql: string): SqlStatement {
      return new D1SqlStatement(db.prepare(sql));
    },
    async batch(stmts: SqlStatement[]): Promise<void> {
      await db.batch(stmts.map((s) => (s as D1SqlStatement).stmt));
    },
    async exec(sql: string): Promise<void> {
      await db.exec(sql);
    },
  };
}
