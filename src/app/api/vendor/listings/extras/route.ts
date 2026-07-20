// GET /api/vendor/listings/extras?kind=&id= — the documents and case studies
// attached to MY listing, for the review-before-publish preview.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';

export async function GET(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, documents: [], case_studies: [] });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const sp = new URL(req.url).searchParams;
  const kind = sp.get('kind') === 'service' ? 'service' : 'product';
  const id = sp.get('id') || '';
  if (!id) return NextResponse.json({ ok: false, message: 'id is required' }, { status: 400 });
  const fk = kind === 'product' ? 'product_id' : 'service_id';

  const db = getSupabaseClient({ admin: true });
  const [{ data: docs }, { data: cases }] = await Promise.all([
    db.from('listing_documents').select('id, title, file_name, doc_type, ai_summary').eq(fk, id).eq('vendor_id', vendor.id).limit(20),
    db.from('case_studies').select('id, title, status').eq(fk, id).eq('vendor_id', vendor.id).limit(10),
  ]);
  return NextResponse.json({ ok: true, documents: docs || [], case_studies: cases || [] });
}
