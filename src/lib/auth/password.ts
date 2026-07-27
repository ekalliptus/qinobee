import { b64url, fromB64url } from "./encoding";

const ITER = 100_000;
const KEYLEN = 32;
const SALTLEN = 16;

export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALTLEN));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(plain),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITER },
    key,
    KEYLEN * 8,
  );
  return `pbkdf2$${ITER}$${b64url(salt)}$${b64url(new Uint8Array(bits))}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterStr, saltB, hashB] = stored.split("$");
    if (scheme !== "pbkdf2") return false;
    const iterations = Number(iterStr);
    const salt = fromB64url(saltB);
    const expected = fromB64url(hashB);
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(plain),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const bits = new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt, iterations },
        key,
        expected.length * 8,
      ),
    );
    // Constant-time compare.
    if (bits.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}
