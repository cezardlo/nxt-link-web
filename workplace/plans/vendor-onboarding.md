# Easy Vendor Onboarding — Invite Funnel Plan

**Status: PLAN (no code written). 2026-07-20.**
**Update (2026-07-20, one-signup-system task):** slices 1–4 are shipped, and the
signup doors are now ONE system — `/join/[token]` gained a required ToS/Privacy
click-wrap checkbox (recorded server-side, fail closed, before the magic link
sends); profile creation in `/auth/callback` goes through the shared
`ensureVendorProfile()` (`src/lib/vendor/profile.ts`, lane `invite` = still
pre-approved per decision #5); organic `/signup` vendors now route into `/apply`
admin review instead of dead-ending in the portal.
Founder's ask, verbatim: *"Just their name and their company name and their email
or phone number → send them a reminder → they click the website link → they make
a quick account → later they can put their publishing and stuff."*

Grounded in the live repo `C:\Users\Cesar\Desktop\nxtlink-LIVE-ready-v2`
(vault/Flow.md Journey 2, /apply flow, /vendor-signup, /vendor/portal,
/admin/vendor-applications, /api/cron/profile-nudges, src/lib/mail.ts,
/auth/callback). This feature never touches money — `calculateFee()` is not on
any path here (fee engine untouched).

---

## 0. The funnel in one line

```
Operator types 3 fields → invite email/SMS with /join/<token> link
→ reminders day 2 + day 5 → vendor taps link (mobile page, pre-filled)
→ one tap = magic-link account (<1 min) → vendor_profiles created pre-approved
→ existing portal (strength meter, AI describe, auto-save) + existing
  24h/72h nudge cron carry them to profile_complete → listings = "listed"
```

Pipeline statuses (single source of truth = `vendor_invites.status`):

`invited → reminded → clicked → account_created → profile_complete → listed`
Terminal side-states: `expired` (30 days), `opted_out` (unsubscribe/STOP),
`declined`, `already_vendor` (dedup hit at capture time).

---

## 1. The 3-field capture

**Who enters it:** Cesar / operators, from the admin area (access-code gated,
same `isAdminRequest()` as every `/admin` route). Buyer-suggested vendors are
**Phase 2** (they enter a `needs_review` state, never auto-invited).

**Screen:** new **`/admin/invites`** page (linked from `/admin` home and
`/admin/applications`). Mobile-friendly — Cesar will use it standing at a trade
booth. Top: three inputs + Send. Below: live funnel table (one row per invite,
status chip, resend button, counts strip: Invited / Clicked / Account / Complete
/ Listed).

Fields:
- **Contact name** (required)
- **Company name** (required)
- **Email OR phone** (at least one; phone normalized to E.164, defaults +1 /
  +52 picker for the Borderplex)
- Language toggle EN/ES (sets `locale` → which language the invite leads with)
- If phone-only + SMS enabled: a required **consent checkbox** — "They agreed
  in person to get this link by text" (stored as `consent_note`, see §2 compliance)

**API:** `POST /api/admin/invites` (create + send), `GET /api/admin/invites`
(list + funnel counts), `POST /api/admin/invites/resend` (manual re-send).

**Data model — new table `vendor_invites`** (migration
`supabase/migrations/20260720_vendor_invites.sql`, RLS locked to service-role
only, same pattern as `20260708_lock_internal_tables_rls.sql`):

| column | type | notes |
|---|---|---|
| id | uuid pk default gen_random_uuid() | |
| token | text unique not null | 32+ char random, server-generated; the /join/<token> key |
| contact_name / company_name | text not null | the 3 fields |
| email | text null | lowercased |
| phone | text null | E.164; CHECK (email is not null OR phone is not null) |
| channel | text | 'email' \| 'sms' |
| locale | text default 'en' | 'en' \| 'es' |
| source | text default 'admin' | 'admin' now; 'buyer' \| 'event' later |
| invited_by | text | operator label ("cesar") |
| consent_note | text null | how SMS consent was obtained (compliance record) |
| status | text default 'invited' | CHECK in the pipeline list above |
| sent_at, reminded_2_at, reminded_5_at, clicked_at, account_created_at, profile_complete_at, listed_at, expires_at | timestamptz | expires_at default now() + interval '30 days' |
| auth_id | uuid null | linked at account creation |
| vendor_id | uuid null | linked `vendor_profiles.id` |
| created_at | timestamptz default now() | |

Indexes: unique on token; partial index on lower(email) and on phone for dedup
lookups.

**Dedup at capture (in `POST /api/admin/invites`):**
1. `vendor_profiles` match by email (ilike, escaped like the existing
   `admin/vendor-applications` route) or phone → respond "Already a live
   vendor" → record with status `already_vendor`, send nothing.
2. Open `vendor_invites` (non-terminal) with same email/phone → don't create a
   duplicate; offer "Resend invite" instead.
3. Pending `vendor_applications` with same email → surface a note ("has a
   pending application — approve it instead?") linking to
   `/admin/vendor-applications`.
4. `isEmailBanned()` (existing, `src/lib/vendor/moderation.ts`) blocks invites
   to banned emails.

---

## 2. Invite + reminder loop

**Invite email** — sent through the existing `sendMail()`
(`src/lib/mail.ts`: Resend first, **Zoho fallback — ZOHO_* vars are already
listed in DEPLOY.md** and live on Vercel). Bilingual, locale-first ordering
(same convention as the approval welcome email in
`src/app/api/admin/vendor-applications/route.ts`). Content: "Cesar invited
{company} to NXT//LINK — buyers in the Borderplex are looking for what you do.
One tap to claim your page:" + `https://<site>/join/<token>` + one-line fee
pitch (only pay when paid) + **unsubscribe link** in the footer.

**SMS (Phase 2, optional at launch)** — provider options: **Twilio** (best MX
+ US coverage for El Paso–Juárez, needs **A2P 10DLC** campaign registration,
takes days–weeks), Telnyx (cheaper, same 10DLC need), AWS SNS (no opt-out
tooling). Recommendation: Twilio Messaging Service with built-in STOP/HELP
handling, behind `TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN /
TWILIO_MESSAGING_SERVICE_SID` env vars; feature stays email-only until set.

**Compliance basics (light research, 2026):** an invite/promo text requires
**prior express written consent** — which can be a *documented* in-person
agreement (that's what the operator consent checkbox records: who, when, where
they agreed); the message must name NXT//LINK, and opt-outs must be honored via
**any reasonable method** (April 2025 FCC rule), not just STOP; send only
8am–9pm recipient local time; penalties are $500–$1,500 per message. Carrier
delivery additionally requires 10DLC registration regardless of consent.
Sources: [Infobip TCPA 2026 guide](https://www.infobip.com/blog/tcpa-compliance-sms),
[ActiveProspect TCPA text rules 2026](https://activeprospect.com/blog/tcpa-text-messages/),
[10DLC.org A2P consent](https://www.10dlc.org/en/home/A2PConsent).
Practical rule for Cesar: **we only text people who handed us their number and
said "text me the link" — and we write that down in the invite form.**
(Mexican numbers: LFPDPPP consent principles are similar; same in-person
consent process covers it. Legal should confirm before SMS launch.)

**Reminder cadence** — new cron `GET /api/cron/invite-reminders`
(CRON_SECRET-protected, cloned from the proven `profile-nudges` pattern, added
to `vercel.json` crons):
- **Day 2**: reminder 1 ("Your NXT//LINK page is waiting — 1 minute to claim")
  → sets `reminded_2_at`, status `reminded`.
- **Day 5**: reminder 2 (last touch: "We'll hold your spot till {date}") → sets
  `reminded_5_at`.
- **Stop rules**: never remind if status ≥ `clicked`, or `opted_out`, or
  `expired`, or email bounced. Hard max **2 reminders**, then silence.
- **Day 30**: mark `expired` (operator can re-invite manually, which issues a
  fresh token).

**Unsubscribe:** `GET /api/invites/unsubscribe?token=<token>` → marks
`opted_out`, renders a tiny bilingual "You won't hear from us again" page.
Link in every invite/reminder email. (There is currently **no unsubscribe
mechanism anywhere in the codebase** — this is the first; keep it generic
enough to reuse later.) SMS opt-out = Twilio STOP handling + we mirror it to
`opted_out` via webhook in Phase 2.

---

## 3. The "quick account" click-through

**Landing:** new public route **`/join/[token]`** — mobile-first, EN/ES toggle
honoring invite `locale`. Server loads the invite (`GET /api/invites/[token]`
— returns name/company + masked contact, 404s expired/opted-out tokens) and
marks `clicked_at` / status `clicked` on first view.

Page shows: "Hi {first name} — {company_name}'s page on NXT//LINK is ready to
claim." Pre-filled, nothing to type except (if the invite was phone-only) their
email. Two auth choices, magic link first:

1. **"Email me my sign-in link"** (primary, one tap) — reuses the exact
   `signInWithOtp({ email, options: { emailRedirectTo: /auth/callback?next=... } })`
   pattern already shipped in `src/app/login/page.tsx:43-57`, with
   `shouldCreateUser: true` so the account is created on link click. No
   password ever. Supabase Auth supports this natively.
2. **"Set a password instead"** (secondary) — standard `auth.signUp`
   (confirmation email applies, so it's the slower path; kept for people who
   insist).

**Timing:** open link → tap one button → open email → tap sign-in link → in the
portal. Under a minute, one field max.

**Config caveat (from DEPLOY.md §B):** magic links only work when Supabase
Auth **Site URL** = `https://nxt-link-web.vercel.app` (or the custom domain)
and Redirect URLs include `https://nxt-link-web.vercel.app/**`; **custom SMTP**
on Supabase Auth is strongly recommended, because the built-in mailer
rate-limits to a handful of emails/hour — fine for testing, fatal for a real
invite push. Phase-2 upgrade: server-side
`auth.admin.generateLink({ type: 'magiclink' | 'invite' })` and deliver the
action link through our own `sendMail()` (fully branded, no Supabase mailer at
all).

**Linking the account (the glue):** extend the existing
`src/app/auth/callback/route.ts` — after `exchangeCodeForSession`, look up an
open `vendor_invites` row by the user's email (it already does a similar lookup
against `early_access_leads`). If found:
- create (or link) a **`vendor_profiles`** row pre-filled from the invite
  (`company_name`, `contact_name`, `email`, `phone`, `locale`,
  `source: 'invite'`, **`status: 'approved'`, `moderation_status: 'active'`**
  — see §5), set `auth_id`;
- update the invite: `auth_id`, `vendor_id`, `account_created_at`,
  status `account_created`;
- redirect to `/vendor/portal?welcome=1` (the callback's existing
  vendor-routing then just works, since `vendor_profiles.auth_id` exists).

---

## 4. Progressive completion after signup (all reuse)

Everything after account creation is **already built** — the invite funnel just
plugs into it:

- **`/vendor/portal`**: Profile Strength meter (`portal/page.tsx:462`),
  auto-save (`PATCH /api/vendor/profile`), AI **"write my description"**
  (`POST /api/vendor/profile/describe`), NXT AI onboarding concierge
  (`POST /api/vendor/onboard/concierge`) — all pick up the pre-filled profile.
- **"Publishing"** = `/vendor/listings` (`GET/POST/PATCH /api/vendor/listings`
  + AI extract-from-URL/brochure), with `scoreListing()` completeness %.
- **Nudge emails**: the existing `GET /api/cron/profile-nudges` (24h/72h waves)
  keys off `vendor_profiles.created_at` + incompleteness — invited vendors are
  picked up **automatically** the moment their profile row is created. Zero new
  nudge code.
- **Funnel status updates**: the new `invite-reminders` cron also recomputes
  late-funnel statuses nightly for linked invites: profile meets the same
  completeness bar as the nudge cron (logo + ≥40-char description + ≥1
  category) → `profile_complete`; has ≥1 published row in
  `marketplace_products`/`marketplace_services` → `listed`. (Cron-side
  recompute keeps the hot profile-save path untouched.)

Email touchpoints total: invite → day-2 → day-5 (pre-account, ours) then 24h →
72h profile nudges (post-account, existing). No overlap, no double-sending.

---

## 5. Coexistence with /apply + admin approval

Three front doors, one rule — **the invite IS the review**:

| Door | Who | Review | Result |
|---|---|---|---|
| **`/admin/invites` (NEW — primary growth motion)** | Vendors Cesar/operators met and vouch for | Done at invite time (operator-initiated = pre-approved) | `vendor_profiles` created **approved + active** at account creation; no admin step |
| **`/apply`** (existing, stays) | Cold inbound web vendors | Existing Milestone 1: `/admin/vendor-applications` Approve → profile + welcome email | unchanged |
| Homepage early-access modal (existing) | Curious leads | Existing `/admin/applications` (`new→contacted→onboarding→onboarded`) | unchanged |

- No auto-approval ever happens without a human: invites can only be created
  behind the admin access code. Phase-2 buyer-suggested vendors land as
  `needs_review` and require an operator tap before any invite is sent.
- Cross-links: dedup (§1) points operators at a pending application instead of
  double-tracking; `/admin/vendor-applications` stays the review queue for
  cold inbound.
- Invited vendors do **not** get the approval welcome email (they got the
  invite + portal `welcome=1` instead); nudge cron takes over from there.

**Statuses handed to the tracking system** (exact vocabulary):
`invited, reminded, clicked, account_created, profile_complete, listed` +
terminal `expired, opted_out, declined, already_vendor`. Source of truth:
`vendor_invites.status` with per-stage timestamps; `GET /api/admin/invites`
returns funnel counts for dashboards.

---

## 6. Build order (small slices, mostly reuse)

| # | Slice | New / touched | Size |
|---|---|---|---|
| 1 | **Migration**: `vendor_invites` table + RLS lock + indexes | `supabase/migrations/20260720_vendor_invites.sql` | S |
| 2 | **Capture + send**: `POST/GET /api/admin/invites` (dedup, token, bilingual invite email via `sendMail`) + `/admin/invites` page (3-field form, funnel list, resend) | `src/app/api/admin/invites/route.ts`, `src/app/admin/invites/page.tsx`; link from `/admin` | M |
| 3 | **Click-through**: `/join/[token]` page + `GET /api/invites/[token]` (marks clicked) + magic-link (reuse `signInWithOtp` pattern) + `/auth/callback` linking (create pre-approved `vendor_profiles`, advance invite) | `src/app/join/[token]/page.tsx`, `src/app/api/invites/[token]/route.ts`, edit `src/app/auth/callback/route.ts` | M |
| 4 | **Reminders + unsubscribe**: `GET /api/cron/invite-reminders` (day 2 / day 5 / expire 30 / late-funnel recompute) + `vercel.json` cron + `/api/invites/unsubscribe` + tiny opt-out page | clone of profile-nudges pattern | S–M |
| 5 | **Funnel polish**: counts strip on `/admin/invites`, `already_vendor`/pending-application cross-links | same files as 2 | S |
| 6 | **Phase 2 (flagged, optional)**: Twilio SMS invites + STOP webhook (needs 10DLC), buyer "suggest a vendor" (`needs_review`), branded `admin.generateLink` email delivery | new `src/lib/sms.ts`, small routes | M |

Slices 1–4 are the founder's funnel end to end; 5 is an afternoon; 6 waits on
accounts/legal. Every slice: `npm run typecheck` + `npm run build` + walk the
flow with a real test invite; all new UI strings EN + ES.

**New env vars:** none for slices 1–5 (uses existing `RESEND_API_KEY`/`ZOHO_*`,
`CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`). Phase 2: `TWILIO_*`.

## Open decisions for Cesar
1. **Confirm: operator-invited vendors skip admin review** (recommended — you
   already vetted them by inviting them). Alternative: they land as `pending`
   and still need an approve tap.
2. **SMS at launch or later?** Later recommended (10DLC registration lead time
   + legal check); email invites work today.
3. **Supabase Auth setup** (one-time, DEPLOY.md §B): Site URL + Redirect URLs
   + custom SMTP — without SMTP, magic links rate-limit after a few sends.
