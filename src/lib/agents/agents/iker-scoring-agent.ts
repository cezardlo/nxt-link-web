// src/lib/agents/agents/iker-scoring-agent.ts
// IKER (Innovation Knowledge Entity Rating) Scoring Agent
// Scores kg_companies, kg_technologies, and legacy vendors on a 0–100 scale.
// Updates iker_score in Supabase for each entity.

import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getKgCompanies, type KgCompanyRow } from '@/db/queries/kg-companies';
import { getKgTechnologies, type KgTechnologyRow } from '@/db/queries/kg-technologies';
import { getVendors, type VendorRecord } from '@/db/queries/vendors';

// ─── Types ────────────────────────────────────────────────────────────────────

export type IkerScore = {
  entityId: string;
  entityType: 'company' | 'technology';
  name: string;
  score: number;
  breakdown: {
    signalPresence: number;
    technologyDiversity: number;
    industryReach: number;
    dataCompleteness: number;
    fundingSignal: number;
  };
  previousScore?: number;
  delta?: number;
};

export type IkerScoringResult = {
  companies_scored: number;
  technologies_scored: number;
  scores: IkerScore[];
  duration_ms: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

const HOT_SECTORS = new Set(['defense', 'cybersecurity', 'ai', 'ai/ml', 'ai / ml', 'artificial intelligence']);

function isHotSector(category: string): boolean {
  const lower = category.toLowerCase();
  return Array.from(HOT_SECTORS).some((sector) => lower.includes(sector));
}

// ─── Junction table query helpers ─────────────────────────────────────────────
// These query the many-to-many junction tables directly via Supabase.

async function countCompanyTechnologies(companyIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (companyIds.length === 0 || !isSupabaseConfigured()) return counts;

  const db = getSupabaseClient({ admin: true });
  // Query junction table — returns rows with company_id
  const { data, error } = await db
    .from('kg_company_technologies')
    .select('company_id')
    .in('company_id', companyIds);

  if (error || !data) return counts;

  for (const row of data as Array<{ company_id: string }>) {
    counts.set(row.company_id, (counts.get(row.company_id) ?? 0) + 1);
  }
  return counts;
}

async function countCompanyIndustries(companyIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (companyIds.length === 0 || !isSupabaseConfigured()) return counts;

  const db = getSupabaseClient({ admin: true });
  const { data, error } = await db
    .from('kg_company_industries')
    .select('company_id')
    .in('company_id', companyIds);

  if (error || !data) return counts;

  for (const row of data as Array<{ company_id: string }>) {
    counts.set(row.company_id, (counts.get(row.company_id) ?? 0) + 1);
  }
  return counts;
}

async function countTechnologyCompanies(technologyIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (technologyIds.length === 0 || !isSupabaseConfigured()) return counts;

  const db = getSupabaseClient({ admin: true });
  const { data, error } = await db
    .from('kg_company_technologies')
    .select('technology_id')
    .in('technology_id', technologyIds);

  if (error || !data) return counts;

  for (const row of data as Array<{ technology_id: string }>) {
    counts.set(row.technology_id, (counts.get(row.technology_id) ?? 0) + 1);
  }
  return counts;
}

async function countTechnologyIndustries(technologyIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (technologyIds.length === 0 || !isSupabaseConfigured()) return counts;

  const db = getSupabaseClient({ admin: true });
  const { data, error } = await db
    .from('kg_technology_industries')
    .select('technology_id')
    .in('technology_id', technologyIds);

  if (error || !data) return counts;

  for (const row of data as Array<{ technology_id: string }>) {
    counts.set(row.technology_id, (counts.get(row.technology_id) ?? 0) + 1);
  }
  return counts;
}

async function countRecentSignalsByCompany(companyIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (companyIds.length === 0 || !isSupabaseConfigured()) return counts;

  const db = getSupabaseClient({ admin: true });
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from('kg_signals')
    .select('company_id')
    .in('company_id', companyIds)
    .gte('discovered_at', thirtyDaysAgo)
    .eq('is_active', true);

  if (error || !data) return counts;

  for (const row of data as Array<{ company_id: string }>) {
    if (row.company_id) {
      counts.set(row.company_id, (counts.get(row.company_id) ?? 0) + 1);
    }
  }
  return counts;
}

async function countRecentSignalsByTechnology(technologyIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (technologyIds.length === 0 || !isSupabaseConfigured()) return counts;

  const db = getSupabaseClient({ admin: true });
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from('kg_signals')
    .select('technology_id')
    .in('technology_id', technologyIds)
    .gte('discovered_at', thirtyDaysAgo)
    .eq('is_active', true);

  if (error || !data) return counts;

  for (const row of data as Array<{ technology_id: string }>) {
    if (row.technology_id) {
      counts.set(row.technology_id, (counts.get(row.technology_id) ?? 0) + 1);
    }
  }
  return counts;
}

// ─── Company scoring ──────────────────────────────────────────────────────────

function scoreCompanyFunding(fundingTotalUsd: number | null): number {
  if (!fundingTotalUsd || fundingTotalUsd <= 0) return 0;
  if (fundingTotalUsd > 1_000_000_000) return 25;
  if (fundingTotalUsd > 100_000_000) return 18;
  if (fundingTotalUsd > 10_000_000) return 10;
  return 5;
}

function scoreCompanyDataCompleteness(company: KgCompanyRow): number {
  let score = 0;
  if (company.website) score += 3;
  if (company.founded_year) score += 3;
  if (company.description && company.description.length > 100) score += 4;
  // lat/lon check — companies now have latitude/longitude columns directly
  const hasLat = typeof company.latitude === 'number';
  const hasLon = typeof company.longitude === 'number';
  if (hasLat && hasLon) score += 5;
  return score;
}

function scoreCompany(
  company: KgCompanyRow,
  techCount: number,
  industryCount: number,
  signalCount: number,
): IkerScore {
  const fundingSignal = scoreCompanyFunding(company.total_funding_usd);
  const technologyDiversity = clamp(techCount * 4, 0, 20);
  const signalPresence = clamp(signalCount * 5, 0, 25);
  const industryReach = clamp(industryCount * 3, 0, 15);
  const dataCompleteness = scoreCompanyDataCompleteness(company);

  const total = fundingSignal + technologyDiversity + signalPresence + industryReach + dataCompleteness;
  const previousScore = company.iker_score ?? undefined;

  return {
    entityId: company.id,
    entityType: 'company',
    name: company.name,
    score: clamp(total, 0, 100),
    breakdown: {
      signalPresence,
      technologyDiversity,
      industryReach,
      dataCompleteness,
      fundingSignal,
    },
    previousScore,
    delta: previousScore !== undefined ? clamp(total, 0, 100) - previousScore : undefined,
  };
}

// ─── Technology scoring ───────────────────────────────────────────────────────

const MATURITY_SCORES: Record<string, number> = {
  research: 5,
  emerging: 10,
  early_adoption: 15,
  growth: 20,
  mainstream: 18,
};

function scoreTechnology(
  tech: KgTechnologyRow,
  companyCount: number,
  industryCount: number,
  signalCount: number,
): IkerScore {
  // Signal velocity — use signal count as proxy (signals in last 30 days)
  const signalVelocity = signalCount;
  const signalPresence = clamp(signalVelocity * 10, 0, 30);
  const technologyDiversity = clamp(companyCount * 2, 0, 25); // company adoption
  const industryReach = clamp(industryCount * 5, 0, 25);
  const maturityBonus = MATURITY_SCORES[tech.maturity_stage ?? ''] ?? 0;
  const fundingSignal = clamp(maturityBonus, 0, 20); // maturity stored in funding slot

  const total = signalPresence + technologyDiversity + industryReach + fundingSignal;

  const previousScore = typeof tech.iker_score === 'number' ? tech.iker_score : undefined;

  return {
    entityId: tech.id,
    entityType: 'technology',
    name: tech.name,
    score: clamp(total, 0, 100),
    breakdown: {
      signalPresence,
      technologyDiversity,
      industryReach,
      dataCompleteness: 0, // not applicable for technologies
      fundingSignal, // repurposed: maturity bonus for technologies
    },
    previousScore,
    delta: previousScore !== undefined ? clamp(total, 0, 100) - previousScore : undefined,
  };
}

// ─── Vendor scoring (simplified) ──────────────────────────────────────────────

function scoreVendor(vendor: VendorRecord): IkerScore {
  let score = 20; // base for being in the database

  if (vendor.website) score += 10;
  if (vendor.description && vendor.description.length > 50) score += 10;

  // Evidence: +5 per item, max 25
  const evidenceScore = clamp(vendor.evidence.length * 5, 0, 25);
  score += evidenceScore;

  // Tags: +3 per tag, max 15
  const tagScore = clamp(vendor.tags.length * 3, 0, 15);
  score += tagScore;

  // Hot sector bonus
  if (isHotSector(vendor.category)) score += 20;

  const finalScore = clamp(score, 0, 100);
  const previousScore = vendor.ikerScore;

  return {
    entityId: vendor.id,
    entityType: 'company',
    name: vendor.name,
    score: finalScore,
    breakdown: {
      signalPresence: evidenceScore,
      technologyDiversity: tagScore,
      industryReach: isHotSector(vendor.category) ? 15 : 0,
      dataCompleteness:
        (vendor.website ? 3 : 0) +
        (vendor.description && vendor.description.length > 50 ? 4 : 0) +
        (vendor.lat !== 0 && vendor.lon !== 0 ? 5 : 0),
      fundingSignal: 0,
    },
    previousScore,
    delta: finalScore - previousScore,
  };
}

// ─── Supabase update helpers ──────────────────────────────────────────────────

async function updateCompanyIkerScores(scores: IkerScore[]): Promise<number> {
  if (!isSupabaseConfigured() || scores.length === 0) return 0;

  const db = getSupabaseClient({ admin: true });
  let updated = 0;

  // Batch in chunks of 50
  for (let i = 0; i < scores.length; i += 50) {
    const batch = scores.slice(i, i + 50);

    for (const s of batch) {
      const { error } = await db
        .from('kg_companies')
        .update({ iker_score: s.score, updated_at: new Date().toISOString() })
        .eq('id', s.entityId);

      if (!error) updated++;
    }
  }

  return updated;
}

async function updateTechnologyIkerScores(scores: IkerScore[]): Promise<number> {
  if (!isSupabaseConfigured() || scores.length === 0) return 0;

  const db = getSupabaseClient({ admin: true });
  let updated = 0;

  for (let i = 0; i < scores.length; i += 50) {
    const batch = scores.slice(i, i + 50);

    for (const s of batch) {
      // kg_technologies may not have iker_score column — store in metadata
      const { data: existing } = await db
        .from('kg_technologies')
        .select('metadata')
        .eq('id', s.entityId)
        .maybeSingle();

      const currentMeta = (existing as { metadata: Record<string, unknown> } | null)?.metadata ?? {};
      const mergedMeta = {
        ...currentMeta,
        iker_score: s.score,
        iker_breakdown: s.breakdown,
        iker_updated_at: new Date().toISOString(),
      };

      const { error } = await db
        .from('kg_technologies')
        .update({ metadata: mergedMeta, updated_at: new Date().toISOString() })
        .eq('id', s.entityId);

      if (!error) updated++;
    }
  }

  return updated;
}

async function updateVendorIkerScores(scores: IkerScore[]): Promise<number> {
  if (!isSupabaseConfigured() || scores.length === 0) return 0;

  const db = getSupabaseClient({ admin: true });
  let updated = 0;

  for (let i = 0; i < scores.length; i += 50) {
    const batch = scores.slice(i, i + 50);

    for (const s of batch) {
      const { error } = await db
        .from('vendors')
        .update({ iker_score: s.score })
        .eq('id', s.entityId);

      if (!error) updated++;
    }
  }

  return updated;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function runIkerScoringAgent(): Promise<IkerScoringResult> {
  const start = Date.now();
  const allScores: IkerScore[] = [];

  if (!isSupabaseConfigured()) {
    console.warn('[iker-scoring] Supabase not configured — scoring vendors from local data only');

    const vendorMap = await getVendors();
    const vendorScores = Object.values(vendorMap).map(scoreVendor);
    allScores.push(...vendorScores);

    return {
      companies_scored: 0,
      technologies_scored: 0,
      scores: allScores,
      duration_ms: Date.now() - start,
    };
  }

  // ── 1. Score KG companies ──────────────────────────────────────────────────

  const companies = await getKgCompanies({ limit: 1000 });
  const companyIds = companies.map((c) => c.id);

  // Fetch junction counts in parallel
  const [companyTechCounts, companyIndustryCounts, companySignalCounts] = await Promise.all([
    countCompanyTechnologies(companyIds),
    countCompanyIndustries(companyIds),
    countRecentSignalsByCompany(companyIds),
  ]);

  const companyScores: IkerScore[] = companies.map((company) =>
    scoreCompany(
      company,
      companyTechCounts.get(company.id) ?? 0,
      companyIndustryCounts.get(company.id) ?? 0,
      companySignalCounts.get(company.id) ?? 0,
    ),
  );

  allScores.push(...companyScores);

  // ── 2. Score KG technologies ───────────────────────────────────────────────

  const technologies = await getKgTechnologies({ limit: 1000 });
  const technologyIds = technologies.map((t) => t.id);

  const [techCompanyCounts, techIndustryCounts, techSignalCounts] = await Promise.all([
    countTechnologyCompanies(technologyIds),
    countTechnologyIndustries(technologyIds),
    countRecentSignalsByTechnology(technologyIds),
  ]);

  const techScores: IkerScore[] = technologies.map((tech) =>
    scoreTechnology(
      tech,
      techCompanyCounts.get(tech.id) ?? 0,
      techIndustryCounts.get(tech.id) ?? 0,
      techSignalCounts.get(tech.id) ?? 0,
    ),
  );

  allScores.push(...techScores);

  // ── 3. Score legacy vendors ────────────────────────────────────────────────

  const vendorMap = await getVendors();
  const vendorScores = Object.values(vendorMap).map(scoreVendor);
  allScores.push(...vendorScores);

  // ── 4. Persist scores to Supabase ──────────────────────────────────────────

  const [companiesUpdated, techsUpdated, vendorsUpdated] = await Promise.all([
    updateCompanyIkerScores(companyScores),
    updateTechnologyIkerScores(techScores),
    updateVendorIkerScores(vendorScores),
  ]);

  console.info(
    `[iker-scoring] Scored ${companyScores.length} companies (${companiesUpdated} updated), ` +
    `${techScores.length} technologies (${techsUpdated} updated), ` +
    `${vendorScores.length} vendors (${vendorsUpdated} updated) in ${Date.now() - start}ms`,
  );

  return {
    companies_scored: companyScores.length,
    technologies_scored: techScores.length,
    scores: allScores,
    duration_ms: Date.now() - start,
  };
}
