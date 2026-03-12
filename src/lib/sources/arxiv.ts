// ---------------------------------------------------------------------------
// arXiv API — free academic paper metadata (Atom XML, no key required)
// https://export.arxiv.org/api/query
// ---------------------------------------------------------------------------

const ARXIV_BASE = 'https://export.arxiv.org/api/query';
const DEFAULT_CATEGORIES = ['cs.AI', 'cs.CL', 'cs.CV', 'cs.RO', 'eess.SP', 'q-bio'];
const DEFAULT_MAX_RESULTS = 30;
const TIMEOUT_MS = 30_000;

// ---- Types ----------------------------------------------------------------

export interface ArxivPaper {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  categories: string[];
  publishedAt: string;
  url: string;
}

// ---- XML helpers (simple regex — avoids external deps) --------------------

function extractAll(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'g');
  const results: string[] = [];
  let match: RegExpExecArray | null = re.exec(xml);
  while (match !== null) {
    results.push(match[1].trim());
    match = re.exec(xml);
  }
  return results;
}

function extractFirst(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const match = re.exec(xml);
  return match ? match[1].trim() : '';
}

function extractAttribute(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*?${attr}="([^"]*)"[^>]*/?>`, 'g');
  const results: string[] = [];
  let match: RegExpExecArray | null = re.exec(xml);
  while (match !== null) {
    results.push(match[1]);
    match = re.exec(xml);
  }
  // Return first match or empty string
  return results[0] ?? '';
}

function extractCategories(entryXml: string): string[] {
  const re = /<category[^>]*term="([^"]*)"[^>]*\/?>/g;
  const cats: string[] = [];
  let match: RegExpExecArray | null = re.exec(entryXml);
  while (match !== null) {
    cats.push(match[1]);
    match = re.exec(entryXml);
  }
  return cats;
}

function parseEntry(entryXml: string): ArxivPaper {
  const id = extractFirst(entryXml, 'id');
  const title = extractFirst(entryXml, 'title').replace(/\s+/g, ' ');
  const summary = extractFirst(entryXml, 'summary').replace(/\s+/g, ' ');
  const publishedAt = extractFirst(entryXml, 'published');
  const authors = extractAll(entryXml, 'name');
  const categories = extractCategories(entryXml);

  // Prefer the abstract-page link; fall back to <id> (which is also a URL)
  const altLink = extractAttribute(entryXml, 'link', 'href');
  const url = altLink || id;

  return { id, title, summary, authors, categories, publishedAt, url };
}

// ---- Fetch ----------------------------------------------------------------

export async function fetchArxivPapers(
  categories: string[] = DEFAULT_CATEGORIES,
  maxResults: number = DEFAULT_MAX_RESULTS,
): Promise<ArxivPaper[]> {
  try {
    const searchQuery = categories.map((c) => `cat:${c}`).join('+OR+');

    // Build URL manually — URLSearchParams double-encodes the + in OR queries
    const qs = `search_query=${searchQuery}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${ARXIV_BASE}?${qs}`, {
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.error(`[arxiv] HTTP ${response.status} ${response.statusText}`);
      return [];
    }

    const xml = await response.text();
    const entries = extractAll(xml, 'entry');

    return entries.map((entry) => parseEntry(entry));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[arxiv] fetch failed: ${message}`);
    return [];
  }
}
