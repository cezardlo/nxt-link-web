// Marketplace listing types shared by vendor dashboard + public marketplace.
// Matches the live marketplace_products / marketplace_services tables.

export type ListingKind = 'product' | 'service';

export interface PilotBlock { available: boolean; duration: string; cost: string; scope: string; success_criteria: string[] }
export interface ImplementationBlock { requirements: string[]; typical_timeline: string; training: string; integrations: string[] }
export interface WarrantySupportBlock { warranty: string; support_channels: string[]; sla: string; maintenance: string }

// Structured pricing lives INSIDE the existing `pricing` jsonb column so no
// migration is needed: legacy keys (model/range/buy/rent/lease/notes) stay,
// and `models` / `components` / `visibility` are added alongside them.
// Gated entries must never reach anonymous responses — see publicPricing().
export const PRICE_VISIBILITY = ['public', 'signed_in', 'after_details', 'after_request', 'private'] as const;
export type PriceVisibility = (typeof PRICE_VISIBILITY)[number];

export const PRICE_METHODS = [
  'exact', 'starting', 'range', 'per_unit', 'per_hour', 'per_day', 'per_week',
  'per_month', 'per_year', 'per_visit', 'per_project', 'per_user', 'per_facility',
  'rental', 'lease', 'subscription', 'quote', 'custom',
] as const;
export type PriceMethod = (typeof PRICE_METHODS)[number];

export interface PriceModelEntry {
  id: string;
  name: string;              // e.g. "Purchase price", "Monthly rental"
  method: PriceMethod;
  amount: string;            // stored as strings — form-friendly, formatted on display
  min_amount: string;
  max_amount: string;
  currency: string;          // 'USD' | 'MXN'
  unit: string;              // e.g. "per unit", "per dock door" (custom units allowed)
  recurring: boolean;
  billing_frequency: string; // e.g. "monthly" — only when recurring
  conditions: string;
  included: string;
  excluded: string;
  visibility: PriceVisibility;
  confirmed_at: string;      // ISO date the vendor last confirmed accuracy ('' = never)
}

export interface PriceComponentEntry {
  id: string;
  name: string;              // e.g. "Mobile-service fee", "Installation"
  description: string;
  amount: string;
  min_amount: string;
  max_amount: string;
  unit: string;              // e.g. "per visit", "% of labor"
  required: boolean;
  recurring: boolean;
  conditions: string;
  visibility: PriceVisibility;
}

export interface PricingBlock {
  model: string; range: string; buy: boolean; rent: boolean; lease: boolean; notes: string;
  models: PriceModelEntry[];
  components: PriceComponentEntry[];
  visibility: PriceVisibility; // default for the legacy range/model line
}
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

/** Keep only known keys of a jsonb block; drop everything else. */
export function cleanBlock(v: unknown, shape: Record<string, 'str' | 'bool' | 'arr' | 'obj'>): Record<string, unknown> | null {
  if (!v || typeof v !== 'object') return null;
  const src = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, t] of Object.entries(shape)) {
    if (!(k in src)) continue;
    if (t === 'str') out[k] = cleanStr(src[k], 600);
    else if (t === 'bool') out[k] = Boolean(src[k]);
    else if (t === 'arr') out[k] = cleanArray(src[k], 15, 200);
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
  pilot: { available: 'bool', duration: 'str', cost: 'str', scope: 'str', success_criteria: 'arr' },
  implementation: { requirements: 'arr', typical_timeline: 'str', training: 'str', integrations: 'arr' },
  warranty_support: { warranty: 'str', support_channels: 'arr', sla: 'str', maintenance: 'str' },
  pricing: { model: 'str', range: 'str', buy: 'bool', rent: 'bool', lease: 'bool', notes: 'str' },
  fit: { company_sizes: 'arr', prerequisites: 'arr', not_a_fit_for: 'arr' },
  risk: { common_risks: 'arr', mitigations: 'arr' },
  roi: { drivers: 'arr', typical_payback: 'str', example: 'str' },
} as const satisfies Record<string, Record<string, 'str' | 'bool' | 'arr' | 'obj'>>;

// ---------- Structured pricing: normalize, format, and gate ----------

function visOf(v: unknown): PriceVisibility {
  return PRICE_VISIBILITY.includes(v as PriceVisibility) ? (v as PriceVisibility) : 'public';
}
function methodOf(v: unknown): PriceMethod {
  return PRICE_METHODS.includes(v as PriceMethod) ? (v as PriceMethod) : 'custom';
}
const money = (v: unknown): string => cleanStr(v, 40).replace(/[^0-9.,]/g, '').slice(0, 20);

export function cleanPriceModels(v: unknown): PriceModelEntry[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 12).map((raw, i): PriceModelEntry | null => {
    if (!raw || typeof raw !== 'object') return null;
    const src = raw as Record<string, unknown>;
    const entry: PriceModelEntry = {
      id: cleanStr(src.id, 40) || `pm_${i + 1}`,
      name: cleanStr(src.name, 120),
      method: methodOf(src.method),
      amount: money(src.amount),
      min_amount: money(src.min_amount),
      max_amount: money(src.max_amount),
      currency: src.currency === 'MXN' ? 'MXN' : 'USD',
      unit: cleanStr(src.unit, 60),
      recurring: Boolean(src.recurring),
      billing_frequency: cleanStr(src.billing_frequency, 40),
      conditions: cleanStr(src.conditions, 400),
      included: cleanStr(src.included, 400),
      excluded: cleanStr(src.excluded, 400),
      visibility: visOf(src.visibility),
      confirmed_at: cleanStr(src.confirmed_at, 40),
    };
    // Keep only entries that say something: a name, an amount, or quote-only.
    if (!entry.name && !entry.amount && !entry.min_amount && entry.method !== 'quote') return null;
    return entry;
  }).filter((e): e is PriceModelEntry => e !== null);
}

export function cleanPriceComponents(v: unknown): PriceComponentEntry[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 20).map((raw, i): PriceComponentEntry | null => {
    if (!raw || typeof raw !== 'object') return null;
    const src = raw as Record<string, unknown>;
    const entry: PriceComponentEntry = {
      id: cleanStr(src.id, 40) || `pc_${i + 1}`,
      name: cleanStr(src.name, 120),
      description: cleanStr(src.description, 300),
      amount: money(src.amount),
      min_amount: money(src.min_amount),
      max_amount: money(src.max_amount),
      unit: cleanStr(src.unit, 60),
      required: Boolean(src.required),
      recurring: Boolean(src.recurring),
      conditions: cleanStr(src.conditions, 400),
      visibility: visOf(src.visibility),
    };
    if (!entry.name) return null;
    return entry;
  }).filter((e): e is PriceComponentEntry => e !== null);
}

const CURRENCY_SIGN: Record<string, string> = { USD: '$', MXN: 'MX$' };
function fmtAmount(raw: string, currency: string): string {
  const n = Number(raw.replace(/,/g, ''));
  const sign = CURRENCY_SIGN[currency] || '$';
  if (!raw || !Number.isFinite(n)) return '';
  return sign + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** One buyer-facing line for a price model, e.g. "Starting at $195 per unit". */
export function priceLine(m: PriceModelEntry): string {
  if (m.method === 'quote') return 'Custom quote';
  const unit = m.unit ? ` ${m.unit}` : '';
  const freq = m.recurring && m.billing_frequency ? ` (${m.billing_frequency})` : '';
  const amount = fmtAmount(m.amount, m.currency);
  const min = fmtAmount(m.min_amount, m.currency);
  const max = fmtAmount(m.max_amount, m.currency);
  if (m.method === 'starting' && (amount || min)) return `Starting at ${amount || min}${unit}${freq}`;
  if (m.method === 'range' && min && max) return `${min}–${max}${unit}${freq}`;
  if (amount) return `${amount}${unit}${freq}`;
  if (min && max) return `${min}–${max}${unit}${freq}`;
  if (min) return `From ${min}${unit}${freq}`;
  return 'Request quote';
}

/** One buyer-facing line for an additional cost, e.g. "Mobile-service fee: $110 per visit". */
export function componentLine(c: PriceComponentEntry): string {
  const amount = fmtAmount(c.amount, 'USD');
  const min = fmtAmount(c.min_amount, 'USD');
  const max = fmtAmount(c.max_amount, 'USD');
  const val = amount || (min && max ? `${min}–${max}` : min) || 'Quoted separately';
  const unit = c.unit ? ` ${c.unit}` : '';
  return `${c.name}: ${val}${unit}${c.required ? '' : ' (optional)'}`;
}

/**
 * Strip pricing entries the audience may not see. MUST be applied by every
 * route that serializes listings to buyers. 'public' = anonymous visitor;
 * 'signed_in' = authenticated buyer. after_details / after_request / private
 * entries never leave the server here — those surfaces get their own flows.
 */
export function publicPricing(
  pricing: unknown,
  audience: 'public' | 'signed_in' = 'public',
): Record<string, unknown> | null {
  if (!pricing || typeof pricing !== 'object') return (pricing as null) ?? null;
  const src = pricing as Record<string, unknown>;
  const allowed: PriceVisibility[] = audience === 'signed_in' ? ['public', 'signed_in'] : ['public'];
  const models = cleanPriceModels(src.models).filter((m) => allowed.includes(m.visibility));
  const components = cleanPriceComponents(src.components).filter((c) => allowed.includes(c.visibility));
  const overall = visOf(src.visibility);
  const legacyVisible = allowed.includes(overall);
  const gatedCount =
    cleanPriceModels(src.models).length - models.length +
    cleanPriceComponents(src.components).length - components.length +
    (legacyVisible ? 0 : 1);
  return {
    model: legacyVisible ? (src.model ?? '') : '',
    range: legacyVisible ? (src.range ?? '') : '',
    buy: Boolean(src.buy), rent: Boolean(src.rent), lease: Boolean(src.lease),
    notes: legacyVisible ? (src.notes ?? '') : '',
    models, components,
    visibility: overall,
    has_gated_pricing: gatedCount > 0, // buyer UI can say "more pricing after you request a quote"
  };
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
  // Structured pricing rides inside the same jsonb: re-attach the typed arrays
  // that cleanBlock (legacy keys only) drops.
  if ('pricing' in body && body.pricing && typeof body.pricing === 'object') {
    const rawPricing = body.pricing as Record<string, unknown>;
    const legacy = (patch.pricing as Record<string, unknown> | null) || {};
    patch.pricing = {
      ...legacy,
      models: cleanPriceModels(rawPricing.models),
      components: cleanPriceComponents(rawPricing.components),
      visibility: PRICE_VISIBILITY.includes(rawPricing.visibility as PriceVisibility)
        ? rawPricing.visibility : 'public',
    };
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
