// GET   /api/vendor/leads          — signed-in vendor: quote requests for MY listings
// PATCH /api/vendor/leads {id, status} — update status of MY lead

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';
import { sendMail } from '@/lib/mail';
import { maskContacts } from '@/lib/guard';
import { resolveDisplayedProtectedUntil } from '@/lib/fees/engine';

const STATUSES = ['new', 'viewed', 'responded', 'won', 'lost', 'spam'];

export async function GET() {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, leads: [] });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  const { data: leads } = await db.from('quote_requests')
    .select('id, public_ref, kind, product_id, service_id, company, contact_name, email, phone, message, answers, status, created_at, quote_amount, quote_currency, quote_message, quote_timeline, quote_valid_until, quoted_at, buyer_decision')
    .eq('vendor_id', vendor.id).order('created_at', { ascending: false }).limit(200);

  // Resolve listing names + commission amounts in bulk.
  const rows = leads || [];
  const pIds = Array.from(new Set(rows.map((l) => l.product_id).filter(Boolean)));
  const sIds = Array.from(new Set(rows.map((l) => l.service_id).filter(Boolean)));
  const ids = rows.map((l) => l.id);
  const [pRes, sRes, cRes, piRes] = await Promise.all([
    pIds.length ? db.from('marketplace_products').select('id, name').in('id', pIds) : Promise.resolve({ data: [] }),
    sIds.length ? db.from('marketplace_services').select('id, name').in('id', sIds) : Promise.resolve({ data: [] }),
    ids.length ? db.from('commissions').select('quote_request_id, commission_amount, effective_rate, status, protected_until, final_amount, invoice_number, due_date, paid_at').in('quote_request_id', ids) : Promise.resolve({ data: [] }),
    ids.length ? db.from('pilots').select('id, quote_request_id, kind, status, scheduled_for, location, scope, success_criteria, results, outcome').in('quote_request_id', ids).order('created_at') : Promise.resolve({ data: [] }),
  ]);
  const names = new Map<string, string>();
  for (const r of pRes.data || []) names.set(r.id as string, r.name as string);
  for (const r of sRes.data || []) names.set(r.id as string, r.name as string);
  const commissions = new Map<string, Record<string, unknown>>();
  for (const c of cRes.data || []) commissions.set(c.quote_request_id as string, c);

  // The REAL protected-introduction window is 12 months (PROTECTION_MONTHS,
  // src/lib/fees/engine.ts). `commissions.protected_until` only ever holds a
  // 90-day pre-acceptance quote-protection date (set at quote-send time by
  // /api/vendor/quote + /api/vendor/proposals); once the buyer accepts,
  // /api/buyer/quote-decision computes the real 12-month date but writes it
  // onto the linked manual_deals row, not back onto commissions. So for any
  // accepted lead, prefer manual_deals.protected_until (same source
  // /vendor/deals already reads) — display-only, nothing written here.
  const acceptedIds = rows.filter((l) => l.buyer_decision === 'accepted').map((l) => l.id as string);
  const dealProtectedUntil = new Map<string, string>();
  if (acceptedIds.length) {
    const { data: dealRows } = await db.from('manual_deals')
      .select('source_quote_id, protected_until').in('source_quote_id', acceptedIds);
    for (const d of dealRows || []) {
      if (d.source_quote_id && d.protected_until) dealProtectedUntil.set(d.source_quote_id as string, d.protected_until as string);
    }
  }

  // Buyer profile cards — shared ONLY for accepted deals (anti-circumvention).
  const acceptedEmails = Array.from(new Set(rows.filter((l) => l.buyer_decision === 'accepted' && l.email).map((l) => (l.email as string).toLowerCase())));
  const profiles = new Map<string, Record<string, unknown>>();
  if (acceptedEmails.length) {
    const { data: profRows } = await db.from('buyer_profiles')
      .select('buyer_email, company_name, contact_name, position, industry, city, phone, logo_path')
      .in('buyer_email', acceptedEmails);
    for (const p of profRows || []) {
      let logo_url: string | null = null;
      if (p.logo_path) {
        const { data: signed } = await db.storage.from('vendor-logos').createSignedUrl(p.logo_path as string, 3600);
        logo_url = signed?.signedUrl || null;
      }
      profiles.set((p.buyer_email as string).toLowerCase(), { company_name: p.company_name, contact_name: p.contact_name, position: p.position, industry: p.industry, city: p.city, phone: p.phone, logo_url });
    }
  }
  const pilotsByQr = new Map<string, unknown[]>();
  for (const p of piRes.data || []) {
    const arr = pilotsByQr.get(p.quote_request_id as string) || [];
    arr.push(p); pilotsByQr.set(p.quote_request_id as string, arr);
  }

  return NextResponse.json({
    ok: true,
    leads: rows.map((l) => {
      // Anti-circumvention: buyer contact details are revealed only after the
      // buyer accepts the quote. Until then, the conversation stays in-app.
      // Buyer FREE TEXT (message, bundle item notes) is masked pre-acceptance
      // too — buyers self-disclose emails/phones in it.
      const revealed = l.buyer_decision === 'accepted';
      const message = !revealed && typeof l.message === 'string' ? maskContacts(l.message).masked : l.message;
      const rawCommission = commissions.get(l.id as string) || null;
      const commission = rawCommission
        ? {
            ...rawCommission,
            protected_until: resolveDisplayedProtectedUntil({
              buyerDecision: l.buyer_decision as string | null,
              commissionProtectedUntil: rawCommission.protected_until as string | null,
              dealProtectedUntil: dealProtectedUntil.get(l.id as string) ?? null,
            }),
          }
        : null;
      let answers = l.answers as Record<string, unknown> | null;
      const items = answers && (answers as { items?: unknown[] }).items;
      if (!revealed && Array.isArray(items)) {
        answers = {
          ...answers,
          items: items.map((it) => {
            const item = it as Record<string, unknown> | null;
            return item && typeof item.note === 'string' ? { ...item, note: maskContacts(item.note).masked } : it;
          }),
        };
      }
      return {
        ...l,
        message,
        answers,
        email: revealed ? l.email : null,
        phone: revealed ? l.phone : null,
        contact_hidden: !revealed,
        buyer_profile: revealed && l.email ? profiles.get((l.email as string).toLowerCase()) || null : null,
        listing_name: names.get((l.product_id || l.service_id) as string) || null,
        commission,
        pilots: pilotsByQr.get(l.id) || [],
      };
    }),
  });
}

export async function PATCH(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  let body: { id?: string; status?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  if (!body.id || !STATUSES.includes(body.status || '')) {
    return NextResponse.json({ ok: false, message: 'id and a valid status are required' }, { status: 400 });
  }

  const db = getSupabaseClient({ admin: true });
  const { data: updated, error } = await db.from('quote_requests')
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq('id', body.id).eq('vendor_id', vendor.id)
    .select('public_ref, email, company').maybeSingle();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  // Tell the buyer when the vendor starts working their request (only
  // 'responded' — internal states like viewed/won/lost stay internal).
  if (body.status === 'responded' && updated?.email) {
    sendMail({
      to: updated.email as string,
      subject: `NXT//LINK: the vendor is responding to your request ${updated.public_ref}`,
      body: `Good news — ${vendor.company_name} is responding to your request (${updated.public_ref}) inside NXT//LINK. See their quote and messages in your dashboard: /buyer`,
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
