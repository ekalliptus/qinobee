// Minimal structural D1 types — only what the adapter uses. Avoids a global
// `/// <reference types="@cloudflare/workers-types" />`, which would redefine
// global `fetch`/`Response`/`Promise` and break DOM-typed app/React code.
// ponytail: ceiling = hand-rolled subset; upgrade path = swap to
// @cloudflare/workers-types D1 types once its globals no longer clash with DOM.
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
  exec(query: string): Promise<unknown>;
}
