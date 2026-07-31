// GET   /api/vendor/leads          — signed-in vendor: quote requests for MY listings
// PATCH /api/vendor/leads {id, status} — update status of MY lead

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';
import { sendMail } from '@/lib/mail';
import { maskContacts } from '@/lib/guard';
import { resolveDisplayedProtectedUntil } from '@/lib/fees/engine';
import { AUTO_VIEWABLE_STATUSES, canAutoMarkViewed } from '@/lib/vendor/leadStatus';
import { AUTO_VIEWABLE_INVITATION_STATUSES, canMarkInvitationViewed } from '@/lib/requests/invitations';
import { stripBlindBudgetFields } from '@/lib/requests/vendor-view';
import { scoreVendors, type MatchableVendor } from '@/lib/matching';
import { loadRequestAttachments } from '@/lib/requests/attachmentsServer';

const STATUSES = ['new', 'viewed', 'responded', 'won', 'lost', 'spam'];

export async function GET() {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, leads: [] });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  // NOTE: budget_min/budget_max are deliberately never in this select — the
  // buyer's budget must NEVER reach the vendor leads inbox (BLIND BUDGET
  // INVARIANT). stripBlindBudgetFields() below is a second, defense-in-depth
  // line in case a future edit ever widens this list carelessly.
  const { data: leads } = await db.from('quote_requests')
    .select('id, public_ref, kind, product_id, service_id, company, contact_name, email, phone, message, answers, status, created_at, quote_amount, quote_currency, quote_message, quote_timeline, quote_valid_until, quoted_at, buyer_decision, request_kind, quantity, delivery_location, preferred_timeline, structured_specs, quote_payment_terms, quote_warranty, quote_extras')
    .eq('vendor_id', vendor.id).order('created_at', { ascending: false }).limit(200);

  // Resolve listing names + commission amounts in bulk.
  const rows = leads || [];

  // Auto-"viewed" signal (Slice RV, 2026-07-29): opening the leads inbox IS
  // opening the request's detail — every field (message, quote form, chat)
  // renders inline per lead on this page, there is no separate detail route.
  // Guarded by canAutoMarkViewed: only 'new'/'sent_to_vendor' leads upgrade;
  // the DB update itself re-checks status at write time (.in('status', ...)),
  // so a lead a vendor just responded to in a concurrent request can never be
  // pulled back down to 'viewed'. Best-effort — never breaks the lead list.
  const toAutoView = rows.filter((l) => canAutoMarkViewed(l.status as string | null)).map((l) => l.id as string);
  if (toAutoView.length) {
    try {
      const viewedAt = new Date().toISOString();
      await db.from('quote_requests')
        .update({ status: 'viewed', updated_at: viewedAt })
        .eq('vendor_id', vendor.id)
        .in('id', toAutoView)
        .in('status', AUTO_VIEWABLE_STATUSES as unknown as string[]);
      // DELIBERATE: the response keeps each lead's PRE-write status. Mirroring
      // the write into this payload (as this code originally did) meant the
      // vendor never saw 'new' even once — the badge and the dashboard's
      // "respond to new leads" action were dead on arrival (found during the
      // 2026-07-30 dashboard warm pass). This way a fresh lead reads as new
      // exactly once; the next fetch naturally reports 'viewed'.
    } catch {
      // Non-critical — the lead list still renders with its pre-fetch status.
    }
  }

  // Slice R1b (2026-07-30) — direct-invite tracking (request_invitations).
  // Mirrors the EXACT double-guarded never-downgrade pattern the quote_requests
  // auto-'viewed' write above uses, for the SEPARATE invitation status
  // vocabulary (invited/viewed/quoted/declined): fetch current status, filter
  // in-memory with canMarkInvitationViewed, then re-check status again in the
  // update itself. Best-effort — never breaks the lead list.
  const invitedLeadIds = rows
    .filter((l) => Boolean((l.answers as { invited?: boolean } | null)?.invited))
    .map((l) => l.id as string);
  if (invitedLeadIds.length) {
    try {
      const { data: invRows } = await db.from('request_invitations')
        .select('quote_request_id, status')
        .eq('vendor_id', vendor.id)
        .in('quote_request_id', invitedLeadIds);
      const toMarkViewed = (invRows || [])
        .filter((r) => canMarkInvitationViewed(r.status as string | null))
        .map((r) => r.quote_request_id as string);
      if (toMarkViewed.length) {
        await db.from('request_invitations')
          .update({ status: 'viewed', updated_at: new Date().toISOString() })
          .eq('vendor_id', vendor.id)
          .in('quote_request_id', toMarkViewed)
          .in('status', AUTO_VIEWABLE_INVITATION_STATUSES as unknown as string[]);
      }
    } catch {
      // Non-critical — the lead list still renders; the invite badge below
      // never depends on request_invitations, only on answers.invited.
    }
  }

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

  // Request attachments (Slice R5) — read-only here (buyers upload, vendors
  // only see/download). Same pre-accept name-masking as buyer free text
  // (message/bundle notes) above: a file name is just as much an
  // anti-circumvention leak vector as body text.
  const revealedIds = new Set(rows.filter((l) => l.buyer_decision === 'accepted').map((l) => l.id as string));
  const attachmentsByQr = await loadRequestAttachments(db, ids, { maskNamesFor: (qrId) => !revealedIds.has(qrId) });

  // Opportunity framing (Slice R3): honest "why this matches you" chips —
  // REAL overlap only, nothing invented, no response-time claims (real-
  // computed-stats rule). Only leads that came from an OPEN request (auto-
  // dispatched by src/lib/requests/dispatch.ts, or self-claimed via
  // POST /api/vendor/open-requests) carry an answers.source_request ref back
  // to the originating client_requests row — that row is where category/
  // location actually live (quote_requests itself has no free-text category
  // column). A direct listing-tied lead (buyer clicked YOUR OWN listing) gets
  // no chips: matching would be circular, there's nothing to explain.
  // Reuses the SAME scoreVendors() the dispatch/self-claim paths already use
  // to route these leads, so the reasons shown here can never diverge from
  // the logic that actually decided this vendor should see the lead.
  const sourceRefs = Array.from(new Set(
    rows
      .map((l) => (l.answers as { source_request?: string } | null)?.source_request)
      .filter((r): r is string => Boolean(r)),
  ));
  const matchReasonsByRef = new Map<string, string[]>();
  if (sourceRefs.length) {
    const { data: srcRows } = await db.from('client_requests')
      .select('public_ref, category, location').in('public_ref', sourceRefs);
    const selfAsVendor: MatchableVendor = {
      id: vendor.id,
      company_name: vendor.company_name || '',
      categories: vendor.categories || [],
      service_areas: vendor.service_areas || [],
      status: 'approved',
    };
    for (const r of srcRows || []) {
      const scored = scoreVendors(
        { category: (r.category as string) || '', location: (r.location as string) || '' },
        [selfAsVendor],
      );
      matchReasonsByRef.set(r.public_ref as string, scored[0]?.reasons || []);
    }
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
      const sourceRef = (l.answers as { source_request?: string } | null)?.source_request;
      // Slice R1b: a lead the buyer hand-picked this vendor for (send-mode B)
      // never gets a scoreVendors-computed reason — the honest reason is
      // simply that the buyer chose them (never invent a match metric for a
      // manual pick). The client renders a "Direct invite" badge + this
      // reason instead of the normal match-score chips.
      const invited = Boolean((l.answers as { invited?: boolean } | null)?.invited);
      return {
        ...stripBlindBudgetFields(l as Record<string, unknown>),
        message,
        answers,
        email: revealed ? l.email : null,
        phone: revealed ? l.phone : null,
        contact_hidden: !revealed,
        buyer_profile: revealed && l.email ? profiles.get((l.email as string).toLowerCase()) || null : null,
        listing_name: names.get((l.product_id || l.service_id) as string) || null,
        commission,
        pilots: pilotsByQr.get(l.id) || [],
        attachments: attachmentsByQr[l.id as string] || [],
        match_reasons: invited ? [] : (sourceRef ? matchReasonsByRef.get(sourceRef) || [] : []),
        invited,
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
