// GET   /api/vendors/manage?status=&category=&q=   — admin: list signed-up companies
// PATCH /api/vendors/manage   { id, status?, admin_notes? }  — admin: organize/approve
// Admin-gated. Degrades gracefully when Supabase is unavailable.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isAdminRequest } from '@/lib/assistant/auth';
import { logAudit } from '@/lib/assistant/llm';

export async function GET(req: Request) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, vendors: [] });

  const sp = new URL(req.url).searchParams;
  const status = sp.get('status');
  const category = sp.get('category');
  const q = sp.get('q');

  try {
    const db = getSupabaseClient({ admin: true });
    let query = db
      .from('vendor_profiles')
      .select('id, public_ref, company_name, contact_name, email, phone, website, city, categories, service_areas, industries, client_types, description, status, zoho_contact_id, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (status && status !== 'all') query = query.eq('status', status);
    if (q) query = query.ilike('company_name', `%${q}%`);
    const { data, error } = await query;
    if (error) throw error;

    let vendors = data || [];
    if (category) vendors = vendors.filter((v) => Array.isArray(v.categories) && (v.categories as string[]).includes(category));

    // attach brochure counts (best-effort)
    const ids = vendors.map((v) => v.id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: br } = await db.from('vendor_brochures').select('vendor_id').in('vendor_id', ids);
      counts = (br || []).reduce((acc: Record<string, number>, r: { vendor_id: string }) => {
        acc[r.vendor_id] = (acc[r.vendor_id] || 0) + 1; return acc;
      }, {});
    }
    const withCounts = vendors.map((v) => ({ ...v, brochure_count: counts[v.id] || 0 }));
    return NextResponse.json({ ok: true, stored: true, vendors: withCounts });
  } catch (e) {
    return NextResponse.json({ ok: true, stored: false, degraded: true, vendors: [],
      message: e instanceof Error ? e.message : 'Could not load vendors' });
  }
}

export async function PATCH(req: Request) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  let body: { id?: string; status?: string; admin_notes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const id = String(body.id || '').trim();
  if (!id) return NextResponse.json({ ok: false, message: 'id is required' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.status && ['pending', 'approved', 'rejected', 'paused'].includes(body.status)) patch.status = body.status;
  if (typeof body.admin_notes === 'string') patch.admin_notes = body.admin_notes.slice(0, 4000);
  if (!Object.keys(patch).length) return NextResponse.json({ ok: false, message: 'Nothing to update' }, { status: 400 });

  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, degraded: true });
  try {
    const db = getSupabaseClient({ admin: true });
    const { data, error } = await db.from('vendor_profiles').update(patch).eq('id', id)
      .select('id, status').single();
    if (error) throw error;
    await logAudit({ action: 'vendor_profile_updated', role: 'admin', vendor_id: id, after_status: String(patch.status || '') });
    return NextResponse.json({ ok: true, stored: true, vendor: data });
  } catch (e) {
    return NextResponse.json({ ok: true, stored: false, degraded: true,
      message: e instanceof Error ? e.message : 'Update failed' });
  }
}
