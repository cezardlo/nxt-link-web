// ─── Embedding Pipeline ──────────────────────────────────────────────────────
// Generates vector embeddings for signals, vendors, technologies.
// Primary: Google Gemini (FREE — already configured in nxt-brain)
// Fallback: OpenAI text-embedding-3-small ($0.02/1M tokens)
//
// Gemini embedding: 768 dimensions (gemini-embedding-001)
// OpenAI embedding: 1536 dimensions (text-embedding-3-small)

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Use Gemini dimensions when available, OpenAI otherwise
export const EMBEDDING_DIM = GEMINI_API_KEY ? 3072 : 1536;

/**
 * Generate an embedding vector for a text string.
 * Tries Gemini first (free), falls back to OpenAI, returns null if neither works.
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
  // Try Gemini first (free)
  if (GEMINI_API_KEY) {
    const result = await geminiEmbed(text);
    if (result) return result;
  }

  // Fall back to OpenAI
  if (OPENAI_API_KEY) {
    const result = await openaiEmbed(text);
    if (result) return result;
  }

  console.warn('[embeddings] No embedding provider configured');
  return null;
}

/**
 * Generate embeddings for multiple texts.
 * Uses batch API when available.
 */
export async function getBatchEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  if (texts.length === 0) return [];

  // Gemini supports batch embedding
  if (GEMINI_API_KEY) {
    return geminiBatchEmbed(texts);
  }

  // OpenAI batch
  if (OPENAI_API_KEY) {
    return await openaiBatchEmbed(texts);
  }

  return texts.map(() => null);
}

/** Check if embedding generation is available */
export function isEmbeddingEnabled(): boolean {
  return !!(GEMINI_API_KEY || OPENAI_API_KEY);
}

// ─── Gemini Embeddings (FREE) ────────────────────────────────────────────────

async function geminiEmbed(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text: text.slice(0, 10000) }] },
        }),
      }
    );

    if (!res.ok) {
      console.warn(`[embeddings] Gemini failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data.embedding?.values ?? null;
  } catch (err) {
    console.warn('[embeddings] Gemini error:', err);
    return null;
  }
}

async function geminiBatchEmbed(texts: string[]): Promise<(number[] | null)[]> {
  // Gemini batch: one request per text (no native batch yet)
  const results: (number[] | null)[] = [];
  for (const text of texts) {
    results.push(await geminiEmbed(text));
    // Small delay to avoid rate limits
    if (texts.length > 10) await new Promise(r => setTimeout(r, 100));
  }
  return results;
}

// ─── OpenAI Embeddings (Paid) ────────────────────────────────────────────────

async function openaiEmbed(text: string): Promise<number[] | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000),
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

async function openaiBatchEmbed(texts: string[]): Promise<(number[] | null)[]> {
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
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
