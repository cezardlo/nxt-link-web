// src/lib/agents/agents/vendor-pipeline-orchestrator.ts
// Master orchestrator for the automated vendor discovery pipeline.
// Full flow: Scrape → Persist → Clean → Enrich → Persist → Score → Link KG → Sync Marketplace
// Runs on Vercel cron (daily) or on-demand via API.

import {
  runExhibitorScraper,
  type ExhibitorScrapeOptions,
  type ExhibitorScrapeReport,
} from './exhibitor-scraper-agent';
import {
  runVendorEnrichment,
  type EnrichmentReport,
} from './vendor-enrichment-agent';
import { runDataCleaner, type CleanupReport } from './vendor-data-cleaner';
import { runVendorScorer, type ScoringReport } from './vendor-scorer';
import { runVendorKgLinker, type LinkingReport } from './vendor-kg-linker';
import { runMarketplaceSync, invalidateVendorCache, type SyncReport } from './vendor-marketplace-sync';
import {
  upsertExhibitors,
  upsertEnrichedVendors,
  getUnenrichedExhibitorNames,
  recordScrapeRun,
  type ExhibitorInsert,
  type EnrichedVendorInsert,
} from '@/db/queries/exhibitors';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type PipelinePhase =
  | 'scrape_exhibitors'
  | 'persist_exhibitors'
  | 'clean_data'
  | 'enrich_vendors'
  | 'persist_vendors'
  | 'score_vendors'
  | 'link_kg'
  | 'sync_marketplace'
  | 'complete';

export type PipelineReport = {
  phase: PipelinePhase;
  scrape: ExhibitorScrapeReport | null;
  enrichment: EnrichmentReport | null;
  cleanup: CleanupReport | null;
  scoring: ScoringReport | null;
  linking: LinkingReport | null;
  marketplace_sync: SyncReport | null;
  exhibitors_persisted: number;
  vendors_persisted: number;
  total_duration_ms: number;
  started_at: string;
  completed_at: string;
};

export type PipelineOptions = {
  phases?: PipelinePhase[];
  conferenceIds?: string[];
  maxConferences?: number;
  minRelevanceScore?: number;
  maxEnrichments?: number;
  enrichOnlyNew?: boolean;
  dryRun?: boolean;
};

const ALL_PHASES: PipelinePhase[] = [
  'scrape_exhibitors',
  'persist_exhibitors',
  'clean_data',
  'enrich_vendors',
  'persist_vendors',
  'score_vendors',
  'link_kg',
  'sync_marketplace',
];

// ─── Orchestrator ───────────────────────────────────────────────────────────────

export async function runVendorPipeline(
  options: PipelineOptions = {},
): Promise<PipelineReport> {
  const start = Date.now();
  const startedAt = new Date().toISOString();
  const {
    phases = ALL_PHASES,
    conferenceIds,
    maxConferences = 15,
    minRelevanceScore = 50,
    maxEnrichments = 20,
    enrichOnlyNew = true,
    dryRun = false,
  } = options;

  let scrapeReport: ExhibitorScrapeReport | null = null;
  let enrichmentReport: EnrichmentReport | null = null;
  let cleanupReport: CleanupReport | null = null;
  let scoringReport: ScoringReport | null = null;
  let linkingReport: LinkingReport | null = null;
  let syncReport: SyncReport | null = null;
  let exhibitorsPersisted = 0;
  let vendorsPersisted = 0;

  // ── Phase 1: Scrape exhibitor pages ────────────────────────────────────────

  if (phases.includes('scrape_exhibitors')) {
    console.log('[vendor-pipeline] Phase 1: Scraping exhibitor pages...');
    const scrapeOptions: ExhibitorScrapeOptions = {
      conferenceIds,
      maxConferences,
      minRelevanceScore,
      useLlmFallback: true,
    };
    scrapeReport = await runExhibitorScraper(scrapeOptions);
    console.log(
      `[vendor-pipeline] Scrape: ${scrapeReport.total_exhibitors} exhibitors from ${scrapeReport.pages_found} pages (${scrapeReport.duration_ms}ms)`,
    );
  }

  // ── Phase 2: Persist exhibitors ────────────────────────────────────────────

  if (phases.includes('persist_exhibitors') && scrapeReport && !dryRun) {
    console.log('[vendor-pipeline] Phase 2: Persisting exhibitors...');
    const inserts: ExhibitorInsert[] = [];
    for (const result of scrapeReport.results) {
      for (const exh of result.exhibitors) {
        const id = `${result.conference_id}::${exh.normalized_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        inserts.push({
          id,
          conference_id: result.conference_id,
          conference_name: result.conference_name,
          raw_name: exh.raw_name,
          normalized_name: exh.normalized_name,
          booth: exh.booth,
          category: exh.category,
          description: exh.description,
          website: exh.website,
          confidence: exh.confidence,
          source_url: result.exhibitor_page_url,
        });
      }
    }
    exhibitorsPersisted = await upsertExhibitors(inserts);
    console.log(`[vendor-pipeline] Persisted ${exhibitorsPersisted} exhibitors`);
  }

  // ── Phase 3: Clean data ────────────────────────────────────────────────────

  if (phases.includes('clean_data') && !dryRun) {
    console.log('[vendor-pipeline] Phase 3: Cleaning vendor data...');
    cleanupReport = await runDataCleaner();
    console.log(
      `[vendor-pipeline] Cleaned: removed ${cleanupReport.total_removed}, merged ${cleanupReport.merged_duplicates} dupes, ${cleanupReport.total_after} remain`,
    );
  }

  // ── Phase 4: Enrich vendors ────────────────────────────────────────────────

  if (phases.includes('enrich_vendors')) {
    console.log('[vendor-pipeline] Phase 4: Enriching vendors...');
    let vendorNames: Array<{ name: string; conference_source: string; website_hint?: string }>;

    if (enrichOnlyNew && !scrapeReport) {
      const names = await getUnenrichedExhibitorNames(maxEnrichments);
      vendorNames = names.map((n) => ({ name: n, conference_source: 'database' }));
    } else if (scrapeReport) {
      const seen = new Set<string>();
      vendorNames = [];
      for (const result of scrapeReport.results) {
        for (const exh of result.exhibitors) {
          const key = exh.normalized_name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            vendorNames.push({
              name: exh.normalized_name,
              conference_source: result.conference_name,
              website_hint: exh.website || undefined,
            });
          }
        }
      }
      vendorNames = vendorNames.slice(0, maxEnrichments);
    } else {
      vendorNames = [];
    }

    if (vendorNames.length > 0) {
      enrichmentReport = await runVendorEnrichment({
        vendors: vendorNames,
        maxConcurrent: 3,
        skipKnown: false,
      });
      console.log(
        `[vendor-pipeline] Enriched: ${enrichmentReport.vendors_enriched}/${enrichmentReport.vendors_processed} (${enrichmentReport.llm_calls} LLM calls)`,
      );
    }
  }

  // ── Phase 5: Persist enriched vendors ──────────────────────────────────────

  if (phases.includes('persist_vendors') && enrichmentReport && !dryRun) {
    console.log('[vendor-pipeline] Phase 5: Persisting enriched vendors...');
    const inserts: EnrichedVendorInsert[] = enrichmentReport.results.map(
      (v): EnrichedVendorInsert => ({
        id: v.id,
        canonical_name: v.canonical_name,
        official_domain: v.official_domain,
        description: v.description,
        products: v.products,
        technologies: v.technologies,
        industries: v.industries,
        country: v.country,
        vendor_type: v.vendor_type,
        use_cases: v.use_cases,
        employee_estimate: v.employee_estimate,
        conference_sources: v.conference_sources,
        confidence: v.confidence,
      }),
    );
    vendorsPersisted = await upsertEnrichedVendors(inserts);
    console.log(`[vendor-pipeline] Persisted ${vendorsPersisted} enriched vendors`);
  }

  // ── Phase 6: Score vendors ─────────────────────────────────────────────────

  if (phases.includes('score_vendors') && !dryRun) {
    console.log('[vendor-pipeline] Phase 6: Scoring vendors...');
    scoringReport = await runVendorScorer();
    console.log(
      `[vendor-pipeline] Scored ${scoringReport.vendors_scored} vendors (avg ${scoringReport.avg_score}), tiers: ${JSON.stringify(scoringReport.tier_counts)}`,
    );
  }

  // ── Phase 7: Link to Knowledge Graph ───────────────────────────────────────

  if (phases.includes('link_kg') && !dryRun) {
    console.log('[vendor-pipeline] Phase 7: Linking vendors to KG...');
    linkingReport = await runVendorKgLinker({ minConfidence: 0.5 });
    console.log(
      `[vendor-pipeline] KG linked: ${linkingReport.entities_created} new entities, ${linkingReport.relationships_created} relationships`,
    );
  }

  // ── Phase 8: Sync to Marketplace ───────────────────────────────────────────

  if (phases.includes('sync_marketplace')) {
    console.log('[vendor-pipeline] Phase 8: Syncing to marketplace...');
    invalidateVendorCache();
    syncReport = await runMarketplaceSync();
    console.log(`[vendor-pipeline] Marketplace synced: ${syncReport.vendors_synced} vendor products`);
  }

  const report: PipelineReport = {
    phase: 'complete',
    scrape: scrapeReport,
    enrichment: enrichmentReport,
    cleanup: cleanupReport,
    scoring: scoringReport,
    linking: linkingReport,
    marketplace_sync: syncReport,
    exhibitors_persisted: exhibitorsPersisted,
    vendors_persisted: vendorsPersisted,
    total_duration_ms: Date.now() - start,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
  };

  console.log(`[vendor-pipeline] Pipeline complete in ${report.total_duration_ms}ms`);

  // ── Persist run history ───────────────────────────────────────────────────
  await recordScrapeRun({
    conferences_scanned: scrapeReport?.conferences_scanned ?? 0,
    pages_found: scrapeReport?.pages_found ?? 0,
    total_exhibitors: exhibitorsPersisted,
    vendors_enriched: enrichmentReport?.vendors_enriched ?? 0,
    errors: [
      ...(scrapeReport?.errors ?? []).map((e) => ({ conference: e.conference_id, error: e.error })),
    ],
    duration_ms: report.total_duration_ms,
    phase: report.phase,
  }).catch((err) => console.warn('[vendor-pipeline] Failed to record run:', err));

  return report;
}

// ─── Lightweight run: just clean + score + link + sync (no scraping) ─────────

export async function runVendorMaintenance(): Promise<PipelineReport> {
  return runVendorPipeline({
    phases: ['clean_data', 'score_vendors', 'link_kg', 'sync_marketplace'],
  });
}

// ─── Enrichment-only: pick up unenriched exhibitors and process them ─────────

export async function runVendorEnrichmentCycle(max = 20): Promise<PipelineReport> {
  return runVendorPipeline({
    phases: ['enrich_vendors', 'persist_vendors', 'score_vendors', 'sync_marketplace'],
    maxEnrichments: max,
    enrichOnlyNew: true,
  });
}
