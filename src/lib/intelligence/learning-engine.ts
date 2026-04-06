import type { RelationshipType, EntityType } from '@/db/queries/knowledge-graph';
import type { MappingSignal, MapPoint } from '@/lib/intelligence/mapping-engine';

export type LearnedSourceScore = {
  source: string;
  normalizedSource?: string;
  signalCount: number;
  acceptedSignals?: number;
  discardedSignals?: number;
  avgConfidence: number;
  avgImportance: number;
  recencyScore: number;
  evidenceQuality?: number;
  duplicateRate?: number;
  noiseScore?: number;
  trustScore: number;
};

export type LearnedMomentumScore = {
  slug: string;
  name: string;
  signalCount: number;
  avgImportance: number;
  avgConfidence: number;
  recencyScore: number;
  momentumScore: number;
};

export type LearnedCompanyScore = {
  slug: string;
  name: string;
  signalCount: number;
  industries: string[];
  avgImportance: number;
  avgConfidence: number;
  locationCount: number;
  priorityScore: number;
};

type LearningEntity = {
  id: string;
  type: EntityType;
  name: string;
};

type LearningRelationship = {
  source: string;
  target: string;
  type: RelationshipType;
};

export type BrainLearningReport = {
  sourceScores: LearnedSourceScore[];
  industryMomentum: LearnedMomentumScore[];
  locationMomentum: LearnedMomentumScore[];
  companyPriority: LearnedCompanyScore[];
  summary: {
    strongestSource: string | null;
    hottestIndustry: string | null;
    hottestLocation: string | null;
    highestPriorityCompany: string | null;
  };
};

type SignalAccumulator = {
  name: string;
  slug: string;
  signalCount: number;
  importanceTotal: number;
  confidenceTotal: number;
  recencyTotal: number;
};

type CompanyAccumulator = SignalAccumulator & {
  industries: Set<string>;
  locations: Set<string>;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function computeRecencyScore(discoveredAt?: string): number {
  if (!discoveredAt) return 0.4;

  const ageMs = Date.now() - new Date(discoveredAt).getTime();
  if (Number.isNaN(ageMs)) return 0.4;
  if (ageMs <= 6 * 60 * 60 * 1000) return 1;
  if (ageMs <= 24 * 60 * 60 * 1000) return 0.9;
  if (ageMs <= 3 * 24 * 60 * 60 * 1000) return 0.72;
  if (ageMs <= 7 * 24 * 60 * 60 * 1000) return 0.58;
  if (ageMs <= 30 * 24 * 60 * 60 * 1000) return 0.42;
  return 0.24;
}

function averageFromAccumulator(bucket: SignalAccumulator) {
  const count = Math.max(bucket.signalCount, 1);
  return {
    avgImportance: bucket.importanceTotal / count,
    avgConfidence: bucket.confidenceTotal / count,
    avgRecency: bucket.recencyTotal / count,
  };
}

function buildLocationLookup(
  entities: LearningEntity[],
  relationships: LearningRelationship[]
): Map<string, Set<string>> {
  const locationNames = new Map<string, string>();
  const signalsByLocation = new Map<string, Set<string>>();

  for (const entity of entities) {
    if (entity.type === 'location') {
      locationNames.set(entity.id, entity.name);
    }
  }

  for (const relationship of relationships) {
    if (relationship.type !== 'occurs_in') continue;
    if (!locationNames.has(relationship.target)) continue;

    const bucket = signalsByLocation.get(relationship.source) ?? new Set<string>();
    bucket.add(locationNames.get(relationship.target) ?? relationship.target);
    signalsByLocation.set(relationship.source, bucket);
  }

  return signalsByLocation;
}

export function buildBrainLearningReport(
  signals: MappingSignal[],
  entities: LearningEntity[],
  relationships: LearningRelationship[],
  mapPoints: MapPoint[]
): BrainLearningReport {
  const sourceBuckets = new Map<string, SignalAccumulator>();
  const industryBuckets = new Map<string, SignalAccumulator>();
  const companyBuckets = new Map<string, CompanyAccumulator>();
  const signalLocations = buildLocationLookup(entities, relationships);

  for (const signal of signals) {
    const importance = clamp(signal.importance_score ?? 0.5);
    const confidence = clamp(signal.confidence ?? 0.5);
    const recency = computeRecencyScore(signal.discovered_at);
    const sourceTrust = clamp(signal.source_trust ?? 0.5);

    const sourceName = signal.source_label?.trim() || signal.source?.trim() || 'unknown-source';
    const sourceSlug = signal.normalized_source || slugify(sourceName);
    const sourceBucket = sourceBuckets.get(sourceSlug) ?? {
      name: sourceName,
      slug: sourceSlug,
      signalCount: 0,
      importanceTotal: 0,
      confidenceTotal: 0,
      recencyTotal: 0,
    };
    sourceBucket.signalCount += 1;
    sourceBucket.importanceTotal += importance * 0.7 + sourceTrust * 0.3;
    sourceBucket.confidenceTotal += confidence;
    sourceBucket.recencyTotal += recency;
    sourceBuckets.set(sourceSlug, sourceBucket);

    const industryName = signal.industry?.trim() || 'unclassified';
    const industrySlug = slugify(industryName);
    const industryBucket = industryBuckets.get(industrySlug) ?? {
      name: industryName,
      slug: industrySlug,
      signalCount: 0,
      importanceTotal: 0,
      confidenceTotal: 0,
      recencyTotal: 0,
    };
    industryBucket.signalCount += 1;
    industryBucket.importanceTotal += importance * 0.72 + sourceTrust * 0.28;
    industryBucket.confidenceTotal += confidence * 0.8 + sourceTrust * 0.2;
    industryBucket.recencyTotal += recency;
    industryBuckets.set(industrySlug, industryBucket);

    if (signal.company?.trim()) {
      const companyName = signal.company.trim();
      const companySlug = slugify(companyName);
      const companyBucket = companyBuckets.get(companySlug) ?? {
        name: companyName,
        slug: companySlug,
        signalCount: 0,
        importanceTotal: 0,
        confidenceTotal: 0,
        recencyTotal: 0,
        industries: new Set<string>(),
        locations: new Set<string>(),
      };
      companyBucket.signalCount += 1;
      companyBucket.importanceTotal += importance * 0.7 + sourceTrust * 0.3;
      companyBucket.confidenceTotal += confidence * 0.78 + sourceTrust * 0.22;
      companyBucket.recencyTotal += recency;
      companyBucket.industries.add(industryName);

      for (const locationName of signalLocations.get(signal.id) ?? []) {
        companyBucket.locations.add(locationName);
      }

      companyBuckets.set(companySlug, companyBucket);
    }
  }

  const sourceScores: LearnedSourceScore[] = Array.from(sourceBuckets.values())
    .map((bucket) => {
      const { avgImportance, avgConfidence, avgRecency } = averageFromAccumulator(bucket);
      const volumeBoost = Math.min(bucket.signalCount / 10, 1);
      return {
        source: bucket.name,
        normalizedSource: bucket.slug,
        signalCount: bucket.signalCount,
        acceptedSignals: bucket.signalCount,
        discardedSignals: 0,
        avgConfidence: round(avgConfidence),
        avgImportance: round(avgImportance),
        recencyScore: round(avgRecency),
        evidenceQuality: undefined,
        duplicateRate: undefined,
        noiseScore: undefined,
        trustScore: round(
          clamp(avgConfidence * 0.45 + avgImportance * 0.3 + avgRecency * 0.15 + volumeBoost * 0.1)
        ),
      };
    })
    .sort((a, b) => b.trustScore - a.trustScore || b.signalCount - a.signalCount)
    .slice(0, 10);

  const industryMomentum: LearnedMomentumScore[] = Array.from(industryBuckets.values())
    .map((bucket) => {
      const { avgImportance, avgConfidence, avgRecency } = averageFromAccumulator(bucket);
      const volumeBoost = Math.min(bucket.signalCount / 12, 1);
      return {
        slug: bucket.slug,
        name: bucket.name,
        signalCount: bucket.signalCount,
        avgImportance: round(avgImportance),
        avgConfidence: round(avgConfidence),
        recencyScore: round(avgRecency),
        momentumScore: round(
          clamp(avgImportance * 0.34 + avgConfidence * 0.22 + avgRecency * 0.24 + volumeBoost * 0.2)
        ),
      };
    })
    .sort((a, b) => b.momentumScore - a.momentumScore || b.signalCount - a.signalCount)
    .slice(0, 10);

  const locationMomentum: LearnedMomentumScore[] = mapPoints
    .map((point) => {
      const relatedSignals = signals.filter((signal) => {
        const locations = signalLocations.get(signal.id);
        return locations?.has(point.name) ?? false;
      });
      const avgConfidence =
        relatedSignals.length > 0
          ? relatedSignals.reduce((sum, signal) => sum + clamp(signal.confidence ?? 0.5), 0) /
            relatedSignals.length
          : 0.5;
      const avgRecency =
        relatedSignals.length > 0
          ? relatedSignals.reduce((sum, signal) => sum + computeRecencyScore(signal.discovered_at), 0) /
            relatedSignals.length
          : 0.4;
      const volumeBoost = Math.min(point.signalCount / 10, 1);

      return {
        slug: point.slug,
        name: point.name,
        signalCount: point.signalCount,
        avgImportance: round(point.avgImportance),
        avgConfidence: round(avgConfidence),
        recencyScore: round(avgRecency),
        momentumScore: round(
          clamp(point.avgImportance * 0.38 + avgConfidence * 0.18 + avgRecency * 0.22 + volumeBoost * 0.22)
        ),
      };
    })
    .sort((a, b) => b.momentumScore - a.momentumScore || b.signalCount - a.signalCount)
    .slice(0, 10);

  const companyPriority: LearnedCompanyScore[] = Array.from(companyBuckets.values())
    .map((bucket) => {
      const { avgImportance, avgConfidence, avgRecency } = averageFromAccumulator(bucket);
      const volumeBoost = Math.min(bucket.signalCount / 8, 1);
      const locationBoost = Math.min(bucket.locations.size / 4, 1);
      return {
        slug: bucket.slug,
        name: bucket.name,
        signalCount: bucket.signalCount,
        industries: Array.from(bucket.industries).sort(),
        avgImportance: round(avgImportance),
        avgConfidence: round(avgConfidence),
        locationCount: bucket.locations.size,
        priorityScore: round(
          clamp(avgImportance * 0.33 + avgConfidence * 0.22 + avgRecency * 0.16 + volumeBoost * 0.17 + locationBoost * 0.12)
        ),
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore || b.signalCount - a.signalCount)
    .slice(0, 12);

  return {
    sourceScores,
    industryMomentum,
    locationMomentum,
    companyPriority,
    summary: {
      strongestSource: sourceScores[0]?.source ?? null,
      hottestIndustry: industryMomentum[0]?.name ?? null,
      hottestLocation: locationMomentum[0]?.name ?? null,
      highestPriorityCompany: companyPriority[0]?.name ?? null,
    },
  };
}
