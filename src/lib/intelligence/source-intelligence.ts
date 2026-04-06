import type { IntelSignalRow } from '@/db/queries/intel-signals';

export type SourceQualityScore = {
  source: string;
  normalizedSource: string;
  signalCount: number;
  acceptedSignals: number;
  discardedSignals: number;
  avgConfidence: number;
  avgImportance: number;
  freshnessScore: number;
  evidenceQuality: number;
  duplicateRate: number;
  noiseScore: number;
  trustScore: number;
};

export type CuratedSignalRow<T extends IntelSignalRow = IntelSignalRow> = T & {
  normalized_source: string;
  source_label: string;
  source_trust: number;
  source_noise: number;
  evidence_quality: number;
  duplicate_group_size: number;
  duplicate_penalty: number;
  quality_score: number;
};

export type PipelineQualityReport = {
  scannedSignals: number;
  acceptedSignals: number;
  duplicatesFiltered: number;
  lowEvidenceSignals: number;
  lowEvidenceDiscarded: number;
  noisySourceSignals: number;
  recentIntakeVolume: number;
  fallbackUsed: boolean;
  topTrustedSources: SourceQualityScore[];
  weakestSources: SourceQualityScore[];
  failureStates: string[];
};

export type SignalIntakeReport<T extends IntelSignalRow = IntelSignalRow> = {
  signals: CuratedSignalRow<T>[];
  sourceScores: SourceQualityScore[];
  pipeline: PipelineQualityReport;
};

type CandidateSignal<T extends IntelSignalRow = IntelSignalRow> = T & {
  normalized_source: string;
  source_label: string;
  fingerprint: string;
  evidence_quality: number;
  duplicate_group_size: number;
  duplicate_penalty: number;
  source_trust: number;
  source_noise: number;
  quality_score: number;
};

type SourceBucket = {
  source: string;
  normalizedSource: string;
  signalCount: number;
  confidenceTotal: number;
  importanceTotal: number;
  freshnessTotal: number;
  evidenceTotal: number;
  duplicateSignals: number;
  noisySignals: number;
};

const FALLBACK_FAILURE = 'Low trusted signal coverage. Falling back to best available signals.';

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/https?:\/\/(www\.)?/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function domainLabel(value: string | null | undefined): { normalized: string; label: string } {
  if (!value) {
    return { normalized: 'unknown-source', label: 'Unknown source' };
  }

  try {
    const url = new URL(value);
    const normalized = url.hostname.replace(/^www\./, '').toLowerCase();
    return { normalized, label: normalized };
  } catch {
    const normalized = normalizeText(value).replace(/\s+/g, '-').slice(0, 80) || 'unknown-source';
    return { normalized, label: value.trim().slice(0, 80) || 'Unknown source' };
  }
}

function computeEvidenceQuality(signal: Pick<IntelSignalRow, 'evidence' | 'company' | 'source' | 'title'>): number {
  const evidenceLength = signal.evidence?.trim().length ?? 0;
  const evidenceComponent = evidenceLength >= 220 ? 1 : evidenceLength >= 120 ? 0.8 : evidenceLength >= 50 ? 0.55 : evidenceLength >= 20 ? 0.35 : 0.1;
  const companyComponent = signal.company ? 0.15 : 0;
  const sourceComponent = signal.source ? 0.1 : 0;
  const titleComponent = signal.title.length >= 30 ? 0.08 : 0.03;

  return clamp(round(evidenceComponent * 0.67 + companyComponent + sourceComponent + titleComponent));
}

function computeFreshnessScore(discoveredAt: string): number {
  const ageMs = Date.now() - new Date(discoveredAt).getTime();
  if (Number.isNaN(ageMs)) return 0.35;
  if (ageMs <= 6 * 60 * 60 * 1000) return 1;
  if (ageMs <= 24 * 60 * 60 * 1000) return 0.9;
  if (ageMs <= 3 * 24 * 60 * 60 * 1000) return 0.72;
  if (ageMs <= 7 * 24 * 60 * 60 * 1000) return 0.56;
  return 0.34;
}

function fingerprintSignal(signal: Pick<IntelSignalRow, 'title' | 'industry' | 'company' | 'signal_type'>): string {
  const normalizedTitle = normalizeText(signal.title)
    .split(' ')
    .filter((token) => token.length > 2)
    .slice(0, 12)
    .join(' ');

  return [
    normalizeText(signal.signal_type),
    normalizeText(signal.industry),
    normalizeText(signal.company),
    normalizedTitle,
  ].join('|');
}

function buildSourceScores(candidates: CandidateSignal[]): SourceQualityScore[] {
  const sourceBuckets = new Map<string, SourceBucket>();

  for (const candidate of candidates) {
    const bucket = sourceBuckets.get(candidate.normalized_source) ?? {
      source: candidate.source_label,
      normalizedSource: candidate.normalized_source,
      signalCount: 0,
      confidenceTotal: 0,
      importanceTotal: 0,
      freshnessTotal: 0,
      evidenceTotal: 0,
      duplicateSignals: 0,
      noisySignals: 0,
    };

    bucket.signalCount += 1;
    bucket.confidenceTotal += clamp(candidate.confidence ?? 0.5);
    bucket.importanceTotal += clamp(candidate.importance_score ?? 0.5);
    bucket.freshnessTotal += computeFreshnessScore(candidate.discovered_at);
    bucket.evidenceTotal += candidate.evidence_quality;
    if (candidate.duplicate_group_size > 1) bucket.duplicateSignals += 1;
    if (candidate.evidence_quality < 0.3) bucket.noisySignals += 1;
    sourceBuckets.set(candidate.normalized_source, bucket);
  }

  return Array.from(sourceBuckets.values()).map((bucket) => {
    const count = Math.max(bucket.signalCount, 1);
    const avgConfidence = bucket.confidenceTotal / count;
    const avgImportance = bucket.importanceTotal / count;
    const freshnessScore = bucket.freshnessTotal / count;
    const evidenceQuality = bucket.evidenceTotal / count;
    const duplicateRate = bucket.duplicateSignals / count;
    const noiseScore = bucket.noisySignals / count;
    const trustScore = clamp(
      avgConfidence * 0.28 +
      avgImportance * 0.22 +
      freshnessScore * 0.18 +
      evidenceQuality * 0.22 +
      (1 - duplicateRate) * 0.06 +
      (1 - noiseScore) * 0.04
    );

    return {
      source: bucket.source,
      normalizedSource: bucket.normalizedSource,
      signalCount: bucket.signalCount,
      acceptedSignals: 0,
      discardedSignals: 0,
      avgConfidence: round(avgConfidence),
      avgImportance: round(avgImportance),
      freshnessScore: round(freshnessScore),
      evidenceQuality: round(evidenceQuality),
      duplicateRate: round(duplicateRate),
      noiseScore: round(noiseScore),
      trustScore: round(trustScore),
    };
  });
}

export function analyzeSignalIntake<T extends IntelSignalRow>(
  signals: T[],
  options: { fallbackUsed?: boolean; limit?: number } = {}
): SignalIntakeReport<T> {
  const fallbackUsed = options.fallbackUsed === true;
  const sourceInfo = new Map<string, SourceQualityScore>();

  const groups = new Map<string, IntelSignalRow[]>();
  for (const signal of signals) {
    const fingerprint = fingerprintSignal(signal);
    const bucket = groups.get(fingerprint) ?? [];
    bucket.push(signal);
    groups.set(fingerprint, bucket);
  }

  const candidates: CandidateSignal<T>[] = signals.map((signal) => {
    const sourceMeta = domainLabel(signal.source);
    const evidenceQuality = computeEvidenceQuality(signal);
    const duplicateGroupSize = groups.get(fingerprintSignal(signal))?.length ?? 1;
    return {
      ...signal,
      normalized_source: sourceMeta.normalized,
      source_label: sourceMeta.label,
      fingerprint: fingerprintSignal(signal),
      evidence_quality: evidenceQuality,
      duplicate_group_size: duplicateGroupSize,
      duplicate_penalty: duplicateGroupSize > 1 ? clamp((duplicateGroupSize - 1) * 0.15, 0, 0.6) : 0,
      source_trust: 0,
      source_noise: 0,
      quality_score: 0,
    };
  });

  const sourceScores = buildSourceScores(candidates);
  for (const score of sourceScores) {
    sourceInfo.set(score.normalizedSource, score);
  }

  let lowEvidenceSignals = 0;
  let noisySourceSignals = 0;
  let duplicatesFiltered = 0;
  let lowEvidenceDiscarded = 0;

  const chosen = new Map<string, CandidateSignal>();
  for (const candidate of candidates) {
    const sourceScore = sourceInfo.get(candidate.normalized_source);
    const sourceTrust = sourceScore?.trustScore ?? 0.42;
    const sourceNoise = sourceScore?.noiseScore ?? 0.5;
    const qualityScore = clamp(
      clamp(candidate.importance_score ?? 0.5) * 0.28 +
      clamp(candidate.confidence ?? 0.5) * 0.22 +
      candidate.evidence_quality * 0.24 +
      computeFreshnessScore(candidate.discovered_at) * 0.12 +
      sourceTrust * 0.14 -
      candidate.duplicate_penalty * 0.12
    );

    candidate.source_trust = round(sourceTrust);
    candidate.source_noise = round(sourceNoise);
    candidate.quality_score = round(qualityScore);

    if (candidate.evidence_quality < 0.3) lowEvidenceSignals += 1;
    if (sourceNoise > 0.45) noisySourceSignals += 1;

    const existing = chosen.get(candidate.fingerprint);
    if (!existing || candidate.quality_score > existing.quality_score) {
      chosen.set(candidate.fingerprint, candidate);
    }
  }

  for (const score of sourceScores) {
    score.acceptedSignals = 0;
  }

  const dedupedSignals = Array.from(chosen.values()).sort((a, b) => {
    if (b.quality_score !== a.quality_score) return b.quality_score - a.quality_score;
    return new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime();
  });
  duplicatesFiltered = Math.max(0, candidates.length - dedupedSignals.length);

  const strongSignals = dedupedSignals.filter((signal) => signal.evidence_quality >= 0.18 || signal.source_trust >= 0.58 || Boolean(signal.company));
  lowEvidenceDiscarded = Math.max(0, dedupedSignals.length - strongSignals.length);

  const minimumSignals = Math.min(options.limit ?? dedupedSignals.length, dedupedSignals.length);
  const acceptedBase = strongSignals.length >= Math.max(3, Math.floor(minimumSignals / 2))
    ? strongSignals
    : dedupedSignals;

  const acceptedSignals = acceptedBase.slice(0, options.limit ?? acceptedBase.length);
  for (const signal of acceptedSignals) {
    const sourceScore = sourceInfo.get(signal.normalized_source);
    if (sourceScore) sourceScore.acceptedSignals += 1;
  }
  for (const score of sourceScores) {
    score.discardedSignals = Math.max(0, score.signalCount - score.acceptedSignals);
  }

  const curatedSignals: CuratedSignalRow<T>[] = acceptedSignals.map((signal) => {
    const { fingerprint, ...curated } = signal;
    void fingerprint;
    return curated as CuratedSignalRow<T>;
  });

  const topTrustedSources = [...sourceScores]
    .sort((a, b) => b.trustScore - a.trustScore || b.acceptedSignals - a.acceptedSignals)
    .slice(0, 5);
  const weakestSources = [...sourceScores]
    .filter((score) => score.signalCount > 0)
    .sort((a, b) => a.trustScore - b.trustScore || b.noiseScore - a.noiseScore)
    .slice(0, 5);

  return {
    signals: curatedSignals,
    sourceScores: [...sourceScores].sort((a, b) => b.trustScore - a.trustScore || b.signalCount - a.signalCount),
    pipeline: {
      scannedSignals: signals.length,
      acceptedSignals: curatedSignals.length,
      duplicatesFiltered,
      lowEvidenceSignals,
      lowEvidenceDiscarded,
      noisySourceSignals,
      recentIntakeVolume: signals.length,
      fallbackUsed,
      topTrustedSources,
      weakestSources,
      failureStates: acceptedBase === dedupedSignals && strongSignals.length < Math.max(3, Math.floor(minimumSignals / 2))
        ? [FALLBACK_FAILURE]
        : [],
    },
  };
}
