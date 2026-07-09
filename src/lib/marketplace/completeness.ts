// Listing completeness score — pushes vendors to fill in the fields that make
// listings comparable and rank higher (photos, pricing, warranty, specs…).
// Pure function over the listing row; used by Seller Central (and later,
// search ranking). Plain-language suggestions, most impactful first.

type Loose = Record<string, unknown>;

const s = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Loose => (v && typeof v === 'object' ? (v as Loose) : {});

interface Check { label: string; weight: number; ok: boolean }

export interface Completeness {
  percent: number;         // 0-100
  missing: string[];       // plain suggestions, highest impact first
}

export function scoreListing(kind: 'product' | 'service', l: Loose): Completeness {
  const pilot = obj(l.pilot); const impl = obj(l.implementation);
  const ws = obj(l.warranty_support); const pricing = obj(l.pricing);

  const checks: Check[] = [
    { label: 'Add at least one photo', weight: 3, ok: arr(l.image_paths).length > 0 },
    { label: 'Write a fuller description (a few sentences)', weight: 3, ok: s(l.overview).length >= 60 },
    { label: 'Add pricing (model or range)', weight: 3, ok: Boolean(s(pricing.model) || s(pricing.range) || s(l.pricing_model)) },
    { label: 'Add warranty / guarantee info', weight: 2, ok: Boolean(s(ws.warranty)) },
    { label: 'Pick a category', weight: 2, ok: Boolean(s(l.category)) },
    { label: 'Add "best for" tags', weight: 1, ok: arr(l.best_for).length > 0 },
    { label: 'Add industries served', weight: 1, ok: arr(l.industries).length > 0 },
    { label: 'Add pilot / demo details', weight: 1, ok: Boolean(pilot.available) || Boolean(s(pilot.duration) || s(pilot.scope)) },
    { label: 'Add implementation timeline or training info', weight: 1, ok: Boolean(s(impl.typical_timeline) || s(impl.training)) },
  ];

  if (kind === 'product') {
    checks.push(
      { label: 'Add technical specs', weight: 2, ok: Object.keys(obj(l.specs)).length > 0 },
      { label: 'Set buy / rent / lease options', weight: 1, ok: arr(l.availability).length > 0 },
      { label: 'Add a lead time', weight: 1, ok: Boolean(s(l.lead_time)) },
    );
  } else {
    checks.push(
      { label: 'Add service areas', weight: 2, ok: arr(l.service_areas).length > 0 },
      { label: 'Add a response time', weight: 1, ok: Boolean(s(l.response_time)) },
      { label: 'Describe your process (steps)', weight: 1, ok: arr(l.process).length > 0 },
      { label: 'List certifications', weight: 1, ok: arr(l.certifications).length > 0 },
    );
  }

  const total = checks.reduce((t, c) => t + c.weight, 0);
  const earned = checks.reduce((t, c) => t + (c.ok ? c.weight : 0), 0);
  const missing = checks.filter((c) => !c.ok).sort((a, b) => b.weight - a.weight).map((c) => c.label);
  return { percent: Math.round((earned / total) * 100), missing };
}
