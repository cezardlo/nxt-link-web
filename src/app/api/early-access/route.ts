// POST /api/early-access — public waitlist capture for the homepage vendor CTA
// ("Apply for early access"). Concierge MVP: we collect interest, then onboard
// each vendor high-touch. Honeypot + min-fill-time anti-bot; server-only writes.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { sendMail } from '@/lib/mail';
import { isEmailBanned } from '@/lib/vendor/moderation';

const MIN_FILL_MS = 1500;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid request' }, { status: 400 }); }

  // Anti-bot: honeypot + minimum time-on-form.
  if (typeof body.website_url === 'string' && body.website_url.trim()) return NextResponse.json({ ok: true });
  const started = Number(body.started_at);
  if (Number.isFinite(started) && Date.now() - started < MIN_FILL_MS) return NextResponse.json({ ok: true });

  const s = (k: string, max = 200): string | null =>
    typeof body[k] === 'string' && (body[k] as string).trim() ? (body[k] as string).trim().slice(0, max) : null;

  const email = s('email', 160);
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, message: 'Please enter a valid work email.' }, { status: 400 });
  }

  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true }); // fail open for the user; nothing to store

  const db = getSupabaseClient({ admin: true });

  // A permanently banned vendor cannot reapply with the same email. Fail quietly
  // (same shape as success) so we don't advertise the ban to a bad actor.
  if (body.kind !== 'buyer' && await isEmailBanned(db, email)) {
    return NextResponse.json({ ok: true });
  }

  const row = {
    kind: body.kind === 'buyer' ? 'buyer' : 'vendor',
    company_name: s('company_name', 200),
    contact_name: s('contact_name', 160),
    email,
    phone: s('phone', 60),
    role: s('role', 120),
    city: s('city', 120),
    note: s('note', 1000),
    categories: Array.isArray(body.categories) ? (body.categories as unknown[]).map((c) => String(c).slice(0, 80)).slice(0, 20) : null,
    source: 'homepage',
  };
  const { error } = await db.from('early_access_leads').insert(row);
  if (error) return NextResponse.json({ ok: false, message: 'Could not save — please try again.' }, { status: 500 });

  // Notify the NXT//LINK team so they can reach out high-touch.
  const notifyTo = process.env.EARLY_ACCESS_NOTIFY_EMAIL || process.env.ADMIN_NOTIFY_EMAIL;
  if (notifyTo) {
    sendMail({
      to: notifyTo,
      subject: `NXT//LINK early access: ${row.company_name || email} (${row.kind})`,
      body: `New early-access request.\n\nCompany: ${row.company_name || '—'}\nContact: ${row.contact_name || '—'}\nEmail: ${email}\nPhone: ${row.phone || '—'}\nRole: ${row.role || '—'}\nCity: ${row.city || '—'}\nNote: ${row.note || '—'}`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
