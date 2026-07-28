// Local-only (browser) draft persistence for the vendor listing editor
// (src/app/vendor/listings/page.tsx). Protects against losing unsaved work
// on an accidental tab close, refresh, or crash. Nothing here talks to the
// network or the database — it only serializes/deserializes whatever the
// editor already has in memory, into localStorage, on the SAME device. The
// stashed draft is cleared as soon as a real save succeeds.
//
// Kept framework-free and generic (no dependency on the page's `Form` type)
// so this logic is unit-testable without pulling in React/Next.

import { pilotEntriesOf, customFieldsOf, type PilotEntry, type CustomField } from '@/lib/marketplace/types';

const PREFIX = 'nxt_listing_draft_v1';
// A stashed draft older than this is treated as if nothing was saved — never
// offered back to the vendor as "resume where you left off".
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AutosaveSnapshot<T> {
  savedAt: number;
  form: T;
}

/** Storage key: scoped per signed-in vendor (their Supabase auth id) + which
 * listing kind + which listing (or 'new') — so two vendors sharing a browser,
 * or a vendor editing two different listings, never collide. */
export function autosaveKey(authId: string, kind: string, listingId: string | null): string {
  const safeAuth = authId && authId.trim() ? authId.trim() : 'anon';
  const safeId = listingId && listingId.trim() ? listingId.trim() : 'new';
  return `${PREFIX}:${safeAuth}:${kind}:${safeId}`;
}

/** Turn the in-memory form into a storable string. */
export function serializeAutosave<T>(form: T, now: number = Date.now()): string {
  const snapshot: AutosaveSnapshot<T> = { savedAt: now, form };
  return JSON.stringify(snapshot);
}

/** Parse a stashed draft back out. Returns null for anything missing,
 * malformed, or older than MAX_AGE_MS — a corrupt or ancient entry is
 * treated as if nothing was saved, never surfaced to the vendor. */
export function parseAutosave<T>(raw: string | null | undefined, now: number = Date.now()): AutosaveSnapshot<T> | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const candidate = parsed as Partial<AutosaveSnapshot<T>>;
  if (typeof candidate.savedAt !== 'number' || !Number.isFinite(candidate.savedAt)) return null;
  if (!candidate.form || typeof candidate.form !== 'object') return null;
  if (now - candidate.savedAt > MAX_AGE_MS) return null;
  if (now - candidate.savedAt < 0) return null; // clock skew / tampering — don't trust it
  return { savedAt: candidate.savedAt, form: candidate.form as T };
}

/** True when a form object has anything in it worth saving/restoring — keeps
 * localStorage clean and guarantees the vendor is never offered a "resume"
 * for a blank editor. Works on any plain object of strings/booleans/arrays,
 * which is the shape of every field on the listing editor's Form type. */
export function isAutosaveWorthKeeping(form: Record<string, unknown>): boolean {
  return Object.values(form).some((v) => {
    if (typeof v === 'string') return v.trim().length > 0;
    if (typeof v === 'boolean') return v === true;
    if (Array.isArray(v)) return v.length > 0;
    return false;
  });
}

/** Merge an arbitrary (possibly stale, schema-drifted, or corrupted) stored
 * object onto a known-good defaults object, keeping a value only when it has
 * the SAME type as the default for that key. Protects the editor from a
 * malformed localStorage entry ever putting an unexpected shape into React
 * state — worst case, a field silently falls back to its default instead of
 * throwing or rendering garbage. */
export function mergeWithDefaults<T extends Record<string, unknown>>(defaults: T, stored: unknown): T {
  const src = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
  const next = { ...defaults };
  (Object.keys(defaults) as Array<keyof T>).forEach((key) => {
    const base = defaults[key];
    const value = src[key as string];
    if (typeof base === 'string' && typeof value === 'string') next[key] = value as T[typeof key];
    else if (typeof base === 'boolean' && typeof value === 'boolean') next[key] = value as T[typeof key];
    else if (Array.isArray(base) && Array.isArray(value)) next[key] = value as T[typeof key];
  });
  return next;
}

/** The four vendor-extensible array fields on the listing editor's Form
 * (pilots + the three custom {label,value} blocks: implementation/
 * warranty_support/pricing). */
export interface ListingFormArrayFields {
  pilots: PilotEntry[];
  impl_custom: CustomField[];
  ws_custom: CustomField[];
  pr_custom: CustomField[];
}

/** Element-level sanitization pass for those four fields, meant to run
 * AFTER mergeWithDefaults on a restored autosave draft. mergeWithDefaults
 * only checks `Array.isArray(...)` at the field level — it does not (and
 * shouldn't, being generic) validate what is INSIDE the array. A
 * crafted/corrupted localStorage entry like `pilots:[null]` would sail
 * straight through and later crash the editor rendering `p.duration` on
 * null. This routes those four fields through the exact same element-level
 * sanitizers (pilotEntriesOf/customFieldsOf, src/lib/marketplace/types.ts)
 * the rest of the app already trusts for untrusted JSONB coming out of the
 * database — same contract, same guarantees, nothing new to reason about. */
export function sanitizeRestoredListingArrays<T extends ListingFormArrayFields>(form: T, pilotMax: number, customMax: number): T {
  return {
    ...form,
    pilots: pilotEntriesOf({ entries: form.pilots }).slice(0, pilotMax),
    impl_custom: customFieldsOf({ custom: form.impl_custom }).slice(0, customMax),
    ws_custom: customFieldsOf({ custom: form.ws_custom }).slice(0, customMax),
    pr_custom: customFieldsOf({ custom: form.pr_custom }).slice(0, customMax),
  };
}
