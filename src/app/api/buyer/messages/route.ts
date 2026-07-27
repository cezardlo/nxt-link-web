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
// KNOWN POLICY GAP (flagged for security review, not solved here): text
// bodies are contact-masked pre-acceptance via maskContacts(), but an
// uploaded FILE cannot be scanned/masked the same way — a spec sheet or PO
// could contain a phone number or email inside the document itself. Files
// are intentionally allowed pre-acceptance anyway (sharing specs/drawings
// before a vendor can quote is the whole point of attachments), so this is a
// real anti-circumvention leak vector that text-masking does not cover.

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
  const attachmentsByMessage = await loadMessageAttachments(db, messages.map((m) => m.id as string));
  const withAttachments = messages.map((m) => ({ ...m, attachments: attachmentsByMessage[m.id as string] || [] }));
  return NextResponse.json({ ok: true, messages: withAttachments });
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
  // Anti-circumvention: mask contact details in the TEXT part only — a
  // file's contents cannot be scanned the same way. See the file-level note
  // at the top of this route.
  let guarded = false;
  if (opp?.buyer_decision !== 'accepted' && text) {
    const g = maskContacts(text);
    text = g.masked; guarded = g.found;
  }

  const { data: msgRow, error: msgErr } = await db.from('messages').insert({ quote_request_id: qrId, sender: 'buyer', body: text }).select('id, sender, body, created_at').single();
  if (msgErr || !msgRow) return NextResponse.json({ ok: false, message: msgErr?.message || 'Could not send message' }, { status: 500 });

  const uploads = await Promise.all(files.map(async (f) => ({ name: f.name, type: f.type, bytes: new Uint8Array(await f.arrayBuffer()) })));
  const result = await uploadMessageAttachments(db, qrId, msgRow.id as string, uploads);
  if (!result.ok) return NextResponse.json({ ok: false, message: result.message }, { status: 500 });

  if (opp?.vendor_id) await notifyVendor(db, opp.vendor_id as string, qrId, 'message', `New message from the buyer on ${opp.public_ref} (with attachment)`);
  return NextResponse.json({ ok: true, message: { ...msgRow, attachments: result.attachments }, guarded });
}
