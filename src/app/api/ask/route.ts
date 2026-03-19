// POST /api/ask — full intelligence assembler
// Adds intent detection (Gemini), 5 Whys (Groq), decision card, and signal connections
// on top of the existing ask-engine data pipeline.

import { NextResponse } from 'next/server';
import { assembleAskResponse } from '@/lib/engines/ask-engine';
import { detectSignalConnections, type RawSignal } from '@/lib/engines/signal-connections-engine';
import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';

export const dynamic = 'force-dynamic';

// ─── Types ───────────────────────────────────────────────────────────────────

export type IntentResult = {
  topic: string;
  industry: string | null;
  intent: 'problem' | 'industry' | 'technology' | 'company';
  location: string;
  supply_chain_stage: string | null;
  urgency: 'researching' | 'buying_soon' | 'immediate';
};

export type WhySection = {
  level: number;
  question: string;
  answer: string;
};

export type DecisionCard = {
  type: 'CALL_SOMEONE' | 'WATCH_THIS' | 'ACT_BEFORE_DATE' | 'KEEP_WATCHING';
  headline: string;
  detail: string;
  vendor_name?: string;
  vendor_phone?: string;
  timeline?: string;
  trigger?: string;
};

// ─── Algorithmic intent fallback ─────────────────────────────────────────────

function buildIntentFallback(query: string, location: string): IntentResult {
  const lower = query.toLowerCase();
  const IND_MAP: [string, string][] = [
    ['ai', 'AI/ML'], ['machine learning', 'AI/ML'], ['artificial intelligence', 'AI/ML'],
    ['cyber', 'Cybersecurity'], ['security', 'Cybersecurity'],
    ['defense', 'Defense'], ['military', 'Defense'], ['army', 'Defense'], ['fort bliss', 'Defense'],
    ['energy', 'Energy'], ['solar', 'Energy'], ['electric', 'Energy'],
    ['health', 'Healthcare'], ['medical', 'Healthcare'], ['hospital', 'Healthcare'],
    ['logistics', 'Logistics'], ['supply chain', 'Logistics'], ['warehouse', 'Logistics'],
    ['manufacturing', 'Manufacturing'], ['factory', 'Manufacturing'], ['robotics', 'Manufacturing'],
    ['border', 'Border Tech'], ['customs', 'Border Tech'], ['cbp', 'Border Tech'],
    ['finance', 'Finance'], ['banking', 'Finance'], ['fintech', 'Finance'],
  ];
  let industry: string | null = null;
  for (const [kw, ind] of IND_MAP) {
    if (lower.includes(kw)) { industry = ind; break; }
  }
  const intent: IntentResult['intent'] =
    lower.includes('problem') || lower.includes('issue') ? 'problem'
    : lower.includes('company') || lower.includes('vendor') || lower.includes('who') ? 'company'
    : lower.includes('technology') || lower.includes('system') ? 'technology'
    : 'industry';
  const urgency: IntentResult['urgency'] =
    lower.includes('buy') || lower.includes('purchase') || lower.includes('need') ? 'buying_soon'
    : lower.includes('urgent') || lower.includes('now') ? 'immediate'
    : 'researching';
  return {
    topic: query.split(/\s+/).slice(0, 3).join(' '),
    industry,
    intent,
    location,
    supply_chain_stage: null,
    urgency,
  };
}

// ─── 5 Whys fallback ─────────────────────────────────────────────────────────

const WHY_BY_TYPE: Record<string, string[]> = {
  contract_award: [
    'A government contract was awarded because an agency needed capabilities its existing systems could not deliver.',
    'That gap existed because the agency\'s technology was aging and a budget cycle finally cleared the funding path.',
    'The underlying market force is government modernization — every 5-7 years agencies must upgrade aging systems.',
    'The organizations controlling this are the DoD, DHS, and Congressional defense committees.',
    'The root driver is geopolitical competition — the need to maintain technological superiority forces continuous investment.',
  ],
  funding_round: [
    'This company raised capital because investors saw a defensible market position forming in a growing sector.',
    'That position formed because a technology gap opened when incumbents failed to innovate fast enough.',
    'The underlying force is capital seeking returns in sectors with government procurement tailwinds.',
    'Venture capital firms, sovereign wealth funds, and corporate strategic investors control this flow.',
    'The root driver is the 10-15 year technology adoption cycle — early bets made now pay off at scale.',
  ],
  product_launch: [
    'This product launched because a buyer segment had a real problem the market was not solving.',
    'That problem persisted because prior generation tools could not handle new data volumes or speed requirements.',
    'The underlying force is the computing power curve — as chips get cheaper, more AI-powered products become viable.',
    'Semiconductor makers, cloud providers, and large platform companies control the enabling infrastructure.',
    'The root driver is Moore\'s Law compounding — capabilities double roughly every 18 months at the same cost.',
  ],
  regulatory_action: [
    'This regulation was enacted because a risk materialized that prior rules did not address.',
    'That risk grew because technology moved faster than the regulatory framework — a common pattern.',
    'The underlying force is the tension between innovation speed and institutional governance speed.',
    'Congress, federal agencies, and large industry lobby groups shape where regulation lands.',
    'The root driver is public pressure following a visible failure or a national security event.',
  ],
  merger_acquisition: [
    'This acquisition happened because the buyer needed capabilities faster than they could build them internally.',
    'That urgency existed because a competitor had already moved, narrowing the available window.',
    'The underlying force is platform consolidation — in maturing markets, scale advantages compound.',
    'PE firms, strategic corporate buyers, and market leaders control acquisition activity.',
    'The root driver is shareholder pressure to grow revenue without proportional cost increases.',
  ],
};

function buildFiveWhysFallback(
  topic: string,
  industry: string | null,
  signals: RawSignal[],
  location: string,
  localVendorNames: string,
): WhySection[] {
  const signalType = signals[0]?.signal_type ?? 'funding_round';
  const templates = WHY_BY_TYPE[signalType] ?? WHY_BY_TYPE.funding_round;
  return [
    { level: 1, question: 'What is directly causing this?', answer: templates[0] },
    { level: 2, question: 'What caused that?', answer: templates[1] },
    { level: 3, question: 'What is the root market force?', answer: templates[2] },
    { level: 4, question: 'Who controls that force?', answer: templates[3] },
    {
      level: 5,
      question: `What does this mean for ${location}?`,
      answer: `${templates[4]} For ${location}, this creates a direct opportunity in ${industry ?? topic}.${localVendorNames ? ` Local companies like ${localVendorNames} are positioned to capture this.` : ''}`,
    },
  ];
}

// ─── Decision card builder ────────────────────────────────────────────────────

function buildDecision(signals: RawSignal[], intent: IntentResult): DecisionCard {
  const localVendors = Object.values(EL_PASO_VENDORS).sort((a, b) => b.ikerScore - a.ikerScore);
  const topLocal = localVendors.find(v => v.ikerScore >= 75);

  if (topLocal && intent.urgency !== 'researching') {
    return {
      type: 'CALL_SOMEONE',
      headline: `Call ${topLocal.name} today`,
      detail: `They specialize in ${topLocal.category} with an IKER trust score of ${topLocal.ikerScore}/100 — the highest-rated local vendor for this topic.`,
      vendor_name: topLocal.name,
    };
  }
  const regSignal = signals.find(s => s.signal_type === 'regulatory_action');
  if (regSignal) {
    return {
      type: 'ACT_BEFORE_DATE',
      headline: 'A regulation is changing — act within 90 days',
      detail: `"${regSignal.title.slice(0, 80)}" — regulatory windows close fast. Companies that move first lock in preferred vendor status.`,
      timeline: '90 days',
    };
  }
  const researchSignal = signals.find(s => s.signal_type === 'research_publication' || s.signal_type === 'patent_filing');
  if (researchSignal) {
    return {
      type: 'WATCH_THIS',
      headline: 'This technology is early — watch it for 6 months',
      detail: `Patent and research activity signals a wave forming. Act when the first commercial contracts appear.`,
      timeline: '6 months',
      trigger: 'First government contract award in this category',
    };
  }
  return {
    type: 'KEEP_WATCHING',
    headline: `Track ${intent.topic} weekly`,
    detail: `Active but no urgent trigger yet. Watch for a contract award or funding round over $50M in ${intent.industry ?? intent.topic}.`,
    trigger: 'Contract award or funding round >$50M',
  };
}

// ─── Parse helpers ────────────────────────────────────────────────────────────

function parseJsonFromContent<T>(content: string): T {
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned) as T;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = typeof body?.query === 'string' ? body.query.trim() : '';
    const location = typeof body?.location === 'string' ? body.location.trim() : 'El Paso, TX';

    if (query.length < 2) {
      return NextResponse.json({ ok: false, message: 'Query required (2+ characters)' }, { status: 400 });
    }
    if (query.length > 300) {
      return NextResponse.json({ ok: false, message: 'Query too long (max 300 characters)' }, { status: 400 });
    }

    // ── Core data assembly (heavy lift) ─────────────────────────────────────────
    const core = await assembleAskResponse(query);

    // ── Intent detection (Gemini, 1 provider max) ────────────────────────────
    let intent: IntentResult = buildIntentFallback(query, location);
    try {
      const intentData = await runParallelJsonEnsemble<IntentResult>({
        systemPrompt: 'You are an intent classifier for a technology intelligence platform.',
        userPrompt: `The user typed: "${query}"\nLocation: "${location}"\nReturn ONLY valid JSON:\n{"topic":"main subject 2-3 words","industry":"primary industry or null","intent":"problem|industry|technology|company","location":"city state or global","supply_chain_stage":"stage or null","urgency":"researching|buying_soon|immediate"}`,
        maxProviders: 1,
        parse: (content) => parseJsonFromContent<IntentResult>(content),
      });
      intent = intentData.result;
    } catch {
      // use fallback
    }

    // ── Build signal list for connections + 5 whys ───────────────────────────
    const coreSignals: RawSignal[] = core.sections.live_signals.signals.map(s => ({
      title: s.title,
      signal_type: s.type,
      industry: intent.industry?.toLowerCase() ?? 'general',
      company: null,
      importance_score: s.importance,
      discovered_at: s.discovered_at,
      url: s.url,
    }));

    // ── Run connections + 5 Whys in parallel ─────────────────────────────────
    const localVendorNames = Object.values(EL_PASO_VENDORS)
      .sort((a, b) => b.ikerScore - a.ikerScore)
      .slice(0, 2)
      .map(v => v.name)
      .join(' and ');

    const topSignalLines = coreSignals.slice(0, 5).map(s => `- ${s.title}`).join('\n');

    const [connectionReport, fiveWhysResult] = await Promise.allSettled([
      Promise.resolve(detectSignalConnections(coreSignals)),
      (async (): Promise<WhySection[]> => {
        try {
          const r = await runParallelJsonEnsemble<WhySection[]>({
            systemPrompt: 'You generate plain-english 5 Whys analysis. No jargon. 2-3 sentences per answer.',
            userPrompt: `Topic: ${intent.topic}\nIndustry: ${intent.industry ?? 'general'}\nLocation: ${location}\nSignals:\n${topSignalLines}\n\nReturn a JSON array of 5 objects: [{"level":1,"question":"...","answer":"..."},...,{"level":5,"question":"What does this mean for someone in ${location}?","answer":"..."}]`,
            maxProviders: 1,
            parse: (content) => parseJsonFromContent<WhySection[]>(content),
          });
          return Array.isArray(r.result) ? r.result : buildFiveWhysFallback(intent.topic, intent.industry, coreSignals, location, localVendorNames);
        } catch {
          return buildFiveWhysFallback(intent.topic, intent.industry, coreSignals, location, localVendorNames);
        }
      })(),
    ]);

    const connections = connectionReport.status === 'fulfilled' ? connectionReport.value : { connections: [], clusters: [] };
    const fiveWhys = fiveWhysResult.status === 'fulfilled' ? fiveWhysResult.value : buildFiveWhysFallback(intent.topic, intent.industry, coreSignals, location, localVendorNames);

    // ── Build decision + who_doing_what ──────────────────────────────────────
    const decision = buildDecision(coreSignals, intent);

    const globalVendors = core.sections.global_vendors.vendors;
    const whoDoingWhat = {
      global_leaders: globalVendors.filter(v => v.iker_score >= 80).slice(0, 5),
      fast_movers: globalVendors.filter(v => v.has_recent_funding || v.is_hiring).slice(0, 5),
      local_vendors: core.sections.local_vendors.vendors.slice(0, 8),
      new_entrants: globalVendors.filter(v => v.iker_score < 60 && v.has_recent_funding).slice(0, 5),
    };

    return NextResponse.json(
      {
        ok: true,
        query,
        understood_as: intent,
        slug: core.slug,
        label: core.label,
        confidence: core.confidence,
        sections: core.sections,
        products: core.products,
        who_doing_what: whoDoingWhat,
        five_whys: fiveWhys,
        decision,
        connections: connections.connections.slice(0, 20),
        connection_clusters: connections.clusters?.slice(0, 5) ?? [],
        related_searches: core.related_searches,
        risk_signals: core.risk_signals,
        regulatory_signals: core.regulatory_signals,
        hiring_signals: core.hiring_signals,
        live_search: core.live_search,
        generated_at: core.generated_at,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } },
    );
  } catch (err) {
    console.error('[/api/ask] Error:', err);
    return NextResponse.json({ ok: false, message: 'Internal error assembling intelligence' }, { status: 500 });
  }
}
