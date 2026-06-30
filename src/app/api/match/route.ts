// POST /api/match  { category?, location?, request_id?, include_all? }
// Admin: rank registered companies for a client request by category + area.
// Loads the request from client_requests if request_id is given. Degrades
// gracefully (empty list) when Supabase is unavailable.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isAdminRequest } from '@/lib/assistant/auth';
import { scoreVendors, type MatchableVendor } from '@/lib/matching';

export async function POST(req: Request) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  let body: { category?: string; location?: string; request_id?: string; include_all?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }

  if (!isSupabaseConfigured())
    return NextResponse.json({ ok: true, stored: false, degraded: true, matches: [], input: body });

  try {
    const db = getSupabaseClient({ admin: true });

    let category = body.category || '';
    let location = body.location || '';

    // If a request id/ref is given, pull category + location from it.
    if (body.request_id) {
      const col = body.request_id.startsWith('REQ-') ? 'public_ref' : 'id';
      const { data: reqRow } = await db
        .from('client_requests')
        .select('category, location, ai_summary')
        .eq(col, body.request_id)
        .maybeSingle();
      if (reqRow) {
        category = category || String(reqRow.category || (reqRow.ai_summary as { category?: string })?.category || '');
        location = location || String(reqRow.location || '');
      }
    }

    let q = db.from('vendor_profiles')
      .select('id, company_name, email, phone, categories, service_areas, status')
      .limit(500);
    if (!body.include_all) q = q.eq('status', 'approved');
    const { data: vendors, error } = await q;
    if (error) throw error;

    // brochure counts
    const ids = (vendors || []).map((v) => v.id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: br } = await db.from('vendor_brochures').select('vendor_id').in('vendor_id', ids);
      counts = (br || []).reduce((a: Record<string, number>, r: { vendor_id: string }) => {
        a[r.vendor_id] = (a[r.vendor_id] || 0) + 1; return a;
      }, {});
    }
    const enriched: MatchableVendor[] = (vendors || []).map((v) => ({ ...v, brochure_count: counts[v.id] || 0 }));

    const matches = scoreVendors({ category, location }, enriched).slice(0, 50);
    return NextResponse.json({ ok: true, stored: true, input: { category, location }, count: matches.length, matches });
  } catch (e) {
    return NextResponse.json({ ok: true, stored: false, degraded: true, matches: [],
      message: e instanceof Error ? e.message : 'Match failed' });
  }
}
