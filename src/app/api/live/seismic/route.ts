import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';

export const dynamic = 'force-dynamic';

// El Paso center — 500km radius covers the entire region + Trans-Pecos
const EP_LAT = 31.7619;
const EP_LON = -106.485;
const RADIUS_KM = 500;

export type SeismicEvent = {
  id: string;
  lat: number;
  lon: number;
  magnitude: number;
  depth:     number;   // km
  place:     string;
  time:      number;   // unix ms
  significance: number;
};

let _cache: { data: SeismicEvent[]; ts: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — seismic data doesn't need 30s refresh

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `live-seismic:${ip}`, maxRequests: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  if (_cache && Date.now() - _cache.ts < CACHE_TTL_MS) {
    return NextResponse.json({ ok: true, events: _cache.data, cached: true });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);

  try {
    // USGS Earthquake Catalog — past 30 days, M1.0+, within 500km of El Paso
    const url = [
      'https://earthquake.usgs.gov/fdsnws/event/1/query',
      `?format=geojson`,
      `&latitude=${EP_LAT}`,
      `&longitude=${EP_LON}`,
      `&maxradiuskm=${RADIUS_KM}`,
      `&minmagnitude=1.0`,
      `&limit=100`,
      `&orderby=time`,
    ].join('');

    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`USGS HTTP ${res.status}`);

    type USGSFeature = {
      id: string;
      geometry: { coordinates: [number, number, number] };
      properties: { mag: number; place: string; time: number; sig: number };
    };

    const json = await res.json() as { features: USGSFeature[] };

    const events: SeismicEvent[] = (json.features ?? []).map((f) => ({
      id:           f.id,
      lon:          f.geometry.coordinates[0],
      lat:          f.geometry.coordinates[1],
      depth:        f.geometry.coordinates[2],
      magnitude:    f.properties.mag,
      place:        f.properties.place,
      time:         f.properties.time,
      significance: f.properties.sig,
    }));

    _cache = { data: events, ts: Date.now() };
    return NextResponse.json({ ok: true, events }, { headers: { 'Cache-Control': 'no-store' } });

  } catch {
    if (_cache) return NextResponse.json({ ok: true, events: _cache.data, stale: true });
    return NextResponse.json({ ok: true, events: [] });
  } finally {
    clearTimeout(timer);
  }
}
