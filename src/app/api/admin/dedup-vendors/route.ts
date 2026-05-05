// POST /api/admin/dedup-vendors
// Marks lower-quality copies of any vendor row sharing a normalized URL as
// status='duplicate'. Idempotent — safe to re-run; the dedup decision is
// recomputed every call. Vendors without a URL are not affected.
//
// Quality ranking inside each URL group:
//   1. Has a non-empty description
//   2. Higher iker_score
//   3. Has tags
//   4. Has hq_country
//   5. More recent created_at (tiebreaker)
//
// Protected by CRON_SECRET (header: x-cron-secret OR Authorization: Bearer ...).

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { requireCronSecret } from '@/lib/http/cron-auth';
import { normalizeVendorUrl } from '@/lib/vendors/normalize-url';
import { PRIVATE_ACCESS_CODE } from '@/lib/privateAccess';

function authorize(headers: Headers): { ok: true } | { ok: false; status: number; message: string } {
  if (headers.get('x-access-code') === PRIVATE_ACCESS_CODE) return { ok: true };
  return requireCronSecret(headers);
}

type Row = {
  id: string;
  company_url: string | null;
  description: string | null;
  iker_score: number | null;
  tags: string[] | null;
  hq_country: string | null;
  created_at: string | null;
  status: string | null;
};

function qualityRank(r: Row): number {
  // Higher = better. Used to pick the keeper inside a duplicate group.
  let n = 0;
  if (r.description && r.description.trim()) n += 1_000_000;
  n += Math.min(Math.max(r.iker_score ?? 0, 0), 999) * 1000;
  if (r.tags && r.tags.length > 0) n += 100;
  if (r.hq_country) n += 10;
  return n;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = authorize(request.headers);
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase not configured' }, { status: 503 });
  }

  const supabase = getSupabaseClient({ admin: true });
  const start = Date.now();

  // Pull every vendor that has a URL. Page in 1000s — Supabase default page is 1000.
  const PAGE = 1000;
  let from = 0;
  const rows: Row[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from('vendors')
      .select('id, company_url, description, iker_score, tags, hq_country, created_at, status')
      .not('company_url', 'is', null)
      .neq('company_url', '')
      .not('sector', 'is', null)
      .neq('sector', '')
      .range(from, from + PAGE - 1);
    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  // Group by normalized URL.
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const norm = normalizeVendorUrl(r.company_url);
    if (!norm) continue;
    const arr = groups.get(norm) ?? [];
    arr.push(r);
    groups.set(norm, arr);
  }

  // For each group with >1 member, pick the winner and collect loser ids.
  const losers: string[] = [];
  const winnersToRestore: string[] = []; // rows currently 'duplicate' that should be promoted back
  let groupsWithDupes = 0;
  for (const group of groups.values()) {
    if (group.length < 2) {
      // Single-row group — if it was previously 'duplicate', clear that.
      if (group[0].status === 'duplicate') winnersToRestore.push(group[0].id);
      continue;
    }
    groupsWithDupes += 1;
    group.sort((a, b) => {
      const dq = qualityRank(b) - qualityRank(a);
      if (dq !== 0) return dq;
      const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bd - ad;
    });
    const [winner, ...rest] = group;
    if (winner.status === 'duplicate') winnersToRestore.push(winner.id);
    for (const loser of rest) {
      if (loser.status !== 'duplicate') losers.push(loser.id);
    }
  }

  // Apply updates in batches of 200 (.in(...) with very large arrays is fragile).
  const BATCH = 200;
  let markedDuplicate = 0;
  for (let i = 0; i < losers.length; i += BATCH) {
    const slice = losers.slice(i, i + BATCH);
    const { error, count } = await supabase
      .from('vendors')
      .update({ status: 'duplicate' }, { count: 'exact' })
      .in('id', slice);
    if (error) {
      return NextResponse.json({
        ok: false,
        message: `Failed marking duplicates: ${error.message}`,
        markedDuplicate,
      }, { status: 500 });
    }
    markedDuplicate += count ?? slice.length;
  }

  // Restore any winners-only rows that were stuck at 'duplicate'. Use 'discovered'
  // (the default for the vast majority of rows) — never overwrite 'active'/'approved'.
  let restored = 0;
  for (let i = 0; i < winnersToRestore.length; i += BATCH) {
    const slice = winnersToRestore.slice(i, i + BATCH);
    const { error, count } = await supabase
      .from('vendors')
      .update({ status: 'discovered' }, { count: 'exact' })
      .in('id', slice)
      .eq('status', 'duplicate');
    if (error) {
      return NextResponse.json({
        ok: false,
        message: `Failed restoring winners: ${error.message}`,
        markedDuplicate,
        restored,
      }, { status: 500 });
    }
    restored += count ?? 0;
  }

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - start,
    totalVendorsWithUrl: rows.length,
    uniqueUrls: groups.size,
    groupsWithDuplicates: groupsWithDupes,
    markedDuplicate,
    restored,
  });
}

// GET is allowed for convenience (cron + manual browser hit). Same logic.
export async function GET(request: NextRequest): Promise<NextResponse> {
  return POST(request);
}
