// scripts/seed-kg-tables.ts
// Populates kg_industries, kg_technologies, kg_companies from existing static data.
// Also migrates old signals table → kg_signals.
//
// Usage:
//   npx tsx scripts/seed-kg-tables.ts
//
// Safe to re-run (upserts by slug).

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

// Import static data
import { TECHNOLOGY_CATALOG, INDUSTRIES } from '../src/lib/data/technology-catalog';
import { EL_PASO_VENDORS } from '../src/lib/data/el-paso-vendors';

function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function seed() {
  console.log('=== NXT LINK — KG Tables Seed ===\n');

  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  const db = getDb();
  let total = 0;

  // ── 1. Seed kg_industries ──

  console.log('Seeding kg_industries...');
  const industries = INDUSTRIES.map(ind => ({
    slug: ind.slug,
    name: ind.label,
    description: `${ind.label} industry sector — global technology intelligence coverage`,
    iker_score: 50,
  }));

  const { error: indErr, data: indData } = await db
    .from('kg_industries')
    .upsert(industries, { onConflict: 'slug' })
    .select('id, slug');

  if (indErr) {
    console.error('  kg_industries error:', indErr.message);
  } else {
    console.log(`  → ${indData?.length ?? 0} industries upserted`);
    total += indData?.length ?? 0;
  }

  // ── 2. Seed kg_technologies ──

  console.log('Seeding kg_technologies...');

  const maturityMap: Record<string, string> = {
    emerging: 'emerging',
    growing: 'growth',
    mature: 'mainstream',
  };

  const quadrantMap: Record<string, string> = {
    emerging: 'assess',
    growing: 'trial',
    mature: 'adopt',
  };

  const techBatches = [];
  for (let i = 0; i < TECHNOLOGY_CATALOG.length; i += 50) {
    const batch = TECHNOLOGY_CATALOG.slice(i, i + 50).map(tech => ({
      slug: tech.id.replace(/^tech-/, ''),
      name: tech.name,
      description: tech.description.slice(0, 500),
      maturity_stage: maturityMap[tech.maturityLevel] ?? 'emerging',
      radar_quadrant: quadrantMap[tech.maturityLevel] ?? 'assess',
      iker_score: tech.elPasoRelevance === 'high' ? 75 : tech.elPasoRelevance === 'medium' ? 55 : 35,
      signal_velocity: tech.relatedVendorCount,
    }));
    techBatches.push(batch);
  }

  let techCount = 0;
  for (const batch of techBatches) {
    const { error: techErr, data: techData } = await db
      .from('kg_technologies')
      .upsert(batch, { onConflict: 'slug' })
      .select('id');

    if (techErr) {
      console.error('  kg_technologies error:', techErr.message);
    } else {
      techCount += techData?.length ?? 0;
    }
  }
  console.log(`  → ${techCount} technologies upserted`);
  total += techCount;

  // ── 3. Seed kg_companies from vendors ──

  console.log('Seeding kg_companies from vendors...');

  const vendorEntries = Object.entries(EL_PASO_VENDORS);
  let companyCount = 0;

  for (let i = 0; i < vendorEntries.length; i += 50) {
    const batch = vendorEntries.slice(i, i + 50).map(([id, vendor]) => ({
      slug: id,
      name: vendor.name,
      description: vendor.description.slice(0, 500),
      company_type: 'enterprise',
      website: vendor.website || null,
      iker_score: vendor.ikerScore,
      latitude: vendor.lat,
      longitude: vendor.lon,
    }));

    const { error: compErr, data: compData } = await db
      .from('kg_companies')
      .upsert(batch, { onConflict: 'slug' })
      .select('id');

    if (compErr) {
      console.error('  kg_companies error:', compErr.message);
    } else {
      companyCount += compData?.length ?? 0;
    }
  }
  console.log(`  → ${companyCount} companies upserted`);
  total += companyCount;

  // ── 4. Migrate old signals → kg_signals ──

  console.log('Migrating old signals → kg_signals...');

  const { data: oldSignals, error: sigFetchErr } = await db
    .from('signals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (sigFetchErr) {
    console.error('  signals fetch error:', sigFetchErr.message);
  } else if (oldSignals && oldSignals.length > 0) {
    console.log(`  Found ${oldSignals.length} old signals to migrate`);

    const signalTypeMap: Record<string, string> = {
      positive: 'investment',
      negative: 'disruption',
      neutral: 'policy',
      funding: 'investment',
      patent: 'breakthrough',
      research: 'breakthrough',
      regulatory: 'regulatory_change',
      supply_chain: 'supply_chain_risk',
      expansion: 'manufacturing_expansion',
      startup: 'startup_formation',
    };

    const kgSignals = oldSignals.map((s: Record<string, unknown>) => ({
      title: (s.title as string) || 'Signal',
      description: (s.title as string) || null,
      signal_type: signalTypeMap[(s.category as string) ?? ''] ?? signalTypeMap[(s.sentiment as string) ?? ''] ?? 'disruption',
      priority: 'P2' as const,
      source_url: (s.source_url as string) || null,
      source_name: (s.source as string) || null,
      detected_at: (s.published_at as string) || (s.created_at as string) || new Date().toISOString(),
      is_active: true,
    }));

    let sigCount = 0;
    for (let i = 0; i < kgSignals.length; i += 50) {
      const batch = kgSignals.slice(i, i + 50);
      const { error: sigErr, data: sigData } = await db
        .from('kg_signals')
        .insert(batch)
        .select('id');

      if (sigErr) {
        console.error('  kg_signals insert error:', sigErr.message);
        // Try one by one
        for (const sig of batch) {
          const { error: singleErr } = await db.from('kg_signals').insert(sig);
          if (!singleErr) sigCount++;
        }
      } else {
        sigCount += sigData?.length ?? 0;
      }
    }
    console.log(`  → ${sigCount} signals migrated to kg_signals`);
    total += sigCount;
  } else {
    console.log('  No old signals found to migrate');
  }

  // ── 5. Migrate intel_signals → kg_signals ──

  console.log('Migrating intel_signals → kg_signals...');

  const { data: intelSignals, error: intelFetchErr } = await db
    .from('intel_signals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (intelFetchErr) {
    console.error('  intel_signals fetch error:', intelFetchErr.message);
  } else if (intelSignals && intelSignals.length > 0) {
    console.log(`  Found ${intelSignals.length} intel signals to migrate`);

    const intelTypeMap: Record<string, string> = {
      patent_filing: 'breakthrough',
      research_paper: 'breakthrough',
      funding_round: 'investment',
      merger_acquisition: 'investment',
      contract_award: 'investment',
      product_launch: 'breakthrough',
      hiring_signal: 'manufacturing_expansion',
      regulatory_action: 'regulatory_change',
      facility_expansion: 'manufacturing_expansion',
      case_study: 'breakthrough',
    };

    const priorityFromImportance = (score: number): string => {
      if (score >= 80) return 'P0';
      if (score >= 60) return 'P1';
      if (score >= 40) return 'P2';
      return 'P3';
    };

    const kgFromIntel = intelSignals.map((s: Record<string, unknown>) => ({
      title: (s.title as string) || 'Signal',
      description: (s.evidence as string) || (s.title as string) || null,
      signal_type: intelTypeMap[(s.signal_type as string) ?? ''] ?? 'disruption',
      priority: priorityFromImportance((s.importance_score as number) ?? 30),
      source_url: (s.url as string) || null,
      source_name: (s.source as string) || null,
      detected_at: (s.discovered_at as string) || (s.created_at as string) || new Date().toISOString(),
      is_active: true,
    }));

    let intelCount = 0;
    for (let i = 0; i < kgFromIntel.length; i += 50) {
      const batch = kgFromIntel.slice(i, i + 50);
      const { error: intelErr, data: intelData } = await db
        .from('kg_signals')
        .insert(batch)
        .select('id');

      if (intelErr) {
        console.error('  kg_signals (intel) insert error:', intelErr.message);
        for (const sig of batch) {
          const { error: singleErr } = await db.from('kg_signals').insert(sig);
          if (!singleErr) intelCount++;
        }
      } else {
        intelCount += intelData?.length ?? 0;
      }
    }
    console.log(`  → ${intelCount} intel signals migrated to kg_signals`);
    total += intelCount;
  } else {
    console.log('  No intel signals found to migrate');
  }

  // ── Summary ──

  console.log(`\n=== Seed Complete ===`);
  console.log(`  Total records: ${total}`);
  console.log('\nKG tables should now have data. Check:');
  console.log('  - kg_industries');
  console.log('  - kg_technologies');
  console.log('  - kg_companies');
  console.log('  - kg_signals');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
