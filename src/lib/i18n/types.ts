import type en from "./en";

/** Supported locale identifiers. */
export type Locale = "en" | "es" | "pt-BR";

/** Dictionary shape derived from the English source of truth. */
export type Dictionary = typeof en;

/**
 * Recursively map a dictionary's string leaves to `string`.
 * Use `satisfies DeepStrings<Dictionary>` so translation objects
 * are structurally type-checked without requiring identical literal
 * string types.
 */
export type DeepStrings<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]>;
};
