// POST /api/buyer/quote-decision {quote_request_id, decision:'accepted'|'declined'}
// The buyer accepts or declines a vendor's quote INSIDE NXT//LINK. Scoped to the
// buyer's own (verified) email; updates the opportunity and its commission.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getBuyerSession } from '@/lib/buyer/auth';
import { notifyVendor } from '@/lib/notify';
import { sendMail } from '@/lib/mail';

function likeLiteral(v: string): string { return v.replace(/[\\%_]/g, (c) => `\\${c}`); }

export async function POST(req: Request) {
  const session = await getBuyerSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!session.email || !session.emailConfirmed) return NextResponse.json({ ok: false, message: 'Verify your email first' }, { status: 403 });

  let body: { quote_request_id?: string; decision?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const id = String(body.quote_request_id || '');
  const decision = body.decision === 'accepted' ? 'accepted' : body.decision === 'declined' ? 'declined' : '';
  if (!id || !decision) return NextResponse.json({ ok: false, message: 'quote_request_id and a valid decision are required' }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  const db = getSupabaseClient({ admin: true });
  // The opportunity must belong to THIS buyer (matched by verified email) and have a quote.
  const { data: opp } = await db.from('quote_requests')
    .select('id, vendor_id, quote_amount, public_ref')
    .eq('id', id).ilike('email', likeLiteral(session.email)).maybeSingle();
  if (!opp) return NextResponse.json({ ok: false, message: 'Quote not found' }, { status: 404 });
  if (opp.quote_amount == null) return NextResponse.json({ ok: false, message: 'This request has no quote yet' }, { status: 400 });

  const now = new Date().toISOString();
  await db.from('quote_requests').update({
    buyer_decision: decision,
    status: decision === 'accepted' ? 'won' : 'lost',
    updated_at: now,
  }).eq('id', id);
  await db.from('commissions').update({
    status: decision === 'accepted' ? 'accepted' : 'lost',
    updated_at: now,
  }).eq('quote_request_id', id);

  // Tell the vendor the buyer's decision.
  await notifyVendor(db, opp.vendor_id as string, id, 'decision', `Buyer ${decision} your quote (${opp.public_ref})`);
  const { data: v } = await db.from('vendor_profiles').select('email, company_name').eq('id', opp.vendor_id).maybeSingle();
  if (v?.email) {
    sendMail({
      to: v.email as string,
      subject: `NXT//LINK: your quote ${opp.public_ref} was ${decision}`,
      body: `The buyer ${decision} your quote (${opp.public_ref}) inside NXT//LINK.${decision === 'accepted' ? ' Continue the deal through NXT//LINK — the commission and protected period are recorded.' : ''}`,
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true, decision });
}
