// scripts/seed-knowledge-graph.ts
// One-time script to populate the knowledge graph from existing static data.
//
// Seeds:
//   - 8 core industries → industry entities
//   - 45 technologies → technology entities
//   - 199 vendors → company entities
//   - BELONGS_TO relationships (vendor → industry)
//   - USES relationships (vendor → technology, based on tag matching)
//
// Usage:
//   npx tsx scripts/seed-knowledge-graph.ts
//
// Safe to re-run (upserts by slug, relationships deduplicate).

import { isSupabaseConfigured } from '../src/db/client';
import { upsertEntity, addRelationship } from '../src/db/queries/knowledge-graph';
import { TECHNOLOGY_CATALOG, INDUSTRIES } from '../src/lib/data/technology-catalog';
import { EL_PASO_VENDORS } from '../src/lib/data/el-paso-vendors';

async function seed() {
  console.log('=== NXT LINK — Knowledge Graph Seed ===\n');

  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  let entitiesCreated = 0;
  let relationshipsCreated = 0;

  // ── 1. Industries ──

  console.log('Seeding industries...');
  const industryIdMap = new Map<string, string>();

  for (const ind of INDUSTRIES) {
    const id = await upsertEntity({
      entity_type: 'industry',
      name: ind.label,
      slug: ind.slug,
      description: `${ind.label} industry sector`,
      metadata: { color: ind.color, is_core: true },
    });
    if (id) {
      industryIdMap.set(ind.slug, id);
      entitiesCreated++;
    }
  }
  console.log(`  → ${industryIdMap.size} industries seeded`);

  // ── 2. Technologies ──

  console.log('Seeding technologies...');
  const techIdMap = new Map<string, string>();

  for (const tech of TECHNOLOGY_CATALOG) {
    const slug = tech.id.replace(/^tech-/, '');
    const id = await upsertEntity({
      entity_type: 'technology',
      name: tech.name,
      slug,
      description: tech.description.slice(0, 500),
      metadata: {
        category: tech.category,
        maturity: tech.maturityLevel,
        vendor_count: tech.relatedVendorCount,
        el_paso_relevance: tech.elPasoRelevance,
      },
    });
    if (id) {
      techIdMap.set(tech.name.toLowerCase(), id);
      entitiesCreated++;

      // Technology BELONGS_TO industry (based on category)
      const categoryToIndustry: Record<string, string> = {
        'AI/ML': 'ai-ml',
        'Cybersecurity': 'cybersecurity',
        'Defense': 'defense',
        'Border Tech': 'defense',
        'Manufacturing': 'manufacturing',
        'Energy': 'energy',
        'Healthcare': 'healthcare',
        'Logistics': 'logistics',
      };
      const industrySlug = categoryToIndustry[tech.category];
      const industryId = industrySlug ? industryIdMap.get(industrySlug) : null;

      if (id && industryId) {
        const relId = await addRelationship(id, industryId, 'belongs_to', 0.9, 'seed-script');
        if (relId) relationshipsCreated++;
      }
    }
  }
  console.log(`  → ${techIdMap.size} technologies seeded`);

  // ── 3. Vendors (Companies) ──

  console.log('Seeding vendors as company entities...');
  let vendorCount = 0;

  const categoryToIndustry: Record<string, string> = {
    'Defense': 'defense',
    'Cybersecurity': 'cybersecurity',
    'AI/ML': 'ai-ml',
    'Healthcare': 'healthcare',
    'Manufacturing': 'manufacturing',
    'Energy': 'energy',
    'Logistics': 'logistics',
    'Supply Chain': 'logistics',
    'Border Tech': 'defense',
    'Construction': 'construction',
    'Agriculture': 'agriculture',
    'Fintech': 'fintech',
  };

  for (const [vendorId, vendor] of Object.entries(EL_PASO_VENDORS)) {
    const slug = vendorId;
    const id = await upsertEntity({
      entity_type: 'company',
      name: vendor.name,
      slug,
      description: vendor.description.slice(0, 500),
      metadata: {
        website: vendor.website,
        iker_score: vendor.ikerScore,
        lat: vendor.lat,
        lon: vendor.lon,
        confidence: vendor.confidence,
      },
    });

    if (id) {
      vendorCount++;
      entitiesCreated++;

      // Company BELONGS_TO industry
      const industrySlug = categoryToIndustry[vendor.category];
      const industryId = industrySlug ? industryIdMap.get(industrySlug) : null;

      if (industryId) {
        const relId = await addRelationship(id, industryId, 'belongs_to', vendor.confidence, 'seed-script');
        if (relId) relationshipsCreated++;
      }

      // Company USES technology (match tags against tech names)
      for (const tag of vendor.tags) {
        const techId = techIdMap.get(tag.toLowerCase());
        if (techId) {
          const relId = await addRelationship(id, techId, 'uses', 0.7, 'seed-script');
          if (relId) relationshipsCreated++;
        }
      }
    }
  }
  console.log(`  → ${vendorCount} vendors seeded`);

  // ── Summary ──

  console.log(`\n=== Seed Complete ===`);
  console.log(`  Entities created/updated: ${entitiesCreated}`);
  console.log(`  Relationships created: ${relationshipsCreated}`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
