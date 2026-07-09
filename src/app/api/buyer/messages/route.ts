// GET  /api/buyer/messages?quote_request_id= — thread for MY request
// POST /api/buyer/messages {quote_request_id, body} — send as buyer
// Buyer<->vendor chat, scoped to the buyer's own (verified-email) opportunity.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getBuyerSession } from '@/lib/buyer/auth';
import { notifyVendor } from '@/lib/notify';
import { maskContacts } from '@/lib/guard';

function likeLiteral(v: string): string { return v.replace(/[\\%_]/g, (c) => `\\${c}`); }

async function ownedThread(qrId: string) {
  const session = await getBuyerSession();
  if (!session) return { err: NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 }) };
  if (!session.email || !session.emailConfirmed) return { err: NextResponse.json({ ok: false, message: 'Verify your email first' }, { status: 403 }) };
  if (!isSupabaseConfigured()) return { err: NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 }) };
  const db = getSupabaseClient({ admin: true });
  const { data: opp } = await db.from('quote_requests').select('id').eq('id', qrId).ilike('email', likeLiteral(session.email)).maybeSingle();
  if (!opp) return { err: NextResponse.json({ ok: false, message: 'Request not found' }, { status: 404 }) };
  return { db };
}

export async function GET(req: Request) {
  const qrId = new URL(req.url).searchParams.get('quote_request_id') || '';
  if (!qrId) return NextResponse.json({ ok: false, message: 'quote_request_id is required' }, { status: 400 });
  const { db, err } = await ownedThread(qrId);
  if (err) return err;
  const { data } = await db.from('messages').select('id, sender, body, created_at').eq('quote_request_id', qrId).order('created_at').limit(200);
  return NextResponse.json({ ok: true, messages: data || [] });
}

export async function POST(req: Request) {
  let body: { quote_request_id?: string; body?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const qrId = String(body.quote_request_id || '');
  let text = String(body.body || '').trim().slice(0, 3000);
  if (!qrId || !text) return NextResponse.json({ ok: false, message: 'quote_request_id and body are required' }, { status: 400 });
  const { db, err } = await ownedThread(qrId);
  if (err) return err;
  const { data: opp } = await db.from('quote_requests').select('vendor_id, public_ref, buyer_decision').eq('id', qrId).maybeSingle();
  // Anti-circumvention: no contact details in chat until the buyer accepts.
  let guarded = false;
  if (opp?.buyer_decision !== 'accepted') {
    const g = maskContacts(text);
    text = g.masked; guarded = g.found;
  }
  const { data, error } = await db.from('messages').insert({ quote_request_id: qrId, sender: 'buyer', body: text }).select('id, sender, body, created_at').single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  if (opp?.vendor_id) await notifyVendor(db, opp.vendor_id as string, qrId, 'message', `New message from the buyer on ${opp.public_ref}`);
  return NextResponse.json({ ok: true, message: data, guarded });
}
