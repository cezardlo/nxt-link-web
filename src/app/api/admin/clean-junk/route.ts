// POST /api/admin/clean-junk
// Marks pre-existing scraped rows (source != 'yc') as status='junk' when
// their company_name looks like page chrome / sponsor labels / mid-sentence
// text rather than a real vendor. Only touches rows currently in the
// 'discovered' or null status; never overwrites 'active', 'approved',
// 'duplicate', or 'junk'. Idempotent.
//
// Protected by CRON_SECRET (header: x-cron-secret OR Authorization: Bearer ...)
// or by x-access-code header matching PRIVATE_ACCESS_CODE.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, hasSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/client';
import { requireCronSecret } from '@/lib/http/cron-auth';
import { PRIVATE_ACCESS_CODE } from '@/lib/privateAccess';
import { isJunkVendorName, isJunkDescription, decodeHtmlEntities } from '@/lib/vendors/junk-detector';

function authorize(headers: Headers): { ok: true } | { ok: false; status: number; message: string } {
  if (headers.get('x-access-code') === PRIVATE_ACCESS_CODE) return { ok: true };
  return requireCronSecret(headers);
}

type Row = {
  id: string;
  company_name: string | null;
  description: string | null;
  source: string | null;
  status: string | null;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = authorize(request.headers);
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase not configured' }, { status: 503 });
  }
  if (!hasSupabaseAdmin()) {
    return NextResponse.json({
      ok: false,
      message: 'SUPABASE_SERVICE_ROLE_KEY is not set in Vercel. Junk cleanup needs UPDATE access on the vendors table.',
    }, { status: 503 });
  }

  const supabase = getSupabaseClient({ admin: true });
  const start = Date.now();

  // Pull every candidate row in pages.
  const PAGE = 1000;
  let from = 0;
  const candidates: Row[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from('vendors')
      .select('id, company_name, description, source, status')
      .range(from, from + PAGE - 1);
    if (error) {
      return NextResponse.json({ ok: false, message: `Reading vendors failed: ${error.message}` }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    candidates.push(...(data as Row[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  // Filter: never touch YC, never overwrite an explicit non-default status.
  const PROTECTED_STATUSES = new Set(['active', 'approved', 'duplicate', 'junk']);
  const ids: string[] = [];
  // Description fixes — collect (id → new description). null = blank it.
  const descPatches: Array<{ id: string; description: string | null }> = [];
  let inspected = 0;
  let skippedYc = 0;
  let skippedProtected = 0;
  let cleanRows = 0;
  for (const row of candidates) {
    inspected += 1;

    // Description cleanup runs even on YC rows (their descriptions can also
    // have HTML entities) but is skipped for already-quarantined rows.
    if (!row.status || (row.status !== 'duplicate' && row.status !== 'junk')) {
      const d = row.description;
      if (d && d.trim()) {
        if (isJunkDescription(d)) {
          descPatches.push({ id: row.id, description: null });
        } else if (/&(amp|lt|gt|quot|#39|nbsp);/.test(d)) {
          descPatches.push({ id: row.id, description: decodeHtmlEntities(d) });
        }
      }
    }

    // Name-based junk marking — only on non-YC, non-protected.
    if (row.source === 'yc') { skippedYc += 1; continue; }
    if (row.status && PROTECTED_STATUSES.has(row.status)) { skippedProtected += 1; continue; }
    if (!isJunkVendorName(row.company_name)) { cleanRows += 1; continue; }
    ids.push(row.id);
  }

  // Mark in batches of 200.
  const BATCH = 200;
  let marked = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const slice = ids.slice(i, i + BATCH);
    const { error, count } = await supabase
      .from('vendors')
      .update({ status: 'junk' }, { count: 'exact' })
      .in('id', slice);
    if (error) {
      return NextResponse.json({
        ok: false,
        message: `Marking junk failed at offset ${i}: ${error.message}`,
        marked,
      }, { status: 500 });
    }
    marked += count ?? slice.length;
  }

  // Apply description patches one-by-one. A given patch is a
  // single-row update with a per-row payload, so we can't batch via .in().
  // 4000-ish rows is fine inside the 60s budget.
  let descBlanked = 0;
  let descDecoded = 0;
  for (const patch of descPatches) {
    const { error } = await supabase
      .from('vendors')
      .update({ description: patch.description })
      .eq('id', patch.id);
    if (error) continue;
    if (patch.description === null) descBlanked += 1;
    else descDecoded += 1;
  }

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - start,
    inspected,
    skippedYc,
    skippedProtected,
    cleanRows,
    candidateMatches: ids.length,
    marked,
    descPatches: descPatches.length,
    descBlanked,
    descDecoded,
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return POST(request);
}
