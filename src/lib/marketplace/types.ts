// Marketplace listing types shared by vendor dashboard + public marketplace.
// Matches the live marketplace_products / marketplace_services tables.

export type ListingKind = 'product' | 'service';

// A vendor-defined {label, value} row — the "+ Add field" escape hatch on
// implementation / warranty_support / pricing so vendors aren't boxed into
// the three named presets. Renders generically (label: value) everywhere
// these blocks are shown. Absent on every listing saved before this feature.
export interface CustomField { label: string; value: string }
// One pilot/demo entry. Pre-existing listings (and any 1-pilot listing, old
// or new) carry these fields at the TOP of `pilot` directly (no `entries`
// array) — see pilotEntriesOf() for the back-compat read.
export interface PilotEntry { duration: string; cost: string; scope: string }

export interface PilotBlock { available: boolean; duration: string; cost: string; scope: string; success_criteria: string[]; entries?: PilotEntry[] }
export interface ImplementationBlock { requirements: string[]; typical_timeline: string; training: string; integrations: string[]; custom?: CustomField[] }
export interface WarrantySupportBlock { warranty: string; support_channels: string[]; sla: string; maintenance: string; custom?: CustomField[] }
export interface PricingBlock { model: string; range: string; buy: boolean; rent: boolean; lease: boolean; notes: string; custom?: CustomField[] }
export interface FitBlock { company_sizes: string[]; prerequisites: string[]; not_a_fit_for: string[] }
export interface RiskBlock { common_risks: string[]; mitigations: string[] }
export interface RoiBlock { drivers: string[]; typical_payback: string; example: string }

export interface ListingBase {
  id: string;
  public_ref: string;
  vendor_id: string;
  name: string;
  category: string;
  overview: string | null;
  best_for: string[];
  industries: string[];
  image_paths: string[];
  video_urls: string[];
  pilot: Partial<PilotBlock> | null;
  implementation: Partial<ImplementationBlock> | null;
  warranty_support: Partial<WarrantySupportBlock> | null;
  pricing: Partial<PricingBlock> | null;
  fit: Partial<FitBlock> | null;
  risk: Partial<RiskBlock> | null;
  roi: Partial<RoiBlock> | null;
  status: 'draft' | 'published' | 'archived';
  ai_extracted: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface ProductListing extends ListingBase {
  use_cases: string[];
  specs: Record<string, string>;
  availability: string[]; // e.g. ['buy','rent','lease']
  lead_time: string | null;
}

export interface ServiceListing extends ListingBase {
  service_areas: string[];
  response_time: string | null;
  process: string[];
  certifications: string[];
  pricing_model: string | null;
  emergency_available: boolean;
}

const BASE_COLS =
  'id, public_ref, vendor_id, name, category, overview, best_for, industries, image_paths, video_urls, pilot, implementation, warranty_support, pricing, fit, risk, roi, status, ai_extracted, created_at, updated_at, published_at';
export const PRODUCT_COLS = `${BASE_COLS}, use_cases, specs, availability, lead_time`;
export const SERVICE_COLS = `${BASE_COLS}, service_areas, response_time, process, certifications, pricing_model, emergency_available`;

export function tableFor(kind: ListingKind): string {
  return kind === 'product' ? 'marketplace_products' : 'marketplace_services';
}
export function colsFor(kind: ListingKind): string {
  return kind === 'product' ? PRODUCT_COLS : SERVICE_COLS;
}

export function cleanArray(v: unknown, max = 20, maxLen = 120): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const raw of v) {
    const s = String(raw).trim().slice(0, maxLen);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function cleanStr(v: unknown, max = 400): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

// Abuse/bloat caps for the vendor-flexibility fields (2026-07-23). Enforced
// here — the only path client input reaches the DB — so a bypassed/forged
// client request still can't push unbounded or oversized content into a
// column that renders to buyers.
const CUSTOM_FIELD_MAX = 20;
const CUSTOM_LABEL_MAX = 60;
const CUSTOM_VALUE_MAX = 300;
const PILOT_ENTRY_MAX = 8;

/** Vendor-defined {label, value} rows (implementation/warranty_support/pricing
 * "+ Add field"). Drops anything not a plain object, or with an empty label
 * or value after trimming; caps count and per-field length. */
function cleanPairs(v: unknown): CustomField[] {
  if (!Array.isArray(v)) return [];
  const out: CustomField[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== 'object') continue;
    const o = raw as Record<string, unknown>;
    const label = cleanStr(o.label, CUSTOM_LABEL_MAX);
    const value = cleanStr(o.value, CUSTOM_VALUE_MAX);
    if (!label || !value) continue;
    out.push({ label, value });
    if (out.length >= CUSTOM_FIELD_MAX) break;
  }
  return out;
}

/** Repeatable pilot/demo entries (`pilot.entries`). Drops anything not a
 * plain object; keeps an entry if ANY of duration/cost/scope is non-empty
 * (a vendor filling in only one field is still useful); caps count. */
function cleanPilotEntries(v: unknown): PilotEntry[] {
  if (!Array.isArray(v)) return [];
  const out: PilotEntry[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== 'object') continue;
    const o = raw as Record<string, unknown>;
    const duration = cleanStr(o.duration, 120);
    const cost = cleanStr(o.cost, 120);
    const scope = cleanStr(o.scope, 300);
    if (!duration && !cost && !scope) continue;
    out.push({ duration, cost, scope });
    if (out.length >= PILOT_ENTRY_MAX) break;
  }
  return out;
}

/** Keep only known keys of a jsonb block; drop everything else. */
export function cleanBlock(v: unknown, shape: Record<string, 'str' | 'bool' | 'arr' | 'obj' | 'pairs' | 'pilots'>): Record<string, unknown> | null {
  if (!v || typeof v !== 'object') return null;
  const src = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, t] of Object.entries(shape)) {
    if (!(k in src)) continue;
    if (t === 'str') out[k] = cleanStr(src[k], 600);
    else if (t === 'bool') out[k] = Boolean(src[k]);
    else if (t === 'arr') out[k] = cleanArray(src[k], 15, 200);
    else if (t === 'pairs') out[k] = cleanPairs(src[k]);
    else if (t === 'pilots') out[k] = cleanPilotEntries(src[k]);
    else if (t === 'obj' && src[k] && typeof src[k] === 'object') {
      const o: Record<string, string> = {};
      for (const [sk, sv] of Object.entries(src[k] as Record<string, unknown>).slice(0, 40)) {
        const key = cleanStr(sk, 80); const val = cleanStr(sv, 300);
        if (key && val) o[key] = val;
      }
      out[k] = o;
    }
  }
  return Object.keys(out).length ? out : null;
}

export const BLOCK_SHAPES = {
  pilot: { available: 'bool', duration: 'str', cost: 'str', scope: 'str', success_criteria: 'arr', entries: 'pilots' },
  implementation: { requirements: 'arr', typical_timeline: 'str', training: 'str', integrations: 'arr', custom: 'pairs' },
  warranty_support: { warranty: 'str', support_channels: 'arr', sla: 'str', maintenance: 'str', custom: 'pairs' },
  pricing: { model: 'str', range: 'str', buy: 'bool', rent: 'bool', lease: 'bool', notes: 'str', custom: 'pairs' },
  fit: { company_sizes: 'arr', prerequisites: 'arr', not_a_fit_for: 'arr' },
  risk: { common_risks: 'arr', mitigations: 'arr' },
  roi: { drivers: 'arr', typical_payback: 'str', example: 'str' },
} as const satisfies Record<string, Record<string, 'str' | 'bool' | 'arr' | 'obj' | 'pairs' | 'pilots'>>;

function strOf(v: unknown): string { return typeof v === 'string' ? v : ''; }

/** Back-compat reader for `pilot`: every listing saved before this feature
 * (and any listing with just one pilot/demo) stores duration/cost/scope
 * directly on the block, no `entries` array. Listings with 2+ pilots carry
 * `entries` (the canonical list, entry 0 mirrored onto the legacy top-level
 * fields too). Reading always returns a flat list — callers never need to
 * know which shape they got. */
export function pilotEntriesOf(pilot: unknown): PilotEntry[] {
  const p = pilot && typeof pilot === 'object' ? (pilot as Record<string, unknown>) : {};
  const raw = Array.isArray(p.entries) ? (p.entries as unknown[]) : [];
  const mapped = raw
    .filter((e): e is Record<string, unknown> => Boolean(e) && typeof e === 'object')
    .map((e) => ({ duration: strOf(e.duration), cost: strOf(e.cost), scope: strOf(e.scope) }));
  if (mapped.length) return mapped;
  const duration = strOf(p.duration); const cost = strOf(p.cost); const scope = strOf(p.scope);
  return duration || cost || scope ? [{ duration, cost, scope }] : [];
}

/** Back-compat reader for the vendor-defined {label, value} rows on
 * implementation/warranty_support/pricing. Absent on every listing saved
 * before this feature — returns []. */
export function customFieldsOf(block: unknown): CustomField[] {
  const b = block && typeof block === 'object' ? (block as Record<string, unknown>) : {};
  const raw = Array.isArray(b.custom) ? (b.custom as unknown[]) : [];
  return raw
    .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === 'object')
    .map((c) => ({ label: strOf(c.label), value: strOf(c.value) }))
    .filter((c) => c.label && c.value);
}

/** Normalize client-supplied listing fields into a safe row patch. */
export function normalizeListingInput(kind: ListingKind, body: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (typeof body.name === 'string') patch.name = cleanStr(body.name, 200);
  if (typeof body.category === 'string') patch.category = cleanStr(body.category, 120);
  if (typeof body.overview === 'string') patch.overview = cleanStr(body.overview, 5000);
  if ('best_for' in body) patch.best_for = cleanArray(body.best_for, 10);
  if ('industries' in body) patch.industries = cleanArray(body.industries, 15);
  if ('video_urls' in body) patch.video_urls = cleanArray(body.video_urls, 6, 300);
  for (const k of Object.keys(BLOCK_SHAPES) as Array<keyof typeof BLOCK_SHAPES>) {
    if (k in body) patch[k] = cleanBlock(body[k], BLOCK_SHAPES[k]);
  }
  if (kind === 'product') {
    if ('use_cases' in body) patch.use_cases = cleanArray(body.use_cases, 12, 200);
    if ('specs' in body) {
      const specs = cleanBlock({ specs: body.specs }, { specs: 'obj' });
      patch.specs = specs ? specs.specs : {};
    }
    if ('availability' in body) patch.availability = cleanArray(body.availability, 4, 20).filter((v) => ['buy', 'rent', 'lease', 'quote'].includes(v));
    if (typeof body.lead_time === 'string') patch.lead_time = cleanStr(body.lead_time, 120);
  } else {
    if ('service_areas' in body) patch.service_areas = cleanArray(body.service_areas, 15);
    if (typeof body.response_time === 'string') patch.response_time = cleanStr(body.response_time, 120);
    if ('process' in body) patch.process = cleanArray(body.process, 12, 300);
    if ('certifications' in body) patch.certifications = cleanArray(body.certifications, 15, 200);
    if (typeof body.pricing_model === 'string') patch.pricing_model = cleanStr(body.pricing_model, 200);
    if ('emergency_available' in body) patch.emergency_available = Boolean(body.emergency_available);
  }
  return patch;
}
