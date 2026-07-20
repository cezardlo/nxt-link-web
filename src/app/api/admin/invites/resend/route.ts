// POST /api/admin/invites/resend — manually re-send an invite email.
//   - Open pre-account invite (invited/reminded/clicked): re-sends Email 1 on
//     the same token WITHOUT touching the reminder clock (sent_at unchanged),
//     so the automated day 2/5/9 cadence and its 4-email hard cap stay intact.
//     This is an operator-initiated extra touch, not part of the sequence.
//   - Expired invite: issues a FRESH token and restarts the sequence from
//     scratch (per the onboarding plan: re-inviting after expiry = new token).
//   - Never for opted_out / declined / already_vendor / account_created+ —
//     unsubscribes are honored absolutely, and signed-up vendors are handled
//     by the existing profile-nudge cron instead.
// Admin-only.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isAdminRequest } from '@/lib/assistant/auth';
import { sendMail } from '@/lib/mail';
import { inviteEmail, joinUrl } from '@/lib/invites/emails';

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Admin only' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  let body: { id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ ok: false, message: 'id required' }, { status: 400 });

  const db = getSupabaseClient({ admin: true });
  const { data: inv } = await db.from('vendor_invites')
    .select('id, token, contact_name, company_name, email, locale, invited_by, status, expires_at')
    .eq('id', id).maybeSingle();
  if (!inv) return NextResponse.json({ ok: false, message: 'Invite not found' }, { status: 404 });
  if (!inv.email) return NextResponse.json({ ok: false, message: 'This invite has no email on file.' }, { status: 400 });

  const status = inv.status as string;
  if (status === 'opted_out') return NextResponse.json({ ok: false, message: 'They unsubscribed — we never email them again.' }, { status: 409 });
  if (!['invited', 'reminded', 'clicked', 'expired'].includes(status)) {
    return NextResponse.json({ ok: false, message: `Cannot resend an invite in status '${status}'.` }, { status: 409 });
  }

  const isExpired = status === 'expired' || new Date(inv.expires_at as string).getTime() < Date.now();
  let token = inv.token as string;

  if (isExpired) {
    // Fresh token, fresh 30-day window, sequence restarts from day 0.
    token = randomBytes(24).toString('base64url');
    const { error } = await db.from('vendor_invites').update({
      token,
      status: 'invited',
      sent_at: new Date().toISOString(),
      reminded_2_at: null, reminded_5_at: null, reminded_9_at: null,
      clicked_at: null,
      expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    }).eq('id', id);
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const mail = inviteEmail({ token, contact_name: inv.contact_name as string, company_name: inv.company_name as string, locale: inv.locale as string, invited_by: null }, 'invite');
  await sendMail({ to: inv.email as string, subject: mail.subject, body: mail.body }).catch(() => {});

  return NextResponse.json({ ok: true, reinvited: isExpired, join_url: joinUrl(token) });
}
