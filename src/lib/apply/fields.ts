// Shared intake-field parsing for the vendor-application system
// (vendor_applications). Extracted from /api/apply/submit and /api/apply/my so
// both routes — and the 2026-08-04 multi-select fields — parse identically.

/** Dedup + trim + cap a string-array field. Returns undefined when the caller
 *  did not send the field at all (so PATCH can tell "absent" from "empty"). */
export function cleanStringArray(values: unknown, max: number, maxLen: number): string[] | undefined {
  if (!Array.isArray(values)) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    if (typeof raw !== 'string') continue;
    const v = raw.trim().slice(0, maxLen);
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

/** Multi-value field with a legacy single-value fallback: the /apply form
 *  submitted ONE `region` / `target_customer` before 2026-08-04, and a cached
 *  page may still POST only the single key. Prefer the multi list; fall back
 *  to the single value so nothing a vendor typed is dropped. */
export function resolveMultiValue(multi: string[] | undefined, legacySingle: string): string[] {
  if (multi && multi.length) return multi;
  const v = legacySingle.trim();
  return v ? [v] : [];
}

export const MAX_REGIONS = 8;
export const REGION_MAXLEN = 60;
export const MAX_TARGET_CUSTOMERS = 12;
export const TARGET_CUSTOMER_MAXLEN = 80;
