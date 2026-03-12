import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { EL_PASO_VENDORS, VendorRecord } from '@/lib/data/el-paso-vendors';
import { TECHNOLOGY_CATALOG, Technology } from '@/lib/data/technology-catalog';
import { GLOBAL_TECH_HUBS, TechHub } from '@/lib/data/global-tech-hubs';

export const dynamic = 'force-dynamic';

type EntityType = 'vendor' | 'tech' | 'hub';

const VALID_TYPES: EntityType[] = ['vendor', 'tech', 'hub'];

type RelatedEntity = {
  type: EntityType;
  id: string;
  name: string;
  relationship: string;
  confidence: number;
};

type SourceEntity =
  | { kind: 'vendor'; data: VendorRecord }
  | { kind: 'tech'; data: Technology }
  | { kind: 'hub'; data: TechHub };

// Jaccard coefficient between two token sets
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  a.forEach((t) => { if (b.has(t)) intersection++; });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Tokenise to lowercase strings
function tokenise(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2),
  );
}

// Haversine distance in km
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Resolve an entity by id + type, returning a typed union or null
function resolveEntity(id: string, type: EntityType): SourceEntity | null {
  if (type === 'vendor') {
    const v = EL_PASO_VENDORS[id];
    return v ? { kind: 'vendor', data: v } : null;
  }
  if (type === 'tech') {
    const t = (TECHNOLOGY_CATALOG as Technology[]).find((x) => x.id === id);
    return t ? { kind: 'tech', data: t } : null;
  }
  if (type === 'hub') {
    const h = (GLOBAL_TECH_HUBS as TechHub[]).find((x) => x.id === id);
    return h ? { kind: 'hub', data: h } : null;
  }
  return null;
}

// --- Vendor-seeded graph traversal ---

function vendorRelated(
  source: VendorRecord,
  depth: number,
): RelatedEntity[] {
  const results: RelatedEntity[] = [];
  const sourceTags = new Set(source.tags.map((t) => t.toLowerCase()));
  const sourceTokens = tokenise([source.name, source.description, source.category].join(' '));

  const candidates = Object.values(EL_PASO_VENDORS) as VendorRecord[];

  for (const v of candidates) {
    if (v.id === source.id) continue;

    const relationships: string[] = [];
    let confidence = 0;

    // Same category
    if (v.category === source.category) {
      relationships.push('same category');
      confidence = Math.max(confidence, 0.75);
    }

    // Overlapping tags (Jaccard ≥ 0.2)
    const vTags = new Set(v.tags.map((t) => t.toLowerCase()));
    const tagScore = jaccard(sourceTags, vTags);
    if (tagScore >= 0.2) {
      relationships.push('overlapping capabilities');
      confidence = Math.max(confidence, tagScore * 0.9);
    }

    // Same layer (map layer proximity)
    if (v.layer === source.layer) {
      relationships.push('same market tier');
      confidence = Math.max(confidence, 0.55);
    }

    // Geographic proximity ≤ 5 km
    const distKm = haversineKm(source.lat, source.lon, v.lat, v.lon);
    if (distKm <= 5) {
      relationships.push('geographic cluster');
      confidence = Math.max(confidence, 0.65 - distKm * 0.02);
    }

    // Depth-2: text similarity between descriptions
    if (depth >= 2) {
      const vTokens = tokenise([v.name, v.description, v.category].join(' '));
      const textScore = jaccard(sourceTokens, vTokens);
      if (textScore >= 0.1) {
        relationships.push('related domain');
        confidence = Math.max(confidence, textScore * 0.7);
      }
    }

    if (relationships.length > 0) {
      results.push({
        type: 'vendor',
        id: v.id,
        name: v.name,
        relationship: relationships.join(', '),
        confidence: Math.round(confidence * 100) / 100,
      });
    }
  }

  // Also connect vendors to matching technologies
  const techs = TECHNOLOGY_CATALOG as Technology[];
  for (const t of techs) {
    const techTokens = tokenise([t.name, t.description, t.category].join(' '));
    const tagTokens = tokenise(source.tags.join(' '));
    const techTagScore = jaccard(tagTokens, new Set(t.procurementSignalKeywords.flatMap((k) => k.toLowerCase().split(' '))));
    const textScore = jaccard(sourceTokens, techTokens);

    const best = Math.max(techTagScore, textScore);
    if (best >= 0.15) {
      results.push({
        type: 'tech',
        id: t.id,
        name: t.name,
        relationship: 'technology alignment',
        confidence: Math.round(Math.min(0.95, best * 0.85) * 100) / 100,
      });
    }
  }

  return results;
}

// --- Technology-seeded graph traversal ---

function techRelated(
  source: Technology,
  depth: number,
): RelatedEntity[] {
  const results: RelatedEntity[] = [];
  const sourceTokens = tokenise([source.name, source.description, source.category, ...source.procurementSignalKeywords].join(' '));

  // Related technologies
  for (const t of TECHNOLOGY_CATALOG as Technology[]) {
    if (t.id === source.id) continue;

    const relationships: string[] = [];
    let confidence = 0;

    if (t.category === source.category) {
      relationships.push('same category');
      confidence = Math.max(confidence, 0.7);
    }

    if (depth >= 2) {
      const tTokens = tokenise([t.name, t.description, t.category, ...t.procurementSignalKeywords].join(' '));
      const score = jaccard(sourceTokens, tTokens);
      if (score >= 0.1) {
        relationships.push('related domain');
        confidence = Math.max(confidence, score * 0.85);
      }
    }

    if (t.elPasoRelevance === source.elPasoRelevance) {
      relationships.push('same El Paso relevance tier');
      confidence = Math.max(confidence, 0.5);
    }

    if (relationships.length > 0) {
      results.push({
        type: 'tech',
        id: t.id,
        name: t.name,
        relationship: relationships.join(', '),
        confidence: Math.round(confidence * 100) / 100,
      });
    }
  }

  // Vendors that align to this technology
  const vendors = Object.values(EL_PASO_VENDORS) as VendorRecord[];
  for (const v of vendors) {
    const vTokens = tokenise([v.name, v.description, v.category, ...v.tags].join(' '));
    const score = jaccard(sourceTokens, vTokens);
    if (score >= 0.1) {
      results.push({
        type: 'vendor',
        id: v.id,
        name: v.name,
        relationship: 'vendor capability match',
        confidence: Math.round(Math.min(0.95, score * 0.9) * 100) / 100,
      });
    }
  }

  return results;
}

// --- Hub-seeded graph traversal ---

function hubRelated(
  source: TechHub,
  depth: number,
): RelatedEntity[] {
  const results: RelatedEntity[] = [];
  const sourceSectors = new Set(source.topSectors.map((s) => s.toLowerCase()));
  const sourceTokens = tokenise([source.name, source.description, source.relevanceToElPaso, ...source.topSectors].join(' '));

  for (const h of GLOBAL_TECH_HUBS as TechHub[]) {
    if (h.id === source.id) continue;

    const relationships: string[] = [];
    let confidence = 0;

    const hSectors = new Set(h.topSectors.map((s) => s.toLowerCase()));
    const sectorScore = jaccard(sourceSectors, hSectors);
    if (sectorScore >= 0.2) {
      relationships.push('overlapping sectors');
      confidence = Math.max(confidence, sectorScore * 0.85);
    }

    if (h.country === source.country) {
      relationships.push('same country');
      confidence = Math.max(confidence, 0.6);
    }

    if (h.threatLevel === source.threatLevel) {
      relationships.push('same threat profile');
      confidence = Math.max(confidence, 0.45);
    }

    if (depth >= 2) {
      const hTokens = tokenise([h.name, h.description, h.relevanceToElPaso, ...h.topSectors].join(' '));
      const textScore = jaccard(sourceTokens, hTokens);
      if (textScore >= 0.1) {
        relationships.push('related intelligence domain');
        confidence = Math.max(confidence, textScore * 0.75);
      }
    }

    if (relationships.length > 0) {
      results.push({
        type: 'hub',
        id: h.id,
        name: h.name,
        relationship: relationships.join(', '),
        confidence: Math.round(confidence * 100) / 100,
      });
    }
  }

  return results;
}

// GET /api/discover/related?id=ep-l3harris&type=vendor&depth=2
export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({ key: `discover-related:${ip}`, maxRequests: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const url = new URL(request.url);
  const id = (url.searchParams.get('id') ?? '').trim();
  const rawType = url.searchParams.get('type') ?? '';
  const depthParam = url.searchParams.get('depth');
  const depth = Math.min(3, Math.max(1, parseInt(depthParam ?? '1', 10) || 1));
  const limitParam = url.searchParams.get('limit');
  const limit = Math.min(100, Math.max(1, parseInt(limitParam ?? '20', 10) || 20));

  if (!id) {
    return NextResponse.json(
      { ok: false, message: 'Missing required parameter: id' },
      { status: 400 },
    );
  }

  if (!VALID_TYPES.includes(rawType as EntityType)) {
    return NextResponse.json(
      { ok: false, message: `Missing or invalid parameter: type. Allowed: ${VALID_TYPES.join(', ')}` },
      { status: 400 },
    );
  }

  const entityType = rawType as EntityType;

  try {
    const source = resolveEntity(id, entityType);

    if (!source) {
      return NextResponse.json(
        { ok: false, message: `Entity not found: ${entityType}/${id}` },
        { status: 404 },
      );
    }

    let related: RelatedEntity[] = [];

    if (source.kind === 'vendor') {
      related = vendorRelated(source.data, depth);
    } else if (source.kind === 'tech') {
      related = techRelated(source.data, depth);
    } else if (source.kind === 'hub') {
      related = hubRelated(source.data, depth);
    }

    // Sort by confidence descending, deduplicate on id+type
    const seen = new Set<string>();
    related = related
      .sort((a, b) => b.confidence - a.confidence)
      .filter((r) => {
        const key = `${r.type}:${r.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit);

    // Build a lightweight summary of the source entity for the response
    let entitySummary: Record<string, unknown>;
    if (source.kind === 'vendor') {
      entitySummary = {
        type: 'vendor',
        id: source.data.id,
        name: source.data.name,
        category: source.data.category,
        ikerScore: source.data.ikerScore,
        tags: source.data.tags,
      };
    } else if (source.kind === 'tech') {
      entitySummary = {
        type: 'tech',
        id: source.data.id,
        name: source.data.name,
        category: source.data.category,
        maturityLevel: source.data.maturityLevel,
        elPasoRelevance: source.data.elPasoRelevance,
      };
    } else {
      entitySummary = {
        type: 'hub',
        id: source.data.id,
        name: source.data.name,
        region: source.data.region,
        topSectors: source.data.topSectors,
        threatLevel: source.data.threatLevel,
      };
    }

    return NextResponse.json(
      {
        ok: true,
        entity: entitySummary,
        related,
        total: related.length,
        depth,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : 'Related entity discovery failed.' },
      { status: 500 },
    );
  }
}
