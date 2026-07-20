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
}

export interface MatchInput {
  /** category label (e.g. "Forklift maintenance") or id (e.g. "forklift") */
  category?: string;
  /** free-text location, e.g. "El Paso, TX" */
  location?: string;
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

    score = Math.min(100, Math.round(score));
    if (score > 0) out.push({ ...v, score, reasons });
  }
  return out.sort((a, b) => b.score - a.score);
}
