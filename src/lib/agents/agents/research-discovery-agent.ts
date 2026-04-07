// src/lib/agents/agents/research-discovery-agent.ts
// Research Discovery Agent — monitors academic breakthroughs, lab discoveries,
// university spinouts, and research publications across the globe.

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';
import { parseAnyFeed } from '@/lib/rss/parser';
import type { QualityFeedSource } from '@/lib/feeds/quality-source-feeds';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

// ── Types ──────────────────────────────────────────────────────────────────────

export type ResearchSignal = {
  id: string;
  title: string;
  url: string;
  source: string;
  institution?: string;
  researchType: 'paper' | 'breakthrough' | 'spinout' | 'grant' | 'collaboration' | 'clinical_trial';
  field: string;
  country?: string;
  confidence: number;
  discoveredAt: string;
  tags: string[];
};

export type ResearchDiscoveryResult = {
  signals: ResearchSignal[];
  as_of: string;
  feeds_scanned: number;
  feeds_ok: number;
  total_research_detected: number;
  by_type: Record<string, number>;
  by_field: Record<string, number>;
  scan_duration_ms: number;
};

// ── Research RSS Sources ───────────────────────────────────────────────────────

const GN = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

const RESEARCH_FEEDS: QualityFeedSource[] = [
  // Major research news
  { id: 'res-nature', name: 'Nature News', url: GN('breakthrough discovery research site:nature.com'), type: 'professional', tier: 1, tags: ['research', 'nature'] },
  { id: 'res-science', name: 'Science Magazine', url: GN('scientific breakthrough discovery site:sciencemag.org OR site:science.org'), type: 'professional', tier: 1, tags: ['research', 'science'] },
  { id: 'res-mit', name: 'MIT Tech Review', url: GN('research breakthrough site:technologyreview.com'), type: 'professional', tier: 1, tags: ['research', 'mit'] },
  // arXiv subjects
  { id: 'res-arxiv-ai', name: 'arXiv AI', url: GN('arxiv artificial intelligence machine learning new paper'), type: 'professional', tier: 2, tags: ['research', 'arxiv', 'ai'] },
  { id: 'res-arxiv-q', name: 'arXiv Quantum', url: GN('arxiv quantum computing new paper breakthrough'), type: 'professional', tier: 2, tags: ['research', 'arxiv', 'quantum'] },
  { id: 'res-arxiv-r', name: 'arXiv Robotics', url: GN('arxiv robotics autonomous new paper'), type: 'professional', tier: 2, tags: ['research', 'arxiv', 'robotics'] },
  // Research by field
  { id: 'res-ai-break', name: 'AI Breakthroughs', url: GN('"breakthrough" "artificial intelligence" OR "machine learning" research'), type: 'professional', tier: 2, tags: ['research', 'ai'] },
  { id: 'res-quantum', name: 'Quantum Research', url: GN('"quantum computing" OR "quantum supremacy" breakthrough research'), type: 'professional', tier: 2, tags: ['research', 'quantum'] },
  { id: 'res-fusion', name: 'Fusion Research', url: GN('"nuclear fusion" OR "fusion energy" breakthrough research'), type: 'professional', tier: 2, tags: ['research', 'fusion'] },
  { id: 'res-bio', name: 'Biotech Research', url: GN('"gene therapy" OR "CRISPR" OR "mRNA" breakthrough research'), type: 'professional', tier: 2, tags: ['research', 'biotech'] },
  { id: 'res-materials', name: 'Materials Science', url: GN('"advanced materials" OR "superconductor" OR "metamaterial" breakthrough'), type: 'professional', tier: 2, tags: ['research', 'materials'] },
  { id: 'res-battery', name: 'Battery Research', url: GN('"solid state battery" OR "battery breakthrough" OR "energy density" research'), type: 'professional', tier: 2, tags: ['research', 'battery'] },
  // Major labs & institutions
  { id: 'res-darpa', name: 'DARPA Programs', url: GN('DARPA research program award technology'), type: 'professional', tier: 1, tags: ['research', 'darpa'] },
  { id: 'res-doe', name: 'DOE Labs', url: GN('"Department of Energy" OR "national laboratory" research breakthrough'), type: 'professional', tier: 1, tags: ['research', 'doe'] },
  { id: 'res-nasa', name: 'NASA Research', url: GN('NASA research technology breakthrough discovery'), type: 'professional', tier: 1, tags: ['research', 'nasa'] },
  { id: 'res-cern', name: 'CERN', url: GN('CERN research physics discovery'), type: 'professional', tier: 1, tags: ['research', 'cern'] },
  // University spinouts
  { id: 'res-spinout', name: 'University Spinouts', url: GN('university spinout OR "spun out" OR "spin-off" technology startup'), type: 'professional', tier: 2, tags: ['research', 'spinout'] },
  // Research grants
  { id: 'res-grants', name: 'Research Grants', url: GN('research grant awarded million OR billion technology NSF NIH'), type: 'professional', tier: 2, tags: ['research', 'grant'] },
  // Clinical trials
  { id: 'res-trials', name: 'Clinical Trials', url: GN('"phase 3" OR "phase 2" clinical trial results success'), type: 'professional', tier: 2, tags: ['research', 'clinical'] },
  // Global research
  { id: 'res-china', name: 'China Research', url: GN('China research breakthrough technology university'), type: 'professional', tier: 2, tags: ['research', 'china'] },
  { id: 'res-eu', name: 'EU Research', url: GN('European research breakthrough Horizon Europe technology'), type: 'professional', tier: 2, tags: ['research', 'europe'] },
];

// ── Detection Patterns ─────────────────────────────────────────────────────────

const TYPE_PATTERNS: Array<{ type: ResearchSignal['researchType']; patterns: RegExp[]; confidence: number }> = [
  { type: 'breakthrough', patterns: [/breakthrough/i, /first[- ]ever/i, /world[- ]record/i, /unprecedented/i, /revolutioniz/i], confidence: 0.9 },
  { type: 'paper', patterns: [/\barxiv\b/i, /\bpublish/i, /\bpaper\b/i, /\bstudy\s+(find|show|reveal)/i, /\bpreprint\b/i], confidence: 0.7 },
  { type: 'clinical_trial', patterns: [/phase\s+[123IiIi]/i, /clinical\s+trial/i, /FDA\s+approv/i], confidence: 0.85 },
  { type: 'grant', patterns: [/\bgrant\b.*\b(award|receiv|fund)/i, /\bfund(ed|ing)\s+.*research/i], confidence: 0.7 },
  { type: 'spinout', patterns: [/spin[- ]?(out|off)/i, /university[- ]born/i, /lab[- ]born/i], confidence: 0.75 },
  { type: 'collaboration', patterns: [/research\s+(partner|collaborat|alliance)/i, /joint\s+research/i], confidence: 0.65 },
];

const FIELD_KEYWORDS: Record<string, RegExp> = {
  'ai-ml': /\b(artificial intelligence|machine learning|deep learning|neural|LLM|NLP|computer vision)\b/i,
  'quantum': /\b(quantum computing|qubit|quantum|entanglement|superposition)\b/i,
  'fusion': /\b(nuclear fusion|tokamak|stellarator|fusion energy|plasma)\b/i,
  'biotech': /\b(gene|CRISPR|mRNA|protein|biotech|genomic|clinical trial)\b/i,
  'materials': /\b(superconductor|metamaterial|graphene|advanced material|alloy)\b/i,
  'energy': /\b(battery|solar cell|hydrogen|energy storage|photovoltaic)\b/i,
  'space': /\b(space|orbit|satellite|Mars|Moon|asteroid|exoplanet)\b/i,
  'robotics': /\b(robot|autonomous|humanoid|manipulation|locomotion)\b/i,
  'semiconductor': /\b(semiconductor|transistor|chip|nanometer|lithography)\b/i,
};

const INSTITUTIONS: Record<string, string> = {
  'mit': 'MIT', 'stanford': 'Stanford', 'harvard': 'Harvard', 'caltech': 'Caltech',
  'oxford': 'Oxford', 'cambridge': 'Cambridge', 'eth zurich': 'ETH Zurich',
  'tsinghua': 'Tsinghua', 'university of tokyo': 'U of Tokyo', 'kaist': 'KAIST',
  'max planck': 'Max Planck', 'cnrs': 'CNRS', 'cern': 'CERN',
  'darpa': 'DARPA', 'nasa': 'NASA', 'sandia': 'Sandia', 'los alamos': 'Los Alamos',
  'lawrence livermore': 'LLNL', 'oak ridge': 'Oak Ridge', 'argonne': 'Argonne',
};

function classifyType(text: string): { type: ResearchSignal['researchType']; confidence: number } {
  for (const { type, patterns, confidence } of TYPE_PATTERNS) {
    for (const re of patterns) {
      if (re.test(text)) return { type, confidence };
    }
  }
  return { type: 'paper', confidence: 0.5 };
}

function classifyField(text: string): string {
  for (const [field, re] of Object.entries(FIELD_KEYWORDS)) {
    if (re.test(text)) return field;
  }
  return 'general';
}

function extractInstitution(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const [key, name] of Object.entries(INSTITUTIONS)) {
    if (lower.includes(key)) return name;
  }
  return undefined;
}

// ── Main Runner ───────────────────────────────────────────────────────────────

const CONCURRENCY = 10;
let _cached: ResearchDiscoveryResult | null = null;
let _cachedAt = 0;
const CACHE_TTL = 10 * 60 * 1000;

export async function runResearchDiscoveryAgent(): Promise<ResearchDiscoveryResult> {
  if (_cached && Date.now() - _cachedAt < CACHE_TTL) return _cached;

  const start = Date.now();
  const feeds = RESEARCH_FEEDS;
  let feedsOk = 0;
  const allSignals: ResearchSignal[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < feeds.length; i += CONCURRENCY) {
    const batch = feeds.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (feed) => {
        const res = await fetchWithRetry(feed.url, {}, { retries: 1 });
        if (!res.ok) return [];
        const xml = await res.text();
        const items = parseAnyFeed(xml, feed.name);
        return items.map((item) => ({ item, feed }));
      }),
    );

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      feedsOk++;
      for (const { item, feed } of result.value) {
        const text = `${item.title ?? ''} ${item.description ?? ''}`;
        if (!/\b(research|discover|breakthrough|study|paper|trial|lab|grant|arxiv|spinout)\b/i.test(text)) continue;

        const key = (item.title ?? '').toLowerCase().slice(0, 80);
        if (seen.has(key)) continue;
        seen.add(key);

        const { type: researchType, confidence } = classifyType(text);

        allSignals.push({
          id: `res-${Date.now()}-${allSignals.length}`,
          title: (item.title ?? '').slice(0, 200),
          url: item.link ?? feed.url,
          source: feed.name,
          institution: extractInstitution(text),
          researchType,
          field: classifyField(text),
          confidence,
          discoveredAt: item.pubDate ?? new Date().toISOString(),
          tags: [...feed.tags, researchType],
        });
      }
    }
  }

  allSignals.sort((a, b) => b.confidence - a.confidence);

  const byType: Record<string, number> = {};
  const byField: Record<string, number> = {};
  for (const s of allSignals) {
    byType[s.researchType] = (byType[s.researchType] ?? 0) + 1;
    byField[s.field] = (byField[s.field] ?? 0) + 1;
  }

  const result: ResearchDiscoveryResult = {
    signals: allSignals,
    as_of: new Date().toISOString(),
    feeds_scanned: feeds.length,
    feeds_ok: feedsOk,
    total_research_detected: allSignals.length,
    by_type: byType,
    by_field: byField,
    scan_duration_ms: Date.now() - start,
  };

  _cached = result;
  _cachedAt = Date.now();
  return result;
}

// ── Persist to Supabase ────────────────────────────────────────────────────────

/**
 * Save research signals to the kg_discoveries table.
 * Uses ON CONFLICT DO NOTHING on title to avoid duplicates.
 * Only runs if Supabase is configured.
 */
export async function persistDiscoveries(result: ResearchDiscoveryResult): Promise<{
  saved: number;
  skipped: number;
  errors: number;
}> {
  if (!isSupabaseConfigured()) {
    console.warn('[research-discovery] Supabase not configured — skipping persist.');
    return { saved: 0, skipped: 0, errors: 0 };
  }

  const db = getSupabaseClient({ admin: true });
  let saved = 0;
  let skipped = 0;
  let errors = 0;

  // Batch upsert in chunks of 50
  const BATCH_SIZE = 50;
  const signals = result.signals;

  for (let i = 0; i < signals.length; i += BATCH_SIZE) {
    const batch = signals.slice(i, i + BATCH_SIZE);

    const rows = batch.map((signal) => ({
      title: signal.title.slice(0, 500),
      discovery_type: signal.researchType,
      source_url: signal.url || null,
      source_name: signal.source || null,
      research_institution: signal.institution || null,
      // Map confidence (0–1) to iker_impact_score (0–100)
      iker_impact_score: Math.round(signal.confidence * 100),
      published_at: signal.discoveredAt || new Date().toISOString(),
      // summary not available from RSS signals — leave null
      summary: null as string | null,
      country_id: signal.country || null,
    }));

    try {
      // Upsert with ON CONFLICT DO NOTHING on title
      const { data, error } = await db
        .from('kg_discoveries')
        .upsert(rows, {
          onConflict: 'title',
          ignoreDuplicates: true,
        })
        .select('id');

      if (error) {
        console.error('[research-discovery] upsert error:', error.message);
        errors += batch.length;
      } else {
        const insertedCount = data?.length ?? 0;
        saved += insertedCount;
        skipped += batch.length - insertedCount;
      }
    } catch (err) {
      console.error('[research-discovery] batch error:', err instanceof Error ? err.message : err);
      errors += batch.length;
    }
  }

  console.log(`[research-discovery] persisted: saved=${saved}, skipped=${skipped}, errors=${errors}`);
  return { saved, skipped, errors };
}

/**
 * Run the research discovery agent and persist all signals to kg_discoveries.
 * This is the main entry point for cron jobs and manual triggers.
 */
export async function runAndPersistResearchDiscoveryAgent(): Promise<{
  result: ResearchDiscoveryResult;
  persist: { saved: number; skipped: number; errors: number };
}> {
  const result = await runResearchDiscoveryAgent();
  const persist = await persistDiscoveries(result);
  return { result, persist };
}
