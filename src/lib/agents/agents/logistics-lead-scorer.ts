// src/lib/agents/agents/logistics-lead-scorer.ts
// Logistics Lead Scorer — computes trucking/logistics-specific lead scores (0-100)
// for enriched vendors discovered through conferences.
// Zero LLM tokens — pure rule-based scoring.

import { getDb, isSupabaseConfigured } from '@/db/client';
import type { EnrichedVendorRow } from '@/db/queries/exhibitors';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type LeadTier = 'hot' | 'warm' | 'watch' | 'low';

export type ConferenceLead = {
  id: string;
  vendor_id: string;
  canonical_name: string;
  logistics_score: number;
  lead_tier: LeadTier;
  logistics_category: string;
  products: string[];
  technologies: string[];
  official_domain: string;
  description: string;
  conference_appearances: number;
  conference_names: string[];
  employee_estimate: string;
  country: string;
  el_paso_relevant: boolean;
  score_breakdown: ScoreBreakdown;
};

export type ScoreBreakdown = {
  product_alignment: number;    // 0-40
  conference_presence: number;  // 0-20
  tech_relevance: number;       // 0-15
  company_maturity: number;     // 0-10
  geo_proximity: number;        // 0-15
  signals: string[];
};

export type LeadScoringReport = {
  vendors_scored: number;
  leads_created: number;
  tier_counts: Record<LeadTier, number>;
  avg_score: number;
  duration_ms: number;
};

// ─── Scoring Keywords ───────────────────────────────────────────────────────────

const PRODUCT_LOGISTICS_KEYWORDS: Record<string, number> = {
  // Core trucking (8 pts each)
  'tms': 8, 'transportation management': 8, 'freight brokerage': 8,
  'load board': 8, 'dispatch': 8, 'fleet management': 8,
  'truck': 8, 'trucking': 8, 'truckload': 8, 'ltl': 8, 'ftl': 8,
  'drayage': 8, 'intermodal': 8, 'flatbed': 8, 'reefer': 8,
  // Telematics & compliance (6 pts each)
  'eld': 6, 'electronic logging': 6, 'telematics': 6,
  'gps tracking': 6, 'fleet tracking': 6, 'dashcam': 6,
  'hours of service': 6, 'hos': 6, 'fmcsa': 6, 'dot compliance': 6,
  // Logistics operations (5 pts each)
  'freight': 5, 'shipping': 5, 'carrier': 5, 'shipper': 5,
  'broker': 5, 'rate management': 5, 'freight audit': 5,
  '3pl': 5, 'warehouse': 5, 'wms': 5, 'fulfillment': 5,
  'last mile': 5, 'delivery': 5, 'route optimization': 5,
  // Cross-border (5 pts each)
  'cross-border': 5, 'customs': 5, 'customs brokerage': 5,
  'nearshoring': 5, 'mexico': 5, 'maquiladora': 5,
  // Supply chain (3 pts each)
  'supply chain': 3, 'logistics': 3, 'distribution': 3,
  'inventory': 3, 'procurement': 3, 'cargo': 3,
  'cold chain': 3, 'temperature': 3, 'hazmat': 3,
};

const TECH_RELEVANCE_KEYWORDS: Record<string, number> = {
  'gps': 4, 'telematics': 4, 'iot': 4, 'sensor': 3,
  'ai routing': 5, 'route optimization': 5, 'machine learning': 3,
  'predictive': 3, 'real-time tracking': 4, 'visibility': 3,
  'blockchain': 2, 'smart contract': 2, 'freight matching': 4,
  'autonomous': 3, 'self-driving': 3, 'platooning': 4,
  'ev': 2, 'electric vehicle': 2, 'electric truck': 4,
  'api': 2, 'integration': 2, 'edi': 3,
  'computer vision': 3, 'ocr': 2, 'document': 2,
};

const TIER1_CONFERENCES = new Set([
  'mats', 'mid-america trucking show',
  'tmc', 'tmc annual meeting',
  'modex', 'promat',
  'cscmp edge', 'manifest',
  'gats', 'great american trucking show',
  'freightwaves', 'freightwaves live',
  'intermodal expo',
  'iana intermodal expo',
  'truckworld',
  'walcott truckers jamboree',
]);

const EP_RELEVANCE_KEYWORDS = [
  'el paso', 'juarez', 'ciudad juarez', 'las cruces',
  'texas', 'border', 'cross-border', 'mexico',
  'nearshoring', 'maquiladora', 'laredo', 'mcallen',
  'brownsville', 'eagle pass', 'del rio', 'nogales',
  'san antonio', 'dallas', 'houston', 'austin',
  'chihuahua', 'monterrey', 'nuevo leon',
  'customs', 'cbp', 'usmca', 'nafta',
];

// ─── Logistics Category Classifier ─────────────────────────────────────────────

const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  { category: 'TMS', keywords: ['tms', 'transportation management system', 'freight management'] },
  { category: 'Fleet Management', keywords: ['fleet management', 'fleet tracking', 'fleet operations'] },
  { category: 'Freight Brokerage', keywords: ['freight brokerage', 'freight broker', 'load board', 'freight matching'] },
  { category: 'Warehouse/WMS', keywords: ['warehouse', 'wms', 'warehouse management', 'fulfillment center'] },
  { category: 'Telematics/ELD', keywords: ['telematics', 'eld', 'electronic logging', 'gps tracking', 'dashcam'] },
  { category: 'Cold Chain', keywords: ['cold chain', 'refrigerated', 'reefer', 'temperature controlled'] },
  { category: 'Last Mile', keywords: ['last mile', 'final mile', 'delivery management', 'route optimization'] },
  { category: 'Cross-Border/Customs', keywords: ['cross-border', 'customs', 'customs brokerage', 'nearshoring', 'maquiladora'] },
  { category: 'Material Handling', keywords: ['material handling', 'forklift', 'conveyor', 'palletizing'] },
  { category: 'Autonomous/Robotics', keywords: ['autonomous', 'self-driving', 'robotics', 'automated guided', 'agv'] },
  { category: 'General Logistics Tech', keywords: ['logistics', 'supply chain', 'freight', 'shipping', 'carrier'] },
];

function classifyLogisticsCategory(products: string[], description: string, technologies: string[]): string {
  const text = [...products, description, ...technologies].join(' ').toLowerCase();

  let bestCategory = 'Not Logistics';
  let bestScore = 0;

  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (text.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = rule.category;
    }
  }

  return bestScore > 0 ? bestCategory : 'Not Logistics';
}

// ─── Scoring Functions ──────────────────────────────────────────────────────────

function scoreProductAlignment(products: string[], description: string): { score: number; signals: string[] } {
  const text = [...products, description].join(' ').toLowerCase();
  let score = 0;
  const signals: string[] = [];
  const matched = new Set<string>();

  for (const [keyword, points] of Object.entries(PRODUCT_LOGISTICS_KEYWORDS)) {
    if (text.includes(keyword) && !matched.has(keyword)) {
      score += points;
      matched.add(keyword);
    }
  }

  score = Math.min(40, score);
  if (score >= 30) signals.push('Strong logistics product alignment');
  else if (score >= 15) signals.push('Moderate logistics product fit');
  else if (score > 0) signals.push('Some logistics relevance');

  return { score, signals };
}

function scoreConferencePresence(
  conferenceNames: string[],
  appearances: number,
): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];

  // Base presence score
  if (appearances >= 5) { score += 12; signals.push(`${appearances} conference appearances`); }
  else if (appearances >= 3) { score += 8; signals.push(`${appearances} conference appearances`); }
  else if (appearances >= 2) { score += 5; signals.push(`${appearances} conference appearances`); }
  else if (appearances >= 1) { score += 2; }

  // Tier-1 conference bonus
  const tier1Count = conferenceNames.filter((n) =>
    TIER1_CONFERENCES.has(n.toLowerCase()),
  ).length;
  if (tier1Count > 0) {
    score += Math.min(8, tier1Count * 4);
    signals.push(`${tier1Count} tier-1 conference(s)`);
  }

  return { score: Math.min(20, score), signals };
}

function scoreTechRelevance(technologies: string[], products: string[]): { score: number; signals: string[] } {
  const text = [...technologies, ...products].join(' ').toLowerCase();
  let score = 0;
  const signals: string[] = [];

  for (const [keyword, points] of Object.entries(TECH_RELEVANCE_KEYWORDS)) {
    if (text.includes(keyword)) score += points;
  }

  score = Math.min(15, score);
  if (score >= 10) signals.push('High-value logistics technology');
  else if (score >= 5) signals.push('Relevant technology stack');

  return { score, signals };
}

function scoreCompanyMaturity(employeeEstimate: string, vendorType: string): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];

  // Employee size
  if (/10000|\d{5,}|enterprise/i.test(employeeEstimate)) {
    score += 5; signals.push('Enterprise-scale');
  } else if (/1000|\d{4}/i.test(employeeEstimate)) {
    score += 4; signals.push('Large company');
  } else if (/[2-9]00|500/i.test(employeeEstimate)) {
    score += 3;
  } else if (/[5-9]0|1[0-9]{2}/i.test(employeeEstimate)) {
    score += 2;
  }

  // Vendor type bonus
  if (vendorType === 'enterprise' || vendorType === 'manufacturer') {
    score += 3;
  } else if (vendorType === 'software' || vendorType === 'services') {
    score += 2;
  } else if (vendorType === 'startup') {
    score += 1; signals.push('Startup (emerging)');
  }

  return { score: Math.min(10, score), signals };
}

function scoreGeoProximity(country: string, description: string, products: string[]): { score: number; signals: string[]; elPasoRelevant: boolean } {
  const text = [country, description, ...products].join(' ').toLowerCase();
  let score = 0;
  const signals: string[] = [];
  let elPasoRelevant = false;

  for (const kw of EP_RELEVANCE_KEYWORDS) {
    if (text.includes(kw)) score += 3;
  }

  if (text.includes('el paso') || text.includes('juarez') || text.includes('ciudad juarez')) {
    score += 5;
    elPasoRelevant = true;
    signals.push('El Paso / Juárez corridor');
  } else if (text.includes('texas') || text.includes('border')) {
    elPasoRelevant = true;
    signals.push('Texas / border region');
  }

  score = Math.min(15, score);
  if (score >= 8 && !signals.length) signals.push('Strong geographic alignment');

  return { score, signals, elPasoRelevant };
}

// ─── Main Scorer ────────────────────────────────────────────────────────────────

export async function runLogisticsLeadScorer(): Promise<LeadScoringReport> {
  const start = Date.now();

  if (!isSupabaseConfigured()) {
    return { vendors_scored: 0, leads_created: 0, tier_counts: { hot: 0, warm: 0, watch: 0, low: 0 }, avg_score: 0, duration_ms: 0 };
  }

  const db = getDb({ admin: true });

  // Fetch all enriched vendors
  const { data: vendors } = await db
    .from('enriched_vendors')
    .select('*')
    .order('canonical_name');

  if (!vendors || vendors.length === 0) {
    return { vendors_scored: 0, leads_created: 0, tier_counts: { hot: 0, warm: 0, watch: 0, low: 0 }, avg_score: 0, duration_ms: Date.now() - start };
  }

  // Count conference appearances from exhibitors table
  const { data: exhibitors } = await db
    .from('exhibitors')
    .select('normalized_name, conference_id, conference_name');

  const confMap = new Map<string, { ids: Set<string>; names: Set<string> }>();
  if (exhibitors) {
    for (const e of exhibitors as Array<{ normalized_name: string; conference_id: string; conference_name: string }>) {
      const key = e.normalized_name.toLowerCase();
      if (!confMap.has(key)) confMap.set(key, { ids: new Set(), names: new Set() });
      const entry = confMap.get(key)!;
      entry.ids.add(e.conference_id);
      entry.names.add(e.conference_name);
    }
  }

  // Score each vendor
  const leads: ConferenceLead[] = [];
  const tierCounts: Record<LeadTier, number> = { hot: 0, warm: 0, watch: 0, low: 0 };

  for (const v of vendors as EnrichedVendorRow[]) {
    const key = v.canonical_name.toLowerCase();
    const confEntry = confMap.get(key);
    const appearances = confEntry?.ids.size ?? (v.conference_sources?.length ?? 0);
    const confNames = confEntry ? Array.from(confEntry.names) : (v.conference_sources ?? []);

    // Score each dimension
    const product = scoreProductAlignment(v.products ?? [], v.description ?? '');
    const conference = scoreConferencePresence(confNames, appearances);
    const tech = scoreTechRelevance(v.technologies ?? [], v.products ?? []);
    const maturity = scoreCompanyMaturity(v.employee_estimate ?? '', v.vendor_type ?? '');
    const geo = scoreGeoProximity(v.country ?? '', v.description ?? '', v.products ?? []);

    const totalScore = product.score + conference.score + tech.score + maturity.score + geo.score;
    const clampedScore = Math.min(100, Math.max(0, totalScore));

    // Determine tier
    let tier: LeadTier;
    if (clampedScore >= 80) tier = 'hot';
    else if (clampedScore >= 50) tier = 'warm';
    else if (clampedScore >= 30) tier = 'watch';
    else tier = 'low';

    // Classify logistics category
    const logisticsCategory = classifyLogisticsCategory(
      v.products ?? [],
      v.description ?? '',
      v.technologies ?? [],
    );

    const lead: ConferenceLead = {
      id: `lead-${v.id}`,
      vendor_id: v.id,
      canonical_name: v.canonical_name,
      logistics_score: clampedScore,
      lead_tier: tier,
      logistics_category: logisticsCategory,
      products: v.products ?? [],
      technologies: v.technologies ?? [],
      official_domain: v.official_domain ?? '',
      description: v.description ?? '',
      conference_appearances: appearances,
      conference_names: confNames,
      employee_estimate: v.employee_estimate ?? '',
      country: v.country ?? '',
      el_paso_relevant: geo.elPasoRelevant,
      score_breakdown: {
        product_alignment: product.score,
        conference_presence: conference.score,
        tech_relevance: tech.score,
        company_maturity: maturity.score,
        geo_proximity: geo.score,
        signals: [
          ...product.signals,
          ...conference.signals,
          ...tech.signals,
          ...maturity.signals,
          ...geo.signals,
        ],
      },
    };

    leads.push(lead);
    tierCounts[tier]++;
  }

  // Persist leads to conference_leads table
  const inserts = leads.map((l) => ({
    id: l.id,
    vendor_id: l.vendor_id,
    canonical_name: l.canonical_name,
    logistics_score: l.logistics_score,
    lead_tier: l.lead_tier,
    logistics_category: l.logistics_category,
    products: l.products,
    technologies: l.technologies,
    official_domain: l.official_domain,
    description: l.description,
    conference_appearances: l.conference_appearances,
    conference_names: l.conference_names,
    employee_estimate: l.employee_estimate,
    country: l.country,
    el_paso_relevant: l.el_paso_relevant,
    last_scored_at: new Date().toISOString(),
  }));

  for (let i = 0; i < inserts.length; i += 100) {
    const batch = inserts.slice(i, i + 100);
    const { error } = await db.from('conference_leads').upsert(batch, {
      onConflict: 'id',
      ignoreDuplicates: false,
    });
    if (error) {
      console.warn('[logistics-lead-scorer] upsert error:', error.message);
    }
  }

  const avgScore = leads.length > 0
    ? Math.round(leads.reduce((sum, l) => sum + l.logistics_score, 0) / leads.length)
    : 0;

  return {
    vendors_scored: vendors.length,
    leads_created: leads.length,
    tier_counts: tierCounts,
    avg_score: avgScore,
    duration_ms: Date.now() - start,
  };
}
