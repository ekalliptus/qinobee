import { test, expect } from "bun:test";
import { createSqliteAdapter } from "@lib/db/sqlite-adapter";
import { migrateDb } from "@lib/db/migrate";
import { AuthService } from "@lib/auth/service";

async function svc() {
  const db = createSqliteAdapter(":memory:");
  await migrateDb(db);
  return new AuthService(db);
}

test("register then login issues session; wrong password fails", async () => {
  const auth = await svc();
  const user = await auth.register("a@b.com", "s3cret!pw");
  const sess = await auth.login("a@b.com", "s3cret!pw");
  expect(sess.userId).toBe(user.id);
  expect(sess.token.length).toBeGreaterThanOrEqual(43);
  await expect(auth.login("a@b.com", "nope")).rejects.toThrow();
});

test("duplicate email rejected", async () => {
  const auth = await svc();
  await auth.register("dupe@b.com", "s3cret!pw");
  await expect(auth.register("dupe@b.com", "another!pw")).rejects.toThrow();
});

test("validateSession returns user; logout revokes it", async () => {
  const auth = await svc();
  await auth.register("c@b.com", "s3cret!pw");
  const sess = await auth.login("c@b.com", "s3cret!pw");
  const u = await auth.validateSession(sess.token);
  expect(u?.email).toBe("c@b.com");
  await auth.logout(sess.token);
  expect(await auth.validateSession(sess.token)).toBeNull();
});

test("expired session invalid", async () => {
  const auth = await svc();
  await auth.register("d@b.com", "s3cret!pw");
  const sess = await auth.login("d@b.com", "s3cret!pw", {
    expiresAt: new Date(Date.now() - 1000).toISOString(),
  });
  expect(await auth.validateSession(sess.token)).toBeNull();
});

test("unknown email and wrong password throw the same error", async () => {
  const auth = await svc();
  await auth.register("e@b.com", "s3cret!pw");
  let unknownMsg = "";
  let wrongMsg = "";
  try {
    await auth.login("nobody@b.com", "s3cret!pw");
  } catch (e) {
    unknownMsg = (e as Error).message;
  }
  try {
    await auth.login("e@b.com", "wrong!pw");
  } catch (e) {
    wrongMsg = (e as Error).message;
  }
  expect(unknownMsg).toBe(wrongMsg);
  expect(unknownMsg.length).toBeGreaterThan(0);
});
