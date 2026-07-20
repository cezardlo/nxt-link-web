// GET /api/cron/profile-nudges — email vendors whose profile is still
// incomplete, nudging them back to finish it. Two waves: ~24h and ~72h after
// signup, each sent at most once. Protected by CRON_SECRET (Vercel adds the
// Authorization: Bearer header automatically on scheduled runs).

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { requireCronSecret } from '@/lib/http/cron-auth';
import { sendMail } from '@/lib/mail';

const H = 3600 * 1000;
const PORTAL_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nxt-link-web.vercel.app').replace(/\/$/, '') + '/vendor/portal';

interface Row {
  id: string; email: string | null; contact_name: string | null; company_name: string | null;
  logo_path: string | null; description: string | null; categories: string[] | null;
  created_at: string; nudge_24_at: string | null; nudge_72_at: string | null; moderation_status: string | null;
}

// A profile is "complete enough" to stop nudging once it has a logo, a real
// description, and at least one category.
function isIncomplete(v: Row): boolean {
  const hasLogo = !!v.logo_path;
  const hasAbout = (v.description || '').trim().length >= 40;
  const hasCats = Array.isArray(v.categories) && v.categories.length > 0;
  return !(hasLogo && hasAbout && hasCats);
}

function body(name: string, wave: 24 | 72): string {
  const hi = name ? `Hi ${name},` : 'Hi,';
  const line = wave === 24
    ? 'You’re almost there — your NXT//LINK vendor profile just needs a few finishing touches so buyers can find and trust you.'
    : 'Your NXT//LINK vendor profile is still unfinished. Buyers can’t see you until it’s complete — it only takes a few minutes.';
  return `${hi}\n\n${line}\n\nFinish these to go live:\n• Add your logo\n• Write a short company description (or tap “Write it for me”)\n• Pick your categories\n• Add a product or service with a price\n\nPick up where you left off: ${PORTAL_URL}\n\n— NXT//LINK`;
}

export async function GET(req: NextRequest) {
  const auth = requireCronSecret(req.headers);
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  const db = getSupabaseClient({ admin: true });
  const now = Date.now();

  // Candidates: active vendors signed up in the last ~10 days who still owe a nudge.
  const since = new Date(now - 10 * 24 * H).toISOString();
  const { data } = await db.from('vendor_profiles')
    .select('id, email, contact_name, company_name, logo_path, description, categories, created_at, nudge_24_at, nudge_72_at, moderation_status')
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(200);

  let sent24 = 0, sent72 = 0, skipped = 0;
  for (const v of (data || []) as Row[]) {
    if (!v.email || v.moderation_status === 'banned' || v.moderation_status === 'suspended') { skipped++; continue; }
    if (!isIncomplete(v)) { skipped++; continue; }
    const ageH = (now - new Date(v.created_at).getTime()) / H;
    const name = (v.contact_name || '').trim().split(/\s+/)[0] || '';

    if (ageH >= 72 && !v.nudge_72_at) {
      await sendMail({ to: v.email, subject: 'Finish your NXT//LINK profile to start getting buyers', body: body(name, 72) }).catch(() => {});
      await db.from('vendor_profiles').update({ nudge_72_at: new Date().toISOString() }).eq('id', v.id);
      sent72++;
    } else if (ageH >= 24 && !v.nudge_24_at) {
      await sendMail({ to: v.email, subject: 'You’re almost live on NXT//LINK', body: body(name, 24) }).catch(() => {});
      await db.from('vendor_profiles').update({ nudge_24_at: new Date().toISOString() }).eq('id', v.id);
      sent24++;
    } else {
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, sent_24h: sent24, sent_72h: sent72, skipped });
}
