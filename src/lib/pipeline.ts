// ─── Signal Processing Pipeline ("The Brain") ────────────────────────────────
// Chains 5 stages: Extract → Classify → Embed → Connect → Score
// Each stage is fault-tolerant — if one fails, the others still run.

import { getEmbedding } from '@/lib/embeddings';
import { vectorUpsert, vectorSearch } from '@/lib/vector';
import { createConnection, graphQuery, isGraphEnabled } from '@/lib/graph';
import type { ConnectionType } from '@/lib/graph';
import { calculateIkerScore } from '@/lib/iker-score';

// ── Types ────────────────────────────────────────────────────────────────────

export type RawSignal = {
  id: string;
  title: string;
  summary: string;
  source?: string;
  source_url?: string;
  published_at?: string;
  raw_text?: string;
};

export type ExtractedEntities = {
  companies: string[];
  amounts: string[];
  locations: string[];
  technologies: string[];
};

export type SignalClassification = {
  type: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  confidence: number;
};

export type DetectedConnection = {
  target_signal_id: string;
  connection_type: ConnectionType;
  reason: string;
  score: number;
};

export type IkerUpdate = {
  company: string;
  previous_score: number | null;
  new_score: number;
  delta: number;
};

export type ProcessedSignal = {
  id: string;
  entities: ExtractedEntities;
  classification: SignalClassification;
  embedding_stored: boolean;
  connections: DetectedConnection[];
  iker_updates: IkerUpdate[];
  stages: {
    extract: 'ok' | 'error';
    classify: 'ok' | 'error';
    embed: 'ok' | 'skipped' | 'error';
    connect: 'ok' | 'error';
    score: 'ok' | 'error';
  };
  processed_at: string;
};

// ── Stage 1: Entity Extraction ───────────────────────────────────────────────

const COMPANY_RE = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+(?:\s+(?:Inc|Corp|LLC|Ltd|Co|Group|Holdings|Technologies|Energy|Solutions|Partners|Capital|Ventures|Labs|Systems)\.?)?)\b/g;
const AMOUNT_RE = /\$\s*(\d+(?:\.\d+)?)\s*(M|B|K|million|billion|thousand|mn|bn)/gi;
const LOCATION_RE = /\b(?:in|from|based in|headquartered in|across)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*(?:,\s*[A-Z]{2})?)\b/g;
const TECH_KEYWORDS = [
  'AI', 'machine learning', 'blockchain', 'cloud', 'IoT', 'SaaS', 'PaaS',
  'cybersecurity', 'quantum computing', 'edge computing', '5G', 'LLM',
  'solar', 'wind energy', 'battery storage', 'EV', 'hydrogen',
  'renewable', 'smart grid', 'nuclear', 'fusion', 'carbon capture',
  'semiconductor', 'robotics', 'autonomous', 'AR', 'VR', 'XR',
  'fintech', 'healthtech', 'cleantech', 'biotech', 'deeptech',
  'API', 'microservices', 'kubernetes', 'data analytics', 'NLP',
  'computer vision', 'generative AI', 'digital twin', 'ESG',
];

export function extractEntities(text: string): ExtractedEntities {
  const companies = new Set<string>();
  const amounts = new Set<string>();
  const locations = new Set<string>();
  const technologies = new Set<string>();

  // Company names
  let match: RegExpExecArray | null;
  const companyRe = new RegExp(COMPANY_RE.source, COMPANY_RE.flags);
  while ((match = companyRe.exec(text)) !== null) {
    const name = match[1].trim();
    // Filter out common false positives
    if (name.length > 3 && !STOP_PHRASES.has(name.toLowerCase())) {
      companies.add(name);
    }
  }

  // Dollar amounts
  const amountRe = new RegExp(AMOUNT_RE.source, AMOUNT_RE.flags);
  while ((match = amountRe.exec(text)) !== null) {
    const num = match[1];
    const unit = match[2].toUpperCase().replace('MILLION', 'M').replace('BILLION', 'B').replace('THOUSAND', 'K').replace('MN', 'M').replace('BN', 'B');
    amounts.add(`$${num}${unit}`);
  }

  // Locations
  const locationRe = new RegExp(LOCATION_RE.source, LOCATION_RE.flags);
  while ((match = locationRe.exec(text)) !== null) {
    const loc = match[1].trim();
    if (loc.length > 2 && !STOP_PHRASES.has(loc.toLowerCase())) {
      locations.add(loc);
    }
  }

  // Technologies (case-insensitive keyword match)
  const textLower = text.toLowerCase();
  for (const tech of TECH_KEYWORDS) {
    if (textLower.includes(tech.toLowerCase())) {
      technologies.add(tech);
    }
  }

  return {
    companies: [...companies],
    amounts: [...amounts],
    locations: [...locations],
    technologies: [...technologies],
  };
}

const STOP_PHRASES = new Set([
  'the company', 'the new', 'this week', 'last week', 'this year',
  'new york', 'los angeles', 'san francisco', 'el paso', 'united states',
  'north america', 'south america', 'press release', 'according to',
  'chief executive', 'chief technology', 'vice president',
]);

// ── Stage 2: Signal Classification ───────────────────────────────────────────

const SIGNAL_TYPE_KEYWORDS: Record<string, string[]> = {
  funding:        ['raised', 'funding', 'series a', 'series b', 'series c', 'seed round', 'investment', 'venture capital', 'vc', 'valuation', 'ipo', 'capital raise'],
  acquisition:    ['acquired', 'acquisition', 'merger', 'buyout', 'takeover', 'purchase', 'merged with', 'deal to buy'],
  product_launch: ['launched', 'launch', 'unveiled', 'released', 'new product', 'announced product', 'introduces', 'debut', 'rollout', 'general availability'],
  partnership:    ['partnership', 'partnered', 'collaboration', 'joint venture', 'teamed up', 'alliance', 'strategic agreement', 'mou'],
  expansion:      ['expansion', 'expanded', 'new office', 'new market', 'enters', 'opening', 'headquarter', 'relocated', 'new facility'],
  hiring:         ['hiring', 'hired', 'recruit', 'new ceo', 'new cto', 'appointed', 'onboarding', 'headcount', 'talent'],
  patent:         ['patent', 'intellectual property', 'ip filing', 'trademark'],
  regulatory:     ['regulation', 'regulatory', 'compliance', 'fda', 'sec', 'ftc', 'approved', 'cleared', 'sanctioned', 'fined', 'penalty'],
  layoff:         ['layoff', 'laid off', 'downsizing', 'restructuring', 'job cuts', 'workforce reduction', 'rif'],
};

const NEGATIVE_TYPES = new Set(['layoff', 'regulatory']);

export function classifySignal(
  text: string,
  entities: ExtractedEntities,
): SignalClassification {
  const textLower = text.toLowerCase();

  // Score each type by keyword hits
  let bestType = 'unknown';
  let bestScore = 0;

  for (const [type, keywords] of Object.entries(SIGNAL_TYPE_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (textLower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  const confidence = bestScore === 0 ? 0.1 : Math.min(bestScore / 3, 1.0);

  // Severity from financial amount
  const severity = determineSeverity(entities.amounts, bestType, textLower);

  return { type: bestType, severity, confidence: parseFloat(confidence.toFixed(2)) };
}

function determineSeverity(
  amounts: string[],
  signalType: string,
  textLower: string,
): 'P0' | 'P1' | 'P2' | 'P3' {
  // Check financial magnitude
  for (const amt of amounts) {
    const normalized = normalizeAmount(amt);
    if (normalized >= 100_000_000) return 'P0'; // $100M+
    if (normalized >= 10_000_000) return 'P1';  // $10M+
  }

  // Acquisitions and IPOs are at least P1
  if (signalType === 'acquisition') return 'P1';
  if (textLower.includes('ipo')) return 'P1';

  // Layoffs and regulatory actions are at least P2
  if (NEGATIVE_TYPES.has(signalType)) return 'P2';

  // Urgency keywords
  const urgentTerms = ['breaking', 'urgent', 'major', 'critical', 'unprecedented', 'exclusive'];
  if (urgentTerms.some(t => textLower.includes(t))) return 'P1';

  return 'P3';
}

function normalizeAmount(amount: string): number {
  const match = amount.match(/\$\s*([\d.]+)\s*(M|B|K)/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === 'B') return num * 1_000_000_000;
  if (unit === 'M') return num * 1_000_000;
  if (unit === 'K') return num * 1_000;
  return num;
}

// ── Stage 3: Embedding ───────────────────────────────────────────────────────

export async function embedSignal(
  signal: RawSignal,
  classification: SignalClassification,
): Promise<{ stored: boolean; vector: number[] | null }> {
  const text = `${signal.title}. ${signal.summary}`;
  const vector = await getEmbedding(text);

  if (!vector) {
    return { stored: false, vector: null };
  }

  const stored = await vectorUpsert('signals', signal.id, vector, {
    title: signal.title,
    source: signal.source ?? 'unknown',
    signal_type: classification.type,
    severity: classification.severity,
    published_at: signal.published_at ?? new Date().toISOString(),
  });

  return { stored, vector };
}

// ── Stage 4: Connection Detection ────────────────────────────────────────────

const TEMPORAL_WINDOW_DAYS = 7;

export async function detectConnections(
  signal: RawSignal,
  entities: ExtractedEntities,
  vector: number[] | null,
): Promise<DetectedConnection[]> {
  const connections: DetectedConnection[] = [];

  // 4a: Entity-based connections (same company name in recent signals)
  if (isGraphEnabled() && entities.companies.length > 0) {
    try {
      for (const company of entities.companies) {
        const results = await graphQuery(
          `MATCH (s:Signal)-[:MENTIONS]->(c:Company {name: $company})
           WHERE s.id <> $signalId
           RETURN s.id AS id, s.title AS title
           ORDER BY s.published_at DESC
           LIMIT 5`,
          { company, signalId: signal.id },
        );

        for (const row of results) {
          connections.push({
            target_signal_id: String(row.id),
            connection_type: 'entity',
            reason: `Both mention ${company}`,
            score: 0.8,
          });
        }
      }
    } catch (err) {
      console.warn('[pipeline:connect] Entity connection error:', err);
    }
  }

  // 4b: Temporal proximity (signals within 7 days)
  if (isGraphEnabled() && signal.published_at) {
    try {
      const pubDate = new Date(signal.published_at);
      const windowStart = new Date(pubDate.getTime() - TEMPORAL_WINDOW_DAYS * 86400000).toISOString();
      const windowEnd = new Date(pubDate.getTime() + TEMPORAL_WINDOW_DAYS * 86400000).toISOString();

      const results = await graphQuery(
        `MATCH (s:Signal)
         WHERE s.id <> $signalId
           AND s.published_at >= $windowStart
           AND s.published_at <= $windowEnd
         RETURN s.id AS id, s.title AS title
         LIMIT 10`,
        { signalId: signal.id, windowStart, windowEnd },
      );

      for (const row of results) {
        // Only add if not already connected via entity
        const alreadyConnected = connections.some(c => c.target_signal_id === String(row.id));
        if (!alreadyConnected) {
          connections.push({
            target_signal_id: String(row.id),
            connection_type: 'temporal',
            reason: `Published within ${TEMPORAL_WINDOW_DAYS} days`,
            score: 0.5,
          });
        }
      }
    } catch (err) {
      console.warn('[pipeline:connect] Temporal connection error:', err);
    }
  }

  // 4c: Vector similarity
  if (vector) {
    try {
      const similar = await vectorSearch('signals', vector, {
        limit: 5,
        threshold: 0.82,
        filter: { must_not: [{ key: 'id', match: { value: signal.id } }] },
      });

      for (const result of similar) {
        const alreadyConnected = connections.some(c => c.target_signal_id === result.id);
        if (!alreadyConnected) {
          connections.push({
            target_signal_id: result.id,
            connection_type: 'thematic',
            reason: `Semantic similarity: ${(result.score * 100).toFixed(0)}%`,
            score: result.score,
          });
        }
      }
    } catch (err) {
      console.warn('[pipeline:connect] Vector connection error:', err);
    }
  }

  // Store connections in graph
  for (const conn of connections) {
    try {
      await createConnection(signal.id, conn.target_signal_id, conn.connection_type, {
        reason: conn.reason,
        score: conn.score,
        detected_at: new Date().toISOString(),
      });
    } catch {
      // Non-critical — log and continue
    }
  }

  return connections;
}

// ── Stage 5: IKER Score Update ───────────────────────────────────────────────

const SIGNAL_IMPACT_MAP: Record<string, number> = {
  funding:        +8,
  partnership:    +5,
  product_launch: +4,
  expansion:      +6,
  hiring:         +3,
  patent:         +3,
  acquisition:    +2,   // neutral-ish, depends on context
  regulatory:     -5,
  layoff:         -7,
  unknown:         0,
};

export async function updateIkerScores(
  entities: ExtractedEntities,
  classification: SignalClassification,
): Promise<IkerUpdate[]> {
  const updates: IkerUpdate[] = [];

  if (!isGraphEnabled()) {
    // Without a graph DB, we can still calculate scores but cannot persist
    // Return theoretical impact for each company
    for (const company of entities.companies) {
      const impact = SIGNAL_IMPACT_MAP[classification.type] ?? 0;
      updates.push({
        company,
        previous_score: null,
        new_score: 50 + impact, // Assume neutral prior
        delta: impact,
      });
    }
    return updates;
  }

  for (const company of entities.companies) {
    try {
      // Look up existing vendor data from graph
      const results = await graphQuery(
        `MATCH (c:Company {name: $name})
         OPTIONAL MATCH (c)<-[:MENTIONS]-(s:Signal)
         RETURN c.iker_score AS current_score,
                count(s) AS signal_count,
                c.years_in_business AS years,
                c.employee_growth AS growth`,
        { name: company },
      );

      const row = results[0];
      const previousScore = row?.current_score as number | null;
      const signalCount = (row?.signal_count as number) ?? 0;

      // Calculate new score with signal as additional evidence
      const impact = SIGNAL_IMPACT_MAP[classification.type] ?? 0;
      const severityMultiplier = { P0: 2.0, P1: 1.5, P2: 1.0, P3: 0.7 }[classification.severity];
      const adjustedImpact = impact * severityMultiplier;

      // Use Bayesian calculation with signal evidence
      const breakdown = calculateIkerScore({
        signalMentions: signalCount + 1,
        yearsInBusiness: row?.years as number | undefined,
        employeeGrowth: row?.growth as 'growing' | 'stable' | 'declining' | undefined,
      });

      // Blend: existing Bayesian score + signal impact adjustment
      const baseScore = previousScore ?? breakdown.score;
      const newScore = Math.max(0, Math.min(100, Math.round(baseScore + adjustedImpact)));

      // Persist updated score
      await graphQuery(
        `MERGE (c:Company {name: $name})
         SET c.iker_score = $score, c.iker_updated_at = $now`,
        { name: company, score: newScore, now: new Date().toISOString() },
      );

      updates.push({
        company,
        previous_score: previousScore as number | null,
        new_score: newScore,
        delta: newScore - (previousScore ?? 50),
      });
    } catch (err) {
      console.warn(`[pipeline:iker] Score update failed for ${company}:`, err);
    }
  }

  return updates;
}

// ── Main Pipeline ────────────────────────────────────────────────────────────

export async function processSignal(raw: RawSignal): Promise<ProcessedSignal> {
  const text = `${raw.title}. ${raw.summary}. ${raw.raw_text ?? ''}`;
  const result: ProcessedSignal = {
    id: raw.id,
    entities: { companies: [], amounts: [], locations: [], technologies: [] },
    classification: { type: 'unknown', severity: 'P3', confidence: 0 },
    embedding_stored: false,
    connections: [],
    iker_updates: [],
    stages: {
      extract: 'error',
      classify: 'error',
      embed: 'error',
      connect: 'error',
      score: 'error',
    },
    processed_at: new Date().toISOString(),
  };

  // Stage 1: Extract
  try {
    result.entities = extractEntities(text);
    result.stages.extract = 'ok';
  } catch (err) {
    console.error('[pipeline:extract] Failed:', err);
  }

  // Stage 2: Classify
  try {
    result.classification = classifySignal(text, result.entities);
    result.stages.classify = 'ok';
  } catch (err) {
    console.error('[pipeline:classify] Failed:', err);
  }

  // Stage 3: Embed
  let vector: number[] | null = null;
  try {
    const embedResult = await embedSignal(raw, result.classification);
    result.embedding_stored = embedResult.stored;
    vector = embedResult.vector;
    result.stages.embed = embedResult.vector ? 'ok' : 'skipped';
  } catch (err) {
    console.error('[pipeline:embed] Failed:', err);
  }

  // Stage 4: Connect
  try {
    result.connections = await detectConnections(raw, result.entities, vector);
    result.stages.connect = 'ok';
  } catch (err) {
    console.error('[pipeline:connect] Failed:', err);
  }

  // Stage 5: IKER Score
  try {
    result.iker_updates = await updateIkerScores(result.entities, result.classification);
    result.stages.score = 'ok';
  } catch (err) {
    console.error('[pipeline:score] Failed:', err);
  }

  return result;
}
