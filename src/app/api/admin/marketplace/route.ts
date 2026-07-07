// Operator oversight of the marketplace. Admin-only (isAdminRequest).
// GET   — vendors (with email-verified flag) + all listings with statuses
// PATCH — { kind, id, status } force a listing status (e.g. unpublish
//         something that looks wrong). Bypasses the vendor accuracy gate but
//         never fabricates one: accuracy_confirmed_at is left untouched.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isAdminRequest } from '@/lib/assistant/auth';
import { tableFor } from '@/lib/marketplace/types';

const LISTING_COLS = 'id, public_ref, vendor_id, name, category, status, ai_extracted, accuracy_confirmed_at, published_at, updated_at';

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Admin only' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  const db = getSupabaseClient({ admin: true });
  const [{ data: vendors }, { data: products }, { data: services }, { data: leads }] = await Promise.all([
    db.from('vendor_profiles').select('id, public_ref, company_name, email, city, status, auth_id, created_at').order('created_at', { ascending: false }).limit(200),
    db.from('marketplace_products').select(LISTING_COLS).order('updated_at', { ascending: false }).limit(200),
    db.from('marketplace_services').select(LISTING_COLS).order('updated_at', { ascending: false }).limit(200),
    db.from('quote_requests').select('id, public_ref, kind, vendor_id, company, status, created_at').order('created_at', { ascending: false }).limit(100),
  ]);

  // Email-verified flag per vendor account (capped to keep this fast).
  const withAuth = (vendors || []).filter((v) => v.auth_id).slice(0, 50);
  const verified = new Map<string, boolean>();
  await Promise.all(withAuth.map(async (v) => {
    try {
      const { data } = await db.auth.admin.getUserById(v.auth_id as string);
      verified.set(v.id as string, Boolean(data?.user?.email_confirmed_at));
    } catch { /* leave unknown */ }
  }));

  return NextResponse.json({
    ok: true,
    vendors: (vendors || []).map((v) => ({
      ...v, auth_id: undefined,
      has_account: Boolean(v.auth_id),
      email_verified: verified.has(v.id as string) ? verified.get(v.id as string) : null,
    })),
    products: products || [],
    services: services || [],
    leads: leads || [],
  });
}

export async function PATCH(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Admin only' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  let body: { kind?: string; id?: string; status?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const kind = body.kind === 'product' || body.kind === 'service' ? body.kind : null;
  const allowed = ['draft', 'needs_review', 'ready', 'published', 'unpublished', 'archived'];
  if (!kind || !body.id || !allowed.includes(body.status || '')) {
    return NextResponse.json({ ok: false, message: 'kind, id, and a valid status are required' }, { status: 400 });
  }

  const db = getSupabaseClient({ admin: true });
  const patch: Record<string, unknown> = { status: body.status, updated_at: new Date().toISOString() };
  if (body.status === 'published') patch.published_at = new Date().toISOString();
  const { error } = await db.from(tableFor(kind)).update(patch).eq('id', body.id);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
