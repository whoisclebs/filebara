import { browser } from "$app/environment";
import en from "./en";
import ptBR from "./pt-BR";
import es from "./es";
import type { Dictionary, Locale } from "./types";

// ── Static locale map (all loaded synchronously to avoid flash on reload) ──
const LOCALE_DICTS: Record<Locale, Dictionary> = {
  en: en,
  es: es as unknown as Dictionary,
  "pt-BR": ptBR as unknown as Dictionary,
};

// ── Determine initial locale synchronously ──
function detectInitialLocale(): Locale {
  if (!browser) return "en";
  const stored = localStorage.getItem("filebara-locale") as Locale | null;
  if (stored && stored in LOCALE_DICTS) return stored;
  const lang = navigator.language;
  if (lang.startsWith("pt")) return "pt-BR";
  if (lang.startsWith("es")) return "es";
  return "en";
}

// ── Reactive state ────────────────────────────────────────────
const _initial = detectInitialLocale();
let currentLocale = $state<Locale>(_initial);
let dictionary = $state<Dictionary>(LOCALE_DICTS[_initial]);

// ── Public API ────────────────────────────────────────────────

/**
 * Resolve a dotted key from the active dictionary.
 * Falls back to the key itself if the value is not found or not a string.
 */
export function t(
  key: string,
  params?: Record<string, string | number>,
): string {
  let value: unknown = dictionary;
  for (const part of key.split(".")) {
    if (value === null || typeof value !== "object") return key;
    value = (value as Record<string, unknown>)[part];
  }
  if (typeof value !== "string") return key;

  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, name: string) => {
      return params[name] !== undefined ? String(params[name]) : `{${name}}`;
    });
  }
  return value;
}

/** Switch locale synchronously (all dicts are pre-loaded). */
export async function setLocale(loc: Locale): Promise<void> {
  dictionary = LOCALE_DICTS[loc];
  currentLocale = loc;
  if (browser) {
    localStorage.setItem("filebara-locale", loc);
  }
}

/**
 * Initialize locale from storage or browser detection.
 * Already done synchronously at module load, so this is a no-op
 * kept for backward compatibility with onMount calls.
 */
export async function initLocale(): Promise<void> {
  // No-op: locale is already set synchronously at module init.
}

/** Read-only reactive reference to the current locale. */
export function getCurrentLocale(): Locale {
  return currentLocale;
}
