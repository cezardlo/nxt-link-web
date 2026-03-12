import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';

export const dynamic = 'force-dynamic';

// TxDOT DriveTexas traffic cameras — best-effort, no auth required
// Unofficial API; graceful empty-array fallback on any failure

export type CameraSnapshot = {
  id: string;
  name: string;
  imageUrl: string;
  lat: number;
  lon: number;
};

export type BorderCamerasResponse = {
  ok: boolean;
  cameras: CameraSnapshot[];
  note?: string;
  cached?: boolean;
};

// Module-level 10-min cache
let _cache: { data: BorderCamerasResponse; ts: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

// Bridge of Americas reference point — used to sort cameras by proximity
const BOTA_LAT = 31.745;
const BOTA_LON = -106.480;

type DriveTexasCamera = {
  id?:           string | number;
  roadwayName?:  string;
  name?:         string;
  lat?:          number;
  lon?:          number;
  imageUrl?:     string;
  snapshotUrl?:  string;
};

const EMPTY_OK: BorderCamerasResponse = { ok: true, cameras: [], note: 'Camera feed unavailable' };

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchCameras(): Promise<BorderCamerasResponse> {
  // El Paso bounding box: west=-106.6, south=31.6, east=-106.1, north=31.9
  const url =
    'https://api.drivetexas.org/v4/cameras?west=-106.6&south=31.6&east=-106.1&north=31.9';

  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'NxtLinkBorderAgent/1.0' },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) return EMPTY_OK;

  const rawList = await res.json() as DriveTexasCamera[];
  if (!Array.isArray(rawList)) return EMPTY_OK;

  const cameras: CameraSnapshot[] = rawList
    .filter((c) => c.lat && c.lon && (c.imageUrl ?? c.snapshotUrl))
    .map((c) => ({
      id:       String(c.id ?? Math.random()),
      name:     c.roadwayName ?? c.name ?? 'Camera',
      imageUrl: (c.imageUrl ?? c.snapshotUrl) as string,
      lat:      c.lat as number,
      lon:      c.lon as number,
    }))
    .sort(
      (a, b) =>
        haversineKm(a.lat, a.lon, BOTA_LAT, BOTA_LON) -
        haversineKm(b.lat, b.lon, BOTA_LAT, BOTA_LON),
    )
    .slice(0, 6);

  return { ok: true, cameras };
}

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `border-cameras:${ip}`, maxRequests: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  if (_cache && Date.now() - _cache.ts < CACHE_TTL_MS) {
    return NextResponse.json({ ..._cache.data, cached: true });
  }

  try {
    const data = await fetchCameras();
    _cache = { data, ts: Date.now() };
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    _cache = { data: EMPTY_OK, ts: Date.now() };
    return NextResponse.json(EMPTY_OK);
  }
}
