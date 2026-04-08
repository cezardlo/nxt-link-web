export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';
import { analyzeCausality, type CausalAnalysis } from '@/lib/causal-engine';


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
const TIER1_SOURCES = ['freightwaves', 'supply chain dive', 'reuters', 'bloomberg', 'associated press', 'journal of commerce', 'american shipper', 'defense one', 'breaking defense', 'c4isrnet', 'techcrunch', 'the verge', 'wired', 'mit technology review', 'dark reading', 'krebs on security', 'cyberscoop'];
const TIER2_SOURCES = ['transport topics', 'the loadstar', 'commercial carrier journal', 'fleet owner', 'trucking info', 'logistics management', 'borderreport'];

function signalTypeQuality(signalType: string | null): number {
  if (!signalType) return 30;
  const HIGH = ['technology', 'product_launch', 'patent_filing', 'funding_round', 'contract_award', 'partnership', 'market_expansion'];
  const LOW  = ['connection', 'general', 'market_shift'];
  if (HIGH.includes(signalType)) return 95;
  if (LOW.includes(signalType)) return 15;
  return 50;
}

function signalTitleExclusion(title: string): boolean {
  const lower = title.toLowerCase();
  const JUNK_PATTERNS = ['drug', 'smuggl', 'crash', 'arrest', 'shooting', 'murder', 'homicide', 'theft', 'stolen', 'accident', 'fire kills', 'death toll', 'obituary'];
  return JUNK_PATTERNS.some(p => lower.includes(p));
}

function sourceQuality(source: string | null): number {
  if (!source) return 20;
  const lower = source.toLowerCase();
  if (TIER1_SOURCES.some(s => lower.includes(s))) return 100;
  if (TIER2_SOURCES.some(s => lower.includes(s))) return 75;
  return 30;
}

// El Paso relevance: 0-100
const EP_KEYWORDS = ['el paso', 'juarez', 'juárez', 'border', 'cbp', 'customs', 'maquiladora', 'fort bliss', 'santa teresa', 'bota', 'ysleta', 'usmca', 'nearshoring', 'cross-border', 'borderplex', 'utep', 'starbase', 'space valley', 'army', 'military', '1st armored', 'thaad'];

function elPasoRelevance(s: SignalRow): number {
  const text = `${s.title} ${s.evidence || ''} ${s.company || ''}`.toLowerCase();
  let score = 0;
  for (const kw of EP_KEYWORDS) {
    if (text.includes(kw)) score += 20;
  }
  // Industry boost
  if (['logistics', 'manufacturing', 'border-tech', 'defense', 'ai-ml', 'cybersecurity', 'energy', 'space'].includes(s.industry)) score += 15;
  if (s.problem_category) score += 10;
  return Math.min(score, 100);
}

// Urgency now handled by causal-engine.ts (analyzeCausality)

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
  logistics:      ['fleet management', 'tms', 'route optimization', 'freight', 'dispatch', 'telematics', 'tracking', 'carrier', 'shipping', 'warehouse', 'fulfillment', 'last mile', 'delivery', 'trucking', 'ltl', 'drayage'],
  manufacturing:  ['automation', 'robotics', 'quality', 'erp', 'mes', 'plc', 'scada', 'cnc', 'assembly', 'fabrication', 'production', 'maquiladora'],
  'border-tech':  ['customs', 'compliance', 'brokerage', 'trade', 'clearance', 'cross-border', 'cbp', 'usmca', 'tariff', 'import', 'export'],
  cybersecurity:  ['security', 'threat', 'vulnerability', 'compliance', 'zero trust', 'endpoint', 'firewall', 'soc'],
  'ai-ml':        ['artificial intelligence', 'machine learning', 'analytics', 'prediction', 'optimization', 'computer vision', 'nlp'],
  energy:         ['solar', 'battery', 'grid', 'efficiency', 'renewable', 'ev', 'electric vehicle', 'charging'],
  defense:        ['defense', 'military', 'dod', 'army', 'missile', 'radar', 'c4isr', 'fort bliss'],
  transportation: ['trucking', 'fleet', 'driver', 'cdl', 'freight', 'intermodal', 'rail'],
  tech:           ['software', 'saas', 'cloud', 'platform', 'api', 'data', 'iot'],
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
    .filter(s => !signalTitleExclusion(s.title))
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

  // ── Pre-structure with CAUSAL ENGINE (loads stored maps from DB) ─────────
  const preStructured = await Promise.all(top3.map(async signal => {
    const cluster = clusterMap.get(signal.id);
    const matchedVendors = matchVendorsDeep(signal, vendors);

    // Pattern-match signal → stored causal map → load effects + technologies
    const causal = await analyzeCausality(
      signal.id,
      signal.title,
      signal.evidence || '',
      signal.importance_score,
      signal.discovered_at,
      matchedVendors.map(v => ({ id: v.id, name: v.company_name })),
    );

    return {
      signal,
      cluster,
      vendors: matchedVendors,
      urgency: causal.urgency,
      causal,
    };
  }));

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
      const c = ps.causal;
      return `Decision ${i + 1}:
SIGNAL: ${sanitize(s.title)}
EVIDENCE: ${sanitize(s.evidence)?.slice(0, 300)}
INDUSTRY: ${s.industry}
COMPANY: ${s.company || 'none'}
AMOUNT: ${s.amount_usd ? `$${(s.amount_usd / 1e6).toFixed(1)}M` : 'unknown'}
MATCHED PROBLEM: ${c.matched_problem || 'unknown'}
EVENT TYPE: ${c.event_type} (confidence: ${(c.event_confidence * 100).toFixed(0)}%)
CAUSES: ${c.causes.slice(0, 4).join(', ') || 'unknown'}
EFFECTS: ${c.effects.map(e => `${e.label} [${e.severity}, ${e.timeframe}]`).join('; ')}
SOLUTIONS: ${c.solutions.slice(0, 4).join(', ') || 'general monitoring'}
URGENCY: ${ps.urgency} (pre-calculated)
TECHNOLOGIES: ${c.technologies.slice(0, 6).join(', ')}
CLUSTER SIZE: ${ps.cluster?.volume || 1} related signals
VENDORS: ${ps.vendors.map(v => `${v.company_name} (IKER: ${v.iker_score || '?'}, ${v.primary_category || 'general'})`).join('; ') || 'none'}`;
    }).join('\n\n---\n\n');

    try {
      const { result } = await runParallelJsonEnsemble<AIExplanation[]>({
        systemPrompt: `You are a Jarvis-style global intelligence analyst. You think in patterns, directions, and strategic implications — not events.

Your job is NOT to describe what happened. Your job is to explain what it MEANS, what pattern it reveals, and where the world is heading because of it.

Global context you always consider:
- El Paso / Borderplex: #1 US-Mexico trade corridor ($126B annually), Fort Bliss (Army, Space, Defense), UTEP research, SpaceX Starbase nearby, 300+ Juárez maquiladoras, Space Valley positioning
- Every signal is part of a larger pattern — find that pattern
- Think in ACCELERATION (what's speeding up), CONVERGENCE (what sectors are merging), EMERGENCE (what's about to appear)

Rules:
- Never say "X happened" — say "X indicates a shift toward..."
- Never describe the news — explain the strategic implication
- Connect dots: why does this signal connect to 2-3 other things happening
- Think direction: is this sector accelerating, slowing, or pivoting?
- Be sharp, specific, no filler — like a McKinsey partner briefing a CEO`,
        userPrompt: `Explain each of these ${preStructured.length} pre-analyzed decisions.

For each signal, return:
1. "cause" — The strategic pattern this signal is part of (1 sentence — not what happened, but what it indicates)
2. "effect" — What shift this accelerates or reveals (1 sentence — where is this sector heading?)
3. "consequence" — What emerges in 30-90 days if this pattern holds (1 sentence — forward-looking)
4. "action" — 2-3 specific moves for an El Paso operator. Name vendors when relevant.
5. "why_el_paso" — 1 sentence: why the Borderplex, Fort Bliss, or UTEP ecosystem is directly in this pattern

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

      // Causal analysis (from stored maps in DB, NOT AI)
      causal: {
        matched_problem: ps.causal.matched_problem,
        event_type: ps.causal.event_type,
        event_confidence: ps.causal.event_confidence,
        causes: ps.causal.causes,
        effects: ps.causal.effects.map(e => ({
          label: e.label,
          severity: e.severity,
          timeframe: e.timeframe,
        })),
        solutions: ps.causal.solutions,
        technologies: ps.causal.technologies.slice(0, 8),
      },

      // Vendor match (problem → technology → vendor)
      who_can_help: ps.vendors.map(v => ({
        name: v.company_name,
        category: v.primary_category,
        iker_score: v.iker_score,
        website: v.company_url,
      })),

      // Graph data for visualization
      graph: ps.causal.graph,

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
    const searchWords = queryWords.filter(w => w.length > 3).slice(0, 6);
    const orClauses = searchWords.length > 0
      ? searchWords.flatMap(w => [`title.ilike.%${w}%`, `evidence.ilike.%${w}%`]).join(',')
      : `title.ilike.%${queryWords[0] || query}%,evidence.ilike.%${queryWords[0] || query}%`;

  const [{ data: textResults }, { data: allVendors }] = await Promise.all([
    supabase
      .from('intel_signals')
      .select('id, title, signal_type, industry, company, evidence, amount_usd, confidence, importance_score, discovered_at, source, tags, vendor_id, problem_category')
      .gte('discovered_at', since30d)
      .or(orClauses)
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
    .filter(s => !signalTitleExclusion(s.title))
    .map(s => {
      const hay = `${s.title} ${s.evidence || ''} ${s.problem_category || ''} ${s.company || ''}`.toLowerCase();
      let relevance = 0;
      let matchCount = 0;
      const titleLow = s.title.toLowerCase();
      for (const w of queryWords) {
        if (titleLow.includes(w)) { relevance += 35; matchCount++; }
        else if (hay.includes(w)) { relevance += 20; matchCount++; }
      }
      if (matchCount >= 3) relevance += 40;
      else if (matchCount >= 2) relevance += 20;
      if (matchCount === 0) relevance -= 50;
      relevance += s.importance_score * 0.25;
      relevance += elPasoRelevance(s) * 0.15;
      relevance += sourceQuality(s.source) * 0.3;
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

  // Causal analysis on top signal
  const causal: CausalAnalysis | null = top3.length > 0
    ? await analyzeCausality(
        top3[0].id,
        top3[0].title,
        top3[0].evidence || '',
        top3[0].importance_score,
        top3[0].discovered_at,
        matchedVendors.map(v => ({ id: v.id, name: v.company_name })),
      )
    : null;

  const urgency = causal?.urgency || 'watch';

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

    // Causal analysis
    causal: causal ? {
      event_type: causal.event_type,
      event_confidence: causal.event_confidence,
      effects: causal.effects.map(e => ({
        label: e.label,
        severity: e.severity,
        timeframe: e.timeframe,
      })),
      technologies: causal.technologies.slice(0, 6),
    } : null,

    graph: causal?.graph || null,

    total_signals_searched: scored.length,
  };

  // Log decision (non-blocking)
  logDecision('search', query, [response], scored.length);

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
