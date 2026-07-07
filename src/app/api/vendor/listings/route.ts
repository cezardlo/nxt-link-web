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

function kindOf(v: unknown): ListingKind | null {
  return v === 'product' || v === 'service' ? v : null;
}

async function requireVendor() {
  const session = await getVendorSession();
  if (!session) return { err: NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 }) };
  if (!isSupabaseConfigured()) return { err: NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 }) };
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return { err: NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 }) };
  return { vendor };
}

export async function GET() {
  const { vendor, err } = await requireVendor();
  if (err) return err;
  const db = getSupabaseClient({ admin: true });
  const [{ data: products }, { data: services }] = await Promise.all([
    db.from('marketplace_products').select(colsFor('product')).eq('vendor_id', vendor.id).neq('status', 'archived').order('updated_at', { ascending: false }),
    db.from('marketplace_services').select(colsFor('service')).eq('vendor_id', vendor.id).neq('status', 'archived').order('updated_at', { ascending: false }),
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
  const { data, error } = await db.from(tableFor(kind))
    .insert({ ...fields, vendor_id: vendor.id, status: 'draft', ai_extracted: Boolean(body.ai_extracted) })
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
  return NextResponse.json({ ok: true, listing: data, kind });
}

export async function PATCH(req: Request) {
  const { vendor, err } = await requireVendor();
  if (err) return err;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const kind = kindOf(body.kind);
  const id = typeof body.id === 'string' ? body.id : '';
  if (!kind || !id) return NextResponse.json({ ok: false, message: 'kind and id are required' }, { status: 400 });

  const patch = normalizeListingInput(kind, body);
  if (body.status === 'published' || body.status === 'draft' || body.status === 'archived') {
    patch.status = body.status;
    if (body.status === 'published') patch.published_at = new Date().toISOString();
  }
  if (!Object.keys(patch).length) return NextResponse.json({ ok: false, message: 'Nothing to update' }, { status: 400 });
  patch.updated_at = new Date().toISOString();

  const db = getSupabaseClient({ admin: true });
  const { data, error } = await db.from(tableFor(kind)).update(patch)
    .eq('id', id).eq('vendor_id', vendor.id)
    .select(colsFor(kind)).single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
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
