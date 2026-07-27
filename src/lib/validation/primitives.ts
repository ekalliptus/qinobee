import { z } from "zod";

// URL only allows http/https (reject javascript:, data:, etc.)
export const httpUrl = z
  .string()
  .trim()
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, "Must be a valid http(s) URL");

export const email = z.email().trim().toLowerCase();

export function boundedText(max: number) {
  return z.string().max(max);
}

export const nonEmpty = (max: number) => z.string().trim().min(1).max(max);
