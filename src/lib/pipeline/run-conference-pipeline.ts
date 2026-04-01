// src/lib/pipeline/run-conference-pipeline.ts
// Multi-step conference intelligence pipeline.
// Input: conference URL → Output: structured JSON with exhibitors, themes, attendee profiles.

import { discoverConferencePages, type DiscoveredPage } from '@/lib/scraping/find-links';
import { scrapePages, type ScrapeResult } from '@/lib/scraping/scrape-page';
import { cleanPages, type CleanedContent } from '@/lib/scraping/clean-content';
import { mergeContent, type MergedContent } from '@/lib/scraping/merge-content';
import { extractConferenceIntel, type ConferenceIntelExtraction } from '@/lib/ai/extract-conference-intel';

// ─── Types ──────────────────────────────────────────────────────────────────

export type PipelineLog = {
  step: string;
  message: string;
  durationMs?: number;
  timestamp: string;
};

export type PipelineResult = {
  status: 'success' | 'retry' | 'failed';
  data: ConferenceIntelExtraction | null;
  quality: 'high' | 'medium' | 'low' | null;
  provider: string | null;
  pages_discovered: DiscoveredPage[];
  pages_scraped: string[];
  pages_cleaned: number;
  merged_chars: number;
  logs: PipelineLog[];
  errors: string[];
  total_duration_ms: number;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(logs: PipelineLog[], step: string, message: string, durationMs?: number): void {
  logs.push({ step, message, durationMs, timestamp: new Date().toISOString() });
  console.log(`[pipeline:${step}] ${message}${durationMs ? ` (${durationMs}ms)` : ''}`);
}

// ─── Pipeline ───────────────────────────────────────────────────────────────

export async function runConferencePipeline(conferenceUrl: string): Promise<PipelineResult> {
  const pipelineStart = Date.now();
  const logs: PipelineLog[] = [];
  const errors: string[] = [];

  // Validate URL
  try {
    new URL(conferenceUrl);
  } catch {
    return {
      status: 'failed',
      data: null,
      quality: null,
      provider: null,
      pages_discovered: [],
      pages_scraped: [],
      pages_cleaned: 0,
      merged_chars: 0,
      logs: [{ step: 'validate', message: `Invalid URL: ${conferenceUrl}`, timestamp: new Date().toISOString() }],
      errors: [`Invalid URL: ${conferenceUrl}`],
      total_duration_ms: Date.now() - pipelineStart,
    };
  }

  // ── Step 1: Discover pages ──────────────────────────────────────────────
  let discovered: DiscoveredPage[] = [];
  const discoverStart = Date.now();
  try {
    discovered = await discoverConferencePages(conferenceUrl);
    log(logs, 'discover', `Found ${discovered.length} pages (${discovered.map(p => p.category).join(', ')})`, Date.now() - discoverStart);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Discovery failed';
    errors.push(msg);
    log(logs, 'discover', `Failed: ${msg}`, Date.now() - discoverStart);
    // Continue with just the homepage
    discovered = [{ url: conferenceUrl, category: 'homepage', priority: 0 }];
  }

  // ── Step 2: Scrape all discovered pages ─────────────────────────────────
  const scrapeStart = Date.now();
  let scraped: ScrapeResult[] = [];
  try {
    const urlsToScrape = discovered.map(p => p.url);
    scraped = await scrapePages(urlsToScrape, 3);

    const successCount = scraped.filter(s => !s.error).length;
    const playwrightCount = scraped.filter(s => s.method === 'playwright').length;
    log(logs, 'scrape', `Scraped ${successCount}/${urlsToScrape.length} pages (${playwrightCount} via Playwright)`, Date.now() - scrapeStart);

    // Log any scrape errors
    for (const s of scraped) {
      if (s.error) {
        errors.push(`Scrape failed for ${s.url}: ${s.error}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Scraping failed';
    errors.push(msg);
    log(logs, 'scrape', `Failed: ${msg}`, Date.now() - scrapeStart);
  }

  // ── Step 3: Clean content ───────────────────────────────────────────────
  const cleanStart = Date.now();
  let cleaned: CleanedContent[] = [];
  const successfulScrapes = scraped.filter(s => s.html.length > 0);

  if (successfulScrapes.length === 0) {
    log(logs, 'clean', 'No content to clean — all scrapes failed');
    return buildResult('failed', null, null, null, discovered, scraped, cleaned, 0, logs, errors, pipelineStart);
  }

  cleaned = cleanPages(successfulScrapes.map(s => ({ url: s.url, html: s.html })));
  log(logs, 'clean', `Cleaned ${cleaned.length} pages, total ${cleaned.reduce((sum, c) => sum + c.charCount, 0)} chars`, Date.now() - cleanStart);

  if (cleaned.length === 0) {
    log(logs, 'clean', 'All pages had insufficient content after cleaning');
    return buildResult('failed', null, null, null, discovered, scraped, cleaned, 0, logs, errors, pipelineStart);
  }

  // ── Step 4: Merge content ──────────────────────────────────────────────
  const mergeStart = Date.now();
  let merged: MergedContent;
  try {
    merged = mergeContent(cleaned);
    log(logs, 'merge', `Merged ${merged.pageCount} pages into ${merged.totalChars} chars`, Date.now() - mergeStart);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Merge failed';
    errors.push(msg);
    log(logs, 'merge', `Failed: ${msg}`);
    return buildResult('failed', null, null, null, discovered, scraped, cleaned, 0, logs, errors, pipelineStart);
  }

  // ── Step 5: LLM extraction ────────────────────────────────────────────
  const extractStart = Date.now();
  let extraction: ConferenceIntelExtraction | null = null;
  let quality: 'high' | 'medium' | 'low' | null = null;
  let provider: string | null = null;

  try {
    const result = await extractConferenceIntel(merged.text, conferenceUrl);
    extraction = result.extraction;
    quality = result.quality;
    provider = result.provider;
    log(logs, 'extract', `Extracted ${extraction.exhibitors.length} exhibitors, ${extraction.themes.length} themes, confidence: ${extraction.confidence_score} (${quality})`, Date.now() - extractStart);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'LLM extraction failed';
    errors.push(msg);
    log(logs, 'extract', `Failed: ${msg}`, Date.now() - extractStart);
    return buildResult('failed', null, null, null, discovered, scraped, cleaned, merged.totalChars, logs, errors, pipelineStart);
  }

  // ── Step 6: Validation ─────────────────────────────────────────────────
  const validationIssues: string[] = [];

  if (extraction.exhibitors.length < 5) {
    validationIssues.push(`Only ${extraction.exhibitors.length} exhibitors found (threshold: 5)`);
  }

  const vagueDescriptions = extraction.exhibitors.filter(
    e => e.what_they_do.length < 15 || /provides? solutions|offers? services/i.test(e.what_they_do)
  );
  if (vagueDescriptions.length > extraction.exhibitors.length * 0.5) {
    validationIssues.push(`${vagueDescriptions.length}/${extraction.exhibitors.length} exhibitors have vague descriptions`);
  }

  if (extraction.confidence_score < 70) {
    validationIssues.push(`Low confidence score: ${extraction.confidence_score}`);
  }

  if (validationIssues.length > 0) {
    log(logs, 'validate', `Quality issues: ${validationIssues.join('; ')}`);

    // If exhibitors are sparse and we have more pages to try, suggest retry
    if (extraction.exhibitors.length < 5 && discovered.length < 3) {
      log(logs, 'validate', 'Recommendation: retry with broader page discovery');
      return buildResult('retry', extraction, quality, provider, discovered, scraped, cleaned, merged.totalChars, logs, [...errors, ...validationIssues], pipelineStart);
    }
  } else {
    log(logs, 'validate', 'All validation checks passed');
  }

  // ── Done ───────────────────────────────────────────────────────────────
  const status = extraction.confidence_score < 40 ? 'retry' : 'success';
  return buildResult(status, extraction, quality, provider, discovered, scraped, cleaned, merged.totalChars, logs, errors, pipelineStart);
}

function buildResult(
  status: PipelineResult['status'],
  data: ConferenceIntelExtraction | null,
  quality: PipelineResult['quality'],
  provider: string | null,
  discovered: DiscoveredPage[],
  scraped: ScrapeResult[],
  cleaned: CleanedContent[],
  mergedChars: number,
  logs: PipelineLog[],
  errors: string[],
  startTime: number,
): PipelineResult {
  return {
    status,
    data,
    quality,
    provider,
    pages_discovered: discovered,
    pages_scraped: scraped.filter(s => !s.error).map(s => s.url),
    pages_cleaned: cleaned.length,
    merged_chars: mergedChars,
    logs,
    errors,
    total_duration_ms: Date.now() - startTime,
  };
}
