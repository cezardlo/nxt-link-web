import { createHash } from 'node:crypto';
import os from 'node:os';

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';
import { normalizePublicHttpUrl } from '@/lib/http/url-safety';
import {
  claimDueOpsCrawlJobs,
  completeOpsCrawlJob,
  createOpsAlert,
  createOpsCrawlJob,
  createOpsCrawlSnapshot,
  failOpsCrawlJob,
  getLatestOpsSnapshotByUrl,
  getOpsCrawlJob,
  listOpsCrawlJobs,
  listOpsCrawlSnapshotsByJob,
  type OpsCrawlJob,
  type SearchIntentMode,
  type SourceType,
} from '@/lib/intelligence/ops-store';
import { classifySourceType, parseBingRssXml } from '@/lib/intelligence/industry-scan';

type DiscoveredSource = {
  title: string;
  link: string;
  snippet: string;
  source_type: SourceType;
};

type ParsedCrawl = {
  title: string;
  url: string;
  text: string;
  http_status: number | null;
  requires_js_render: boolean;
  quality_score: number;
  quality_flags: string[];
  content_hash: string | null;
  source_type: SourceType;
};

const SOURCE_ORDER: SourceType[] = ['whitepaper', 'case_study', 'company', 'funding', 'news', 'other'];

function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractPdfText(raw: Buffer): string {
  const latin = raw.toString('latin1');
  const chunks = latin.match(/[A-Za-z][A-Za-z0-9,.;:()\-/'"% ]{30,}/g);
  if (!chunks || chunks.length === 0) return '';
  return chunks.join(' ').replace(/\s+/g, ' ').trim().slice(0, 28000);
}

function extractDocLikeText(raw: Buffer): string {
  const utf8 = raw.toString('utf8').replace(/\u0000/g, ' ');
  const cleaned = utf8.replace(/\s+/g, ' ').trim();
  if (cleaned.length > 120) return cleaned.slice(0, 28000);

  const latin = raw.toString('latin1').replace(/\u0000/g, ' ');
  return latin.replace(/\s+/g, ' ').trim().slice(0, 28000);
}

function expandIndustrySearchTerm(industry: string): string {
  const normalized = industry.toLowerCase().replace(/\s+/g, ' ').trim();
  if (normalized.includes('route optimization')) {
    return '("route optimization" OR "fleet routing" OR "dispatch optimization")';
  }
  if (normalized.includes('supply chain visibility')) {
    return '("supply chain visibility" OR "shipment tracking" OR "logistics visibility")';
  }
  if (normalized.includes('predictive maintenance')) {
    return '("predictive maintenance" OR "asset reliability" OR "condition monitoring")';
  }
  if (normalized.includes('energy management')) {
    return '("energy management" OR "grid optimization" OR "energy analytics")';
  }
  if (normalized.includes('water management')) {
    return '("water management" OR "leak detection" OR "water analytics")';
  }
  return industry.includes(' ') ? `"${industry}"` : industry;
}

function buildQueryPlan(industry: string, region: string, sourceTypes: SourceType[]): Array<{ query: string; source_type: SourceType }> {
  const industryPhrase = expandIndustrySearchTerm(industry);
  const all = {
    whitepaper: `${industryPhrase} ${region} white paper research report enterprise technology`,
    case_study: `${industryPhrase} ${region} case study customer story implementation`,
    company: `${industryPhrase} ${region} software company platform product vendor`,
    funding: `${industryPhrase} ${region} startup funding venture market map`,
    news: `${industryPhrase} ${region} market news analysis report`,
    other: `${industryPhrase} ${region} technology`,
  };

  const unique = new Set<SourceType>(sourceTypes.length > 0 ? sourceTypes : SOURCE_ORDER);
  return SOURCE_ORDER.filter((sourceType) => unique.has(sourceType)).map((sourceType) => ({
    query: all[sourceType],
    source_type: sourceType,
  }));
}

async function fetchBingRss(query: string, sourceType: SourceType): Promise<DiscoveredSource[]> {
  const rssUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&format=rss`;
  const response = await fetchWithRetry(rssUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NXTLinkCrawler/1.0)',
      Accept: 'application/rss+xml,application/xml,text/xml,*/*',
    },
    cache: 'no-store',
  }, {
    cacheTtlMs: 45_000,
    staleIfErrorMs: 8 * 60_000,
    dedupeInFlight: true,
  });

  if (!response.ok) return [];
  const xml = await response.text();
  return parseBingRssXml(xml, query, sourceType).map((item) => ({
    title: item.title,
    link: item.link,
    snippet: item.snippet,
    source_type: item.source_type,
  }));
}

function interleaveAndDedupe(lists: DiscoveredSource[][], maxSources: number): DiscoveredSource[] {
  const maxLen = Math.max(0, ...lists.map((item) => item.length));
  const mixed: DiscoveredSource[] = [];
  for (let row = 0; row < maxLen; row += 1) {
    for (let col = 0; col < lists.length; col += 1) {
      const index = (row + col) % Math.max(1, lists.length);
      const item = lists[index]?.[row];
      if (item) mixed.push(item);
    }
  }

  const seen = new Set<string>();
  const deduped: DiscoveredSource[] = [];
  for (const source of mixed) {
    try {
      const parsed = new URL(source.link);
      const key = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(source);
      if (deduped.length >= maxSources) break;
    } catch {
      continue;
    }
  }

  return deduped;
}

function computeQuality(text: string, title: string, snippet: string): { score: number; flags: string[]; requires_js_render: boolean } {
  const flags: string[] = [];
  const normalized = text.toLowerCase();
  const sentences = splitSentences(text);

  if (text.length < 220) flags.push('low_text_volume');
  if (sentences.length < 2) flags.push('thin_sentence_structure');
  if (!/(solve|reduce|improve|optimiz|automate|platform|product)/i.test(normalized)) {
    flags.push('weak_solution_signal');
  }
  if (!title || title.length < 6) flags.push('weak_title');

  const keywordHits = (normalized.match(/\b(platform|product|solution|software|enterprise|industry|data|ai|automation|funding|case study|white paper)\b/g) || []).length;
  let score = 0.34 + Math.min(0.32, text.length / 9000) + Math.min(0.2, keywordHits * 0.025);
  if (snippet.length > 40) score += 0.07;
  if (title.length > 8) score += 0.05;
  score = Math.max(0.05, Math.min(0.99, Number(score.toFixed(2))));

  const requires_js_render = text.length < 180;
  if (requires_js_render) flags.push('requires_js_render_pass');

  return { score, flags, requires_js_render };
}

async function crawlSource(source: DiscoveredSource): Promise<ParsedCrawl> {
  const safeUrl = await normalizePublicHttpUrl(source.link);
  const response = await fetchWithRetry(safeUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NXTLinkCrawler/1.0)',
      Accept: 'text/html,application/xhtml+xml,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,*/*',
    },
    cache: 'no-store',
  }, {
    cacheTtlMs: 15 * 60_000,
    staleIfErrorMs: 2 * 60 * 60_000,
    dedupeInFlight: true,
  });

  const http_status = response.status;
  if (!response.ok) {
    return {
      title: source.title,
      url: source.link,
      text: source.snippet,
      http_status,
      requires_js_render: false,
      quality_score: 0.15,
      quality_flags: ['http_error'],
      content_hash: null,
      source_type: source.source_type,
    };
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  let extracted = '';
  let title = source.title;

  if (contentType.includes('application/pdf') || source.link.toLowerCase().endsWith('.pdf')) {
    extracted = extractPdfText(Buffer.from(await response.arrayBuffer()));
  } else if (
    contentType.includes('application/msword') ||
    contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
    /\.(doc|docx|txt)$/i.test(source.link)
  ) {
    extracted = extractDocLikeText(Buffer.from(await response.arrayBuffer()));
  } else {
    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch?.[1]) {
      title = titleMatch[1].replace(/\s+/g, ' ').trim();
    }
    extracted = stripHtml(html).slice(0, 28000);
  }

  if (extracted.length < 80) {
    extracted = source.snippet || extracted;
  }

  const source_type = classifySourceType({
    title,
    link: source.link,
    snippet: source.snippet,
    hint: source.source_type,
  });
  const quality = computeQuality(extracted, title, source.snippet);
  const content_hash = createHash('sha256').update(extracted || source.snippet || source.link).digest('hex');

  return {
    title,
    url: source.link,
    text: extracted,
    http_status,
    requires_js_render: quality.requires_js_render,
    quality_score: quality.score,
    quality_flags: quality.flags,
    content_hash,
    source_type,
  };
}

export async function createCrawlerJob(input: {
  query: string;
  industry: string;
  region: string;
  intent_mode: SearchIntentMode;
  source_types: SourceType[];
  max_sources: number;
  max_retries?: number;
  schedule_minutes?: number | null;
  run_now?: boolean;
}) {
  const next_run_at =
    input.run_now === false && input.schedule_minutes && input.schedule_minutes > 0
      ? new Date(Date.now() + input.schedule_minutes * 60_000).toISOString()
      : null;

  const job = await createOpsCrawlJob({
    query: input.query,
    industry: input.industry,
    region: input.region,
    intent_mode: input.intent_mode,
    source_types: input.source_types,
    max_sources: input.max_sources,
    max_retries: input.max_retries,
    next_run_at,
  });

  if (input.run_now !== false) {
    await runCrawlerJob(job.id);
  }

  return getOpsCrawlJob(job.id);
}

async function executeCrawlJob(job: OpsCrawlJob): Promise<{ snapshots: number; failed: number; changed: number; avg_quality: number }> {
  const queryPlan = buildQueryPlan(job.industry, job.region, job.source_types);
  const discoveredLists = await Promise.all(queryPlan.map((plan) => fetchBingRss(plan.query, plan.source_type)));
  const selected = interleaveAndDedupe(discoveredLists, job.max_sources);

  let failed = 0;
  let changed = 0;
  let qualitySum = 0;
  let snapshots = 0;

  for (const source of selected) {
    let parsed: ParsedCrawl | null = null;
    let errorMessage: string | null = null;

    for (let attempt = 0; attempt < Math.max(1, job.max_retries + 1); attempt += 1) {
      try {
        parsed = await crawlSource(source);
        errorMessage = null;
        break;
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'crawl_failed';
      }
    }

    if (!parsed) {
      failed += 1;
      const snapshot = await createOpsCrawlSnapshot({
        job_id: job.id,
        url: source.link,
        source_type: source.source_type,
        title: source.title,
        status: 'failed',
        http_status: null,
        content_hash: null,
        changed: false,
        requires_js_render: false,
        quality_score: 0.1,
        quality_flags: [errorMessage || 'crawl_failed'],
        provenance_snippet: source.snippet.slice(0, 260),
        extracted_text: source.snippet,
      });
      snapshots += snapshot ? 1 : 0;
      continue;
    }

    const last = await getLatestOpsSnapshotByUrl(parsed.url);
    const changedFlag = Boolean(last && last.content_hash && parsed.content_hash && last.content_hash !== parsed.content_hash);
    if (changedFlag) changed += 1;

    await createOpsCrawlSnapshot({
      job_id: job.id,
      url: parsed.url,
      source_type: parsed.source_type,
      title: parsed.title,
      status: parsed.http_status && parsed.http_status >= 400 ? 'failed' : 'success',
      http_status: parsed.http_status,
      content_hash: parsed.content_hash,
      changed: changedFlag,
      requires_js_render: parsed.requires_js_render,
      quality_score: parsed.quality_score,
      quality_flags: parsed.quality_flags,
      provenance_snippet: splitSentences(parsed.text)[0]?.slice(0, 260) || source.snippet.slice(0, 260),
      extracted_text: parsed.text.slice(0, 4000),
    });

    snapshots += 1;
    qualitySum += parsed.quality_score;

    if (parsed.quality_score < 0.35 || parsed.quality_flags.includes('requires_js_render_pass')) {
      await createOpsAlert({
        severity: parsed.quality_score < 0.25 ? 'high' : 'medium',
        title: 'Crawl quality warning',
        description: `Low extraction quality for ${parsed.title}. Flags: ${parsed.quality_flags.join(', ')}`,
        risk_score: Number((1 - parsed.quality_score).toFixed(2)),
        confidence: parsed.quality_score,
        source_url: parsed.url,
        source_title: parsed.title,
      });
    }
  }

  return {
    snapshots,
    failed,
    changed,
    avg_quality: snapshots === 0 ? 0 : Number((qualitySum / snapshots).toFixed(2)),
  };
}

export async function runCrawlerJob(id: string) {
  const workerId = `${os.hostname()}-${process.pid}`;
  const claimed = await claimDueOpsCrawlJobs(workerId, 5);
  const target = claimed.find((job) => job.id === id) || claimed[0] || (await getOpsCrawlJob(id));

  if (!target) {
    throw new Error('Crawl job not found.');
  }
  if (target.status !== 'running') {
    await createOpsAlert({
      severity: 'low',
      title: 'Crawler run skipped',
      description: `Job ${target.id} was not in running state when execution started.`,
      risk_score: 0.12,
      confidence: 0.92,
      source_title: target.query,
      source_url: null,
    });
    return { job: target, summary: null };
  }

  try {
    const summary = await executeCrawlJob(target);
    await completeOpsCrawlJob(target.id);

    if (summary.failed > 0) {
      await createOpsAlert({
        severity: summary.failed > 3 ? 'high' : 'medium',
        title: 'Crawler partial failures',
        description: `Job ${target.id} completed with ${summary.failed} failed source crawls.`,
        risk_score: Number((Math.min(1, summary.failed / Math.max(1, summary.snapshots))).toFixed(2)),
        confidence: Number(Math.max(0.2, summary.avg_quality).toFixed(2)),
        source_title: target.query,
      });
    }

    return {
      job: await getOpsCrawlJob(target.id),
      summary,
      snapshots: await listOpsCrawlSnapshotsByJob(target.id),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'crawler_execution_failed';
    const shouldRetry = target.attempt_count <= target.max_retries;
    await failOpsCrawlJob(target.id, message, shouldRetry);
    await createOpsAlert({
      severity: 'high',
      title: 'Crawler job failed',
      description: `Job ${target.id} failed: ${message}`,
      risk_score: 0.88,
      confidence: 0.25,
      source_title: target.query,
    });
    throw error;
  }
}

export async function runDueCrawlerJobs(limit = 3) {
  const workerId = `${os.hostname()}-${process.pid}`;
  const dueJobs = await claimDueOpsCrawlJobs(workerId, limit);
  const results: Array<{ id: string; status: string; summary?: unknown; error?: string }> = [];

  for (const job of dueJobs) {
    try {
      const run = await executeCrawlJob(job);
      await completeOpsCrawlJob(job.id);
      results.push({ id: job.id, status: 'completed', summary: run });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'crawler_failed';
      const shouldRetry = job.attempt_count <= job.max_retries;
      await failOpsCrawlJob(job.id, message, shouldRetry);
      results.push({ id: job.id, status: shouldRetry ? 'queued' : 'failed', error: message });
    }
  }

  return {
    worker_id: workerId,
    processed: results.length,
    results,
  };
}

export async function listCrawlerJobsWithSnapshots(limit = 20) {
  const jobs = await listOpsCrawlJobs(limit);
  const rows = await Promise.all(
    jobs.map(async (job) => ({
      ...job,
      snapshots: await listOpsCrawlSnapshotsByJob(job.id),
    })),
  );
  return rows;
}
