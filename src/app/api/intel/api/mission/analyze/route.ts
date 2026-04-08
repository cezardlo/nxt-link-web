export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getConfiguredProviders } from '@/lib/llm/parallel-router';


// WorldMonitor-style 4-tier fallback chain for mission intelligence briefings:
// Tier 1: Ollama (local — fastest, free, private)
// Tier 2: Groq  (cloud — fast inference, cheap)
// Tier 3: Gemini (cloud — Google, high quality)
// Tier 4: OpenRouter (cloud — multi-model fallback)
// Tier 5: Static El Paso curated response (always available)

type MissionRequest = {
  mission_text?: string;
  query?: string;
  timeRange?: number;
  layers?: string[];
};

type BriefingResult = {
  movement: string[];
  risk: string[];
  opportunity: string[];
  briefing: string;
};

// Static El Paso briefing — shown when all LLM providers unavailable
function getElPasoFallback(missionText: string): BriefingResult {
  const text = missionText.toLowerCase();

  const isDefense = text.includes('defense') || text.includes('military') || text.includes('army') || text.includes('bliss');
  const isBorder = text.includes('border') || text.includes('crossing') || text.includes('trade') || text.includes('customs');
  const isEnergy = text.includes('energy') || text.includes('solar') || text.includes('grid') || text.includes('water');

  if (isDefense) {
    return {
      movement: [
        'L3Harris and Raytheon expanding Fort Bliss C4ISR contracts through FY2026',
        'SAIC awarded GCSS-Army modernization follow-on task order at Fort Bliss',
        'Booz Allen Hamilton growing AI/ML practice — +120 cleared personnel in El Paso corridor',
      ],
      risk: [
        'NDAA Section 889 compliance review required for all new Border Tech integrations',
        'Supply chain constraints on semiconductor components affecting defense electronics deliveries',
      ],
      opportunity: [
        'Fort Bliss IVAS headset integration creating $80M+ downstream services opportunity',
        'Army cyber readiness mandate opening new contracts for ManTech and GDIT',
        'Boeing AH-64 Apache simulator expansion at Fort Bliss (FY2025 budget line identified)',
      ],
      briefing: 'Fort Bliss defense corridor shows strong momentum. L3Harris and Raytheon hold dominant positions on C4ISR and Patriot systems respectively. The technology services cluster (SAIC, Leidos, GDIT, ManTech, Booz Allen) is expanding as the Army accelerates digital transformation. Key near-term opportunity is the IVAS program generating downstream integration and support contracts.',
    };
  }

  if (isBorder) {
    return {
      movement: [
        'CrossingIQ expanded CBP pilot to Paso del Norte POE — wait-time prediction live',
        'TradeSync Border processing 500+ active maquiladora USMCA certificates monthly',
        'CBPASS Systems advancing to Phase II GSA Schedule award after CBP facial recognition pilot',
      ],
      risk: [
        'CBP ACE platform integration complexity delaying PortLogic commercial rollout by Q3',
        'Regulatory uncertainty around AI-based biometric screening at federal ports of entry',
      ],
      opportunity: [
        'FAST program digital credentialing mandate creating market for BorderTech RFID expansion',
        'Nearshoring acceleration increasing commercial lane volume 18% YoY — TradeSync well-positioned',
        'DHS S&T FY2025 BAA for border technology innovation expected Q2',
      ],
      briefing: 'El Paso border technology sector is in active expansion driven by nearshoring volumes and CBP digital modernization. CrossingIQ has achieved first mover advantage on AI wait-time prediction at the busiest US land port. The USMCA compliance software segment is consolidating around ACE-certified platforms. Near-term catalysts include DHS S&T grants and CBP FAST program digital mandate.',
    };
  }

  if (isEnergy) {
    return {
      movement: [
        'El Paso Electric grid modernization $1.8B capex plan approved through 2030',
        'NextEra West Texas battery storage addition 400 MWh — ERCOT grid stability contract signed',
        'SunPower residential solar installations +28% YoY in El Paso metro',
      ],
      risk: [
        'Permian Basin water scarcity constraining natural gas generation backup capacity',
        'ERCOT interconnection queue delays pushing renewable project timelines 12–18 months',
      ],
      opportunity: [
        'El Paso Water desal expansion study underway — 15 MGD additional capacity procurement 2025',
        'AridTech DoD contract pipeline — Fort Bliss field trial success creating SBIR Phase III pathway',
        'SunPower maquiladora solar program — 50+ eligible facilities in Juárez industrial parks',
      ],
      briefing: "El Paso energy and water technology corridor is capitalizing on scarcity-driven demand. El Paso Electric's $1.8B modernization plan is the anchor procurement driver. NextEra's storage expansion strengthens ERCOT resilience. The water technology cluster is globally recognized — El Paso Water was a World Water Prize finalist in 2024. AridTech's DoD trajectory represents the highest-growth emerging opportunity.",
    };
  }

  return {
    movement: [
      'Fort Bliss defense technology corridor adding 3 new vendor support contracts in Q1 2026',
      'Border tech sector momentum sustained as nearshoring volumes reach 5-year high',
      'UTEP AI Research Lab NSF grant opens university-to-DoD technology transfer pipeline',
    ],
    risk: [
      'Workforce availability constraining scaling of defense IT vendors in the El Paso corridor',
      'Cross-border logistics disruption risk elevated — CBP staffing gaps at Bridge of Americas',
    ],
    opportunity: [
      'El Paso MSA identified as Tier 1 DoD technology hub in latest Army Futures Command assessment',
      'USMCA compliance technology gap creates $120M+ addressable market for TradeSync and peers',
      'Medical Center district EHR modernization cycle generating $40M in procurement opportunities',
    ],
    briefing: "El Paso presents a distinctive multi-sector technology opportunity at the intersection of defense, border technology, and critical infrastructure. The Fort Bliss defense corridor is the dominant anchor ($600M+ annual procurement), with border tech and logistics as the highest-growth adjacent opportunities driven by nearshoring acceleration. Recommend prioritizing defense IT and border tech as primary engagement sectors.",
  };
}

const MISSION_PROMPT = (missionText: string) => `You are an intelligence analyst for NXT LINK, a technology acquisition platform focused on El Paso, Texas. Analyze this mission query and produce a structured intelligence briefing.

Mission Query: "${missionText}"

Return ONLY valid JSON matching this exact schema (no markdown, no preamble):
{
  "movement": ["3 bullet points describing current market movement, contracts, expansions"],
  "risk": ["2 bullet points identifying procurement risks or threat vectors"],
  "opportunity": ["3 bullet points identifying high-value acquisition opportunities"],
  "briefing": "One analytical paragraph (3-5 sentences) synthesizing the intelligence picture"
}

Focus on El Paso sectors: defense (Fort Bliss), border technology, logistics, energy, health tech, water tech, manufacturing.
Key vendors: L3Harris, Raytheon, SAIC, Leidos, Booz Allen, Boeing, FedEx, CrossingIQ, BorderTech, UTEP, UMC, El Paso Electric, NextEra, MesaAI.
Time context: March 2026.`;

// Call an OpenAI-compatible provider (Groq, OpenRouter, Together, OpenAI)
async function callOpenAiCompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs = 12000,
): Promise<BriefingResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 1024,
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content ?? '';
    return JSON.parse(text) as BriefingResult;
  } finally {
    clearTimeout(timer);
  }
}

// Call Ollama (local, different format + no auth)
async function callOllama(
  baseUrl: string,
  model: string,
  prompt: string,
  timeoutMs = 8000,
): Promise<BriefingResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        format: 'json',
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json() as { message?: { content?: string }; response?: string };
    const text = json.message?.content ?? json.response ?? '';
    return JSON.parse(text) as BriefingResult;
  } finally {
    clearTimeout(timer);
  }
}

// Call Gemini REST API (different format from OpenAI)
async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs = 12000,
): Promise<BriefingResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens: 1024 },
        }),
        signal: ctrl.signal,
      },
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return JSON.parse(text) as BriefingResult;
  } finally {
    clearTimeout(timer);
  }
}

// POST /api/intel/api/mission/analyze
// Body: { mission_text: string, timeRange?: number, layers?: string[] }
// Returns: { movement: string[], risk: string[], opportunity: string[], briefing: string }
export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `intel-mission:${ip}`, maxRequests: 10, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const body = await request.json() as MissionRequest;
  const missionText = (body.mission_text ?? body.query ?? '').trim();

  if (!missionText) {
    return NextResponse.json({ ok: false, message: 'mission_text is required.' }, { status: 400 });
  }

  const prompt = MISSION_PROMPT(missionText);
  const providers = getConfiguredProviders();

  // WorldMonitor-style sequential fallback: try each provider in order
  // Priority: Ollama (local) → Groq (fast/cheap) → Gemini (high quality) → OpenRouter (multi-model)
  const PROVIDER_ORDER = ['ollama', 'groq', 'gemini', 'openrouter', 'together', 'openai'] as const;

  const sortedProviders = [...providers].sort((a, b) => {
    const ai = PROVIDER_ORDER.indexOf(a.provider as (typeof PROVIDER_ORDER)[number]);
    const bi = PROVIDER_ORDER.indexOf(b.provider as (typeof PROVIDER_ORDER)[number]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  for (const config of sortedProviders) {
    try {
      let result: BriefingResult;

      if (config.provider === 'ollama') {
        const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';
        result = await callOllama(baseUrl, config.model, prompt);
      } else if (config.provider === 'gemini') {
        result = await callGemini(config.apiKey!, config.model, prompt);
      } else {
        result = await callOpenAiCompatible(config.endpoint, config.apiKey!, config.model, prompt);
      }

      // Validate result has expected shape
      if (Array.isArray(result.movement) && Array.isArray(result.risk) && typeof result.briefing === 'string') {
        return NextResponse.json({ ...result, _provider: config.provider }, { headers: { 'Cache-Control': 'no-store' } });
      }
    } catch {
      // Provider failed — try next tier
      continue;
    }
  }

  // All providers failed or none configured — return curated El Paso fallback
  const fallback = getElPasoFallback(missionText);
  return NextResponse.json({ ...fallback, _provider: 'static' }, { headers: { 'Cache-Control': 'no-store' } });
}
