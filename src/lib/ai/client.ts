import { suggestionSchema, type Suggestion } from "@lib/ai/types";
import type { ChatMessage } from "@lib/ai/prompts";

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/** Best-effort extraction of the first balanced {...} block from raw text. */
function extractJsonBlock(raw: string): string | null {
  const start = raw.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Parse + validate a suggestion. Tolerates JSON wrapped in prose/markdown
 * fences by extracting the first {...} block. Never throws.
 */
export function parseSuggestion(raw: string): ParseResult<Suggestion> {
  const candidates: unknown[] = [];
  const tryParse = (s: string) => {
    try {
      candidates.push(JSON.parse(s));
    } catch {
      /* ignore */
    }
  };
  tryParse(raw);
  const block = extractJsonBlock(raw);
  if (block) tryParse(block);

  for (const c of candidates) {
    const parsed = suggestionSchema.safeParse(c);
    if (parsed.success) return { ok: true, value: parsed.data };
  }
  return { ok: false, error: "invalid suggestion payload" };
}

/**
 * Parse raw model output into a plain object. Tolerates prose/markdown fences
 * by extracting the first balanced {...} block. Returns null instead of
 * throwing on any failure. Callers validate the shape with zod.
 */
export function parseJsonObject(raw: string): unknown | null {
  const tryParse = (s: string): unknown | null => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  const direct = tryParse(raw);
  if (direct && typeof direct === "object") return direct;
  const block = extractJsonBlock(raw);
  if (block) {
    const parsed = tryParse(block);
    if (parsed && typeof parsed === "object") return parsed;
  }
  return null;
}

export interface CallChatCompletionOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Low-level call to an OpenAI-compatible chat/completions endpoint.
 * Throws on non-2xx, network error, or malformed provider envelope.
 * Never logs messages or the API key.
 */
export async function callChatCompletion(
  opts: CallChatCompletionOptions,
): Promise<string> {
  const {
    baseUrl,
    apiKey,
    model,
    messages,
    fetchImpl = globalThis.fetch,
    timeoutMs = 12000,
    signal,
  } = opts;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const res = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        // Force a single non-streaming envelope. The router (OpenAI-compatible)
        // streams SSE by default; without this the body is `data: {chunk}` lines
        // that res.json() cannot parse. parseSuggestion() strips any ```json fences.
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`provider responded ${res.status}`);

    const data: unknown = await res.json();
    const content = (data as { choices?: Array<{ message?: { content?: unknown } }> })
      ?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      throw new Error("malformed provider response");
    }
    return content;
  } finally {
    clearTimeout(timer);
  }
}
