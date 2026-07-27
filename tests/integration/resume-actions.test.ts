import { test, expect } from "bun:test";
import { createDb } from "@lib/db/client";
import { migrate } from "@lib/db/migrate";
import { createResumeService } from "@modules/resume/services/resume-service";

// Action-level authorization guard for the CRUD endpoints. Endpoints are thin
// wrappers over these service methods; ownership is enforced here (endpoints
// only add auth + parsing). Non-owner access must be indistinguishable from a
// missing record (throws NotFoundError -> 404), never 403.
function setup() {
  const db = createDb(":memory:");
  migrate(db);
  const now = new Date().toISOString();
  for (const id of ["u1", "u2"]) {
    db.query(
      "INSERT INTO users (id,email,password_hash,created_at) VALUES (?,?,?,?)",
    ).run(id, `${id}@x.com`, "hash", now);
  }
  return createResumeService(db);
}

test("create + list scoped to owner", async () => {
  const svc = setup();
  const r = await svc.create({
    userId: "u1",
    input: { title: "CV", language: "en", templateId: "essential" },
  });
  expect((await svc.list("u1")).length).toBe(1);
  expect((await svc.list("u2")).length).toBe(0);
  expect(await svc.get("u2", r.id)).toBeNull();
});

test("duplicate only for owner", async () => {
  const svc = setup();
  const r = await svc.create({
    userId: "u1",
    input: { title: "CV", language: "en", templateId: "essential" },
  });
  await expect(svc.duplicate("u2", r.id)).rejects.toThrow();
  const dup = await svc.duplicate("u1", r.id);
  expect(dup.id).not.toBe(r.id);
});

test("rename via update only for owner + bumps revision", async () => {
  const svc = setup();
  const r = await svc.create({
    userId: "u1",
    input: { title: "CV", language: "en", templateId: "essential" },
  });
  await expect(
    svc.update("u2", r.id, { revision: r.revision, patch: { title: "Hax" } }),
  ).rejects.toThrow();
  const renamed = await svc.update("u1", r.id, {
    revision: r.revision,
    patch: { title: "Backend Engineer CV" },
    reason: "rename",
  });
  expect(renamed.title).toBe("Backend Engineer CV");
  expect(renamed.revision).toBe(r.revision + 1);
});

test("remove (soft delete) only for owner", async () => {
  const svc = setup();
  const r = await svc.create({
    userId: "u1",
    input: { title: "CV", language: "en", templateId: "essential" },
  });
  await expect(svc.remove("u2", r.id)).rejects.toThrow();
  await svc.remove("u1", r.id);
  expect(await svc.list("u1")).toHaveLength(0);
});
