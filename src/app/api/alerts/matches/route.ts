// GET  /api/alerts/matches?unread=true&limit=50  — get matched alerts
// POST /api/alerts/matches/scan                  — scan latest signals against all rules
// PATCH /api/alerts/matches?id=xxx               — mark as read

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getDb, isSupabaseConfigured } from '@/db/client';
import { getIntelSignals } from '@/db/queries/intel-signals';


type AlertRule = {
  id: string;
  keyword: string;
  sector: string | null;
  signal_types: string[];
  min_importance: number;
  enabled: boolean;
};

type IntelSignalLike = {
  id: string;
  title: string;
  signal_type: string;
  company: string | null;
  industry: string;
  importance_score: number;
};

// ─── GET — list recent alert matches ──────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get('unread') === 'true';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, matches: [], source: 'local' });
  }

  const db = getDb();
  let query = db
    .from('alert_matches')
    .select('*, alert_rules(keyword, sector)')
    .order('matched_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) query = query.eq('read', false);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, matches: data ?? [], count: data?.length ?? 0 });
}

// ─── PATCH — mark matches as read ─────────────────────────────────────────────

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true });

  const db = getDb({ admin: true });

  if (id) {
    await db.from('alert_matches').update({ read: true }).eq('id', id);
  } else {
    // Mark all as read
    await db.from('alert_matches').update({ read: true }).eq('read', false);
  }

  return NextResponse.json({ ok: true });
}

// ─── POST — scan recent signals against all active alert rules ────────────────

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase not configured' }, { status: 503 });
  }

  const db = getDb({ admin: true });

  // Load all enabled alert rules
  const { data: rules, error: rulesErr } = await db
    .from('alert_rules')
    .select('id, keyword, sector, signal_types, min_importance, enabled')
    .eq('enabled', true);

  if (rulesErr || !rules || rules.length === 0) {
    return NextResponse.json({ ok: true, matched: 0, message: 'No active alert rules' });
  }

  // Load recent signals (last 24h)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const signals = await getIntelSignals({ limit: 500, since });

  if (signals.length === 0) {
    return NextResponse.json({ ok: true, matched: 0, message: 'No recent signals' });
  }

  // Check existing matches to avoid duplicates
  const { data: existingMatches } = await db
    .from('alert_matches')
    .select('signal_id, rule_id')
    .gte('matched_at', since);

  const alreadyMatched = new Set(
    (existingMatches ?? []).map((m: { signal_id: string; rule_id: string }) => `${m.rule_id}:${m.signal_id}`)
  );

  const newMatches: Array<{
    rule_id: string;
    signal_id: string;
    signal_title: string;
    signal_type: string;
    company: string | null;
    industry: string;
    importance: number;
  }> = [];

  for (const rule of rules as AlertRule[]) {
    const keyword = rule.keyword.toLowerCase();

    for (const sig of signals as IntelSignalLike[]) {
      const dedupKey = `${rule.id}:${sig.id}`;
      if (alreadyMatched.has(dedupKey)) continue;

      // Check importance threshold
      if (sig.importance_score < rule.min_importance) continue;

      // Check signal type filter
      if (rule.signal_types.length > 0 && !rule.signal_types.includes(sig.signal_type)) continue;

      // Check sector filter
      if (rule.sector && sig.industry.toLowerCase() !== rule.sector.toLowerCase()) continue;

      // Check keyword match (title OR company)
      const titleMatch = sig.title.toLowerCase().includes(keyword);
      const companyMatch = (sig.company ?? '').toLowerCase().includes(keyword);
      if (!titleMatch && !companyMatch) continue;

      newMatches.push({
        rule_id: rule.id,
        signal_id: sig.id,
        signal_title: sig.title,
        signal_type: sig.signal_type,
        company: sig.company,
        industry: sig.industry,
        importance: sig.importance_score,
      });

      alreadyMatched.add(dedupKey);
    }
  }

  if (newMatches.length > 0) {
    await db.from('alert_matches').insert(newMatches);
  }

  return NextResponse.json({
    ok: true,
    rules_checked: rules.length,
    signals_scanned: signals.length,
    matched: newMatches.length,
    timestamp: new Date().toISOString(),
  });
}
