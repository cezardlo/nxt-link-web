// POST /api/agents/seed-graph
// Seeds the knowledge graph (entities table) from static TypeScript data:
//   - 8 industries  → entity_type: industry
//   - 45 technologies → entity_type: technology (+ belongs_to industry links)
//   - 199 vendors   → entity_type: company    (+ belongs_to industry links)
//
// If Supabase is not configured, returns a dry-run summary of what WOULD be seeded.
// Safe to call multiple times — all writes use upsert (slug + entity_type unique key).
// Protected by CRON_SECRET.

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/db/client';
import { upsertEntity, addRelationship } from '@/db/queries/knowledge-graph';
import { TECHNOLOGY_CATALOG, INDUSTRIES } from '@/lib/data/technology-catalog';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';
import { requireCronSecret } from '@/lib/http/cron-auth';

export const maxDuration = 60;

// Maps vendor / technology categories to canonical industry slugs (from INDUSTRIES)
const CATEGORY_TO_INDUSTRY_SLUG: Record<string, string> = {
  'AI/ML':          'ai-ml',
  'Cybersecurity':  'cybersecurity',
  'Defense':        'defense',
  'Border Tech':    'border-tech',
  'Manufacturing':  'manufacturing',
  'Energy':         'energy',
  'Healthcare':     'healthcare',
  'Logistics':      'logistics',
  'Supply Chain':   'logistics',
  'Construction':   'manufacturing', // closest match in core 8
  'Agriculture':    'energy',        // closest available — no agriculture industry yet
  'Fintech':        'ai-ml',         // closest available — no fintech industry yet
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = requireCronSecret(request.headers);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }

  const supabaseReady = isSupabaseConfigured();

  // ── Dry-run when Supabase is not configured ──────────────────────────────────
  if (!supabaseReady) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      supabase_configured: false,
      message: 'Supabase not configured — this is a preview of what would be seeded.',
      would_seed: {
        industries: INDUSTRIES.length,
        technologies: TECHNOLOGY_CATALOG.length,
        vendors: Object.keys(EL_PASO_VENDORS).length,
        total_entities: INDUSTRIES.length + TECHNOLOGY_CATALOG.length + Object.keys(EL_PASO_VENDORS).length,
        sample_industries: INDUSTRIES.map((i) => i.label),
        sample_technologies: TECHNOLOGY_CATALOG.slice(0, 5).map((t) => t.name),
        sample_vendors: Object.values(EL_PASO_VENDORS).slice(0, 5).map((v) => v.name),
      },
    });
  }

  // ── Live seed ────────────────────────────────────────────────────────────────

  const counts = {
    industries_upserted: 0,
    technologies_upserted: 0,
    vendors_upserted: 0,
    relationships_created: 0,
    errors: 0,
  };

  // 1. Industries — seed all 8 core industry nodes first
  const industryIdMap = new Map<string, string>();

  for (const ind of INDUSTRIES) {
    try {
      const id = await upsertEntity({
        entity_type: 'industry',
        name: ind.label,
        slug: ind.slug,
        description: ind.description,
        metadata: { color: ind.color, category: ind.category, is_core: true },
      });
      if (id) {
        industryIdMap.set(ind.slug, id);
        counts.industries_upserted++;
      }
    } catch {
      counts.errors++;
    }
  }

  // 2. Technologies — upsert and link to industry
  const techIdMap = new Map<string, string>(); // tech name (lowercase) → entity id

  for (const tech of TECHNOLOGY_CATALOG) {
    try {
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
          government_budget_fy25m: tech.governmentBudgetFY25M ?? null,
        },
      });

      if (id) {
        techIdMap.set(tech.name.toLowerCase(), id);
        counts.technologies_upserted++;

        // Link technology → industry
        const industrySlug = CATEGORY_TO_INDUSTRY_SLUG[tech.category];
        const industryId = industrySlug ? industryIdMap.get(industrySlug) : undefined;
        if (industryId) {
          const relId = await addRelationship(id, industryId, 'belongs_to', 0.9, 'seed-graph');
          if (relId) counts.relationships_created++;
        }
      }
    } catch {
      counts.errors++;
    }
  }

  // 3. Vendors — upsert as company entities and link to industry + technologies
  for (const [vendorId, vendor] of Object.entries(EL_PASO_VENDORS)) {
    try {
      const id = await upsertEntity({
        entity_type: 'company',
        name: vendor.name,
        slug: vendorId,
        description: vendor.description.slice(0, 500),
        metadata: {
          website: vendor.website,
          iker_score: vendor.ikerScore,
          lat: vendor.lat,
          lon: vendor.lon,
          confidence: vendor.confidence,
          category: vendor.category,
          layer: vendor.layer,
        },
      });

      if (id) {
        counts.vendors_upserted++;

        // Link vendor → industry
        const industrySlug = CATEGORY_TO_INDUSTRY_SLUG[vendor.category];
        const industryId = industrySlug ? industryIdMap.get(industrySlug) : undefined;
        if (industryId) {
          const relId = await addRelationship(id, industryId, 'belongs_to', vendor.confidence, 'seed-graph');
          if (relId) counts.relationships_created++;
        }

        // Link vendor → technologies via tag matching
        for (const tag of vendor.tags) {
          const techId = techIdMap.get(tag.toLowerCase());
          if (techId) {
            const relId = await addRelationship(id, techId, 'uses', 0.7, 'seed-graph');
            if (relId) counts.relationships_created++;
          }
        }
      }
    } catch {
      counts.errors++;
    }
  }

  const totalEntities =
    counts.industries_upserted + counts.technologies_upserted + counts.vendors_upserted;

  console.info(
    `[seed-graph] ${totalEntities} entities seeded, ${counts.relationships_created} relationships created, ${counts.errors} errors`,
  );

  return NextResponse.json({
    ok: true,
    dry_run: false,
    supabase_configured: true,
    message: `Seeded ${totalEntities} entities and ${counts.relationships_created} relationships`,
    ...counts,
    total_entities: totalEntities,
  });
}

// Allow GET for easy manual triggering
export async function GET(request: NextRequest): Promise<NextResponse> {
  return POST(request);
}
