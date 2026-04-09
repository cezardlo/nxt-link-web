export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

// Canonical industry groups — merge messy DB values into clean buckets
const CANONICAL: Record<string, string> = {
  'ai-ml': 'ai-ml', 'artificial intelligence': 'ai-ml',
  'defense': 'defense', 'defence': 'defense', 'military': 'defense',
  'logistics': 'logistics', 'freight': 'logistics', 'shipping': 'logistics', 'trucking': 'logistics', 'transport': 'logistics', 'transportation': 'logistics',
  'manufacturing': 'manufacturing',
  'robotics': 'robotics', 'autonomous': 'robotics',
  'border-tech': 'border-tech',
  'finance': 'finance', 'fintech': 'finance', 'banking': 'finance', 'venture': 'finance',
  'energy': 'energy', 'ev': 'energy',
  'cybersecurity': 'cybersecurity', 'security': 'cybersecurity',
  'space': 'space', 'aerospace': 'space', 'aviation': 'space',
  'healthcare': 'healthcare', 'pharmaceutical': 'healthcare', 'pharmaceuticals': 'healthcare', 'biotech': 'healthcare',
  'government': 'government',
  'automotive': 'automotive',
  'education': 'education',
  'construction': 'construction',
  'retail': 'retail',
};

const SECTOR_META: Record<string, { label: string; emoji: string; slug: string }> = {
  'ai-ml':         { label: 'AI / ML',      emoji: '🤖', slug: 'ai-ml' },
  'defense':       { label: 'Defense',       emoji: '🛡️', slug: 'defense' },
  'logistics':     { label: 'Logistics',     emoji: '🚚', slug: 'logistics' },
  'manufacturing': { label: 'Manufacturing', emoji: '🏭', slug: 'manufacturing' },
  'robotics':      { label: 'Robotics',      emoji: '🦾', slug: 'robotics' },
  'border-tech':   { label: 'Border Tech',   emoji: '🌉', slug: 'border-tech' },
  'finance':       { label: 'Finance',       emoji: '💹', slug: 'finance' },
  'energy':        { label: 'Energy',        emoji: '⚡', slug: 'energy' },
  'cybersecurity': { label: 'Cybersecurity', emoji: '🔐', slug: 'cybersecurity' },
  'space':         { label: 'Space',         emoji: '🚀', slug: 'space' },
  'healthcare':    { label: 'Healthcare',    emoji: '🏥', slug: 'healthcare' },
  'government':    { label: 'Government',    emoji: '🏛️', slug: 'government' },
  'automotive':    { label: 'Automotive',    emoji: '🚗', slug: 'automotive' },
  'education':     { label: 'Education',     emoji: '🎓', slug: 'education' },
  'construction':  { label: 'Construction',  emoji: '🏗️', slug: 'construction' },
  'retail':        { label: 'Retail',        emoji: '🛒', slug: 'retail' },
};

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'DB not configured' });
  }

  const db = createClient();

  const { data, error } = await db
    .from('intel_signals')
    .select('industry, direction, el_paso_score')
    .eq('is_noise', false);

  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message });
  }

  // Group into canonical buckets
  const buckets: Record<string, {
    total: number; rising: number; falling: number; emerging: number; disrupting: number; stable: number; ep_direct: number; ep_relevant: number;
  }> = {};

  for (const row of data) {
    const raw = (row.industry ?? '').toLowerCase().trim();
    const canonical = CANONICAL[raw] ?? null;
    if (!canonical) continue;

    if (!buckets[canonical]) {
      buckets[canonical] = { total: 0, rising: 0, falling: 0, emerging: 0, disrupting: 0, stable: 0, ep_direct: 0, ep_relevant: 0 };
    }
    const b = buckets[canonical];
    b.total++;
    const dir = row.direction as string ?? 'stable';
    if (dir in b) (b as any)[dir]++;
    if ((row.el_paso_score ?? 0) >= 60) b.ep_direct++;
    else if ((row.el_paso_score ?? 0) >= 25) b.ep_relevant++;
  }

  // Build treemap nodes
  const nodes = Object.entries(buckets)
    .filter(([, b]) => b.total >= 5)
    .map(([industry, b]) => {
      const meta = SECTOR_META[industry] ?? { label: industry, emoji: '📊', slug: industry };
      const dominant = (['rising', 'emerging', 'disrupting', 'falling'] as const)
        .reduce((best, d) => b[d] > b[best] ? d : best, 'rising' as 'rising' | 'emerging' | 'disrupting' | 'falling');
      const dominantDir = b[dominant] > 0 ? dominant : 'stable';

      return {
        id: industry,
        label: meta.label,
        emoji: meta.emoji,
        slug: meta.slug,
        value: b.total,
        rising: b.rising,
        falling: b.falling,
        emerging: b.emerging,
        disrupting: b.disrupting,
        stable: b.stable,
        ep_direct: b.ep_direct,
        ep_relevant: b.ep_relevant,
        dominant_direction: dominantDir,
        momentum_pct: Math.round(((b.rising + b.emerging + b.disrupting) / Math.max(1, b.total)) * 100),
      };
    })
    .sort((a, b) => b.value - a.value);

  return NextResponse.json({
    ok: true,
    total_signals: data.length,
    nodes,
    generated_at: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
}
