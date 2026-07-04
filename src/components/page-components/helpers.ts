/**
 * Small, dependency-free helpers for reading values out of loosely-typed
 * `Record<string, unknown>` documents. Page components accept arbitrary data,
 * so these coercions keep the component bodies focused and type-safe.
 */

/** Read a string-ish field, falling back to `fallback` when absent/empty. */
export function getString(
  row: Record<string, unknown>,
  key: string,
  fallback = ""
): string {
  const v = row[key];
  if (v == null) return fallback;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}

/** Read a numeric field, coercing numeric strings; returns `fallback` if not a number. */
export function getNumber(
  row: Record<string, unknown>,
  key: string,
  fallback = 0
): number {
  const v = row[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

/** Read an ISO date-ish field into a `Date`, or `null` when unparseable. */
export function getDate(row: Record<string, unknown>, key: string): Date | null {
  const v = row[key];
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/** Best-effort label for a row: first present of the given keys, else the id. */
export function getLabel(
  row: Record<string, unknown>,
  keys: string[] = ["name", "title", "label", "displayName"]
): string {
  for (const k of keys) {
    const s = getString(row, k);
    if (s) return s;
  }
  return getString(row, "id", "(untitled)");
}

/** Read the first configured field key from `config` that resolves to a string. */
export function configString(
  config: Record<string, unknown> | undefined,
  key: string,
  fallback = ""
): string {
  if (!config) return fallback;
  const v = config[key];
  return typeof v === "string" && v ? v : fallback;
}

/** Read a `string[]` from config (e.g. a list of column keys). */
export function configStringArray(
  config: Record<string, unknown> | undefined,
  key: string
): string[] {
  const v = config?.[key];
  if (Array.isArray(v)) {
    return v.filter((x): x is string => typeof x === "string");
  }
  return [];
}

/** Group documents by a field value, returning counts per distinct value. */
export function countBy(
  documents: Record<string, unknown>[],
  key: string
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of documents) {
    const k = getString(row, key, "Unknown") || "Unknown";
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/** Title-case a camelCase / snake_case key into a column header. */
export function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (c) => c.toUpperCase());
}
