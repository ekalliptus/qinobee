import type { Database } from "bun:sqlite";
import { z } from "zod";
import { hashPassword, verifyPassword } from "./password";
import { newSessionToken, hashToken, sessionExpiry } from "./session";
import { email as emailSchema } from "@/lib/validation/primitives";

const passwordSchema = z.string().min(8).max(200);

export interface SessionResult {
  userId: string;
  token: string;
  sessionId: string;
}

export interface SessionUser {
  id: string;
  email: string;
}

/** Same message for unknown email and wrong password to avoid user enumeration. */
const INVALID_CREDENTIALS = "Invalid email or password";

export class AuthService {
  constructor(private db: Database) {}

  async register(rawEmail: string, rawPassword: string): Promise<SessionUser> {
    const email = emailSchema.parse(rawEmail);
    const password = passwordSchema.parse(rawPassword);

    const existing = this.db
      .query("SELECT id FROM users WHERE email = ?")
      .get(email);
    if (existing) throw new Error("Email already registered");

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    try {
      this.db.run(
        "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
        [id, email, passwordHash, now],
      );
    } catch {
      // UNIQUE race
      throw new Error("Email already registered");
    }
    return { id, email };
  }

  async login(
    rawEmail: string,
    rawPassword: string,
    opts?: { expiresAt?: string },
  ): Promise<SessionResult> {
    const email = emailSchema.parse(rawEmail);
    const user = this.db
      .query("SELECT id, password_hash FROM users WHERE email = ?")
      .get(email) as { id: string; password_hash: string } | null;

    if (!user) {
      // Hash a dummy (valid pbkdf2 shape) to keep timing similar and avoid enumeration.
      await verifyPassword(
        rawPassword,
        `pbkdf2$100000$${"A".repeat(22)}$${"A".repeat(43)}`,
      );
      throw new Error(INVALID_CREDENTIALS);
    }

    const ok = await verifyPassword(rawPassword, user.password_hash);
    if (!ok) throw new Error(INVALID_CREDENTIALS);

    const token = newSessionToken();
    const tokenHash = await hashToken(token);
    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();
    const expiresAt = opts?.expiresAt ?? sessionExpiry();
    this.db.run(
      "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
      [sessionId, user.id, tokenHash, expiresAt, now],
    );
    return { userId: user.id, token, sessionId };
  }

  async validateSession(token: string): Promise<SessionUser | null> {
    const tokenHash = await hashToken(token);
    const now = new Date().toISOString();
    const row = this.db
      .query(
        `SELECT u.id AS id, u.email AS email, s.expires_at AS expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?`,
      )
      .get(tokenHash) as { id: string; email: string; expires_at: string } | null;
    if (!row) return null;
    if (row.expires_at <= now) {
      this.db.run("DELETE FROM sessions WHERE token_hash = ?", [tokenHash]);
      return null;
    }
    return { id: row.id, email: row.email };
  }

  async logout(token: string): Promise<void> {
    this.db.run("DELETE FROM sessions WHERE token_hash = ?", [await hashToken(token)]);
  }
}
