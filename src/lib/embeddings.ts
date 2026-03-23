// ─── Embedding Pipeline ──────────────────────────────────────────────────────
// Generates vector embeddings for signals, vendors, technologies.
// Primary: OpenAI text-embedding-3-small (1536 dim, $0.02/1M tokens)
// Fallback: returns null when API key is not set
//
// To enable: set OPENAI_API_KEY in .env.local

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;

export { EMBEDDING_DIM };

/**
 * Generate an embedding vector for a text string.
 * Returns null if OpenAI is not configured.
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
  if (!OPENAI_API_KEY) {
    console.warn('[embeddings] OpenAI not configured — skipping embedding');
    return null;
  }

  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text.slice(0, 8000), // Max ~8K chars for safety
      }),
    });

    if (!res.ok) {
      console.warn(`[embeddings] OpenAI embedding failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data.data?.[0]?.embedding ?? null;
  } catch (err) {
    console.warn('[embeddings] OpenAI embedding error:', err);
    return null;
  }
}

/**
 * Generate embeddings for multiple texts in a single API call.
 * More efficient than calling getEmbedding() in a loop.
 */
export async function getBatchEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  if (!OPENAI_API_KEY || texts.length === 0) {
    return texts.map(() => null);
  }

  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts.map(t => t.slice(0, 8000)),
      }),
    });

    if (!res.ok) return texts.map(() => null);

    const data = await res.json();
    const embeddings = new Array<number[] | null>(texts.length).fill(null);
    for (const item of data.data ?? []) {
      embeddings[item.index] = item.embedding;
    }
    return embeddings;
  } catch {
    return texts.map(() => null);
  }
}

/** Check if embedding generation is available */
export function isEmbeddingEnabled(): boolean {
  return !!OPENAI_API_KEY;
}
