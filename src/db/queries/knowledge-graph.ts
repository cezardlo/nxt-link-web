import { getDb, isSupabaseConfigured } from '../client';

// ---------- Row types (match Supabase table shapes) ----------

export type EntityType =
  | 'industry'
  | 'company'
  | 'product'
  | 'technology'
  | 'problem'
  | 'signal'
  | 'event'
  | 'location'
  | 'force'
  | 'trajectory'
  | 'opportunity'
  | 'discovery'
  | 'policy';

export type RelationshipType =
  | 'creates'
  | 'uses'
  | 'solves'
  | 'belongs_to'
  | 'related_to'
  | 'occurs_in'
  | 'influences'
  | 'builds'
  | 'funds'
  | 'regulates'
  | 'competes_with'
  | 'supplies'
  | 'enables'
  | 'depends_on'
  | 'located_in'
  | 'accelerates'
  | 'affects';

export type EntityRow = {
  id: string;
  entity_type: EntityType;
  name: string;
  slug: string;
  description: string | null;
  metadata: Record<string, unknown>;
  aliases: string[];
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

export type EntityRelationshipRow = {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: RelationshipType;
  confidence: number;
  evidence_count: number;
  last_seen_at: string;
  source_attribution: string | null;
  created_at: string;
};

// ---------- Insert/upsert payloads ----------

export type EntityUpsert = {
  entity_type: EntityType;
  name: string;
  slug: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
  aliases?: string[];
};

// ---------- Entity CRUD ----------

/** Insert or update an entity by slug + entity_type combo. Returns the entity id. */
export async function upsertEntity(entity: EntityUpsert): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb({ admin: true });
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('entities')
    .upsert(
      {
        entity_type: entity.entity_type,
        name: entity.name,
        slug: entity.slug,
        description: entity.description ?? null,
        metadata: entity.metadata ?? {},
        aliases: JSON.stringify(entity.aliases ?? []),
        updated_at: now,
        last_seen_at: now,
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .maybeSingle();

  if (error) {
    console.warn('[knowledge-graph] upsertEntity warning:', error.message);
    return null;
  }

  return (data as { id: string } | null)?.id ?? null;
}

/** Resolve an entity by name — checks slug, then name, then aliases. Returns entity ID or null. */
export async function resolveEntity(
  name: string,
  type?: EntityType,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // 1. Try slug match
  let q = db.from('entities').select('id').eq('slug', slug);
  if (type) q = q.eq('entity_type', type);
  const { data: bySlug } = await q.limit(1).maybeSingle();
  if (bySlug) return (bySlug as { id: string }).id;

  // 2. Try exact name match (case-insensitive)
  let q2 = db.from('entities').select('id').ilike('name', name);
  if (type) q2 = q2.eq('entity_type', type);
  const { data: byName } = await q2.limit(1).maybeSingle();
  if (byName) return (byName as { id: string }).id;

  // 3. Try alias match — aliases @> '["name"]'
  let q3 = db.from('entities').select('id').contains('aliases', JSON.stringify([name]));
  if (type) q3 = q3.eq('entity_type', type);
  const { data: byAlias } = await q3.limit(1).maybeSingle();
  if (byAlias) return (byAlias as { id: string }).id;

  return null;
}

/** Find an entity by slug, optionally filtering by type. */
export async function getEntityBySlug(
  slug: string,
  type?: EntityType,
): Promise<EntityRow | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb();
  let query = db.from('entities').select('*').eq('slug', slug);

  if (type) {
    query = query.eq('entity_type', type);
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error || !data) return null;

  return data as EntityRow;
}

/** List entities of a given type. */
export async function getEntitiesByType(
  type: EntityType,
  limit?: number,
): Promise<EntityRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const cap = Math.max(1, Math.min(limit ?? 100, 1000));

  const { data, error } = await db
    .from('entities')
    .select('*')
    .eq('entity_type', type)
    .order('name')
    .limit(cap);

  if (error || !data) return [];
  return data as EntityRow[];
}

/** Search entities by name (case-insensitive). */
export async function searchEntities(
  query: string,
  type?: EntityType,
  limit?: number,
): Promise<EntityRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const cap = Math.max(1, Math.min(limit ?? 50, 500));

  let q = db
    .from('entities')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(cap);

  if (type) {
    q = q.eq('entity_type', type);
  }

  const { data, error } = await q;
  if (error || !data) return [];
  return data as EntityRow[];
}

// ---------- Relationship CRUD ----------

/** Create a relationship (skip silently if duplicate source+target+type already exists). */
export async function addRelationship(
  sourceId: string,
  targetId: string,
  type: RelationshipType,
  confidence: number = 1,
  sourceAttribution: string | null = null,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb({ admin: true });

  const now = new Date().toISOString();

  // Check for existing relationship — if found, strengthen it
  const { data: existing } = await db
    .from('entity_relationships')
    .select('id, evidence_count, confidence')
    .eq('source_entity_id', sourceId)
    .eq('target_entity_id', targetId)
    .eq('relationship_type', type)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const row = existing as { id: string; evidence_count: number; confidence: number };
    const newCount = (row.evidence_count ?? 1) + 1;
    // Confidence grows with evidence: min(1.0, base + evidence × 0.05)
    const newConfidence = Math.min(1, Math.max(confidence, row.confidence) + 0.05);

    await db
      .from('entity_relationships')
      .update({
        evidence_count: newCount,
        confidence: newConfidence,
        last_seen_at: now,
        updated_at: now,
      })
      .eq('id', row.id);

    return row.id;
  }

  const { data, error } = await db
    .from('entity_relationships')
    .insert({
      source_entity_id: sourceId,
      target_entity_id: targetId,
      relationship_type: type,
      confidence: Math.max(0, Math.min(confidence, 1)),
      evidence_count: 1,
      last_seen_at: now,
      source_attribution: sourceAttribution,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.warn('[knowledge-graph] addRelationship warning:', error.message);
    return null;
  }

  return (data as { id: string } | null)?.id ?? null;
}

export type RelationshipDirection = 'outgoing' | 'incoming' | 'both';

/** Get all relationships for an entity. */
export async function getRelationships(
  entityId: string,
  direction: RelationshipDirection = 'both',
): Promise<EntityRelationshipRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const results: EntityRelationshipRow[] = [];

  if (direction === 'outgoing' || direction === 'both') {
    const { data } = await db
      .from('entity_relationships')
      .select('*')
      .eq('source_entity_id', entityId);

    if (data) results.push(...(data as EntityRelationshipRow[]));
  }

  if (direction === 'incoming' || direction === 'both') {
    const { data } = await db
      .from('entity_relationships')
      .select('*')
      .eq('target_entity_id', entityId);

    if (data) results.push(...(data as EntityRelationshipRow[]));
  }

  return results;
}

// ---------- Graph traversal ----------

export type ConnectedEntity = EntityRow & {
  relationship: EntityRelationshipRow;
};

/** Get entities connected to this one, optionally filtered by relationship type. depth=1 (direct only). */
export async function getConnectedEntities(
  entityId: string,
  relationshipType?: RelationshipType,
  depth: number = 1,
): Promise<ConnectedEntity[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();

  // Collect entity IDs at each depth level
  const visited = new Set<string>([entityId]);
  let currentIds = [entityId];
  const allRelationships: EntityRelationshipRow[] = [];

  for (let d = 0; d < depth; d++) {
    if (currentIds.length === 0) break;

    const nextIds: string[] = [];

    for (const cid of currentIds) {
      // Outgoing
      let outQ = db
        .from('entity_relationships')
        .select('*')
        .eq('source_entity_id', cid);

      if (relationshipType) {
        outQ = outQ.eq('relationship_type', relationshipType);
      }

      const { data: outgoing } = await outQ;
      if (outgoing) {
        for (const rel of outgoing as EntityRelationshipRow[]) {
          allRelationships.push(rel);
          if (!visited.has(rel.target_entity_id)) {
            visited.add(rel.target_entity_id);
            nextIds.push(rel.target_entity_id);
          }
        }
      }

      // Incoming
      let inQ = db
        .from('entity_relationships')
        .select('*')
        .eq('target_entity_id', cid);

      if (relationshipType) {
        inQ = inQ.eq('relationship_type', relationshipType);
      }

      const { data: incoming } = await inQ;
      if (incoming) {
        for (const rel of incoming as EntityRelationshipRow[]) {
          allRelationships.push(rel);
          if (!visited.has(rel.source_entity_id)) {
            visited.add(rel.source_entity_id);
            nextIds.push(rel.source_entity_id);
          }
        }
      }
    }

    currentIds = nextIds;
  }

  // Remove the seed entity from the set of connected ids
  visited.delete(entityId);
  const connectedIds = Array.from(visited);
  if (connectedIds.length === 0) return [];

  // Fetch all connected entities in one query
  const { data: entities, error } = await db
    .from('entities')
    .select('*')
    .in('id', connectedIds);

  if (error || !entities) return [];

  // Build a map of relationship per connected entity (use the first one found)
  const relMap = new Map<string, EntityRelationshipRow>();
  for (const rel of allRelationships) {
    if (!relMap.has(rel.target_entity_id) && rel.target_entity_id !== entityId) {
      relMap.set(rel.target_entity_id, rel);
    }
    if (!relMap.has(rel.source_entity_id) && rel.source_entity_id !== entityId) {
      relMap.set(rel.source_entity_id, rel);
    }
  }

  return (entities as EntityRow[]).map((ent) => ({
    ...ent,
    relationship: relMap.get(ent.id) ?? allRelationships[0],
  }));
}

// ---------- Convenience: Industry ecosystem ----------

export type IndustryEcosystem = {
  industry: EntityRow | null;
  companies: ConnectedEntity[];
  products: ConnectedEntity[];
  technologies: ConnectedEntity[];
  problems: ConnectedEntity[];
};

/** Get all companies, products, technologies, and problems connected to an industry. */
export async function getIndustryEcosystem(
  industrySlug: string,
): Promise<IndustryEcosystem> {
  const empty: IndustryEcosystem = {
    industry: null,
    companies: [],
    products: [],
    technologies: [],
    problems: [],
  };

  if (!isSupabaseConfigured()) return empty;

  const industry = await getEntityBySlug(industrySlug, 'industry');
  if (!industry) return empty;

  const connected = await getConnectedEntities(industry.id);

  return {
    industry,
    companies: connected.filter((e) => e.entity_type === 'company'),
    products: connected.filter((e) => e.entity_type === 'product'),
    technologies: connected.filter((e) => e.entity_type === 'technology'),
    problems: connected.filter((e) => e.entity_type === 'problem'),
  };
}
