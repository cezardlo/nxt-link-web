import type { RelationshipType, EntityType } from '@/db/queries/knowledge-graph';
import type { MappingSignal } from '@/lib/intelligence/mapping-engine';

type BrainEntity = {
  id: string;
  type: EntityType;
  name: string;
  slug?: string;
  metadata?: Record<string, unknown>;
};

type BrainRelationship = {
  source: string;
  target: string;
  type: RelationshipType;
};

export type OpportunityType =
  | 'grant'
  | 'contract'
  | 'vendor'
  | 'partnership'
  | 'facility'
  | 'hiring'
  | 'market-entry'
  | 'infrastructure';

export type RecommendedAction =
  | 'brief'
  | 'investigate'
  | 'contact'
  | 'track'
  | 'map'
  | 'ignore';

export type ElPasoSignalAssessment = {
  id: string;
  title: string;
  signal_type: string | null;
  industry: string | null;
  company: string | null;
  source: string | null;
  source_label?: string | null;
  discovered_at: string;
  evidence: string | null;
  quality_score: number;
  source_trust: number;
  evidence_quality: number;
  confidence: number;
  global_significance: number;
  el_paso_relevance: number;
  opportunity_score: number;
  urgency_score: number;
  why_now: string;
  who_it_matters_to: string[];
  what_changed_vs_last_week: string;
  opportunity_type: OpportunityType;
  recommended_actions: RecommendedAction[];
  suggested_targets: string[];
  local_pathway: string;
  repeat_count: number;
  prior_related_signals: Array<{ id: string; title: string; discovered_at: string }>;
  heating_up_score: number;
  related_signal_count: number;
  tracked_technologies: string[];
  reason_for_ranking: string[];
  confidence_explanation: string;
};

export type ElPasoMemorySummary = {
  recurringCompanies: Array<{ name: string; repeatCount: number; score: number }>;
  recurringTechnologies: Array<{ name: string; repeatCount: number; score: number }>;
  risingIndustries: Array<{ name: string; score: number; change: number }>;
  risingLocations: Array<{ name: string; score: number; change: number }>;
};

export type ElPasoOpportunitySummary = {
  topOpportunities: Array<{
    signalId: string;
    title: string;
    opportunityType: OpportunityType;
    opportunityScore: number;
    elPasoRelevance: number;
    urgencyScore: number;
    localPathway: string;
    recommendedActions: RecommendedAction[];
  }>;
  actionQueue: Array<{
    signalId: string;
    title: string;
    action: RecommendedAction;
    whyNow: string;
    suggestedTargets: string[];
  }>;
  localRelevanceSummary: string[];
};

export type ElPasoAssessmentReport = {
  signalAssessments: ElPasoSignalAssessment[];
  memory: ElPasoMemorySummary;
  opportunities: ElPasoOpportunitySummary;
};

type CountStats = {
  total: number;
  recent: number;
  previous: number;
};

const EL_PASO_ACTORS = {
  border: ['customs brokers', 'cross-border operators', 'CBP-facing teams'],
  manufacturing: ['maquiladora operators', 'advanced manufacturing leaders', 'industrial recruiters'],
  logistics: ['freight operators', 'warehouse operators', 'supply chain teams'],
  energy: ['grid operators', 'energy infrastructure teams', 'site selectors'],
  tech: ['UTEP research teams', 'startup operators', 'economic development leads'],
  defense: ['Fort Bliss partners', 'defense contractors', 'dual-use founders'],
  public: ['city leaders', 'Borderplex economic development teams', 'regional institutions'],
};

const TECHNOLOGY_KEYWORDS: Array<{ name: string; keywords: string[] }> = [
  { name: 'AI', keywords: ['ai', 'artificial intelligence', 'machine learning', 'llm', 'automation'] },
  { name: 'Robotics', keywords: ['robot', 'robotics', 'autonomous', 'cobot'] },
  { name: 'Sensors', keywords: ['sensor', 'lidar', 'biometric', 'vision system'] },
  { name: 'Semiconductors', keywords: ['semiconductor', 'chip', 'fab', 'wafer'] },
  { name: 'Battery Systems', keywords: ['battery', 'energy storage', 'cell manufacturing'] },
  { name: 'Grid Tech', keywords: ['grid', 'substation', 'microgrid', 'resilience'] },
  { name: 'Trade Compliance', keywords: ['customs', 'usmca', 'trade compliance', 'documentation'] },
  { name: 'Freight Tech', keywords: ['freight', 'routing', 'warehouse', 'fleet', 'logistics'] },
  { name: 'Additive Manufacturing', keywords: ['3d print', 'additive', 'digital twin', 'cnc'] },
];

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').toLowerCase();
}

function recencyWeight(discoveredAt: string): number {
  const ageMs = Date.now() - new Date(discoveredAt).getTime();
  if (Number.isNaN(ageMs)) return 0.4;
  if (ageMs <= 6 * 60 * 60 * 1000) return 1;
  if (ageMs <= 24 * 60 * 60 * 1000) return 0.9;
  if (ageMs <= 3 * 24 * 60 * 60 * 1000) return 0.75;
  if (ageMs <= 7 * 24 * 60 * 60 * 1000) return 0.58;
  if (ageMs <= 14 * 24 * 60 * 60 * 1000) return 0.42;
  return 0.22;
}

function keywordHits(text: string, keywords: string[]): number {
  return keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);
}

function extractTechnologies(text: string): string[] {
  return TECHNOLOGY_KEYWORDS.filter((entry) => keywordHits(text, entry.keywords) > 0)
    .map((entry) => entry.name)
    .slice(0, 5);
}

function buildStatsMap(values: Array<string | null | undefined>, dates: string[]): Map<string, CountStats> {
  const stats = new Map<string, CountStats>();
  const now = Date.now();
  const recentThreshold = now - 7 * 24 * 60 * 60 * 1000;
  const previousThreshold = now - 14 * 24 * 60 * 60 * 1000;

  values.forEach((value, index) => {
    const normalized = value?.trim();
    if (!normalized) return;
    const current = stats.get(normalized) ?? { total: 0, recent: 0, previous: 0 };
    current.total += 1;
    const ts = new Date(dates[index]).getTime();
    if (!Number.isNaN(ts)) {
      if (ts >= recentThreshold) current.recent += 1;
      else if (ts >= previousThreshold) current.previous += 1;
    }
    stats.set(normalized, current);
  });

  return stats;
}

function buildLocationCounts(
  signals: MappingSignal[],
  entities: BrainEntity[],
  relationships: BrainRelationship[]
): Map<string, string[]> {
  const locationNames = new Map<string, string>();
  const locationsBySignal = new Map<string, string[]>();

  for (const entity of entities) {
    if (entity.type === 'location') {
      locationNames.set(entity.id, entity.name);
    }
  }

  for (const relationship of relationships) {
    if (relationship.type !== 'occurs_in') continue;
    const locationName = locationNames.get(relationship.target);
    if (!locationName) continue;
    const bucket = locationsBySignal.get(relationship.source) ?? [];
    if (!bucket.includes(locationName)) bucket.push(locationName);
    locationsBySignal.set(relationship.source, bucket);
  }

  for (const signal of signals) {
    const text = `${signal.title} ${signal.evidence ?? ''}`.toLowerCase();
    const inferred = locationsBySignal.get(signal.id) ?? [];
    if (text.includes('el paso') && !inferred.includes('El Paso, Texas')) inferred.push('El Paso, Texas');
    if ((text.includes('juarez') || text.includes('ciudad juarez')) && !inferred.includes('Ciudad Juarez, Mexico')) inferred.push('Ciudad Juarez, Mexico');
    if (text.includes('fort bliss') && !inferred.includes('Fort Bliss, Texas')) inferred.push('Fort Bliss, Texas');
    locationsBySignal.set(signal.id, inferred);
  }

  return locationsBySignal;
}

function chooseOpportunityType(signal: MappingSignal, text: string): OpportunityType {
  const signalType = signal.signal_type ?? '';
  if (signalType.includes('grant') || text.includes('grant') || text.includes('sbir') || text.includes('nsf') || text.includes('doe')) {
    return 'grant';
  }
  if (signalType.includes('contract') || text.includes('contract') || text.includes('solicitation') || text.includes('award')) {
    return 'contract';
  }
  if (signalType.includes('partnership') || text.includes('partnership') || text.includes('joint venture')) {
    return 'partnership';
  }
  if (text.includes('facility') || text.includes('plant') || text.includes('factory') || text.includes('distribution center') || text.includes('warehouse')) {
    return 'facility';
  }
  if (text.includes('hire') || text.includes('workforce') || text.includes('job')) {
    return 'hiring';
  }
  if (text.includes('infrastructure') || text.includes('port of entry') || text.includes('bridge') || text.includes('grid')) {
    return 'infrastructure';
  }
  if (text.includes('market') || text.includes('expansion') || text.includes('nearshoring') || text.includes('reshoring')) {
    return 'market-entry';
  }
  return 'vendor';
}

function deriveAudience(signal: MappingSignal, text: string, locations: string[]): string[] {
  const audience = new Set<string>();

  if (keywordHits(text, ['border', 'customs', 'cbp', 'usmca', 'port of entry']) > 0) {
    EL_PASO_ACTORS.border.forEach((item) => audience.add(item));
    EL_PASO_ACTORS.public.forEach((item) => audience.add(item));
  }
  if (keywordHits(text, ['manufacturing', 'factory', 'maquiladora', 'industrial', 'production']) > 0) {
    EL_PASO_ACTORS.manufacturing.forEach((item) => audience.add(item));
  }
  if (keywordHits(text, ['logistics', 'freight', 'warehouse', 'fleet', 'supply chain', 'trucking']) > 0) {
    EL_PASO_ACTORS.logistics.forEach((item) => audience.add(item));
  }
  if (keywordHits(text, ['energy', 'grid', 'battery', 'power', 'infrastructure']) > 0) {
    EL_PASO_ACTORS.energy.forEach((item) => audience.add(item));
  }
  if (keywordHits(text, ['technology', 'software', 'ai', 'robot', 'automation']) > 0) {
    EL_PASO_ACTORS.tech.forEach((item) => audience.add(item));
  }
  if (keywordHits(text, ['defense', 'army', 'fort bliss', 'homeland security']) > 0) {
    EL_PASO_ACTORS.defense.forEach((item) => audience.add(item));
  }
  if (locations.some((location) => location.includes('El Paso') || location.includes('Juarez') || location.includes('Fort Bliss'))) {
    EL_PASO_ACTORS.public.forEach((item) => audience.add(item));
  }

  if (audience.size === 0) {
    audience.add('regional operators');
    audience.add('economic development teams');
  }

  return Array.from(audience).slice(0, 4);
}

function deriveActions(opportunityType: OpportunityType, elPasoRelevance: number, urgencyScore: number): RecommendedAction[] {
  const actions = new Set<RecommendedAction>();

  if (urgencyScore >= 0.72) actions.add('brief');
  if (elPasoRelevance >= 0.7) actions.add('investigate');

  if (opportunityType === 'grant' || opportunityType === 'contract' || opportunityType === 'partnership') {
    actions.add('contact');
  }
  if (opportunityType === 'facility' || opportunityType === 'infrastructure') {
    actions.add('map');
  }
  if (opportunityType === 'vendor' || opportunityType === 'market-entry') {
    actions.add('track');
  }

  if (actions.size === 0) actions.add('track');
  return Array.from(actions).slice(0, 3);
}

function buildChangeSummary(label: string, stats?: CountStats): string {
  if (!stats) return `No historical baseline yet for ${label}.`;
  const delta = stats.recent - stats.previous;
  if (delta >= 3) return `${label} accelerated this week with ${delta} more signals than the prior week.`;
  if (delta > 0) return `${label} is building week over week.`;
  if (delta === 0) return `${label} is steady versus last week.`;
  return `${label} cooled slightly versus last week, but remains active.`;
}

function buildLocalPathway(
  signal: MappingSignal,
  text: string,
  locations: string[],
  technologies: string[]
): string {
  if (locations.some((item) => item.includes('El Paso'))) {
    return 'This already lands in El Paso and should be routed to local operators immediately.';
  }
  if (locations.some((item) => item.includes('Juarez'))) {
    return 'Juarez movement often becomes El Paso logistics, warehousing, and supplier demand within the same corridor.';
  }
  if (text.includes('nearshoring') || text.includes('reshoring') || text.includes('mexico')) {
    return 'Nearshoring and Mexico-linked signals can translate into supplier recruitment, freight demand, and industrial occupancy in El Paso.';
  }
  if (text.includes('border') || text.includes('customs') || text.includes('port of entry')) {
    return 'Border infrastructure and customs changes directly affect El Paso crossing efficiency and regional trade throughput.';
  }
  if (technologies.includes('AI') || technologies.includes('Robotics') || technologies.includes('Additive Manufacturing')) {
    return 'Advanced industrial tech creates a local opening for El Paso manufacturing, UTEP partnerships, and operator adoption.';
  }
  return 'This signal can still matter locally if it shifts supplier placement, logistics demand, or industrial recruiting into the Borderplex.';
}

function buildSuggestedTargets(
  signal: MappingSignal,
  opportunityType: OpportunityType,
  audience: string[]
): string[] {
  const targets = new Set<string>();
  if (signal.company) targets.add(signal.company);
  if (opportunityType === 'grant') {
    targets.add('UTEP');
    targets.add('regional grant teams');
  }
  if (opportunityType === 'contract') {
    targets.add('local integrators');
    targets.add('procurement teams');
  }
  if (opportunityType === 'facility' || opportunityType === 'market-entry') {
    targets.add('Borderplex Alliance');
    targets.add('site selection teams');
  }
  audience.forEach((item) => targets.add(item));
  return Array.from(targets).slice(0, 5);
}

function scoreElPasoRelevance(signal: MappingSignal, text: string, locations: string[], stats?: CountStats): number {
  const borderScore = keywordHits(text, ['border', 'customs', 'cbp', 'port of entry', 'trade compliance', 'usmca']) * 0.1;
  const manufacturingScore = keywordHits(text, ['manufacturing', 'factory', 'industrial', 'maquiladora', 'production']) * 0.08;
  const logisticsScore = keywordHits(text, ['logistics', 'freight', 'warehouse', 'fleet', 'supply chain', 'trucking']) * 0.08;
  const energyScore = keywordHits(text, ['energy', 'grid', 'battery', 'power', 'infrastructure']) * 0.07;
  const localLocationScore = locations.length > 0 ? 0.22 : 0;
  const repeatBoost = Math.min((stats?.total ?? 0) * 0.03, 0.15);
  const sourceTrust = clamp(signal.source_trust ?? 0.5) * 0.18;

  return round(
    clamp(
      borderScore +
        manufacturingScore +
        logisticsScore +
        energyScore +
        localLocationScore +
        repeatBoost +
        sourceTrust
    )
  );
}

function scoreGlobalSignificance(signal: MappingSignal): number {
  return round(
    clamp(
      clamp(signal.importance_score ?? 0.5) * 0.42 +
        clamp(signal.quality_score ?? 0.5) * 0.24 +
        clamp(signal.source_trust ?? 0.5) * 0.18 +
        clamp(signal.evidence_quality ?? 0.4) * 0.16
    )
  );
}

function buildConfidenceExplanation(signal: MappingSignal, repeatCount: number): string {
  const reasons: string[] = [];
  if ((signal.source_trust ?? 0) >= 0.7) reasons.push('high-trust source');
  if ((signal.evidence_quality ?? 0) >= 0.6) reasons.push('strong evidence');
  if (repeatCount >= 2) reasons.push('repeated pattern');
  if (reasons.length === 0) return 'This is still an early read with limited proof.';
  return `This rank is supported by ${reasons.join(', ')}.`;
}

function statsToSortedArray(statsMap: Map<string, CountStats>, labelLimit = 6) {
  return Array.from(statsMap.entries())
    .map(([name, stats]) => ({
      name,
      stats,
      change: stats.recent - stats.previous,
      score: round(clamp(stats.total * 0.08 + stats.recent * 0.18 + Math.max(stats.recent - stats.previous, 0) * 0.12)),
    }))
    .sort((a, b) => b.score - a.score || b.stats.total - a.stats.total)
    .slice(0, labelLimit);
}

export function buildElPasoAssessmentReport(
  signals: MappingSignal[],
  entities: BrainEntity[] = [],
  relationships: BrainRelationship[] = []
): ElPasoAssessmentReport {
  const companyStats = buildStatsMap(
    signals.map((signal) => signal.company),
    signals.map((signal) => signal.discovered_at)
  );
  const industryStats = buildStatsMap(
    signals.map((signal) => signal.industry),
    signals.map((signal) => signal.discovered_at)
  );
  const locationsBySignal = buildLocationCounts(signals, entities, relationships);
  const technologyMap = new Map<string, CountStats>();
  const signalAssessments: ElPasoSignalAssessment[] = signals.map((signal) => {
    const text = `${normalizeText(signal.title)} ${normalizeText(signal.evidence)} ${normalizeText(signal.industry)} ${normalizeText(signal.signal_type)}`;
    const companyStatsEntry = signal.company ? companyStats.get(signal.company) : undefined;
    const industryStatsEntry = signal.industry ? industryStats.get(signal.industry) : undefined;
    const locations = locationsBySignal.get(signal.id) ?? [];
    const technologies = extractTechnologies(text);

    technologies.forEach((technology) => {
      const current = technologyMap.get(technology) ?? { total: 0, recent: 0, previous: 0 };
      current.total += 1;
      const recentScore = recencyWeight(signal.discovered_at);
      if (recentScore >= 0.58) current.recent += 1;
      else current.previous += 1;
      technologyMap.set(technology, current);
    });

    const globalSignificance = scoreGlobalSignificance(signal);
    const elPasoRelevance = scoreElPasoRelevance(signal, text, locations, companyStatsEntry ?? industryStatsEntry);
    const repeatCount = Math.max(companyStatsEntry?.total ?? 0, industryStatsEntry?.total ?? 0, 1);
    const heatingUpScore = round(
      clamp(
        Math.max(companyStatsEntry?.recent ?? 0, industryStatsEntry?.recent ?? 0) * 0.15 +
          Math.max((companyStatsEntry?.recent ?? 0) - (companyStatsEntry?.previous ?? 0), 0) * 0.12 +
          Math.max((industryStatsEntry?.recent ?? 0) - (industryStatsEntry?.previous ?? 0), 0) * 0.1
      )
    );
    const opportunityType = chooseOpportunityType(signal, text);
    const urgencyScore = round(
      clamp(recencyWeight(signal.discovered_at) * 0.38 + elPasoRelevance * 0.24 + clamp(signal.quality_score ?? 0.5) * 0.22 + heatingUpScore * 0.16)
    );
    const opportunityScore = round(
      clamp(globalSignificance * 0.28 + elPasoRelevance * 0.34 + urgencyScore * 0.2 + heatingUpScore * 0.18)
    );
    const audience = deriveAudience(signal, text, locations);
    const recommendedActions = deriveActions(opportunityType, elPasoRelevance, urgencyScore);
    const suggestedTargets = buildSuggestedTargets(signal, opportunityType, audience);
    const localPathway = buildLocalPathway(signal, text, locations, technologies);
    const reasonForRanking = [
      ...(locations.length > 0 ? [`Local corridor match: ${locations.join(', ')}`] : []),
      ...(technologies.length > 0 ? [`Tracked technologies: ${technologies.join(', ')}`] : []),
      `Source trust ${Math.round(clamp(signal.source_trust ?? 0.5) * 100)}/100`,
      `Evidence ${Math.round(clamp(signal.evidence_quality ?? 0.4) * 100)}/100`,
    ].slice(0, 4);

    const priorRelatedSignals = signals
      .filter(
        (candidate) =>
          candidate.id !== signal.id &&
          ((signal.company && candidate.company === signal.company) ||
            (signal.industry && candidate.industry === signal.industry))
      )
      .sort(
        (a, b) =>
          new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime()
      )
      .slice(0, 3)
      .map((candidate) => ({
        id: candidate.id,
        title: candidate.title,
        discovered_at: candidate.discovered_at,
      }));

    return {
      id: signal.id,
      title: signal.title,
      signal_type: signal.signal_type,
      industry: signal.industry,
      company: signal.company,
      source: signal.source,
      source_label: signal.source_label,
      discovered_at: signal.discovered_at,
      evidence: signal.evidence,
      quality_score: round(clamp(signal.quality_score ?? 0.5)),
      source_trust: round(clamp(signal.source_trust ?? 0.5)),
      evidence_quality: round(clamp(signal.evidence_quality ?? 0.4)),
      confidence: round(clamp(signal.confidence ?? 0.5)),
      global_significance: globalSignificance,
      el_paso_relevance: elPasoRelevance,
      opportunity_score: opportunityScore,
      urgency_score: urgencyScore,
      why_now:
        urgencyScore >= 0.72
          ? 'This is moving now and belongs in the current operating read.'
          : elPasoRelevance >= 0.7
            ? 'This is highly relevant to El Paso even if it is still early.'
            : 'This should stay on the board because it can mature into a local opening.',
      who_it_matters_to: audience,
      what_changed_vs_last_week: buildChangeSummary(signal.company ?? signal.industry ?? signal.title, companyStatsEntry ?? industryStatsEntry),
      opportunity_type: opportunityType,
      recommended_actions: recommendedActions,
      suggested_targets: suggestedTargets,
      local_pathway: localPathway,
      repeat_count: repeatCount,
      prior_related_signals: priorRelatedSignals,
      heating_up_score: heatingUpScore,
      related_signal_count: priorRelatedSignals.length,
      tracked_technologies: technologies,
      reason_for_ranking: reasonForRanking,
      confidence_explanation: buildConfidenceExplanation(signal, repeatCount),
    };
  });

  signalAssessments.sort(
    (a, b) =>
      b.opportunity_score - a.opportunity_score ||
      b.el_paso_relevance - a.el_paso_relevance ||
      new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime()
  );

  const recurringCompanies = statsToSortedArray(companyStats).map((item) => ({
    name: item.name,
    repeatCount: item.stats.total,
    score: item.score,
  }));
  const recurringTechnologies = statsToSortedArray(technologyMap).map((item) => ({
    name: item.name,
    repeatCount: item.stats.total,
    score: item.score,
  }));
  const risingIndustries = statsToSortedArray(industryStats).map((item) => ({
    name: item.name,
    score: item.score,
    change: item.change,
  }));

  const locationCounts = new Map<string, CountStats>();
  signalAssessments.forEach((assessment) => {
    const recentScore = recencyWeight(assessment.discovered_at);
    const names = assessment.local_pathway.includes('El Paso') ? ['El Paso, Texas'] : [];
    const inferredLocations = [...new Set([...names, ...assessment.reason_for_ranking.flatMap((reason) => (reason.startsWith('Local corridor match: ') ? reason.replace('Local corridor match: ', '').split(', ') : []))])];
    inferredLocations.forEach((name) => {
      const current = locationCounts.get(name) ?? { total: 0, recent: 0, previous: 0 };
      current.total += 1;
      if (recentScore >= 0.58) current.recent += 1;
      else current.previous += 1;
      locationCounts.set(name, current);
    });
  });
  const risingLocations = statsToSortedArray(locationCounts).map((item) => ({
    name: item.name,
    score: item.score,
    change: item.change,
  }));

  const topOpportunities = signalAssessments.slice(0, 6).map((item) => ({
    signalId: item.id,
    title: item.title,
    opportunityType: item.opportunity_type,
    opportunityScore: item.opportunity_score,
    elPasoRelevance: item.el_paso_relevance,
    urgencyScore: item.urgency_score,
    localPathway: item.local_pathway,
    recommendedActions: item.recommended_actions,
  }));

  const actionQueue = signalAssessments.slice(0, 8).map((item) => ({
    signalId: item.id,
    title: item.title,
    action: item.recommended_actions[0] ?? 'track',
    whyNow: item.why_now,
    suggestedTargets: item.suggested_targets,
  }));

  const localRelevanceSummary = [
    topOpportunities[0]
      ? `${topOpportunities[0].title} is the clearest current opening for El Paso.`
      : 'No strong El Paso opportunities detected yet.',
    recurringCompanies[0]
      ? `${recurringCompanies[0].name} keeps reappearing and should be treated as a watched company.`
      : 'No recurring company pattern yet.',
    risingIndustries[0]
      ? `${risingIndustries[0].name} is the fastest-rising industry lane in the current signal set.`
      : 'No rising industry pattern yet.',
  ];

  return {
    signalAssessments,
    memory: {
      recurringCompanies,
      recurringTechnologies,
      risingIndustries,
      risingLocations,
    },
    opportunities: {
      topOpportunities,
      actionQueue,
      localRelevanceSummary,
    },
  };
}
