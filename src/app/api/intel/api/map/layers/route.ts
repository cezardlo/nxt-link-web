import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { EL_PASO_VENDORS, vendorsToMapPoints } from '@/lib/data/el-paso-vendors';

export const dynamic = 'force-dynamic';

// GET /api/intel/api/map/layers?timeRange=168&layers=vendors,funding,momentum
// Native Vercel replacement for the Python Intel backend map layers endpoint.
// Returns { ok: true, points: MapLayerPoint[] }
export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `intel-layers:${ip}`, maxRequests: 60, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const layersParam = searchParams.get('layers');

  const filterLayers = layersParam
    ? new Set(layersParam.split(',').map((l) => l.trim()).filter(Boolean))
    : undefined;

  const points = vendorsToMapPoints(EL_PASO_VENDORS, filterLayers);

  return NextResponse.json({ ok: true, points }, { headers: { 'Cache-Control': 'no-store' } });
}
