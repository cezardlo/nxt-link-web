// src/lib/agents/agents/entity-extraction-agent.ts
// Entity Extraction Agent — processes raw_feed_items through LLM to extract
// structured entities (companies, technologies, signals, discoveries) into the KG.

import { isOllamaAvailable, ollamaExtractJSON } from '@/lib/ollama/client';
import {
  getUnprocessedFeedItems,
  markFeedItemProcessed,
  type RawFeedItemRow,
} from '@/db/queries/raw-feed-items';
import { upsertKgCompany } from '@/db/queries/kg-companies';
import { upsertKgTechnology } from '@/db/queries/kg-technologies';
import { insertKgSignal, type KgSignalPriority } from '@/db/queries/kg-signals';
import { insertKgDiscovery } from '@/db/queries/kg-discoveries';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExtractionResult = {
  companies: Array<{ name: string; country?: string; type?: string }>;
  technologies: Array<{ name: string; maturity?: string; industries?: string[] }>;
  industries: string[];
  signals: Array<{ type: string; description: string; priority: 'P0' | 'P1' | 'P2' | 'P3' }>;
  discoveries: Array<{ title: string; type?: string; institution?: string; trl?: number }>;
  is_relevant: boolean;
  relevance_score: number;
};

export type EntityExtractionResult = {
  items_processed: number;
  entities_extracted: number;
  companies_upserted: number;
  technologies_upserted: number;
  signals_created: number;
  discoveries_created: number;
  duration_ms: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const VALID_PRIORITIES = new Set<KgSignalPriority>(['P0', 'P1', 'P2', 'P3']);

function isValidPriority(val: string): val is KgSignalPriority {
  return VALID_PRIORITIES.has(val as KgSignalPriority);
}

function buildItemText(item: RawFeedItemRow): string {
  const parts: string[] = [];
  if (item.title) parts.push(item.title);
  if (item.content) parts.push(item.content.slice(0, 4000));
  if (item.source_name) parts.push(`Source: ${item.source_name}`);
  return parts.join('\n\n');
}

// ─── Extraction Prompt ────────────────────────────────────────────────────────

function buildExtractionPrompt(text: string): string {
  return `You are an intelligence extraction engine for a global technology platform.
Given this text, extract ALL entities present. Return ONLY valid JSON, no explanation.

Text: ${text}

Return this exact JSON structure:
{
  "companies": [{ "name": "string", "country": "string", "type": "enterprise|startup|research_lab|university|government" }],
  "technologies": [{ "name": "string", "maturity": "research|emerging|early_adoption|growth|mainstream", "industries": ["string"] }],
  "industries": ["string"],
  "signals": [{ "type": "breakthrough|investment|policy|disruption|startup_formation|manufacturing_expansion|supply_chain_risk|regulatory_change", "description": "string", "priority": "P0|P1|P2|P3" }],
  "discoveries": [{ "title": "string", "type": "scientific|medical|technology|materials|energy", "institution": "string", "trl": 1 }],
  "is_relevant": true,
  "relevance_score": 0.8
}`;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateExtraction(raw: Record<string, unknown>): ExtractionResult {
  const companies = Array.isArray(raw.companies)
    ? raw.companies
        .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
        .map((c) => ({
          name: typeof c.name === 'string' ? c.name : '',
          country: typeof c.country === 'string' ? c.country : undefined,
          type: typeof c.type === 'string' ? c.type : undefined,
        }))
        .filter((c) => c.name.length > 0)
    : [];

  const technologies = Array.isArray(raw.technologies)
    ? raw.technologies
        .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
        .map((t) => ({
          name: typeof t.name === 'string' ? t.name : '',
          maturity: typeof t.maturity === 'string' ? t.maturity : undefined,
          industries: Array.isArray(t.industries)
            ? t.industries.filter((i): i is string => typeof i === 'string')
            : undefined,
        }))
        .filter((t) => t.name.length > 0)
    : [];

  const industries = Array.isArray(raw.industries)
    ? raw.industries.filter((i): i is string => typeof i === 'string')
    : [];

  const signals = Array.isArray(raw.signals)
    ? raw.signals
        .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
        .map((s) => ({
          type: typeof s.type === 'string' ? s.type : 'disruption',
          description: typeof s.description === 'string' ? s.description : '',
          priority: (typeof s.priority === 'string' && isValidPriority(s.priority))
            ? s.priority
            : 'P2' as const,
        }))
        .filter((s) => s.description.length > 0)
    : [];

  const discoveries = Array.isArray(raw.discoveries)
    ? raw.discoveries
        .filter((d): d is Record<string, unknown> => typeof d === 'object' && d !== null)
        .map((d) => ({
          title: typeof d.title === 'string' ? d.title : '',
          type: typeof d.type === 'string' ? d.type : undefined,
          institution: typeof d.institution === 'string' ? d.institution : undefined,
          trl: typeof d.trl === 'number' ? Math.max(1, Math.min(9, Math.round(d.trl))) : undefined,
        }))
        .filter((d) => d.title.length > 0)
    : [];

  return {
    companies,
    technologies,
    industries,
    signals,
    discoveries,
    is_relevant: typeof raw.is_relevant === 'boolean' ? raw.is_relevant : false,
    relevance_score: typeof raw.relevance_score === 'number'
      ? Math.max(0, Math.min(1, raw.relevance_score))
      : 0,
  };
}

// ─── Persist extracted entities ───────────────────────────────────────────────

type PersistCounts = {
  companies_upserted: number;
  technologies_upserted: number;
  signals_created: number;
  discoveries_created: number;
  total_entities: number;
};

async function persistEntities(
  extraction: ExtractionResult,
  item: RawFeedItemRow,
): Promise<PersistCounts> {
  let companiesUpserted = 0;
  let technologiesUpserted = 0;
  let signalsCreated = 0;
  let discoveriesCreated = 0;

  // ── Upsert companies ────────────────────────────────────────────────────────
  for (const company of extraction.companies) {
    const slug = toSlug(company.name);
    if (!slug) continue;

    const id = await upsertKgCompany({
      slug,
      name: company.name,
      industry: extraction.industries[0] ?? null,
      metadata: {
        extracted_from: item.id,
        country: company.country ?? null,
        company_type: company.type ?? null,
      },
    });
    if (id) companiesUpserted++;
  }

  // ── Upsert technologies ─────────────────────────────────────────────────────
  for (const tech of extraction.technologies) {
    const slug = toSlug(tech.name);
    if (!slug) continue;

    const id = await upsertKgTechnology({
      slug,
      name: tech.name,
      maturity: tech.maturity ?? null,
      tags: tech.industries ?? [],
      metadata: {
        extracted_from: item.id,
      },
    });
    if (id) technologiesUpserted++;
  }

  // ── Insert signals ──────────────────────────────────────────────────────────
  for (const signal of extraction.signals) {
    const id = await insertKgSignal({
      signal_type: signal.type,
      priority: signal.priority,
      title: signal.description.slice(0, 200),
      summary: signal.description,
      source_url: item.url,
      source_name: item.source_name ?? null,
      industry: extraction.industries[0] ?? null,
      tags: extraction.industries,
      metadata: {
        extracted_from: item.id,
        relevance_score: extraction.relevance_score,
      },
    });
    if (id) signalsCreated++;
  }

  // ── Insert discoveries ──────────────────────────────────────────────────────
  for (const discovery of extraction.discoveries) {
    const id = await insertKgDiscovery({
      type: discovery.type ?? 'technology',
      title: discovery.title,
      source_url: item.url,
      source_name: item.source_name ?? null,
      industry: extraction.industries[0] ?? null,
      tags: extraction.industries,
      metadata: {
        extracted_from: item.id,
        institution: discovery.institution ?? null,
        trl: discovery.trl ?? null,
      },
    });
    if (id) discoveriesCreated++;
  }

  const totalEntities =
    companiesUpserted + technologiesUpserted + signalsCreated + discoveriesCreated;

  return {
    companies_upserted: companiesUpserted,
    technologies_upserted: technologiesUpserted,
    signals_created: signalsCreated,
    discoveries_created: discoveriesCreated,
    total_entities: totalEntities,
  };
}

// ─── Main Agent ───────────────────────────────────────────────────────────────

const ZERO_RESULT: EntityExtractionResult = {
  items_processed: 0,
  entities_extracted: 0,
  companies_upserted: 0,
  technologies_upserted: 0,
  signals_created: 0,
  discoveries_created: 0,
  duration_ms: 0,
};

/**
 * Run the entity extraction agent.
 * Fetches unprocessed raw_feed_items, extracts entities via LLM,
 * persists relevant entities to the knowledge graph, and marks items processed.
 */
export async function runEntityExtractionAgent(
  batchSize?: number,
): Promise<EntityExtractionResult> {
  const startMs = Date.now();
  const limit = batchSize ?? 50;

  // ── 1. Check LLM availability ───────────────────────────────────────────────
  const provider = process.env.NXT_LINK_LLM_PROVIDER === 'gemini' ? 'Gemini' : 'Ollama';
  console.log(`[entity-extraction] LLM provider: ${provider}`);
  console.log(`[entity-extraction] GEMINI_API_KEY set: ${Boolean(process.env.GEMINI_API_KEY)}`);

  const llmReady = await isOllamaAvailable();
  console.log(`[entity-extraction] LLM ready: ${llmReady}`);
  if (!llmReady) {
    console.warn(`[entity-extraction] ${provider} is not available — skipping extraction`);
    return { ...ZERO_RESULT, duration_ms: Date.now() - startMs };
  }

  // ── 2. Fetch unprocessed items ──────────────────────────────────────────────
  console.log(`[entity-extraction] Fetching up to ${limit} unprocessed items...`);
  const items = await getUnprocessedFeedItems(limit);
  console.log(`[entity-extraction] Got ${items.length} unprocessed items`);
  if (items.length === 0) {
    console.log('[entity-extraction] No unprocessed items found');
    return { ...ZERO_RESULT, duration_ms: Date.now() - startMs };
  }

  console.log(`[entity-extraction] Processing ${items.length} items...`);

  let itemsProcessed = 0;
  let totalEntities = 0;
  let companiesUpserted = 0;
  let technologiesUpserted = 0;
  let signalsCreated = 0;
  let discoveriesCreated = 0;

  // ── 3. Process each item ────────────────────────────────────────────────────
  for (const item of items) {
    console.log(`[entity-extraction] --- Item ${itemsProcessed + 1}/${items.length}: "${item.title?.slice(0, 60)}"`);
    const text = buildItemText(item);
    console.log(`[entity-extraction]   Text length: ${text.length} chars`);
    if (!text.trim()) {
      console.log(`[entity-extraction]   SKIP: empty text`);
      await markFeedItemProcessed(item.id, { is_relevant: false, relevance_score: 0 });
      itemsProcessed++;
      continue;
    }

    const prompt = buildExtractionPrompt(text);
    console.log(`[entity-extraction]   Calling ${provider}...`);
    const rawResult = await ollamaExtractJSON<Record<string, unknown>>(prompt);

    if (!rawResult) {
      console.log(`[entity-extraction]   FAIL: LLM returned no valid JSON`);
      await markFeedItemProcessed(item.id, { extraction_error: 'json_parse_failed' });
      itemsProcessed++;
      continue;
    }

    const extraction = validateExtraction(rawResult);
    console.log(`[entity-extraction]   Extracted: ${extraction.companies.length} companies, ${extraction.technologies.length} techs, ${extraction.signals.length} signals, ${extraction.discoveries.length} discoveries`);
    console.log(`[entity-extraction]   Relevant: ${extraction.is_relevant}, score: ${extraction.relevance_score}`);

    // ── 4. Persist entities if relevant ─────────────────────────────────────
    if (extraction.is_relevant && extraction.relevance_score > 0.3) {
      console.log(`[entity-extraction]   Persisting entities to KG...`);
      const counts = await persistEntities(extraction, item);
      console.log(`[entity-extraction]   Persisted: ${counts.companies_upserted} companies, ${counts.technologies_upserted} techs, ${counts.signals_created} signals, ${counts.discoveries_created} discoveries`);
      companiesUpserted += counts.companies_upserted;
      technologiesUpserted += counts.technologies_upserted;
      signalsCreated += counts.signals_created;
      discoveriesCreated += counts.discoveries_created;
      totalEntities += counts.total_entities;
    } else {
      console.log(`[entity-extraction]   SKIP persist: not relevant enough`);
    }

    // ── 5. Mark item as processed ───────────────────────────────────────────
    const markOk = await markFeedItemProcessed(item.id, {
      companies: extraction.companies,
      technologies: extraction.technologies,
      industries: extraction.industries,
      signals: extraction.signals,
      discoveries: extraction.discoveries,
      is_relevant: extraction.is_relevant,
      relevance_score: extraction.relevance_score,
    });
    console.log(`[entity-extraction]   Mark processed: ${markOk ? 'OK' : 'FAILED'}`);

    itemsProcessed++;
  }

  const durationMs = Date.now() - startMs;
  console.log(
    `[entity-extraction] Done: ${itemsProcessed} items, ${totalEntities} entities in ${durationMs}ms`,
  );

  return {
    items_processed: itemsProcessed,
    entities_extracted: totalEntities,
    companies_upserted: companiesUpserted,
    technologies_upserted: technologiesUpserted,
    signals_created: signalsCreated,
    discoveries_created: discoveriesCreated,
    duration_ms: durationMs,
  };
}
