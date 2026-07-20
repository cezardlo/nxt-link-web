// Operator vendor invites — the 3-field capture behind /admin/invites.
//   GET   → list invites (newest first) + funnel counts for the strip.
//   POST  → create an invite from { company_name, contact_name, email, locale }
//           after dedup checks, then send the bilingual invite email with the
//           /join/<token> link.
//   PATCH → { id, action: 'decline' } — operator marks "not now" / vendor
//           replied no. This is the manual stop lever: declined invites never
//           get another reminder (Growth stop rule: any reply halts the run).
// Admin-only (same access gate as the rest of /admin). Email channel only —
// SMS is Phase 2 (needs 10DLC registration + legal check).

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isAdminRequest } from '@/lib/assistant/auth';
import { isEmailBanned } from '@/lib/vendor/moderation';
import { sendMail } from '@/lib/mail';
import { inviteEmail, joinUrl } from '@/lib/invites/emails';

const INVITE_COLS = 'id, token, contact_name, company_name, email, phone, channel, locale, source, invited_by, status, sent_at, reminded_2_at, reminded_5_at, reminded_9_at, clicked_at, account_created_at, profile_complete_at, listed_at, opted_out_at, expires_at, auth_id, vendor_id, created_at';

// Statuses where the invite is still "live" (pre-terminal) — used for dedup.
const OPEN_STATUSES = ['invited', 'reminded', 'clicked', 'account_created', 'profile_complete', 'listed'];

function esc(v: string): string { return v.replace(/[\\%_]/g, (c) => `\\${c}`); }
function newToken(): string { return randomBytes(24).toString('base64url'); } // 32 chars
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Admin only' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, invites: [], counts: {} });
  const db = getSupabaseClient({ admin: true });

  const { data } = await db.from('vendor_invites').select(INVITE_COLS).order('created_at', { ascending: false }).limit(300);
  const invites = (data || []).map((i) => ({ ...i, join_url: joinUrl(i.token as string) }));

  const counts: Record<string, number> = {};
  for (const i of invites) counts[i.status as string] = (counts[i.status as string] || 0) + 1;

  return NextResponse.json({ ok: true, invites, counts });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Admin only' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  let body: { company_name?: string; contact_name?: string; email?: string; locale?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }

  const company = String(body.company_name || '').trim();
  const contact = String(body.contact_name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const locale = body.locale === 'es' ? 'es' : 'en';
  if (!company || !contact) return NextResponse.json({ ok: false, message: 'Company and contact name are required.' }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, message: 'A valid email is required.' }, { status: 400 });

  const db = getSupabaseClient({ admin: true });

  // Dedup 4: banned emails never get an invite.
  if (await isEmailBanned(db, email)) {
    return NextResponse.json({ ok: false, message: 'This email belongs to a banned vendor — no invite sent.' }, { status: 409 });
  }

  // Unsubscribes are absolute (Growth stop rule): an email that opted out of
  // a previous invite never gets a new one, even via a fresh capture.
  const { data: optedOut } = await db.from('vendor_invites')
    .select('id').ilike('email', esc(email)).eq('status', 'opted_out').limit(1).maybeSingle();
  if (optedOut) {
    return NextResponse.json({ ok: false, message: 'This email unsubscribed from invite emails — we never email them again.' }, { status: 409 });
  }

  // Dedup 1: already a live vendor → record the hit, send nothing.
  const { data: vp } = await db.from('vendor_profiles')
    .select('id, company_name').ilike('email', esc(email)).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (vp) {
    await db.from('vendor_invites').insert({
      token: newToken(), contact_name: contact, company_name: company, email, locale,
      channel: 'email', source: 'admin', invited_by: 'admin', status: 'already_vendor', vendor_id: vp.id,
    });
    return NextResponse.json({ ok: true, already_vendor: true, message: `Already a live vendor (${vp.company_name || email}) — nothing was sent.` });
  }

  // Dedup 2: an open invite already exists → offer Resend instead.
  const { data: openInv } = await db.from('vendor_invites')
    .select('id, status').ilike('email', esc(email)).in('status', OPEN_STATUSES).limit(1).maybeSingle();
  if (openInv) {
    return NextResponse.json({ ok: false, duplicate: true, invite_id: openInv.id, message: 'An open invite already exists for this email — use Resend on its row instead.' }, { status: 409 });
  }

  // Dedup 3: a pending /apply application → approve it there instead of double-tracking.
  const { data: pendingApp } = await db.from('vendor_applications')
    .select('id').ilike('email', esc(email)).eq('status', 'pending').limit(1).maybeSingle();
  if (pendingApp) {
    return NextResponse.json({ ok: false, pending_application: true, message: 'This email has a pending vendor application — approve it in Vendor applications instead.' }, { status: 409 });
  }

  // Create + send.
  const token = newToken();
  const { data: inv, error } = await db.from('vendor_invites').insert({
    token, contact_name: contact, company_name: company, email, locale,
    channel: 'email', source: 'admin', invited_by: 'admin',
    status: 'invited', sent_at: new Date().toISOString(),
  }).select(INVITE_COLS).single();
  if (error || !inv) return NextResponse.json({ ok: false, message: error?.message || 'Could not create the invite.' }, { status: 500 });

  const mail = inviteEmail({ token, contact_name: contact, company_name: company, locale, invited_by: null }, 'invite');
  await sendMail({ to: email, subject: mail.subject, body: mail.body }).catch(() => {});

  return NextResponse.json({ ok: true, invite: { ...inv, join_url: joinUrl(token) } });
}

export async function PATCH(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Admin only' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  let body: { id?: string; action?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const id = String(body.id || '');
  if (!id || body.action !== 'decline') return NextResponse.json({ ok: false, message: "id and action 'decline' required" }, { status: 400 });

  const db = getSupabaseClient({ admin: true });
  const { data: inv } = await db.from('vendor_invites').select('id, status').eq('id', id).maybeSingle();
  if (!inv) return NextResponse.json({ ok: false, message: 'Invite not found' }, { status: 404 });
  if (!['invited', 'reminded', 'clicked', 'expired'].includes(inv.status as string)) {
    return NextResponse.json({ ok: false, message: `Cannot decline an invite in status '${inv.status}'.` }, { status: 409 });
  }

  await db.from('vendor_invites').update({ status: 'declined' }).eq('id', id);
  return NextResponse.json({ ok: true, status: 'declined' });
}
