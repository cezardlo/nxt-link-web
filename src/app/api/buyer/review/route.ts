// POST /api/buyer/review {quote_request_id, rating, title?, body?}
// A verified-engagement review: only a buyer who ACCEPTED this vendor's quote
// may review them. One review per engagement (editable). Scoped to the buyer's
// own verified email.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getBuyerSession } from '@/lib/buyer/auth';

function likeLiteral(v: string): string { return v.replace(/[\\%_]/g, (c) => `\\${c}`); }

export async function POST(req: Request) {
  const session = await getBuyerSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!session.email || !session.emailConfirmed) return NextResponse.json({ ok: false, message: 'Verify your email first' }, { status: 403 });

  let body: { quote_request_id?: string; rating?: number; title?: string; body?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const id = String(body.quote_request_id || '');
  const rating = Math.round(Number(body.rating || 0));
  if (!id) return NextResponse.json({ ok: false, message: 'quote_request_id is required' }, { status: 400 });
  if (!(rating >= 1 && rating <= 5)) return NextResponse.json({ ok: false, message: 'Rating must be 1 to 5' }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  const db = getSupabaseClient({ admin: true });
  // The engagement must belong to this buyer AND have been accepted.
  const { data: opp } = await db.from('quote_requests')
    .select('id, vendor_id, buyer_decision')
    .eq('id', id).ilike('email', likeLiteral(session.email)).maybeSingle();
  if (!opp) return NextResponse.json({ ok: false, message: 'Engagement not found' }, { status: 404 });
  if (opp.buyer_decision !== 'accepted') {
    return NextResponse.json({ ok: false, message: 'You can review a vendor after you accept their quote.' }, { status: 403 });
  }

  const { error } = await db.from('reviews').upsert({
    vendor_id: opp.vendor_id,
    quote_request_id: id,
    buyer_email: session.email,
    rating,
    title: String(body.title || '').slice(0, 160) || null,
    body: String(body.body || '').slice(0, 3000) || null,
    status: 'published',
  }, { onConflict: 'quote_request_id' });
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rating });
}
