// GET /api/cron/invite-reminders — the automated invite reminder cadence
// (cloned from the proven profile-nudges pattern; CRON_SECRET-protected,
// scheduled in vercel.json). Three waves per MASTER-PLAN §3 resolution #2:
//   day 2 → "quoting is free"           (sets reminded_2_at)
//   day 5 → fee rules, VARIANT B copy   (sets reminded_5_at)
//   day 9 → honest final close          (sets reminded_9_at) — sequence ends
//   day 30 → mark expired (operator can re-invite with a fresh token)
// HARD CAP: 4 emails total (invite + 3 reminders) — each wave sends at most
// once, guarded by its timestamp. If a wave was missed (cron downtime), only
// the highest due wave is sent and the skipped ones are stamped WITHOUT
// sending, so nobody ever gets out-of-order or extra emails.
// STOP RULES (enforced by the status filter): account created (signup),
// opted_out (unsubscribe link), declined (operator marks a reply), expired.
// Clicking alone does NOT stop reminders (Growth stop rules).
//
// Also recomputes late-funnel statuses nightly for linked invites:
// account_created → profile_complete (same completeness bar as the profile
// nudge cron) → listed (≥1 published listing). Keeps the hot profile-save
// path untouched.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { requireCronSecret } from '@/lib/http/cron-auth';
import { sendMail } from '@/lib/mail';
import { inviteEmail, type InviteWave } from '@/lib/invites/emails';

const DAY = 24 * 3600 * 1000;

interface InviteRow {
  id: string; token: string; contact_name: string; company_name: string;
  email: string | null; locale: string; invited_by: string | null; status: string;
  sent_at: string | null; created_at: string; expires_at: string;
  reminded_2_at: string | null; reminded_5_at: string | null; reminded_9_at: string | null;
}

export async function GET(req: NextRequest) {
  const auth = requireCronSecret(req.headers);
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  const db = getSupabaseClient({ admin: true });
  const now = Date.now();
  const nowIso = () => new Date().toISOString();

  // ---- Reminder waves ------------------------------------------------------
  const { data } = await db.from('vendor_invites')
    .select('id, token, contact_name, company_name, email, locale, invited_by, status, sent_at, created_at, expires_at, reminded_2_at, reminded_5_at, reminded_9_at')
    .in('status', ['invited', 'reminded', 'clicked'])
    .order('created_at', { ascending: true })
    .limit(200);

  let sent2 = 0, sent5 = 0, sent9 = 0, expired = 0, skipped = 0;
  for (const inv of (data || []) as InviteRow[]) {
    const base = inv.sent_at || inv.created_at;
    const ageDays = (now - new Date(base).getTime()) / DAY;

    // Day 30 (or explicit expires_at): the sequence is over, the link dies.
    if (ageDays >= 30 || new Date(inv.expires_at).getTime() < now) {
      await db.from('vendor_invites').update({ status: 'expired' }).eq('id', inv.id);
      expired++;
      continue;
    }
    if (!inv.email) { skipped++; continue; }

    // Highest due wave only; stamp skipped lower waves so they never fire late.
    let wave: InviteWave | null = null;
    const patch: Record<string, unknown> = {};
    if (ageDays >= 9 && !inv.reminded_9_at) {
      wave = 'day9';
      patch.reminded_9_at = nowIso();
      if (!inv.reminded_5_at) patch.reminded_5_at = nowIso();
      if (!inv.reminded_2_at) patch.reminded_2_at = nowIso();
    } else if (ageDays >= 5 && !inv.reminded_5_at) {
      wave = 'day5';
      patch.reminded_5_at = nowIso();
      if (!inv.reminded_2_at) patch.reminded_2_at = nowIso();
    } else if (ageDays >= 2 && !inv.reminded_2_at) {
      wave = 'day2';
      patch.reminded_2_at = nowIso();
    }
    if (!wave) { skipped++; continue; }

    const mail = inviteEmail(inv, wave);
    await sendMail({ to: inv.email, subject: mail.subject, body: mail.body }).catch(() => {});
    if (inv.status === 'invited') patch.status = 'reminded';
    await db.from('vendor_invites').update(patch).eq('id', inv.id);
    if (wave === 'day2') sent2++; else if (wave === 'day5') sent5++; else sent9++;
  }

  // ---- Late-funnel recompute (account_created → profile_complete → listed) --
  let advancedProfile = 0, advancedListed = 0;
  const { data: linked } = await db.from('vendor_invites')
    .select('id, vendor_id, status')
    .in('status', ['account_created', 'profile_complete'])
    .not('vendor_id', 'is', null)
    .limit(200);

  for (const inv of (linked || []) as { id: string; vendor_id: string; status: string }[]) {
    const { data: vp } = await db.from('vendor_profiles')
      .select('id, logo_path, description, categories')
      .eq('id', inv.vendor_id).maybeSingle();
    if (!vp) continue;

    // Same completeness bar as the profile-nudges cron: logo + ≥40-char
    // description + ≥1 category.
    const complete = Boolean(vp.logo_path)
      && String(vp.description || '').trim().length >= 40
      && Array.isArray(vp.categories) && vp.categories.length > 0;

    if (inv.status === 'account_created' && complete) {
      await db.from('vendor_invites').update({ status: 'profile_complete', profile_complete_at: nowIso() }).eq('id', inv.id);
      inv.status = 'profile_complete';
      advancedProfile++;
    }

    if (inv.status === 'profile_complete') {
      const [{ count: prods }, { count: servs }] = await Promise.all([
        db.from('marketplace_products').select('id', { count: 'exact', head: true }).eq('vendor_id', inv.vendor_id).eq('status', 'published'),
        db.from('marketplace_services').select('id', { count: 'exact', head: true }).eq('vendor_id', inv.vendor_id).eq('status', 'published'),
      ]);
      if ((prods || 0) + (servs || 0) > 0) {
        await db.from('vendor_invites').update({ status: 'listed', listed_at: nowIso() }).eq('id', inv.id);
        advancedListed++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent_day2: sent2, sent_day5: sent5, sent_day9: sent9,
    expired, skipped,
    advanced_profile_complete: advancedProfile, advanced_listed: advancedListed,
  });
}
