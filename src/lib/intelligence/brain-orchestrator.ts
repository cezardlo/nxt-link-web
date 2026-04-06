import {
  addRelationship,
  upsertEntity,
  type EntityType,
  type RelationshipType,
} from '@/db/queries/knowledge-graph';

import {
  buildMappingReport,
  loadSignalsForMapping,
  type MapPoint,
  type MappedEntity,
  type MappedRelationship,
} from '@/lib/intelligence/mapping-engine';
import {
  buildBrainLearningReport,
  type BrainLearningReport,
} from '@/lib/intelligence/learning-engine';
import {
  loadObsidianImportReport,
  type ObsidianNoteEntity,
  type ObsidianRelationship,
} from '@/lib/intelligence/obsidian-import';

export type UnifiedBrainEntity = {
  id: string;
  slug: string;
  type: EntityType;
  name: string;
  metadata: Record<string, unknown>;
  aliases?: string[];
  confidence?: number;
};

export type UnifiedBrainRelationship = {
  source: string;
  target: string;
  type: RelationshipType;
  confidence: number;
  evidence: string;
};

export type UnifiedBrainReport = {
  scannedSignals: number;
  notesScanned: number;
  entities: UnifiedBrainEntity[];
  relationships: UnifiedBrainRelationship[];
  mapPoints: MapPoint[];
  learning: BrainLearningReport;
  warnings: string[];
  sources: {
    signals: {
      enabled: boolean;
      scanned: number;
    };
    obsidian: {
      enabled: boolean;
      scanned: number;
      vaultPath: string | null;
    };
  };
};

type LoadUnifiedBrainOptions = {
  signalLimit?: number;
  includeObsidian?: boolean;
  vaultPath?: string;
};

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

function normalizeMappedEntity(entity: MappedEntity): UnifiedBrainEntity {
  return {
    id: entity.id,
    slug: entity.slug,
    type: entity.type,
    name: entity.name,
    confidence: entity.confidence,
    metadata: entity.metadata,
  };
}

function normalizeObsidianEntity(entity: ObsidianNoteEntity): UnifiedBrainEntity {
  return {
    id: entity.id,
    slug: entity.slug,
    type: entity.type,
    name: entity.name,
    aliases: entity.aliases,
    metadata: {
      ...entity.metadata,
      source_path: entity.sourcePath,
      tags: entity.tags,
    },
  };
}

function normalizeMappedRelationship(relationship: MappedRelationship): UnifiedBrainRelationship {
  return relationship;
}

function normalizeObsidianRelationship(relationship: ObsidianRelationship): UnifiedBrainRelationship {
  return relationship;
}

export async function loadUnifiedBrainReport(
  options: LoadUnifiedBrainOptions = {}
): Promise<UnifiedBrainReport> {
  const signalLimit = Math.min(Math.max(options.signalLimit ?? 100, 1), 500);
  const includeObsidian = options.includeObsidian !== false;
  const warnings: string[] = [];

  const signals = await loadSignalsForMapping(signalLimit);
  const mappingReport = buildMappingReport(signals);

  let notesScanned = 0;
  let obsidianVaultPath: string | null = null;
  let obsidianEntities: UnifiedBrainEntity[] = [];
  let obsidianRelationships: UnifiedBrainRelationship[] = [];

  if (includeObsidian) {
    try {
      const obsidianReport = await loadObsidianImportReport(options.vaultPath);
      notesScanned = obsidianReport.notesScanned;
      obsidianVaultPath = obsidianReport.vaultPath;
      obsidianEntities = obsidianReport.entities.map(normalizeObsidianEntity);
      obsidianRelationships = obsidianReport.relationships.map(normalizeObsidianRelationship);
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : 'Obsidian import failed.');
    }
  }

  const entities = dedupeByKey(
    [...mappingReport.entities.map(normalizeMappedEntity), ...obsidianEntities],
    (entity) => entity.id
  );
  const relationships = dedupeByKey(
    [...mappingReport.relationships.map(normalizeMappedRelationship), ...obsidianRelationships],
    (relationship) => `${relationship.source}|${relationship.target}|${relationship.type}`
  );
  const learning = buildBrainLearningReport(
    signals,
    entities,
    relationships,
    mappingReport.mapPoints
  );

  return {
    scannedSignals: mappingReport.scannedSignals,
    notesScanned,
    entities,
    relationships,
    mapPoints: mappingReport.mapPoints,
    learning,
    warnings,
    sources: {
      signals: {
        enabled: true,
        scanned: mappingReport.scannedSignals,
      },
      obsidian: {
        enabled: includeObsidian && obsidianVaultPath !== null,
        scanned: notesScanned,
        vaultPath: obsidianVaultPath,
      },
    },
  };
}

export async function persistUnifiedBrainReport(
  report: UnifiedBrainReport
): Promise<{ entities: number; relationships: number }> {
  let persistedEntities = 0;
  let persistedRelationships = 0;
  const entityIdMap = new Map<string, string>();

  for (const entity of report.entities) {
    const enrichedMetadata = { ...entity.metadata };
    const companyScore = report.learning.companyPriority.find((item) => item.slug === entity.slug);
    const industryScore = report.learning.industryMomentum.find((item) => item.slug === entity.slug);
    const locationScore = report.learning.locationMomentum.find((item) => item.slug === entity.slug);

    if (entity.type === 'company' && companyScore) {
      enrichedMetadata.learned_priority_score = companyScore.priorityScore;
      enrichedMetadata.learned_signal_count = companyScore.signalCount;
      enrichedMetadata.learned_location_count = companyScore.locationCount;
    }

    if (entity.type === 'industry' && industryScore) {
      enrichedMetadata.learned_momentum_score = industryScore.momentumScore;
      enrichedMetadata.learned_signal_count = industryScore.signalCount;
      enrichedMetadata.learned_recency_score = industryScore.recencyScore;
    }

    if (entity.type === 'location' && locationScore) {
      enrichedMetadata.learned_momentum_score = locationScore.momentumScore;
      enrichedMetadata.learned_signal_count = locationScore.signalCount;
      enrichedMetadata.learned_recency_score = locationScore.recencyScore;
    }

    const persistedId = await upsertEntity({
      entity_type: entity.type,
      name: entity.name,
      slug: entity.slug,
      metadata: enrichedMetadata,
      aliases: entity.aliases,
    });
    if (!persistedId) continue;
    persistedEntities += 1;
    entityIdMap.set(entity.id, persistedId);
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
    if (!relationshipId) continue;
    persistedRelationships += 1;
  }

  return {
    entities: persistedEntities,
    relationships: persistedRelationships,
  };
}
