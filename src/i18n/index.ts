import { siteConfig } from "@/config/site";
import { en, type Dict } from "./en";
import { id } from "./id";

// UI locale is SEPARATE from CV `language` (resume template date/number
// formatting). These dictionaries + t() are the foundation; URL-prefixed
// locales (/en, /id) are prepared for but full localized routing is future
// work. `siteConfig.defaultLocale` drives the current default.
export type Locale = "en" | "id";

const dicts = { en, id } as const;

export function isSupportedLocale(x: unknown): x is Locale {
  return typeof x === "string" && (siteConfig.supportedLocales as readonly string[]).includes(x);
}

export function getDict(locale: Locale): Dict {
  // `en` is the complete dictionary; others are deep-partial with en fallback.
  return dicts[locale] as Dict;
}

function walk(obj: unknown, path: string[]): string | undefined {
  let cur: unknown = obj;
  for (const seg of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return typeof cur === "string" ? cur : undefined;
}

/**
 * Resolve a dot-path key against `locale`, then fall back to `en`, then to the
 * key string itself. Deterministic: locale -> en -> key.
 */
export function t(key: string, locale: Locale): string {
  const path = key.split(".");
  return walk(dicts[locale], path) ?? walk(en, path) ?? key;
}

/** Convenience binder for components: `const tr = useTranslations(locale)`. */
export function useTranslations(locale: Locale) {
  return (key: string): string => t(key, locale);
}
