// scripts/dedup-kg-signals.ts
// Removes duplicate kg_signals rows, keeping the earliest inserted per title+signal_type.
//
// Usage:
//   npx tsx scripts/dedup-kg-signals.ts

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

async function dedup() {
  console.log('=== Dedup kg_signals ===\n');

  const db = getDb();

  // Get all signals
  const { data: all, error: fetchErr } = await db
    .from('kg_signals')
    .select('id, title, signal_type, created_at')
    .order('created_at', { ascending: true });

  if (fetchErr || !all) {
    console.error('Failed to fetch signals:', fetchErr?.message);
    process.exit(1);
  }

  console.log(`Total signals: ${all.length}`);

  // Find duplicates — keep first occurrence per title+signal_type
  const seen = new Map<string, string>();
  const dupeIds: string[] = [];

  for (const row of all) {
    const key = `${row.title}::${row.signal_type}`;
    if (seen.has(key)) {
      dupeIds.push(row.id as string);
    } else {
      seen.set(key, row.id as string);
    }
  }

  console.log(`Duplicates found: ${dupeIds.length}`);
  console.log(`Unique signals: ${seen.size}`);

  if (dupeIds.length === 0) {
    console.log('No duplicates to remove.');
    return;
  }

  // Delete in batches of 100
  let deleted = 0;
  for (let i = 0; i < dupeIds.length; i += 100) {
    const batch = dupeIds.slice(i, i + 100);
    const { error: delErr } = await db
      .from('kg_signals')
      .delete()
      .in('id', batch);

    if (delErr) {
      console.error(`  Delete batch ${i} error:`, delErr.message);
    } else {
      deleted += batch.length;
    }
  }

  console.log(`\nDeleted: ${deleted} duplicate rows`);
  console.log(`Remaining: ${all.length - deleted} unique signals`);
}

dedup().catch((err) => {
  console.error('Dedup failed:', err);
  process.exit(1);
});
