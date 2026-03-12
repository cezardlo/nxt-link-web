// src/lib/agents/agents/intel-curation-agent.ts
//
// NXT LINK — Intelligence Curation Department
//
// A team of Gemini-powered expert agents that review raw intel signals and:
//   1. CHOOSE what information is important (Chief Architect)
//   2. ANALYZE patterns and trends (Data Analyst)
//   3. DECIDE where each signal belongs in the platform (UX Curator)
//   4. TELL the story in plain human language (Storyteller)
//   5. DETECT geopolitical + political context (Risk Analyst)
//
// Each agent is ruthlessly picky. Weak signals get downgraded.
// Strong, verified, multi-source signals get elevated and enriched.

import type { IntelSignal } from './intel-discovery-agent';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type SignalPriority = 'critical' | 'high' | 'medium' | 'low' | 'noise';

export type PlacementZone =
  | 'homepage_hero'       // Top of homepage — world-changing events
  | 'homepage_trending'   // Trending signals section
  | 'industry_page'       // Relevant industry detail page
  | 'map_event'           // Show on global map as event marker
  | 'signals_feed'        // General intelligence feed
  | 'research_section'    // Technology/research section
  | 'hidden';             // Too weak — don't show

export type CuratedSignal = {
  // Original signal fields
  id: string;
  type: string;
  industry: string;
  title: string;
  url: string;
  source: string;
  company?: string;
  amountUsd?: number;
  confidence: number;
  discoveredAt: string;

  // Department enrichment
  priority: SignalPriority;
  placement: PlacementZone[];
  headline: string;           // Storyteller's clean headline (25 words max)
  narrative: string;          // Plain-English explanation of WHY this matters
  pattern: string;            // Data Analyst: what trend/pattern this confirms
  geopoliticalContext: string; // Risk Analyst: political/economic angle (if any)
  industriesAffected: string[]; // Which industries this touches
  companiesInvolved: string[]; // Key companies named or implied
  actionableInsight: string;  // What someone should DO with this info
  curatorNotes: string;       // UX Curator: display format recommendation
  importanceScore: number;    // 0–100 final curation score
};

export type IntelBrief = {
  generatedAt: string;
  totalSignalsReviewed: number;
  totalPublished: number;
  hiddenAsNoise: number;
  homepageHero: CuratedSignal[];       // 1-3 critical signals
  homepageTrending: CuratedSignal[];   // 5-8 trending signals
  mapEvents: CuratedSignal[];          // Signals with geographic dimension
  industrySignals: Record<string, CuratedSignal[]>; // By industry
  signalsFeed: CuratedSignal[];        // Full curated feed
  topPatterns: string[];               // 3-5 meta-trends the analyst detected
  weeklyNarrative: string;             // Storyteller's 3-sentence world summary
};

// ─── Gemini Department Prompt ────────────────────────────────────────────────────

const DEPARTMENT_SYSTEM_PROMPT = `You are the NXT LINK Intelligence Curation Department — an elite team of extremely picky professionals who review raw technology intelligence signals and decide:

1. WHAT is important (ruthlessly reject noise)
2. WHERE it should appear in the platform (placement decisions)
3. HOW to explain it (storytelling in plain language)
4. WHAT pattern it confirms (data analysis)
5. WHAT the geopolitical/political angle is (risk analysis)

Your team includes:
- Chief Intelligence Architect (decides structure and priority)
- Data Intelligence Analyst (finds patterns and trends)
- Global Risk & Political Analyst (tracks geopolitical angles)
- Insight Storytelling Specialist (writes in clear, powerful language)
- UX Intelligence Curator (decides where information belongs)

Your standards are EXTREMELY HIGH. You behave like a mix of:
- McKinsey strategy consultants
- Bloomberg Intelligence analysts
- Palantir data engineers
- Apple product designers (ruthlessly simple)
- MIT technology researchers

RULES:
- Reject any signal that is vague, promotional, or low-information
- Downgrade signals with no company, no amount, no specifics
- Elevate signals with: named companies + dollar amounts + geopolitical dimension
- A signal about "$2.3B DoD contract awarded to Lockheed Martin for hypersonic systems" = CRITICAL
- A signal about "AI trends in manufacturing" with no specifics = NOISE
- A signal about "CrowdStrike raises $1.2B Series E" = HIGH
- A "funding round" with no amount and no company = LOW or NOISE
- Signals that connect to political events (sanctions, regulations, wars) get elevated
- Be picky. Only ~30% of signals should be published.

OUTPUT: Respond with a single valid JSON array of curated signal objects.`;

const buildDepartmentPrompt = (signals: IntelSignal[]): string => {
  const signalList = signals.map((s, i) => `
Signal ${i + 1}:
  type: ${s.type}
  industry: ${s.industry}
  title: ${s.title}
  company: ${s.company ?? 'UNKNOWN'}
  amount: ${s.amountUsd ? `$${(s.amountUsd / 1e6).toFixed(0)}M` : 'NOT MENTIONED'}
  confidence: ${s.confidence}
  source: ${s.source}
  evidence: ${s.evidence.slice(0, 200)}
`).join('\n---\n');

  return `Review these ${signals.length} intelligence signals. For each one, produce a JSON object.

${signalList}

Return a JSON array where each object has these fields:
{
  "id": "<original signal id>",
  "priority": "critical|high|medium|low|noise",
  "placement": ["homepage_hero"|"homepage_trending"|"industry_page"|"map_event"|"signals_feed"|"research_section"|"hidden"],
  "headline": "<clean, powerful 20-word max headline — no marketing language>",
  "narrative": "<2-3 sentences explaining WHY this matters in plain English. Be specific. Mention companies, amounts, strategic implications.>",
  "pattern": "<What trend/pattern does this confirm? 1 sentence. Example: 'Continued consolidation of defense AI contracts to non-traditional vendors'>",
  "geopoliticalContext": "<Political/economic angle if applicable, or empty string>",
  "industriesAffected": ["industry1", "industry2"],
  "companiesInvolved": ["Company A", "Company B"],
  "actionableInsight": "<What should a procurement officer or technology buyer DO with this? 1 sentence.>",
  "curatorNotes": "<Display format: card|chart|map_pin|timeline_entry|graph_node>",
  "importanceScore": <0-100 integer>
}

Be picky. Reject noise. Only ~30% should score above 60.`;
};

// ─── Meta-Analysis Prompt ────────────────────────────────────────────────────────

const buildMetaPrompt = (curatedSignals: CuratedSignal[]): string => {
  const topSignals = curatedSignals
    .filter(s => s.priority !== 'noise')
    .slice(0, 20)
    .map(s => `- [${s.priority.toUpperCase()}] ${s.headline} (${s.industry})`)
    .join('\n');

  return `You are the Chief Intelligence Architect and Storytelling Specialist.

Here are today's top curated signals:
${topSignals}

Respond with JSON:
{
  "topPatterns": [
    "<Pattern 1: 1 sentence describing a meta-trend you see across signals>",
    "<Pattern 2>",
    "<Pattern 3>"
  ],
  "weeklyNarrative": "<A 3-sentence world intelligence summary. Write like a Bloomberg analyst. Be specific, direct, powerful. Mention real companies, sectors, geopolitical forces. NO vague generalities.>"
}`;
};

// ─── Gemini API Call ─────────────────────────────────────────────────────────────

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const payload = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return text;
}

// ─── Parse Helpers ────────────────────────────────────────────────────────────────

function parseCuratedSignals(json: string, originals: IntelSignal[]): CuratedSignal[] {
  try {
    const parsed = JSON.parse(json) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) return [];

    const origMap = new Map(originals.map(s => [s.id, s]));

    return parsed.map((item, idx): CuratedSignal => {
      const orig = origMap.get(item['id'] as string) ?? originals[idx];
      if (!orig) return null as unknown as CuratedSignal;

      return {
        id: orig.id,
        type: orig.type,
        industry: orig.industry,
        title: orig.title,
        url: orig.url,
        source: orig.source,
        company: orig.company,
        amountUsd: orig.amountUsd,
        confidence: orig.confidence,
        discoveredAt: orig.discoveredAt,

        priority: (item['priority'] as SignalPriority) ?? 'medium',
        placement: (item['placement'] as PlacementZone[]) ?? ['signals_feed'],
        headline: (item['headline'] as string) ?? orig.title,
        narrative: (item['narrative'] as string) ?? '',
        pattern: (item['pattern'] as string) ?? '',
        geopoliticalContext: (item['geopoliticalContext'] as string) ?? '',
        industriesAffected: (item['industriesAffected'] as string[]) ?? [orig.industry],
        companiesInvolved: (item['companiesInvolved'] as string[]) ?? (orig.company ? [orig.company] : []),
        actionableInsight: (item['actionableInsight'] as string) ?? '',
        curatorNotes: (item['curatorNotes'] as string) ?? 'card',
        importanceScore: (item['importanceScore'] as number) ?? 50,
      };
    }).filter(Boolean);
  } catch (err) {
    console.error('[intel-curation] Failed to parse curated signals JSON:', err instanceof Error ? err.message : err);
    return [];
  }
}

function parseMeta(json: string): { topPatterns: string[]; weeklyNarrative: string } {
  try {
    const parsed = JSON.parse(json) as { topPatterns?: string[]; weeklyNarrative?: string };
    return {
      topPatterns: parsed.topPatterns ?? [],
      weeklyNarrative: parsed.weeklyNarrative ?? '',
    };
  } catch (err) {
    console.error('[intel-curation] Failed to parse meta-analysis JSON:', err instanceof Error ? err.message : err);
    return { topPatterns: [], weeklyNarrative: '' };
  }
}

// ─── Cache ────────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — curation is expensive
let cachedBrief: IntelBrief | null = null;
let briefExpiresAt = 0;
let inFlightCuration: Promise<IntelBrief> | null = null;

export function getCachedBrief(): IntelBrief | null {
  if (cachedBrief && Date.now() < briefExpiresAt) return cachedBrief;
  return null;
}

// ─── Main Runner ──────────────────────────────────────────────────────────────────

/**
 * Run the Intelligence Curation Department.
 * Takes raw signals and returns a fully curated, organized brief.
 */
export async function runIntelCurationAgent(signals: IntelSignal[]): Promise<IntelBrief> {
  if (inFlightCuration) return inFlightCuration;

  const cached = getCachedBrief();
  if (cached) return cached;

  inFlightCuration = doCuration(signals).finally(() => { inFlightCuration = null; });
  return inFlightCuration;
}

const BATCH_SIZE = 15; // Gemini handles 15 signals per call well

async function doCuration(signals: IntelSignal[]): Promise<IntelBrief> {
  // Take top 60 signals (highest confidence first)
  const topSignals = signals
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 60);

  // ── Step 1: Batch through the department in parallel ──────────────────────────
  const batches: IntelSignal[][] = [];
  for (let i = 0; i < topSignals.length; i += BATCH_SIZE) {
    batches.push(topSignals.slice(i, i + BATCH_SIZE));
  }

  const batchResults = await Promise.allSettled(
    batches.map(async (batch): Promise<CuratedSignal[]> => {
      try {
        const userPrompt = buildDepartmentPrompt(batch);
        const json = await callGemini(DEPARTMENT_SYSTEM_PROMPT, userPrompt);
        return parseCuratedSignals(json, batch);
      } catch {
        // If Gemini fails for a batch, return basic pass-through with conservative defaults
        return batch.map(s => ({
          id: s.id,
          type: s.type,
          industry: s.industry,
          title: s.title,
          url: s.url,
          source: s.source,
          company: s.company,
          amountUsd: s.amountUsd,
          confidence: s.confidence,
          discoveredAt: s.discoveredAt,
          priority: s.confidence >= 0.8 ? 'high' : s.confidence >= 0.7 ? 'medium' : 'low' as SignalPriority,
          placement: ['signals_feed'] as PlacementZone[],
          headline: s.title,
          narrative: s.evidence,
          pattern: '',
          geopoliticalContext: '',
          industriesAffected: [s.industry],
          companiesInvolved: s.company ? [s.company] : [],
          actionableInsight: '',
          curatorNotes: 'card',
          importanceScore: Math.round(s.confidence * 70),
        }));
      }
    }),
  );

  const allCurated: CuratedSignal[] = batchResults
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => (r as PromiseFulfilledResult<CuratedSignal[]>).value)
    .sort((a, b) => b.importanceScore - a.importanceScore);

  // ── Step 2: Meta-analysis — patterns + weekly narrative ────────────────────
  let topPatterns: string[] = [];
  let weeklyNarrative = '';

  try {
    const metaJson = await callGemini(DEPARTMENT_SYSTEM_PROMPT, buildMetaPrompt(allCurated));
    const meta = parseMeta(metaJson);
    topPatterns = meta.topPatterns;
    weeklyNarrative = meta.weeklyNarrative;
  } catch {
    // Non-fatal — continue without meta
  }

  // ── Step 3: Organize into placement zones ──────────────────────────────────
  const published = allCurated.filter(s => !s.placement.includes('hidden'));
  const hidden = allCurated.filter(s => s.placement.includes('hidden'));

  const homepageHero = published
    .filter(s => s.placement.includes('homepage_hero'))
    .slice(0, 3);

  const homepageTrending = published
    .filter(s => s.placement.includes('homepage_trending') && !s.placement.includes('homepage_hero'))
    .slice(0, 8);

  const mapEvents = published
    .filter(s => s.placement.includes('map_event'))
    .slice(0, 20);

  const industrySignals: Record<string, CuratedSignal[]> = {};
  for (const s of published) {
    for (const ind of s.industriesAffected) {
      if (!industrySignals[ind]) industrySignals[ind] = [];
      if (industrySignals[ind].length < 10) industrySignals[ind].push(s);
    }
  }

  const signalsFeed = published
    .filter(s => s.priority !== 'noise')
    .slice(0, 50);

  const brief: IntelBrief = {
    generatedAt: new Date().toISOString(),
    totalSignalsReviewed: topSignals.length,
    totalPublished: published.length,
    hiddenAsNoise: hidden.length,
    homepageHero,
    homepageTrending,
    mapEvents,
    industrySignals,
    signalsFeed,
    topPatterns,
    weeklyNarrative,
  };

  cachedBrief = brief;
  briefExpiresAt = Date.now() + CACHE_TTL_MS;

  console.log(`[intel-curation] Brief generated: ${published.length} published, ${hidden.length} hidden as noise`);

  return brief;
}
