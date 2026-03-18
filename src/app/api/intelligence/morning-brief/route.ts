// src/app/api/intelligence/morning-brief/route.ts
// GET /api/intelligence/morning-brief
//
// Generates a daily AI-written intelligence brief for technology buyers.
// Lead story + sector snapshots + risk alert + opportunity spotlight.
// LLM chain: Groq → Gemini → algorithmic fallback.
// Cached 2 hours in memory.

import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getIntelSignals } from '@/db/queries/intel-signals';
import { isSupabaseConfigured } from '@/db/client';
import { getStoredFeedItems, runFeedAgent } from '@/lib/agents/feed-agent';
import { runSignalEngine } from '@/lib/intelligence/signal-engine';

export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────

type SectorMomentum = 'accelerating' | 'steady' | 'slowing' | 'declining';

type SectorSnapshot = {
  sector: string;
  one_liner: string;
  momentum: SectorMomentum;
  signal_count: number;
};

type RiskAlert = {
  active: boolean;
  message: string;
};

type OpportunitySpotlight = {
  title: string;
  description: string;
  score: number;
};

export type MorningBrief = {
  timestamp: string;
  lead_story: {
    headline: string;
    narrative: string;
    signal_count: number;
  };
  sector_snapshots: SectorSnapshot[];
  risk_alert: RiskAlert | null;
  opportunity_spotlight: OpportunitySpotlight | null;
  ai_generated: boolean;
};

// Normalized signal shape used internally
type NormalizedSignal = {
  id: string;
  title: string;
  industry: string;
  company: string | null;
  type: string;
  importance: number;
};

// ─── In-memory 2-hour cache ───────────────────────────────────────────────────

type CacheEntry = {
  data: MorningBrief;
  expiresAt: number;
};

let cache: CacheEntry | null = null;

// ─── Algorithmic brief builders ───────────────────────────────────────────────

function classifyMomentum(signalCount: number, highImportanceCount: number): SectorMomentum {
  if (signalCount >= 10 && highImportanceCount >= 3) return 'accelerating';
  if (signalCount >= 5) return 'steady';
  if (signalCount >= 2) return 'slowing';
  return 'declining';
}

function buildAlgorithmicBrief(signals: NormalizedSignal[]): MorningBrief {
  const timestamp = new Date().toISOString();

  // Group signals by industry
  const byIndustry = new Map<string, NormalizedSignal[]>();
  for (const sig of signals) {
    const ind = sig.industry || 'General';
    if (!byIndustry.has(ind)) byIndustry.set(ind, []);
    byIndustry.get(ind)!.push(sig);
  }

  // Find lead sector (most signals)
  let leadSector = 'Technology';
  let leadSignals: NormalizedSignal[] = [];
  for (const [ind, sigs] of Array.from(byIndustry.entries() as Iterable<[string, NormalizedSignal[]]>)) {
    if (sigs.length > leadSignals.length) {
      leadSector = ind;
      leadSignals = sigs;
    }
  }

  const topSignal = leadSignals[0];
  const leadHeadline = topSignal
    ? topSignal.title
    : `${leadSector} sector activity elevated across multiple sources`;

  const companiesInLead = [
    ...new Set(
      leadSignals
        .map((s) => s.company)
        .filter((c): c is string => Boolean(c))
        .slice(0, 3),
    ),
  ];

  const companyMention =
    companiesInLead.length > 0
      ? ` Key actors include ${companiesInLead.join(', ')}.`
      : '';

  const narrative =
    `The ${leadSector} sector is generating the highest signal volume in today's intelligence feed with ${leadSignals.length} distinct signals detected.${companyMention} ` +
    `This activity level suggests active market movement — procurement decisions, funding events, or regulatory developments are likely underway. ` +
    `Technology buyers with exposure to ${leadSector} should review their vendor landscape and validate current IKER scores before the window closes.`;

  // Top 3 sectors for snapshots
  const sortedSectors = Array.from(byIndustry.entries() as Iterable<[string, NormalizedSignal[]]>)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3);

  const sector_snapshots: SectorSnapshot[] = sortedSectors.map(([ind, sigs]) => {
    const highImp = sigs.filter((s) => s.importance >= 0.7).length;
    const momentum = classifyMomentum(sigs.length, highImp);
    const topSig = sigs[0];
    const one_liner = topSig
      ? `${topSig.title.slice(0, 80)}${topSig.title.length > 80 ? '...' : ''}`
      : `${sigs.length} signals detected in ${ind}`;
    return { sector: ind, one_liner, momentum, signal_count: sigs.length };
  });

  // Risk alert: signals with type containing "security" or "disruption", or importance > 0.9
  const riskSignals = signals.filter(
    (s) =>
      s.importance > 0.9 ||
      s.type.toLowerCase().includes('security') ||
      s.type.toLowerCase().includes('disruption'),
  );

  let risk_alert: RiskAlert | null = null;
  if (riskSignals.length > 0) {
    const topRisk = riskSignals[0]!;
    risk_alert = {
      active: true,
      message: `${riskSignals.length} high-priority risk signal${riskSignals.length > 1 ? 's' : ''} detected. Top alert: ${topRisk.title}`,
    };
  }

  // Opportunity spotlight: highest-importance signal not in the lead sector
  const opportunitySignal = signals
    .filter((s) => s.industry !== leadSector)
    .sort((a, b) => b.importance - a.importance)[0] ?? null;

  let opportunity_spotlight: OpportunitySpotlight | null = null;
  if (opportunitySignal) {
    opportunity_spotlight = {
      title: opportunitySignal.title,
      description: `High-importance signal in ${opportunitySignal.industry}${opportunitySignal.company ? ` involving ${opportunitySignal.company}` : ''}. Importance score: ${Math.round(opportunitySignal.importance * 100)}/100.`,
      score: Math.round(opportunitySignal.importance * 100),
    };
  }

  return {
    timestamp,
    lead_story: { headline: leadHeadline, narrative, signal_count: leadSignals.length },
    sector_snapshots,
    risk_alert,
    opportunity_spotlight,
    ai_generated: false,
  };
}

// ─── LLM enhancement ─────────────────────────────────────────────────────────

type LlmEnhancement = {
  lead_narrative: string;
  sector_one_liners: Record<string, string>;
};

async function fetchGroqEnhancement(
  leadSector: string,
  leadSignals: NormalizedSignal[],
  sectorSummaries: Array<{ sector: string; count: number }>,
  timeoutMs = 8000,
): Promise<LlmEnhancement | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant';

  const signalLines = leadSignals
    .slice(0, 10)
    .map(
      (s) =>
        `- ${s.title}${s.company ? ` [${s.company}]` : ''}${s.importance >= 0.7 ? ' (HIGH IMPORTANCE)' : ''}`,
    )
    .join('\n');

  const sectorLines = sectorSummaries
    .map((s) => `- ${s.sector}: ${s.count} signals`)
    .join('\n');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 512,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a strategic intelligence analyst briefing a CEO. Write like you are briefing the President. Be specific — name companies and dollar amounts when available. Return ONLY valid JSON. No markdown.',
          },
          {
            role: 'user',
            content:
              `Write a morning intelligence brief. The lead sector is ${leadSector} with these signals:\n${signalLines}\n\n` +
              `Other active sectors:\n${sectorLines}\n\n` +
              `Return JSON with:\n` +
              `- "lead_narrative": 3-4 sentence paragraph about the lead story\n` +
              `- "sector_one_liners": object where each key is a sector name and value is one sentence summary`,
          },
        ],
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) return null;

    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(raw) as {
      lead_narrative?: unknown;
      sector_one_liners?: unknown;
    };

    if (
      typeof parsed.lead_narrative === 'string' &&
      typeof parsed.sector_one_liners === 'object' &&
      parsed.sector_one_liners !== null
    ) {
      return {
        lead_narrative: parsed.lead_narrative,
        sector_one_liners: parsed.sector_one_liners as Record<string, string>,
      };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGeminiEnhancement(
  leadSector: string,
  leadSignals: NormalizedSignal[],
  sectorSummaries: Array<{ sector: string; count: number }>,
  timeoutMs = 8000,
): Promise<LlmEnhancement | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

  const signalLines = leadSignals
    .slice(0, 10)
    .map(
      (s) =>
        `- ${s.title}${s.company ? ` [${s.company}]` : ''}${s.importance >= 0.7 ? ' (HIGH IMPORTANCE)' : ''}`,
    )
    .join('\n');

  const sectorLines = sectorSummaries
    .map((s) => `- ${s.sector}: ${s.count} signals`)
    .join('\n');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    `You are a strategic intelligence analyst briefing a CEO. Write like you are briefing the President. Be specific — name companies and dollar amounts.\n\n` +
                    `Write a morning intelligence brief. Lead sector: ${leadSector}.\n\nLead signals:\n${signalLines}\n\nOther sectors:\n${sectorLines}\n\n` +
                    `Return ONLY valid JSON with:\n- "lead_narrative": 3-4 sentence paragraph\n- "sector_one_liners": object mapping sector name to one sentence summary. No markdown.`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.4,
            maxOutputTokens: 512,
          },
        }),
        signal: ctrl.signal,
      },
    );

    if (!res.ok) return null;

    const json = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = JSON.parse(raw) as {
      lead_narrative?: unknown;
      sector_one_liners?: unknown;
    };

    if (
      typeof parsed.lead_narrative === 'string' &&
      typeof parsed.sector_one_liners === 'object' &&
      parsed.sector_one_liners !== null
    ) {
      return {
        lead_narrative: parsed.lead_narrative,
        sector_one_liners: parsed.sector_one_liners as Record<string, string>,
      };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Main generation function ─────────────────────────────────────────────────

async function generateMorningBrief(signals: NormalizedSignal[]): Promise<MorningBrief> {
  const base = buildAlgorithmicBrief(signals);
  if (signals.length === 0) return base;

  // Group by industry for LLM context
  const byIndustry = new Map<string, NormalizedSignal[]>();
  for (const sig of signals) {
    const ind = sig.industry || 'General';
    if (!byIndustry.has(ind)) byIndustry.set(ind, []);
    byIndustry.get(ind)!.push(sig);
  }

  const sortedSectors = Array.from(byIndustry.entries() as Iterable<[string, NormalizedSignal[]]>)
    .sort((a, b) => b[1].length - a[1].length);

  const leadSector = sortedSectors[0]?.[0] ?? 'Technology';
  const leadSignals = sortedSectors[0]?.[1] ?? [];

  const sectorSummaries = sortedSectors.map(([sector, sigs]) => ({
    sector,
    count: sigs.length,
  }));

  // Try Groq then Gemini for enhancement
  const enhancement =
    (await fetchGroqEnhancement(leadSector, leadSignals, sectorSummaries).catch(() => null)) ??
    (await fetchGeminiEnhancement(leadSector, leadSignals, sectorSummaries).catch(() => null));

  if (!enhancement) return base;

  // Apply LLM-written narratives over the algorithmic base
  const enhanced: MorningBrief = {
    ...base,
    lead_story: {
      ...base.lead_story,
      narrative: enhancement.lead_narrative,
    },
    sector_snapshots: base.sector_snapshots.map((snap) => ({
      ...snap,
      one_liner:
        enhancement.sector_one_liners[snap.sector] ?? snap.one_liner,
    })),
    ai_generated: true,
  };

  return enhanced;
}

// ─── GET /api/intelligence/morning-brief ─────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({
    key: `morning-brief:${ip}`,
    maxRequests: 30,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  try {
    // Serve from cache if still fresh (2 hours)
    if (cache && Date.now() < cache.expiresAt) {
      return NextResponse.json(
        { ok: true, data: cache.data, source: 'cache' },
        { headers: { 'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=600' } },
      );
    }

    // ── Gather signals ────────────────────────────────────────────────────────
    let signals: NormalizedSignal[] = [];

    if (isSupabaseConfigured()) {
      const rows = await getIntelSignals({ limit: 50 });
      signals = rows.map((r) => ({
        id: r.id,
        title: r.title,
        industry: r.industry,
        company: r.company ?? null,
        type: r.signal_type,
        importance: r.importance_score,
      }));
    }

    if (signals.length < 5) {
      const store = getStoredFeedItems();
      if (!store) {
        runFeedAgent().catch(() => {});
      } else {
        const engine = runSignalEngine(store.items);
        signals = engine.signals.map((s) => ({
          id: s.id,
          title: s.title,
          industry: s.sectorLabel ?? s.entityName ?? 'General',
          company: s.entityName ?? null,
          type: s.type,
          importance:
            s.priority === 'critical' ? 0.9
            : s.priority === 'high' ? 0.7
            : s.priority === 'elevated' ? 0.5
            : 0.3,
        }));
      }
    }

    // Take top 50 by importance
    const top50 = [...signals]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 50);

    // ── Generate brief ────────────────────────────────────────────────────────
    const brief = await generateMorningBrief(top50);

    // Store in cache
    cache = { data: brief, expiresAt: Date.now() + 2 * 60 * 60 * 1000 };

    return NextResponse.json(
      { ok: true, data: brief, source: 'live' },
      { headers: { 'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=600' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Morning brief generation failed.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
