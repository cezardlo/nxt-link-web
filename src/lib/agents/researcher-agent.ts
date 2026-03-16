// src/lib/agents/researcher-agent.ts
// Researcher Agent — deep intelligence research across multiple sources.
// Uses the /api/ask engine as the base intelligence layer,
// augmented by Firecrawl scraping and optional patent/grant sources.
// Note: Playwright scraping runs in GitHub Actions (Node env), not Vercel serverless.

// ─── Types ───────────────────────────────────────────────────────────────────

export type ResearchSource = 'news' | 'patents' | 'grants' | 'contracts' | 'firecrawl' | 'wikipedia';

export type ResearchJobStatus = 'pending' | 'running' | 'complete' | 'failed';

export type ResearchJob = {
  id: string;
  query: string;
  sources: ResearchSource[];
  status: ResearchJobStatus;
  result?: ResearchResult;
  startedAt?: string;
  completedAt?: string;
};

export type ResearchResult = {
  query: string;
  summary: string;
  keyFindings: string[];
  companies: string[];
  technologies: string[];
  sources: string[];
  confidence: number; // 0–100
};

// Ask engine response shapes (minimal — only what we use)
type AskPlayer = {
  name: string;
};

type AskExpertBrief = {
  summary?: string;
};

type AskSections = {
  key_players?: AskPlayer[];
  expert_brief?: AskExpertBrief;
  technologies?: Array<{ name: string }>;
};

type AskResponse = {
  sections?: AskSections;
};

// ─── Core Research Function ───────────────────────────────────────────────────

/**
 * Runs a research job by querying the NXT LINK /api/ask intelligence engine
 * and optionally enriching with Firecrawl vendor scrapes.
 */
export async function runResearchJob(job: ResearchJob): Promise<ResearchResult> {
  const findings: string[] = [];
  const companies: string[] = [];
  const technologies: string[] = [];
  const sources: string[] = [];

  // ── Source: NXT LINK Ask Engine ────────────────────────────────────────────
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: job.query }),
      signal: AbortSignal.timeout(30_000),
    });

    if (res.ok) {
      const data = (await res.json()) as AskResponse;
      const sections = data.sections;

      // Extract key players (companies)
      const players = sections?.key_players ?? [];
      companies.push(...players.slice(0, 5).map(p => p.name));

      // Extract the expert brief summary
      const brief = sections?.expert_brief;
      if (brief?.summary) {
        findings.push(brief.summary);
      }

      // Extract technologies if available
      const techs = sections?.technologies ?? [];
      technologies.push(...techs.slice(0, 8).map(t => t.name));

      sources.push('NXT LINK Intelligence Engine');
    }
  } catch {
    // Non-fatal — continue with other sources
  }

  // ── Source: Firecrawl vendor scraping (if requested and key exists) ─────────
  if (job.sources.includes('firecrawl') && companies.length > 0) {
    try {
      const { scrapeMultipleVendors, summarizeScrapedIntelligence } = await import('./firecrawl-agent');

      // Build plausible vendor URLs from company names
      const vendorUrls = companies.slice(0, 3).map(name => {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
        return `https://www.${slug}.com`;
      });

      const scraped = await scrapeMultipleVendors(vendorUrls);
      if (scraped.length > 0) {
        const summary = summarizeScrapedIntelligence(scraped);
        technologies.push(...summary.allTechnologies);
        if (summary.allContracts.length > 0) {
          findings.push(`Contract activity: ${summary.allContracts.slice(0, 3).join('; ')}`);
        }
        sources.push(`Firecrawl (${scraped.length} vendor sites)`);
      }
    } catch {
      // Firecrawl is optional — skip if unavailable
    }
  }

  // ── Confidence scoring ────────────────────────────────────────────────────
  // Each source contributes 25 points; findings add 10 each, capped at 100
  const confidence = Math.min(100, sources.length * 25 + findings.length * 10);

  return {
    query: job.query,
    summary: findings[0] ?? `Research complete for: ${job.query}`,
    keyFindings: findings,
    companies: [...new Set(companies)],
    technologies: [...new Set(technologies)],
    sources,
    confidence,
  };
}

// ─── Job Factory ─────────────────────────────────────────────────────────────

/**
 * Creates a new research job for a given query.
 * Defaults to news + firecrawl sources.
 */
export function createResearchJob(
  query: string,
  sources: ResearchSource[] = ['news', 'firecrawl'],
): ResearchJob {
  return {
    id: `research-${Date.now()}`,
    query,
    sources,
    status: 'pending',
    startedAt: new Date().toISOString(),
  };
}

/**
 * Runs a batch of research jobs sequentially.
 * Sequential to avoid hammering external APIs.
 */
export async function runResearchBatch(jobs: ResearchJob[]): Promise<ResearchResult[]> {
  const results: ResearchResult[] = [];
  for (const job of jobs) {
    try {
      const result = await runResearchJob(job);
      results.push(result);
    } catch (err) {
      console.error(`[researcher] Job failed for "${job.query}":`, err);
      // Return empty result so the batch continues
      results.push({
        query: job.query,
        summary: `Research failed for: ${job.query}`,
        keyFindings: [],
        companies: [],
        technologies: [],
        sources: [],
        confidence: 0,
      });
    }
  }
  return results;
}
