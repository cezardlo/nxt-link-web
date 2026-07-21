-- ============================================================================
-- Legal click-wrap groundwork (Wave 1 — contracts-legal plan §5).
-- Two insert-only evidence tables:
--   * legal_documents   — versioned snapshots of every published legal text
--                         (bump = new row, NEVER edit; enforced by trigger).
--   * terms_acceptances — one row per document per checkbox event: who agreed
--                         to which exact version, when, from where.
-- Goal (plan §5): for any deal, be able to produce — years later — the exact
-- text each party agreed to, when, and in which language.
--
-- RLS: service-role only — all access goes through server API routes (same
-- pattern as 20260720_vendor_invites.sql). Idempotent. FILE ONLY — apply to
-- the live DB only with Cesar's explicit approval (process doc G6).
--
-- NOTE: the seeded rows snapshot the CURRENT static /terms and /privacy pages
-- (both marked DRAFT pending attorney review). Until those pages render from
-- legal_documents (plan §5.3.1, a later slice), keep page text and snapshot in
-- sync: any edit to the pages = a NEW seeded version row here.
-- ============================================================================

create table if not exists public.legal_documents (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null check (slug in
                    ('tos','privacy','vendor-agreement','buyer-terms',
                     'escrow-terms','sms-consent')),
  version         text not null,               -- bump = new row, never edit
  language        text not null default 'en' check (language in ('en','es')),
  content_md      text not null,               -- full snapshot of the exact published text
  content_sha256  text not null,               -- sha256(content_md); shown text must hash-match
  effective_date  timestamptz not null,        -- when this version starts applying
  published_by    uuid,                        -- admin auth id (null for seeds)
  created_at      timestamptz not null default now(),
  unique (slug, version, language)
);

create index if not exists legal_documents_slug_idx
  on public.legal_documents (slug, language, effective_date desc);

-- Published legal text is immutable: corrections require a new version row.
create or replace function public.guard_legal_document_immutable() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  raise exception 'legal_documents rows are immutable — publish a new version instead';
end;
$$;
drop trigger if exists trg_guard_legal_document on public.legal_documents;
create trigger trg_guard_legal_document
  before update or delete on public.legal_documents
  for each row execute function public.guard_legal_document_immutable();

-- ---------------------------------------------------------------------------
-- terms_acceptances — the click-wrap evidence ledger.
-- user_id is null for pre-account acceptances (/join landing, anonymous
-- /apply, /signup before the auth row exists) and is linked (null → id) at
-- the first authenticated touch; everything else is frozen at insert.
-- ---------------------------------------------------------------------------
create table if not exists public.terms_acceptances (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid,                    -- auth.users id; null pre-account, backfilled once
  email               text,                    -- lowercased; links pre-account acceptances
  document_slug       text not null,
  document_version    text not null,
  language_shown      text not null default 'en' check (language_shown in ('en','es')),
  content_sha256      text,                    -- copied from legal_documents at accept time
  context             text not null check (context in
                        ('signup','apply','invite_join','vendor_signup',
                         'vendor_onboarding','quote_submit',
                         'quote_accept_payment','reacceptance','sms_consent')),
  related_object_type text,                    -- e.g. 'vendor_invite'
  related_object_id   uuid,
  ip_address          inet,
  user_agent          text,
  accepted_at         timestamptz not null default now(),
  check (user_id is not null or email is not null)
);

create index if not exists terms_acceptances_user_idx    on public.terms_acceptances (user_id) where user_id is not null;
create index if not exists terms_acceptances_email_idx   on public.terms_acceptances (lower(email)) where email is not null;
create index if not exists terms_acceptances_context_idx on public.terms_acceptances (context);
create index if not exists terms_acceptances_time_idx    on public.terms_acceptances (accepted_at desc);

-- Evidence rows are immutable except ONE allowed transition: linking a
-- pre-account acceptance (user_id null) to the auth account it belongs to.
create or replace function public.guard_terms_acceptance_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'terms_acceptances rows can never be deleted';
  end if;
  if old.user_id is null and new.user_id is not null
     and (new.email, new.document_slug, new.document_version, new.language_shown,
          new.content_sha256, new.context, new.related_object_type,
          new.related_object_id, new.ip_address, new.user_agent, new.accepted_at)
         is not distinct from
         (old.email, old.document_slug, old.document_version, old.language_shown,
          old.content_sha256, old.context, old.related_object_type,
          old.related_object_id, old.ip_address, old.user_agent, old.accepted_at) then
    return new;
  end if;
  raise exception 'terms_acceptances rows are immutable (only a null user_id may be linked)';
end;
$$;
drop trigger if exists trg_guard_terms_acceptance on public.terms_acceptances;
create trigger trg_guard_terms_acceptance
  before update or delete on public.terms_acceptances
  for each row execute function public.guard_terms_acceptance_update();

-- ---------------------------------------------------------------------------
-- RLS — service-role only (all access via server routes).
-- ---------------------------------------------------------------------------
alter table public.legal_documents   enable row level security;
alter table public.terms_acceptances enable row level security;
do $$ begin
  create policy legal_documents_service_all on public.legal_documents
    for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy terms_acceptances_service_all on public.terms_acceptances
    for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Seed: snapshot the two existing DRAFT documents (/terms and /privacy pages,
-- "Last updated: July 9, 2026"). English only — the pages have no ES text yet;
-- professional ES legal translation is an open contracts-legal item (§4.3).
-- ---------------------------------------------------------------------------
insert into public.legal_documents (slug, version, language, content_md, content_sha256, effective_date)
select s.slug, 'draft-2026-07-09', 'en', s.content,
       encode(sha256(convert_to(s.content, 'UTF8')), 'hex'),
       timestamptz '2026-07-09 00:00:00+00'
from (values
  ('tos', $nxtos$# Terms of Service — NXT//LINK

DRAFT — pending attorney review. These plain-language terms describe how the marketplace works today and will be replaced by a professionally reviewed version before general availability.

Last updated: July 9, 2026

## 1. What NXT//LINK is

NXT//LINK is an industrial supply chain marketplace connecting buyers with vendors of technology, hardware, equipment, and services. NXT//LINK is a marketplace and coordinator — we are not the seller of record, manufacturer, or provider of the listed products and services. Contracts for purchases are between the buyer and the vendor.

## 2. Accounts

You must provide accurate information and keep your login credentials secure. You are responsible for activity under your account. Operator accounts are granted by NXT//LINK only.

## 3. How deals work (both parties)

Public discovery is open: anyone can browse vendors, listings, brochures, and case studies. Deal activity — quote requests, sales conversations, demos, pilots, purchases — is managed through NXT//LINK. Contact details are withheld until a buyer accepts a quote. Attempting to bypass the platform to avoid its rules or fees is a violation of these terms.

## 4. Buyer terms

Quote requests you submit are shared with the relevant vendor as an NXT//LINK-originated opportunity. NXT//LINK may receive a commission from the vendor on deals that begin on the platform; this never increases the legitimate quoted price you receive — vendors are prohibited from adding the commission as a buyer surcharge.

Reviews may only be left after a verified engagement (an accepted quote).

## 5. Vendor terms

Before publishing listings or receiving leads, vendors must accept the NXT//LINK vendor terms, which include: a disclosed commission on NXT//LINK-originated deals (provisional schedule: 15% up to $10,000, 12.5% to $50,000, 10% above — subject to final review); a protected period (currently 90 days) during which commission remains owed even if the same opportunity closes off-platform; responding to platform leads inside the platform; not redirecting platform buyers off-platform; keeping listings accurate; and reporting closed deals. NXT//LINK may suspend vendors who violate these rules.

## 6. Content and conduct

You may not post unlawful, misleading, or infringing content; misrepresent credentials or certifications; scrape the platform; or interfere with its operation. NXT//LINK may remove content and restrict accounts to protect the marketplace.

## 7. Verification and disclaimers

Verification badges describe evidence NXT//LINK reviewed; they are not a guarantee of any product, service, or outcome. Vendors remain responsible for the lawful sale, safety, quality, warranties, and delivery of what they offer. The platform is provided "as is" to the maximum extent permitted by law.

## 8. Fees and payment

Vendor commissions are invoiced by NXT//LINK with stated payment terms. Marketplace payment processing (buyer payments through the platform) is not yet offered; buyers pay vendors directly under their own commercial terms.

## 9. Changes and termination

We may update these terms; continued use after an update is acceptance. You may close your account at any time; obligations already incurred (including commissions on originated deals within the protected period) survive termination.

Questions? Contact hello@nxtlinktech.com. See also our Privacy Policy.$nxtos$),
  ('privacy', $nxpriv$# Privacy Policy — NXT//LINK

DRAFT — pending attorney review. This plain-language policy describes how the platform handles data today.

Last updated: July 9, 2026

## 1. What we collect

Account details (email, role, password handled by our authentication provider); profile details you add (company, name, position, industry, city, phone, logos and photos); marketplace activity (listings, quote requests, quotes, messages, demos/pilots, purchases, reviews, saved listings); and basic technical logs used for security and reliability.

## 2. How we use it

To run the marketplace: matching requests to vendors, delivering quotes and messages, tracking deals and commissions, sending notifications and transactional emails, preventing fraud and platform bypass, and improving the product.

We do not sell your personal information.

## 3. When information is shared

With the other party to your deal: vendors see a buyer's request details; the buyer's contact details and profile card are shared with a vendor only after the buyer accepts that vendor's quote. Buyers see vendor storefront information, quotes, and messages.

With service providers that run the platform (hosting, database, email delivery) under their own safeguards. With authorities if legally required.

## 4. Contact-detail protection

Before a quote is accepted, the platform automatically hides emails, phone numbers, and links exchanged in chat and deal documents. This protects both parties and the integrity of the marketplace.

## 5. Retention and your choices

We keep deal records (quotes, messages, purchases, commissions) as business records of the transactions. You can update your profile at any time, change your email or password in Account settings, and request account deletion or a copy of your data by emailing us.

## 6. Cookies

We use session cookies to keep you signed in and basic protective measures against bots. No third-party advertising cookies.

## 7. Changes

We will update this page when practices change; material changes will be flagged on the site.

Questions or requests? Email hello@nxtlinktech.com. See also our Terms of Service.$nxpriv$)
) as s(slug, content)
on conflict (slug, version, language) do nothing;
