// POST /api/agents/auto-discover
// Auto-discovery engine: scans intel_signals for company names mentioned 3+ times
// from 2+ distinct sources that don't exist in the knowledge graph, then creates them.
// This is how NXT LINK finds new companies without anyone telling it to.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getDb, isSupabaseConfigured } from '@/db/client';
import { upsertEntity, resolveEntity } from '@/db/queries/knowledge-graph';
import { NXT_ENTITIES } from '@/lib/intelligence/nxt-entities';

export const maxDuration = 30;

// All known entity IDs/names for dedup check
const KNOWN_NAMES = new Set(NXT_ENTITIES.map(e => e.name.toLowerCase()));

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase not configured' }, { status: 503 });
  }

  const db = getDb();

  // 1. Get recent intel signals (last 7 days)
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: signals, error } = await db
    .from('intel_signals')
    .select('company, source, industry')
    .not('company', 'is', null)
    .gte('discovered_at', since);

  if (error || !signals) {
    return NextResponse.json({ ok: false, message: 'Failed to fetch signals' }, { status: 500 });
  }

  // 2. Count mentions per company + collect sources
  const companyData = new Map<string, { count: number; sources: Set<string>; industries: string[] }>();

  for (const sig of signals as Array<{ company: string | null; source: string | null; industry: string | null }>) {
    if (!sig.company) continue;
    const name = sig.company.trim();
    if (name.length < 3 || name.length > 80) continue;

    const existing = companyData.get(name) ?? { count: 0, sources: new Set<string>(), industries: [] };
    existing.count++;
    if (sig.source) existing.sources.add(sig.source);
    if (sig.industry) existing.industries.push(sig.industry);
    companyData.set(name, existing);
  }

  // 3. Filter: mentioned 3+ times from 2+ sources AND not already known
  const candidates = Array.from(companyData.entries() as Iterable<[string, { count: number; sources: Set<string>; industries: string[] }]>)
    .filter(([name, data]) =>
      data.count >= 3 &&
      data.sources.size >= 2 &&
      !KNOWN_NAMES.has(name.toLowerCase()),
    )
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20); // Process top 20 per run

  // 4. Check which ones don't exist in knowledge graph yet
  const created: string[] = [];
  const skipped: string[] = [];

  for (const [name, data] of candidates) {
    const slug = toSlug(name);

    // Check if already in knowledge graph
    const existing = await resolveEntity(slug, 'company').catch(() => null);
    if (existing) {
      skipped.push(name);
      continue;
    }

    // Determine best industry from signals
    const industryCounts = new Map<string, number>();
    for (const ind of data.industries) {
      industryCounts.set(ind, (industryCounts.get(ind) ?? 0) + 1);
    }
    const topIndustry = Array.from(industryCounts.entries() as Iterable<[string, number]>)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'General';

    // Auto-create entity
    const id = await upsertEntity({
      entity_type: 'company',
      name,
      slug,
      description: `Auto-discovered via ${data.count} signal mentions from ${data.sources.size} sources`,
      metadata: {
        auto_discovered: true,
        mention_count: data.count,
        source_count: data.sources.size,
        industry: topIndustry,
        iker_score: 40, // Default conservative score for new entities
        discovered_at: new Date().toISOString(),
      },
    }).catch(() => null);

    if (id) {
      created.push(name);
      KNOWN_NAMES.add(name.toLowerCase()); // Prevent re-discovery this run
    }
  }

  return NextResponse.json({
    ok: true,
    signals_scanned: signals.length,
    candidates_found: candidates.length,
    entities_created: created.length,
    entities_skipped: skipped.length,
    created,
    timestamp: new Date().toISOString(),
  });
}
