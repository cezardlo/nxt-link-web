# Audit — NXT//LINK Marketplace (Stage-1 repository audit)

> Grounded in the real deployed tree at repo root
> `…/scratchpad/deployed`. Live Supabase project `yvykselwehxjwsqercjg`
> (confirmed read-only via MCP). Milestone 1 (4 launch-blockers) is DONE and
> verified below — this audit builds on it. Legacy intel/brain code
> (`src/lib/intelligence`, `src/lib/agents`, `archive/`) is excluded from the
> product surface.

## Executive Summary

NXT//LINK is a working Next.js 14 (App Router) + TypeScript + Supabase
marketplace with **38 pages and 74 API routes**. The three-sided flow —
buyer (browse/RFQ → quote → accept), vendor (apply → onboard → list → lead →
quote → win → moderation), and operator (applications → moderation → deals →
fees) — is built end-to-end and traces cleanly through real files. The money
path is solid: a single deterministic fee engine (`src/lib/fees/engine.ts`,
policy `launch-v2` = 5% / 3% / $20k cap) is the only fee authority and matches
the live `fee_policies` table. AI features degrade gracefully (Gemini +
deterministic fallback, so they work keyless). All **four Milestone-1 fixes are
present and wired** (admin vendor-application review, approve→`vendor_profiles`,
request dispatch to vendors, demo-login guard).

The gaps are not "missing screens" — nearly every surface exists — they are
**hardening and data-integrity** gaps. Admin pages have **no server-side page
protection** (client-only `AccessGate`); security rests entirely on API-level
`isAdminRequest()` checks, which are correct but must never be bypassed. The
build ships with **TypeScript and ESLint errors ignored**. The transactional
tables have **no enforced foreign keys** and buyer identity is **email-only**.
Two commission ledgers (`commissions` vs `manual_deals`) can diverge. Most
marketplace tables are near-empty, so most flows are wired but **unproven in
production**.

## Stack & versions

- **Framework:** Next.js 14 App Router, React, TypeScript (`tsconfig.json`).
- **Data/Auth:** Supabase (Postgres + Auth + Storage + RLS), `@supabase/ssr`.
  Live project `yvykselwehxjwsqercjg`. Service-role writes on the server.
- **UI:** Tailwind (`tailwind.config.ts`), lucide-react icons, custom components.
- **AI:** `src/lib/assistant/llm.ts` `aiDraft()` → parallel JSON ensemble,
  `preferredProviders:['gemini']`, always with a deterministic fallback.
- **Email:** `src/lib/mail.ts` → Resend with Zoho SMTP fallback.
- **Deploy:** Vercel (`vercel.json`, Cron), middleware rate-limiting.

### Route map (grouped)

**Public / buyer pages:** `/`, `/marketplace`, `/marketplace/[kind]/[id]`,
`/marketplace/vendor/[id]`, `/intake`, `/buyer`, `/buyer/profile`,
`/projects`, `/projects/[id]`, `/account`, `/privacy`, `/terms`.
**Auth pages:** `/login`, `/signup`, `/sign-in`(→/login), `/vendor-login`,
`/vendor-signup`, `/forgot-password`, `/reset-password`, `/apply`,
`/apply/login`, `/apply/status`.
**Vendor pages:** `/vendor/portal`, `/vendor/listings`, `/vendor/leads`,
`/vendor/quotes`, `/vendor/deals`, `/vendor/start`.
**Admin pages:** `/admin`, `/admin/applications`, `/admin/vendor-applications`,
`/admin/vendors`, `/admin/deals`, `/admin/commissions`, `/admin/requests`,
`/admin/match`, `/admin/marketplace`, `/admin/directory`.

**API — marketplace:** `marketplace/listings`, `listings/[id]`, `categories`,
`suggest`, `request`, `report`, `vendor/[id]`.
**API — vendor:** `vendor/profile`(+`describe`,`extract`), `vendor/listings`
(+`extract`,`media`,`extras`), `vendor/leads`, `vendor/open-requests`,
`vendor/quote`, `vendor/onboard/concierge`, plus brochures/case-studies/
gallery/videos/logo/banner/certifications/agreement/deals/proposals/purchase/
pilot/messages/notifications; `vendors/{manage,signup,route,brochures,videos}`.
**API — buyer:** `buyer/dashboard`, `buyer/quote-decision`, `buyer/profile`
(+`logo`), `buyer/review`, `buyer/saved`, `buyer/messages`,
`buyer/notifications`.
**API — platform/admin:** `platform/requests`, `match`, `admin/applications`,
`admin/vendor-applications`, `admin/deals`(+`assist`), `admin/commissions`,
`admin/marketplace`, `auth/access-code`, `auth/me`.
**API — projects:** `projects`, `projects/[id]`, `projects/draft`.
**API — assistant/AI:** `assistant/{intake,vendor-quote,admin,terms}`, `chat`.
**API — infra/other:** `fees/calculate`, `cron/profile-nudges`, `demo/login`,
`early-access`, `apply/submit`(+`my`,`my/media`), `health`,
`zoho/{email,meeting,status}`.

## Auth & roles

- **Sessions:** Supabase Auth (email/password + magic-link/Google), cookie-based
  via `@supabase/ssr` (`src/lib/supabase/server-auth.ts`). Roles resolved from
  `platform_users.role`: `public | client | vendor | admin | super_admin`
  (`src/lib/assistant/auth.ts:getCurrentUser`).
- **Buyer identity:** `src/lib/buyer/auth.ts` — email-only, keyed by the
  caller's **verified** email (`emailConfirmed` required before any email-matched
  data returns). No `buyer_id` FK exists.
- **Admin gate (the real mechanism):** `isAdminRequest(req)` in
  `src/lib/assistant/auth.ts:45` grants admin on ANY of:
  1. signed-in Supabase user with role `admin`/`super_admin`;
  2. a valid **httpOnly, HMAC-signed** cookie `nxt_admin_session` (12h TTL,
     constant-time verify) minted by `POST /api/auth/access-code` after checking
     the **`ADMIN_ACCESS_CODE`** env var (`src/lib/server/admin-session.ts`);
  3. an `x-access-code` header matching `ADMIN_ACCESS_CODE` (for scripts).
  The signing secret is `ADMIN_SESSION_SECRET` or derived from the code. The
  code is never shipped to the browser. **This is a sound gate.**
- **Page vs API protection:** **API-level protection is real** (every
  `/api/admin/*`, `vendors/manage`, `platform/requests`, `match` calls
  `isAdminRequest`). **Page-level server protection does NOT exist** — admin
  pages are `'use client'` and gated only by the client-side `AccessGate`
  component (`src/components/AccessGate.tsx`). `middleware.ts` runs **only on
  `/api/*`** (`matcher: ['/api/:path*']`) and does **rate-limiting only, no
  auth**. Net: data is safe (APIs 401), but the admin UI shell is not
  server-guarded — protection is entirely in the API layer.

## Database

RLS is **enabled on every table**; core marketplace tables carry policies
(`vendor_applications` 8, `client_requests`/`quote_requests`/
`marketplace_products`/`marketplace_services` 3 each, `commissions`/
`manual_deals`/`platform_users` 2, `vendor_profiles`/`buyer_profiles` 1). All
server writes use the **service-role client** (`getSupabaseClient({admin:true})`,
`SUPABASE_SERVICE_ROLE_KEY`) which **bypasses RLS by design** — so RLS is a
backstop for direct/anon access, and app correctness depends on server code, not
RLS.

**Live marketplace tables (concept → rows):** `vendor_profiles` (6),
`marketplace_products` (14), `marketplace_services` (9), `categories` (96),
`quote_requests` (5), `commissions` (3), `fee_policies` (3), `buyer_profiles`
(2), `listing_documents` (3), `case_studies` (2), `vendor_applications` (1),
`projects` (1), `notifications` (1), `ai_draft_logs` (1).

**Wired but empty (unexercised):** `manual_deals`, `early_access_leads`,
`pilots`, `reviews`, `platform_audit_log`, `vendor_moderation_log`,
`client_requests`, `purchases`, `saved_listings`, `messages`.

**Missing FKs [data]:** the FK query returned **no foreign-key constraints** on
`quote_requests`, `commissions`, `manual_deals`, `client_requests`,
`marketplace_products/services`. Relationships (vendor_id, project_id,
source_quote_id, buyer email) are **convention-only** — no referential
integrity, so orphan rows are possible.

**Indexes:** good coverage on the hot tables — `quote_requests`
(vendor/status/project/public_ref/oppref), `commissions` (vendor/status +
unique quote_request), `manual_deals` (vendor/status + unique source_quote),
`vendor_profiles` (status/email/moderation/industries/client_types). No obvious
missing index on current read paths.

**Legacy noise:** ~150 tables are the removed intel/brain system (`vendors`
14,661; `intel_signals` 90,177; `kg_*`, `signals`, `cluster_*`, `conferences`).
They have no reader/writer in the active `src/app` product and should be treated
as dead data.

## Feature status by side

### Vendor side — mostly built
Apply (`/apply` → `vendor_applications` + Storage), signup/demo login, AI
onboarding concierge, profile with auto-save + Profile-Strength meter + "write
my description", listings (products/services) with AI extract and media, leads
inbox with **contact masking until accept** (`vendor/leads/route.ts`), send quote
(fee runs, `commissions` upsert), open-request self-claim, EN/ES. Moderation
(suspend/ban/reactivate + audit + auto-reactivate) via
`src/lib/vendor/moderation.ts`. **Incomplete:** pilots/reviews tables empty
(feature paths exist, unproven); purchases/agreements unused.

### Buyer side — built, thinner
Browse + search autocomplete + faceted filters, listing request (anti-bot
honeypot+1.5s), `/intake` RFQ assistant, buyer dashboard + `/projects/[id]`
workspace with quote-compare fill bars, accept/decline (fee runs, writes
`commissions` + draft `manual_deals`), reviews/saved endpoints. **Weakness:**
identity is email-only; a buyer who changes email loses history.

### AI features — built with keyless fallback
`aiDraft()` powers onboarding concierge, "describe", commission co-pilot parse,
intake summary, listing/profile extraction. Deterministic fallback everywhere;
drafts logged to `ai_draft_logs`. AI **never finalizes a fee** (engine is
deterministic). `search`/`suggest` autocomplete is DB-driven, not AI.

### Operator / admin — built
Applications review (early-access + full vendor-applications), vendor moderation,
deal log + Commission Co-pilot, commissions view, buyer-request list, vendor
matching (rank-only + optional push), marketplace admin. **Broken buttons
[flow]:** `/admin` page calls `/api/admin/clean-junk` and
`/api/admin/dedup-vendors` — **neither route exists** in `src/app/api`.

### Milestone-1 fixes — ALL CONFIRMED PRESENT
1. **Admin vendor-applications review** — `src/app/admin/vendor-applications/
   page.tsx` + `src/app/api/admin/vendor-applications/route.ts` (GET lists
   pending with details + live-vendor status; admin-gated).
2. **Approve → `vendor_profiles`** — `POST …/vendor-applications {action:
   'approve'}` idempotently creates/links a `vendor_profiles` row (status
   `approved`, moderation `active`) from application data + bilingual welcome
   email. (Known caveat: DB trigger `guard_vendor_application_update` keeps the
   literal `vendor_applications.status` for access-code admins, so the created
   profile is the durable "approved" signal — documented in the route header.)
3. **Request dispatch to vendors** — `src/lib/requests/dispatch.ts`
   (`dispatchRequestToVendors`, reuses `scoreVendors`, idempotent per
   (vendor,request)) wired into `POST /api/platform/requests:63` and
   `POST /api/match:69`.
4. **Demo-login guard** — `src/app/api/demo/login/route.ts:21-26` returns 404
   unless `ALLOW_DEMO_LOGIN==='true'` OR `NODE_ENV!=='production'`.

## Security & config risks (verified against real files)

- **CONFIRMED — build ignores type & lint errors.** `next.config.mjs:22-23`
  `typescript.ignoreBuildErrors:true`, `eslint.ignoreDuringBuilds:true`. Broken
  types/lint ship to prod. [security/quality]
- **CONFIRMED — no server-side admin page protection.** Admin pages are
  client-gated (`AccessGate`) only; `middleware.ts` covers `/api/*` and does
  rate-limiting only. Safe today (APIs enforce), fragile by design. [security]
- **CONFIRMED — `/api/mcp` does not exist.** No public MCP endpoint; MCP is
  internal lib code (`src/lib/mcp/*`) only. Nothing to auth here — a non-issue,
  documented so it isn't re-flagged.
- **CONFIRMED — file-upload validation is content-type only.**
  `apply/submit/route.ts`: 8MB cap, MIME allowlist (`png/jpeg/webp`), SVG
  blocked — but validates the **client-declared** `File.type`, no magic-byte
  sniffing. Spoofable; low impact (served as static storage assets). [security]
- **CONFIRMED — rate limit is best-effort per-instance.** `middleware.ts`
  in-memory Map (100 req/IP/min) unless Upstash env is set; on Vercel each edge
  instance counts separately. [perf/security]
- **CONFIRMED — service-role bypass is the write model.** All writes use
  `SUPABASE_SERVICE_ROLE_KEY` server-side; correctness depends on every route
  calling the right guard. No key leak found in client bundles (`.env.local`
  gitignored; server-only import discipline in `admin-session.ts`).
- **SUSPECTED — no CSRF protection on state-changing POSTs.** Admin cookie is
  httpOnly but there is no visible SameSite/anti-CSRF check on JSON POSTs; needs
  a targeted review of cookie flags in `/api/auth/access-code`. [security]

## Cross-cutting

- **Mobile / a11y:** Tailwind responsive utilities used; no systematic a11y
  audit evident (no axe tests). [ux, suspected]
- **i18n (EN/ES):** Present in vendor portal, intake flow, terms, branding, and
  the bilingual welcome email — but ad-hoc per-string, not a central i18n
  framework. [ux]
- **Tests:** ~16 unit tests in `tests/` covering the critical libs
  (`fee-engine`, `admin-session`, `rate-limit`, `sanitize`, `url-safety`,
  `deal-gates`, `parallel-router`, etc.). **No E2E / integration tests** for the
  buyer↔vendor↔admin flows. [quality]
- **Performance:** list endpoints use limits (e.g. dispatch `limit(500)`,
  applications `limit(300)`), but no cursor pagination on marketplace/admin
  lists — fine at current scale, will need pagination as tables grow. [perf]
- **Tech debt:** ~150 dead intel/brain tables + `src/lib/{agents,intelligence,
  engines,feeds,data}` legacy trees inflate the repo; two divergent commission
  ledgers; `admin/deals/assist` prefill not linked to `source_quote_id` (can
  duplicate the auto-draft `manual_deals`); `/admin/match` result is ephemeral
  (no persisted match).
- **Biggest MISSING vs the marketplace vision:** (1) no payments / escrow /
  proof-of-payment loop — commissions are computed but never collected; (2) no
  in-app buyer↔vendor messaging that survives accept (`messages` empty); (3) no
  reconciliation between `commissions` and `manual_deals`; (4) no persisted
  match/assignment record; (5) email-only buyer identity (no durable buyer FK).

## Top risks (ranked)

**Confirmed**
1. `[data]` **No enforced foreign keys** on `quote_requests`, `commissions`,
   `manual_deals`, `client_requests`, listings. Referential integrity is
   convention-only → orphan/mismatched rows possible.
2. `[data]` **Two commission ledgers can diverge.** `commissions` (quote
   pipeline) and `manual_deals` (operator/co-pilot) are written independently;
   co-pilot deals lack `source_quote_id` back-link → possible double-count.
3. `[security]` **Build ships with `ignoreBuildErrors` + `ignoreDuringBuilds`.**
   Type/lint safety nets disabled for production.
4. `[security]` **Admin UI has no server-side page guard** — protection lives
   only in API `isAdminRequest()`; any unguarded admin route would leak.
5. `[flow]` **Dead admin buttons** — `/admin` calls `/api/admin/clean-junk` &
   `/api/admin/dedup-vendors`, which don't exist (500/404 on click).
6. `[flow]` **No payment/collection loop** — fees are calculated but never
   invoiced or collected; the business model's revenue step is unbuilt.
7. `[data]` **Buyer identity is email-only** (no `buyer_id` FK); email change =
   lost history; correctness rests on `emailConfirmed`.
8. `[security]` **Upload validation is content-type only** (no magic-byte
   check); `[perf/security]` rate limiting is per-instance best-effort.

**Suspected**
9. `[security]` **No explicit CSRF/SameSite hardening** on state-changing POSTs
   (needs cookie-flag review).
10. `[ux]` **No systematic a11y/i18n framework** — bilingual strings are ad-hoc;
    no accessibility testing.
11. `[perf]` **No cursor pagination** on marketplace/admin lists (fixed
    `limit()`); will degrade as data grows.

## Recommended next milestone (Milestone 2): "Trustworthy transactions"

Milestone 1 made the flow reach the right people. Milestone 2 makes the **money
and data trustworthy end-to-end**.

**M2.1 — Referential integrity & one deal ledger** `[data]`
- Add FK constraints: `quote_requests.vendor_id → vendor_profiles.id`,
  `quote_requests.project_id → projects.id`, `commissions.quote_request_id →
  quote_requests.id`, `manual_deals.source_quote_id → quote_requests.id`.
- Back-link `manual_deals` ↔ `commissions`; make `admin/deals/assist` carry
  `source_quote_id` so a co-pilot save dedupes against the buyer-accept draft.
- **Acceptance:** creating a bad-reference row fails; an accepted quote yields
  exactly ONE reconciled deal (no duplicate `manual_deals`); a reconciliation
  query returns 0 orphans.
- **Files/tables:** `src/lib/fees/engine.ts` (unchanged authority),
  `api/buyer/quote-decision`, `api/admin/deals(+assist)`, tables `commissions`,
  `manual_deals`, `quote_requests`.

**M2.2 — Restore build safety** `[security]`
- Set `ignoreBuildErrors:false` / `ignoreDuringBuilds:false`, fix the resulting
  errors (or scope-limit ignores to legacy dirs).
- **Acceptance:** `npm run build` passes with checks ON; `npm run typecheck` &
  `npm run lint` are green in CI. **Files:** `next.config.mjs`, CI.

**M2.3 — Server-guard admin surfaces + remove dead buttons** `[security][flow]`
- Add a server-side admin check (middleware on `/admin/*` or per-page
  `getCurrentUser`/cookie check) so the shell 302s unauth'd users; delete or
  build `/api/admin/clean-junk` & `/api/admin/dedup-vendors`.
- **Acceptance:** hitting `/admin/deals` unauth'd redirects to login; no admin
  button returns 404/500. **Files:** `middleware.ts`, `src/app/admin/*`,
  `src/lib/server/admin-session.ts`.

**M2.4 — Payment / proof-of-payment loop (MVP)** `[flow]`
- On buyer-accept, create an invoice/collection record and a
  `proof_of_introduction` / payment-report entry; let the operator mark
  paid in `/admin/deals`, closing commission → collected.
- **Acceptance:** an accepted deal moves `quoted → accepted → invoiced → paid`
  with an auditable row; `/admin/commissions` shows outstanding vs collected.
- **Tables:** `manual_deals`, `commissions`, `payment_reports`,
  `proof_of_introduction`; **files:** `api/admin/deals`, `api/buyer/
  quote-decision`.

**M2.5 — Persistent buyer identity & messaging** `[data][ux]`
- Add `buyer_id` (FK to `platform_users`/`buyer_profiles`) on `client_requests`
  & `quote_requests`, backfilled from verified email; wire `messages` so
  buyer↔vendor threads persist after accept.
- **Acceptance:** a buyer who changes email keeps their history; an accepted
  deal has a working message thread. **Tables:** `quote_requests`,
  `client_requests`, `buyer_profiles`, `messages`.

**M2.6 — Flow-level test harness** `[quality]`
- Add integration tests for the three journeys (RFQ→dispatch→quote→accept→deal;
  apply→approve→profile; moderation) hitting the real API routes.
- **Acceptance:** CI runs the 3 journeys green. **Files:** `tests/` + a seeded
  test Supabase schema.
