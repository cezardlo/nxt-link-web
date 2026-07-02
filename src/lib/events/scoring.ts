// Deterministic scoring + matching for the Conference & Event Strategy
// platform. Pure functions — no I/O — so they are unit-testable and the
// behavior is explainable to admins ("why is this vendor on the list?").

import type {
  EventOrganization,
  Priority,
  TargetCompany,
  VendorForMatching,
} from './types';

export type ScoringView = 'customers' | 'vendors' | 'global_trends' | 'cross_border';

const VIEW_FIELD: Record<ScoringView, keyof EventOrganization> = {
  customers: 'score_customers',
  vendors: 'score_vendors',
  global_trends: 'score_global_trends',
  cross_border: 'score_cross_border',
};

const PRIORITY_WEIGHT: Record<Priority, number> = { high: 2, medium: 1, low: 0 };

export function priorityWeight(priority: Priority): number {
  return PRIORITY_WEIGHT[priority] ?? 0;
}

/**
 * Rank events for one scoring view: score desc (unscored last), then
 * priority (high first), then name asc so the order is stable.
 */
export function rankEvents(events: EventOrganization[], view: ScoringView): EventOrganization[] {
  const field = VIEW_FIELD[view];
  return [...events].sort((a, b) => {
    const sa = a[field] as number | null;
    const sb = b[field] as number | null;
    if (sa != null && sb != null && sa !== sb) return sb - sa;
    if ((sa != null) !== (sb != null)) return sa != null ? -1 : 1;
    const pw = priorityWeight(b.priority) - priorityWeight(a.priority);
    if (pw !== 0) return pw;
    return a.name.localeCompare(b.name);
  });
}

/** Lowercase + strip accents so "Juárez" matches "Juarez". */
export function normalize(text: string | null | undefined): string {
  return (text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function overlaps(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

const BORDER_MARKERS = ['el paso', 'juarez', 'chihuahua', 'border', 'borderplex', 'texas', 'mexico'];

function sharesRegion(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return BORDER_MARKERS.some((m) => na.includes(m) && nb.includes(m));
}

export interface MatchResult {
  score: number;
  reasons: string[];
}

/**
 * Score how well a vendor fits a target company. Weights:
 *   +3 per pain-point the vendor solves (capped at 9)
 *   +2 when the company's segment is one of the vendor's target company types
 *   +1 for shared region (El Paso / Juárez / border markers)
 *   +1 when the vendor states demo capability (events want demos)
 *   +1 when the vendor articulates a worker-support value proposition
 */
export function matchVendorToCompany(vendor: VendorForMatching, company: TargetCompany): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  const solved = (vendor.pain_points_solved ?? []).map(normalize);
  const pains = (company.pain_points ?? []).map(normalize);
  let painHits = 0;
  for (const pain of pains) {
    if (solved.some((s) => overlaps(s, pain))) {
      painHits += 1;
      if (painHits <= 3) reasons.push(`solves pain point: ${pain}`);
    }
  }
  score += Math.min(painHits, 3) * 3;

  const targets = (vendor.target_company_types ?? []).map(normalize);
  if (targets.some((t) => overlaps(t, normalize(company.segment)))) {
    score += 2;
    reasons.push(`targets ${company.segment} companies`);
  }

  if (sharesRegion(vendor.region, company.location)) {
    score += 1;
    reasons.push('serves the same region');
  }

  if (vendor.demo_capabilities && vendor.demo_capabilities.trim()) {
    score += 1;
    reasons.push('can demo');
  }

  if (vendor.worker_support_value && vendor.worker_support_value.trim()) {
    score += 1;
    reasons.push('worker-support value proposition');
  }

  return { score, reasons };
}

/**
 * Score how well a vendor fits an event: industry overlap with the vendor's
 * conference interests / technology category, plus region and demo readiness.
 */
export function matchVendorToEvent(vendor: VendorForMatching, event: EventOrganization): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  const industries = (event.industries ?? []).map(normalize);
  const interests = [
    ...(vendor.conference_interests ?? []),
    vendor.technology_category ?? '',
    vendor.category ?? '',
  ]
    .map(normalize)
    .filter(Boolean);

  let hits = 0;
  for (const industry of industries) {
    if (interests.some((i) => overlaps(i, industry))) {
      hits += 1;
      if (hits <= 3) reasons.push(`industry fit: ${industry}`);
    }
  }
  score += Math.min(hits, 3) * 2;

  if (sharesRegion(vendor.region, event.location)) {
    score += 1;
    reasons.push('event is in the vendor’s region');
  }

  if (vendor.demo_capabilities && vendor.demo_capabilities.trim()) {
    score += 1;
    reasons.push('can demo');
  }

  if (normalize(vendor.participation_preference).includes('sponsor')) {
    score += 1;
    reasons.push('open to sponsoring');
  }

  return { score, reasons };
}

export interface RankedMatch<T> {
  item: T;
  score: number;
  reasons: string[];
}

/** Rank vendors for a company, best first; zero-score matches are dropped. */
export function rankVendorsForCompany(
  vendors: VendorForMatching[],
  company: TargetCompany,
): RankedMatch<VendorForMatching>[] {
  return vendors
    .map((vendor) => ({ item: vendor, ...matchVendorToCompany(vendor, company) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.item.company_name.localeCompare(b.item.company_name));
}

/** Rank vendors for an event, best first; zero-score matches are dropped. */
export function rankVendorsForEvent(
  vendors: VendorForMatching[],
  event: EventOrganization,
): RankedMatch<VendorForMatching>[] {
  return vendors
    .map((vendor) => ({ item: vendor, ...matchVendorToEvent(vendor, event) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.item.company_name.localeCompare(b.item.company_name));
}
