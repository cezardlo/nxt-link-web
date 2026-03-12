// Full diagnostic — test every data source + Supabase insert
// Run: npx tsx scripts/full-diagnostic.ts

import { config } from 'dotenv';
config({ path: '.env.local' });

import { fetchGdeltEvents } from '../src/lib/sources/gdelt';
import { fetchArxivPapers } from '../src/lib/sources/arxiv';
import { fetchOpenAlexWorks } from '../src/lib/sources/openalex';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testGdelt() {
  console.log('\n=== TEST 1: GDELT ===');
  try {
    const url = 'https://api.gdeltproject.org/api/v2/doc/doc?query=technology+innovation+sourcelang%3Aenglish&mode=artlist&format=json&maxrecords=5&timespan=24h';
    console.log('  URL:', url);
    const res = await fetch(url);
    console.log('  Status:', res.status, res.statusText);
    const data = await res.json() as { articles?: Array<{ title: string; url: string; domain: string }> };
    console.log('  Articles count:', data.articles?.length ?? 0);
    for (const a of (data.articles ?? []).slice(0, 3)) {
      console.log(`    > ${a.title?.slice(0, 80)}`);
      console.log(`      ${a.domain} | ${a.url?.slice(0, 60)}`);
    }
    console.log('  RESULT: PASS');
    return data.articles ?? [];
  } catch (err) {
    console.error('  ERROR:', err);
    console.log('  RESULT: FAIL');
    return [];
  }
}

async function testArxiv() {
  console.log('\n=== TEST 2: arXiv ===');
  try {
    const url = 'https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.RO&start=0&max_results=5&sortBy=submittedDate&sortOrder=descending';
    console.log('  URL:', url);
    const res = await fetch(url);
    console.log('  Status:', res.status, res.statusText);
    const xml = await res.text();
    console.log('  Response length:', xml.length, 'bytes');

    // Count entries
    const entryCount = (xml.match(/<entry>/g) || []).length;
    console.log('  Entries found:', entryCount);

    // Extract first 3 titles
    const titles = xml.match(/<entry>[\s\S]*?<title>([\s\S]*?)<\/title>/g) || [];
    for (const t of titles.slice(0, 3)) {
      const match = t.match(/<title>([\s\S]*?)<\/title>/);
      if (match) console.log(`    > ${match[1].replace(/\s+/g, ' ').trim().slice(0, 80)}`);
    }

    // Also test our wrapper
    console.log('  Testing fetchArxivPapers wrapper...');
    const papers = await fetchArxivPapers(['cs.AI', 'cs.RO'], 5);
    console.log('  Wrapper returned:', papers.length, 'papers');
    for (const p of papers.slice(0, 2)) {
      console.log(`    > ${p.title?.slice(0, 80)}`);
    }

    console.log('  RESULT:', entryCount > 0 ? 'PASS' : 'FAIL');
    return papers;
  } catch (err) {
    console.error('  ERROR:', err);
    console.log('  RESULT: FAIL');
    return [];
  }
}

async function testOpenAlex() {
  console.log('\n=== TEST 3: OpenAlex ===');
  try {
    const works = await fetchOpenAlexWorks(undefined, 5);
    console.log('  Works returned:', works.length);
    for (const w of works.slice(0, 3)) {
      console.log(`    > ${w.title?.slice(0, 80)} | ${w.citationCount} citations`);
    }
    console.log('  RESULT:', works.length > 0 ? 'PASS' : 'FAIL');
    return works;
  } catch (err) {
    console.error('  ERROR:', err);
    console.log('  RESULT: FAIL');
    return [];
  }
}

async function testSupabaseInsert(sampleItems: Array<{title: string; url: string; source: string}>) {
  console.log('\n=== TEST 4: Supabase raw_feed_items INSERT ===');
  console.log('  SUPABASE_URL:', SUPABASE_URL ? `${SUPABASE_URL.slice(0, 30)}...` : 'NOT SET');
  console.log('  SUPABASE_KEY:', SUPABASE_KEY ? `${SUPABASE_KEY.slice(0, 10)}...` : 'NOT SET');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('  RESULT: FAIL — missing env vars');
    return;
  }

  try {
    // Insert test rows
    const rows = sampleItems.slice(0, 5).map(item => ({
      source: item.source || 'diagnostic-test',
      source_type: 'news',
      title: item.title?.slice(0, 200) || 'Test item',
      url: item.url || `https://test.example.com/${Date.now()}-${Math.random()}`,
      published_at: new Date().toISOString(),
      processed: false,
    }));

    console.log('  Inserting', rows.length, 'rows...');

    const res = await fetch(`${SUPABASE_URL}/rest/v1/raw_feed_items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation,resolution=ignore-duplicates',
      },
      body: JSON.stringify(rows),
    });

    console.log('  Insert status:', res.status, res.statusText);
    const body = await res.text();
    if (res.ok) {
      const inserted = JSON.parse(body) as Array<{id: string; title: string}>;
      console.log('  Rows inserted:', inserted.length);
      for (const r of inserted.slice(0, 3)) {
        console.log(`    > id=${r.id?.slice(0, 8)} title="${r.title?.slice(0, 60)}"`);
      }
    } else {
      console.log('  Error body:', body.slice(0, 300));
    }

    // Verify by reading back
    console.log('  Verifying with SELECT...');
    const readRes = await fetch(`${SUPABASE_URL}/rest/v1/raw_feed_items?order=created_at.desc&limit=3`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });
    console.log('  Read status:', readRes.status);
    const readBody = await readRes.json() as Array<{id: string; title: string; source: string}>;
    console.log('  Rows in table (latest 3):');
    for (const r of readBody) {
      console.log(`    > ${r.source} | ${r.title?.slice(0, 60)}`);
    }

    // Count total
    const countRes = await fetch(`${SUPABASE_URL}/rest/v1/raw_feed_items?select=id&head=true`, {
      method: 'HEAD',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact',
      },
    });
    const totalCount = countRes.headers.get('content-range');
    console.log('  Total rows:', totalCount);

    console.log('  RESULT:', res.ok ? 'PASS' : 'FAIL');
  } catch (err) {
    console.error('  ERROR:', err);
    console.log('  RESULT: FAIL');
  }
}

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  NXT LINK — FULL SYSTEM DIAGNOSTIC   ║');
  console.log('╚══════════════════════════════════════╝');

  const gdelt = await testGdelt();
  const arxiv = await testArxiv();
  const openalex = await testOpenAlex();

  // Combine all results for Supabase insert test
  const allItems = [
    ...gdelt.map((a: { title: string; url: string; domain: string }) => ({ title: a.title, url: a.url, source: `gdelt:${a.domain}` })),
    ...arxiv.map((p: { title: string; url: string }) => ({ title: p.title, url: p.url, source: 'arxiv' })),
    ...openalex.map((w: { title: string; url: string }) => ({ title: w.title, url: w.url, source: 'openalex' })),
  ];

  await testSupabaseInsert(allItems);

  console.log('\n=== SUMMARY ===');
  console.log(`  GDELT:    ${gdelt.length > 0 ? 'PASS' : 'FAIL'} (${gdelt.length} articles)`);
  console.log(`  arXiv:    ${arxiv.length > 0 ? 'PASS' : 'FAIL'} (${arxiv.length} papers)`);
  console.log(`  OpenAlex: ${openalex.length > 0 ? 'PASS' : 'FAIL'} (${openalex.length} works)`);
  console.log(`  Total:    ${allItems.length} items ready for pipeline`);
}

main().catch(console.error);
