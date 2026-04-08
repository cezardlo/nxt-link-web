export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';


import type { MapPoint } from '@/types/map';

type OpportunitySignal = {
  id: string;
  source: string;
  sourceLabel: string;
  headline: string;
  detectedAt: string;
  amountUsd?: number | null;
  location?: string;
  url?: string;
};

type OpportunitiesApiResponse = {
  ok?: boolean;
  signals?: OpportunitySignal[];
};

// ─── El Paso coordinate zones ─────────────────────────────────────────────────

// Zone anchor points per signal source
const FUNDING_ZONES: Record<string, { lat: number; lon: number }> = {
  sam:          { lat: 31.810,  lon: -106.415 }, // Fort Bliss / DoD contracts
  usaspending:  { lat: 31.808,  lon: -106.412 }, // Fort Bliss cluster
  sbir:         { lat: 31.769,  lon: -106.499 }, // UTEP innovation zone
  nsf:          { lat: 31.773,  lon: -106.504 }, // UTEP research campus
  grants:       { lat: 31.756,  lon: -106.485 }, // Downtown EP
  bts:          { lat: 31.746,  lon: -106.480 }, // Border / BOTA
  ercot:        { lat: 31.721,  lon: -106.249 }, // East EP / grid infrastructure
};

const PATENT_ZONES: Record<string, { lat: number; lon: number }> = {
  uspto:        { lat: 31.812,  lon: -106.409 }, // Raytheon / L3Harris defense zone
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function idHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Deterministic ±range/2 jitter so dots don't stack and don't drift on refresh
function jitter(base: { lat: number; lon: number }, seed: number, range = 0.014) {
  return {
    lat: base.lat + ((seed % 1000) / 1000 - 0.5) * range,
    lon: base.lon + (((seed >> 10) % 1000) / 1000 - 0.5) * range,
  };
}

// Normalize amountUsd to a 0.5-0.95 weight (log-scaled so $1M and $100M aren't the same)
function amountToWeight(usd: number | null | undefined): number {
  if (!usd || usd <= 0) return 0.55;
  return Math.min(0.95, 0.45 + Math.log10(usd) / 16);
}

function signalToMapPoint(signal: OpportunitySignal, layer: 'funding' | 'patents'): MapPoint {
  const zones = layer === 'patents' ? PATENT_ZONES : FUNDING_ZONES;
  const base = zones[signal.source] ?? (layer === 'patents' ? PATENT_ZONES.uspto : FUNDING_ZONES.grants);
  const seed = idHash(signal.id);
  const { lat, lon } = jitter(base, seed);

  const label = signal.headline.length > 52
    ? signal.headline.slice(0, 52) + '…'
    : signal.headline;

  return {
    id:         signal.id,
    lat,
    lon,
    label,
    category:   signal.sourceLabel,
    layer,
    weight:     amountToWeight(signal.amountUsd),
    confidence: 0.80,
    entity_id:  signal.id,
  };
}

function resolveOrigin(request: Request): string {
  try { return new URL(request.url).origin; }
  catch { return 'http://localhost:3000'; }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `map-layers:${ip}`, maxRequests: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, points: [] }, { status: 429 });
  }

  const url = new URL(request.url);
  const layerParam = url.searchParams.get('layers') ?? '';
  const requested = new Set(layerParam.split(',').map((s) => s.trim()).filter(Boolean));

  const needsFunding = requested.has('funding');
  const needsPatents = requested.has('patents');

  // No live-data layers requested — return empty (MapCanvas still shows stubs)
  if (!needsFunding && !needsPatents) {
    return NextResponse.json({ ok: true, points: [] });
  }

  try {
    const origin = resolveOrigin(request);
    const res = await fetch(`${origin}/api/live/opportunities`, {
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) return NextResponse.json({ ok: true, points: [] });

    const data = (await res.json()) as OpportunitiesApiResponse;
    const signals = Array.isArray(data.signals) ? data.signals : [];

    const points: MapPoint[] = [];

    for (const signal of signals) {
      // Skip demo fallback signals — only show real API data
      if (signal.id.startsWith('fallback-')) continue;

      const src = signal.source;

      if (needsFunding && ['sam', 'usaspending', 'sbir', 'nsf', 'grants', 'bts', 'ercot'].includes(src)) {
        points.push(signalToMapPoint(signal, 'funding'));
      }

      if (needsPatents && src === 'uspto') {
        points.push(signalToMapPoint(signal, 'patents'));
      }
    }

    return NextResponse.json({ ok: true, points }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: true, points: [] });
  }
}
