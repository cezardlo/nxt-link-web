export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';


/**
 * GET /api/explore
 * Returns entities and relationships for the knowledge graph explorer.
 * 
 * Query params:
 *   ?type=company|technology|industry|product|problem  — filter by entity type
 *   ?industry=ai-ml                                    — filter by industry slug
 *   ?entity=<id>                                       — get a single entity + its connections
 *   ?limit=200                                         — max entities to return
 */
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const sp = req.nextUrl.searchParams;

  const entityId = sp.get('entity');
  const entityType = sp.get('type');
  const industrySlug = sp.get('industry');
  const limit = Math.min(parseInt(sp.get('limit') || '200'), 500);

  // ── Single entity + connections ──────────────────────────────────────────
  if (entityId) {
    const [entityRes, relsOutRes, relsInRes] = await Promise.all([
      supabase.from('entities').select('*').eq('id', entityId).single(),
      supabase.from('entity_relationships').select('*, target:target_entity_id(id, name, slug, entity_type)').eq('source_entity_id', entityId).limit(50),
      supabase.from('entity_relationships').select('*, source:source_entity_id(id, name, slug, entity_type)').eq('target_entity_id', entityId).limit(50),
    ]);

    return NextResponse.json({
      entity: entityRes.data,
      outgoing: relsOutRes.data || [],
      incoming: relsInRes.data || [],
    });
  }

  // ── Graph overview: entities + relationships ─────────────────────────────
  let entityQuery = supabase
    .from('entities')
    .select('id, name, slug, entity_type, description, metadata')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (entityType) {
    entityQuery = entityQuery.eq('entity_type', entityType);
  }

  // If filtering by industry, get connected entities
  if (industrySlug) {
    const { data: industry } = await supabase
      .from('entities')
      .select('id')
      .eq('slug', industrySlug)
      .eq('entity_type', 'industry')
      .single();

    if (industry) {
      // Get all entities connected to this industry
      const { data: rels } = await supabase
        .from('entity_relationships')
        .select('source_entity_id, target_entity_id')
        .or(`source_entity_id.eq.${industry.id},target_entity_id.eq.${industry.id}`)
        .limit(200);

      if (rels && rels.length > 0) {
        const connectedIds = new Set<string>();
        connectedIds.add(industry.id);
        for (const r of rels) {
          connectedIds.add(r.source_entity_id);
          connectedIds.add(r.target_entity_id);
        }
        entityQuery = supabase
          .from('entities')
          .select('id, name, slug, entity_type, description, metadata')
          .in('id', Array.from(connectedIds))
          .limit(limit);
      }
    }
  }

  const [entitiesRes, relsRes, statsRes] = await Promise.all([
    entityQuery,
    supabase
      .from('entity_relationships')
      .select('id, source_entity_id, target_entity_id, relationship_type, confidence, evidence_count')
      .order('evidence_count', { ascending: false })
      .limit(limit * 3),
    supabase.from('entities').select('entity_type', { count: 'exact' }),
  ]);

  let entities = entitiesRes.data || [];
  const relationships = relsRes.data || [];

  // ── Vendor fallback: if entities table returns 0 rows (RLS / empty), ───────
  // populate from vendors table so the knowledge graph always renders.
  if (entities.length === 0) {
    const { data: vendors } = await supabase
      .from('vendors')
      .select('"ID", company_name, sector, iker_score, description')
      .not('iker_score', 'is', null)
      .order('iker_score', { ascending: false })
      .limit(150);

    if (vendors && vendors.length > 0) {
      entities = vendors.map((v: Record<string, unknown>) => ({
        id: String(v['ID']),
        name: String(v['company_name'] ?? 'Unknown'),
        slug: String(v['company_name'] ?? '').toLowerCase().replace(/\s+/g, '-'),
        entity_type: 'company',
        description: String(v['description'] ?? v['sector'] ?? ''),
        metadata: { iker_score: v['iker_score'], sector: v['sector'] },
      }));
    }
  }

  // Build type counts
  const typeCounts: Record<string, number> = {};
  if (statsRes.data) {
    for (const row of statsRes.data) {
      const t = (row as { entity_type: string }).entity_type;
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    }
  }
  // If using vendor fallback, set type counts manually
  if (!typeCounts['company'] && entities.length > 0) {
    typeCounts['company'] = entities.length;
  }

  // Filter relationships to only include entities we have
  const entityIds = new Set(entities.map((e: { id: string }) => e.id));
  const validRels = relationships.filter(
    (r: { source_entity_id: string; target_entity_id: string }) =>
      entityIds.has(r.source_entity_id) && entityIds.has(r.target_entity_id)
  );

  return NextResponse.json({
    entities,
    relationships: validRels,
    stats: {
      total_entities: statsRes.count || entities.length,
      type_counts: typeCounts,
      total_relationships: relationships.length,
    },
  });
}
