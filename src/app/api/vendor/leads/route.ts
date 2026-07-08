// GET   /api/vendor/leads          — signed-in vendor: quote requests for MY listings
// PATCH /api/vendor/leads {id, status} — update status of MY lead

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';
import { sendZohoMail } from '@/lib/zoho/mail';

const STATUSES = ['new', 'viewed', 'responded', 'won', 'lost', 'spam'];

export async function GET() {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, leads: [] });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  const { data: leads } = await db.from('quote_requests')
    .select('id, public_ref, kind, product_id, service_id, company, contact_name, email, phone, message, answers, status, created_at')
    .eq('vendor_id', vendor.id).order('created_at', { ascending: false }).limit(200);

  // Resolve listing names in two bulk queries.
  const rows = leads || [];
  const pIds = Array.from(new Set(rows.map((l) => l.product_id).filter(Boolean)));
  const sIds = Array.from(new Set(rows.map((l) => l.service_id).filter(Boolean)));
  const [pRes, sRes] = await Promise.all([
    pIds.length ? db.from('marketplace_products').select('id, name').in('id', pIds) : Promise.resolve({ data: [] }),
    sIds.length ? db.from('marketplace_services').select('id, name').in('id', sIds) : Promise.resolve({ data: [] }),
  ]);
  const names = new Map<string, string>();
  for (const r of pRes.data || []) names.set(r.id as string, r.name as string);
  for (const r of sRes.data || []) names.set(r.id as string, r.name as string);

  return NextResponse.json({
    ok: true,
    leads: rows.map((l) => ({ ...l, listing_name: names.get((l.product_id || l.service_id) as string) || null })),
  });
}

export async function PATCH(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  let body: { id?: string; status?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  if (!body.id || !STATUSES.includes(body.status || '')) {
    return NextResponse.json({ ok: false, message: 'id and a valid status are required' }, { status: 400 });
  }

  const db = getSupabaseClient({ admin: true });
  const { data: updated, error } = await db.from('quote_requests')
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq('id', body.id).eq('vendor_id', vendor.id)
    .select('public_ref, email, company').maybeSingle();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  // Tell the buyer when the vendor starts working their request (only
  // 'responded' — internal states like viewed/won/lost stay internal).
  if (body.status === 'responded' && updated?.email) {
    sendZohoMail({
      to: updated.email as string,
      subject: `NXT//LINK: the vendor is responding to your request ${updated.public_ref}`,
      body: `Good news — ${vendor.company_name} marked your request (${updated.public_ref}) as being responded to. Expect to hear from them at this email address.`,
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
