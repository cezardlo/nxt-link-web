// POST /api/buyer/request-attachments — attach ONE file to MY OWN request
//   multipart {quote_request_id, file}
// Buyer-only upload (Slice R5). Vendors are read-only — their view comes
// through GET /api/vendor/leads, which already embeds attachments (see
// src/lib/requests/attachmentsServer.ts). Reuses the EXACT ownership decision
// buyer<->vendor messages already use (src/lib/messages/authz.ts) — a
// request attachment is owned by whoever owns the request itself, same rule.
//
// One file per call (see src/lib/requests/attachments.ts for why — Vercel's
// ~4.5 MB serverless body cap). The upload UI calls this once per selected
// file, sequentially.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getBuyerSession } from '@/lib/buyer/auth';
import { decideBuyerThreadAccess } from '@/lib/messages/authz';
import { validateRequestAttachment, MAX_REQUEST_ATTACHMENTS_PER_REQUEST } from '@/lib/requests/attachments';
import { uploadRequestAttachment } from '@/lib/requests/attachmentsServer';

function likeLiteral(v: string): string { return v.replace(/[\\%_]/g, (c) => `\\${c}`); }

async function ownedRequest(qrId: string) {
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

export async function POST(req: Request) {
  const ctype = req.headers.get('content-type') || '';
  if (!ctype.includes('multipart/form-data')) {
    return NextResponse.json({ ok: false, code: 'bad_form', message: 'Expected multipart form-data' }, { status: 400 });
  }
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ ok: false, code: 'bad_form', message: 'Expected multipart form-data' }, { status: 400 }); }

  const qrId = String(form.get('quote_request_id') || '');
  if (!qrId) return NextResponse.json({ ok: false, message: 'quote_request_id is required' }, { status: 400 });

  const { db, err } = await ownedRequest(qrId);
  if (err) return err;

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, code: 'no_file', message: 'Choose a file.' }, { status: 400 });
  }

  const { count: existingCount } = await db
    .from('request_attachments')
    .select('id', { count: 'exact', head: true })
    .eq('quote_request_id', qrId);

  const validation = validateRequestAttachment({ name: file.name, size: file.size }, existingCount || 0);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, code: validation.error.code, message: validation.error.message }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = await uploadRequestAttachment(db, qrId, { name: file.name, type: file.type, bytes });
  if (!result.ok) return NextResponse.json({ ok: false, message: result.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    attachment: result.attachment,
    remaining: Math.max(0, MAX_REQUEST_ATTACHMENTS_PER_REQUEST - (existingCount || 0) - 1),
  });
}
