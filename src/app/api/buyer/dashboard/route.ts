// GET /api/buyer/dashboard — the signed-in buyer's marketplace footprint:
// their intake requests (client_requests) and their marketplace quote/service
// requests (quote_requests), matched by the caller's OWN verified email. There
// is no buyer_id FK on these tables yet, so email is the identity key and
// confirmation is required to prevent claiming another person's requests.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getBuyerSession } from '@/lib/buyer/auth';

// Escape LIKE wildcards so an email is matched literally (case-insensitive).
function likeLiteral(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function GET() {
  const session = await getBuyerSession();
  if (!session) return NextResponse.json({ ok: true, signed_in: false });
  if (!session.email) {
    return NextResponse.json({ ok: true, signed_in: true, email_verified: false, email: null, requests: [], quotes: [] });
  }
  // Email is the identity key here — don't return email-matched data to an
  // account that hasn't proven it owns the address.
  if (!session.emailConfirmed) {
    return NextResponse.json({ ok: true, signed_in: true, email_verified: false, email: session.email, requests: [], quotes: [] });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, signed_in: true, email_verified: true, email: session.email, requests: [], quotes: [] });
  }

  const db = getSupabaseClient({ admin: true });
  const emailMatch = likeLiteral(session.email);

  // Intake requests (the NXT-assisted "describe a need" path).
  const { data: requests } = await db
    .from('client_requests')
    .select('id, public_ref, category, problem, location, urgency, status, pipeline_stage, created_at')
    .ilike('contact_email', emailMatch)
    .order('created_at', { ascending: false })
    .limit(100);

  // Marketplace quote/service requests (the self-service "request a quote" path).
  // vendor_id is selected so we can attach each quote's PUBLIC vendor company
  // name below — needed to tell competing quotes apart in the comparison view
  // (FIX 1). This is not contact data: vendor email/phone are never selected or
  // returned here, so masking (src/lib/guard.ts) is unaffected.
  const { data: quotes } = await db
    .from('quote_requests')
    .select('id, public_ref, kind, product_id, service_id, vendor_id, company, message, status, created_at, quote_amount, quote_currency, quote_message, quote_timeline, quote_valid_until, quoted_at, buyer_decision, answers')
    .ilike('email', emailMatch)
    .order('created_at', { ascending: false })
    .limit(100);

  // Resolve listing names in two bulk queries (same approach as vendor leads).
  const qRows = quotes || [];
  const pIds = Array.from(new Set(qRows.map((q) => q.product_id).filter(Boolean)));
  const sIds = Array.from(new Set(qRows.map((q) => q.service_id).filter(Boolean)));
  const [pRes, sRes] = await Promise.all([
    pIds.length ? db.from('marketplace_products').select('id, name').in('id', pIds) : Promise.resolve({ data: [] }),
    sIds.length ? db.from('marketplace_services').select('id, name').in('id', sIds) : Promise.resolve({ data: [] }),
  ]);
  const names = new Map<string, string>();
  for (const r of pRes.data || []) names.set(r.id as string, r.name as string);
  for (const r of sRes.data || []) names.set(r.id as string, r.name as string);

  // Resolve vendor company names (PUBLIC — same name shown on storefronts).
  // Lets the buyer tell competing quotes apart in the comparison (FIX 1).
  const vIds = Array.from(new Set(qRows.map((q) => q.vendor_id).filter(Boolean)));
  const { data: vRows } = vIds.length
    ? await db.from('vendor_profiles').select('id, company_name').in('id', vIds)
    : { data: [] };
  const vendorNames = new Map<string, string>();
  for (const r of vRows || []) vendorNames.set(r.id as string, r.company_name as string);

  // Which engagements the buyer has already reviewed (degrades to none if the
  // reviews table isn't present yet).
  const qIds = qRows.map((q) => q.id);
  const [{ data: revRows }, { data: pilotRows }] = await Promise.all([
    qIds.length ? db.from('reviews').select('quote_request_id').in('quote_request_id', qIds) : Promise.resolve({ data: [] }),
    qIds.length ? db.from('pilots').select('quote_request_id, kind, status, scheduled_for, location, scope, outcome').in('quote_request_id', qIds).order('created_at') : Promise.resolve({ data: [] }),
  ]);
  const reviewed = new Set((revRows || []).map((r) => r.quote_request_id as string));
  const pilotsByQr = new Map<string, unknown[]>();
  for (const p of pilotRows || []) {
    const arr = pilotsByQr.get(p.quote_request_id as string) || [];
    arr.push(p); pilotsByQr.set(p.quote_request_id as string, arr);
  }

  return NextResponse.json({
    ok: true,
    signed_in: true,
    email_verified: true,
    email: session.email,
    requests: requests || [],
    quotes: qRows.map((q) => ({ ...q, listing_name: names.get((q.product_id || q.service_id) as string) || null, vendor_name: vendorNames.get(q.vendor_id as string) || null, reviewed: reviewed.has(q.id), pilots: pilotsByQr.get(q.id) || [] })),
  });
}
