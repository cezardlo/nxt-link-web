// src/lib/engines/trend-reasoning-engine.ts
// Trend Reasoning Engine — explains what's happening, what might happen, and
// where things are heading. Algorithmic core with optional AI narrative enhancement.
//
// Inputs:  IntelSignalRow[] from db/queries/intel-signals
// Outputs: TrendAnalysis — plain-English briefing structured for CEO-level reading

import type { IntelSignalRow } from '@/db/queries/intel-signals';
import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';

// ─── Public types ─────────────────────────────────────────────────────────────

export type SectorTrend = {
  name: string;
  what_is_happening: string;
  what_might_happen: string;
  where_heading: string;
  confidence: number;
  signals_driving_this: string[];
  risk_factors: string[];
  momentum: 'accelerating' | 'steady' | 'slowing' | 'declining';
  signal_count: number;
};

export type CrossSectorTrend = {
  trend: string;
  sectors_affected: string[];
  evidence: string[];
  timeline: string;
};

export type TrendAnalysis = {
  timestamp: string;
  overall_narrative: string;
  sectors: SectorTrend[];
  cross_sector_trends: CrossSectorTrend[];
  biggest_story: string;
  watch_list: string[];
  total_signals_analyzed: number;
  ai_enhanced: boolean;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Plain-English descriptions for each signal type — the raw vocabulary. */
const SIGNAL_TYPE_MEANING: Record<string, { event: string; implication: string }> = {
  funding_round:      { event: 'investment flowing in',    implication: 'scale-up hiring and product development typically follow within 90 days' },
  contract_award:     { event: 'government buying',        implication: 'revenue certainty and likely follow-on vehicles are on the table' },
  merger_acquisition: { event: 'consolidation underway',   implication: 'market power is concentrating — watch for pricing and talent shifts' },
  patent_filing:      { event: 'innovation accelerating',  implication: 'proprietary moats are forming; licensing negotiations may follow' },
  regulatory_action:  { event: 'policy shifting',          implication: 'compliance timelines are compressing — early movers gain advantage' },
  product_launch:     { event: 'new capability entering market', implication: 'adjacent vendors face displacement risk within 12–18 months' },
  facility_expansion: { event: 'physical footprint growing', implication: 'long-term commitment signal — company is betting on sustained demand' },
  hiring_signal:      { event: 'workforce demand rising',  implication: 'revenue growth expectations are high; talent competition will intensify' },
  research_paper:     { event: 'knowledge advancing',      implication: 'commercialization is 12–36 months away depending on tech readiness' },
  case_study:         { event: 'proven use cases emerging', implication: 'procurement risk is falling; buyer confidence is building' },
};

/** Map signal types to a directional statement about momentum. */
function inferMomentumFromTypes(types: string[]): 'accelerating' | 'steady' | 'slowing' | 'declining' {
  const counts: Record<string, number> = {};
  for (const t of types) counts[t] = (counts[t] ?? 0) + 1;

  const strongSignals = (counts['funding_round'] ?? 0)
    + (counts['contract_award'] ?? 0)
    + (counts['merger_acquisition'] ?? 0)
    + (counts['facility_expansion'] ?? 0);

  const weakSignals = (counts['research_paper'] ?? 0)
    + (counts['case_study'] ?? 0);

  const total = types.length;
  if (total === 0) return 'declining';
  if (strongSignals / total >= 0.5) return 'accelerating';
  if (strongSignals / total >= 0.25) return 'steady';
  if (weakSignals / total >= 0.6) return 'slowing';
  return 'steady';
}

/** Build 2-3 sentence "what is happening" paragraph for a sector. */
function buildWhatIsHappening(
  sectorName: string,
  signals: IntelSignalRow[],
): string {
  if (signals.length === 0) {
    return `${sectorName} shows minimal signal activity in the current window.`;
  }

  // Group by signal type and pick the dominant one
  const typeCounts: Record<string, number> = {};
  for (const s of signals) typeCounts[s.signal_type] = (typeCounts[s.signal_type] ?? 0) + 1;

  const sortedTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const dominant = sortedTypes[0];
  const dominantMeaning = dominant ? (SIGNAL_TYPE_MEANING[dominant[0]] ?? { event: dominant[0].replace(/_/g, ' '), implication: 'further developments expected' }) : null;

  // Pick the highest-importance signal as the anchor headline
  const topSignal = [...signals].sort((a, b) => b.importance_score - a.importance_score)[0];
  const topCompanies = [...new Set(signals.map(s => s.company).filter((c): c is string => !!c))].slice(0, 3);

  const companySuffix = topCompanies.length > 0
    ? ` Key actors: ${topCompanies.join(', ')}.`
    : '';

  const typePhrase = sortedTypes
    .map(([type, count]) => `${count} ${type.replace(/_/g, ' ')} signal${count > 1 ? 's' : ''}`)
    .join(', ');

  const lead = topSignal
    ? `In ${sectorName}, the most significant development is: "${topSignal.title}".`
    : `${sectorName} is generating elevated intelligence activity.`;

  const body = dominantMeaning
    ? ` The dominant pattern is ${dominantMeaning.event} (${typePhrase}).`
    : ` The signal mix includes ${typePhrase}.`;

  return `${lead}${body}${companySuffix}`;
}

/** Build "what might happen next" paragraph using signal type logic. */
function buildWhatMightHappen(
  sectorName: string,
  signals: IntelSignalRow[],
): string {
  if (signals.length === 0) {
    return `No near-term catalysts detected for ${sectorName}.`;
  }

  const typesPresent = [...new Set(signals.map(s => s.signal_type))];
  const implications: string[] = [];

  for (const type of typesPresent) {
    const meaning = SIGNAL_TYPE_MEANING[type];
    if (meaning) implications.push(meaning.implication);
  }

  const hasFunding = typesPresent.includes('funding_round');
  const hasContract = typesPresent.includes('contract_award');
  const hasMA = typesPresent.includes('merger_acquisition');
  const hasPatent = typesPresent.includes('patent_filing');
  const hasHiring = typesPresent.includes('hiring_signal');

  const sentences: string[] = [];

  if (hasFunding && hasHiring) {
    sentences.push(`Fresh capital plus rising headcount in ${sectorName} points toward a product or market expansion push in the next two quarters.`);
  } else if (hasFunding) {
    sentences.push(`Recent investment activity in ${sectorName} typically precedes a hiring surge and accelerated go-to-market within 60–90 days.`);
  } else if (hasContract) {
    sentences.push(`Active government buying in ${sectorName} signals procurement windows are open — follow-on task orders and subcontracting opportunities are likely within 30–60 days.`);
  } else if (hasMA) {
    sentences.push(`Consolidation activity in ${sectorName} often triggers competitor responses: expect counter-acquisitions, talent poaching, or accelerated product roadmaps from rivals.`);
  } else if (hasPatent) {
    sentences.push(`Patent activity in ${sectorName} suggests proprietary technology is maturing; watch for licensing discussions or product announcements within 6–18 months.`);
  } else {
    sentences.push(`The current signal pattern in ${sectorName} suggests a buildup phase — visible milestones such as contract awards or product launches are plausible within one quarter.`);
  }

  if (implications.length > 1) {
    sentences.push(`Secondary signals point to: ${implications.slice(1, 3).join('; ')}.`);
  }

  return sentences.join(' ');
}

/** Build "where heading" directional outlook. */
function buildWhereHeading(
  sectorName: string,
  signals: IntelSignalRow[],
  momentum: 'accelerating' | 'steady' | 'slowing' | 'declining',
): string {
  const avgImportance = signals.length > 0
    ? signals.reduce((s, r) => s + r.importance_score, 0) / signals.length
    : 0;

  const importanceLabel = avgImportance >= 0.75 ? 'high-significance'
    : avgImportance >= 0.5 ? 'moderate-significance'
    : 'low-significance';

  const momentumPhrase: Record<typeof momentum, string> = {
    accelerating: `${sectorName} is on an upward trajectory with ${importanceLabel} signals pointing to sustained expansion. The next 60 days are the window to act.`,
    steady:       `${sectorName} is holding a stable position — activity is consistent but no breakout catalyst has emerged yet. Monitor for contract award or funding triggers.`,
    slowing:      `${sectorName} momentum is tapering. Current signals are largely informational rather than transactional, suggesting a pause before the next move. Maintain watchlist status.`,
    declining:    `${sectorName} signal volume is low. Either market interest is shifting elsewhere or the sector is in a between-cycles lull. Revisit in 30 days.`,
  };

  return momentumPhrase[momentum];
}

/** Identify risk factors from signal patterns. */
function identifyRiskFactors(
  sectorName: string,
  signals: IntelSignalRow[],
): string[] {
  const risks: string[] = [];

  const companies = signals.map(s => s.company).filter((c): c is string => !!c);
  const uniqueCompanies = new Set(companies);

  // Concentration risk: single company drives most signals
  if (companies.length >= 3 && uniqueCompanies.size === 1) {
    risks.push(`Single company (${companies[0]}) accounts for most ${sectorName} signals — concentration risk if their position shifts.`);
  }

  // Deal size distortion: one massive amount_usd
  const amounts = signals.map(s => s.amount_usd).filter((a): a is number => a !== null && a > 0);
  if (amounts.length > 0) {
    const maxAmount = Math.max(...amounts);
    const totalAmount = amounts.reduce((s, a) => s + a, 0);
    if (maxAmount / totalAmount > 0.8 && amounts.length > 1) {
      risks.push(`One large deal distorts ${sectorName} momentum — underlying activity may be weaker than headline figures suggest.`);
    }
  }

  // Low confidence average
  const avgConfidence = signals.reduce((s, r) => s + r.confidence, 0) / signals.length;
  if (avgConfidence < 0.4) {
    risks.push(`Signal confidence for ${sectorName} is below 40% — data quality is weak and conclusions should be held loosely.`);
  }

  // Regulatory signals without follow-through
  const hasRegulatory = signals.some(s => s.signal_type === 'regulatory_action');
  const hasContract = signals.some(s => s.signal_type === 'contract_award');
  if (hasRegulatory && !hasContract) {
    risks.push(`Regulatory signals without accompanying contract activity in ${sectorName} may indicate headwinds delaying procurement.`);
  }

  if (risks.length === 0) {
    risks.push(`No material risk concentrations detected in current ${sectorName} signal set.`);
  }

  return risks;
}

/** Group signals by industry/sector, normalize names. */
function groupByIndustry(signals: IntelSignalRow[]): Map<string, IntelSignalRow[]> {
  const groups = new Map<string, IntelSignalRow[]>();
  for (const s of signals) {
    const key = s.industry.trim().length > 0 ? s.industry.trim() : 'General';
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }
  return groups;
}

/** Detect cross-sector trends: signals that appear in 2+ industries with shared companies. */
function detectCrossSectorTrends(signals: IntelSignalRow[]): CrossSectorTrend[] {
  const crossTrends: CrossSectorTrend[] = [];

  // Map company → industries it appears in
  const companyToIndustries = new Map<string, Set<string>>();
  const companyToSignals = new Map<string, IntelSignalRow[]>();

  for (const s of signals) {
    if (!s.company) continue;
    const co = s.company;
    if (!companyToIndustries.has(co)) {
      companyToIndustries.set(co, new Set());
      companyToSignals.set(co, []);
    }
    companyToIndustries.get(co)!.add(s.industry);
    companyToSignals.get(co)!.push(s);
  }

  // Companies appearing in 2+ industries = cross-sector signal
  const crossCompanies = Array.from(companyToIndustries.entries() as Iterable<[string, Set<string>]>)
    .filter(([, industries]) => industries.size >= 2)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 5);

  for (const [company, industries] of crossCompanies) {
    const companySignals = companyToSignals.get(company) ?? [];
    const sectorList = Array.from(industries);
    const types = [...new Set(companySignals.map(s => s.signal_type))];
    const primaryType = types[0] ?? 'activity';

    crossTrends.push({
      trend: `${company} is active across ${sectorList.length} sectors (${sectorList.join(', ')}) — ${(SIGNAL_TYPE_MEANING[primaryType] ?? { event: primaryType }).event} signals present`,
      sectors_affected: sectorList,
      evidence: companySignals.slice(0, 3).map(s => s.title),
      timeline: companySignals.some(s => s.signal_type === 'contract_award') ? 'Near-term (0–60 days)' : 'Medium-term (60–180 days)',
    });
  }

  // Type-level cross-sector: same signal type spreading across many industries
  const typeCrossIndustry: Record<string, Set<string>> = {};
  for (const s of signals) {
    if (!typeCrossIndustry[s.signal_type]) typeCrossIndustry[s.signal_type] = new Set();
    typeCrossIndustry[s.signal_type]!.add(s.industry);
  }

  const broadTypes = Object.entries(typeCrossIndustry)
    .filter(([, industries]) => industries.size >= 3)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 2);

  for (const [type, industries] of broadTypes) {
    const meaning = SIGNAL_TYPE_MEANING[type] ?? { event: type.replace(/_/g, ' '), implication: 'watch for sector-wide moves' };
    const sectorList = Array.from(industries).slice(0, 5);
    const examples = signals
      .filter(s => s.signal_type === type)
      .sort((a, b) => b.importance_score - a.importance_score)
      .slice(0, 3)
      .map(s => s.title);

    crossTrends.push({
      trend: `${meaning.event.charAt(0).toUpperCase() + meaning.event.slice(1)} is a cross-cutting theme spanning ${sectorList.length} sectors — ${meaning.implication}`,
      sectors_affected: sectorList,
      evidence: examples,
      timeline: type === 'funding_round' || type === 'contract_award' ? 'Near-term (0–90 days)' : 'Medium-term (90–180 days)',
    });
  }

  return crossTrends.slice(0, 5);
}

/** Build the overall narrative paragraph (1-3 sentences). */
function buildOverallNarrative(
  sectors: SectorTrend[],
  signals: IntelSignalRow[],
): string {
  if (sectors.length === 0 || signals.length === 0) {
    return 'No significant signals detected in the current analysis window. The platform will update as new intelligence becomes available.';
  }

  const accelerating = sectors.filter(s => s.momentum === 'accelerating');
  const slowing = sectors.filter(s => s.momentum === 'slowing' || s.momentum === 'declining');

  const topSector = sectors.sort((a, b) => b.signal_count - a.signal_count)[0];
  const hasFunding = signals.some(s => s.signal_type === 'funding_round');
  const hasContract = signals.some(s => s.signal_type === 'contract_award');
  const hasMA = signals.some(s => s.signal_type === 'merger_acquisition');

  const sentences: string[] = [];

  if (topSector) {
    sentences.push(`The highest signal concentration is in ${topSector.name} with ${topSector.signal_count} active signals, suggesting this sector is the primary attention point right now.`);
  }

  if (accelerating.length > 0) {
    const names = accelerating.slice(0, 3).map(s => s.name).join(', ');
    sentences.push(`${accelerating.length === 1 ? names + ' is' : names + ' are'} accelerating — investment and procurement are converging in these areas simultaneously.`);
  }

  const marketForces: string[] = [];
  if (hasFunding) marketForces.push('private capital deployment');
  if (hasContract) marketForces.push('government procurement activity');
  if (hasMA) marketForces.push('consolidation pressure');

  if (marketForces.length > 0) {
    sentences.push(`Underlying market forces include ${marketForces.join(' and ')}, ${slowing.length > 0 ? `while ${slowing.map(s => s.name).slice(0, 2).join(' and ')} show signs of deceleration.` : 'with no major sectors showing decline.'}`);
  }

  return sentences.join(' ');
}

/** Pick the single biggest story from the signal set. */
function pickBiggestStory(signals: IntelSignalRow[]): string {
  if (signals.length === 0) return 'No high-priority signals in the current window.';

  const top = [...signals].sort((a, b) => b.importance_score - a.importance_score)[0];
  if (!top) return 'No signals available.';

  const meaning = SIGNAL_TYPE_MEANING[top.signal_type];
  const companyStr = top.company ? ` (${top.company})` : '';
  const eventStr = meaning ? ` — ${meaning.event}` : '';

  return `${top.title}${companyStr}${eventStr}. Industry: ${top.industry}.`;
}

/** Build watch list: sectors + companies worth monitoring. */
function buildWatchList(
  sectors: SectorTrend[],
  signals: IntelSignalRow[],
): string[] {
  const watchSet = new Set<string>();

  // Sectors with accelerating momentum
  for (const s of sectors.filter(sec => sec.momentum === 'accelerating').slice(0, 3)) {
    watchSet.add(`${s.name} sector — accelerating`);
  }

  // Companies with highest combined importance
  const companyImportance = new Map<string, number>();
  for (const s of signals) {
    if (!s.company) continue;
    companyImportance.set(s.company, (companyImportance.get(s.company) ?? 0) + s.importance_score);
  }

  const topCompanies = Array.from(companyImportance.entries() as Iterable<[string, number]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => `${name} — high signal density`);

  for (const c of topCompanies) watchSet.add(c);

  // Sectors with slowing momentum (risk watch)
  for (const s of sectors.filter(sec => sec.momentum === 'slowing').slice(0, 2)) {
    watchSet.add(`${s.name} sector — slowing, monitor for reversal`);
  }

  return Array.from(watchSet).slice(0, 10);
}

// ─── AI narrative enhancement ────────────────────────────────────────────────

/** Shape the LLM must return for the overall narrative enhancement. */
type OverallNarrativeResponse = {
  overall_narrative: string;
};

/** Shape the LLM must return for a single sector enhancement. */
type SectorNarrativeResponse = {
  what_is_happening: string;
  what_might_happen: string;
  where_heading: string;
};

/** Module-level cache: key → { data, expiresAt } */
type CacheEntry = { data: TrendAnalysis; expiresAt: number };
const narrativeCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function makeCacheKey(analysis: TrendAnalysis): string {
  // Key on signal count + top sector names to avoid stale keys on identical-looking inputs
  const sectorNames = analysis.sectors.map(s => s.name).join('|');
  return `${analysis.total_signals_analyzed}:${sectorNames}`;
}

function isValidNarrativeString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 20;
}

/**
 * Enhance the overall narrative with a 3-sentence executive summary.
 * Returns enhanced string or null if the LLM call fails.
 */
async function enhanceOverallNarrative(
  algorithmicNarrative: string,
  topSignalTitles: string[],
  acceleratingSectors: string[],
): Promise<string | null> {
  try {
    const userPrompt = `
ALGORITHMIC DRAFT:
"${algorithmicNarrative}"

TOP SIGNALS (by importance):
${topSignalTitles.slice(0, 5).map((t, i) => `${i + 1}. ${t}`).join('\n')}

ACCELERATING SECTORS: ${acceleratingSectors.join(', ') || 'none identified'}

Rewrite the draft as a 3-sentence executive summary. Name specific companies, dollar amounts, or dates where available in the signals. Be direct — no filler phrases like "it is worth noting".

Return JSON: { "overall_narrative": "<3-sentence summary>" }`;

    const { result } = await runParallelJsonEnsemble<OverallNarrativeResponse>({
      systemPrompt: 'You are a senior technology intelligence analyst at a Bloomberg-style platform. Write clear, specific narratives for a CEO. Name companies, dollar amounts, dates. No jargon. Be direct.',
      userPrompt,
      temperature: 0.3,
      maxProviders: 1,
      budget: { preferLowCostProviders: true, reserveCompletionTokens: 300 },
      parse: (content) => {
        const raw = JSON.parse(content) as Record<string, unknown>;
        if (!isValidNarrativeString(raw['overall_narrative'])) {
          throw new Error('overall_narrative missing or too short');
        }
        return { overall_narrative: raw['overall_narrative'] as string };
      },
    });

    return isValidNarrativeString(result.overall_narrative) ? result.overall_narrative : null;
  } catch {
    return null;
  }
}

/**
 * Enhance narrative fields for a single sector.
 * Returns enhanced SectorNarrativeResponse or null on failure.
 */
async function enhanceSectorNarrative(
  sector: SectorTrend,
): Promise<SectorNarrativeResponse | null> {
  try {
    const userPrompt = `
SECTOR: ${sector.name}
MOMENTUM: ${sector.momentum}
SIGNAL COUNT: ${sector.signal_count}
CONFIDENCE: ${Math.round(sector.confidence * 100)}%

TOP SIGNALS:
${sector.signals_driving_this.slice(0, 5).map((t, i) => `${i + 1}. ${t}`).join('\n')}

RISK FACTORS:
${sector.risk_factors.slice(0, 2).join('\n')}

ALGORITHMIC DRAFTS:
- what_is_happening: "${sector.what_is_happening}"
- what_might_happen: "${sector.what_might_happen}"
- where_heading: "${sector.where_heading}"

Rewrite each field as a single, specific, jargon-free sentence a CEO would immediately understand. Reference signal titles or company names where possible. Do not add hedging phrases.

Return JSON:
{
  "what_is_happening": "<1 sentence>",
  "what_might_happen": "<1 sentence>",
  "where_heading": "<1 sentence>"
}`;

    const { result } = await runParallelJsonEnsemble<SectorNarrativeResponse>({
      systemPrompt: 'You are a senior technology intelligence analyst at a Bloomberg-style platform. Write clear, specific narratives for a CEO. Name companies, dollar amounts, dates. No jargon. Be direct.',
      userPrompt,
      temperature: 0.3,
      maxProviders: 1,
      budget: { preferLowCostProviders: true, reserveCompletionTokens: 250 },
      parse: (content) => {
        const raw = JSON.parse(content) as Record<string, unknown>;
        if (
          !isValidNarrativeString(raw['what_is_happening']) ||
          !isValidNarrativeString(raw['what_might_happen']) ||
          !isValidNarrativeString(raw['where_heading'])
        ) {
          throw new Error('sector narrative fields missing or too short');
        }
        return {
          what_is_happening: raw['what_is_happening'] as string,
          what_might_happen: raw['what_might_happen'] as string,
          where_heading: raw['where_heading'] as string,
        };
      },
    });

    return result;
  } catch {
    return null;
  }
}

/**
 * Attempt to enhance a fully-built algorithmic TrendAnalysis with AI narratives.
 * Enhances: overall_narrative + top 3 sectors by signal count.
 * Falls back to algorithmic text on any failure.
 */
async function enhanceWithAI(analysis: TrendAnalysis): Promise<TrendAnalysis> {
  // Check module-level cache first
  const cacheKey = makeCacheKey(analysis);
  const cached = narrativeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const acceleratingSectors = analysis.sectors
      .filter(s => s.momentum === 'accelerating')
      .map(s => s.name);

    const topSignalTitles = analysis.sectors
      .flatMap(s => s.signals_driving_this)
      .slice(0, 5);

    // Run overall narrative + top 3 sector enhancements concurrently
    const topSectors = analysis.sectors.slice(0, 3);

    const [overallResult, ...sectorResults] = await Promise.all([
      enhanceOverallNarrative(analysis.overall_narrative, topSignalTitles, acceleratingSectors),
      ...topSectors.map(s => enhanceSectorNarrative(s)),
    ]);

    // Merge AI results back into a copy of the analysis
    const enhancedSectors = analysis.sectors.map((sector, index) => {
      const aiResult = sectorResults[index];
      if (!aiResult) return sector;
      return {
        ...sector,
        what_is_happening: aiResult.what_is_happening,
        what_might_happen: aiResult.what_might_happen,
        where_heading: aiResult.where_heading,
      };
    });

    const enhanced: TrendAnalysis = {
      ...analysis,
      overall_narrative: overallResult ?? analysis.overall_narrative,
      sectors: enhancedSectors,
      ai_enhanced: true,
    };

    // Store in module-level cache
    narrativeCache.set(cacheKey, {
      data: enhanced,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return enhanced;
  } catch {
    // Graceful fallback — return algorithmic version untouched
    return analysis;
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function runTrendReasoningEngine(
  signals: IntelSignalRow[],
  options: { useAI?: boolean } = {},
): Promise<TrendAnalysis> {
  const timestamp = new Date().toISOString();

  if (signals.length === 0) {
    return {
      timestamp,
      overall_narrative: 'No intelligence signals are available for analysis. The feed may be warming up — check back in a few minutes.',
      sectors: [],
      cross_sector_trends: [],
      biggest_story: 'No signals available.',
      watch_list: [],
      total_signals_analyzed: 0,
      ai_enhanced: false,
    };
  }

  // 1. Group by sector
  const grouped = groupByIndustry(signals);

  // 2. Build per-sector analysis
  const sectorTrends: SectorTrend[] = [];

  for (const [name, sectorSignals] of Array.from(grouped.entries() as Iterable<[string, IntelSignalRow[]]>)) {
    const types = sectorSignals.map(s => s.signal_type);
    const momentum = inferMomentumFromTypes(types);

    // Confidence = average signal confidence, boosted by count diversity
    const avgConf = sectorSignals.reduce((s, r) => s + r.confidence, 0) / sectorSignals.length;
    const typeCount = new Set(types).size;
    const confidence = Math.min(0.99, avgConf + Math.min(0.2, typeCount * 0.04));

    // Top signals as evidence (by importance, top 5)
    const topSignals = [...sectorSignals]
      .sort((a, b) => b.importance_score - a.importance_score)
      .slice(0, 5)
      .map(s => s.title);

    sectorTrends.push({
      name,
      what_is_happening: buildWhatIsHappening(name, sectorSignals),
      what_might_happen: buildWhatMightHappen(name, sectorSignals),
      where_heading: buildWhereHeading(name, sectorSignals, momentum),
      confidence: Math.round(confidence * 100) / 100,
      signals_driving_this: topSignals,
      risk_factors: identifyRiskFactors(name, sectorSignals),
      momentum,
      signal_count: sectorSignals.length,
    });
  }

  // 3. Sort sectors by signal count descending
  sectorTrends.sort((a, b) => b.signal_count - a.signal_count);

  // 4. Cross-sector trends
  const crossSectorTrends = detectCrossSectorTrends(signals);

  // 5. Biggest story
  const biggestStory = pickBiggestStory(signals);

  // 6. Watch list
  const watchList = buildWatchList(sectorTrends, signals);

  // 7. Overall narrative (algorithmic draft)
  const overallNarrative = buildOverallNarrative(sectorTrends, signals);

  // 8. Assemble algorithmic result
  const algorithmicAnalysis: TrendAnalysis = {
    timestamp,
    overall_narrative: overallNarrative,
    sectors: sectorTrends,
    cross_sector_trends: crossSectorTrends,
    biggest_story: biggestStory,
    watch_list: watchList,
    total_signals_analyzed: signals.length,
    ai_enhanced: false,
  };

  // 9. Attempt AI enhancement (gracefully falls back to algorithmic on failure)
  if (options.useAI !== false) {
    return enhanceWithAI(algorithmicAnalysis);
  }

  return algorithmicAnalysis;
}
