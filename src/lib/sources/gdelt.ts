// ---------------------------------------------------------------------------
// GDELT Project — free global event/article API (no key required)
// https://api.gdeltproject.org/api/v2/doc/doc
// ---------------------------------------------------------------------------

const GDELT_BASE = 'https://api.gdeltproject.org/api/v2/doc/doc';
const DEFAULT_QUERY = 'technology innovation breakthrough';
const DEFAULT_MAX_RECORDS = 50;
const TIMEOUT_MS = 30_000;

// ---- Types ----------------------------------------------------------------

export interface GdeltArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  country: string;
  publishedAt: string;
}

/** Shape returned by the GDELT v2 artlist endpoint. */
interface GdeltApiResponse {
  articles?: Array<{
    url: string;
    title: string;
    seendate: string;
    domain: string;
    language: string;
    sourcecountry: string;
  }>;
}

// ---- Fetch ----------------------------------------------------------------

export async function fetchGdeltEvents(
  query: string = DEFAULT_QUERY,
  maxRecords: number = DEFAULT_MAX_RECORDS,
): Promise<GdeltArticle[]> {
  try {
    const params = new URLSearchParams({
      query: `${query} sourcelang:english`,
      mode: 'artlist',
      format: 'json',
      maxrecords: String(maxRecords),
      timespan: '24h',
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${GDELT_BASE}?${params.toString()}`, {
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.error(`[gdelt] HTTP ${response.status} ${response.statusText}`);
      return [];
    }

    const data: GdeltApiResponse = (await response.json()) as GdeltApiResponse;

    if (!data.articles || !Array.isArray(data.articles)) {
      return [];
    }

    return data.articles.map((a, idx) => ({
      id: `gdelt-${idx}-${encodeURIComponent(a.url).slice(0, 60)}`,
      title: a.title ?? '',
      url: a.url ?? '',
      source: a.domain ?? '',
      country: a.sourcecountry ?? '',
      publishedAt: a.seendate ?? '',
    }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[gdelt] fetch failed: ${message}`);
    return [];
  }
}
