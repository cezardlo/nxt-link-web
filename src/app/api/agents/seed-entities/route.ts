// POST /api/agents/seed-entities
// Seeds all NXT_ENTITIES into the Supabase knowledge graph.
// Safe to call multiple times — uses upsert (no duplicates).
// Protected by CRON_SECRET to prevent abuse.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { NXT_ENTITIES } from '@/lib/intelligence/nxt-entities';
import { upsertEntity, addRelationship, resolveEntity } from '@/db/queries/knowledge-graph';
import { isSupabaseConfigured } from '@/db/client';
import { requireCronSecret } from '@/lib/http/cron-auth';

export const maxDuration = 60;

// Map entity categories to canonical industry slugs
const CATEGORY_TO_INDUSTRY: Record<string, string> = {
  'Defense Tech':           'defense-technology',
  'Global Defense':         'defense-technology',
  'Border Tech':            'border-security',
  'Logistics':              'supply-chain-logistics',
  'Logistics Platform':     'supply-chain-logistics',
  'Supply Chain Software':  'supply-chain-logistics',
  'Global Supply Chain':    'supply-chain-logistics',
  'Water Tech':             'water-technology',
  'Energy Tech':            'energy-technology',
  'Energy Intelligence':    'energy-technology',
  'Health Tech':            'healthcare-technology',
  'AI / R&D':               'artificial-intelligence',
  'Global AI':              'artificial-intelligence',
  'University':             'research-education',
  'Robotics & Automation':  'robotics-automation',
  'Warehouse Automation':   'robotics-automation',
  'Global Robotics':        'robotics-automation',
  'Manufacturing Tech':     'advanced-manufacturing',
  'Industrial Automation':  'advanced-manufacturing',
  'Industrial AI':          'industrial-ai',
  'Computer Vision':        'computer-vision',
  'Global Cybersecurity':   'cybersecurity',
  'Semiconductor':          'semiconductors',
  'Drone & Autonomy':       'autonomous-systems',
};

export async function POST(request: Request): Promise<NextResponse> {
  const auth = requireCronSecret(request.headers);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase not configured' }, { status: 503 });
  }

  const results = { upserted: 0, linked: 0, errors: 0 };

  // Pre-create all industry nodes
  const industryIds = new Map<string, string>();
  const uniqueIndustries = new Set(Object.values(CATEGORY_TO_INDUSTRY));
  for (const slug of uniqueIndustries) {
    const label = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const id = await upsertEntity({
      entity_type: 'industry',
      name: label,
      slug,
      description: `${label} sector`,
      metadata: { auto_seeded: true },
    });
    if (id) industryIds.set(slug, id);
  }

  // Batch process all entities in groups of 20
  const BATCH = 20;
  for (let i = 0; i < NXT_ENTITIES.length; i += BATCH) {
    const batch = NXT_ENTITIES.slice(i, i + BATCH);

    await Promise.all(batch.map(async (entity) => {
      try {
        const slug = entity.id;
        const entityId = await upsertEntity({
          entity_type: 'company',
          name: entity.name,
          slug,
          description: entity.keywords.slice(0, 3).join(', '),
          metadata: {
            category: entity.category,
            iker_score: entity.ikerScore ?? 70,
            naics_codes: entity.naicsCodes ?? [],
            keywords: entity.keywords,
          },
          aliases: entity.aliases,
        });

        if (entityId) {
          results.upserted++;

          // Link company → industry
          const industrySlug = CATEGORY_TO_INDUSTRY[entity.category];
          if (industrySlug) {
            const industryId = industryIds.get(industrySlug);
            if (industryId) {
              await addRelationship(entityId, industryId, 'belongs_to', 0.9, 'seed');
              results.linked++;
            }
          }
        }
      } catch {
        results.errors++;
      }
    }));
  }

  // Also link top technologies to industries
  const techLinks: Array<[string, string, string]> = [
    ['nvidia', 'artificial-intelligence', 'enables'],
    ['openai', 'artificial-intelligence', 'creates'],
    ['crowdstrike', 'cybersecurity', 'belongs_to'],
    ['palantir', 'defense-technology', 'supplies'],
    ['anduril', 'defense-technology', 'belongs_to'],
    ['boston-dynamics', 'robotics-automation', 'belongs_to'],
  ];

  for (const [entitySlug, industrySlug, relType] of techLinks) {
    const entityId = await resolveEntity(entitySlug, 'company');
    const industryId = industryIds.get(industrySlug);
    if (entityId && industryId) {
      await addRelationship(entityId, industryId, relType as Parameters<typeof addRelationship>[2], 0.95, 'seed-enhanced');
    }
  }

  return NextResponse.json({
    ok: true,
    message: `Seeded ${results.upserted} entities, ${results.linked} industry links`,
    ...results,
    total_entities: NXT_ENTITIES.length,
  });
}

// Also allow GET for easy triggering from cron
export async function GET(request: Request): Promise<NextResponse> {
  return POST(request);
}
