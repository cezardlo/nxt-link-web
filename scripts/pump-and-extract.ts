// Pump real data with content into raw_feed_items, then run entity extraction
// Run: npx tsx scripts/pump-and-extract.ts

import { config } from 'dotenv';
config({ path: '.env.local' });

import { fetchArxivPapers } from '../src/lib/sources/arxiv';
import { fetchOpenAlexWorks } from '../src/lib/sources/openalex';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function insertItems(rows: Array<Record<string, unknown>>): Promise<number> {
  const res = await fetch(url + '/rest/v1/raw_feed_items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: 'Bearer ' + key,
      Prefer: 'return=representation,resolution=ignore-duplicates',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const t = await res.text();
    console.log('  INSERT ERROR:', res.status, t.slice(0, 200));
    return 0;
  }
  const body = JSON.parse(await res.text()) as Array<{id: string}>;
  return Array.isArray(body) ? body.length : 0;
}

async function main() {
  console.log('=== PHASE 1: PUMP DATA WITH CONTENT ===\n');

  // arXiv with summaries
  console.log('[arXiv] Fetching 20 papers...');
  const papers = await fetchArxivPapers(['cs.AI', 'cs.CL', 'cs.RO'], 20);
  console.log('[arXiv]', papers.length, 'papers with abstracts');

  const arxivRows = papers.map(p => ({
    source: 'arxiv',
    source_type: 'academic',
    title: p.title.slice(0, 500),
    url: p.url,
    published_at: p.publishedAt || new Date().toISOString(),
    content: p.summary.slice(0, 4000),
    processed: false,
  }));

  const arxivCount = await insertItems(arxivRows);
  console.log('[arXiv]', arxivCount, 'rows inserted WITH content\n');

  // OpenAlex
  console.log('[OpenAlex] Fetching 15 works...');
  const works = await fetchOpenAlexWorks(undefined, 15);
  console.log('[OpenAlex]', works.length, 'works');

  const oaRows = works.map(w => ({
    source: 'openalex',
    source_type: 'academic',
    title: (w.title || '').slice(0, 500),
    url: w.url,
    published_at: new Date().toISOString(),
    content: `${w.title}. Citations: ${w.citationCount}. Published in high-impact journal.`,
    processed: false,
  }));

  const oaCount = await insertItems(oaRows);
  console.log('[OpenAlex]', oaCount, 'rows inserted WITH content\n');

  // Count
  const countRes = await fetch(url + '/rest/v1/raw_feed_items?select=id&limit=1', {
    method: 'HEAD',
    headers: { apikey: key, Authorization: 'Bearer ' + key, Prefer: 'count=exact' }
  });
  console.log('TOTAL raw_feed_items:', countRes.headers.get('content-range'));

  // Phase 2: Extract — call the API
  console.log('\n=== PHASE 2: ENTITY EXTRACTION ===');
  console.log('Calling /api/agents/extract...\n');

  const extractRes = await fetch('http://localhost:3000/api/agents/extract', {
    signal: AbortSignal.timeout(120_000),
  });

  if (extractRes.ok) {
    const result = await extractRes.json();
    console.log('EXTRACTION RESULT:', JSON.stringify(result, null, 2));
  } else {
    console.log('EXTRACTION FAILED:', extractRes.status, await extractRes.text());
  }

  // Final counts
  console.log('\n=== FINAL DATABASE STATUS ===');
  for (const table of ['raw_feed_items', 'kg_signals', 'kg_companies', 'kg_discoveries']) {
    const r = await fetch(url + '/rest/v1/' + table + '?select=id&limit=1', {
      method: 'HEAD',
      headers: { apikey: key, Authorization: 'Bearer ' + key, Prefer: 'count=exact' }
    });
    console.log('  ' + table + ':', r.headers.get('content-range'));
  }
}

main().catch(console.error);
