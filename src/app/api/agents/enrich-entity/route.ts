// POST /api/agents/enrich-entity
// Company enrichment agent: finds entities with 5+ signals in 24h that
// haven't been enriched yet, then uses Gemini to build a profile summary,
// updates the knowledge graph entity with enriched metadata.

import { NextResponse } from 'next/server';
import { getDb, isSupabaseConfigured, upsertEntity, getEntityBySlug } from '@/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 55;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const SPIKE_THRESHOLD = 5;   // signals in 24h to trigger enrichment
const MAX_PER_RUN = 10;      // max companies to enrich per run

type SignalRow = {
  company: string;
  title: string;
  industry: string | null;
  signal_type: string | null;
  evidence: string | null;
};

type EnrichmentResult = {
  company: string;
  enriched: boolean;
  reason?: string;
};

async function callGemini(prompt: string): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
        }),
        signal: AbortSignal.timeout(20_000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase not configured' }, { status: 503 });
  }

  const db = getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // 1. Find companies with 5+ signals in last 24h
  const { data: signals, error } = await db
    .from('intel_signals')
    .select('company, title, industry, signal_type, evidence')
    .not('company', 'is', null)
    .gte('discovered_at', since);

  if (error || !signals) {
    return NextResponse.json({ ok: false, message: 'Failed to fetch signals' }, { status: 500 });
  }

  // Group by company
  const companySignals = new Map<string, SignalRow[]>();
  for (const s of signals as SignalRow[]) {
    if (!s.company) continue;
    const name = s.company.trim();
    const existing = companySignals.get(name) ?? [];
    existing.push(s);
    companySignals.set(name, existing);
  }

  // Filter to spike threshold, sort by signal count
  const spikes = Array.from(companySignals.entries() as Iterable<[string, SignalRow[]]>)
    .filter(([, rows]) => rows.length >= SPIKE_THRESHOLD)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, MAX_PER_RUN);

  const results: EnrichmentResult[] = [];

  for (const [company, rows] of spikes) {
    const slug = toSlug(company);

    // Check if already has a rich description in knowledge graph
    const existing = await getEntityBySlug(slug).catch(() => null);
    if (existing?.description && existing.description.length > 100) {
      results.push({ company, enriched: false, reason: 'already_enriched' });
      continue;
    }

    // Build context from recent signals for Gemini
    const signalSummary = rows.slice(0, 8).map(s =>
      `- [${s.signal_type ?? 'signal'}] ${s.title}${s.evidence ? `: ${s.evidence.slice(0, 100)}` : ''}`
    ).join('\n');

    const topIndustry = rows.find(r => r.industry)?.industry ?? 'Technology';

    const prompt = `You are a technology intelligence analyst. Based on the following recent news signals about "${company}", write a 2-3 sentence company description for an intelligence platform. Be specific about what the company does, what sector it's in, and why it matters. Do not use filler phrases like "leading" or "innovative". Be factual.

Recent signals about ${company} (${topIndustry}):
${signalSummary}

Write only the description, no headings or labels:`;

    const description = await callGemini(prompt);

    if (!description || description.length < 30) {
      results.push({ company, enriched: false, reason: 'gemini_failed' });
      continue;
    }

    // Determine industry distribution for IKER boost
    const industryCounts = new Map<string, number>();
    for (const r of rows) {
      if (r.industry) industryCounts.set(r.industry, (industryCounts.get(r.industry) ?? 0) + 1);
    }

    // Signal type diversity — more types = higher score boost
    const signalTypes = new Set(rows.map(r => r.signal_type).filter(Boolean));
    const ikerBoost = Math.min(signalTypes.size * 3, 15); // up to +15 for diverse signals

    await upsertEntity({
      entity_type: 'company',
      name: company,
      slug,
      description,
      metadata: {
        industry: topIndustry,
        signal_count_24h: rows.length,
        signal_types: Array.from(signalTypes as Iterable<string>),
        iker_score: Math.min(95, 50 + ikerBoost + Math.min(rows.length * 2, 20)),
        enriched_at: new Date().toISOString(),
        enriched_by: 'gemini-enrich-agent',
      },
    });

    results.push({ company, enriched: true });
  }

  const enriched = results.filter(r => r.enriched).length;

  return NextResponse.json({
    ok: true,
    companies_checked: spikes.length,
    enriched,
    skipped: results.length - enriched,
    results,
    timestamp: new Date().toISOString(),
  });
}
