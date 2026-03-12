// src/lib/agents/persist/signal-persister.ts
// Persistence layer: takes agent discovery results and writes them to
// the kg_ knowledge-graph tables and raw_feed_items in Supabase.

import { getDb, isSupabaseConfigured } from '@/db/client';
import { persistRawFeedItems, type RawFeedItemInput } from './feed-persister';

import type { PatentSignal, PatentDiscoveryResult } from '@/lib/agents/agents/patent-discovery-agent';
import type { StartupSignal, StartupDiscoveryResult } from '@/lib/agents/agents/startup-discovery-agent';
import type { ResearchSignal, ResearchDiscoveryResult } from '@/lib/agents/agents/research-discovery-agent';
import type { SupplyChainSignal, SupplyChainResult } from '@/lib/agents/agents/supply-chain-agent';
import type { DisruptionSignal, DisruptionMonitorResult, DisruptionPriority } from '@/lib/agents/agents/disruption-monitor-agent';
import type { IntelSignal, IntelDiscoveryStore } from '@/lib/agents/agents/intel-discovery-agent';

// ── Table Row Types ────────────────────────────────────────────────────────────

type KgSignalType =
  | 'breakthrough'
  | 'investment'
  | 'policy'
  | 'disruption'
  | 'startup_formation'
  | 'manufacturing_expansion'
  | 'supply_chain_risk'
  | 'regulatory_change'
;

type KgSignalInsert = {
  title: string;
  description: string | null;
  signal_type: KgSignalType;
  priority: DisruptionPriority | null;
  source_url: string | null;
  source_name: string | null;
  detected_at: string;
  is_active: boolean;
};

type KgCompanyInsert = {
  name: string;
  slug: string;
  description: string | null;
  company_type: 'startup' | 'enterprise' | 'research_lab' | 'university' | 'government' | 'ngo';
  total_funding_usd: number | null;
  website: string | null;
};

type KgDiscoveryInsert = {
  title: string;
  summary: string | null;
  discovery_type: 'scientific' | 'medical' | 'technology' | 'engineering' | 'materials' | 'energy' | 'space' | 'biological' | 'pharmaceutical';
  source_url: string | null;
  source_name: string | null;
  research_institution: string | null;
  published_at: string | null;
};

type PersistCounts = {
  kg_signals: number;
  kg_companies: number;
  kg_discoveries: number;
  raw_feed_items: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 100;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

/**
 * Map a patent filing type to the kg_signals signal_type enum.
 */
function patentFilingToSignalType(
  filingType: PatentSignal['filingType'],
): KgSignalType {
  switch (filingType) {
    case 'grant':
    case 'filing':
    case 'application':
      return 'breakthrough';
    case 'litigation':
      return 'policy';
    case 'transfer':
      return 'investment';
    default:
      return 'breakthrough';
  }
}

/**
 * Map a startup funding stage to the kg_signals signal_type enum.
 */
function startupStageToSignalType(
  stage: StartupSignal['fundingStage'],
): KgSignalType {
  switch (stage) {
    case 'ipo':
    case 'acquisition':
      return 'investment';
    case 'pre-seed':
    case 'seed':
      return 'startup_formation';
    default:
      return 'investment';
  }
}

/**
 * Map a research type to the best-fitting kg_discoveries discovery_type.
 */
function researchTypeToDiscoveryType(
  researchType: ResearchSignal['researchType'],
  field: string,
): KgDiscoveryInsert['discovery_type'] {
  if (researchType === 'clinical_trial') return 'medical';
  if (field === 'biotech') return 'biological';
  if (field === 'materials') return 'materials';
  if (field === 'energy' || field === 'fusion') return 'energy';
  if (field === 'space') return 'space';
  if (field === 'ai-ml' || field === 'quantum' || field === 'semiconductor') return 'technology';
  if (field === 'robotics') return 'engineering';
  return 'scientific';
}

/**
 * Map disruption category to kg_signals signal_type.
 */
function disruptionCategoryToSignalType(
  category: DisruptionSignal['disruptionCategory'],
): KgSignalType {
  switch (category) {
    case 'geopolitical':
    case 'conflict':
      return 'disruption';
    case 'regulatory_shock':
      return 'regulatory_change';
    case 'market_crash':
    case 'pandemic':
    case 'natural_disaster':
    case 'infrastructure':
    case 'cyber_attack':
      return 'disruption';
    default:
      return 'disruption';
  }
}

/**
 * Map supply-chain disruption type to kg_signals signal_type.
 */
function supplyChainTypeToSignalType(
  disruptionType: SupplyChainSignal['disruptionType'],
): KgSignalType {
  if (disruptionType === 'expansion') return 'manufacturing_expansion';
  if (disruptionType === 'sanction' || disruptionType === 'tariff') return 'policy';
  return 'supply_chain_risk';
}

/**
 * Map supply-chain severity to a P0-P3 priority.
 */
function severityToPriority(severity: SupplyChainSignal['severity']): DisruptionPriority {
  switch (severity) {
    case 'critical': return 'P0';
    case 'high': return 'P1';
    case 'moderate': return 'P2';
    case 'low': return 'P3';
    default: return 'P3';
  }
}

async function batchUpsertSignals(rows: KgSignalInsert[]): Promise<number> {
  if (rows.length === 0) return 0;
  const db = getDb({ admin: true });
  let persisted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error, data } = await db
      .from('kg_signals')
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: true })
      .select('id');

    if (error) {
      // kg_signals has no natural unique constraint beyond id (which is auto-uuid),
      // so fall back to plain insert when upsert fails.
      const { error: insertErr } = await db.from('kg_signals').insert(batch);
      if (insertErr) {
        console.warn('[signal-persister] kg_signals insert error:', insertErr.message);
      } else {
        persisted += batch.length;
      }
    } else {
      persisted += data?.length ?? batch.length;
    }
  }

  return persisted;
}

// ── Patent Signals ─────────────────────────────────────────────────────────────

export async function persistPatentSignals(
  result: PatentDiscoveryResult,
): Promise<PersistCounts> {
  const counts: PersistCounts = { kg_signals: 0, kg_companies: 0, kg_discoveries: 0, raw_feed_items: 0 };
  if (!isSupabaseConfigured() || result.signals.length === 0) return counts;

  // 1. kg_signals
  const signalRows: KgSignalInsert[] = result.signals.map((s) => ({
    title: s.title,
    description: [s.filingType, s.industry, s.patentId, s.company].filter(Boolean).join(' | '),
    signal_type: patentFilingToSignalType(s.filingType),
    priority: s.confidence >= 0.85 ? 'P1' as const : 'P2' as const,
    source_url: s.url || null,
    source_name: s.source || null,
    detected_at: s.discoveredAt,
    is_active: true,
  }));
  counts.kg_signals = await batchUpsertSignals(signalRows);

  // 2. raw_feed_items
  const feedItems: RawFeedItemInput[] = result.signals.map((s) => ({
    title: s.title,
    url: s.url,
    source: s.source,
    source_type: 'patent' as const,
    published_at: s.discoveredAt,
  }));
  counts.raw_feed_items = await persistRawFeedItems(feedItems);

  return counts;
}

// ── Startup Signals ────────────────────────────────────────────────────────────

export async function persistStartupSignals(
  result: StartupDiscoveryResult,
): Promise<PersistCounts> {
  const counts: PersistCounts = { kg_signals: 0, kg_companies: 0, kg_discoveries: 0, raw_feed_items: 0 };
  if (!isSupabaseConfigured() || result.signals.length === 0) return counts;

  // 1. kg_signals
  const signalRows: KgSignalInsert[] = result.signals.map((s) => ({
    title: s.title,
    description: [s.fundingStage, s.industry, s.companyName, s.amountUsd ? `$${(s.amountUsd / 1e6).toFixed(1)}M` : null].filter(Boolean).join(' | '),
    signal_type: startupStageToSignalType(s.fundingStage),
    priority: s.amountUsd && s.amountUsd >= 100_000_000 ? 'P1' as const : 'P2' as const,
    source_url: s.url || null,
    source_name: s.source || null,
    detected_at: s.discoveredAt,
    is_active: true,
  }));
  counts.kg_signals = await batchUpsertSignals(signalRows);

  // 2. kg_companies — upsert new startups by slug
  const companySlugs = new Set<string>();
  const companyRows: KgCompanyInsert[] = [];
  for (const s of result.signals) {
    if (!s.companyName) continue;
    const slug = slugify(s.companyName);
    if (companySlugs.has(slug)) continue;
    companySlugs.add(slug);
    companyRows.push({
      name: s.companyName,
      slug,
      description: `Startup detected via RSS: ${s.fundingStage ?? 'unknown'} stage, ${s.industry} industry`,
      company_type: 'startup',
      total_funding_usd: s.amountUsd ?? null,
      website: null,
    });
  }

  if (companyRows.length > 0) {
    const db = getDb({ admin: true });
    for (let i = 0; i < companyRows.length; i += BATCH_SIZE) {
      const batch = companyRows.slice(i, i + BATCH_SIZE);
      const { error } = await db
        .from('kg_companies')
        .upsert(batch, { onConflict: 'slug', ignoreDuplicates: true });

      if (error) {
        console.warn('[signal-persister] kg_companies upsert error:', error.message);
      } else {
        counts.kg_companies += batch.length;
      }
    }
  }

  // 3. raw_feed_items
  const feedItems: RawFeedItemInput[] = result.signals.map((s) => ({
    title: s.title,
    url: s.url,
    source: s.source,
    source_type: 'startup' as const,
    published_at: s.discoveredAt,
  }));
  counts.raw_feed_items = await persistRawFeedItems(feedItems);

  return counts;
}

// ── Research Signals ───────────────────────────────────────────────────────────

export async function persistResearchSignals(
  result: ResearchDiscoveryResult,
): Promise<PersistCounts> {
  const counts: PersistCounts = { kg_signals: 0, kg_companies: 0, kg_discoveries: 0, raw_feed_items: 0 };
  if (!isSupabaseConfigured() || result.signals.length === 0) return counts;

  // 1. kg_signals
  const signalRows: KgSignalInsert[] = result.signals.map((s) => ({
    title: s.title,
    description: [s.researchType, s.field, s.institution].filter(Boolean).join(' | '),
    signal_type: 'breakthrough' as const,
    priority: s.confidence >= 0.9 ? 'P1' as const : s.confidence >= 0.7 ? 'P2' as const : 'P3' as const,
    source_url: s.url || null,
    source_name: s.source || null,
    detected_at: s.discoveredAt,
    is_active: true,
  }));
  counts.kg_signals = await batchUpsertSignals(signalRows);

  // 2. kg_discoveries
  const discoveryRows: KgDiscoveryInsert[] = result.signals
    .filter((s) => s.researchType === 'breakthrough' || s.researchType === 'clinical_trial' || s.confidence >= 0.8)
    .map((s) => ({
      title: s.title,
      summary: [s.researchType, s.field, s.institution].filter(Boolean).join(' | '),
      discovery_type: researchTypeToDiscoveryType(s.researchType, s.field),
      source_url: s.url || null,
      source_name: s.source || null,
      research_institution: s.institution ?? null,
      published_at: s.discoveredAt,
    }));

  if (discoveryRows.length > 0) {
    const db = getDb({ admin: true });
    for (let i = 0; i < discoveryRows.length; i += BATCH_SIZE) {
      const batch = discoveryRows.slice(i, i + BATCH_SIZE);
      const { error } = await db.from('kg_discoveries').insert(batch);
      if (error) {
        console.warn('[signal-persister] kg_discoveries insert error:', error.message);
      } else {
        counts.kg_discoveries += batch.length;
      }
    }
  }

  // 3. raw_feed_items
  const feedItems: RawFeedItemInput[] = result.signals.map((s) => ({
    title: s.title,
    url: s.url,
    source: s.source,
    source_type: 'research' as const,
    published_at: s.discoveredAt,
  }));
  counts.raw_feed_items = await persistRawFeedItems(feedItems);

  return counts;
}

// ── Supply Chain Signals ───────────────────────────────────────────────────────

export async function persistSupplyChainSignals(
  result: SupplyChainResult,
): Promise<PersistCounts> {
  const counts: PersistCounts = { kg_signals: 0, kg_companies: 0, kg_discoveries: 0, raw_feed_items: 0 };
  if (!isSupabaseConfigured() || result.signals.length === 0) return counts;

  // 1. kg_signals
  const signalRows: KgSignalInsert[] = result.signals.map((s) => ({
    title: s.title,
    description: [s.disruptionType, s.severity, s.commodity, s.region, s.industry].filter(Boolean).join(' | '),
    signal_type: supplyChainTypeToSignalType(s.disruptionType),
    priority: severityToPriority(s.severity),
    source_url: s.url || null,
    source_name: s.source || null,
    detected_at: s.discoveredAt,
    is_active: true,
  }));
  counts.kg_signals = await batchUpsertSignals(signalRows);

  // 2. raw_feed_items
  const feedItems: RawFeedItemInput[] = result.signals.map((s) => ({
    title: s.title,
    url: s.url,
    source: s.source,
    source_type: 'news' as const,
    published_at: s.discoveredAt,
  }));
  counts.raw_feed_items = await persistRawFeedItems(feedItems);

  return counts;
}

// ── Disruption Signals ─────────────────────────────────────────────────────────

export async function persistDisruptionSignals(
  result: DisruptionMonitorResult,
): Promise<PersistCounts> {
  const counts: PersistCounts = { kg_signals: 0, kg_companies: 0, kg_discoveries: 0, raw_feed_items: 0 };
  if (!isSupabaseConfigured() || result.signals.length === 0) return counts;

  // 1. kg_signals with P0-P3 priority directly from agent
  const signalRows: KgSignalInsert[] = result.signals.map((s) => ({
    title: s.title,
    description: [s.disruptionCategory, s.priorityReason, ...s.affectedIndustries].filter(Boolean).join(' | '),
    signal_type: disruptionCategoryToSignalType(s.disruptionCategory),
    priority: s.priority,
    source_url: s.url || null,
    source_name: s.source || null,
    detected_at: s.discoveredAt,
    is_active: true,
  }));
  counts.kg_signals = await batchUpsertSignals(signalRows);

  // 2. raw_feed_items
  const feedItems: RawFeedItemInput[] = result.signals.map((s) => ({
    title: s.title,
    url: s.url,
    source: s.source,
    source_type: 'news' as const,
    published_at: s.discoveredAt,
  }));
  counts.raw_feed_items = await persistRawFeedItems(feedItems);

  return counts;
}

// ── Intel Signals ──────────────────────────────────────────────────────────────

/**
 * Map IntelSignal types to kg_signals signal_type enum values.
 */
function intelTypeToSignalType(intelType: IntelSignal['type']): KgSignalType {
  switch (intelType) {
    case 'patent_filing':
      return 'breakthrough';
    case 'research_paper':
      return 'breakthrough';
    case 'funding_round':
      return 'investment';
    case 'merger_acquisition':
      return 'investment';
    case 'contract_award':
      return 'investment';
    case 'product_launch':
      return 'breakthrough';
    case 'regulatory_action':
      return 'regulatory_change';
    case 'facility_expansion':
      return 'manufacturing_expansion';
    case 'hiring_signal':
      return 'startup_formation';
    case 'case_study':
      return 'breakthrough';
    default:
      return 'breakthrough';
  }
}

export async function persistIntelToKg(
  store: IntelDiscoveryStore,
): Promise<PersistCounts> {
  const counts: PersistCounts = { kg_signals: 0, kg_companies: 0, kg_discoveries: 0, raw_feed_items: 0 };
  if (!isSupabaseConfigured() || store.signals.length === 0) return counts;

  // 1. kg_signals
  const signalRows: KgSignalInsert[] = store.signals.map((s) => ({
    title: s.title,
    description: [s.type, s.industry, s.company, s.evidence?.slice(0, 200)].filter(Boolean).join(' | '),
    signal_type: intelTypeToSignalType(s.type),
    priority: s.confidence >= 0.9 ? 'P1' as const : s.confidence >= 0.7 ? 'P2' as const : 'P3' as const,
    source_url: s.url || null,
    source_name: s.source || null,
    detected_at: s.discoveredAt,
    is_active: true,
  }));
  counts.kg_signals = await batchUpsertSignals(signalRows);

  // 2. kg_companies from named entities
  const companySlugs = new Set<string>();
  const companyRows: KgCompanyInsert[] = [];
  for (const s of store.signals) {
    if (!s.company) continue;
    const slug = slugify(s.company);
    if (companySlugs.has(slug)) continue;
    companySlugs.add(slug);
    companyRows.push({
      name: s.company,
      slug,
      description: `Detected via intel agent: ${s.type}, ${s.industry}`,
      company_type: s.type === 'funding_round' ? 'startup' : 'enterprise',
      total_funding_usd: s.amountUsd ?? null,
      website: null,
    });
  }

  if (companyRows.length > 0) {
    const db = getDb({ admin: true });
    for (let i = 0; i < companyRows.length; i += BATCH_SIZE) {
      const batch = companyRows.slice(i, i + BATCH_SIZE);
      const { error } = await db
        .from('kg_companies')
        .upsert(batch, { onConflict: 'slug', ignoreDuplicates: true });
      if (error) {
        console.warn('[signal-persister] kg_companies (intel) upsert error:', error.message);
      } else {
        counts.kg_companies += batch.length;
      }
    }
  }

  // 3. raw_feed_items
  const feedItems: RawFeedItemInput[] = store.signals
    .filter((s) => s.url)
    .map((s) => ({
      title: s.title,
      url: s.url,
      source: s.source,
      source_type: 'news' as const,
      content: s.evidence ?? undefined,
      published_at: s.discoveredAt,
    }));
  counts.raw_feed_items = await persistRawFeedItems(feedItems);

  return counts;
}

// ── Orchestrator ───────────────────────────────────────────────────────────────

export type AllAgentResults = {
  patent?: PatentDiscoveryResult;
  startup?: StartupDiscoveryResult;
  research?: ResearchDiscoveryResult;
  supplyChain?: SupplyChainResult;
  disruption?: DisruptionMonitorResult;
  intel?: IntelDiscoveryStore;
};

export type AllPersistCounts = {
  patent: PersistCounts;
  startup: PersistCounts;
  research: PersistCounts;
  supplyChain: PersistCounts;
  disruption: PersistCounts;
  intel: PersistCounts;
  totals: PersistCounts;
};

const ZERO_COUNTS: PersistCounts = { kg_signals: 0, kg_companies: 0, kg_discoveries: 0, raw_feed_items: 0 };

/**
 * Persist all agent results in parallel. Each agent result is optional;
 * omitted agents are skipped. Returns per-agent and total counts.
 */
export async function persistAllAgentResults(
  results: AllAgentResults,
): Promise<AllPersistCounts> {
  if (!isSupabaseConfigured()) {
    return {
      patent: { ...ZERO_COUNTS },
      startup: { ...ZERO_COUNTS },
      research: { ...ZERO_COUNTS },
      supplyChain: { ...ZERO_COUNTS },
      disruption: { ...ZERO_COUNTS },
      intel: { ...ZERO_COUNTS },
      totals: { ...ZERO_COUNTS },
    };
  }

  const [patent, startup, research, supplyChain, disruption, intel] =
    await Promise.all([
      results.patent
        ? persistPatentSignals(results.patent).catch((err) => {
            console.warn('[signal-persister] patent persist failed:', err);
            return { ...ZERO_COUNTS };
          })
        : Promise.resolve({ ...ZERO_COUNTS }),

      results.startup
        ? persistStartupSignals(results.startup).catch((err) => {
            console.warn('[signal-persister] startup persist failed:', err);
            return { ...ZERO_COUNTS };
          })
        : Promise.resolve({ ...ZERO_COUNTS }),

      results.research
        ? persistResearchSignals(results.research).catch((err) => {
            console.warn('[signal-persister] research persist failed:', err);
            return { ...ZERO_COUNTS };
          })
        : Promise.resolve({ ...ZERO_COUNTS }),

      results.supplyChain
        ? persistSupplyChainSignals(results.supplyChain).catch((err) => {
            console.warn('[signal-persister] supplyChain persist failed:', err);
            return { ...ZERO_COUNTS };
          })
        : Promise.resolve({ ...ZERO_COUNTS }),

      results.disruption
        ? persistDisruptionSignals(results.disruption).catch((err) => {
            console.warn('[signal-persister] disruption persist failed:', err);
            return { ...ZERO_COUNTS };
          })
        : Promise.resolve({ ...ZERO_COUNTS }),

      results.intel
        ? persistIntelToKg(results.intel).catch((err) => {
            console.warn('[signal-persister] intel persist failed:', err);
            return { ...ZERO_COUNTS };
          })
        : Promise.resolve({ ...ZERO_COUNTS }),
    ]);

  const all = [patent, startup, research, supplyChain, disruption, intel];
  const totals: PersistCounts = {
    kg_signals: all.reduce((sum, c) => sum + c.kg_signals, 0),
    kg_companies: all.reduce((sum, c) => sum + c.kg_companies, 0),
    kg_discoveries: all.reduce((sum, c) => sum + c.kg_discoveries, 0),
    raw_feed_items: all.reduce((sum, c) => sum + c.raw_feed_items, 0),
  };

  return { patent, startup, research, supplyChain, disruption, intel, totals };
}
