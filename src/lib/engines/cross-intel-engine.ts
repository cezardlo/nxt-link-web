// src/lib/engines/cross-intel-engine.ts
// Cross-Industry Intelligence Engine for NXT LINK
//
// Detects when signals from DIFFERENT industries share common actors (companies),
// signal types, or thematic patterns — and surfaces the strategic connection
// a technology buyer needs to understand.
//
// Algorithm:
//   1. Take top 30 signals by importance
//   2. Find companies appearing in 2+ industries → cross-sector actors
//   3. Find signal types appearing in 3+ industries → cross-sector patterns
//   4. Build an insight for each detection with algorithmic narrative
//   5. Optionally enhance narrative via LLM (Groq → Gemini → fallback)
//   6. Sort by connected signal count (desc) and return top 5

// ─── Types ────────────────────────────────────────────────────────────────────

export type CrossIntelSignalRef = {
  title: string;
  industry: string;
  company?: string;
};

export type CrossIntelInsight = {
  headline: string;
  narrative: string;
  signals_connected: CrossIntelSignalRef[];
  industries_involved: string[];
  implication: string;
  confidence: number;
};

export type CrossIntelReport = {
  timestamp: string;
  insights: CrossIntelInsight[];
  total_signals_analyzed: number;
};

export type CrossIntelSignalInput = {
  id: string;
  title: string;
  industry?: string;
  company?: string;
  type?: string;
  importance?: number;
};

// ─── LLM helpers ─────────────────────────────────────────────────────────────

type LlmNarrativeResult = {
  narrative: string;
  implication: string;
};

async function fetchGroqNarrative(
  signalRefs: CrossIntelSignalRef[],
  industries: string[],
  timeoutMs = 8000,
): Promise<LlmNarrativeResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant';
  const signalList = signalRefs
    .map((s) => `- [${s.industry}] ${s.title}${s.company ? ` (${s.company})` : ''}`)
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
        max_tokens: 256,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a strategic intelligence analyst. Return ONLY valid JSON with keys "narrative" (string, 2-3 sentences) and "implication" (string, 1 sentence starting with "For technology buyers"). No markdown.',
          },
          {
            role: 'user',
            content: `These signals from different industries (${industries.join(', ')}) are connected:\n\n${signalList}\n\nExplain the connection in 2-3 sentences. What is the bigger picture? Then write one implication sentence for a technology buyer.`,
          },
        ],
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) return null;

    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(raw) as { narrative?: unknown; implication?: unknown };

    if (typeof parsed.narrative === 'string' && typeof parsed.implication === 'string') {
      return { narrative: parsed.narrative, implication: parsed.implication };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGeminiNarrative(
  signalRefs: CrossIntelSignalRef[],
  industries: string[],
  timeoutMs = 8000,
): Promise<LlmNarrativeResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
  const signalList = signalRefs
    .map((s) => `- [${s.industry}] ${s.title}${s.company ? ` (${s.company})` : ''}`)
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
                  text: `You are a strategic intelligence analyst. These signals from different industries (${industries.join(', ')}) are connected:\n\n${signalList}\n\nReturn ONLY valid JSON with keys "narrative" (2-3 sentences connecting the dots) and "implication" (1 sentence starting with "For technology buyers"). No markdown.`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.4,
            maxOutputTokens: 256,
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
    const parsed = JSON.parse(raw) as { narrative?: unknown; implication?: unknown };

    if (typeof parsed.narrative === 'string' && typeof parsed.implication === 'string') {
      return { narrative: parsed.narrative, implication: parsed.implication };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function enhanceWithLlm(
  signalRefs: CrossIntelSignalRef[],
  industries: string[],
): Promise<LlmNarrativeResult | null> {
  const groq = await fetchGroqNarrative(signalRefs, industries);
  if (groq) return groq;

  const gemini = await fetchGeminiNarrative(signalRefs, industries);
  if (gemini) return gemini;

  return null;
}

// ─── Algorithmic narrative builders ──────────────────────────────────────────

function buildCompanyNarrative(company: string, industries: string[]): string {
  const industryList = industries.join(' and ');
  return `${company} is simultaneously active across ${industryList}, a pattern that typically signals a platform play or diversification ahead of a major market shift. Companies spanning multiple sectors at once often precede consolidation events, strategic acquisitions, or entry into new government procurement vehicles. The cross-sector footprint makes ${company} a high-priority vendor to monitor for technology buyers operating in any of these industries.`;
}

function buildCompanyImplication(company: string, industries: string[]): string {
  return `For technology buyers: ${company}'s multi-industry presence in ${industries.join(', ')} creates leverage for bundled procurement and suggests early-mover advantage for buyers who engage now.`;
}

function buildPatternNarrative(signalType: string, industries: string[]): string {
  const industryList = industries.join(', ');
  const typeLabel = signalType.replace(/_/g, ' ');
  return `A wave of ${typeLabel} activity is emerging simultaneously across ${industryList}. When the same signal type crosses multiple unrelated sectors at once, it typically reflects a macro-level driver — a regulatory change, a funding cycle, or a technology wave — that has not yet been priced into procurement decisions. Cross-sector pattern recognition is an early indicator of where capital and contracts will flow next.`;
}

function buildPatternImplication(signalType: string, industries: string[]): string {
  const typeLabel = signalType.replace(/_/g, ' ');
  return `For technology buyers: the ${typeLabel} wave across ${industries.join(', ')} suggests a window of 30–90 days before competition in these sectors intensifies — act on strategic evaluations now.`;
}

function buildHeadline(
  kind: 'company' | 'pattern',
  label: string,
  industries: string[],
): string {
  if (kind === 'company') {
    return `${label} Active Across ${industries.length} Industries: ${industries.join(' · ')}`;
  }
  const typeLabel = label
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return `${typeLabel} Wave Detected Across ${industries.length} Sectors`;
}

// ─── Main engine ──────────────────────────────────────────────────────────────

export async function runCrossIntelEngine(
  signals: CrossIntelSignalInput[],
): Promise<CrossIntelReport> {
  const timestamp = new Date().toISOString();

  if (signals.length === 0) {
    return { timestamp, insights: [], total_signals_analyzed: 0 };
  }

  // Step 1: top 30 by importance
  const top30 = [...signals]
    .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
    .slice(0, 30);

  // Step 2: index signals by company and signal type
  // company → Map<industry, signal[]>
  const byCompany = new Map<string, Map<string, CrossIntelSignalInput[]>>();
  // signal_type → Map<industry, signal[]>
  const byType = new Map<string, Map<string, CrossIntelSignalInput[]>>();

  for (const sig of top30) {
    const industry = (sig.industry ?? 'General').trim();

    if (sig.company) {
      const company = sig.company.trim();
      if (!byCompany.has(company)) byCompany.set(company, new Map());
      const industries = byCompany.get(company)!;
      if (!industries.has(industry)) industries.set(industry, []);
      industries.get(industry)!.push(sig);
    }

    if (sig.type) {
      const type = sig.type.trim();
      if (!byType.has(type)) byType.set(type, new Map());
      const industries = byType.get(type)!;
      if (!industries.has(industry)) industries.set(industry, []);
      industries.get(industry)!.push(sig);
    }
  }

  // Step 3: detect cross-industry actors (company in 2+ distinct industries)
  type Detection = {
    kind: 'company' | 'pattern';
    label: string;
    industries: string[];
    refs: CrossIntelSignalRef[];
    confidence: number;
  };

  const detections: Detection[] = [];

  for (const [company, industryMap] of Array.from(byCompany.entries() as Iterable<[string, Map<string, CrossIntelSignalInput[]>]>)) {
    const industries = Array.from(industryMap.keys() as Iterable<string>);
    if (industries.length < 2) continue;

    const refs: CrossIntelSignalRef[] = [];
    for (const [ind, sigs] of Array.from(industryMap.entries() as Iterable<[string, CrossIntelSignalInput[]]>)) {
      for (const s of sigs) {
        refs.push({ title: s.title, industry: ind, company: s.company ?? undefined });
      }
    }

    const confidence = Math.min(0.95, 0.5 + industries.length * 0.15 + refs.length * 0.04);
    detections.push({ kind: 'company', label: company, industries, refs, confidence });
  }

  // Step 4: detect cross-sector signal type patterns (type in 3+ distinct industries)
  for (const [type, industryMap] of Array.from(byType.entries() as Iterable<[string, Map<string, CrossIntelSignalInput[]>]>)) {
    const industries = Array.from(industryMap.keys() as Iterable<string>);
    if (industries.length < 3) continue;

    const refs: CrossIntelSignalRef[] = [];
    for (const [ind, sigs] of Array.from(industryMap.entries() as Iterable<[string, CrossIntelSignalInput[]]>)) {
      for (const s of sigs) {
        refs.push({ title: s.title, industry: ind, company: s.company ?? undefined });
      }
    }

    const confidence = Math.min(0.92, 0.45 + industries.length * 0.12 + refs.length * 0.03);
    detections.push({ kind: 'pattern', label: type, industries, refs, confidence });
  }

  // Step 5: sort by refs.length descending, take top 5
  detections.sort((a, b) => b.refs.length - a.refs.length);
  const top5 = detections.slice(0, 5);

  // Step 6: build insights (try LLM enhancement per insight)
  const insights: CrossIntelInsight[] = await Promise.all(
    top5.map(async (d): Promise<CrossIntelInsight> => {
      const headline = buildHeadline(d.kind, d.label, d.industries);

      // Algorithmic fallback narrative
      const algorithmicNarrative =
        d.kind === 'company'
          ? buildCompanyNarrative(d.label, d.industries)
          : buildPatternNarrative(d.label, d.industries);

      const algorithmicImplication =
        d.kind === 'company'
          ? buildCompanyImplication(d.label, d.industries)
          : buildPatternImplication(d.label, d.industries);

      // Attempt LLM enhancement (fire individually, 8s timeout each)
      const llm = await enhanceWithLlm(d.refs, d.industries).catch(() => null);

      return {
        headline,
        narrative: llm?.narrative ?? algorithmicNarrative,
        signals_connected: d.refs,
        industries_involved: d.industries,
        implication: llm?.implication ?? algorithmicImplication,
        confidence: d.confidence,
      };
    }),
  );

  return {
    timestamp,
    insights,
    total_signals_analyzed: top30.length,
  };
}
