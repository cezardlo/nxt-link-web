# Payments Process & Vendor Tracking — Backbone Plan

_Planning doc — no code changed. Grounded in the live repo
(`nxtlink-LIVE-ready-v2`) and the live Supabase project `yvykselwehxjwsqercjg`
(schema verified read-only 2026-07-20). Canonical inputs: `vault/Payments.md`
(decided escrow model), `vault/Fees.md`, `vault/Flow.md`, `vault/Audit.md`
(M2.1 "one deal ledger"), `vault/STATE.md`._

**The one rule that never bends:** every dollar of commission is computed by
`calculateFee()` in `src/lib/fees/engine.ts` (5% on first $50k, 3% above,
$20k cap, vendor-side, on the **eligible subtotal** — tax/shipping/travel
excluded via `computeEligibleSubtotal()`). This plan adds *when* it fires
(at release) and *where the money moves*; it never re-implements the math.

---

## 0. What exists today (verified)

**Money path (from `vault/Flow.md`, confirmed in code):**

| Moment | Route | Writes | Fee? |
|---|---|---|---|
| Vendor sends quote | `POST /api/vendor/quote` | `quote_requests` (quote fields), upsert `commissions` status `quoted` | `calculateFee` (estimate) |
| Buyer accepts | `POST /api/buyer/quote-decision` | `quote_requests` → `won`, `commissions` → `accepted`, insert draft `manual_deals` (deduped by `source_quote_id`) | `calculateFee` (estimate) |
| Admin co-pilot | `POST /api/admin/deals/assist` | nothing (prefill only) | `calculateFee` |
| Admin logs deal | `POST /api/admin/deals` | `manual_deals` status `reserved` | `calculateFee` |

**Nothing collects money.** Commissions are computed but never invoiced,
escrowed, or paid — confirmed as Audit top-risk #6.

**Live tables that matter (columns verified against the live DB — several are
NOT in migrations, e.g. all of `manual_deals`):**

- `commissions` — per `quote_request_id` (unique, FK): quote_amount,
  commission_amount, effective_rate, fee_policy_version, status
  (`quoted/accepted/won/lost/void/paid`), plus billing columns
  (`final_amount, invoice_number, billed_at, due_date, paid_at`).
- `manual_deals` — operator ledger: vendor_id, buyer_company, gross/net_amount,
  commission_amount, effective_rate, applied_cap, is_free_credit,
  credit_applied, status (default `reserved`), invoice_ref, paid_at,
  `source_quote_id` (unique index), protected_until. **No FK constraints.**
- `purchases` — vendor-reported final purchase per quote_request (unused so far).
- `vendor_profiles` — already carries lifecycle-ish columns: `status`
  (pending/approved), `onboarding_status` (default `registered`),
  `billing_status` (default `free`), `profile_completion`, `free_deals_used`,
  `free_deals_reserved`, `agreement_version/accepted_at`,
  `terms_accepted_version/at`, `verification_level`, `moderation_status`,
  `suspended_until`, `nudge_24_at/72_at`. **Nothing for Stripe.**
- `early_access_leads` (`new→contacted→onboarding→onboarded→declined`),
  `vendor_applications` (status pending/approved…), `platform_audit_log`,
  `notifications` — all live.

---

## 1. Payments lifecycle (Phase 1 — fixed-price "Type 1")

### 1.1 A Stripe reality-check that changes one detail of the vault plan

`vault/Payments.md` says "manual capture + destination transfers". Research
result: a card **authorization from manual capture expires after 7 days by
default**; Stripe's extended authorization stretches that to ~30 days but only
on some card brands and eligible business categories
([Stripe: place a hold](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method),
[extended authorization](https://docs.stripe.com/payments/extended-authorization)).
Industrial B2B ship-times + a 5-day inspection window will routinely blow past
7 days. So we split the escrow into two Stripe mechanisms:

1. **Manual capture covers only the short "order confirmed?" window** —
   authorize at "Pay to start", capture when the vendor accepts the order
   (auto-capture at day 5 at the latest, safely inside the 7-day expiry;
   vendor no-show → cancel the PaymentIntent, buyer never charged).
2. **The real escrow is the captured money sitting in NXT//LINK's platform
   Stripe balance** using **separate charges and transfers** — Stripe's
   supported pattern for hold-then-release marketplaces; funds stay on the
   platform balance until you create a `Transfer` to the vendor's connected
   account
   ([separate charges and transfers](https://docs.stripe.com/connect/separate-charges-and-transfers),
   [manual payouts / delayed transfers](https://docs.stripe.com/connect/manual-payouts)).
   At release we transfer `captured − commission`; the commission simply
   **stays** in the platform balance. Commission at release, never before —
   full refund before release ⇒ transfer never happens ⇒ zero fee, exactly
   per `vault/Payments.md`.

Two consequences to plan around:

- **Hold duration guardrail:** Stripe's guidance for held funds is on the
  order of up-to-90-days. Dispute freezes must resolve well inside that
  (our 48h operator SLA is fine; add a hard 30-day escalation alarm).
- **Processing cost:** commission policy says the buyer pays nothing and
  processing lives inside the vendor commission. Card processing (~2.9% +
  30¢) would eat most of a 5% fee — on a $50k card payment that's ~$1,450
  of the $2,500 commission. **Recommendation: default large payments to ACH
  debit (`us_bank_account`, 0.8% capped at $5)**; allow cards only below a
  threshold (e.g. $5k) or with the cost surfaced. ACH settles in ~4 business
  days (2 for eligible US merchants), so "funded" waits for settlement
  ([Stripe payouts](https://docs.stripe.com/payouts)).

### 1.2 The full Type 1 flow, step by step

```
quote accepted (exists today)                         [quote-decision route]
  └─ creates ORDER row (extends today's draft manual_deals step)
buyer clicks "Pay $X to start"
  └─ POST /api/orders/[id]/pay → PaymentIntent (manual capture,
     us_bank_account or card, metadata: order_id, quote_request_id)
     → order: awaiting_payment
webhook payment_intent.amount_capturable_updated
     → order: authorized  → notify vendor "accept this order"
vendor accepts (POST /api/vendor/orders/[id]/accept)
     → capture PaymentIntent → order: funded ("Payment secured in
       NXT//LINK Escrow") — money now in platform balance
     (cron auto-captures day 5; vendor silence day 6 → cancel + notify)
vendor ships (POST /api/vendor/orders/[id]/ship {carrier, tracking})
     → order: shipped
delivery confirmed (buyer click, or vendor marks + buyer doesn't object)
     → order: inspection, inspection_ends_at = now + 5 days
DAY 1–5: buyer may approve early, request changes, or open a dispute
DAY 6 (cron) or buyer approval, whichever first:
     → RELEASE: fee = calculateFee(eligible subtotal of the order)
        transfer = captured_amount − fee.fee   ← THE ONLY fee moment
        stripe.transfers.create({ destination: vendor.stripe_account_id,
          amount: transfer, transfer_group: order.public_ref })
     → order: released; deal ledger row: status released, final fee stamped
webhook payout.paid (on the connected account)
     → order: paid_out — vendor sees money (Stripe Express default payout
       schedule; first-ever payout for a new account can take 7–14 days
       — https://docs.stripe.com/connect/manage-payout-schedule)
```

**Where `calculateFee()` fires in the new world (exactly twice per deal):**
1. **Estimate** — unchanged, at quote/accept (existing routes above), stored
   on `commissions`/`manual_deals` as today.
2. **Final** — at **release**, on the order's eligible subtotal
   (line items run through `computeEligibleSubtotal()` so tax/shipping/
   deposits/passthrough are excluded before the brackets). The release
   value overwrites the estimate on the single deal ledger and is the
   amount actually kept. No other code path may compute a fee.

**Refunds:** before release → `stripe.refunds.create` on the charge, order
`refunded`, deal ledger `refunded`, commission $0. Partial refund at dispute
resolution → refund X to buyer, then release runs on the *reduced* eligible
subtotal (engine's `refunds` input — already built for this).

### 1.3 Phase 2 — milestones (Type 2) and the dispute freeze

- `order_milestones` (see §2): the accepted quote carries a plan (e.g.
  30/40/30). **One milestone funded at a time** — the pay endpoint refuses
  milestone N+1 until N is released. Vendor submits → buyer approves or
  requests changes → release (transfer for that milestone) → next unlocks.
  **14-day auto-approve** after submission (cron), per `vault/Payments.md`.
- **Fee across milestones must be cumulative, not per-milestone** — the
  brackets are marginal and the cap is per project. Rule:
  `fee_for_this_release = calculateFee(cumulative_released_eligible).fee −
  fees_already_taken_on_this_order`. This keeps the $20k cap and the 5%→3%
  break correct no matter how the milestones are sliced. (Naive
  per-milestone calls would overcharge — three $40k milestones would pay 5%
  three times.)
- **Dispute freeze:** buyer or vendor opens a dispute → order/milestone
  `disputed`; all crons skip it (auto-release, auto-approve, auto-capture
  clocks stop); operator must resolve within 48h to: full refund / partial
  refund / release. Every action appends to the immutable `payment_events`
  ledger. Freeze older than 30 days pages the operator (Stripe held-funds
  guardrail).

---

## 2. Payment TRACKING — one money ledger

### 2.1 New tables (one migration, additive, FKs from day one)

**`orders`** — one per funded engagement (Type 1: one per accepted quote).

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| public_ref | text unique | `ORD-xxxxxxxx` |
| source_quote_id | uuid **unique, FK → quote_requests(id)** | joins the whole existing pipeline |
| deal_id | uuid FK → manual_deals(id) | the single deal-ledger row (§2.3) |
| vendor_id | uuid FK → vendor_profiles(id) | |
| buyer_email | text | today's buyer identity; `buyer_id` lands with Audit M2.5 |
| kind | text | `fixed` \| `milestone` (P2) \| `recurring` (P3) |
| currency / total_amount | text / numeric | quoted total |
| line_items | jsonb | `[{amount, kind, description}]` — feeds `computeEligibleSubtotal` |
| eligible_subtotal | numeric | stamped at funding, restamped at release |
| status | text | see §2.2 |
| stripe_payment_intent_id / stripe_charge_id / stripe_transfer_id / stripe_refund_id | text | |
| funded_at / shipped_at / inspection_ends_at / released_at / refunded_at | timestamptz | |
| carrier / tracking_number | text | |
| dispute_id | uuid FK → disputes(id) null | P2 |
| created_at / updated_at | timestamptz | |

**`payment_events`** — append-only money ledger. **Insert-only** (RLS: no
update/delete policy for anyone; service-role insert only). This is the
audit trail Cesar or an accountant reads top-to-bottom.

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| order_id | uuid FK → orders(id) | |
| milestone_id | uuid FK null | P2 |
| type | text | `authorized, captured, capture_expired, cancelled, inspection_started, released, transfer_created, payout_paid, refund_issued, dispute_opened, dispute_resolved, fee_taken` |
| amount | numeric | signed; `fee_taken` rows carry fee + `fee_policy_version` + `effective_rate` |
| stripe_ref | text | pi_/ch_/tr_/re_/po_ id |
| actor | text | `buyer` \| `vendor` \| `operator:<who>` \| `cron` \| `stripe_webhook` |
| note | text | |
| created_at | timestamptz | |

**P2:** `order_milestones` (order_id FK, seq, label, amount, status
`pending→awaiting_payment→funded→submitted→approved→released` + `disputed`,
stripe ids per milestone, submitted_at, auto_approve_at) and `disputes`
(order_id, milestone_id, opened_by, reason, status `open→resolved`,
resolution `refund_full|refund_partial|release`, resolved_by, notes,
timestamps).

### 2.2 Every status a payment can be in

| status | meaning | who acts next | leaves via |
|---|---|---|---|
| `awaiting_payment` | order exists, buyer hasn't paid | buyer | pay → `processing`/`authorized`; 14-day expiry → `cancelled` |
| `processing` | ACH debit initiated, not settled | (Stripe) | webhook → `authorized`/`funded`; failure → `payment_failed` |
| `authorized` | card hold placed (manual capture) | vendor accept | capture → `funded`; day-6 no-accept → `cancelled` (auth released) |
| `funded` | money captured, in NXT//LINK escrow (platform balance) | vendor | ship → `shipped` |
| `shipped` | tracking on file | carrier/buyer | delivery confirm → `inspection` |
| `inspection` | 5-day buyer window, countdown visible | buyer (or clock) | approve or day-6 cron → `released`; dispute → `disputed` |
| `released` | fee taken via `calculateFee`, transfer created | (Stripe) | payout webhook → `paid_out` |
| `paid_out` | vendor's bank has the money | — | terminal ✔ |
| `disputed` | escrow frozen, all clocks stopped | operator (48h) | resolution → `released` / `refunded` / partial→`released` |
| `refunded` | buyer repaid before release, **fee $0** | — | terminal |
| `payment_failed` | charge/debit failed | buyer retry | → `awaiting_payment` |
| `cancelled` | never funded or vendor declined | — | terminal |

`orders.status` is the state machine; `payment_events` is the history.
Status-transition guards follow the existing pattern in
`src/lib/deal-gates` / quote routes: no transition backwards, no release
while `disputed`, no double-release (transfer id already set ⇒ 409).

### 2.3 Merging the two commission ledgers (Audit M2.1, decided here)

**Decision: `manual_deals` becomes THE deal ledger; `commissions` shrinks to
a quote-stage pipeline record.** Rationale: `manual_deals` already holds the
operator's world (free-deal credit, applied_cap, invoice_ref, paid_at) and
the accept path already writes it deduped by `source_quote_id`.

Migration `2026xxxx_one_deal_ledger.sql` (additive):
1. FKs (per Audit M2.1): `manual_deals.source_quote_id → quote_requests(id)`,
   `manual_deals.vendor_id → vendor_profiles(id)`,
   `commissions.quote_request_id → quote_requests(id)` (already FK — verify),
   `quote_requests.vendor_id → vendor_profiles(id)`.
2. `manual_deals.commission_id uuid FK → commissions(id)` back-link; backfill
   via `source_quote_id = commissions.quote_request_id`.
3. Widen `manual_deals.status` vocabulary to the deal lifecycle:
   `reserved → won → funded → in_progress → released → paid → refunded /
   lost / void / disputed` (check constraint).
4. A read-only SQL **view `commission_ledger`** = one row per deal joining
   `manual_deals` ⟕ `commissions` ⟕ `orders`, with a `discrepancy` flag when
   amounts/status disagree. `/admin/commissions` reads the view instead of
   raw `commissions`.

Code changes with it:
- `POST /api/admin/deals/assist` + `/api/admin/deals` accept and carry
  `source_quote_id` so a co-pilot save **upserts** the accept-time draft
  instead of duplicating it (closes Audit risk #2 / Flow gap 5).
- `POST /api/buyer/quote-decision` sets `commission_id` on the draft it
  creates.
- New `GET /api/admin/reconcile` (admin-gated): returns orphans and
  discrepancies from the view; zero rows = healthy.

### 2.4 What the operator sees

`/admin/payments` (new page, wire to Design System v1.0):
- **Pipeline table:** every order — buyer, vendor, amount, status chip,
  escrow balance held, commission (estimate vs final), inspection countdown
  ("auto-release in 2d 4h"), dispute flag, Stripe links.
- **Drill-in:** the `payment_events` timeline, rendered like a bank
  statement, plus buttons: refund (full/partial), resolve dispute, force
  release — every button = one admin-gated endpoint, every click appends an
  event with `actor: operator`.
- **Totals strip:** held in escrow / released this month / commission earned
  this month (sum of `fee_taken` events) / outstanding disputes.
- `/admin/commissions` keeps working, now backed by the merged view.

---

## 3. Vendor TRACKING — lifecycle pipeline

### 3.1 The pipeline and what already stores each stage

| # | Stage | Signal that a vendor is here (existing unless marked NEW) |
|---|---|---|
| 1 | `invited` | `early_access_leads.status ∈ new/contacted/onboarding` |
| 2 | `applied` | `vendor_applications.status = 'pending'` |
| 3 | `signed_up` | `vendor_profiles` row exists (`auth_id` set), `onboarding_status='registered'` |
| 4 | `profile_complete` | `vendor_profiles.profile_completion ≥ 80` + `agreement_accepted_at` set |
| 5 | `payout_connected` | **NEW** `stripe_payouts_enabled = true` |
| 6 | `listed` | ≥1 published row in `marketplace_products`/`marketplace_services` |
| 7 | `quoting` | ≥1 `commissions` row (i.e. sent a quote) in last 60 days |
| 8 | `first_deal_won` | ≥1 `manual_deals.status ∈ won/funded/…` |
| 9 | `paid` | ≥1 order `paid_out` (or `manual_deals.paid_at` set) |
| 10 | `active` | won or quoted within 60 days |
| — | `dormant` | stage ≥6 but no quote/deal in 60 days |
| — | `suspended` / `banned` | `moderation_status` (already enforced; timed suspensions auto-reactivate) |

### 3.2 What's missing (small, deliberate additions)

1. **Stripe columns on `vendor_profiles`** (migration):
   `stripe_account_id text unique`, `stripe_charges_enabled bool default
   false`, `stripe_payouts_enabled bool default false`,
   `stripe_onboarded_at timestamptz`, `stripe_requirements_due jsonb`.
   Kept in sync by the Connect `account.updated` webhook — never trusted
   from the client.
2. **`lifecycle_stage` is computed, not stored.** A SQL view
   `vendor_pipeline` derives the stage from the signals above (stored
   stages always drift). `GET /api/admin/vendors/pipeline` (admin-gated)
   returns the funnel: counts per stage + per-vendor stage + days-in-stage.
3. **Stage-change history:** reuse `platform_audit_log` (`logAudit()` already
   exists) with `event: vendor_stage_changed` written by the nightly cron
   that diffs the view — no new table needed.
4. **Ops hooks:** extend the existing `cron/profile-nudges` pattern with one
   more wave: "connect your payout method" nudge for stage-4 vendors
   (blocks their money, not their listings).

**Rule preserved:** payout onboarding is for **vendors only** — the endpoint
requires an existing `vendor_profiles` row for the authed user (role-gated,
per the "buyers must not auto-provision vendor profiles" pattern) and
refuses `moderation_status != 'active'`.

---

## 4. Build order — smallest shippable slices

Each slice ships alone, `npm run typecheck` + `npm run build` green, and is
independently verifiable. S0–S1 need **no Stripe money movement** and S0
needs no Stripe at all.

**S0 — One deal ledger + reconciliation (no Stripe, unblocks trust)**
- Migration: FKs + `commission_id` back-link + widened `manual_deals` status
  + `commission_ledger` view (§2.3).
- Edit: `admin/deals` + `admin/deals/assist` carry `source_quote_id` and
  upsert; `buyer/quote-decision` stamps `commission_id`.
- New: `GET /api/admin/reconcile`.
- Reuses: `/admin/commissions`, `/admin/deals` pages.

**S1 — Stripe foundation + vendor payout onboarding**
- `src/lib/stripe/client.ts` (server-only, `STRIPE_SECRET_KEY`, apiVersion
  pinned); refuse to boot routes without the key (fail-closed like
  `requireCronSecret`).
- Migration: `vendor_profiles` Stripe columns (§3.2.1).
- New routes: `POST /api/vendor/payouts/onboard` (create Express account +
  AccountLink, role-gated), `GET /api/vendor/payouts` (status),
  `POST /api/stripe/webhook` (signature-verified with
  `STRIPE_WEBHOOK_SECRET`, handles `account.updated`; unverified ⇒ 400,
  fail-closed).
- Vendor portal gains the "Connect payouts" card (front-end dept).

**S2 — Type 1 escrow end-to-end (the revenue slice)**
- Migration: `orders` + `payment_events` (§2.1) + RLS (vendor sees own
  orders; buyer path stays server-mediated by verified email like
  `buyer/dashboard`; service-role writes).
- New routes: `POST /api/orders/[id]/pay` (buyer, verified email match);
  `POST /api/vendor/orders/[id]/accept` and `/ship`; `POST
  /api/orders/[id]/confirm-delivery` and `/approve` (buyer);
  `GET /api/cron/escrow` (auto-capture ≤ day 5, inspection expiry →
  release day 6, stale-auth cancel — guarded by existing
  `requireCronSecret`, scheduled in `vercel.json`); webhook grows
  `payment_intent.*`, `charge.refunded`, `payout.paid`.
- **Release function is one shared lib** (`src/lib/payments/release.ts`):
  computes eligible subtotal → `calculateFee` → transfer → events → updates
  `manual_deals` to `released`. Cron and buyer-approve both call it;
  idempotent (transfer id set ⇒ no-op).
- Admin: `POST /api/admin/orders/[id]/refund` (full/partial, admin-gated).
- Reuses: accepted-quote hook in `buyer/quote-decision` now also creates the
  `orders` row; `notifyVendor`/`notifyBuyer`; `sendMail`; existing
  status-guard idiom.

**S3 — Visibility**
- `GET /api/admin/payments` (+ page), `GET /api/vendor/payouts/history`
  (Payouts tab), buyer order timeline on `/projects/[id]`.
- Nightly stage-diff cron → `platform_audit_log`; payout-nudge wave.
- `GET /api/admin/vendors/pipeline` + funnel board on `/admin/vendors`.

**S4 — Phase 2: milestones + disputes**
- Migration: `order_milestones` + `disputes`.
- Routes: fund/submit/approve per milestone (14-day auto-approve in the
  escrow cron; cumulative-fee rule §1.3), `POST /api/orders/[id]/dispute`
  (buyer or vendor), `POST /api/admin/disputes/[id]/resolve`.
- Operator dispute screen.

**S5 — Hardening before real volume**
- Stripe idempotency keys on every create; Radar review rules; ACH-first
  payment-method policy; Stripe Tax + facilitator invoice PDF (after tax
  advisor); load the reconciliation report into a weekly email to Cesar.
- Fix-when-nearby audit items in any file touched: sanitize `.or()` inputs,
  no SSRF in any fetch helper, CSP header task stays on the security list.

**New env vars across slices:** `STRIPE_SECRET_KEY`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` (+ test-mode
trio in Preview). Existing: `CRON_SECRET` already required.

---

## 5. Cesar's checklist (plain English, in order)

1. Go to **stripe.com** and create the NXT//LINK Stripe account. Have ready:
   your legal business name, EIN (tax ID), business address, your ID, and
   the bank account where NXT//LINK's commission money should land.
2. In the Stripe Dashboard, finish **"Activate your account"** (fill in the
   business profile — pick the closest industry, e.g. B2B marketplace).
3. In the Dashboard, open **Connect → Get started** and choose **Express**
   accounts. Complete the **platform profile** questions. Upload the
   NXT//LINK logo and brand color — vendors see them during payout signup.
   Note: with Express, the *platform* (you) is responsible if a vendor's
   account goes negative — this is normal, just know it
   ([Stripe Express accounts](https://docs.stripe.com/connect/express-accounts)).
4. In **Settings → Payment methods**, turn on **ACH Direct Debit (US bank
   accounts)** — this is how big invoices should be paid (cards cost ~2.9%,
   ACH costs 0.8% capped at $5 — on a $50,000 deal that's ~$1,450 vs $5).
5. Copy the **API keys** (Developers → API keys): the *secret key* and the
   *publishable key*, for BOTH test mode and live mode. Add them in Vercel →
   Project → Settings → Environment Variables as `STRIPE_SECRET_KEY` and
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test keys on Preview, live keys on
   Production). The dev team will give you one more (`STRIPE_WEBHOOK_SECRET`)
   after they create the webhook — you just paste it the same way.
6. **Lawyer pass** on vendor terms before the first real payment: escrow
   terms, the 5-day inspection + auto-release consent, the off-platform
   bypass = suspension + forfeiture clause, dispute policy. Same doc updates
   the buyer terms (auto-release on day 6).
7. **Tax advisor**: confirm marketplace-facilitator sales-tax duties and
   whether to turn on Stripe Tax now or at P3.
8. Say "yes" (or change) three business rules so we can hard-code them:
   5-day inspection, 14-day milestone auto-approve, ACH-first above $5,000.
9. Already pending from STATE: set `ADMIN_ACCESS_CODE` in Vercel and the
   Supabase Auth Site URL to the live domain.

Expect: a vendor's **first-ever payout takes 7–14 days** (Stripe fraud
holds on brand-new accounts); after that it's the normal ~2-business-day
schedule ([payout schedule](https://docs.stripe.com/connect/manage-payout-schedule),
[payouts](https://docs.stripe.com/payouts)). Tell vendors this up front so
the first deal doesn't feel broken.

---

## 6. Sources (external facts used)

- Manual-capture authorization validity (7-day default): [Stripe — Place a hold on a payment method](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method); [Stripe support — auth & capture](https://support.stripe.com/questions/using-authorization-and-capture-with-paymentintents)
- Extended authorization (~30 days, brand/category gated): [Stripe — Extended authorization](https://docs.stripe.com/payments/extended-authorization)
- Hold-then-release marketplace pattern: [Stripe — Separate charges and transfers](https://docs.stripe.com/connect/separate-charges-and-transfers); [Stripe — Manual payouts / delayed transfers](https://docs.stripe.com/connect/manual-payouts)
- Express accounts & platform loss liability: [Stripe — Express accounts](https://docs.stripe.com/connect/express-accounts)
- Payout timing (first payout 7–14 days; schedules): [Stripe — Manage payout schedule](https://docs.stripe.com/connect/manage-payout-schedule); [Stripe — Receive payouts](https://docs.stripe.com/payouts)
