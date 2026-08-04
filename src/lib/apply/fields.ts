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

// ---- "needs more info" (2026-08-04 Batch B) ---------------------------------

/** Admin's send-back note: trim + cap. Returns null when empty — a needs_info
 *  send-back without a message is rejected by the caller. */
export const VENDOR_MESSAGE_MAXLEN = 500;
export function cleanVendorMessage(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().slice(0, VENDOR_MESSAGE_MAXLEN).trim();
  return v || null;
}

/** Resubmit rule: when a vendor saves their application after an admin sent
 *  it back for more info (needs_info), it returns to review — the SAME row
 *  flips back to 'pending' (the one-application-per-company rule is
 *  untouched; no second application is ever created). Any other status is
 *  left alone — vendors can never approve/reject themselves. */
export function resubmitStatusPatch(currentStatus: string): { status?: 'pending' } {
  return currentStatus === 'needs_info' ? { status: 'pending' } : {};
}
