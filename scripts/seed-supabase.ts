#!/usr/bin/env npx tsx
// scripts/seed-supabase.ts — Seed Supabase with static data from TS files
// Usage: npx tsx scripts/seed-supabase.ts
//
// Reads vendors, conferences, and technologies from the hardcoded TS files
// and upserts them into Supabase tables. Safe to re-run (idempotent).

import 'dotenv/config';

// We need to set up the env before importing db modules
async function main() {
  const { EL_PASO_VENDORS } = await import('../src/lib/data/el-paso-vendors');
  const { CONFERENCES } = await import('../src/lib/data/conferences');
  const { TECHNOLOGY_CATALOG } = await import('../src/lib/data/technology-catalog');
  const { isSupabaseConfigured } = await import('../src/db/client');

  if (!isSupabaseConfigured()) {
    console.error('[seed] Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  console.log('[seed] Starting Supabase seed...');
  console.log(`  Vendors:      ${Object.keys(EL_PASO_VENDORS).length}`);
  console.log(`  Conferences:  ${CONFERENCES.length}`);
  console.log(`  Technologies: ${TECHNOLOGY_CATALOG.length}`);

  // Seed vendors
  const { upsertVendors } = await import('../src/db/queries/vendors');
  const vendorRecords = Object.values(EL_PASO_VENDORS);
  const vendorCount = await upsertVendors(vendorRecords);
  console.log(`[seed] Vendors:      ${vendorCount} upserted`);

  // Seed conferences
  const { upsertConferences } = await import('../src/db/queries/conferences');
  const confCount = await upsertConferences(CONFERENCES);
  console.log(`[seed] Conferences:  ${confCount} upserted`);

  // Seed technologies
  const { upsertTechnologies } = await import('../src/db/queries/technologies');
  const techCount = await upsertTechnologies(TECHNOLOGY_CATALOG);
  console.log(`[seed] Technologies: ${techCount} upserted`);

  console.log('[seed] Done!');
}

main().catch(err => {
  console.error('[seed] Fatal error:', err);
  process.exit(1);
});
