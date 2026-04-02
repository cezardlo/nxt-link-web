import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';

export const dynamic = 'force-dynamic';

// ── Types ────────────────────────────────────────────────────────────────────

type SignalRow = {
  id: string;
  title: string;
  signal_type: string;
  industry: string;
  company: string | null;
  evidence: string | null;
  amount_usd: number | null;
  confidence: number;
  importance_score: number;
  discovered_at: string;
  source: string | null;
  tags: string[];
  vendor_id: string | null;
  problem_category: string | null;
};

type VendorRow = {
  id: string;
  company_name: string;
  primary_category: string;
  iker_score: number | null;
  company_url: string | null;
  description: string | null;
  sector: string | null;
};

// ── Scoring Formula (deterministic, transparent) ─────────────────────────────
// score = (0.4 × cluster_volume) + (0.3 × trend_velocity) + (0.2 × ep_relevance) + (0.1 × source_quality)
// All components normalized to 0-100 scale, final score 0-100

const JUNK_SOURCES = ['arxiv'];

function isJunk(source: string | null, title: string): boolean {
  const lower = `${source || ''} ${title}`.toLowerCase();
  return JUNK_SOURCES.some(j => lower.includes(j));
}

// Source quality: 0-100
const TIER1_SOURCES = ['freightwaves', 'supply chain dive', 'reuters', 'bloomberg', 'associated press', 'journal of commerce', 'american shipper'];
const TIER2_SOURCES = ['transport topics', 'the loadstar', 'commercial carrier journal', 'fleet owner', 'trucking info', 'logistics management', 'borderreport'];

function sourceQuality(source: string | null): number {
  if (!source) return 20;
  const lower = source.toLowerCase();
  if (TIER1_SOURCES.some(s => lower.includes(s))) return 100;
  if (TIER2_SOURCES.some(s => lower.includes(s))) return 75;
  return 30;
}

// El Paso relevance: 0-100
const EP_KEYWORDS = ['el paso', 'juarez', 'juárez', 'border', 'cbp', 'customs', 'maquiladora', 'fort bliss', 'santa teresa', 'bota', 'ysleta', 'usmca', 'nearshoring', 'cross-border', 'borderplex'];

function elPasoRelevance(s: SignalRow): number {
  const text = `${s.title} ${s.evidence || ''} ${s.company || ''}`.toLowerCase();
  let score = 0;
  for (const kw of EP_KEYWORDS) {
    if (text.includes(kw)) score += 20;
  }
  // Industry boost
  if (['logistics', 'manufacturing', 'border-tech'].includes(s.industry)) score += 15;
  if (s.problem_category) score += 10;
  return Math.min(score, 100);
}

// Urgency calculation: deterministic, not AI
function calculateUrgency(s: SignalRow, velocity: number): 'act_now' | 'watch' | 'opportunity' {
  const hoursSinceDiscovery = (Date.now() - new Date(s.discovered_at).getTime()) / 3600000;

  // ACT NOW: high importance + recent + disruption signals
  if (s.importance_score >= 80 && hoursSinceDiscovery < 48) return 'act_now';
  if (s.signal_type === 'regulatory_action' && s.importance_score >= 60) return 'act_now';
  if (s.amount_usd && s.amount_usd > 100_000_000 && hoursSinceDiscovery < 72) return 'act_now';

  // WATCH: emerging trends, moderate importance
  if (velocity > 1.5 || s.importance_score >= 60) return 'watch';
  if (s.signal_type === 'funding_round' || s.signal_type === 'facility_expansion') return 'watch';

  // OPPORTUNITY: everything else worth showing
  return 'opportunity';
}

// ── Cluster signals by theme (group related signals) ─────────────────────────

type SignalCluster = {
  theme: string;
  signals: (SignalRow & { final_score: number })[];
  volume: number;
  velocity: number; // signals per day in this cluster
  avg_importance: number;
  top_companies: string[];
  industries: string[];
};

function clusterSignals(signals: (SignalRow & { final_score: number })[]): SignalCluster[] {
  // Group by industry + signal_type as a proxy for theme
  const groups: Record<string, (SignalRow & { final_score: number })[]> = {};

  for (const s of signals) {
    const key = `${s.industry}::${s.signal_type}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }

  const clusters: SignalCluster[] = [];
  for (const [key, sigs] of Object.entries(groups)) {
    if (sigs.length < 2) continue; // Skip singleton "clusters"
    const [industry, signalType] = key.split('::');

    // Calculate velocity: signals per day
    const timestamps = sigs.map(s => new Date(s.discovered_at).getTime());
    const oldest = Math.min(...timestamps);
    const newest = Math.max(...timestamps);
    const daySpan = Math.max((newest - oldest) / 86400000, 1);
    const velocity = sigs.length / daySpan;

    // Extract companies
    const companies = sigs
      .map(s => s.company)
      .filter((c): c is string => c != null && c.length > 0);
    const uniqueCompanies = [...new Set(companies)].slice(0, 5);

    clusters.push({
      theme: `${industry} / ${signalType.replace(/_/g, ' ')}`,
      signals: sigs.sort((a, b) => b.final_score - a.final_score),
      volume: sigs.length,
      velocity,
      avg_importance: sigs.reduce((sum, s) => sum + s.importance_score, 0) / sigs.length,
      top_companies: uniqueCompanies,
      industries: [...new Set(sigs.map(s => s.industry))],
    });
  }

  return clusters;
}

// ── Final score per signal ───────────────────────────────────────────────────

function computeFinalScore(s: SignalRow, clusterVolume: number, velocity: number): number {
  const volNorm = Math.min(clusterVolume * 5, 100);  // 20 signals = max
  const velNorm = Math.min(velocity * 30, 100);       // 3.3/day = max
  const epNorm = elPasoRelevance(s);
  const srcNorm = sourceQuality(s.source);

  return Math.round(
    0.4 * volNorm +
    0.3 * velNorm +
    0.2 * epNorm +
    0.1 * srcNorm
  );
}

// ── Vendor matching: problem → technology → vendor ───────────────────────────

const TECH_MAP: Record<string, string[]> = {
  logistics:      ['fleet management', 'tms', 'route optimization', 'freight', 'dispatch', 'telematics', 'tracking', 'carrier', 'shipping'],
  manufacturing:  ['automation', 'robotics', 'quality', 'erp', 'mes', 'plc', 'scada', 'cnc', 'assembly'],
  'border-tech':  ['customs', 'compliance', 'brokerage', 'trade', 'clearance', 'cross-border'],
  cybersecurity:  ['security', 'threat', 'vulnerability', 'compliance', 'zero trust'],
  'ai-ml':        ['artificial intelligence', 'machine learning', 'analytics', 'prediction', 'optimization'],
  energy:         ['solar', 'battery', 'grid', 'efficiency', 'renewable'],
};

function matchVendorsDeep(signal: SignalRow, vendors: VendorRow[]): VendorRow[] {
  // Step 1: Get technology keywords for this signal's industry
  const techKeywords = TECH_MAP[signal.industry] || [];

  // Step 2: Extract problem context from signal
  const signalContext = `${signal.title} ${signal.evidence || ''} ${signal.problem_category || ''}`.toLowerCase();

  // Step 3: Score each vendor on technology + context match
  const vendorScores = vendors.map(v => {
    const vendorText = `${v.company_name} ${v.primary_category || ''} ${v.description || ''} ${v.sector || ''}`.toLowerCase();
    let score = 0;

    // Technology keyword match (problem → technology)
    for (const tech of techKeywords) {
      if (vendorText.includes(tech)) score += 3;
    }

    // Direct context match (signal content → vendor)
    const contextWords = signalContext.split(/\s+/).filter(w => w.length > 4);
    for (const w of contextWords) {
      if (vendorText.includes(w)) score += 1;
    }

    // Industry match
    if (v.primary_category?.toLowerCase().includes(signal.industry)) score += 5;
    if (v.sector?.toLowerCase().includes(signal.industry)) score += 3;

    // IKER quality floor
    const iker = v.iker_score || 0;
    if (iker >= 80) score += 4;
    else if (iker >= 60) score += 2;

    return { vendor: v, score, iker };
  });

  return vendorScores
    .filter(vs => vs.score > 0)
    .sort((a, b) => (b.score * 10 + b.iker) - (a.score * 10 + a.iker))
    .slice(0, 3)
    .map(vs => vs.vendor);
}

// ── Decision logging (store inputs + outputs + clusters) ─────────────────────

async function logDecision(
  mode: 'top3' | 'search',
  query: string | null,
  decisions: unknown[],
  signalCount: number,
) {
  try {
    const supabase = createClient();
    await supabase.from('decision_log').insert({
      mode,
      query,
      decisions: JSON.stringify(decisions),
      signal_count: signalCount,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Silent fail — logging should never block the response
  }
}

// ── Sanitize ─────────────────────────────────────────────────────────────────

function sanitize(text: string | null): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── GET /api/decide — Top 3 actionable decisions ─────────────────────────────

export async function GET() {
  const supabase = createClient();
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const [{ data: recentSignals }, { data: allVendors }] = await Promise.all([
    supabase
      .from('intel_signals')
      .select('id, title, signal_type, industry, company, evidence, amount_usd, confidence, importance_score, discovered_at, source, tags, vendor_id, problem_category')
      .gte('discovered_at', since7d)
      .order('importance_score', { ascending: false })
      .limit(500),
    supabase
      .from('vendors')
      .select('id, company_name, primary_category, iker_score, company_url, description, sector')
      .order('iker_score', { ascending: false })
      .limit(100),
  ]);

  const signals = (recentSignals || []) as SignalRow[];
  const vendors = (allVendors || []) as VendorRow[];

  // Filter junk
  const clean = signals
    .filter(s => !isJunk(s.source, s.title))
    .filter(s => s.industry !== 'other' && s.industry !== 'general');

  // Pre-score all signals (without cluster context yet)
  const preScored = clean.map(s => ({
    ...s,
    final_score: s.importance_score + elPasoRelevance(s) * 0.3 + sourceQuality(s.source) * 0.1,
  }));

  // Cluster signals to find volume + velocity
  const clusters = clusterSignals(preScored);

  // Re-score with cluster context
  const clusterMap = new Map<string, SignalCluster>();
  for (const c of clusters) {
    for (const s of c.signals) {
      clusterMap.set(s.id, c);
    }
  }

  const finalScored = preScored.map(s => {
    const cluster = clusterMap.get(s.id);
    const volume = cluster?.volume ?? 1;
    const velocity = cluster?.velocity ?? 0;
    return {
      ...s,
      final_score: computeFinalScore(s, volume, velocity),
      cluster_volume: volume,
      cluster_velocity: velocity,
    };
  }).sort((a, b) => b.final_score - a.final_score);

  // ── TOP 3: Pick by IMPACT, not industry diversity ──────────────────────
  // Deduplicate by title prefix only (avoid near-duplicate headlines)
  const top3: typeof finalScored = [];
  const usedPrefixes: string[] = [];

  for (const s of finalScored) {
    if (top3.length >= 3) break;
    const prefix = s.title.toLowerCase().slice(0, 30);
    if (usedPrefixes.some(p => prefix.startsWith(p.slice(0, 20)) || p.startsWith(prefix.slice(0, 20)))) continue;
    top3.push(s);
    usedPrefixes.push(prefix);
  }

  // Fill if dedup was too aggressive
  for (const s of finalScored) {
    if (top3.length >= 3) break;
    if (top3.some(t => t.id === s.id)) continue;
    top3.push(s);
  }

  // ── Pre-structure for AI (AI only EXPLAINS, doesn't reason) ────────────
  const preStructured = top3.map(signal => {
    const cluster = clusterMap.get(signal.id);
    const matchedVendors = matchVendorsDeep(signal, vendors);
    const urgency = calculateUrgency(signal, signal.cluster_velocity);

    return {
      signal,
      cluster,
      vendors: matchedVendors,
      urgency,
      // Pre-computed causal chain
      cause: sanitize(signal.title),
      effect: signal.industry,
      technologies: TECH_MAP[signal.industry] || [],
    };
  });

  // ── AI call: ONLY explains the pre-structured data ─────────────────────
  type AIExplanation = {
    cause: string;
    effect: string;
    consequence: string;
    action: string[];
    why_el_paso: string;
  };

  let aiExplanations: AIExplanation[] = [];

  if (preStructured.length > 0) {
    const structuredInput = preStructured.map((ps, i) => {
      const s = ps.signal;
      return `Decision ${i + 1}:
CAUSE: ${sanitize(s.title)}
EVIDENCE: ${sanitize(s.evidence)?.slice(0, 300)}
INDUSTRY: ${s.industry}
COMPANY: ${s.company || 'none'}
AMOUNT: ${s.amount_usd ? `$${(s.amount_usd / 1e6).toFixed(1)}M` : 'unknown'}
URGENCY: ${ps.urgency} (pre-calculated)
CLUSTER SIZE: ${ps.cluster?.volume || 1} related signals
CLUSTER VELOCITY: ${ps.cluster?.velocity?.toFixed(1) || '0'} signals/day
MATCHED VENDORS: ${ps.vendors.map(v => `${v.company_name} (IKER: ${v.iker_score || '?'}, ${v.primary_category || 'general'})`).join('; ') || 'none'}
TECH AREA: ${ps.technologies.slice(0, 5).join(', ')}`;
    }).join('\n\n---\n\n');

    try {
      const { result } = await runParallelJsonEnsemble<AIExplanation[]>({
        systemPrompt: `You EXPLAIN pre-analyzed intelligence decisions. You do NOT decide — the system already decided. Your job is to write clear, specific explanations that follow CAUSE → EFFECT → CONSEQUENCE → ACTION structure.

El Paso context: Top US-Mexico trade hub, 4 ports of entry, 300+ maquiladoras in Juárez, major trucking/warehousing/customs hub.

Rules:
- DO NOT change the urgency or vendor selection — those are pre-calculated
- DO explain WHY the cause leads to the effect
- DO name specific companies and actions
- Keep each field to 1-2 sentences max`,
        userPrompt: `Explain each of these ${preStructured.length} pre-analyzed decisions.

For each, return:
1. "cause" — What happened (1 sentence, plain English)
2. "effect" — What this means for logistics operators (1 sentence)
3. "consequence" — What happens next if you don't act (1 sentence)
4. "action" — 2-3 SPECIFIC steps. Name the matched vendors when relevant.
5. "why_el_paso" — 1 sentence, El Paso specific

Return a JSON array. No markdown.

${structuredInput}`,
        temperature: 0.2,
        preferredProviders: ['gemini'],
        budget: { maxProviders: 1, preferLowCostProviders: true },
        parse: (content) => {
          const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          return JSON.parse(cleaned) as AIExplanation[];
        },
      });
      aiExplanations = result;
    } catch (err) {
      console.warn('[decide] AI explanation failed:', err);
    }
  }

  // ── Build response ─────────────────────────────────────────────────────
  const decisions = preStructured.map((ps, i) => {
    const ai = aiExplanations[i];
    const s = ps.signal;

    return {
      rank: i + 1,
      signal_id: s.id,
      title: sanitize(s.title),
      industry: s.industry,
      signal_type: s.signal_type,
      company: s.company,
      amount_usd: s.amount_usd,
      source: s.source,
      discovered_at: s.discovered_at,

      // Transparent scoring
      score: {
        final: s.final_score,
        cluster_volume: ps.cluster?.volume || 1,
        cluster_velocity: +(ps.cluster?.velocity?.toFixed(2) || 0),
        ep_relevance: elPasoRelevance(s),
        source_quality: sourceQuality(s.source),
      },

      // Causal structure: CAUSE → EFFECT → CONSEQUENCE → ACTION
      cause: ai?.cause || sanitize(s.title),
      effect: ai?.effect || sanitize(s.evidence)?.slice(0, 150) || 'Potential impact on supply chain operations.',
      consequence: ai?.consequence || 'Monitor for developments this week.',
      what_to_do: ai?.action || ['Review this signal and assess impact on your operations'],

      // Pre-calculated urgency (NOT from AI)
      urgency: ps.urgency,

      // Vendor match (problem → technology → vendor)
      who_can_help: ps.vendors.map(v => ({
        name: v.company_name,
        category: v.primary_category,
        iker_score: v.iker_score,
        website: v.company_url,
      })),

      why_el_paso: ai?.why_el_paso || 'Impacts El Paso cross-border operations.',
      related_count: ps.cluster?.volume || 1,
    };
  });

  // Log decision (non-blocking)
  logDecision('top3', null, decisions, clean.length);

  return NextResponse.json({
    ok: true,
    mode: 'top3',
    generated_at: new Date().toISOString(),
    decisions,
    total_signals_analyzed: clean.length,
    clusters_found: clusters.length,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
  });
}

// ── POST /api/decide — Search mode ───────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.json() as { problem: string; industry?: string };
  const query = (body.problem || '').trim();
  const userIndustry = body.industry ?? null;

  if (!query || query.length < 3) {
    return NextResponse.json(
      { ok: false, error: 'Describe your problem (at least 3 characters).' },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  const [{ data: textResults }, { data: allVendors }] = await Promise.all([
    supabase
      .from('intel_signals')
      .select('id, title, signal_type, industry, company, evidence, amount_usd, confidence, importance_score, discovered_at, source, tags, vendor_id, problem_category')
      .gte('discovered_at', since30d)
      .or(`title.ilike.%${queryWords[0] || query}%,evidence.ilike.%${queryWords[0] || query}%`)
      .order('importance_score', { ascending: false })
      .limit(200),
    supabase
      .from('vendors')
      .select('id, company_name, primary_category, iker_score, company_url, description, sector')
      .order('iker_score', { ascending: false })
      .limit(100),
  ]);

  let signals = (textResults || []) as SignalRow[];
  const vendors = (allVendors || []) as VendorRow[];

  if (userIndustry) {
    const filtered = signals.filter(s => s.industry === userIndustry);
    if (filtered.length >= 3) signals = filtered;
  }

  // Score by query relevance + impact
  const scored = signals
    .filter(s => !isJunk(s.source, s.title))
    .map(s => {
      const hay = `${s.title} ${s.evidence || ''}`.toLowerCase();
      let relevance = s.importance_score * 0.4;
      for (const w of queryWords) {
        if (hay.includes(w)) relevance += 20;
      }
      relevance += elPasoRelevance(s) * 0.2;
      relevance += sourceQuality(s.source) * 0.1;
      return { ...s, decision_score: Math.round(relevance) };
    })
    .sort((a, b) => b.decision_score - a.decision_score);

  const top3 = scored.slice(0, 3);

  // Match vendors via technology chain
  const industryHint = userIndustry || top3[0]?.industry || 'logistics';
  const techKeywords = TECH_MAP[industryHint] || [];
  const vendorScores = vendors.map(v => {
    const vendorText = `${v.company_name} ${v.primary_category || ''} ${v.description || ''} ${v.sector || ''}`.toLowerCase();
    let score = 0;
    for (const w of queryWords) { if (vendorText.includes(w)) score += 3; }
    for (const tech of techKeywords) { if (vendorText.includes(tech)) score += 2; }
    if (v.primary_category?.toLowerCase().includes(industryHint)) score += 4;
    return { vendor: v, score, iker: v.iker_score || 0 };
  });
  const matchedVendors = vendorScores
    .filter(vs => vs.score > 0 || vs.iker >= 75)
    .sort((a, b) => (b.score * 10 + b.iker) - (a.score * 10 + a.iker))
    .slice(0, 5)
    .map(vs => vs.vendor);

  // Urgency: deterministic
  const urgency = top3.length > 0
    ? calculateUrgency(top3[0], scored.length / 7)
    : 'watch' as const;

  // AI: only explains pre-structured data
  let aiExplanation: { cause: string; effect: string; consequence: string; action: string[]; why_el_paso: string } | null = null;

  if (top3.length > 0) {
    const signalText = top3.map((s, i) =>
      `${i + 1}. [${s.industry}] ${sanitize(s.title)} — ${sanitize(s.evidence)?.slice(0, 150)}`
    ).join('\n');
    const vendorText = matchedVendors.map(v =>
      `${v.company_name} (${v.primary_category || 'general'}, IKER: ${v.iker_score || '?'})`
    ).join(', ');

    try {
      const { result } = await runParallelJsonEnsemble<{ cause: string; effect: string; consequence: string; action: string[]; why_el_paso: string }>({
        systemPrompt: `You EXPLAIN how pre-selected signals relate to a user's problem. You do NOT decide — just explain using CAUSE → EFFECT → CONSEQUENCE → ACTION structure. Be specific. Name companies.`,
        userPrompt: `Problem: "${query}"
Pre-calculated urgency: ${urgency}

Relevant signals:
${signalText}

Matched vendors: ${vendorText || 'none'}

Return ONE JSON object:
1. "cause" — What's happening (1-2 sentences connecting signals to the problem)
2. "effect" — What this means for the operator (1 sentence)
3. "consequence" — What happens if they don't act (1 sentence)
4. "action" — 3-5 specific steps. Name vendors when relevant.
5. "why_el_paso" — 1 sentence

No markdown.`,
        temperature: 0.2,
        preferredProviders: ['gemini'],
        budget: { maxProviders: 1, preferLowCostProviders: true },
        parse: (content) => {
          const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          return JSON.parse(cleaned);
        },
      });
      aiExplanation = result;
    } catch (err) {
      console.warn('[decide] AI search explanation failed:', err);
    }
  }

  const response = {
    ok: true,
    mode: 'search' as const,
    query,
    industry: userIndustry,
    generated_at: new Date().toISOString(),

    // Causal structure
    cause: aiExplanation?.cause || (top3.length > 0
      ? `Found ${top3.length} relevant signals for "${query}".`
      : `No recent signals match "${query}". Try broader terms.`),
    effect: aiExplanation?.effect || 'Review these signals to assess potential impact.',
    consequence: aiExplanation?.consequence || 'Without action, you may miss emerging opportunities or threats.',
    what_to_do: aiExplanation?.action || ['Research vendors in this space', 'Check industry publications'],
    urgency,
    why_el_paso: aiExplanation?.why_el_paso || 'Impacts El Paso-Juárez trade corridor.',

    // Supporting data
    signals: top3.map(s => ({
      id: s.id,
      title: sanitize(s.title),
      industry: s.industry,
      company: s.company,
      source: s.source,
      discovered_at: s.discovered_at,
      score: s.decision_score,
    })),

    who_can_help: matchedVendors.map(v => ({
      name: v.company_name,
      category: v.primary_category,
      iker_score: v.iker_score,
      website: v.company_url,
    })),

    total_signals_searched: scored.length,
  };

  // Log decision (non-blocking)
  logDecision('search', query, [response], scored.length);

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'public, max-age=120' },
  });
}
