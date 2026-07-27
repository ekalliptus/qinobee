export interface SqlStatement {
  bind(...args: unknown[]): SqlStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<T[]>;
  run(): Promise<{ changes: number }>;
}

export interface SqlDb {
  prepare(sql: string): SqlStatement;
  batch(stmts: SqlStatement[]): Promise<void>;
  exec(sql: string): Promise<void>;
}
