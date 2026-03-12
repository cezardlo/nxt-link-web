type TrendDefinition = {
  theme: string;
  keywords: string[];
  impact: 'low' | 'medium' | 'high';
};

const TREND_DEFINITIONS: TrendDefinition[] = [
  {
    theme: 'Route Optimization',
    keywords: ['route', 'dispatch', 'fleet', 'delivery', 'miles', 'fuel'],
    impact: 'high',
  },
  {
    theme: 'Supply Chain Visibility',
    keywords: ['visibility', 'traceability', 'tracking', 'shipment', 'inventory'],
    impact: 'high',
  },
  {
    theme: 'Warehouse Automation',
    keywords: ['warehouse', 'robot', 'automation', 'pick', 'pack'],
    impact: 'medium',
  },
  {
    theme: 'Cold Chain Monitoring',
    keywords: ['cold chain', 'temperature', 'reefer', 'perishable'],
    impact: 'medium',
  },
  {
    theme: 'Water Efficiency',
    keywords: ['water', 'leak', 'wastewater', 'filtration', 'gallons'],
    impact: 'high',
  },
  {
    theme: 'Energy Efficiency',
    keywords: ['energy', 'electricity', 'power', 'solar', 'grid'],
    impact: 'medium',
  },
  {
    theme: 'Predictive Maintenance',
    keywords: ['maintenance', 'downtime', 'asset', 'repair', 'failure'],
    impact: 'high',
  },
  {
    theme: 'Workforce Digitization',
    keywords: ['workforce', 'training', 'labor', 'manual', 'paperwork'],
    impact: 'medium',
  },
];

type GraphNodeType = 'region' | 'industry' | 'trend' | 'startup';

export type IntelligenceTrend = {
  theme: string;
  signal_score: number;
  impact_level: 'low' | 'medium' | 'high';
  evidence_count: number;
  notes: string;
};

export type StartupInsight = {
  startup_name: string;
  funding_stage: string;
  funding_signal: string;
  relevance_score: number;
};

export type GraphNode = {
  id: string;
  label: string;
  type: GraphNodeType;
  score: number;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  weight: number;
  label: string;
};

export type WhitepaperAnalysisResult = {
  summary: string;
  trends: IntelligenceTrend[];
  startups: StartupInsight[];
  funding_overview: string[];
  recommended_actions: string[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function countKeywordMatches(tokens: string[], keywords: string[]): number {
  let count = 0;
  const tokenSet = new Set(tokens);
  for (const keyword of keywords) {
    if (keyword.includes(' ')) {
      count += tokens.join(' ').includes(keyword) ? 1 : 0;
      continue;
    }
    count += tokenSet.has(keyword) ? 1 : 0;
  }
  return count;
}

function makeTrendNotes(
  theme: string,
  count: number,
  industryFocus: string,
  region: string,
): string {
  if (count >= 5) {
    return `${theme} appears repeatedly in source text and is a high-priority signal for ${industryFocus} in ${region}.`;
  }
  if (count >= 3) {
    return `${theme} is a recurring signal with moderate confidence for ${industryFocus}.`;
  }
  return `${theme} appears as an emerging signal and needs validation against local pilot results.`;
}

function detectTrends(text: string, industryFocus: string, region: string): IntelligenceTrend[] {
  const tokens = tokenize(text);
  const trendCandidates = TREND_DEFINITIONS.map((definition) => {
    const evidenceCount = countKeywordMatches(tokens, definition.keywords);
    const signalScore = Math.max(1, Math.min(10, evidenceCount * 2));
    return {
      theme: definition.theme,
      signal_score: signalScore,
      impact_level: definition.impact,
      evidence_count: evidenceCount,
      notes: makeTrendNotes(definition.theme, evidenceCount, industryFocus, region),
    };
  })
    .filter((trend) => trend.evidence_count > 0)
    .sort((a, b) => b.signal_score - a.signal_score)
    .slice(0, 6);

  if (trendCandidates.length > 0) {
    return trendCandidates;
  }

  return [
    {
      theme: 'Operational Optimization',
      signal_score: 4,
      impact_level: 'medium',
      evidence_count: 1,
      notes: `Baseline signal only. Source text lacks explicit keyword density for ${industryFocus}.`,
    },
  ];
}

function normalizeStartupName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

function extractStartupInsights(text: string, trends: IntelligenceTrend[]): StartupInsight[] {
  const sentences = splitSentences(text);
  const startupMap = new Map<string, StartupInsight>();

  const fundingPattern =
    /([A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*){0,2})[^.]{0,80}?(raised|secured|closed|announced)[^.]{0,80}?(\$?\d+(?:\.\d+)?\s?(?:m|b|k|million|billion|thousand)?)/i;

  for (const sentence of sentences) {
    const hasFundingLanguage = /(raised|secured|funding|series|seed|venture|invest)/i.test(
      sentence,
    );
    if (!hasFundingLanguage) {
      continue;
    }

    const match = sentence.match(fundingPattern);
    if (!match) {
      continue;
    }

    const startupName = normalizeStartupName(match[1]);
    if (startupName.length < 2) {
      continue;
    }

    const lowerSentence = sentence.toLowerCase();
    const fundingStage =
      lowerSentence.match(/series\s+[abcde]/i)?.[0] ||
      lowerSentence.match(/pre-seed|seed|grant|debt|private equity/i)?.[0] ||
      'undisclosed';

    const relevanceBoost = trends.some((trend) =>
      lowerSentence.includes(trend.theme.toLowerCase().split(' ')[0]),
    )
      ? 2
      : 0;

    const relevanceScore = Math.max(
      1,
      Math.min(10, 5 + relevanceBoost + (lowerSentence.includes('pilot') ? 1 : 0)),
    );

    startupMap.set(startupName, {
      startup_name: startupName,
      funding_stage: fundingStage.toUpperCase(),
      funding_signal: sentence.slice(0, 180),
      relevance_score: relevanceScore,
    });
  }

  const startups = Array.from(startupMap.values())
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, 8);

  if (startups.length > 0) {
    return startups;
  }

  return [
    {
      startup_name: 'No explicit startup entities detected',
      funding_stage: 'N/A',
      funding_signal: 'Source text does not include clear startup/funding phrasing.',
      relevance_score: 3,
    },
  ];
}

function buildFundingOverview(startups: StartupInsight[]): string[] {
  const realStartups = startups.filter(
    (startup) => startup.funding_stage !== 'N/A' && startup.startup_name !== 'No explicit startup entities detected',
  );

  if (realStartups.length === 0) {
    return ['Funding signals are limited; prioritize direct founder outreach and manual verification.'];
  }

  const stageCounts = new Map<string, number>();
  for (const startup of realStartups) {
    stageCounts.set(startup.funding_stage, (stageCounts.get(startup.funding_stage) || 0) + 1);
  }

  const dominantStage = Array.from(stageCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const dominantLabel = dominantStage ? dominantStage[0] : 'MIXED';

  return [
    `Detected ${realStartups.length} startups with funding cues in the source.`,
    `Dominant stage signal: ${dominantLabel}.`,
    'Use stage mix to tune pilot terms (proof-focused for early stage, scale-focused for growth stage).',
  ];
}

function buildRecommendedActions(
  trends: IntelligenceTrend[],
  startups: StartupInsight[],
): string[] {
  const topTrend = trends[0];
  const topStartup = startups[0];

  const actions = [
    `Run a 45-day pilot focused on ${topTrend?.theme || 'Operational Optimization'} with weekly KPI checkpoints.`,
    'Shortlist 3 vendors and score fit against cost, deployment readiness, and measurable impact.',
    'Create a city-level trend tracker to compare current quarter signals against prior quarter.',
  ];

  if (topStartup && topStartup.funding_stage !== 'N/A') {
    actions.push(
      `Prioritize outreach to ${topStartup.startup_name} (${topStartup.funding_stage}) for pilot feasibility checks.`,
    );
  }

  return actions.slice(0, 4);
}

function buildGraph(
  region: string,
  industryFocus: string,
  trends: IntelligenceTrend[],
  startups: StartupInsight[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [
    { id: 'region', label: region, type: 'region', score: 10 },
    { id: 'industry', label: industryFocus, type: 'industry', score: 9 },
  ];
  const edges: GraphEdge[] = [
    {
      id: 'edge-region-industry',
      source: 'region',
      target: 'industry',
      weight: 9,
      label: 'market focus',
    },
  ];

  trends.forEach((trend, index) => {
    const nodeId = `trend-${index + 1}`;
    nodes.push({
      id: nodeId,
      label: trend.theme,
      type: 'trend',
      score: trend.signal_score,
    });
    edges.push({
      id: `edge-industry-${nodeId}`,
      source: 'industry',
      target: nodeId,
      weight: trend.signal_score,
      label: `signal ${trend.signal_score}`,
    });
  });

  startups.slice(0, 6).forEach((startup, index) => {
    const nodeId = `startup-${index + 1}`;
    nodes.push({
      id: nodeId,
      label: startup.startup_name,
      type: 'startup',
      score: startup.relevance_score,
    });

    const trendNodeId = `trend-${(index % Math.max(1, trends.length)) + 1}`;
    edges.push({
      id: `edge-${trendNodeId}-${nodeId}`,
      source: trends.length > 0 ? trendNodeId : 'industry',
      target: nodeId,
      weight: startup.relevance_score,
      label: startup.funding_stage,
    });
  });

  return { nodes, edges };
}

function summarize(text: string, trends: IntelligenceTrend[], startups: StartupInsight[]): string {
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  const preview = normalizedText.length <= 160 ? normalizedText : `${normalizedText.slice(0, 157)}...`;

  return `White paper ingestion identified ${trends.length} trend clusters and ${startups.length} startup funding signals. Source preview: ${preview}`;
}

export function analyzeWhitepaperInput(
  text: string,
  context: { industry_focus: string; region: string },
): WhitepaperAnalysisResult {
  const trends = detectTrends(text, context.industry_focus, context.region);
  const startups = extractStartupInsights(text, trends);
  const fundingOverview = buildFundingOverview(startups);
  const actions = buildRecommendedActions(trends, startups);
  const graph = buildGraph(context.region, context.industry_focus, trends, startups);

  return {
    summary: summarize(text, trends, startups),
    trends,
    startups,
    funding_overview: fundingOverview,
    recommended_actions: actions,
    graph,
  };
}
