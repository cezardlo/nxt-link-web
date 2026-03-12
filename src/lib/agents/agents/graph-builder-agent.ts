// src/lib/agents/agents/graph-builder-agent.ts
// Graph Builder Agent — transforms intel signals into knowledge graph nodes and edges.
// Pure algorithmic (no LLM, free). Runs after discovery agents in the cron pipeline.
//
// Pipeline per signal:
//   1. Extract candidate entities (company, technology, industry)
//   2. Resolve against existing entities (slug → name → alias)
//   3. Create new entities if needed
//   4. Create or strengthen relationships (evidence_count, confidence, last_seen_at)
//   5. Link signal to entities in signal_entity_links
//
// Health rules:
//   - Max 10 relationships per signal
//   - Min confidence 0.5 for entity creation
//   - Auto-industry discovery deferred (only runs when explicitly enabled)

import { isSupabaseConfigured, getDb } from '@/db/client';
import { getIntelSignals, type IntelSignalRow } from '@/db/queries/intel-signals';
import {
  upsertEntity,
  addRelationship,
  resolveEntity,
  type EntityType,
  type RelationshipType,
} from '@/db/queries/knowledge-graph';
import { TECHNOLOGY_CATALOG, INDUSTRIES } from '@/lib/data/technology-catalog';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type GraphBuilderResult = {
  entities_created: number;
  relationships_created: number;
  relationships_strengthened: number;
  signals_processed: number;
  industries_discovered: number;
  duration_ms: number;
};

// ─── Health Rules ───────────────────────────────────────────────────────────────

const MAX_RELATIONSHIPS_PER_SIGNAL = 10;
const MIN_CONFIDENCE_FOR_ENTITY = 0.5;

// ─── Industry Mapping ───────────────────────────────────────────────────────────

const INDUSTRY_SLUG_MAP: Record<string, string> = {
  health_biotech: 'healthcare',
  manufacturing: 'manufacturing',
  aerospace_defense: 'defense',
  agriculture: 'agriculture',
  construction: 'construction',
  energy: 'energy',
  fintech: 'fintech',
  cybersecurity: 'cybersecurity',
  ai_ml: 'ai-ml',
  supply_chain: 'logistics',
  general: 'general',
};

const INDUSTRY_LABEL_MAP: Record<string, string> = {
  health_biotech: 'Healthcare & Biotech',
  manufacturing: 'Manufacturing',
  aerospace_defense: 'Defense & Aerospace',
  agriculture: 'Agriculture',
  construction: 'Construction',
  energy: 'Energy',
  fintech: 'Fintech',
  cybersecurity: 'Cybersecurity',
  ai_ml: 'AI/ML',
  supply_chain: 'Supply Chain & Logistics',
  general: 'General',
};

const INDUSTRY_ALIASES: Record<string, string[]> = {
  health_biotech: ['Healthcare', 'Biotech', 'Health Technology', 'MedTech', 'Life Sciences'],
  manufacturing: ['Manufacturing', 'Industrial', 'Factory Automation'],
  aerospace_defense: ['Defense', 'Aerospace', 'Military', 'DoD'],
  agriculture: ['Agriculture', 'AgTech', 'Farming', 'Food Technology'],
  construction: ['Construction', 'ConTech', 'Building Technology'],
  energy: ['Energy', 'CleanTech', 'Renewables', 'Oil & Gas', 'Solar', 'Wind'],
  fintech: ['Fintech', 'Financial Technology', 'Banking Technology'],
  cybersecurity: ['Cybersecurity', 'InfoSec', 'Security', 'Cyber Defense'],
  ai_ml: ['AI/ML', 'Artificial Intelligence', 'Machine Learning', 'Deep Learning'],
  supply_chain: ['Supply Chain', 'Logistics', 'Warehousing', 'Freight'],
};

// ─── Relationship Rules per Signal Type ─────────────────────────────────────────
// Standardized directional rules:
//   company BUILDS product
//   company CREATES technology (patents/research)
//   company BELONGS_TO industry
//   company USES technology
//   signal OCCURS_IN industry
//   signal RELATED_TO company

type RelationshipRule = {
  companyToTech: RelationshipType;
  companyToIndustry: RelationshipType;
  signalToIndustry: RelationshipType;
  signalToCompany: RelationshipType;
  techToIndustry: RelationshipType;
};

const SIGNAL_TYPE_RULES: Record<string, RelationshipRule> = {
  patent_filing: {
    companyToTech: 'creates',
    companyToIndustry: 'belongs_to',
    signalToIndustry: 'occurs_in',
    signalToCompany: 'related_to',
    techToIndustry: 'belongs_to',
  },
  research_paper: {
    companyToTech: 'creates',
    companyToIndustry: 'belongs_to',
    signalToIndustry: 'occurs_in',
    signalToCompany: 'related_to',
    techToIndustry: 'belongs_to',
  },
  funding_round: {
    companyToTech: 'uses',
    companyToIndustry: 'belongs_to',
    signalToIndustry: 'occurs_in',
    signalToCompany: 'related_to',
    techToIndustry: 'belongs_to',
  },
  product_launch: {
    companyToTech: 'builds',
    companyToIndustry: 'belongs_to',
    signalToIndustry: 'occurs_in',
    signalToCompany: 'related_to',
    techToIndustry: 'belongs_to',
  },
  contract_award: {
    companyToTech: 'uses',
    companyToIndustry: 'belongs_to',
    signalToIndustry: 'occurs_in',
    signalToCompany: 'related_to',
    techToIndustry: 'belongs_to',
  },
  hiring_signal: {
    companyToTech: 'uses',
    companyToIndustry: 'belongs_to',
    signalToIndustry: 'occurs_in',
    signalToCompany: 'related_to',
    techToIndustry: 'belongs_to',
  },
  merger_acquisition: {
    companyToTech: 'uses',
    companyToIndustry: 'belongs_to',
    signalToIndustry: 'occurs_in',
    signalToCompany: 'related_to',
    techToIndustry: 'belongs_to',
  },
  regulatory_action: {
    companyToTech: 'uses',
    companyToIndustry: 'belongs_to',
    signalToIndustry: 'occurs_in',
    signalToCompany: 'affects',
    techToIndustry: 'belongs_to',
  },
  facility_expansion: {
    companyToTech: 'uses',
    companyToIndustry: 'belongs_to',
    signalToIndustry: 'occurs_in',
    signalToCompany: 'related_to',
    techToIndustry: 'belongs_to',
  },
  case_study: {
    companyToTech: 'uses',
    companyToIndustry: 'belongs_to',
    signalToIndustry: 'occurs_in',
    signalToCompany: 'related_to',
    techToIndustry: 'belongs_to',
  },
};

const DEFAULT_RULES: RelationshipRule = {
  companyToTech: 'uses',
  companyToIndustry: 'belongs_to',
  signalToIndustry: 'occurs_in',
  signalToCompany: 'related_to',
  techToIndustry: 'belongs_to',
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Normalize company name — strip suffixes like Inc, Ltd, Corp */
function normalizeCompanyName(name: string): string {
  return name
    .replace(/,?\s*(inc\.?|ltd\.?|corp\.?|llc\.?|co\.?|plc\.?|gmbh|s\.a\.?)$/i, '')
    .trim();
}

/** Find the best-matching technology from the catalog based on signal title keywords */
function matchTechnology(title: string): { id: string; name: string } | null {
  const lower = title.toLowerCase();
  for (const tech of TECHNOLOGY_CATALOG) {
    const words = tech.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const matches = words.filter(w => lower.includes(w));
    if (matches.length >= 1 && words.length <= 3) return { id: tech.id, name: tech.name };
    if (matches.length >= 2) return { id: tech.id, name: tech.name };
  }
  return null;
}

/** Link a signal to an entity in signal_entity_links */
async function linkSignalToEntity(
  signalId: string,
  entityId: string,
  role: string,
  confidence: number = 0.7,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const db = getDb({ admin: true });

  // Upsert — unique index on (signal_id, entity_id, role) handles dedup
  await db.from('signal_entity_links').upsert(
    {
      signal_id: signalId,
      entity_id: entityId,
      role,
      confidence: Math.max(0, Math.min(confidence, 1)),
    },
    { onConflict: 'signal_id,entity_id,role' },
  );
}

// ─── Auto-Industry Discovery ────────────────────────────────────────────────────

/** Check if an industry keyword appears in 3+ signals but isn't a known industry */
async function discoverNewIndustries(signals: IntelSignalRow[]): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const knownSlugs = new Set<string>(INDUSTRIES.map(i => i.slug));
  const knownIndustryKeys = new Set(Object.keys(INDUSTRY_SLUG_MAP));
  const unknownCounts = new Map<string, number>();

  for (const s of signals) {
    if (!knownIndustryKeys.has(s.industry)) {
      const count = unknownCounts.get(s.industry) ?? 0;
      unknownCounts.set(s.industry, count + 1);
    }
  }

  let discovered = 0;
  const db = getDb({ admin: true });

  for (const [industryKey, count] of Array.from(unknownCounts.entries() as Iterable<[string, number]>)) {
    if (count < 3) continue;

    const slug = slugify(industryKey);
    if (knownSlugs.has(slug)) continue;

    const { data: existing } = await db
      .from('dynamic_industries')
      .select('id')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle();

    if (existing) continue;

    const label = industryKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const colors = ['#00d4ff', '#f97316', '#ffd700', '#00ff88', '#a855f7', '#ff3b30'];
    const color = colors[discovered % colors.length];

    await db.from('dynamic_industries').insert({
      slug,
      label,
      color,
      description: `Auto-discovered industry with ${count} intelligence signals.`,
      signal_count: count,
      is_core: false,
      popularity: 0,
      review_status: 'pending',
    });

    await upsertEntity({
      entity_type: 'industry' as EntityType,
      name: label,
      slug,
      description: `Auto-discovered industry with ${count} intelligence signals.`,
      metadata: { auto_discovered: true, signal_count: count },
    });

    discovered++;
  }

  return discovered;
}

// ─── Main Agent ─────────────────────────────────────────────────────────────────

export async function runGraphBuilderAgent(options?: {
  enableAutoDiscovery?: boolean;
}): Promise<GraphBuilderResult> {
  const start = Date.now();
  const enableAutoDiscovery = options?.enableAutoDiscovery ?? false;

  if (!isSupabaseConfigured()) {
    return {
      entities_created: 0,
      relationships_created: 0,
      relationships_strengthened: 0,
      signals_processed: 0,
      industries_discovered: 0,
      duration_ms: Date.now() - start,
    };
  }

  const signals = await getIntelSignals({ limit: 500 });

  if (signals.length === 0) {
    return {
      entities_created: 0,
      relationships_created: 0,
      relationships_strengthened: 0,
      signals_processed: 0,
      industries_discovered: 0,
      duration_ms: Date.now() - start,
    };
  }

  let entitiesCreated = 0;
  let relationshipsCreated = 0;
  const relationshipsStrengthened = 0;

  // ── Step A: Ensure all core industries exist as entities ──

  for (const [key, slug] of Object.entries(INDUSTRY_SLUG_MAP)) {
    const label = INDUSTRY_LABEL_MAP[key] ?? key;
    const aliases = INDUSTRY_ALIASES[key] ?? [];
    const id = await upsertEntity({
      entity_type: 'industry' as EntityType,
      name: label,
      slug,
      description: `${label} industry sector`,
      metadata: { industry_key: key },
      aliases,
    });
    if (id) entitiesCreated++;
  }

  // ── Step B-F: Process each signal through the full pipeline ──

  const entityIdCache = new Map<string, string>();

  async function resolveOrCreate(
    type: EntityType,
    name: string,
    slug: string,
    description?: string,
    metadata?: Record<string, unknown>,
    aliases?: string[],
  ): Promise<string | null> {
    const cacheKey = `${type}:${slug}`;
    const cached = entityIdCache.get(cacheKey);
    if (cached) return cached;

    // Step B: Try to resolve existing entity (slug → name → alias)
    const existingId = await resolveEntity(name, type);
    if (existingId) {
      entityIdCache.set(cacheKey, existingId);
      return existingId;
    }

    // Step C: Create new entity
    const id = await upsertEntity({
      entity_type: type,
      name,
      slug,
      description,
      metadata,
      aliases,
    });
    if (id) {
      entityIdCache.set(cacheKey, id);
      entitiesCreated++;
    }
    return id;
  }

  /** Track relationship count per signal (health rule: max 10) */
  async function addRelWithLimit(
    sourceId: string,
    targetId: string,
    type: RelationshipType,
    confidence: number,
    relCount: number,
  ): Promise<{ relId: string | null; count: number }> {
    if (relCount >= MAX_RELATIONSHIPS_PER_SIGNAL) {
      return { relId: null, count: relCount };
    }
    const relId = await addRelationship(sourceId, targetId, type, confidence, 'graph-builder-agent');
    if (relId) {
      // addRelationship returns existing ID when strengthening, new ID when creating
      relationshipsCreated++;
    }
    return { relId, count: relCount + 1 };
  }

  for (const signal of signals) {
    // Skip low-confidence signals
    if (signal.confidence < MIN_CONFIDENCE_FOR_ENTITY) continue;

    let relCount = 0;
    const rules = SIGNAL_TYPE_RULES[signal.signal_type] ?? DEFAULT_RULES;

    // Step B1: Industry entity
    const industrySlug = INDUSTRY_SLUG_MAP[signal.industry] ?? slugify(signal.industry);
    const industryLabel = INDUSTRY_LABEL_MAP[signal.industry] ?? signal.industry;
    const industryId = await resolveOrCreate(
      'industry',
      industryLabel,
      industrySlug,
      `${industryLabel} sector`,
    );

    // Step B2: Company entity (with normalized name + aliases)
    let companyId: string | null = null;
    if (signal.company) {
      const normalized = normalizeCompanyName(signal.company);
      const companySlug = slugify(normalized);
      const companyAliases = normalized !== signal.company ? [signal.company] : [];

      companyId = await resolveOrCreate(
        'company',
        normalized,
        companySlug,
        undefined,
        {
          source_signal: signal.signal_type,
          first_seen: signal.discovered_at,
        },
        companyAliases,
      );

      // Step D: company BELONGS_TO industry
      if (companyId && industryId) {
        const result = await addRelWithLimit(
          companyId, industryId, rules.companyToIndustry, signal.confidence, relCount,
        );
        relCount = result.count;
      }
    }

    // Step B3: Technology entity (match from catalog)
    const matchedTech = matchTechnology(signal.title);
    let techId: string | null = null;
    if (matchedTech) {
      techId = await resolveOrCreate(
        'technology',
        matchedTech.name,
        slugify(matchedTech.name),
        undefined,
        { catalog_id: matchedTech.id },
      );

      // Step D: technology BELONGS_TO industry
      if (techId && industryId) {
        const result = await addRelWithLimit(
          techId, industryId, rules.techToIndustry, 0.8, relCount,
        );
        relCount = result.count;
      }

      // Step D: company → technology (creates/uses/builds per signal type)
      if (companyId && techId) {
        const result = await addRelWithLimit(
          companyId, techId, rules.companyToTech, signal.confidence, relCount,
        );
        relCount = result.count;
      }
    }

    // Step B4: Signal entity (the signal itself becomes a node)
    const signalEntityId = await resolveOrCreate(
      'signal',
      signal.title.slice(0, 200),
      `signal-${signal.id}`,
      signal.evidence ?? undefined,
      {
        signal_type: signal.signal_type,
        importance: signal.importance_score,
        source: signal.source,
        url: signal.url,
        amount_usd: signal.amount_usd,
      },
    );

    // Step D: signal OCCURS_IN industry
    if (signalEntityId && industryId) {
      const result = await addRelWithLimit(
        signalEntityId, industryId, rules.signalToIndustry, signal.confidence, relCount,
      );
      relCount = result.count;
    }

    // Step D: signal → company
    if (signalEntityId && companyId) {
      const result = await addRelWithLimit(
        signalEntityId, companyId, rules.signalToCompany, signal.confidence, relCount,
      );
      relCount = result.count;
    }

    // Step E: Link signal to entities in signal_entity_links
    if (industryId) await linkSignalToEntity(signal.id, industryId, 'industry', signal.confidence);
    if (companyId) await linkSignalToEntity(signal.id, companyId, 'subject', signal.confidence);
    if (techId) await linkSignalToEntity(signal.id, techId, 'technology', 0.7);
  }

  // ── Step H: Auto-discover new industries (only when enabled) ──

  let industriesDiscovered = 0;
  if (enableAutoDiscovery) {
    industriesDiscovered = await discoverNewIndustries(signals);
  }

  return {
    entities_created: entitiesCreated,
    relationships_created: relationshipsCreated,
    relationships_strengthened: relationshipsStrengthened,
    signals_processed: signals.length,
    industries_discovered: industriesDiscovered,
    duration_ms: Date.now() - start,
  };
}
