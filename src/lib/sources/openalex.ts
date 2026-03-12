// ---------------------------------------------------------------------------
// OpenAlex API — free scholarly works metadata (no key required)
// https://api.openalex.org/works
// ---------------------------------------------------------------------------

const OPENALEX_BASE = 'https://api.openalex.org/works';
const DEFAULT_FILTER = 'publication_year:2025|2026';
const DEFAULT_SORT = 'cited_by_count:desc';
const DEFAULT_PER_PAGE = 25;
const TIMEOUT_MS = 30_000;
const POLITE_EMAIL = 'nxtlink@example.com';

// ---- Types ----------------------------------------------------------------

export interface OpenAlexWork {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  citationCount: number;
  publishedYear: number;
  source: string;
  url: string;
}

/** Subset of the OpenAlex API response we care about. */
interface OpenAlexApiResponse {
  results: Array<{
    id: string;
    title: string;
    publication_year: number;
    cited_by_count: number;
    authorships: Array<{
      author: {
        display_name: string;
      };
    }>;
    primary_location: {
      source?: {
        display_name?: string;
      };
      landing_page_url?: string;
    } | null;
    abstract_inverted_index: Record<string, number[]> | null;
  }>;
}

// ---- Helpers --------------------------------------------------------------

/**
 * OpenAlex stores abstracts as an inverted index: `{ word: [pos0, pos1, ...] }`.
 * Reconstruct by sorting every (word, position) pair by position and joining.
 */
function invertedIndexToText(index: Record<string, number[]> | null): string {
  if (!index) return '';

  const pairs: Array<{ word: string; pos: number }> = [];

  const words = Object.keys(index);
  for (const word of words) {
    const positions = index[word];
    for (const pos of positions) {
      pairs.push({ word, pos });
    }
  }

  pairs.sort((a, b) => a.pos - b.pos);
  return pairs.map((p) => p.word).join(' ');
}

// ---- Fetch ----------------------------------------------------------------

export async function fetchOpenAlexWorks(
  filter: string = DEFAULT_FILTER,
  perPage: number = DEFAULT_PER_PAGE,
): Promise<OpenAlexWork[]> {
  try {
    const params = new URLSearchParams({
      filter,
      sort: DEFAULT_SORT,
      per_page: String(perPage),
      mailto: POLITE_EMAIL,
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${OPENALEX_BASE}?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': `NxtLink/1.0 (mailto:${POLITE_EMAIL})`,
      },
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.error(`[openalex] HTTP ${response.status} ${response.statusText}`);
      return [];
    }

    const data: OpenAlexApiResponse = (await response.json()) as OpenAlexApiResponse;

    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((w) => ({
      id: w.id ?? '',
      title: w.title ?? '',
      abstract: invertedIndexToText(w.abstract_inverted_index),
      authors: (w.authorships ?? []).map((a) => a.author.display_name),
      citationCount: w.cited_by_count ?? 0,
      publishedYear: w.publication_year ?? 0,
      source: w.primary_location?.source?.display_name ?? '',
      url: w.primary_location?.landing_page_url ?? w.id ?? '',
    }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[openalex] fetch failed: ${message}`);
    return [];
  }
}
