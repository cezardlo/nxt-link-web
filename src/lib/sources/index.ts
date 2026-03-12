// ---------------------------------------------------------------------------
// Data sources barrel — re-exports + combined fetcher
// ---------------------------------------------------------------------------

export { fetchGdeltEvents, type GdeltArticle } from './gdelt';
export { fetchArxivPapers, type ArxivPaper } from './arxiv';
export { fetchOpenAlexWorks, type OpenAlexWork } from './openalex';

import { fetchGdeltEvents, type GdeltArticle } from './gdelt';
import { fetchArxivPapers, type ArxivPaper } from './arxiv';
import { fetchOpenAlexWorks, type OpenAlexWork } from './openalex';

// ---- Combined result type -------------------------------------------------

export interface AllSourcesResult {
  gdelt: GdeltArticle[];
  arxiv: ArxivPaper[];
  openalex: OpenAlexWork[];
}

// ---- Parallel fetcher -----------------------------------------------------

/**
 * Fetch all three sources in parallel.
 * Each source fails independently — a single failure returns an empty array
 * for that source while the others succeed normally.
 */
export async function fetchAllSources(): Promise<AllSourcesResult> {
  const [gdelt, arxiv, openalex] = await Promise.all([
    fetchGdeltEvents(),
    fetchArxivPapers(),
    fetchOpenAlexWorks(),
  ]);

  return { gdelt, arxiv, openalex };
}
