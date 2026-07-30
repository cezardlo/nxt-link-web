// GET  /api/buyer/messages?quote_request_id= — thread for MY request (text + attachments)
// POST /api/buyer/messages
//   - JSON      {quote_request_id, body}                         — text message (unchanged)
//   - multipart {quote_request_id, body?, file (repeatable)}      — message with 1-5 file attachments
// Buyer<->vendor chat, scoped to the buyer's own (verified-email) opportunity.
//
// Attachments reuse the private 'vendor-brochures' Storage bucket under a
// 'message-attachments/<quote_request_id>/' prefix (see
// src/lib/messages/attachmentsServer.ts + the 20260727 migration) — same
// signed-URL-on-read pattern as vendor brochures, no new bucket needed.
//
// KNOWN POLICY GAP (flagged in security review 2026-07-27; the FILE NAME
// leak was fixed — see below — the FILE CONTENTS gap was accepted, not
// solved): text bodies AND attachment file names are contact-masked
// pre-acceptance via maskContacts() (display-only — the DB row and storage
// path are untouched, see displayAttachmentName() in attachmentsServer.ts).
// An uploaded FILE'S CONTENTS still cannot be scanned/masked the same way —
// a spec sheet or PO could contain a phone number or email inside the
// document itself. Files are intentionally allowed pre-acceptance anyway
// (sharing specs/drawings before a vendor can quote is the whole point of
// attachments), so this remains a real anti-circumvention leak vector that
// no masking can fully cover.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getBuyerSession } from '@/lib/buyer/auth';
import { notifyVendor } from '@/lib/notify';
import { maskContacts } from '@/lib/guard';
import { decideBuyerThreadAccess } from '@/lib/messages/authz';
import { validateAttachmentBatch } from '@/lib/messages/attachments';
import { loadMessageAttachments, uploadMessageAttachments } from '@/lib/messages/attachmentsServer';

function likeLiteral(v: string): string { return v.replace(/[\\%_]/g, (c) => `\\${c}`); }

async function ownedThread(qrId: string) {
  const session = await getBuyerSession();
  const configured = isSupabaseConfigured();

  let db: SupabaseClient | null = null;
  let ownsRequest = false;
  const emailConfirmed = !!(session?.email && session.emailConfirmed);
  if (session && emailConfirmed && configured) {
    db = getSupabaseClient({ admin: true });
    const { data: opp } = await db.from('quote_requests').select('id').eq('id', qrId).ilike('email', likeLiteral(session.email as string)).maybeSingle();
    ownsRequest = !!opp;
  }

  const decision = decideBuyerThreadAccess({ hasSession: !!session, emailConfirmed, configured, ownsRequest });
  switch (decision) {
    case 'unauthenticated': return { err: NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 }) };
    case 'email_unverified': return { err: NextResponse.json({ ok: false, message: 'Verify your email first' }, { status: 403 }) };
    case 'not_configured': return { err: NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 }) };
    case 'not_found': return { err: NextResponse.json({ ok: false, message: 'Request not found' }, { status: 404 }) };
    default: return { db: db as SupabaseClient };
  }
}

export async function GET(req: Request) {
  const qrId = new URL(req.url).searchParams.get('quote_request_id') || '';
  if (!qrId) return NextResponse.json({ ok: false, message: 'quote_request_id is required' }, { status: 400 });
  const { db, err } = await ownedThread(qrId);
  if (err) return err;
  const { data } = await db.from('messages').select('id, sender, body, created_at').eq('quote_request_id', qrId).order('created_at').limit(200);
  const messages = data || [];
  // FIX I-2: attachment file NAMES get the same pre-acceptance masking as
  // message bodies — mirrors the exact `buyer_decision !== 'accepted'` check
  // the POST handlers use for text.
  const { data: opp } = await db.from('quote_requests')
    .select('buyer_decision, quote_amount, quote_currency, quote_timeline, quote_valid_until, quote_payment_terms, quote_warranty, quote_message, quoted_at, created_at')
    .eq('id', qrId).maybeSingle();
  const maskNames = opp?.buyer_decision !== 'accepted';
  const attachmentsByMessage = await loadMessageAttachments(db, messages.map((m) => m.id as string), { maskNames });
  const withAttachments = messages.map((m) => ({ ...m, attachments: attachmentsByMessage[m.id as string] || [] }));

  // R4 offer-in-chat: this thread's structured proposal history (drafts
  // excluded — a vendor's private WIP is never a buyer-visible offer card),
  // plus whether the buyer has read the "you got a quote" notification (the
  // real, existing signal behind the "Seen" status — same one the dashboard's
  // unreadChatIds hint already reads, just for type:'quote' instead of
  // 'message'). See src/lib/messages/offerTimeline.ts for how these combine.
  const [{ data: proposals }, { data: quoteNotifs }, { data: commission }] = await Promise.all([
    db.from('quote_proposals')
      .select('id, revision, status, total, currency, lead_time, valid_until, payment_terms, warranty, notes, submitted_at, created_at')
      .eq('quote_request_id', qrId).order('revision', { ascending: true }).limit(50),
    db.from('notifications').select('read_at').eq('quote_request_id', qrId).eq('recipient', 'buyer').eq('type', 'quote').limit(20),
    db.from('commissions').select('invoice_number, status').eq('quote_request_id', qrId).maybeSingle(),
  ]);
  const buyerHasSeenOffer = (quoteNotifs || []).some((n) => !!n.read_at);

  return NextResponse.json({
    ok: true,
    messages: withAttachments,
    proposals: proposals || [],
    offer: opp
      ? {
          buyer_decision: opp.buyer_decision ?? null,
          buyer_has_seen_offer: buyerHasSeenOffer,
          commission: commission ? { invoice_number: commission.invoice_number ?? null, status: commission.status ?? null } : null,
          legacy: {
            id: qrId,
            quote_amount: opp.quote_amount ?? null,
            quote_currency: opp.quote_currency ?? null,
            quote_timeline: opp.quote_timeline ?? null,
            quote_valid_until: opp.quote_valid_until ?? null,
            quote_payment_terms: opp.quote_payment_terms ?? null,
            quote_warranty: opp.quote_warranty ?? null,
            quote_message: opp.quote_message ?? null,
            quoted_at: opp.quoted_at ?? null,
            created_at: opp.created_at,
          },
        }
      : null,
  });
}

export async function POST(req: Request) {
  const ctype = req.headers.get('content-type') || '';
  if (ctype.includes('multipart/form-data')) return handleAttachmentUpload(req);

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
  return NextResponse.json({ ok: true, message: { ...data, attachments: [] }, guarded });
}

async function handleAttachmentUpload(req: Request) {
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ ok: false, code: 'bad_form', message: 'Expected multipart form-data' }, { status: 400 }); }

  const qrId = String(form.get('quote_request_id') || '');
  let text = String(form.get('body') || '').trim().slice(0, 3000);
  if (!qrId) return NextResponse.json({ ok: false, message: 'quote_request_id is required' }, { status: 400 });

  const { db, err } = await ownedThread(qrId);
  if (err) return err;

  const files = form.getAll('file').filter((f): f is File => f instanceof File && f.size > 0);
  const validation = validateAttachmentBatch(files.map((f) => ({ name: f.name, size: f.size })));
  if (!validation.ok) {
    return NextResponse.json({ ok: false, code: validation.error.code, message: validation.error.message }, { status: 400 });
  }

  const { data: opp } = await db.from('quote_requests').select('vendor_id, public_ref, buyer_decision').eq('id', qrId).maybeSingle();
  const maskNames = opp?.buyer_decision !== 'accepted';
  // Anti-circumvention: mask contact details in the TEXT part (unchanged)
  // AND in each attachment's display/download file name (FIX I-2, below) —
  // a file's actual CONTENTS still cannot be scanned the same way. See the
  // file-level note at the top of this route.
  let guarded = false;
  if (maskNames && text) {
    const g = maskContacts(text);
    text = g.masked; guarded = g.found;
  }

  const { data: msgRow, error: msgErr } = await db.from('messages').insert({ quote_request_id: qrId, sender: 'buyer', body: text }).select('id, sender, body, created_at').single();
  if (msgErr || !msgRow) return NextResponse.json({ ok: false, message: msgErr?.message || 'Could not send message' }, { status: 500 });

  const uploads = await Promise.all(files.map(async (f) => ({ name: f.name, type: f.type, bytes: new Uint8Array(await f.arrayBuffer()) })));
  const result = await uploadMessageAttachments(db, qrId, msgRow.id as string, uploads, { maskNames });
  if (!result.ok) return NextResponse.json({ ok: false, message: result.message }, { status: 500 });

  if (opp?.vendor_id) await notifyVendor(db, opp.vendor_id as string, qrId, 'message', `New message from the buyer on ${opp.public_ref} (with attachment)`);
  return NextResponse.json({ ok: true, message: { ...msgRow, attachments: result.attachments }, guarded });
}
