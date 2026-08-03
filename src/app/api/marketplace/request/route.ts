// POST /api/marketplace/request — public quote/service request for a listing.
// Server-only insert; the vendor sees it in /vendor/leads. Honeypot + min-fill
// time keep bots out. Buyer contact info is never exposed publicly.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { tableFor } from '@/lib/marketplace/types';
import { notifyVendor } from '@/lib/notify';
import { sendMail } from '@/lib/mail';
import { isRestricted } from '@/lib/vendor/moderation';
import { getSessionUser } from '@/lib/auth/require-user';
import { validateStructuredRequest, type StructuredRequestFields, isRequestKind } from '@/lib/requests/structured';

export async function POST(req: Request) {
  // Login wall (owner decision, 2026-07-23): sending a quote/service request now
  // requires a signed-in account — this closes the old anonymous, free-typed
  // email hole. The honeypot + min-fill-time spam guards below still run for
  // signed-in callers (defense-in-depth against scripted sessions).
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, code: 'auth_required', message: 'Sign in to send a request' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }

  // Anti-bot: hidden honeypot must stay empty (fake success), min 1.5s fill time.
  if (String(body.website_url || '')) return NextResponse.json({ ok: true, public_ref: 'REQ-RECEIVED' });
  const startedAt = Number(body.started_at || 0);
  if (startedAt && Date.now() - startedAt < 1500) {
    return NextResponse.json({ ok: false, code: 'too_fast', message: 'Form submitted too quickly — please try again' }, { status: 400 });
  }

  const listingKind = body.kind === 'service' ? 'service' : 'product';
  // Buyer-visible request kind: the listing itself is product/service, but the
  // buyer may label the opportunity as technology (or keep it matching the
  // listing). The database foreign keys still key off the listing's real kind.
  const requestKind = isRequestKind(body.request_kind) ? body.request_kind : listingKind;
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
  // Attribute the request to the authenticated account, not a free-typed email
  // — the signed-in email is the source of truth (falls back to the typed value
  // only in the unusual case of a session with no email). The quote_requests
  // data shape is unchanged: the `email` column still carries the buyer's
  // address, now trustworthy, and answers.requested_by records the auth id.
  const email = ((user.email || String(body.email || '')).trim().toLowerCase()).slice(0, 200);
  const phone = String(body.phone || '').trim().slice(0, 60);
  const message = String(body.message || '').trim().slice(0, 3000);

  // Structured RFQ fields (Slice R1). Optional — an old-shape caller (nothing
  // new in the body) validates cleanly to all-null/empty. request_kind comes
  // from the buyer's choice on the listing form when it is a valid value,
  // otherwise it falls back to the listing's own kind.
  const structured = validateStructuredRequest(body);
  if (!structured.ok) {
    return NextResponse.json({ ok: false, code: 'invalid_structured_fields', message: structured.errors[0], errors: structured.errors }, { status: 400 });
  }
  const structuredFields: StructuredRequestFields = { ...structured.value, request_kind: requestKind };

  // ---- Bundle mode (quote cart): several listings, ONE request per vendor ----
  // The cart may span vendors; each vendor gets exactly one quote_requests row,
  // so the opportunity stays the unit of the existing pipeline (one quote, one
  // accept, one commission via calculateFee — nothing new). The item list lives
  // in answers.items (jsonb) — same no-schema-change pattern as request_type.
  if (Array.isArray(body.items) && body.items.length > 0) {
    // Bundle rows span both products AND services, so no single request_kind
    // applies — each per-vendor row is tagged by ITS OWN listing kind below,
    // same as the single-listing path. Only the cart-wide fields (location/
    // timeline/budget/specs) are shared; per-item quantity already exists
    // (items[].qty, validated below — unchanged from before this slice).
    const cartWideFields = {
      delivery_location: structuredFields.delivery_location,
      preferred_timeline: structuredFields.preferred_timeline,
      budget_min: structuredFields.budget_min,
      budget_max: structuredFields.budget_max,
      structured_specs: structuredFields.structured_specs,
    };
    return handleBundle(body.items, { company, contact, email, phone, message }, user.id, cartWideFields);
  }

  if (!listingId) return NextResponse.json({ ok: false, code: 'listing_id_required', message: 'listing_id is required' }, { status: 400 });
  if (!company) return NextResponse.json({ ok: false, code: 'company_required', message: 'Company is required' }, { status: 400 });
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ ok: false, code: 'email_invalid', message: 'A valid email is required' }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, degraded: true });

  const db = getSupabaseClient({ admin: true });
  // The listing must actually be published; vendor_id comes from the row, never the client.
  const { data: listing } = await db.from(tableFor(listingKind)).select('id, name, vendor_id').eq('id', listingId).eq('status', 'published').maybeSingle();
  if (!listing) return NextResponse.json({ ok: false, code: 'listing_not_found', message: 'Listing not found' }, { status: 404 });

  // A restricted (suspended/banned) or not-yet-approved (pending) vendor's
  // listing is rejected exactly like an unpublished/unknown one — same code,
  // no separate signal leaks to the buyer. In practice a pending vendor can
  // never have a published listing (the publish gate in
  // api/vendor/listings/route.ts blocks it), so `status !== 'approved'` here
  // is defense-in-depth, not the primary gate — but we check it explicitly
  // rather than relying on that invariant alone (F1 decision, 2026-07-22:
  // invited vendors are born pending, not approved). Pure read-side check, no
  // write here.
  const { data: modVendor } = await db.from('vendor_profiles').select('status, moderation_status, suspended_until').eq('id', listing.vendor_id).maybeSingle();
  if (!modVendor || modVendor.status !== 'approved' || isRestricted({ moderation_status: (modVendor.moderation_status as string) || null, suspended_until: (modVendor.suspended_until as string) || null })) {
    return NextResponse.json({ ok: false, code: 'listing_not_found', message: 'Listing not found' }, { status: 404 });
  }

  const { data, error } = await db.from('quote_requests').insert({
    kind: listingKind,
    product_id: listingKind === 'product' ? listingId : null,
    service_id: listingKind === 'service' ? listingId : null,
    vendor_id: listing.vendor_id,
    company, contact_name: contact, email, phone, message,
    answers: { request_type: requestType, requested_by: user.id },
    status: 'new',
    request_kind: structuredFields.request_kind,
    quantity: structuredFields.quantity,
    delivery_location: structuredFields.delivery_location,
    preferred_timeline: structuredFields.preferred_timeline,
    budget_min: structuredFields.budget_min,
    budget_max: structuredFields.budget_max,
    structured_specs: structuredFields.structured_specs,
  }).select('public_ref').single();
  if (error) return NextResponse.json({ ok: false, code: 'create_failed', message: error.message }, { status: 500 });

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

  // Echo back what was saved (this response goes to the BUYER who just
  // submitted it — including their own budget here is not a vendor-facing
  // leak; see src/lib/requests/vendor-view.ts for where the invariant is
  // actually enforced, on the vendor-READING routes).
  return NextResponse.json({
    ok: true, public_ref: data.public_ref,
    request_kind: structuredFields.request_kind,
    quantity: structuredFields.quantity,
    delivery_location: structuredFields.delivery_location,
    preferred_timeline: structuredFields.preferred_timeline,
    budget_min: structuredFields.budget_min,
    budget_max: structuredFields.budget_max,
    structured_specs: structuredFields.structured_specs,
  });
}

// ---------------------------------------------------------------------------
// Quote cart submission. Validates every listing server-side (vendor_id always
// comes from the listing row, never the client), groups items by vendor, and
// inserts one bundled quote_requests row per vendor. Unpublished/unknown
// listings are skipped and reported back. Buyer contact stays hidden from
// vendors until acceptance exactly like single requests (vendor/leads masking).
// ---------------------------------------------------------------------------
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BUNDLE_ITEMS = 50;

interface BundleContact { company: string; contact: string; email: string; phone: string; message: string }
// Cart-wide structured fields (Slice R1) — shared by every per-vendor row a
// bundle submission creates. request_kind/quantity are deliberately excluded
// here: a cart can mix product + service listings (no single kind applies),
// and quantity is already per-item (items[].qty, unchanged by this slice).
interface BundleStructuredFields {
  delivery_location: string | null;
  preferred_timeline: string | null;
  budget_min: number | null;
  budget_max: number | null;
  structured_specs: Record<string, unknown>;
}

async function handleBundle(rawItems: unknown[], c: BundleContact, requestedBy: string, structured: BundleStructuredFields) {
  if (!c.company) return NextResponse.json({ ok: false, code: 'company_required', message: 'Company is required' }, { status: 400 });
  if (!c.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) return NextResponse.json({ ok: false, code: 'email_invalid', message: 'A valid email is required' }, { status: 400 });

  // Sanitize + dedupe the requested items.
  const seen = new Set<string>();
  const wanted: Array<{ listing_id: string; kind: 'product' | 'service'; qty: number; note: string }> = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') continue;
    const it = raw as Record<string, unknown>;
    const id = String(it.listing_id || '');
    if (!UUID_RE.test(id) || seen.has(id)) continue;
    seen.add(id);
    const qty = Math.round(Number(it.qty));
    wanted.push({
      listing_id: id,
      kind: it.kind === 'service' ? 'service' : 'product',
      qty: Number.isFinite(qty) ? Math.min(999, Math.max(1, qty)) : 1,
      note: String(it.note || '').trim().slice(0, 300),
    });
    if (wanted.length >= MAX_BUNDLE_ITEMS) break;
  }
  if (!wanted.length) return NextResponse.json({ ok: false, code: 'no_valid_items', message: 'No valid items in the cart' }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, degraded: true });

  const db = getSupabaseClient({ admin: true });
  const pIds = wanted.filter((w) => w.kind === 'product').map((w) => w.listing_id);
  const sIds = wanted.filter((w) => w.kind === 'service').map((w) => w.listing_id);
  const [pRes, sRes] = await Promise.all([
    pIds.length ? db.from('marketplace_products').select('id, name, vendor_id').in('id', pIds).eq('status', 'published') : Promise.resolve({ data: [] }),
    sIds.length ? db.from('marketplace_services').select('id, name, vendor_id').in('id', sIds).eq('status', 'published') : Promise.resolve({ data: [] }),
  ]);
  const found = new Map<string, { name: string; vendor_id: string }>();
  for (const r of [...(pRes.data || []), ...(sRes.data || [])]) {
    if (r.vendor_id) found.set(r.id as string, { name: r.name as string, vendor_id: r.vendor_id as string });
  }

  // Batch vendor lookup (one query for every candidate vendor in this cart) —
  // reused both for the moderation gate below and for the email/company_name
  // needed once requests are created, so a restricted vendor never costs an
  // extra round trip.
  const candidateVendorIds = Array.from(new Set(Array.from(found.values()).map((f) => f.vendor_id)));
  const { data: vRows } = candidateVendorIds.length
    ? await db.from('vendor_profiles').select('id, email, company_name, status, moderation_status, suspended_until').in('id', candidateVendorIds)
    : { data: [] };
  const vendorInfo = new Map<string, { email: string | null; company_name: string | null }>();
  const restrictedVendorIds = new Set<string>();
  for (const v of vRows || []) {
    vendorInfo.set(v.id as string, { email: (v.email as string) || null, company_name: (v.company_name as string) || null });
    // Same explicit approved-status + moderation gate as the single-request
    // path above (defense-in-depth on top of the publish-gate invariant —
    // F1 decision, 2026-07-22: invited vendors are born pending).
    if (v.status !== 'approved' || isRestricted({ moderation_status: (v.moderation_status as string) || null, suspended_until: (v.suspended_until as string) || null })) {
      restrictedVendorIds.add(v.id as string);
    }
  }

  // Group by the listing's REAL vendor (server truth). A restricted or
  // not-yet-approved vendor's listings are skipped exactly like an
  // unpublished/unknown one — reuses the same skipped[] mechanism, no
  // separate signal leaks out.
  const byVendor = new Map<string, Array<{ listing_id: string; kind: string; name: string; qty: number; note?: string }>>();
  const skipped: string[] = [];
  for (const w of wanted) {
    const f = found.get(w.listing_id);
    if (!f || restrictedVendorIds.has(f.vendor_id)) { skipped.push(w.listing_id); continue; }
    const arr = byVendor.get(f.vendor_id) || [];
    arr.push({ listing_id: w.listing_id, kind: w.kind, name: f.name, qty: w.qty, ...(w.note ? { note: w.note } : {}) });
    byVendor.set(f.vendor_id, arr);
  }
  if (byVendor.size === 0) return NextResponse.json({ ok: false, code: 'no_published_listings', message: 'No published listings in your cart — they may have been removed', skipped }, { status: 404 });

  const requests: Array<{ public_ref: string; vendor_name: string | null; item_count: number }> = [];
  const failures: string[] = [];
  for (const [vendorId, items] of byVendor) {
    const first = items[0];
    const { data, error } = await db.from('quote_requests').insert({
      kind: first.kind,
      product_id: first.kind === 'product' ? first.listing_id : null,
      service_id: first.kind === 'service' ? first.listing_id : null,
      vendor_id: vendorId,
      company: c.company, contact_name: c.contact, email: c.email, phone: c.phone, message: c.message,
      answers: { request_type: 'quote', bundle: true, items, requested_by: requestedBy },
      status: 'new',
      request_kind: first.kind,
      delivery_location: structured.delivery_location,
      preferred_timeline: structured.preferred_timeline,
      budget_min: structured.budget_min,
      budget_max: structured.budget_max,
      structured_specs: structured.structured_specs,
    }).select('id, public_ref').single();
    if (error || !data) { failures.push(vendorInfo.get(vendorId)?.company_name || vendorId); continue; }

    const v = vendorInfo.get(vendorId);
    const itemLines = items.map((i) => `• ${i.qty} × ${i.name}${i.note ? ` — ${i.note}` : ''}`).join('\n');
    // Best-effort vendor alerts (never block the response). No buyer contact in
    // the email — the conversation stays inside NXT//LINK until acceptance.
    await notifyVendor(db, vendorId, data.id as string, 'new_lead', `New bundled quote request from ${c.company} — ${items.length} item${items.length === 1 ? '' : 's'}`);
    if (v?.email) {
      sendMail({
        to: v.email,
        subject: `NXT//LINK: new bundled quote request (${items.length} item${items.length === 1 ? '' : 's'}) from ${c.company}`,
        body: `You have a new bundled quote request (${data.public_ref}) from ${c.company}:\n${itemLines}\n\nSend ONE quote covering all items. Respond inside NXT//LINK — do not contact the buyer off-platform. Open your leads inbox: /vendor/leads`,
      }).catch(() => {});
    }
    requests.push({ public_ref: data.public_ref as string, vendor_name: v?.company_name || null, item_count: items.length });
  }

  if (!requests.length) return NextResponse.json({ ok: false, code: 'create_failed', message: failures.length ? 'Could not create the request — please try again' : 'No published listings in your cart' }, { status: 500 });
  return NextResponse.json({ ok: true, bundle: true, requests, skipped, failed: failures });
}
