// Vendor listings CRUD — always scoped to the signed-in vendor's own rows.
// GET    /api/vendor/listings                 → my products + services
// POST   /api/vendor/listings  {kind, ...}    → create draft listing
// PATCH  /api/vendor/listings  {kind, id, ...fields, status?} → update MY listing
// DELETE /api/vendor/listings?kind=&id=       → archive MY listing

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';
import { ListingKind, tableFor, colsFor, normalizeListingInput } from '@/lib/marketplace/types';
import { VENDOR_TERMS_VERSION } from '@/lib/vendor/terms';
import { sendMail } from '@/lib/mail';
import { notifyAdminsListingNeedsReview } from '@/lib/admin/notify';

function kindOf(v: unknown): ListingKind | null {
  return v === 'product' || v === 'service' ? v : null;
}

// Statuses a vendor may set directly; 'published' has extra requirements below.
const VENDOR_STATUSES = ['draft', 'needs_review', 'ready', 'published', 'unpublished', 'archived'];

async function requireVendor() {
  const session = await getVendorSession();
  if (!session) return { err: NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 }) };
  if (!isSupabaseConfigured()) return { err: NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 }) };
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return { err: NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 }) };
  return { vendor, session };
}

export async function GET() {
  const { vendor, err } = await requireVendor();
  if (err) return err;
  const db = getSupabaseClient({ admin: true });
  const [{ data: products }, { data: services }] = await Promise.all([
    db.from('marketplace_products').select(colsFor('product')).eq('vendor_id', vendor.id).neq('status', 'archived').order('sort_order', { ascending: true, nullsFirst: false }).order('updated_at', { ascending: false }),
    db.from('marketplace_services').select(colsFor('service')).eq('vendor_id', vendor.id).neq('status', 'archived').order('sort_order', { ascending: true, nullsFirst: false }).order('updated_at', { ascending: false }),
  ]);
  return NextResponse.json({ ok: true, products: products || [], services: services || [] });
}

export async function POST(req: Request) {
  const { vendor, err } = await requireVendor();
  if (err) return err;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const kind = kindOf(body.kind);
  if (!kind) return NextResponse.json({ ok: false, message: "kind must be 'product' or 'service'" }, { status: 400 });

  const fields = normalizeListingInput(kind, body);
  if (!fields.name) return NextResponse.json({ ok: false, message: 'name is required' }, { status: 400 });

  const db = getSupabaseClient({ admin: true });
  // AI-drafted listings start in needs_review — a human must look before publish.
  const aiExtracted = Boolean(body.ai_extracted);
  const { data, error } = await db.from(tableFor(kind))
    .insert({ ...fields, vendor_id: vendor.id, status: aiExtracted ? 'needs_review' : 'draft', ai_extracted: aiExtracted })
    .select(colsFor(kind)).single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  // Attach a previously extracted document to this new listing (own-scoped).
  const docId = typeof body.attach_document_id === 'string' ? body.attach_document_id : '';
  if (docId) {
    const newId = (data as unknown as { id: string }).id;
    await db.from('listing_documents')
      .update(kind === 'product' ? { product_id: newId } : { service_id: newId })
      .eq('id', docId).eq('vendor_id', vendor.id);
  }

  const listingName = (data as unknown as { name?: string })?.name || 'Your listing';

  if (vendor.email) {
    sendMail({
      to: vendor.email,
      subject: `NXT//LINK: "${listingName}" was saved as a ${aiExtracted ? 'draft that needs your review' : 'draft'}`,
      body: `${listingName} was created in your NXT//LINK listings dashboard. It is NOT public — nothing appears in the marketplace until you review it and confirm its accuracy on the publish screen.`,
    }).catch(() => {});
  }

  // AI-drafted listings land directly in the admin needs_review queue — the
  // one discrete "entered review" event for listings (see admin dashboard,
  // src/lib/admin/overview.ts). Best-effort admin notification, fire-and-
  // forget on purpose — MUST NOT slow or fail this save (src/lib/admin/
  // notify.ts header).
  if (aiExtracted) {
    notifyAdminsListingNeedsReview({
      listingName,
      vendorName: vendor.company_name || null,
      kind,
    });
  }
  return NextResponse.json({ ok: true, listing: data, kind });
}

export async function PATCH(req: Request) {
  const { vendor, session, err } = await requireVendor();
  if (err) return err;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const kind = kindOf(body.kind);
  const id = typeof body.id === 'string' ? body.id : '';
  if (!kind || !id) return NextResponse.json({ ok: false, message: 'kind and id are required' }, { status: 400 });

  const patch = normalizeListingInput(kind, body);
  if (typeof body.sort_order === 'number' && Number.isFinite(body.sort_order)) patch.sort_order = Math.max(0, Math.trunc(body.sort_order));
  const wantsPublish = body.status === 'published';
  if (typeof body.status === 'string' && VENDOR_STATUSES.includes(body.status)) {
    if (wantsPublish) {
      // Publishing gate: accepted NXT//LINK terms + APPROVED account (admin
      // review — quick-signup vendors build in draft while pending, but
      // nothing goes public before an operator approves; process doc §4)
      // + verified email + accuracy.
      const dbGate = getSupabaseClient({ admin: true });
      const { data: termsRow } = await dbGate.from('vendor_profiles').select('terms_accepted_version').eq('id', vendor.id).maybeSingle();
      if (termsRow?.terms_accepted_version !== VENDOR_TERMS_VERSION) {
        return NextResponse.json({ ok: false, code: 'terms_required', message: 'Accept the NXT//LINK vendor terms before publishing — open your profile to review and accept them.' }, { status: 403 });
      }
      if (vendor.status !== 'approved') {
        return NextResponse.json({ ok: false, code: 'review_required', message: 'Your company is still in review — listings stay saved as drafts and go live the moment an operator approves your account. / Tu empresa sigue en revisión — tus publicaciones quedan guardadas como borradores y salen en vivo en cuanto un operador apruebe tu cuenta.' }, { status: 403 });
      }
      if (!session.emailConfirmed) {
        return NextResponse.json({ ok: false, code: 'email_unverified', message: 'Verify your email before publishing — check your inbox for the confirmation link.' }, { status: 403 });
      }
      if (body.accuracy_confirmed !== true) {
        return NextResponse.json({ ok: false, code: 'accuracy_required', message: 'Please confirm the information is accurate before publishing.' }, { status: 400 });
      }
      patch.published_at = new Date().toISOString();
      patch.accuracy_confirmed_at = new Date().toISOString();
    }
    patch.status = body.status;
  }
  if (!Object.keys(patch).length) return NextResponse.json({ ok: false, message: 'Nothing to update' }, { status: 400 });
  patch.updated_at = new Date().toISOString();

  const db = getSupabaseClient({ admin: true });
  const { data, error } = await db.from(tableFor(kind)).update(patch)
    .eq('id', id).eq('vendor_id', vendor.id)
    .select(colsFor(kind)).single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  if (wantsPublish && vendor.email) {
    const name = (data as unknown as { name?: string })?.name || 'Your listing';
    sendMail({
      to: vendor.email,
      subject: `NXT//LINK: "${name}" is now live in the marketplace`,
      body: `${name} is published and visible to buyers in the NXT//LINK marketplace. You confirmed its accuracy on ${new Date().toLocaleDateString()}. You can unpublish it anytime from your listings dashboard.`,
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true, listing: data, kind });
}

export async function DELETE(req: Request) {
  const { vendor, err } = await requireVendor();
  if (err) return err;
  const sp = new URL(req.url).searchParams;
  const kind = kindOf(sp.get('kind'));
  const id = sp.get('id') || '';
  if (!kind || !id) return NextResponse.json({ ok: false, message: 'kind and id are required' }, { status: 400 });
  const db = getSupabaseClient({ admin: true });
  const { error } = await db.from(tableFor(kind)).update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id).eq('vendor_id', vendor.id);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
