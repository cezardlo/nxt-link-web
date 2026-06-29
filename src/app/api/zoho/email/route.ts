// POST /api/zoho/email  { to, subject, body, vendor_id?, request_ref?, cc? }
// Admin: send (or draft) an email through Zoho Mail and log it to the outbox.
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isAdminRequest } from '@/lib/assistant/auth';
import { sendZohoMail } from '@/lib/zoho/mail';

export async function POST(req: Request) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  let body: { to?: string; subject?: string; body?: string; cc?: string; vendor_id?: string; request_ref?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }

  const to = String(body.to || '').trim();
  const subject = String(body.subject || '').trim();
  const html = String(body.body || '').trim();
  if (!to || !subject || !html)
    return NextResponse.json({ ok: false, message: 'to, subject and body are required' }, { status: 400 });

  const result = await sendZohoMail({ to, subject, body: html, cc: body.cc });

  // Log to outbox (best-effort)
  if (isSupabaseConfigured()) {
    try {
      const db = getSupabaseClient({ admin: true });
      await db.from('zoho_outbox').insert({
        kind: 'email',
        vendor_id: body.vendor_id || null,
        request_ref: body.request_ref || null,
        to_address: to,
        subject,
        body: html,
        status: result.sent ? 'sent' : (result.ok ? 'draft' : 'failed'),
        provider: result.provider,
        error: result.error || null,
        zoho_id: result.zohoId || null,
      });
    } catch { /* ignore logging errors */ }
  }

  return NextResponse.json({
    ok: result.ok,
    sent: result.sent,
    provider: result.provider,
    drafted: !result.sent,
    message: result.sent ? 'Email sent via Zoho Mail'
      : result.provider === 'fallback' ? 'Saved as draft — connect Zoho Mail to send automatically'
      : (result.error || 'Could not send'),
  }, { status: result.ok ? 200 : 502 });
}
