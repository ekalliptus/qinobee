import { test, expect } from "bun:test";
import { handleImprove } from "@modules/resume/services/ai-endpoint";
import { createAiService } from "@modules/resume/services/ai-service";

const svc = createAiService({ apiKey: "" }); // disabled → fallback

test("no user → 401", async () => {
  const r = await handleImprove({
    user: null,
    consentGiven: true,
    aiService: svc,
    body: { kind: "bullet", text: "did stuff" },
  });
  expect(r.status).toBe(401);
});

test("no consent → 403", async () => {
  const r = await handleImprove({
    user: { id: "u1", email: "e" },
    consentGiven: false,
    aiService: svc,
    body: { kind: "bullet", text: "did stuff" },
  });
  expect(r.status).toBe(403);
});

test("invalid body → 400", async () => {
  const r = await handleImprove({
    user: { id: "u1", email: "e" },
    consentGiven: true,
    aiService: svc,
    body: { kind: "nope" },
  });
  expect(r.status).toBe(400);
});

test("valid → 200 with a suggestion (fallback source ok)", async () => {
  const r = await handleImprove({
    user: { id: "u1", email: "e" },
    consentGiven: true,
    aiService: svc,
    body: { kind: "bullet", text: "did the migration" },
  });
  expect(r.status).toBe(200);
  expect(r.body.ok).toBe(true);
  expect(r.body.suggestion.length).toBeGreaterThan(0);
  expect(["ai", "fallback"]).toContain(r.body.source);
});

test("summary kind → 200", async () => {
  const r = await handleImprove({
    user: { id: "u1", email: "e" },
    consentGiven: true,
    aiService: svc,
    body: { kind: "summary", text: "experienced engineer building things" },
  });
  expect(r.status).toBe(200);
  expect(r.body.suggestion.length).toBeGreaterThan(0);
});
