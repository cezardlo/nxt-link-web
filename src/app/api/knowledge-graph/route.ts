export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import {
  searchEntities,
  getEntitiesByType,
  getConnectedEntities,
  getEntityBySlug,
  getIndustryEcosystem,
} from '@/db/queries/knowledge-graph';
import type { EntityType, RelationshipType } from '@/db/queries/knowledge-graph';


// GET /api/knowledge-graph
// Query modes:
//   ?q=search_term           → search entities by name
//   ?type=company             → list entities by type
//   ?slug=palantir&ecosystem  → get full industry ecosystem
//   ?entity=<slug>&connected  → get connected entities
export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `kg:${ip}`, maxRequests: 30, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const type = searchParams.get('type') as EntityType | null;
  const slug = searchParams.get('slug');
  const entitySlug = searchParams.get('entity');
  const ecosystem = searchParams.has('ecosystem');
  const connected = searchParams.has('connected');
  const relType = searchParams.get('relationship') as RelationshipType | null;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);

  // Search mode
  if (q) {
    const results = await searchEntities(q, type ?? undefined, limit);
    return NextResponse.json({ ok: true, results });
  }

  // Industry ecosystem mode
  if (slug && ecosystem) {
    const eco = await getIndustryEcosystem(slug);
    return NextResponse.json({ ok: true, ...eco });
  }

  // Connected entities mode
  if (entitySlug && connected) {
    const entity = await getEntityBySlug(entitySlug);
    if (!entity) {
      return NextResponse.json({ ok: false, message: 'Entity not found.' }, { status: 404 });
    }
    const entities = await getConnectedEntities(entity.id, relType ?? undefined);
    return NextResponse.json({ ok: true, entity, connected: entities });
  }

  // List by type
  if (type) {
    const entities = await getEntitiesByType(type, limit);
    return NextResponse.json({ ok: true, entities });
  }

  return NextResponse.json({ ok: false, message: 'Provide ?q=, ?type=, ?slug=&ecosystem, or ?entity=&connected' }, { status: 400 });
}
