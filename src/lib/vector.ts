// ─── Vector Search Client (Qdrant) ───────────────────────────────────────────
// Ready to wire up when Qdrant Cloud is provisioned.
// Free tier: 1M vectors, HNSW index, sub-10ms search.
//
// To enable: set QDRANT_URL and QDRANT_API_KEY in .env.local
// Install: npm install @qdrant/js-client-rest

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

export type VectorSearchResult = {
  id: string;
  score: number;
  payload: Record<string, unknown>;
};

/**
 * Search for similar items by embedding vector.
 * Falls back to empty results when Qdrant is not configured.
 */
export async function vectorSearch(
  collection: string,
  vector: number[],
  options: { limit?: number; threshold?: number; filter?: Record<string, unknown> } = {}
): Promise<VectorSearchResult[]> {
  if (!QDRANT_URL || !QDRANT_API_KEY) {
    console.warn('[vector] Qdrant not configured — returning empty results');
    return [];
  }

  const { limit = 20, threshold = 0.75, filter } = options;

  try {
    const res = await fetch(`${QDRANT_URL}/collections/${collection}/points/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': QDRANT_API_KEY,
      },
      body: JSON.stringify({
        vector,
        limit,
        score_threshold: threshold,
        with_payload: true,
        ...(filter ? { filter } : {}),
      }),
    });

    if (!res.ok) {
      console.warn(`[vector] Qdrant search failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    return (data.result ?? []).map((r: { id: string; score: number; payload: Record<string, unknown> }) => ({
      id: String(r.id),
      score: r.score,
      payload: r.payload,
    }));
  } catch (err) {
    console.warn('[vector] Qdrant search error:', err);
    return [];
  }
}

/**
 * Upsert a vector into Qdrant.
 */
export async function vectorUpsert(
  collection: string,
  id: string,
  vector: number[],
  payload: Record<string, unknown>
): Promise<boolean> {
  if (!QDRANT_URL || !QDRANT_API_KEY) return false;

  try {
    const res = await fetch(`${QDRANT_URL}/collections/${collection}/points`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'api-key': QDRANT_API_KEY,
      },
      body: JSON.stringify({
        points: [{ id, vector, payload }],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Check if Qdrant is configured and reachable */
export function isVectorEnabled(): boolean {
  return !!(QDRANT_URL && QDRANT_API_KEY);
}
