import { createHash } from "node:crypto";

/**
 * Canonical JSON: keys sorted, numbers rounded to a fixed precision, so two
 * semantically identical requests always hash identically regardless of key
 * order or float noise. The hash is what makes a scenario run reproducible and
 * what lets an unchanged re-run return the stored snapshot instead of
 * recomputing.
 */
export function canonicalise(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Number(value.toFixed(8));
  }
  if (Array.isArray(value)) return value.map(canonicalise);
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return Object.fromEntries(entries.map(([k, v]) => [k, canonicalise(v)]));
  }
  return value;
}

export function inputHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonicalise(value))).digest("hex");
}
