// Quick test script for GDELT + arXiv + OpenAlex data sources
// Run: npx tsx scripts/test-sources.ts

import { fetchGdeltEvents } from '../src/lib/sources/gdelt';
import { fetchArxivPapers } from '../src/lib/sources/arxiv';
import { fetchOpenAlexWorks } from '../src/lib/sources/openalex';

async function main() {
  console.log('=== NXT LINK — Live Data Pull ===\n');

  console.log('[GDELT] Fetching global tech events...');
  const gdelt = await fetchGdeltEvents('technology innovation', 20);
  console.log(`[GDELT] ${gdelt.length} articles pulled`);
  for (const a of gdelt.slice(0, 3)) {
    console.log(`  > ${a.title?.slice(0, 100)}`);
    console.log(`    ${a.url}`);
  }

  console.log('\n[arXiv] Fetching latest AI/robotics papers...');
  const arxiv = await fetchArxivPapers(['cs.AI', 'cs.RO'], 10);
  console.log(`[arXiv] ${arxiv.length} papers pulled`);
  for (const p of arxiv.slice(0, 3)) {
    console.log(`  > ${p.title?.slice(0, 100)}`);
    console.log(`    Authors: ${p.authors?.slice(0, 2).join(', ')}`);
  }

  console.log('\n[OpenAlex] Fetching top-cited 2025-2026 works...');
  const oa = await fetchOpenAlexWorks(undefined, 10);
  console.log(`[OpenAlex] ${oa.length} works pulled`);
  for (const w of oa.slice(0, 3)) {
    console.log(`  > ${w.title?.slice(0, 100)} | ${w.citationCount} citations`);
  }

  const total = gdelt.length + arxiv.length + oa.length;
  console.log(`\n=== TOTAL: ${total} items from 3 free sources ===`);
}

main().catch(console.error);
