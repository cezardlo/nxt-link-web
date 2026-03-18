// src/lib/engines/signal-enrichment-engine.ts
// Adds "so_what" and "whats_next" analysis fields to raw intelligence signals.
//
// Provider priority: Gemini (cheapest for bulk) → Groq → Algorithmic fallback.
// Batch size: 10 signals per LLM call.
// Filters: only signals with importance >= 0.7.

// ─── Types ────────────────────────────────────────────────────────────────────

export type RawSignal = {
  id: string;
  title: string;
  industry?: string;
  company?: string;
  type?: string;
  importance?: number;
  evidence?: string;
};

export type EnrichedSignal = {
  id: string;
  title: string;
  industry: string;
  company?: string;
  type: string;
  importance: number;
  so_what: string;
  whats_next: string;
  enriched_at: string;
};

type LlmEnrichmentItem = {
  id: string;
  so_what: string;
  whats_next: string;
};

// ─── Algorithmic fallback templates ───────────────────────────────────────────

const SO_WHAT_BY_TYPE: Record<string, string> = {
  funding_round:
    'Capital injection signals the company has entered a growth phase and is preparing to scale operations.',
  contract_alert:
    'Government procurement validates market demand and opens downstream subcontracting opportunities.',
  contract_award:
    'A confirmed contract award directly de-risks vendor revenue and signals sector-level budget commitment.',
  vendor_mention:
    'Elevated media coverage of a vendor typically precedes procurement activity or market positioning changes.',
  velocity_spike:
    'A sharp increase in publishing rate indicates rapid market response to a significant development.',
  convergence:
    'Multiple independent source tiers covering the same story confirms signal validity and broad market impact.',
  sector_spike:
    'Elevated sector-level activity suggests sustained demand growth or an incoming policy/budget cycle.',
  security_impact:
    'Security incidents near commercial corridors directly affect freight economics and vendor operating conditions.',
  patent_filing:
    'A new patent signals proprietary technology development that can create competitive moats within 12–24 months.',
  hiring_surge:
    'Rapid headcount expansion confirms a funded growth mandate and near-term delivery commitments.',
  acquisition:
    'An acquisition reshapes competitive dynamics and often precedes product consolidation or market expansion.',
};

const WHATS_NEXT_BY_TYPE: Record<string, string> = {
  funding_round:
    'Expect a hiring surge and product launch announcements within 60–90 days as capital is deployed.',
  contract_alert:
    'Monitor SAM.gov for related solicitations and watch for subcontracting opportunities within 30 days.',
  contract_award:
    'Track hiring signals at the prime contractor — surge hiring within 60 days typically confirms execution start.',
  vendor_mention:
    'Review active SAM.gov solicitations and cross-reference the vendor\'s IKER score for acquisition signals.',
  velocity_spike:
    'Monitor for follow-on contract announcements or regulatory filings within 24–48 hours.',
  convergence:
    'Cross-reference with USASpending.gov — multi-tier convergence on an El Paso story is rare and procurement-adjacent.',
  sector_spike:
    'Monitor for RFI/RFP postings over the next 30–60 days aligned with DoD fiscal-year procurement cycles.',
  security_impact:
    'Check BTS crossing volume data for commercial lane disruption and watch logistics vendors for operational updates.',
  patent_filing:
    'Watch for licensing deals or product announcements in the next 6–18 months as the technology matures.',
  hiring_surge:
    'Expect a product delivery milestone or contract execution announcement within the next quarter.',
  acquisition:
    'Look for product roadmap consolidations, customer migration announcements, and follow-on acquisition targets.',
};

const DEFAULT_SO_WHAT =
  'This signal indicates a notable shift in the technology or procurement landscape that warrants closer monitoring.';
const DEFAULT_WHATS_NEXT =
  'Track related SAM.gov solicitations and vendor activity over the next 30–60 days for follow-on opportunities.';

function algorithmicEnrich(signal: RawSignal, now: string): EnrichedSignal {
  const signalType = (signal.type ?? 'general').toLowerCase();
  const so_what = SO_WHAT_BY_TYPE[signalType] ?? DEFAULT_SO_WHAT;
  const whats_next = WHATS_NEXT_BY_TYPE[signalType] ?? DEFAULT_WHATS_NEXT;

  return {
    id: signal.id,
    title: signal.title,
    industry: signal.industry ?? 'General',
    company: signal.company,
    type: signal.type ?? 'general',
    importance: signal.importance ?? 0.7,
    so_what,
    whats_next,
    enriched_at: now,
  };
}

// ─── LLM call helpers ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  'You are a technology intelligence analyst covering defense, supply chain, energy, and emerging tech markets. ' +
  'For each signal provided, write: ' +
  '(1) SO WHAT — why this specific signal matters, in 1–2 sentences. Be concrete. Name companies, sectors, dollar amounts where relevant. No jargon. ' +
  '(2) WHAT\'S NEXT — what will likely happen as a direct result, in 1–2 sentences. Include timeframes where possible. ' +
  'Return a JSON array where each element has: id (string), so_what (string), whats_next (string). ' +
  'Return the same number of elements as the input. Do not skip any signal.';

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

type GroqResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

async function callGemini(
  prompt: string,
  apiKey: string,
  model: string,
): Promise<LlmEnrichmentItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt + '\n\nReturn valid JSON only. No markdown code fences.' }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Gemini HTTP ${response.status}`);
    }

    const payload = (await response.json()) as GeminiResponse;
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text.trim()) throw new Error('Gemini returned empty content');

    return parseEnrichmentArray(text);
  } finally {
    clearTimeout(timeout);
  }
}

async function callGroq(
  prompt: string,
  apiKey: string,
  model: string,
): Promise<LlmEnrichmentItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt + '\n\nReturn valid JSON only. No markdown code fences.' },
        ],
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Groq HTTP ${response.status}`);
    }

    const payload = (await response.json()) as GroqResponse;
    const text = payload.choices?.[0]?.message?.content ?? '';
    if (!text.trim()) throw new Error('Groq returned empty content');

    return parseEnrichmentArray(text);
  } finally {
    clearTimeout(timeout);
  }
}

// ─── JSON parsing ─────────────────────────────────────────────────────────────

function parseEnrichmentArray(raw: string): LlmEnrichmentItem[] {
  // Strip markdown fences if present
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  const parsed: unknown = JSON.parse(cleaned);

  // Accept either a bare array or { signals: [...] } / { results: [...] } / { items: [...] }
  let arr: unknown[];
  if (Array.isArray(parsed)) {
    arr = parsed;
  } else if (parsed !== null && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const inner = obj['signals'] ?? obj['results'] ?? obj['items'] ?? obj['data'];
    if (Array.isArray(inner)) {
      arr = inner;
    } else {
      throw new Error('LLM response is not a JSON array and has no known wrapper key');
    }
  } else {
    throw new Error('LLM response is not a JSON array');
  }

  return arr.map((entry) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error('Array element is not an object');
    }
    const item = entry as Record<string, unknown>;
    return {
      id: typeof item['id'] === 'string' ? item['id'] : '',
      so_what: typeof item['so_what'] === 'string' ? item['so_what'] : DEFAULT_SO_WHAT,
      whats_next: typeof item['whats_next'] === 'string' ? item['whats_next'] : DEFAULT_WHATS_NEXT,
    };
  });
}

// ─── Batch enrichment ─────────────────────────────────────────────────────────

function buildBatchPrompt(batch: RawSignal[]): string {
  const lines = batch.map((s, i) => {
    const parts: string[] = [`${i + 1}. id="${s.id}" title="${s.title}"`];
    if (s.industry) parts.push(`industry="${s.industry}"`);
    if (s.company) parts.push(`company="${s.company}"`);
    if (s.type) parts.push(`type="${s.type}"`);
    if (s.evidence) parts.push(`evidence="${s.evidence.slice(0, 120)}"`);
    return parts.join(' ');
  });

  return `Analyze these ${batch.length} intelligence signals:\n\n${lines.join('\n')}`;
}

async function enrichBatch(batch: RawSignal[], now: string): Promise<EnrichedSignal[]> {
  const prompt = buildBatchPrompt(batch);
  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
  const groqKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant';

  let items: LlmEnrichmentItem[] | null = null;

  // 1. Gemini
  if (geminiKey) {
    try {
      items = await callGemini(prompt, geminiKey, geminiModel);
    } catch {
      items = null;
    }
  }

  // 2. Groq fallback
  if (!items && groqKey) {
    try {
      items = await callGroq(prompt, groqKey, groqModel);
    } catch {
      items = null;
    }
  }

  // 3. Algorithmic fallback — always succeeds
  if (!items || items.length === 0) {
    return batch.map((s) => algorithmicEnrich(s, now));
  }

  // Merge LLM results back onto the input signals by position (or by id if matched).
  const byId = new Map<string, LlmEnrichmentItem>(items.map((item) => [item.id, item]));

  return batch.map((s, i) => {
    const llm = byId.get(s.id) ?? items![i];
    const so_what =
      llm?.so_what && llm.so_what.length > 10 ? llm.so_what : algorithmicEnrich(s, now).so_what;
    const whats_next =
      llm?.whats_next && llm.whats_next.length > 10
        ? llm.whats_next
        : algorithmicEnrich(s, now).whats_next;

    return {
      id: s.id,
      title: s.title,
      industry: s.industry ?? 'General',
      company: s.company,
      type: s.type ?? 'general',
      importance: s.importance ?? 0.7,
      so_what,
      whats_next,
      enriched_at: now,
    };
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

const IMPORTANCE_THRESHOLD = 0.7;
const BATCH_SIZE = 10;

export async function enrichSignals(signals: RawSignal[]): Promise<EnrichedSignal[]> {
  const now = new Date().toISOString();

  // Filter to high-importance signals only
  const eligible = signals.filter((s) => (s.importance ?? 0) >= IMPORTANCE_THRESHOLD);
  if (eligible.length === 0) return [];

  // Split into batches of BATCH_SIZE
  const batches: RawSignal[][] = [];
  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    batches.push(eligible.slice(i, i + BATCH_SIZE));
  }

  // Process batches sequentially to avoid hammering the LLM API
  const results: EnrichedSignal[] = [];
  for (const batch of batches) {
    const enriched = await enrichBatch(batch, now);
    results.push(...enriched);
  }

  return results;
}
