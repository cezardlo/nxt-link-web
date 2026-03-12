// src/lib/agents/persist/cron-persist.ts
// Persists specialized agent results into kg_signals + raw_feed_items + kg_discoveries tables.

import { getDb, isSupabaseConfigured } from '@/db/client';
import { persistRawFeedItems, type RawFeedItemInput } from './feed-persister';
import { insertKgDiscovery } from '@/db/queries/kg-discoveries';
import type { PatentDiscoveryResult } from '@/lib/agents/agents/patent-discovery-agent';
import type { StartupDiscoveryResult } from '@/lib/agents/agents/startup-discovery-agent';
import type { ResearchDiscoveryResult } from '@/lib/agents/agents/research-discovery-agent';
import type { SupplyChainResult } from '@/lib/agents/agents/supply-chain-agent';
import type { DisruptionMonitorResult } from '@/lib/agents/agents/disruption-monitor-agent';

// ── Types ──────────────────────────────────────────────────────────────────────

type KgSignalRow = {
  title: string;
  description: string | null;
  signal_type: string;
  priority: string;
  source_url: string | null;
  source_name: string | null;
  detected_at: string;
};

type CronPersistInput = {
  patents?: PatentDiscoveryResult | null;
  startups?: StartupDiscoveryResult | null;
  research?: ResearchDiscoveryResult | null;
  supplyChain?: SupplyChainResult | null;
  disruptions?: DisruptionMonitorResult | null;
};

// ── Priority Mapping Helpers ───────────────────────────────────────────────────

function confidenceToPriority(confidence: number): string {
  if (confidence >= 0.9) return 'P0';
  if (confidence >= 0.75) return 'P1';
  if (confidence >= 0.6) return 'P2';
  return 'P3';
}

function startupSignalType(stage: string | undefined): string {
  if (stage === 'ipo' || stage === 'acquisition') return 'investment';
  return 'startup_formation';
}

// ── Signal Mappers ─────────────────────────────────────────────────────────────

function mapPatentSignals(result: PatentDiscoveryResult): { signals: KgSignalRow[]; feedItems: RawFeedItemInput[] } {
  const signals: KgSignalRow[] = [];
  const feedItems: RawFeedItemInput[] = [];

  for (const s of result.signals) {
    signals.push({
      title: s.title,
      description: s.patentId
        ? `${s.filingType} — ${s.patentId} (${s.industry})`
        : `${s.filingType} (${s.industry})`,
      signal_type: 'breakthrough',
      priority: confidenceToPriority(s.confidence),
      source_url: s.url,
      source_name: s.source,
      detected_at: s.discoveredAt,
    });

    feedItems.push({
      title: s.title,
      url: s.url,
      source: s.source,
      source_type: 'patent',
      published_at: s.discoveredAt,
    });
  }

  return { signals, feedItems };
}

function mapStartupSignals(result: StartupDiscoveryResult): { signals: KgSignalRow[]; feedItems: RawFeedItemInput[] } {
  const signals: KgSignalRow[] = [];
  const feedItems: RawFeedItemInput[] = [];

  for (const s of result.signals) {
    const amountStr = s.amountUsd
      ? ` — $${(s.amountUsd / 1_000_000).toFixed(1)}M`
      : '';

    signals.push({
      title: s.title,
      description: `${s.fundingStage ?? 'unknown'}${amountStr} (${s.industry})`,
      signal_type: startupSignalType(s.fundingStage),
      priority: confidenceToPriority(s.confidence),
      source_url: s.url,
      source_name: s.source,
      detected_at: s.discoveredAt,
    });

    feedItems.push({
      title: s.title,
      url: s.url,
      source: s.source,
      source_type: 'startup',
      published_at: s.discoveredAt,
    });
  }

  return { signals, feedItems };
}

function mapResearchSignals(result: ResearchDiscoveryResult): { signals: KgSignalRow[]; feedItems: RawFeedItemInput[] } {
  const signals: KgSignalRow[] = [];
  const feedItems: RawFeedItemInput[] = [];

  for (const s of result.signals) {
    signals.push({
      title: s.title,
      description: `${s.researchType} — ${s.field}${s.institution ? ` (${s.institution})` : ''}`,
      signal_type: 'breakthrough',
      priority: confidenceToPriority(s.confidence),
      source_url: s.url,
      source_name: s.source,
      detected_at: s.discoveredAt,
    });

    feedItems.push({
      title: s.title,
      url: s.url,
      source: s.source,
      source_type: 'research',
      published_at: s.discoveredAt,
    });
  }

  return { signals, feedItems };
}

function mapSupplyChainSignals(result: SupplyChainResult): { signals: KgSignalRow[]; feedItems: RawFeedItemInput[] } {
  const signals: KgSignalRow[] = [];
  const feedItems: RawFeedItemInput[] = [];

  const severityToPriority: Record<string, string> = {
    critical: 'P0',
    high: 'P1',
    moderate: 'P2',
    low: 'P3',
  };

  for (const s of result.signals) {
    signals.push({
      title: s.title,
      description: `${s.disruptionType} — ${s.severity}${s.commodity ? ` [${s.commodity}]` : ''} (${s.industry})`,
      signal_type: 'supply_chain_risk',
      priority: severityToPriority[s.severity] ?? 'P3',
      source_url: s.url,
      source_name: s.source,
      detected_at: s.discoveredAt,
    });

    feedItems.push({
      title: s.title,
      url: s.url,
      source: s.source,
      source_type: 'news',
      published_at: s.discoveredAt,
    });
  }

  return { signals, feedItems };
}

function mapDisruptionSignals(result: DisruptionMonitorResult): { signals: KgSignalRow[]; feedItems: RawFeedItemInput[] } {
  const signals: KgSignalRow[] = [];
  const feedItems: RawFeedItemInput[] = [];

  for (const s of result.signals) {
    const signalType = 'disruption';

    signals.push({
      title: s.title,
      description: `${s.disruptionCategory} — ${s.priorityReason}`,
      signal_type: signalType,
      priority: s.priority,
      source_url: s.url,
      source_name: s.source,
      detected_at: s.discoveredAt,
    });

    feedItems.push({
      title: s.title,
      url: s.url,
      source: s.source,
      source_type: 'news',
      published_at: s.discoveredAt,
    });
  }

  return { signals, feedItems };
}

// ── Main Persist Function ──────────────────────────────────────────────────────

const SIGNAL_BATCH_SIZE = 100;

export async function persistCronResults(results: CronPersistInput): Promise<{ persisted: number; errors: string[] }> {
  if (!isSupabaseConfigured()) {
    return { persisted: 0, errors: [] };
  }

  const allSignals: KgSignalRow[] = [];
  const allFeedItems: RawFeedItemInput[] = [];
  const errors: string[] = [];
  let discoveryCount = 0;

  // Map each non-null result
  if (results.patents) {
    const mapped = mapPatentSignals(results.patents);
    allSignals.push(...mapped.signals);
    allFeedItems.push(...mapped.feedItems);

    // Persist high-confidence patents as kg_discoveries
    for (const s of results.patents.signals) {
      if (s.confidence < 0.7) continue;
      const id = await insertKgDiscovery({
        title: s.title,
        summary: s.patentId ? `${s.filingType} — ${s.patentId}` : s.filingType,
        discovery_type: 'technology',
        source_url: s.url,
        source_name: s.source,
        published_at: s.discoveredAt,
        iker_impact_score: Math.round(s.confidence * 100),
      });
      if (id) discoveryCount++;
    }
  }

  if (results.startups) {
    const mapped = mapStartupSignals(results.startups);
    allSignals.push(...mapped.signals);
    allFeedItems.push(...mapped.feedItems);
  }

  if (results.research) {
    const mapped = mapResearchSignals(results.research);
    allSignals.push(...mapped.signals);
    allFeedItems.push(...mapped.feedItems);

    // Also persist high-confidence research as kg_discoveries
    for (const s of results.research.signals) {
      if (s.confidence < 0.6) continue;
      const discoveryTypeMap: Record<string, string> = {
        paper: 'scientific', breakthrough: 'scientific',
        clinical_trial: 'medical', spinout: 'technology',
        grant: 'scientific', collaboration: 'scientific',
      };
      const id = await insertKgDiscovery({
        title: s.title,
        summary: `${s.researchType} — ${s.field}${s.institution ? ` (${s.institution})` : ''}`,
        discovery_type: discoveryTypeMap[s.researchType] ?? 'technology',
        source_url: s.url,
        source_name: s.source,
        research_institution: s.institution ?? null,
        published_at: s.discoveredAt,
        iker_impact_score: Math.round(s.confidence * 100),
      });
      if (id) discoveryCount++;
    }
  }

  if (results.supplyChain) {
    const mapped = mapSupplyChainSignals(results.supplyChain);
    allSignals.push(...mapped.signals);
    allFeedItems.push(...mapped.feedItems);
  }

  if (results.disruptions) {
    const mapped = mapDisruptionSignals(results.disruptions);
    allSignals.push(...mapped.signals);
    allFeedItems.push(...mapped.feedItems);
  }

  if (allSignals.length === 0) {
    return { persisted: 0, errors: [] };
  }

  let persisted = 0;
  const db = getDb({ admin: true });

  // Insert kg_signals in batches
  for (let i = 0; i < allSignals.length; i += SIGNAL_BATCH_SIZE) {
    const batch = allSignals.slice(i, i + SIGNAL_BATCH_SIZE);
    const { data, error } = await db
      .from('kg_signals')
      .insert(batch)
      .select('id');

    if (error) {
      errors.push(`kg_signals batch ${i}: ${error.message}`);
    } else {
      persisted += data?.length ?? 0;
    }
  }

  // Insert raw_feed_items via existing persister (handles URL dedup)
  const feedInserted = await persistRawFeedItems(allFeedItems).catch((err: Error) => {
    errors.push(`raw_feed_items: ${err.message}`);
    return 0;
  });
  persisted += feedInserted;

  return { persisted: persisted + discoveryCount, errors };
}
