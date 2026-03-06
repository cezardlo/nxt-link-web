import { NextResponse } from 'next/server';

import { TECHNOLOGY_CATALOG, getIndustryBySlug } from '@/lib/data/technology-catalog';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';
import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getConfiguredProviders } from '@/lib/llm/parallel-router';

export const dynamic = 'force-dynamic';

// ── Industry slug → vendor category mapping ───────────────────────────────────
// Mirrors the mapping used on the industries page (SECTOR_TO_CATEGORIES + tech catalog categories)

const INDUSTRY_VENDOR_CATEGORIES: Record<string, string[]> = {
  'ai-ml':         ['AI / ML', 'IoT', 'Analytics', 'Consulting'],
  'cybersecurity': ['Cybersecurity', 'Defense IT'],
  'defense':       ['Defense', 'Defense IT', 'Consulting'],
  'border-tech':   ['Border Tech', 'Defense', 'Defense IT'],
  'manufacturing': ['Manufacturing', 'Robotics', 'Fabrication', 'Warehousing'],
  'energy':        ['Energy', 'Water Tech'],
  'healthcare':    ['Healthcare', 'Health IT'],
  'logistics':     ['Logistics', 'Warehousing', 'Trucking', 'Supply Chain'],
};

// ── Response types ─────────────────────────────────────────────────────────────

type SolverSolution = {
  name: string;
  description: string;
  maturity: string;
  estimated_timeline: string;
  confidence: string;
};

type RecommendedProduct = {
  technology: string;
  why_it_fits: string;
  vendors_offering_it: string[];
};

type CompanyEvidence = {
  company: string;
  technology: string;
  evidence: string;
};

type PilotPlan = {
  phase1: string;
  phase2: string;
  phase3: string;
  estimated_cost_range: string;
  timeline: string;
};

type SolverResult = {
  diagnosis: string;
  solutions: SolverSolution[];
  recommended_products: RecommendedProduct[];
  companies_using_it: CompanyEvidence[];
  pilot_plan: PilotPlan;
};

type SolveRequest = {
  industry: string;
  problem_text: string;
};

// ── Static fallback ────────────────────────────────────────────────────────────

function getStaticFallback(): SolverResult {
  return {
    diagnosis: 'Analysis temporarily unavailable. All AI inference providers are offline or rate-limited. Please retry in a few minutes.',
    solutions: [
      {
        name: 'Manual Technology Assessment',
        description: 'Work with an NXT LINK analyst to manually map your problem to the El Paso technology vendor landscape.',
        maturity: 'mature',
        estimated_timeline: '1-2 weeks',
        confidence: 'high',
      },
    ],
    recommended_products: [],
    companies_using_it: [],
    pilot_plan: {
      phase1: 'Contact NXT LINK for a manual vendor matching session.',
      phase2: 'Shortlist and evaluate 2–3 local vendors against your requirements.',
      phase3: 'Conduct a structured pilot with the top-ranked vendor.',
      estimated_cost_range: 'Varies by solution scope',
      timeline: '4–8 weeks',
    },
  };
}

// ── LLM caller helpers (mirrors mission/analyze pattern exactly) ───────────────

async function callOpenAiCompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs = 20000,
): Promise<SolverResult> {
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
        temperature: 0.35,
        max_tokens: 2048,
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content ?? '';
    return JSON.parse(text) as SolverResult;
  } finally {
    clearTimeout(timer);
  }
}

async function callOllama(
  baseUrl: string,
  model: string,
  prompt: string,
  timeoutMs = 20000,
): Promise<SolverResult> {
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
    return JSON.parse(text) as SolverResult;
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs = 20000,
): Promise<SolverResult> {
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
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.35,
            maxOutputTokens: 2048,
          },
        }),
        signal: ctrl.signal,
      },
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return JSON.parse(text) as SolverResult;
  } finally {
    clearTimeout(timer);
  }
}

async function callAnthropic(
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs = 25000,
): Promise<SolverResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json() as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = json.content?.find((b) => b.type === 'text')?.text ?? '';
    return JSON.parse(text) as SolverResult;
  } finally {
    clearTimeout(timer);
  }
}

// ── Prompt builder ─────────────────────────────────────────────────────────────

function buildPrompt(
  problemText: string,
  industryLabel: string,
  techLines: string,
  vendorLines: string,
): string {
  return `You are a technology acquisition analyst for NXT LINK, an El Paso, Texas intelligence platform. A company has described a problem in the ${industryLabel} sector. Analyze the problem and produce structured acquisition recommendations.

PROBLEM:
${problemText}

RELEVANT TECHNOLOGIES (from NXT LINK catalog):
${techLines}

LOCAL EL PASO VENDORS (IKER score = capability + momentum index 0-100):
${vendorLines}

Return ONLY valid JSON matching this exact schema (no markdown, no preamble):
{
  "diagnosis": "2-4 sentence analysis of the root cause and technology dimension of the problem",
  "solutions": [
    {
      "name": "Solution name",
      "description": "What this solution does and how it addresses the problem",
      "maturity": "emerging | growing | mature",
      "estimated_timeline": "e.g. 6-12 months",
      "confidence": "high | medium | low"
    }
  ],
  "recommended_products": [
    {
      "technology": "Technology name from the catalog",
      "why_it_fits": "One sentence on fit",
      "vendors_offering_it": ["Vendor name 1", "Vendor name 2"]
    }
  ],
  "companies_using_it": [
    {
      "company": "Company or agency name",
      "technology": "Technology they adopted",
      "evidence": "Brief evidence statement with context"
    }
  ],
  "pilot_plan": {
    "phase1": "Discovery and vendor selection (what to do, ~1-4 weeks)",
    "phase2": "Proof of concept (what to do, ~4-12 weeks)",
    "phase3": "Production rollout (what to do, ~3-6 months)",
    "estimated_cost_range": "e.g. $150K–$500K",
    "timeline": "Total estimated timeline end to end"
  }
}

Produce 2-4 solutions, 2-4 recommended products, 2-3 companies using it. Use real El Paso context where possible.`;
}

// ── Validation helper ──────────────────────────────────────────────────────────

function isValidSolverResult(value: unknown): value is SolverResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.diagnosis === 'string' &&
    Array.isArray(result.solutions) &&
    result.solutions.length > 0 &&
    Array.isArray(result.recommended_products) &&
    Array.isArray(result.companies_using_it) &&
    typeof result.pilot_plan === 'object' &&
    result.pilot_plan !== null
  );
}

// ── POST /api/industry/solve ──────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `industry-solve:${ip}`, maxRequests: 20, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  // Parse and validate body
  const body = await request.json() as SolveRequest;
  const { industry, problem_text } = body;

  if (!industry || typeof industry !== 'string') {
    return NextResponse.json({ ok: false, message: 'industry (slug) is required.' }, { status: 400 });
  }

  if (!problem_text || typeof problem_text !== 'string') {
    return NextResponse.json({ ok: false, message: 'problem_text is required.' }, { status: 400 });
  }

  const trimmedProblem = problem_text.trim();

  if (trimmedProblem.length < 10) {
    return NextResponse.json(
      { ok: false, message: 'problem_text must be at least 10 characters.' },
      { status: 400 },
    );
  }

  if (trimmedProblem.length > 2000) {
    return NextResponse.json(
      { ok: false, message: 'problem_text must not exceed 2000 characters.' },
      { status: 400 },
    );
  }

  // Industry lookup
  const industryMeta = getIndustryBySlug(industry);
  if (!industryMeta) {
    return NextResponse.json(
      { ok: false, message: `Unknown industry slug: "${industry}". Valid slugs: ai-ml, cybersecurity, defense, border-tech, manufacturing, energy, healthcare, logistics.` },
      { status: 400 },
    );
  }

  // Filter relevant technologies by the industry's TechCategory
  const relevantTechs = TECHNOLOGY_CATALOG.filter(
    (tech) => tech.category === industryMeta.category,
  );

  // Filter relevant vendors by the industry → vendor category mapping
  const allowedVendorCategories = new Set(
    INDUSTRY_VENDOR_CATEGORIES[industryMeta.slug] ?? [],
  );
  const relevantVendors = Object.values(EL_PASO_VENDORS).filter(
    (vendor) => allowedVendorCategories.has(vendor.category),
  );

  // Build prompt context lines
  const techLines = relevantTechs
    .map(
      (tech) =>
        `- ${tech.name} [${tech.maturityLevel}] (FY25 budget: $${tech.governmentBudgetFY25M ?? 'N/A'}M): ${tech.description}`,
    )
    .join('\n');

  const vendorLines = relevantVendors
    .map(
      (vendor) =>
        `- ${vendor.name} (IKER: ${vendor.ikerScore}, category: ${vendor.category}): ${vendor.description}`,
    )
    .join('\n');

  const prompt = buildPrompt(trimmedProblem, industryMeta.label, techLines, vendorLines);

  // LLM fallback chain: Ollama → Groq → Gemini → OpenRouter → Together → OpenAI → static
  const providers = getConfiguredProviders();

  const PROVIDER_ORDER = ['anthropic', 'ollama', 'groq', 'gemini', 'openrouter', 'together', 'openai'] as const;

  const sortedProviders = [...providers].sort((a, b) => {
    const ai = PROVIDER_ORDER.indexOf(a.provider as (typeof PROVIDER_ORDER)[number]);
    const bi = PROVIDER_ORDER.indexOf(b.provider as (typeof PROVIDER_ORDER)[number]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  for (const config of sortedProviders) {
    try {
      let result: SolverResult;

      if (config.provider === 'anthropic') {
        result = await callAnthropic(config.apiKey!, config.model, prompt);
      } else if (config.provider === 'ollama') {
        const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';
        result = await callOllama(baseUrl, config.model, prompt);
      } else if (config.provider === 'gemini') {
        result = await callGemini(config.apiKey!, config.model, prompt);
      } else {
        result = await callOpenAiCompatible(config.endpoint, config.apiKey!, config.model, prompt);
      }

      if (isValidSolverResult(result)) {
        return NextResponse.json(
          {
            ok: true,
            industry: { slug: industryMeta.slug, label: industryMeta.label },
            response: result,
            _provider: config.provider,
          },
          { headers: { 'Cache-Control': 'no-store' } },
        );
      }
    } catch {
      // Provider failed — try next tier
      continue;
    }
  }

  // All providers failed — return static fallback
  return NextResponse.json(
    {
      ok: true,
      industry: { slug: industryMeta.slug, label: industryMeta.label },
      response: getStaticFallback(),
      _provider: 'static',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
