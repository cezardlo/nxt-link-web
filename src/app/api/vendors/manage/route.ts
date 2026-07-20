// GET   /api/vendors/manage?status=&category=&q=   — admin: list signed-up companies
// PATCH /api/vendors/manage   { id, status?, admin_notes? }  — admin: organize/approve
// Admin-gated. Degrades gracefully when Supabase is unavailable.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isAdminRequest, getCurrentUser } from '@/lib/assistant/auth';
import { logAudit } from '@/lib/assistant/llm';
import { suspensionExpired } from '@/lib/vendor/moderation';

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
      .select('id, public_ref, company_name, contact_name, email, phone, website, city, categories, service_areas, industries, client_types, description, status, moderation_status, suspended_until, moderation_reason, zoho_contact_id, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (status && status !== 'all') query = query.eq('status', status);
    if (q) query = query.ilike('company_name', `%${q}%`);
    const { data, error } = await query;
    if (error) throw error;

    let vendors = data || [];

    // Auto-reactivate any timed suspensions whose clock has run out.
    const expired = vendors.filter((v) => suspensionExpired(v as { moderation_status?: string; suspended_until?: string }));
    if (expired.length) {
      const ids = expired.map((v) => v.id);
      await db.from('vendor_profiles')
        .update({ moderation_status: 'active', suspended_until: null, moderated_at: new Date().toISOString() })
        .in('id', ids).eq('moderation_status', 'suspended');
      await db.from('vendor_moderation_log').insert(expired.map((v) => ({
        vendor_id: v.id, action: 'auto_reactivate', from_status: 'suspended', to_status: 'active',
        reason: 'Suspension period ended', admin_email: 'system',
      })));
      for (const v of expired) { (v as { moderation_status?: string; suspended_until?: string | null }).moderation_status = 'active'; (v as { suspended_until?: string | null }).suspended_until = null; }
    }

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

  let body: { id?: string; status?: string; admin_notes?: string; moderation_action?: string; suspend_days?: number | null; reason?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const id = String(body.id || '').trim();
  if (!id) return NextResponse.json({ ok: false, message: 'id is required' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.status && ['pending', 'approved', 'rejected', 'paused'].includes(body.status)) patch.status = body.status;
  if (typeof body.admin_notes === 'string') patch.admin_notes = body.admin_notes.slice(0, 4000);

  // Moderation action — the active/suspended/banned axis, with an audit entry.
  const action = body.moderation_action;
  const isModeration = action === 'suspend' || action === 'ban' || action === 'reactivate';
  if (isModeration) {
    if (action === 'suspend') {
      const days = Number(body.suspend_days);
      patch.moderation_status = 'suspended';
      patch.suspended_until = Number.isFinite(days) && days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;
    } else if (action === 'ban') {
      patch.moderation_status = 'banned';
      patch.suspended_until = null;
    } else {
      patch.moderation_status = 'active';
      patch.suspended_until = null;
    }
    patch.moderation_reason = typeof body.reason === 'string' ? body.reason.slice(0, 1000) || null : null;
    patch.moderated_at = new Date().toISOString();
  }

  if (!Object.keys(patch).length) return NextResponse.json({ ok: false, message: 'Nothing to update' }, { status: 400 });

  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, degraded: true });
  try {
    const db = getSupabaseClient({ admin: true });
    const adminEmail = (await getCurrentUser())?.email || 'admin';
    if (isModeration) patch.moderated_by = adminEmail;

    // Capture the prior moderation status for the audit trail.
    const { data: before } = await db.from('vendor_profiles').select('moderation_status').eq('id', id).maybeSingle();

    const { data, error } = await db.from('vendor_profiles').update(patch).eq('id', id)
      .select('id, status, moderation_status, suspended_until').single();
    if (error) throw error;

    if (isModeration) {
      await db.from('vendor_moderation_log').insert({
        vendor_id: id, action,
        from_status: (before?.moderation_status as string) || 'active',
        to_status: patch.moderation_status as string,
        suspended_until: patch.suspended_until as string | null,
        reason: patch.moderation_reason as string | null,
        admin_email: adminEmail,
      });
    }
    await logAudit({ action: isModeration ? `vendor_${action}` : 'vendor_profile_updated', role: 'admin', vendor_id: id, after_status: String(patch.moderation_status || patch.status || '') });
    return NextResponse.json({ ok: true, stored: true, vendor: data });
  } catch (e) {
    return NextResponse.json({ ok: true, stored: false, degraded: true,
      message: e instanceof Error ? e.message : 'Update failed' });
  }
}
