// src/lib/agents/autonomous/auto-entity-registry.ts
// Autonomous Entity Discovery System
// Scans article clusters for unknown company/product mentions
// and automatically registers them into the NXT LINK knowledge graph.

import { NXT_ENTITIES } from '@/lib/intelligence/nxt-entities';
import type { ArticleCluster } from '@/lib/intelligence/signal-engine';
import { upsertEntity } from '@/db/queries/knowledge-graph';
import { isSupabaseConfigured } from '@/db/client';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CandidateEntity = {
  name: string;
  mentionCount: number;
  sourceCount: number;
  articles: Array<{ title: string; source: string }>;
  inferredSector: string;
  firstSeen: string; // ISO timestamp
};

export type EnrichedCandidate = CandidateEntity & {
  isValidTechCompany: boolean;
  confidence: number; // 0-1
  description: string;
  sector: string;
  country: string;
  keywords: string[];
  aliases: string[];
};

export type AutoDiscoveryResult = {
  detected: number;
  enriched: number;
  registered: number;
  newEntities: EnrichedCandidate[];
  runAt: string;
};

// ─── Internal: Gemini API response shape ───────────────────────────────────────

type GeminiEnrichmentRaw = {
  isRealTechCompany?: boolean;
  confidence?: number;
  sector?: string;
  description?: string;
  keywords?: string[];
  aliases?: string[];
  country?: string;
};

// ─── Constants ─────────────────────────────────────────────────────────────────

// Max new entities registered per discovery run (rate-limit guard)
const MAX_ENTITIES_PER_RUN = 5;

// Minimum evidence thresholds before a name is considered a candidate
const MIN_MENTION_COUNT = 3;
const MIN_SOURCE_COUNT = 2;

// Timeout for each Gemini enrichment call (ms)
const GEMINI_TIMEOUT_MS = 12_000;

// Patterns that identify company-like names:
//   - One or more title-cased words followed by a corporate suffix, OR
//   - Two or more title-cased words followed by an AI/tech suffix
const COMPANY_PATTERNS: RegExp[] = [
  // Hard corporate suffixes
  /\b([A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+){0,4})\s+(?:Inc|LLC|Corp|Ltd|PLC|AG|GmbH|SE|NV|SA|SAS|BV|Pty|Co)\b\.?/g,
  // Tech/industry descriptor suffixes
  /\b([A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+){0,3})\s+(?:Technologies|Technology|Systems|Solutions|Robotics|Dynamics|Aerospace|Defense|Networks|Security|Energy|Analytics|Labs|Laboratories|Intelligence|Software|Platform|Group|Industries|Ventures|Capital|Services|Engineering|Consulting|AI)\b/g,
  // Two-word TitleCase combos (e.g., "TechVision AI", "ClearPath Robotics")
  /\b([A-Z][A-Za-z]{2,}[A-Z][A-Za-z]+|[A-Z][A-Za-z]+\s[A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)?)\b/g,
];

// Words that look like company names but are common false-positive tokens
const STOPWORDS = new Set([
  'The', 'This', 'That', 'These', 'Those', 'With', 'From', 'Into', 'Over',
  'Under', 'After', 'Before', 'Since', 'About', 'Which', 'Where', 'When',
  'While', 'Their', 'There', 'They', 'Them', 'Then', 'Than', 'Also',
  'More', 'Most', 'Just', 'Only', 'Even', 'Both', 'Such', 'Each', 'Some',
  'Many', 'Much', 'Very', 'Very', 'Will', 'Would', 'Could', 'Should',
  'Have', 'Been', 'Were', 'Being', 'Said', 'Says', 'Make', 'Made', 'New',
  'Year', 'Years', 'Time', 'Times', 'Week', 'Month', 'April', 'March',
  'January', 'February', 'October', 'November', 'December', 'United',
  'States', 'Federal', 'National', 'State', 'American', 'Department',
  'House', 'Senate', 'Congress', 'White', 'Black', 'North', 'South',
  'East', 'West', 'First', 'Second', 'Third', 'Trump', 'Biden',
  'President', 'Secretary', 'General', 'Director', 'Chief', 'Officer',
  'War', 'Army', 'Navy', 'Force', 'Forces', 'Street', 'Avenue', 'Road',
]);

// Sector inference keywords (ordered: first match wins)
const SECTOR_INFERENCE: Array<{ keywords: string[]; sector: string }> = [
  { keywords: ['defense', 'military', 'army', 'navy', 'missile', 'weapon', 'pentagon', 'dod', 'nato'], sector: 'Defense Tech' },
  { keywords: ['border', 'customs', 'cbp', 'immigration', 'dhs', 'surveillance'], sector: 'Border Tech' },
  { keywords: ['cyber', 'security', 'ransomware', 'threat', 'hack', 'breach', 'zero-day', 'soc'], sector: 'Global Cybersecurity' },
  { keywords: ['robot', 'robotics', 'autonomous', 'drone', 'uav', 'uas', 'lidar', 'actuator'], sector: 'Robotics & Automation' },
  { keywords: ['semiconductor', 'chip', 'gpu', 'cpu', 'wafer', 'fab', 'foundry', 'transistor'], sector: 'Semiconductor' },
  { keywords: ['logistics', 'supply chain', 'freight', 'shipping', 'warehouse', 'fulfilment', 'trucking'], sector: 'Logistics' },
  { keywords: ['energy', 'solar', 'wind', 'battery', 'grid', 'nuclear', 'hydrogen', 'power'], sector: 'Energy Tech' },
  { keywords: ['ai', 'machine learning', 'llm', 'generative', 'neural', 'deep learning', 'model'], sector: 'AI / R&D' },
  { keywords: ['health', 'medical', 'pharma', 'biotech', 'clinical', 'diagnostic', 'hospital'], sector: 'Health Tech' },
  { keywords: ['water', 'desalination', 'wastewater', 'treatment', 'irrigation', 'aquifer'], sector: 'Water Tech' },
  { keywords: ['manufacturing', 'industrial', 'cnc', 'assembly', 'factory', 'production'], sector: 'Manufacturing Tech' },
];

// ─── In-memory buffer (fallback when Supabase is not configured) ───────────────

const DISCOVERY_BUFFER: EnrichedCandidate[] = [];

// ─── Known-entity alias set (built once, reused every run) ────────────────────

let _knownAliasSet: Set<string> | null = null;

function getKnownAliasSet(): Set<string> {
  if (_knownAliasSet) return _knownAliasSet;

  const set = new Set<string>();
  for (const entity of NXT_ENTITIES) {
    set.add(entity.name.toLowerCase());
    for (const alias of entity.aliases) {
      set.add(alias.toLowerCase());
    }
    for (const kw of entity.keywords) {
      // Only add short keywords (likely proper nouns) to reduce false negatives
      if (kw.split(' ').length <= 3) set.add(kw.toLowerCase());
    }
  }
  _knownAliasSet = set;
  return set;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function extractTextFromCluster(cluster: ArticleCluster): string {
  return cluster.articles
    .map((a) => `${a.title} ${a.description ?? ''}`)
    .join(' ');
}

function inferSector(text: string): string {
  const lower = text.toLowerCase();
  for (const { keywords, sector } of SECTOR_INFERENCE) {
    if (keywords.some((kw) => lower.includes(kw))) return sector;
  }
  return 'Global AI';
}

function extractCandidateNames(text: string): string[] {
  const found = new Set<string>();

  for (const pattern of COMPANY_PATTERNS) {
    // Reset lastIndex between uses of global regexes
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const name = (match[1] ?? match[0]).trim();
      if (name.length >= 4 && name.length <= 60 && !STOPWORDS.has(name.split(' ')[0])) {
        found.add(name);
      }
    }
  }

  return Array.from(found);
}

function isKnownEntity(name: string): boolean {
  const known = getKnownAliasSet();
  const lower = name.toLowerCase();
  // Exact match or starts-with check against known aliases
  if (known.has(lower)) return true;
  for (const alias of known) {
    if (alias.startsWith(lower) || lower.startsWith(alias)) return true;
  }
  return false;
}

// ─── 1. detectCandidateEntities ───────────────────────────────────────────────

/**
 * Scans article clusters for mentions of unknown company-like names.
 * A name must appear 3+ times across 2+ distinct sources to be returned.
 */
export function detectCandidateEntities(clusters: ArticleCluster[]): CandidateEntity[] {
  const now = new Date().toISOString();

  // name → { mentions: [{title, source}], sources: Set<string> }
  const tally = new Map<string, {
    articles: Array<{ title: string; source: string }>;
    sources: Set<string>;
    contextText: string;
  }>();

  for (const cluster of clusters) {
    const clusterText = extractTextFromCluster(cluster);
    const names = extractCandidateNames(clusterText);

    for (const name of names) {
      if (isKnownEntity(name)) continue;

      const existing = tally.get(name);
      const newArticles = cluster.articles.map((a) => ({ title: a.title, source: a.source }));

      if (existing) {
        for (const art of newArticles) {
          existing.articles.push(art);
          existing.sources.add(art.source);
        }
        existing.contextText += ' ' + clusterText;
      } else {
        tally.set(name, {
          articles: [...newArticles],
          sources: new Set(newArticles.map((a) => a.source)),
          contextText: clusterText,
        });
      }
    }
  }

  const candidates: CandidateEntity[] = [];

  for (const [name, data] of tally.entries()) {
    if (data.articles.length < MIN_MENTION_COUNT) continue;
    if (data.sources.size < MIN_SOURCE_COUNT) continue;

    candidates.push({
      name,
      mentionCount: data.articles.length,
      sourceCount: data.sources.size,
      articles: data.articles.slice(0, 10), // cap for storage
      inferredSector: inferSector(data.contextText),
      firstSeen: now,
    });
  }

  // Sort by mention count descending
  return candidates.sort((a, b) => b.mentionCount - a.mentionCount);
}

// ─── 2. enrichCandidate ────────────────────────────────────────────────────────

/**
 * Calls Gemini to validate and enrich a candidate entity.
 * Returns null if Gemini classifies it as not a valid tech company.
 */
export async function enrichCandidate(
  candidate: CandidateEntity,
  geminiApiKey: string,
): Promise<EnrichedCandidate | null> {
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;

  const sampleTitles = candidate.articles
    .slice(0, 5)
    .map((a) => `"${a.title}" (${a.source})`)
    .join('\n');

  const prompt = `You are an entity classification assistant for a technology intelligence platform.

Analyze the following company/organization name and sample articles it appeared in, then answer all questions in the JSON format shown.

Company name: "${candidate.name}"
Inferred sector: ${candidate.inferredSector}
Mentioned ${candidate.mentionCount} times across ${candidate.sourceCount} news sources.

Sample article headlines:
${sampleTitles}

Respond ONLY with a JSON object matching this exact schema — no markdown, no prose:
{
  "isRealTechCompany": true or false,
  "confidence": 0.0 to 1.0,
  "sector": "one of: Defense Tech | Border Tech | AI / R&D | Cybersecurity | Logistics | Energy Tech | Health Tech | Water Tech | Robotics & Automation | Semiconductor | Manufacturing Tech | Global Supply Chain | Global Defense | Other",
  "description": "One sentence describing what this company does.",
  "keywords": ["up to 8 tracking keywords"],
  "aliases": ["alternate names or abbreviations, lowercased"],
  "country": "ISO country name, e.g. United States"
}

Rules:
- Set isRealTechCompany to false if the name is a government agency, a common phrase, a news publication, a person's name, or clearly not a technology company.
- Set confidence below 0.5 if you are uncertain.
- Keep description under 120 characters.`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const payload = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    let parsed: GeminiEnrichmentRaw;
    try {
      parsed = JSON.parse(rawText) as GeminiEnrichmentRaw;
    } catch {
      // Attempt to extract JSON block from partial response
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      try {
        parsed = JSON.parse(jsonMatch[0]) as GeminiEnrichmentRaw;
      } catch {
        return null;
      }
    }

    const isValid = parsed.isRealTechCompany === true;
    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0;

    // Reject low-confidence or invalid classifications
    if (!isValid || confidence < 0.4) return null;

    return {
      ...candidate,
      isValidTechCompany: true,
      confidence,
      description: typeof parsed.description === 'string' ? parsed.description.slice(0, 200) : '',
      sector: typeof parsed.sector === 'string' ? parsed.sector : candidate.inferredSector,
      country: typeof parsed.country === 'string' ? parsed.country : 'Unknown',
      keywords: Array.isArray(parsed.keywords)
        ? (parsed.keywords as unknown[]).filter((k): k is string => typeof k === 'string').slice(0, 8)
        : [],
      aliases: Array.isArray(parsed.aliases)
        ? (parsed.aliases as unknown[]).filter((a): a is string => typeof a === 'string').map((a) => a.toLowerCase())
        : [candidate.name.toLowerCase()],
    };
  } catch {
    return null;
  }
}

// ─── 3. autoRegisterEntity ─────────────────────────────────────────────────────

/**
 * Persists an enriched candidate to Supabase (discovered_entities table)
 * or falls back to the in-memory buffer.
 * Returns 'skipped' if already registered, 'registered' on success, 'error' on failure.
 */
export async function autoRegisterEntity(
  enriched: EnrichedCandidate,
): Promise<'registered' | 'skipped' | 'error'> {
  // Check in-memory buffer for duplicates (regardless of Supabase state)
  const alreadyBuffered = DISCOVERY_BUFFER.some(
    (e) => e.name.toLowerCase() === enriched.name.toLowerCase(),
  );
  if (alreadyBuffered) return 'skipped';

  if (isSupabaseConfigured()) {
    try {
      const slug = toSlug(enriched.name);

      const entityId = await upsertEntity({
        entity_type: 'company',
        name: enriched.name,
        slug,
        description: enriched.description || null,
        metadata: {
          autoDiscovered: true,
          sector: enriched.sector,
          country: enriched.country,
          confidence: enriched.confidence,
          mentionCount: enriched.mentionCount,
          sourceCount: enriched.sourceCount,
          firstSeen: enriched.firstSeen,
          discoveredAt: new Date().toISOString(),
        },
        aliases: enriched.aliases,
      });

      if (!entityId) return 'error';

      // Also track in the buffer so this run doesn't double-register
      DISCOVERY_BUFFER.push(enriched);
      return 'registered';
    } catch {
      return 'error';
    }
  }

  // Supabase not configured — store in-memory only
  DISCOVERY_BUFFER.push(enriched);
  return 'registered';
}

// ─── 4. runAutoDiscovery ───────────────────────────────────────────────────────

/**
 * Full autonomous discovery pipeline.
 *
 * 1. Detect candidate entities from article clusters.
 * 2. Optionally enrich top candidates via Gemini.
 * 3. Register enriched (or raw) candidates.
 *
 * Rate-limited to MAX_ENTITIES_PER_RUN new entities per call.
 */
export async function runAutoDiscovery(
  clusters: ArticleCluster[],
  geminiApiKey?: string,
): Promise<AutoDiscoveryResult> {
  const runAt = new Date().toISOString();

  // Step 1 — Detect
  const candidates = detectCandidateEntities(clusters);
  const detected = candidates.length;

  if (detected === 0) {
    return { detected: 0, enriched: 0, registered: 0, newEntities: [], runAt };
  }

  // Apply per-run cap — take the highest-signal candidates first
  const toProcess = candidates.slice(0, MAX_ENTITIES_PER_RUN);

  let enrichedCount = 0;
  let registeredCount = 0;
  const newEntities: EnrichedCandidate[] = [];

  for (const candidate of toProcess) {
    let enriched: EnrichedCandidate | null = null;

    // Step 2 — Enrich (if API key available)
    if (geminiApiKey) {
      enriched = await enrichCandidate(candidate, geminiApiKey);
    } else {
      // No API key: synthesise a minimal EnrichedCandidate so we can still register
      enriched = {
        ...candidate,
        isValidTechCompany: true,   // assume valid; user can review later
        confidence: 0,               // explicit zero = not Gemini-validated
        description: '',
        sector: candidate.inferredSector,
        country: 'Unknown',
        keywords: [],
        aliases: [candidate.name.toLowerCase()],
      };
    }

    if (!enriched) continue; // Gemini rejected as invalid

    if (geminiApiKey) enrichedCount++;

    // Step 3 — Register
    const result = await autoRegisterEntity(enriched);
    if (result === 'registered') {
      registeredCount++;
      newEntities.push(enriched);
    }
  }

  return {
    detected,
    enriched: enrichedCount,
    registered: registeredCount,
    newEntities,
    runAt,
  };
}

// ─── 5. getDiscoveredEntities ──────────────────────────────────────────────────

/**
 * Returns all entities discovered in the current process lifetime
 * (in-memory buffer). Used by the homepage to surface new discoveries.
 */
export function getDiscoveredEntities(): EnrichedCandidate[] {
  return [...DISCOVERY_BUFFER];
}
