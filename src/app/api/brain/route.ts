// GET /api/brain — El Paso Brain snapshot
// Returns the full intelligence state: signals, predictions, sectors, zones, connections

import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { generateBrainSnapshot, EP_ENTITIES, getEntity, getConnected } from '@/lib/intelligence/el-paso-brain';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({ key: `brain:${ip}`, maxRequests: 20, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ ok: false, message: 'Rate limit.' }, { status: 429 });

  const url = new URL(request.url);
  const entityId = url.searchParams.get('entity');

  // Single entity deep dive
  if (entityId) {
    const entity = getEntity(entityId);
    if (!entity) return NextResponse.json({ ok: false, message: `Entity ${entityId} not found.` }, { status: 404 });
    const connected = getConnected(entityId);
    return NextResponse.json({
      ok: true,
      entity,
      connected,
      connection_count: connected.length,
    });
  }

  // Full brain snapshot
  const snapshot = generateBrainSnapshot();
  return NextResponse.json({
    ok: true,
    ...snapshot,
    entities: EP_ENTITIES.length,
  });
}
