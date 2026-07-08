// POST /api/marketplace/report — buyer reports a problem with a listing.
// Goes to listing_reports, reviewed by operators in /admin/marketplace.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { tableFor } from '@/lib/marketplace/types';

const REASONS = ['wrong_info', 'misleading', 'spam', 'not_available', 'other'];

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }

  // Honeypot: hidden field must stay empty (fake success so bots don't learn).
  if (String(body.website_url || '')) return NextResponse.json({ ok: true });

  const kind = body.kind === 'service' ? 'service' : 'product';
  const listingId = String(body.listing_id || '');
  const reason = String(body.reason || '');
  const details = String(body.details || '').trim().slice(0, 2000);
  const email = String(body.email || '').trim().slice(0, 200);
  if (!listingId || !REASONS.includes(reason)) {
    return NextResponse.json({ ok: false, message: 'listing_id and a valid reason are required' }, { status: 400 });
  }
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false });

  const db = getSupabaseClient({ admin: true });
  const { data: listing } = await db.from(tableFor(kind)).select('id, vendor_id').eq('id', listingId).eq('status', 'published').maybeSingle();
  if (!listing) return NextResponse.json({ ok: false, message: 'Listing not found' }, { status: 404 });

  const { error } = await db.from('listing_reports').insert({
    kind,
    product_id: kind === 'product' ? listingId : null,
    service_id: kind === 'service' ? listingId : null,
    vendor_id: listing.vendor_id,
    reason, details: details || null, reporter_email: email || null,
  });
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
