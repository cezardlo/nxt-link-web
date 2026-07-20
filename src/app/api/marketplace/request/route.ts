// POST /api/marketplace/request — public quote/service request for a listing.
// Server-only insert; the vendor sees it in /vendor/leads. Honeypot + min-fill
// time keep bots out. Buyer contact info is never exposed publicly.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { tableFor } from '@/lib/marketplace/types';
import { notifyVendor } from '@/lib/notify';
import { sendMail } from '@/lib/mail';

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }

  // Anti-bot: hidden honeypot must stay empty (fake success), min 1.5s fill time.
  if (String(body.website_url || '')) return NextResponse.json({ ok: true, public_ref: 'REQ-RECEIVED' });
  const startedAt = Number(body.started_at || 0);
  if (startedAt && Date.now() - startedAt < 1500) {
    return NextResponse.json({ ok: false, message: 'Form submitted too quickly — please try again' }, { status: 400 });
  }

  const kind = body.kind === 'service' ? 'service' : 'product';
  // Which NXT//LINK deal action started this request. Stored in answers (jsonb)
  // so no schema change is needed yet; formalized into a column in Phase 3.
  const REQUEST_TYPES = ['quote', 'contact_sales', 'demo', 'pilot', 'question'];
  const requestType = REQUEST_TYPES.includes(String(body.request_type)) ? String(body.request_type) : 'quote';
  const REQUEST_LABEL: Record<string, string> = {
    quote: 'quote request', contact_sales: 'sales inquiry', demo: 'demo request',
    pilot: 'pilot request', question: 'question',
  };
  const listingId = String(body.listing_id || '');
  const company = String(body.company || '').trim().slice(0, 200);
  const contact = String(body.contact_name || '').trim().slice(0, 200);
  const email = String(body.email || '').trim().slice(0, 200);
  const phone = String(body.phone || '').trim().slice(0, 60);
  const message = String(body.message || '').trim().slice(0, 3000);

  if (!listingId) return NextResponse.json({ ok: false, message: 'listing_id is required' }, { status: 400 });
  if (!company) return NextResponse.json({ ok: false, message: 'Company is required' }, { status: 400 });
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ ok: false, message: 'A valid email is required' }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, degraded: true });

  const db = getSupabaseClient({ admin: true });
  // The listing must actually be published; vendor_id comes from the row, never the client.
  const { data: listing } = await db.from(tableFor(kind)).select('id, name, vendor_id').eq('id', listingId).eq('status', 'published').maybeSingle();
  if (!listing) return NextResponse.json({ ok: false, message: 'Listing not found' }, { status: 404 });

  const { data, error } = await db.from('quote_requests').insert({
    kind,
    product_id: kind === 'product' ? listingId : null,
    service_id: kind === 'service' ? listingId : null,
    vendor_id: listing.vendor_id,
    company, contact_name: contact, email, phone, message,
    answers: { request_type: requestType },
    status: 'new',
  }).select('public_ref').single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  // Best-effort: tell the vendor a lead arrived (never blocks the response).
  const { data: qrRow } = await db.from('quote_requests').select('id').eq('public_ref', data.public_ref).maybeSingle();
  await notifyVendor(db, listing.vendor_id as string, (qrRow?.id as string) || null, 'new_lead', `New ${REQUEST_LABEL[requestType]} from ${company} for "${listing.name}"`);
  const { data: v } = await db.from('vendor_profiles').select('email, company_name').eq('id', listing.vendor_id).maybeSingle();
  if (v?.email) {
    sendMail({
      to: v.email as string,
      subject: `NXT//LINK: new ${REQUEST_LABEL[requestType]} for "${listing.name}"`,
      body: `You have a new ${REQUEST_LABEL[requestType]} (${data.public_ref}) from ${company} for "${listing.name}". Respond inside NXT//LINK — do not contact the buyer off-platform. Open your leads inbox: /vendor/leads`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, public_ref: data.public_ref });
}
