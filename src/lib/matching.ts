// Vendor matching — score registered companies against a client request by
// category and service area. Pure functions (no I/O) so they're easy to test
// and reuse from any route. The "we find who can solve it" core.

export interface MatchableVendor {
  id: string;
  company_name: string;
  email?: string | null;
  categories?: string[] | null;
  service_areas?: string[] | null;
  status?: string | null;
  brochure_count?: number;
  /** Industries this vendor serves (vendor_profiles.industries). Optional —
   * a caller that never populates this (or never populates
   * MatchInput.buyerIndustries) gets scoring byte-identical to before this
   * field existed (buyer progressive-enrichment slice, 2026-07-30). */
  industries?: string[] | null;
  /** Certification NAMES this vendor holds (vendor_certifications.name).
   * Optional, same byte-identical guarantee as `industries` above. */
  certifications?: string[] | null;
}

export interface MatchInput {
  /** category label (e.g. "Forklift maintenance") or id (e.g. "forklift") */
  category?: string;
  /** free-text location, e.g. "El Paso, TX" */
  location?: string;
  /** Buyer's industry/industries — e.g. buyer_profiles.industry split on
   * comma by the caller (that column stores up to 3 as "A, B, C"). Optional:
   * omit it and scoring is IDENTICAL to before this field existed. Real
   * overlap only — this never fabricates a signal (honest matching
   * consumption, 2026-07-30: workplace/plans/matching-and-onboarding-2026-07-30.md). */
  buyerIndustries?: string[];
  /** Certification names the buyer's request asks for (e.g. a caller-supplied
   * structured_specs.certifications, when populated). Optional, same
   * byte-identical guarantee as buyerIndustries. */
  requestedCertifications?: string[];
}

/** buyer_profiles.industry stores up to 3 buyer-picked industries as a single
 * comma-separated text column (v1 — no migration; see triage note in
 * workplace/plans/matching-and-onboarding-2026-07-30.md item 4). One place to
 * parse it back into a list so the enrichment card, /buyer/profile, and the
 * matching dispatch path can never drift on the format. */
export function splitIndustryList(raw: string | null | undefined, max = 3): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const v = part.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

/** First real overlap between two short-string lists (case/punctuation
 * insensitive, exact match OR substring OR token-overlap) — used for the
 * honest industry/certification boosts below. Returns the vendor-side label
 * that matched (for an honest reason chip), or null when nothing overlaps.
 * Never invents a match. */
function firstOverlap(wanted: string[], have: string[]): string | null {
  for (const w of wanted) {
    const nw = norm(w);
    if (!nw) continue;
    for (const h of have) {
      const nh = norm(h);
      if (!nh) continue;
      if (nh === nw || nh.includes(nw) || nw.includes(nh) || overlap(w, h) >= 0.5) return h;
    }
  }
  return null;
}

export interface ScoredVendor extends MatchableVendor {
  score: number;       // 0–100
  reasons: string[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Token overlap ratio between two short strings (0–1). */
function overlap(a: string, b: string): number {
  const ta = new Set(norm(a).split(' ').filter(Boolean));
  const tb = new Set(norm(b).split(' ').filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let hit = 0;
  ta.forEach((t) => { if (tb.has(t)) hit++; });
  return hit / Math.min(ta.size, tb.size);
}

function categoryScore(input: string, vendorCats: string[]): { score: number; label?: string } {
  const want = norm(input);
  let best = 0; let label: string | undefined;
  for (const c of vendorCats) {
    const nc = norm(c);
    let s = 0;
    if (nc === want) s = 1;
    else if (nc.includes(want) || want.includes(nc)) s = 0.85;
    else s = overlap(input, c);
    if (s > best) { best = s; label = c; }
  }
  return { score: best, label };
}

function areaScore(location: string, areas: string[]): { score: number; label?: string } {
  if (!location || !areas?.length) return { score: 0 };
  const loc = norm(location);
  let best = 0; let label: string | undefined;
  for (const a of areas) {
    const na = norm(a);
    let s = 0;
    if (na === 'national' || na === 'nacional') s = Math.max(s, 0.7);
    if (loc.includes(na) || na.includes(loc)) s = 1;
    else s = Math.max(s, overlap(location, a));
    if (s > best) { best = s; label = a; }
  }
  return { score: best, label };
}

/**
 * Rank vendors for a request. Category is weighted most (it's the hard
 * requirement); service area and a small "ready to engage" bonus refine order.
 */
export function scoreVendors(input: MatchInput, vendors: MatchableVendor[]): ScoredVendor[] {
  const out: ScoredVendor[] = [];
  for (const v of vendors) {
    const reasons: string[] = [];
    let score = 0;

    if (input.category && v.categories?.length) {
      const cat = categoryScore(input.category, v.categories);
      if (cat.score > 0) {
        score += cat.score * 62;
        if (cat.score >= 0.85) reasons.push(`Provides ${cat.label}`);
        else if (cat.score > 0) reasons.push(`Related to ${cat.label}`);
      }
    } else if (!input.category) {
      score += 20; // no category filter → everyone is a candidate
    }

    if (input.location && v.service_areas?.length) {
      const area = areaScore(input.location, v.service_areas);
      if (area.score > 0) {
        score += area.score * 28;
        reasons.push(area.label === 'National' || area.label === 'Nacional' ? 'Serves nationally' : `Covers ${area.label}`);
      }
    }

    if ((v.status || '').toLowerCase() === 'approved') { score += 8; reasons.push('Approved vendor'); }
    if ((v.brochure_count || 0) > 0) { score += 2; }

    // Honest matching consumption (2026-07-30 buyer-enrichment slice): the
    // two boosts Cesar's own matching-strategy spec named as viable TODAY
    // (industry +10, requested certification +5) — the other two he listed
    // (verified badge, high response rate) were deferred by the coordinator
    // triage as dishonest/no-op right now (see workplace/plans/matching-
    // and-onboarding-2026-07-30.md). Both are no-ops unless BOTH sides
    // supplied real data — omitting either input keeps scoring identical to
    // before this slice existed.
    if (input.buyerIndustries?.length && v.industries?.length) {
      const hit = firstOverlap(input.buyerIndustries, v.industries);
      if (hit) { score += 10; reasons.push(`Serves your industry (${hit})`); }
    }
    if (input.requestedCertifications?.length && v.certifications?.length) {
      const hit = firstOverlap(input.requestedCertifications, v.certifications);
      if (hit) { score += 5; reasons.push(`Has requested certification (${hit})`); }
    }

    score = Math.min(100, Math.round(score));
    if (score > 0) out.push({ ...v, score, reasons });
  }
  return out.sort((a, b) => b.score - a.score);
}
