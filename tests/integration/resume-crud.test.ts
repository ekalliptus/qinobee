import { test, expect } from "bun:test";
import { createDb } from "@lib/db/client";
import { migrate } from "@lib/db/migrate";
import { SqliteResumeRepository } from "@modules/resume/repository/sqlite";

function setup() {
  const db = createDb(":memory:"); migrate(db);
  // satisfy FK: insert users u1 and u2
  const now = new Date().toISOString();
  for (const id of ["u1","u2"]) {
    db.query("INSERT INTO users (id,email,password_hash,created_at) VALUES (?,?,?,?)")
      .run(id, `${id}@x.com`, "hash", now);
  }
  return new SqliteResumeRepository(db);
}

test("create, find, list scoped to owner", async () => {
  const repo = setup();
  const r = await repo.create({ userId: "u1", input: { title: "CV", language: "en", templateId: "essential" } });
  expect((await repo.findById("u1", r.id))?.id).toBe(r.id);
  expect(await repo.findById("u2", r.id)).toBeNull();   // ownership
  expect((await repo.list("u1")).length).toBe(1);
  expect((await repo.list("u2")).length).toBe(0);
});

test("update requires matching revision (optimistic lock) and bumps revision", async () => {
  const repo = setup();
  const r = await repo.create({ userId: "u1", input: { title: "CV", language: "en", templateId: "essential" } });
  const updated = await repo.update("u1", r.id, { revision: r.revision, patch: { title: "New" } });
  expect(updated.revision).toBe(r.revision + 1);
  expect(updated.title).toBe("New");
  await expect(repo.update("u1", r.id, { revision: r.revision, patch: { title: "Stale" } }))
    .rejects.toThrow(/conflict/i);
});

test("update denied for non-owner", async () => {
  const repo = setup();
  const r = await repo.create({ userId: "u1", input: { title: "CV", language: "en", templateId: "essential" } });
  await expect(repo.update("u2", r.id, { revision: r.revision, patch: { title: "Hax" } }))
    .rejects.toThrow();
});

test("duplicate creates an independent copy with reset revision", async () => {
  const repo = setup();
  const r = await repo.create({ userId: "u1", input: { title: "CV", language: "en", templateId: "essential" } });
  await repo.update("u1", r.id, { revision: 0, patch: { title: "Edited" } });
  const dup = await repo.duplicate("u1", r.id);
  expect(dup.id).not.toBe(r.id);
  expect(dup.revision).toBe(0);
  expect(dup.title).toMatch(/copy/i);
  expect((await repo.list("u1")).length).toBe(2);
});

test("softDelete hides from list and findById", async () => {
  const repo = setup();
  const r = await repo.create({ userId: "u1", input: { title: "CV", language: "en", templateId: "essential" } });
  await repo.softDelete("u1", r.id);
  expect(await repo.list("u1")).toHaveLength(0);
  expect(await repo.findById("u1", r.id)).toBeNull();
});

test("a revision snapshot is written on update", async () => {
  const repo = setup();
  const r = await repo.create({ userId: "u1", input: { title: "CV", language: "en", templateId: "essential" } });
  await repo.update("u1", r.id, { revision: 0, patch: { title: "V1" } });
  const dbAny = (repo as any).db;
  const count = dbAny.query("SELECT COUNT(*) c FROM resume_revisions WHERE resume_id = ?").get(r.id) as { c: number };
  expect(count.c).toBeGreaterThanOrEqual(1);
});
