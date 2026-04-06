import {
  addRelationship,
  type EntityType,
  type RelationshipType,
  upsertEntity,
} from '@/db/queries/knowledge-graph';
import { getIntelSignals, type IntelSignalRow } from '@/db/queries/intel-signals';
import { isSupabaseConfigured } from '@/db/client';
import {
  analyzeSignalIntake,
  type PipelineQualityReport,
  type SourceQualityScore,
} from '@/lib/intelligence/source-intelligence';

export type MappingSignal = Pick<
  IntelSignalRow,
  | 'id'
  | 'title'
  | 'signal_type'
  | 'industry'
  | 'company'
  | 'importance_score'
  | 'confidence'
  | 'source'
  | 'evidence'
  | 'discovered_at'
  | 'normalized_source'
  | 'source_label'
  | 'source_trust'
  | 'evidence_quality'
  | 'quality_score'
>;

export type MappedEntity = {
  id: string;
  slug: string;
  type: EntityType;
  name: string;
  confidence: number;
  metadata: Record<string, unknown>;
};

export type MappedRelationship = {
  source: string;
  target: string;
  type: RelationshipType;
  confidence: number;
  evidence: string;
};

export type MapPoint = {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  signalCount: number;
  avgImportance: number;
  topIndustries: string[];
};

export type MappingReport = {
  scannedSignals: number;
  sourceScores: SourceQualityScore[];
  pipeline: PipelineQualityReport;
  entities: MappedEntity[];
  relationships: MappedRelationship[];
  mapPoints: MapPoint[];
};

type LocationSeed = {
  slug: string;
  name: string;
  aliases: string[];
  latitude: number;
  longitude: number;
};

const LOCATION_SEEDS: LocationSeed[] = [
  { slug: 'el-paso-tx', name: 'El Paso, Texas', aliases: ['el paso', 'el paso texas', 'el paso tx'], latitude: 31.7619, longitude: -106.485 },
  { slug: 'fort-bliss-tx', name: 'Fort Bliss, Texas', aliases: ['fort bliss'], latitude: 31.8123, longitude: -106.4212 },
  { slug: 'juarez-mx', name: 'Ciudad Juarez, Mexico', aliases: ['juarez', 'ciudad juarez'], latitude: 31.6904, longitude: -106.4245 },
  { slug: 'texas-us', name: 'Texas, United States', aliases: ['texas'], latitude: 31.0, longitude: -99.0 },
  { slug: 'new-mexico-us', name: 'New Mexico, United States', aliases: ['new mexico'], latitude: 34.5199, longitude: -105.8701 },
  { slug: 'arizona-us', name: 'Arizona, United States', aliases: ['arizona'], latitude: 34.0489, longitude: -111.0937 },
  { slug: 'mexico-country', name: 'Mexico', aliases: ['mexico'], latitude: 23.6345, longitude: -102.5528 },
  { slug: 'united-states', name: 'United States', aliases: ['united states', 'u.s.', 'usa', 'u.s.a.'], latitude: 39.8283, longitude: -98.5795 },
];

const FALLBACK_SIGNALS: MappingSignal[] = [
  {
    id: 'sig-el-paso-logistics-1',
    title: 'El Paso logistics automation investment expands cross-border capacity',
    signal_type: 'funding_round',
    industry: 'logistics',
    company: 'BorderFlow Systems',
    importance_score: 0.81,
    confidence: 0.82,
    source: 'https://example.com/el-paso-logistics',
    evidence: 'Expansion tied to El Paso and Ciudad Juarez freight movement.',
    discovered_at: new Date().toISOString(),
  },
  {
    id: 'sig-fort-bliss-defense-1',
    title: 'Fort Bliss awards autonomous convoy support contract',
    signal_type: 'contract_award',
    industry: 'defense',
    company: 'Northrop Grumman',
    importance_score: 0.86,
    confidence: 0.88,
    source: 'https://example.com/fort-bliss-contract',
    evidence: 'Contract references Fort Bliss operations and regional testing.',
    discovered_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 'sig-texas-energy-1',
    title: 'Texas supply chain operators adopt new grid resilience tooling',
    signal_type: 'product_launch',
    industry: 'energy',
    company: null,
    importance_score: 0.67,
    confidence: 0.74,
    source: 'https://example.com/texas-energy',
    evidence: 'Adoption pattern observed across Texas logistics hubs.',
    discovered_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function dedupeByKey<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function detectLocations(signal: MappingSignal): LocationSeed[] {
  const haystack = [
    signal.title,
    signal.evidence ?? '',
    signal.source ?? '',
    signal.company ?? '',
    signal.industry,
  ]
    .join(' ')
    .toLowerCase();

  return LOCATION_SEEDS.filter((seed) =>
    seed.aliases.some((alias) => haystack.includes(alias.toLowerCase()))
  );
}

function buildEntity(signal: MappingSignal, type: EntityType, name: string, confidence: number, metadata: Record<string, unknown> = {}): MappedEntity {
  return {
    id: `${type}:${slugify(name)}`,
    slug: slugify(name),
    type,
    name,
    confidence,
    metadata,
  };
}

function buildSignalEntity(signal: MappingSignal): MappedEntity {
  return {
    id: signal.id,
    slug: slugify(signal.title),
    type: 'signal',
    name: signal.title,
    confidence: signal.confidence ?? signal.importance_score ?? 0.6,
    metadata: {
      signal_type: signal.signal_type,
      industry: signal.industry,
      company: signal.company,
      importance_score: signal.importance_score,
      discovered_at: signal.discovered_at,
      normalized_source: signal.normalized_source,
      source_label: signal.source_label,
      source_trust: signal.source_trust,
      evidence_quality: signal.evidence_quality,
      quality_score: signal.quality_score,
    },
  };
}

export async function loadSignalsForMapping(limit = 100): Promise<MappingSignal[]> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_SIGNALS.slice(0, Math.max(1, Math.min(limit, FALLBACK_SIGNALS.length)));
  }

  const signals = await getIntelSignals({ limit: Math.min(limit * 3, 500) });
  if (signals.length === 0) {
    return FALLBACK_SIGNALS.slice(0, Math.max(1, Math.min(limit, FALLBACK_SIGNALS.length)));
  }
  return signals;
}

export function buildMappingReport(signals: MappingSignal[]): MappingReport {
  const intake = analyzeSignalIntake(signals as IntelSignalRow[], {
    fallbackUsed: !isSupabaseConfigured(),
    limit: signals.length,
  });
  const entities: MappedEntity[] = [];
  const relationships: MappedRelationship[] = [];
  const locationSignalMap = new Map<string, { seed: LocationSeed; signals: MappingSignal[] }>();

  for (const signal of intake.signals as MappingSignal[]) {
    const signalEntity = buildSignalEntity(signal);
    entities.push(signalEntity);

    const industryEntity = buildEntity(signal, 'industry', signal.industry, 0.8, { source: 'signal.industry' });
    entities.push(industryEntity);
    relationships.push({
      source: signalEntity.id,
      target: industryEntity.id,
      type: 'affects',
      confidence: Math.max(0.6, signal.confidence ?? 0.6),
      evidence: signal.title,
    });

    if (signal.company) {
      const companyEntity = buildEntity(signal, 'company', signal.company, Math.max(0.65, signal.confidence ?? 0.65), {
        source: signal.source,
        normalized_source: signal.normalized_source,
        source_trust: signal.source_trust,
      });
      entities.push(companyEntity);
      relationships.push({
        source: signalEntity.id,
        target: companyEntity.id,
        type: 'related_to',
        confidence: Math.max(0.65, signal.confidence ?? 0.65),
        evidence: signal.title,
      });
      relationships.push({
        source: companyEntity.id,
        target: industryEntity.id,
        type: 'belongs_to',
        confidence: 0.72,
        evidence: signal.industry,
      });
    }

    const locations = detectLocations(signal);
    for (const location of locations) {
      const locationEntity: MappedEntity = {
        id: `location:${location.slug}`,
        slug: location.slug,
        type: 'location',
        name: location.name,
        confidence: 0.78,
        metadata: {
          latitude: location.latitude,
          longitude: location.longitude,
          source_trust: signal.source_trust,
        },
      };
      entities.push(locationEntity);
      relationships.push({
        source: signalEntity.id,
        target: locationEntity.id,
        type: 'occurs_in',
        confidence: 0.78,
        evidence: signal.title,
      });

      const bucket = locationSignalMap.get(location.slug) ?? { seed: location, signals: [] };
      bucket.signals.push(signal);
      locationSignalMap.set(location.slug, bucket);
    }
  }

  const dedupedEntities = dedupeByKey(entities, (entity) => entity.id);
  const dedupedRelationships = dedupeByKey(
    relationships,
    (rel) => `${rel.source}|${rel.target}|${rel.type}`
  );

  const mapPoints: MapPoint[] = Array.from(locationSignalMap.values()).map(({ seed, signals: scopedSignals }) => {
    const totalImportance = scopedSignals.reduce((sum, signal) => sum + (signal.importance_score ?? 0), 0);
    const industries = new Map<string, number>();
    for (const signal of scopedSignals) {
      industries.set(signal.industry, (industries.get(signal.industry) ?? 0) + 1);
    }
    const topIndustries = Array.from(industries.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([industry]) => industry);

    return {
      slug: seed.slug,
      name: seed.name,
      latitude: seed.latitude,
      longitude: seed.longitude,
      signalCount: scopedSignals.length,
      avgImportance: scopedSignals.length > 0 ? Math.round((totalImportance / scopedSignals.length) * 1000) / 1000 : 0,
      topIndustries,
    };
  });

  return {
    scannedSignals: intake.pipeline.scannedSignals,
    sourceScores: intake.sourceScores,
    pipeline: intake.pipeline,
    entities: dedupedEntities,
    relationships: dedupedRelationships,
    mapPoints,
  };
}

export async function persistMappingReport(report: MappingReport): Promise<{ entities: number; relationships: number }> {
  let persistedEntities = 0;
  let persistedRelationships = 0;

  const entityIdMap = new Map<string, string>();
  for (const entity of report.entities) {
    const persistedId = await upsertEntity({
      entity_type: entity.type,
      name: entity.name,
      slug: entity.slug,
      metadata: entity.metadata,
    });
    if (persistedId) {
      persistedEntities += 1;
      entityIdMap.set(entity.id, persistedId);
    }
  }

  for (const relationship of report.relationships) {
    const sourceId = entityIdMap.get(relationship.source);
    const targetId = entityIdMap.get(relationship.target);
    if (!sourceId || !targetId) continue;

    const relationshipId = await addRelationship(
      sourceId,
      targetId,
      relationship.type,
      relationship.confidence,
      relationship.evidence
    );
    if (relationshipId) {
      persistedRelationships += 1;
    }
  }

  return {
    entities: persistedEntities,
    relationships: persistedRelationships,
  };
}
