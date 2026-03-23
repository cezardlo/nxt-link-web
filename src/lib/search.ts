// ─── Hybrid Search — Keyword + Vector + Graph ────────────────────────────────
// Combines three search modalities with Reciprocal Rank Fusion (RRF).
// Degrades gracefully: works with keyword-only if vector/graph aren't configured.

import { supabase } from '@/lib/supabase';
import { getEmbedding, isEmbeddingEnabled } from '@/lib/embeddings';
import { vectorSearch, isVectorEnabled } from '@/lib/vector';
import { graphQuery, isGraphEnabled } from '@/lib/graph';

export type SearchResult = {
  id: string;
  title: string;
  score: number;
  source: 'keyword' | 'vector' | 'graph' | 'fused';
  highlights?: string[];
  metadata?: Record<string, unknown>;
};

export type SearchOptions = {
  limit?: number;
  severity?: string[];
  industries?: string[];
  vendors?: string[];
};

/**
 * Hybrid search across all available backends.
 * Uses Reciprocal Rank Fusion to merge results from keyword, vector, and graph search.
 */
export async function hybridSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { limit = 20, severity, industries } = options;

  // Launch all available searches in parallel
  const [keywordResults, vectorResults, graphResults] = await Promise.all([
    keywordSearch(query, { limit, severity, industries }),
    semanticSearch(query, { limit, severity }),
    graphSearch(query, { limit }),
  ]);

  // If only keyword search returned results, return them directly
  if (vectorResults.length === 0 && graphResults.length === 0) {
    return keywordResults.slice(0, limit);
  }

  // Reciprocal Rank Fusion
  const fused = reciprocalRankFusion([
    { results: keywordResults, weight: 0.3 },
    { results: vectorResults, weight: 0.5 },
    { results: graphResults, weight: 0.2 },
  ]);

  return fused.slice(0, limit);
}

/** PostgreSQL full-text search via Supabase */
async function keywordSearch(
  query: string,
  options: { limit: number; severity?: string[]; industries?: string[] }
): Promise<SearchResult[]> {
  if (!supabase) return [];

  try {
    let q = supabase
      .from('intel_signals')
      .select('id, title, summary, severity, industry')
      .textSearch('title', query, { type: 'websearch' })
      .order('detected_at', { ascending: false })
      .limit(options.limit);

    if (options.severity?.length) {
      q = q.in('severity', options.severity);
    }

    const { data } = await q;
    return (data ?? []).map((row, i) => ({
      id: row.id,
      title: row.title,
      score: 1 / (i + 1), // rank-based score
      source: 'keyword' as const,
      metadata: { severity: row.severity, industry: row.industry },
    }));
  } catch (err) {
    console.warn('[search] keyword search failed:', err);
    return [];
  }
}

/** Vector similarity search via Qdrant */
async function semanticSearch(
  query: string,
  options: { limit: number; severity?: string[] }
): Promise<SearchResult[]> {
  if (!isEmbeddingEnabled() || !isVectorEnabled()) return [];

  const embedding = await getEmbedding(query);
  if (!embedding) return [];

  const filter = options.severity?.length
    ? { must: [{ key: 'severity', match: { any: options.severity } }] }
    : undefined;

  const results = await vectorSearch('signals', embedding, {
    limit: options.limit,
    threshold: 0.7,
    filter,
  });

  return results.map(r => ({
    id: r.id,
    title: (r.payload.title as string) ?? '',
    score: r.score,
    source: 'vector' as const,
    metadata: r.payload,
  }));
}

/** Graph-based search via Neo4j — find signals connected to matching entities */
async function graphSearch(
  query: string,
  options: { limit: number }
): Promise<SearchResult[]> {
  if (!isGraphEnabled()) return [];

  try {
    const results = await graphQuery(
      `MATCH (s:Signal)
       WHERE toLower(s.title) CONTAINS toLower($query)
       WITH s LIMIT 5
       MATCH (s)-[r]-(connected)
       RETURN DISTINCT connected.id as id, connected.title as title,
              type(r) as rel_type, r.confidence as confidence
       LIMIT $limit`,
      { query, limit: options.limit }
    );

    return results.map((r, i) => ({
      id: String(r.id),
      title: String(r.title ?? ''),
      score: Number(r.confidence ?? 0.5) / (i + 1),
      source: 'graph' as const,
      metadata: { relationType: r.rel_type },
    }));
  } catch {
    return [];
  }
}

/**
 * Reciprocal Rank Fusion — merges ranked lists from different sources.
 * Standard IR technique used by Elasticsearch, Pinecone, etc.
 */
function reciprocalRankFusion(
  sources: { results: SearchResult[]; weight: number }[]
): SearchResult[] {
  const scores = new Map<string, { score: number; result: SearchResult }>();
  const k = 60; // RRF constant (standard value)

  for (const { results, weight } of sources) {
    results.forEach((result, rank) => {
      const rrfScore = weight / (k + rank + 1);
      const existing = scores.get(result.id);
      if (existing) {
        existing.score += rrfScore;
      } else {
        scores.set(result.id, {
          score: rrfScore,
          result: { ...result, source: 'fused' },
        });
      }
    });
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map(({ score, result }) => ({ ...result, score }));
}

/** Report which search backends are available */
export function searchCapabilities(): {
  keyword: boolean;
  vector: boolean;
  graph: boolean;
} {
  return {
    keyword: !!supabase,
    vector: isVectorEnabled() && isEmbeddingEnabled(),
    graph: isGraphEnabled(),
  };
}
