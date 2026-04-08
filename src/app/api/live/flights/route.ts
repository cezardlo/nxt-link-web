export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';


// El Paso / Fort Bliss bounding box (±1.5° around city center)
const BBOX = { lamin: 30.3, lamax: 33.1, lomin: -108.0, lomax: -104.9 };

// ── Aircraft Classification Prefix Sets ─────────────────────────────

export type FlightCategory = 'VIP' | 'MILITARY' | 'CARGO' | 'COMMERCIAL' | 'PRIVATE';

// VIP / Government callsign prefixes (checked first — highest priority)
const VIP_PREFIXES = ['SAM', 'EXEC', 'AF1', 'AF2', 'VENUS', 'NIGHTWATCH', 'SPAR'];

// Military callsign prefixes (USAF, Army, Navy, special ops)
const MILITARY_PREFIXES = [
  'RCH', 'REACH', 'EVAC', 'USAF', 'NAVY', 'ARMY',
  'HKYD', 'PAT', 'BLADE', 'GHOST', 'PACK', 'ROCKY', 'IRON',
  'STEEL', 'HAVOC', 'BARON', 'KARMA', 'JAKE', 'TUSC',
  'DUKE', 'EAGLE', 'BOXER', 'HOMER', 'RANGER', 'PANTHER',
];

// Cargo operator ICAO prefixes
const CARGO_PREFIXES = [
  'FDX', 'UPS', 'GTI', 'ABX', 'ATN', 'CLX', 'BOX', 'CKS',
  'GEC', 'MPH', 'SQC', 'CAO', 'ADB', 'NCR', 'PAC',
];

// Commercial airline ICAO prefixes (US + regional + Mexico)
const COMMERCIAL_PREFIXES = [
  'AAL', 'SWA', 'UAL', 'DAL', 'JBU', 'NKS', 'FFT', 'ASA',
  'HAL', 'SKW', 'RPA', 'ENY', 'ASH', 'JIA', 'PDT', 'CPZ',
  'EDV', 'GJS', 'MES', 'OPT', 'ACA', 'AMX', 'VOI', 'VXP',
];

// Operator name lookup (prefix -> friendly name)
const OPERATOR_NAMES: Record<string, string> = {
  // VIP
  SAM: 'USAF Special Air Mission', EXEC: 'Executive Flight',
  AF1: 'Air Force One', AF2: 'Air Force Two', VENUS: 'USAF Venus', SPAR: 'USAF SPAR',
  // Military
  RCH: 'USAF AMC', REACH: 'USAF AMC', EVAC: 'AeroMedEvac',
  USAF: 'US Air Force', NAVY: 'US Navy', ARMY: 'US Army',
  HAVOC: 'US Army Aviation', BARON: 'USAF Training',
  // Cargo
  FDX: 'FedEx Express', UPS: 'UPS Airlines', GTI: 'Atlas Air',
  ABX: 'ABX Air', ATN: 'Air Transport Intl', CLX: 'Cargolux',
  // Commercial
  AAL: 'American Airlines', SWA: 'Southwest Airlines', UAL: 'United Airlines',
  DAL: 'Delta Air Lines', JBU: 'JetBlue Airways', NKS: 'Spirit Airlines',
  FFT: 'Frontier Airlines', ASA: 'Alaska Airlines', HAL: 'Hawaiian Airlines',
  SKW: 'SkyWest Airlines', ENY: 'Envoy Air', ASH: 'Mesa Airlines',
  ACA: 'Air Canada', AMX: 'Aeromexico', VOI: 'Volaris',
};

type ClassifyResult = { category: FlightCategory; operator: string };

function classifyFlight(callsign: string): ClassifyResult {
  const upper = callsign.trim().toUpperCase();

  for (const prefix of VIP_PREFIXES) {
    if (upper.startsWith(prefix)) {
      return { category: 'VIP', operator: OPERATOR_NAMES[prefix] ?? 'VIP Transport' };
    }
  }
  for (const prefix of MILITARY_PREFIXES) {
    if (upper.startsWith(prefix)) {
      return { category: 'MILITARY', operator: OPERATOR_NAMES[prefix] ?? 'Military' };
    }
  }
  for (const prefix of CARGO_PREFIXES) {
    if (upper.startsWith(prefix)) {
      return { category: 'CARGO', operator: OPERATOR_NAMES[prefix] ?? 'Cargo Operator' };
    }
  }
  for (const prefix of COMMERCIAL_PREFIXES) {
    if (upper.startsWith(prefix)) {
      return { category: 'COMMERCIAL', operator: OPERATOR_NAMES[prefix] ?? 'Commercial Airline' };
    }
  }

  return { category: 'PRIVATE', operator: 'Private / GA' };
}

// ── FlightState Type ────────────────────────────────────────────────

export type FlightPhase = 'CLIMBING' | 'DESCENDING' | 'CRUISING';

export type FlightState = {
  id: string;          // ICAO24 hex
  callsign: string;
  lat: number;
  lon: number;
  altitudeM: number;    // meters (baro)
  altitudeFt: number;   // feet
  velocityKts: number;  // knots
  headingDeg: number;   // true track degrees
  verticalFpm: number;  // feet per minute (+ = climb, − = descend)
  phase: FlightPhase;
  squawk: string;       // transponder code (e.g. '7700' = emergency)
  country: string;
  category: FlightCategory;
  operator: string;
  isMilitary: boolean;  // derived: category === 'MILITARY' || category === 'VIP'
  approachingELP: boolean;  // descending within ~20nm of KELP below 15k ft
  trail: Array<[number, number]>;  // recent [lon, lat] positions for trail rendering
  demo?: true;          // present only when OpenSky returned 0 aircraft
};

// ── Helpers needed before DEMO_FLIGHTS (const doesn't hoist) ────────

function derivePhase(vertRateMps: number): FlightPhase {
  if (vertRateMps > 1.5) return 'CLIMBING';
  if (vertRateMps < -1.5) return 'DESCENDING';
  return 'CRUISING';
}

// El Paso International Airport (KELP) — approach detection
const KELP_LAT = 31.8072;
const KELP_LON = -106.3778;
const APPROACH_RADIUS_NM = 20;

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Demo Flights ─────────────────────────────────────────────────────
// Shown only when OpenSky returns an empty aircraft array.
// Positions are realistic: KELP approach corridor, Fort Bliss airspace, etc.

function makeDemoFlight(
  id: string,
  callsign: string,
  lat: number,
  lon: number,
  altitudeFt: number,
  velocityKts: number,
  headingDeg: number,
  verticalFpm: number,
  category: FlightCategory,
  operator: string,
  squawk = '1200',
  country = 'United States',
): FlightState {
  const altitudeM = Math.round(altitudeFt / 3.28084);
  const phase = derivePhase(verticalFpm / 196.85);
  const approachingELP =
    phase === 'DESCENDING' &&
    haversineNm(lat, lon, KELP_LAT, KELP_LON) <= APPROACH_RADIUS_NM &&
    altitudeFt < 15000;
  return {
    id,
    callsign,
    lat,
    lon,
    altitudeM,
    altitudeFt,
    velocityKts,
    headingDeg,
    verticalFpm,
    phase,
    squawk,
    country,
    category,
    operator,
    isMilitary: category === 'MILITARY' || category === 'VIP',
    approachingELP,
    trail: [[lon, lat]],
    demo: true,
  };
}

// Eight representative aircraft — updated positions each call would require
// state, so for demos we keep them static but realistic.
const DEMO_FLIGHTS: FlightState[] = [
  // Commercial — AAL on approach from the east, descending into KELP
  makeDemoFlight(
    'demo-aal1', 'AAL2547',
    31.815, -106.210,   // ~10nm east of KELP
    8200, 210, 265, -800,
    'COMMERCIAL', 'American Airlines', '4521',
  ),
  // Commercial — SWA inbound from the west, higher altitude
  makeDemoFlight(
    'demo-swa1', 'SWA3892',
    31.790, -106.620,   // ~13nm west of KELP
    14500, 240, 95, -1200,
    'COMMERCIAL', 'Southwest Airlines', '4522',
  ),
  // Commercial — UAL at cruise altitude transiting south-to-north
  makeDemoFlight(
    'demo-ual1', 'UAL1703',
    31.680, -106.480,   // south of city, cruising
    33000, 420, 15, 0,
    'COMMERCIAL', 'United Airlines', '2441',
  ),
  // Military — ARMY helicopter near Fort Bliss
  makeDemoFlight(
    'demo-army1', 'ARMY7501',
    31.820, -106.415,   // Fort Bliss flight line
    3500, 110, 180, 0,
    'MILITARY', 'US Army Aviation', '7000',
  ),
  // Military — RCH (USAF AMC) C-17 departing north
  makeDemoFlight(
    'demo-rch1', 'RCH2104',
    31.900, -106.390,   // just north of KELP / Biggs AAF
    6800, 280, 350, 1400,
    'MILITARY', 'USAF AMC', '7001',
  ),
  // Cargo — FedEx inbound from Dallas corridor
  makeDemoFlight(
    'demo-fdx1', 'FDX3321',
    31.830, -106.050,   // ~18nm east, on final approach arc
    11000, 195, 280, -900,
    'CARGO', 'FedEx Express', '4523',
  ),
  // Private — GA aircraft departing El Paso westbound
  makeDemoFlight(
    'demo-prv1', 'N8847K',
    31.800, -106.500,   // just west of the field, climbing out
    5200, 140, 270, 600,
    'PRIVATE', 'Private / GA',
  ),
  // Private — small GA transiting south at low altitude
  makeDemoFlight(
    'demo-prv2', 'N2293X',
    31.710, -106.350,
    4100, 120, 340, 0,
    'PRIVATE', 'Private / GA',
  ),
];

// Module-level 30-second cache — avoids hammering OpenSky rate limits
let _cache: { data: FlightState[]; ts: number } | null = null;
const CACHE_TTL_MS = 30_000;

// Position history for flight trail rendering (last 6 positions per aircraft)
const _positionHistory = new Map<string, Array<[number, number]>>();
const MAX_TRAIL_POINTS = 6;

// OpenSky state vector index constants
const I_ICAO24      = 0;
const I_CALLSIGN    = 1;
const I_COUNTRY     = 2;
const I_LON         = 5;
const I_LAT         = 6;
const I_ALT_BARO    = 7;
const I_ON_GROUND   = 8;
const I_VELOCITY    = 9;
const I_HEADING     = 10;
const I_VERT_RATE   = 11;
const I_SQUAWK      = 14;

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `live-flights:${ip}`, maxRequests: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  // Serve from cache if still fresh
  if (_cache && Date.now() - _cache.ts < CACHE_TTL_MS) {
    return NextResponse.json({ ok: true, aircraft: _cache.data, cached: true });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);

  try {
    const url = `https://opensky-network.org/api/states/all?lamin=${BBOX.lamin}&lamax=${BBOX.lamax}&lomin=${BBOX.lomin}&lomax=${BBOX.lomax}`;

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: ctrl.signal,
    });

    if (!res.ok) throw new Error(`OpenSky HTTP ${res.status}`);

    const json = await res.json() as { states?: unknown[][] };
    const states = json.states ?? [];

    const aircraft: FlightState[] = [];

    for (const s of states) {
      const lat = s[I_LAT] as number | null;
      const lon = s[I_LON] as number | null;
      const onGround = s[I_ON_GROUND] as boolean;

      // Skip aircraft with no position or on the ground
      if (!lat || !lon || onGround) continue;

      const callsign  = ((s[I_CALLSIGN] as string | null) ?? '').trim() || 'UNKNOWN';
      const altM      = (s[I_ALT_BARO]  as number | null) ?? 0;
      const vel       = (s[I_VELOCITY]   as number | null) ?? 0;
      const heading   = (s[I_HEADING]    as number | null) ?? 0;
      const vertRate  = (s[I_VERT_RATE]  as number | null) ?? 0;
      const squawk    = ((s[I_SQUAWK]    as string | null) ?? '').trim();

      const { category, operator } = classifyFlight(callsign);

      const icao = s[I_ICAO24] as string;
      const altFt = Math.round(altM * 3.28084);
      const phase = derivePhase(vertRate);

      // Update position history for trail rendering
      const hist = _positionHistory.get(icao) ?? [];
      hist.push([lon, lat]);
      if (hist.length > MAX_TRAIL_POINTS) hist.shift();
      _positionHistory.set(icao, hist);

      aircraft.push({
        id: icao,
        callsign,
        lat,
        lon,
        altitudeM:   Math.round(altM),
        altitudeFt:  altFt,
        velocityKts: Math.round(vel * 1.94384),
        headingDeg:  Math.round(heading),
        verticalFpm: Math.round(vertRate * 196.85),
        phase,
        squawk,
        country:     (s[I_COUNTRY] as string | null) ?? '',
        category,
        operator,
        isMilitary:  category === 'MILITARY' || category === 'VIP',
        approachingELP: phase === 'DESCENDING' &&
          haversineNm(lat, lon, KELP_LAT, KELP_LON) <= APPROACH_RADIUS_NM &&
          altFt < 15000,
        trail: [...hist],
      });
    }

    // Prune trail history for aircraft no longer in range
    const activeIds = new Set(aircraft.map((a) => a.id));
    for (const key of Array.from(_positionHistory.keys())) {
      if (!activeIds.has(key)) _positionHistory.delete(key);
    }

    // If OpenSky returned nothing (rate-limited, off-peak, or empty skies)
    // serve demo flights so the map layers are never blank.
    const payload = aircraft.length > 0 ? aircraft : DEMO_FLIGHTS;

    _cache = { data: payload, ts: Date.now() };
    return NextResponse.json(
      { ok: true, aircraft: payload, demo: aircraft.length === 0 },
      { headers: { 'Cache-Control': 'no-store' } },
    );

  } catch {
    // Return cached stale data if available, otherwise serve demo flights
    if (_cache) {
      return NextResponse.json({ ok: true, aircraft: _cache.data, stale: true });
    }
    return NextResponse.json(
      { ok: true, aircraft: DEMO_FLIGHTS, demo: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } finally {
    clearTimeout(timer);
  }
}
