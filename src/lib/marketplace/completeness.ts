// Listing completeness score — pushes vendors to fill in the fields that make
// listings comparable and rank higher (photos, pricing, warranty, specs…).
// Pure function over the listing row; used by Seller Central (and later,
// search ranking). Plain-language suggestions, most impactful first.

type Loose = Record<string, unknown>;

const s = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Loose => (v && typeof v === 'object' ? (v as Loose) : {});

interface Check { label: string; label_es: string; weight: number; ok: boolean }

export interface Completeness {
  percent: number;         // 0-100
  missing: string[];       // plain suggestions, highest impact first
}

// `lang` defaults to 'en' so the one existing caller (Seller Central listings
// page) keeps its old behavior unless it explicitly asks for Spanish —
// added so the vendor-facing completeness hint isn't stuck in English on an
// otherwise bilingual EN/ES screen.
export function scoreListing(kind: 'product' | 'service', l: Loose, lang: 'en' | 'es' = 'en'): Completeness {
  const pilot = obj(l.pilot); const impl = obj(l.implementation);
  const ws = obj(l.warranty_support); const pricing = obj(l.pricing);

  const checks: Check[] = [
    { label: 'Add at least one photo', label_es: 'Agrega al menos una foto', weight: 3, ok: arr(l.image_paths).length > 0 },
    { label: 'Write a fuller description (a few sentences)', label_es: 'Escribe una descripción más completa (algunas oraciones)', weight: 3, ok: s(l.overview).length >= 60 },
    { label: 'Add pricing (model or range)', label_es: 'Agrega precios (modelo o rango)', weight: 3, ok: Boolean(s(pricing.model) || s(pricing.range) || s(l.pricing_model)) },
    { label: 'Add warranty / guarantee info', label_es: 'Agrega información de garantía', weight: 2, ok: Boolean(s(ws.warranty)) },
    { label: 'Pick a category', label_es: 'Elige una categoría', weight: 2, ok: Boolean(s(l.category)) },
    { label: 'Add "best for" tags', label_es: 'Agrega etiquetas de "ideal para"', weight: 1, ok: arr(l.best_for).length > 0 },
    { label: 'Add industries served', label_es: 'Agrega las industrias que atiendes', weight: 1, ok: arr(l.industries).length > 0 },
    { label: 'Add pilot / demo details', label_es: 'Agrega detalles de piloto / demo', weight: 1, ok: Boolean(pilot.available) || Boolean(s(pilot.duration) || s(pilot.scope)) },
    { label: 'Add implementation timeline or training info', label_es: 'Agrega el plazo de implementación o información de capacitación', weight: 1, ok: Boolean(s(impl.typical_timeline) || s(impl.training)) },
  ];

  if (kind === 'product') {
    checks.push(
      { label: 'Add technical specs', label_es: 'Agrega especificaciones técnicas', weight: 2, ok: Object.keys(obj(l.specs)).length > 0 },
      { label: 'Set buy / rent / lease options', label_es: 'Define opciones de compra / renta / arrendamiento', weight: 1, ok: arr(l.availability).length > 0 },
      { label: 'Add a lead time', label_es: 'Agrega un plazo de entrega', weight: 1, ok: Boolean(s(l.lead_time)) },
    );
  } else {
    checks.push(
      { label: 'Add service areas', label_es: 'Agrega áreas de servicio', weight: 2, ok: arr(l.service_areas).length > 0 },
      { label: 'Add a response time', label_es: 'Agrega un tiempo de respuesta', weight: 1, ok: Boolean(s(l.response_time)) },
      { label: 'Describe your process (steps)', label_es: 'Describe tu proceso (pasos)', weight: 1, ok: arr(l.process).length > 0 },
      { label: 'List certifications', label_es: 'Enumera certificaciones', weight: 1, ok: arr(l.certifications).length > 0 },
    );
  }

  const total = checks.reduce((t, c) => t + c.weight, 0);
  const earned = checks.reduce((t, c) => t + (c.ok ? c.weight : 0), 0);
  const missing = checks.filter((c) => !c.ok).sort((a, b) => b.weight - a.weight).map((c) => (lang === 'es' ? c.label_es : c.label));
  return { percent: Math.round((earned / total) * 100), missing };
}
