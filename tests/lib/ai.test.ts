import { test, expect } from "bun:test";
import { parseSuggestion } from "@lib/ai/client";
import { createAiService } from "@modules/resume/services/ai-service";

test("parseSuggestion accepts a valid structured suggestion", () => {
  const r = parseSuggestion('{"suggestion":"Improved text","changes":["tightened wording"]}');
  expect(r.ok).toBe(true);
  if (r.ok) { expect(r.value.suggestion).toBe("Improved text"); expect(r.value.changes.length).toBe(1); }
});
test("parseSuggestion rejects malformed / wrong-shape JSON", () => {
  expect(parseSuggestion('{"nope":true}').ok).toBe(false);
  expect(parseSuggestion('not json at all').ok).toBe(false);
  expect(parseSuggestion('{"suggestion":123}').ok).toBe(false);
});
test("service returns deterministic non-AI fallback when disabled (no API key, no network)", async () => {
  // Force-disabled service (no key) must not call fetch.
  let called = false;
  const svc = createAiService({ apiKey: "", fetchImpl: (async () => { called = true; return new Response("{}"); }) as any });
  const res = await svc.improveBullet({ text: "did stuff", context: {} as any });
  expect(called).toBe(false);
  expect(res.source).toBe("fallback");
  expect(typeof res.suggestion).toBe("string");
  expect(res.suggestion.length).toBeGreaterThan(0);
});
test("service maps a valid provider response to a suggestion when enabled", async () => {
  const fakeFetch = (async () => new Response(JSON.stringify({
    choices: [{ message: { content: '{"suggestion":"Led migration reducing load time","changes":["added action verb"]}' } }],
  }), { status: 200, headers: { "content-type": "application/json" } })) as any;
  const svc = createAiService({ apiKey: "test-key", baseUrl: "https://example.test/v1", model: "gaskeun", fetchImpl: fakeFetch });
  const res = await svc.improveBullet({ text: "did the migration", context: {} as any });
  expect(res.source).toBe("ai");
  expect(res.suggestion).toContain("Led migration");
});
test("service falls back (not throws) when provider returns garbage", async () => {
  const fakeFetch = (async () => new Response("<html>error</html>", { status: 200 })) as any;
  const svc = createAiService({ apiKey: "test-key", fetchImpl: fakeFetch });
  const res = await svc.improveBullet({ text: "did stuff", context: {} as any });
  expect(res.source).toBe("fallback"); // invalid AI output → safe fallback, never throws to caller
});
test("service falls back when provider errors / network throws", async () => {
  const fakeFetch = (async () => { throw new Error("network down"); }) as any;
  const svc = createAiService({ apiKey: "test-key", fetchImpl: fakeFetch });
  const res = await svc.improveBullet({ text: "did stuff", context: {} as any });
  expect(res.source).toBe("fallback");
});
