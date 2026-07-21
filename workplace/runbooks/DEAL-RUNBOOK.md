# The NXT//LINK Deal Runbook — how to run a deal today

**Who this is for:** Cesar (or whoever is operating the console), day to day, on the site as it works RIGHT NOW — before Stripe/escrow exists. Every step below was checked against the real pages and API code on 2026-07-21, not against a plan.

**How to read it:** plain steps, screen names you actually click on, and honest flags wherever the computer doesn't do something yet (**"manual today"**). Source files for engineers are in the Appendix at the end — you don't need them to run the desk.

**Binding context this runbook follows:** `workplace/plans/DECISIONS-2026-07-21.md` (payment methods, approval periods, payment wording, credit tiers) and `workplace/plans/operations-map.md` (the fuller day-to-day SOP — this runbook is the deal-by-deal walkthrough that plugs into that SOP).

---

## Table of contents

1. [A vendor arrives](#1-a-vendor-arrives) — invited vs. organic, what review looks like, what emails fire
2. [A buyer asks for something](#2-a-buyer-asks-for-something) — single listing, cart bundle, or the guided /intake — and what dispatch does
3. [Vendor quotes → buyer accepts](#3-vendor-quotes--buyer-accepts) — what unlocks, what shows up where
4. [Operator money steps, today](#4-operator-money-steps-today) — confirm, invoice, chase, mark paid, credits
5. [Approval periods and how to word a payment message](#5-approval-periods-and-how-to-word-a-payment-message)
6. [Daily 20-minute check + escalation list](#6-daily-20-minute-check--escalation-list)
7. [Known gaps to work around](#7-known-gaps-to-work-around-honest-list)
- [Appendix: source files for engineers](#appendix-source-files-for-engineers)

---

## 1. A vendor arrives

There are **two doors in**, and they're built as two *lanes of one system*, not two separate signup flows — same account-creation code, different review gate.

### Door A — you invite them (`/admin/invites`)

You met someone worth vouching for. Go to **`/admin/invites`**, fill in company name, contact name, email, pick EN/ES, hit **Send invite**.

- They get a bilingual email with a personal link: `/join/<their-token>`.
- On that page they see their company name pre-filled, tap what they supply, tick the terms checkbox, and get a magic sign-in link by email — no password.
- The moment they click that email link, their vendor profile is created **already approved** (`status = approved`, `moderation_status = active`) and they land straight in `/vendor/portal`.
- **This is intentional** — the invite itself IS the review, because only you (behind the admin access code) can create one. Nothing further to approve on your side.
- The invite card on `/admin/invites` also has a **QR code button** — good for handing someone your phone at a trade show or conference table; there's also a general "Scan to join" QR for anyone (goes through the normal organic review below, not pre-approved).
- Reminders at day 2 / 5 / 9 go out automatically if they never click (cron job); a reply or a "Decline" click on the invite row stops them for good.

### Door B — they sign themselves up organically (`/vendor-signup`)

Anyone can go to **`/vendor-signup`** on their own (also where the general conference QR points). Same 3 fields — company, work email, what they supply — same terms checkbox, same magic-link sign-in, no password.

- Difference from Door A: their profile is created **PENDING**, not approved. They land in their dashboard immediately (so they can start filling out their profile), but their listings can't go public and buyers can't see their storefront until you approve them.
- **This is also intentional and must never be weakened** — invited = vetted by you already; organic = a stranger off the internet, so it's reviewed.

### Where you review a PENDING organic vendor

There are actually **two different admin screens** depending on how the vendor arrived, and it matters which one you check:

| Vendor came from… | Row appears on | How you approve |
|---|---|---|
| `/vendor-signup` (3-field quick signup) | **`/admin/directory`** or **`/admin/vendors`** | Click **Approve** on their row (calls `PATCH /api/vendors/manage`) |
| `/apply` (the older, longer full application form with logo/images) | **`/admin/vendor-applications`** (linked from `/admin/applications`) | Click **Approve** — this one also **sends the bilingual welcome email** automatically |

⚠️ **Only the `/apply` → `/admin/vendor-applications` approval path sends a welcome email.** Approving a quick-signup vendor on `/admin/directory` or `/admin/vendors` just flips their status — no email fires. If you want them to get a "you're in" email, either use the `/admin/vendor-applications` flow or email them yourself. (Flagged in §7 as a gap worth closing.)

There's also **`/admin/applications`** — a *third*, older list: early-access leads captured by the homepage's "Apply for early access" popup, tracked `new → contacted → onboarding → onboarded`. Moving one to `onboarded` fires its own bilingual welcome email too. Keep these leads moving; they're a separate funnel from the two above.

### What emails actually fire on arrival

| Trigger | Email | Language |
|---|---|---|
| You send an invite | Invite email with `/join/<token>` link | Vendor's chosen locale |
| Invite unanswered 2, 5, 9 days | Reminder email | Same |
| `/apply` application approved | Welcome email (commission terms, sign-in link) | EN + ES in one email |
| Early-access lead moved to "onboarded" | Welcome email (same wording) | EN + ES in one email |
| Quick-signup (`/vendor-signup`) approved via `/admin/directory`/`/admin/vendors` | **Nothing automatic** — send one yourself if you want to welcome them | — |

⚠️ **Both welcome emails still say the OLD commission-credit wording** — "your first two deals get up to $1,250 commission credit each." Per `DECISIONS-2026-07-21.md` §5, the real policy is now **$250 standard / $1,250 founding (manual, per-vendor)**. The engine already has the new tiered logic built (`resolveFirstDealCredit` in `src/lib/fees/engine.ts`), but these two email templates and the checkbox on `/admin/deals` were not yet updated to match at the time of this audit — see §4 and §7. **Don't hand-promise "$1,250 to everyone" verbally either** until this is fixed; quote the real policy from §4 below.

---

## 2. A buyer asks for something

Three doors in for a buyer — all three end up as rows in the same table vendors see (`quote_requests`), so nothing downstream cares which door was used.

### Door 1 — request a specific listing

On any product/service page in `/marketplace`, the buyer fills the on-page request form (company, contact, email, phone, message) and submits. This creates **one** `quote_requests` row tied to that exact listing's vendor. The vendor gets an in-app notification + an email (buyer contact info is **not** in that email — see anti-circumvention note below).

### Door 2 — the quote cart (bundle several listings in one go)

Buyers can add multiple products/services to a cart (`/cart`) — possibly from different vendors — and submit once. Behind the scenes this is still "one request per vendor": if the cart has items from 3 vendors, submitting creates **3** separate `quote_requests` rows (one per vendor), each listing every item that vendor needs to quote. Each of those vendors gets their own notification + email listing just their items. The buyer still only fills the form once.

### Door 3 — the guided intake (`/intake`)

For a buyer who doesn't know exactly what listing they want, `/intake` is a short guided Q&A (category, problem, quantity, location, budget, deadline). On finishing, it writes one **`client_requests`** row (a different table — the "opportunity" record) and immediately calls the same **matching + dispatch** engine as below to fan it out to vendors. There's no listing behind an intake request — it's a raw RFQ.

### What "dispatch" actually does (all three doors funnel into this for matching)

Whenever a request needs to reach vendors beyond the one specific listing's owner (Door 3 always; Doors 1–2 only reach the one vendor on the listing), the system:

1. Pulls every `vendor_profiles` row with `status = approved`.
2. **Excludes any vendor who is currently suspended or banned** (`moderation_status`) — a suspended vendor's `status` may still read "approved" from way back, so the code checks *both* fields together. This was a real bug that got fixed — worth knowing it's now correct.
3. Scores the remaining vendors against the request's category + location, keeps anything scoring ≥ 20/100, and fans out to the **top 8** matches.
4. Each matched vendor gets one `quote_requests` row (deduplicated — re-running dispatch on the same request never double-sends to the same vendor) + an in-app notification + an email. **The buyer's free-text problem description and location are masked** (emails/phones stripped) in that email — the point of contact stays inside NXT//LINK until the buyer accepts a quote.

If dispatch finds **zero** matching vendors (new category, thin coverage), nothing gets sent automatically — that's when you step in on **`/admin/match`**: re-rank manually and hit **"Push to vendors."**

---

## 3. Vendor quotes → buyer accepts

### Vendor side — `/vendor/leads`

The vendor sees every request routed to them on `/vendor/leads`, newest first, with a status chip (New / Viewed / Responded / Won / Lost). **Buyer contact info is hidden** on every lead until the buyer accepts — the card shows "contact hidden" instead of an email/phone, and any free text the buyer wrote is masked too. This is the anti-circumvention rule: nobody can quietly take the deal off-platform before it's even quoted.

To quote, the vendor opens the lead, fills in **Quote amount (USD)**, timeline, an optional message, and an optional "valid until" date, and hits **Send quote**. On submit:

- The system computes the NXT//LINK commission on that amount using the one real fee engine (5% on the first $50,000, 3% above, capped at $20,000) and shows the vendor a preview.
- A `commissions` row is created/updated for that request (status `quoted`), stamped with a 90-day protection window.
- The buyer gets an in-app notification + email: "you received a quote — review it in your dashboard."

### Buyer side — `/buyer`

The buyer's dashboard lists both intake requests and marketplace quote requests, including any quote a vendor sent. They click **Accept** or **Decline**.

### What happens the instant a buyer accepts (`POST /api/buyer/quote-decision`)

1. The request flips to `won`; the linked `commissions` row flips to `accepted`.
2. The vendor is notified (in-app + email) that the buyer accepted.
3. **Contact reveal**: on the vendor's `/vendor/leads` screen, the buyer's email/phone (and, if the buyer filled one out, their buyer profile card — company, position, industry, city, logo) now show. This is the ONLY point contact info unlocks — everything before this was masked on purpose.
4. **A draft deal is auto-created in `/admin/deals`** (the `manual_deals` table) — one per accepted quote, deduplicated so accepting doesn't create duplicates on retry. It's created with: the net amount from the quote, the commission the fee engine calculated, a 12-month "protected introduction" window, and status `won`. This is the row you work from in §4.
5. The buyer also sees a commission estimate context — nothing charges anyone; it's bookkeeping only. **Nothing collects money automatically today** — see §4.

If a buyer **declines**, the request flips to `lost`, the vendor is notified, and nothing further happens.

---

## 4. Operator money steps, today

**The honest headline: nothing about getting paid is automated yet.** Stripe/escrow (Payments P1) hasn't shipped. Every accepted deal becomes a row on **`/admin/deals`** that YOU move by hand, and getting the vendor to actually pay the commission is a manual invoice-and-chase discipline. This section is that discipline.

### 4.1 Confirm the deal — `/admin/deals`

Every accepted quote lands here automatically (see §3). You'll also see a chat box labeled **"NXT AI · Commission co-pilot"** — you can type something like *"Acme Corp closed with Rio Grande Industrial for $42,000"* and it prefills the form (you still press **Record deal** to actually save it — the AI never saves on its own).

Use the co-pilot / manual form to log **any deal a vendor reports to you by phone or email that never went through a quote** (off-platform-reported but still inside the protected window) — same commission math applies.

Status flow on a deal, left to right:
`reserved → won → payment_reported → payment_confirmed → invoiced → paid` (plus `overdue`, `disputed`, `credited`, `cancelled` as needed). Move a deal forward with the status buttons on its row; there's also a free-text **invoice reference** field.

⚠️ A suspended or banned vendor **cannot** have a new deal logged against them — the form returns a clear error ("this vendor is suspended — reactivate them first") instead of silently accepting it. Good, but worth knowing it exists so it doesn't look like a bug mid-conversation with a vendor.

### 4.2 Invoice + chase — manual today, per the finance plan

There is no invoicing system in the product. The discipline (from `workplace/plans/operations-map.md` §1b):

1. Within **3 days** of hearing the vendor got paid by the buyer, send the commission invoice yourself (Zoho email, manual).
2. Chase at **15 and 30 days** if unpaid.
3. **60 days unpaid** → suspend the vendor (`/admin/vendors`) and escalate per §6.
4. Every accepted quote gets a calendar follow-up at **+14 days**: "did this close? for how much?" — because nothing tells you automatically.

### 4.3 Mark paid — and the one thing to watch

When the vendor pays their commission, mark it paid. **There are two places this can happen and they are not the same record yet:**

- **`/admin/deals`** — set status to `paid` on the `manual_deals` row (this is the one with the free-deal-credit checkbox and the fuller money picture).
- **`/admin/commissions`** — a separate screen with a **"mark paid"** button that updates the `commissions` table row.

These two tables are **not yet merged into one ledger** (that unification — `commission_ledger` — is planned but not built as of this runbook; see `workplace/plans/payments-s0-ledger-merge-plan.md`). Marking paid on one screen does **not** automatically mark the other. **Until the merge ships: always check both screens before you consider a deal fully closed**, and do your weekly reconcile (operations-map §2, Friday ritual) comparing the two lists by vendor + amount + week.

### 4.4 First-deal credit — the policy vs. what the checkbox actually does

**The decided policy (`DECISIONS-2026-07-21.md` §5), state this to vendors:**

| Vendor tier | Credit on their first deal |
|---|---|
| Normal invited/organic vendor | Up to **$250** off the NXT//LINK fee |
| Important "founding" vendor (you decide this manually, case by case) | Up to **$1,250** off the fee |

Credit only ever reduces the NXT//LINK commission (never a cash payment), expires 90 days after the vendor's signup date, and is **one credit per company, ever** — not per deal.

**What's actually wired into `/admin/deals` right now:** a single checkbox, **"is free credit,"** that you tick by hand. When ticked, it knocks a flat **$1,250** off whatever commission was calculated (or the whole commission if it's less than $1,250) — **regardless of vendor tier**, and nothing stops you from ticking it on a vendor's second, third, or tenth deal. It is a trust-the-operator checkbox, not a rule the system enforces.

**What this means for you today:**
- **You are the enforcement.** Only tick "is free credit" on a vendor's genuine first deal, and only give the full $1,250 to vendors you've actually designated founding — for a normal vendor, manually apply $250 worth of credit by adjusting the commission amount you type in, not by relying on the checkbox's math.
- The server-side rule that will do this correctly on its own (`resolveFirstDealCredit()` in `src/lib/fees/engine.ts` — tier-aware, 90-day window, one-per-company, no more trusting a checkbox) **already exists in the engine as of this runbook**, but it is not yet wired into `/admin/deals`, the welcome emails, or the vendor-facing deals page banner. That wiring is planned next (referred to internally as "slices 3–5" of the credit-tier rework). **Until it ships, this section — not the checkbox — is the actual policy.**

---

## 5. Approval periods and how to word a payment message

### 5.1 There is no live escrow yet — so "approval period" today means the *commission protection window*, not a buyer inspection clock

The buyer-inspection / auto-release escrow flow described in the payments plan (5 business days, auto-release, etc.) **ships with Stripe (Payments P1) — not built yet.** Today, the only "window" the system tracks is the **12-month protected-introduction period** stamped on every accepted deal (`manual_deals.protected_until`) and the **90-day quote-protection window** stamped when a vendor quotes (`commissions.protected_until`). Both exist purely so a commission stays owed if the deal is later reported as closed off-platform inside that window — they are not buyer-facing inspection clocks yet.

### 5.2 The policy to use once escrow exists (state it now if a vendor or buyer asks how it'll work)

Per `DECISIONS-2026-07-21.md` §3 — **the approval/inspection period depends on what's being bought, not one universal rule**:

| Purchase type | Approval period |
|---|---|
| Normal physical product | 5 business days after confirmed delivery |
| Custom equipment | Whatever the buyer–vendor contract says |
| Digital product / software | 3 business days |
| Service or project | Buyer confirms the agreed milestone |
| Recurring contract | No monthly inspection unless the contract requires it |

**NXT//LINK tracks whether the approval happened — it does not judge whether the work was done correctly.** That call belongs to the buyer and vendor under their own contract. Keep that framing in any message you write about a disputed delivery.

### 5.3 The one approved sentence for talking about payment — memorize this

**Use exactly this:**
> "Your payment is processed securely by our payment partner and released according to the agreed payment terms."

**Never say, in writing or out loud, to a buyer or vendor:**
- "NXT//LINK holds your money"
- "NXT//LINK escrow account"
- "guaranteed escrow protection"

Why: Stripe (once live) does not provide a legally licensed escrow account — saying "escrow" as a guarantee is a legal exposure the company doesn't need. This rule applies to every operator-written message: emails, chat replies, phone-call talking points, anything. (The codebase itself was already audited clean on this — the risk is what YOU say in the moment, not the product copy.)

---

## 6. Daily 20-minute check + escalation list

### The daily loop (same order every day — full detail in `workplace/plans/operations-map.md` §2)

| # | Do | Screen |
|---|----|--------|
| 1 | New vendor applications? Approve/reject (1-business-day SLA) | `/admin/vendor-applications` |
| 2 | Early-access leads: advance stages, log yesterday's outreach | `/admin/applications` |
| 3 | New buyer RFQs: sanity-check; if dispatch found nobody, match + push manually | `/admin/requests` → `/admin/match` |
| 4 | Leads older than 48h with no vendor response → nudge the vendor (text/call beats email) | `/admin/requests` |
| 5 | Accepted quotes: confirm draft deals; log any deal reported by phone | `/admin/deals` |
| 6 | Commissions owed crossing 15/30 days → send the chase email today | `/admin/commissions` (**and cross-check `/admin/deals`, §4.3**) |
| 7 | New listings look legit (no junk/spam)? | `/admin/marketplace` |
| 8 | Any suspensions expiring, appeals to review? | `/admin/vendors` |
| 9 | Inbox pass — buyer/vendor support emails | Zoho inbox |

Also worth a daily glance while this runbook's §7 gaps are still open: **`/admin/directory`** for any quick-signup vendor sitting pending (that queue doesn't show up on `/admin/vendor-applications`, so it's easy to forget).

### Escalation list — when to stop and get help

| Situation | What NXT//LINK does | Who decides the actual outcome |
|---|---|---|
| **Buyer/vendor dispute** over quality, delivery, or scope | Freeze the commission invoice (there's no escrow to freeze yet); acknowledge both sides in writing within 48h; collect quote/tracking/messages; decide within 5 business days: waive, adjust, or hold the commission as agreed | **NXT//LINK tracks it; the buyer and vendor's own contract decides who's right** — you are not the judge of whether a delivery met spec |
| **Refund** requested | Pre-P1, there's no escrow to refund from — it's between buyer and vendor directly. You adjust the `manual_deals` amount/commission on `/admin/deals` to match whatever they actually settled for | Buyer + vendor |
| **Suspected vendor circumvention** (contact-swap attempt, deal moved off-platform to dodge the fee) | First time → warning (cite the term). Second time → 30-day suspension. Confirmed dodge on a protected deal → suspension + the commission is still owed once the vendor terms are signed (legal item, not yet live) | You decide the moderation action; the underlying commission-still-owed question is a contract matter |
| Threat of lawsuit, demand letter, dispute over $10k, suspected fraud, a chargeback | **Stop. Escalate to legal/attorney** — do not improvise (`operations-map.md` §5.4) | — |

**Rule of thumb:** if a step would require NXT//LINK to keep someone's money over their objection, get a second opinion (legal) before acting — there's no escrow license backing that today.

---

## 7. Known gaps to work around (honest list)

These are things this runbook's author found while verifying the flow against the real code. None of them block running deals today — they're operator workarounds until engineering closes them.

1. **Quick-signup vendors (`/vendor-signup`) get no welcome email on approval.** Only the `/apply` full-application approval path and the early-access "onboarded" transition send one. If you approve someone on `/admin/directory`/`/admin/vendors`, send them a personal note.
2. **Both existing welcome-email templates still quote the OLD credit policy** ("first two deals, up to $1,250 each"). Don't let that wording leave your mouth either — quote §4.4 instead. (Templates: `src/app/api/admin/vendor-applications/route.ts` and `src/app/api/admin/applications/route.ts`.)
3. **The `/admin/deals` "is free credit" checkbox is a flat, untiered $1,250 with no eligibility check.** You are the enforcement until the tiered engine is wired in (§4.4).
4. **`/admin/deals` and `/admin/commissions` are two separate ledgers that can drift.** Check both before calling a deal closed; a merged view is planned but not shipped.
5. **A suspended or banned vendor's *listings* can still surface in general marketplace search/browse and in the single-listing request form** — only their storefront page (direct vendor profile view) and the RFQ auto-dispatch matching correctly exclude them. If a buyer finds a suspended vendor's product through search (not through a fresh RFQ match) and requests it directly, the request still goes through. Watch for this on `/admin/requests` if you've recently suspended someone.
6. **Reaching `/admin` at all currently requires being signed in with a real NXT//LINK (Supabase) account that has the admin role** — the access-code screen (type a code, no separate login) is unreachable by itself for a fresh, signed-out browser; see the verification report (`workplace/research/account-verification-2026-07-21.md`) for the exact repro. If you ever get bounced to `/login` when trying to reach an `/admin` page and don't have an admin account handy, that's why — flagged for engineering, not something to work around by re-entering a code.

---

## Appendix: source files for engineers

Screen (what you click) → the code behind it, for anyone extending this flow.

| Screen / flow | Source |
|---|---|
| `/admin/invites` | `src/app/admin/invites/page.tsx`, `src/app/api/admin/invites/route.ts`, `src/app/api/admin/invites/resend/route.ts` |
| `/join/[token]` (invite landing) | `src/app/join/[token]/page.tsx`, `src/app/api/invites/[token]/route.ts` |
| `/vendor-signup` (organic quick signup) | `src/app/vendor-signup/page.tsx`, `src/app/api/auth/signup/route.ts` (mode `magic`) |
| One shared profile creator (both lanes) | `src/lib/vendor/profile.ts` (`ensureVendorProfile`, lanes `invite`/`admin_approval`/`organic`/`portal`) |
| Auth callback (where lane routing actually happens) | `src/app/auth/callback/route.ts` |
| `/admin/vendor-applications` (full `/apply` review + welcome email) | `src/app/admin/vendor-applications/page.tsx`, `src/app/api/admin/vendor-applications/route.ts` |
| `/admin/directory`, `/admin/vendors` (quick-signup review, moderation) | `src/app/admin/directory/page.tsx`, `src/app/admin/vendors/page.tsx`, `src/app/api/vendors/manage/route.ts` |
| `/admin/applications` (early-access leads) | `src/app/admin/applications/page.tsx`, `src/app/api/admin/applications/route.ts` |
| Moderation rules (suspended/banned) | `src/lib/vendor/moderation.ts` |
| Single-listing buyer request + quote cart bundle | `src/app/api/marketplace/request/route.ts` |
| `/intake` (guided RFQ) | `src/app/intake/page.tsx`, `src/app/api/assistant/intake/*`, `src/app/api/platform/requests/route.ts` |
| Matching + dispatch to vendors | `src/lib/requests/dispatch.ts`, `src/lib/matching.ts` |
| `/admin/match` (manual push) | `src/app/admin/match/page.tsx`, `src/app/api/match/route.ts` |
| `/vendor/leads` (vendor inbox + quote form) | `src/app/vendor/leads/page.tsx`, `src/app/api/vendor/leads/route.ts`, `src/app/api/vendor/quote/route.ts` |
| `/buyer` (buyer dashboard, accept/decline) | `src/app/buyer/page.tsx`, `src/app/api/buyer/dashboard/route.ts`, `src/app/api/buyer/quote-decision/route.ts` |
| `/admin/deals` (deal tracker + co-pilot) | `src/app/admin/deals/page.tsx`, `src/app/api/admin/deals/route.ts`, `src/app/api/admin/deals/assist/route.ts` |
| `/admin/commissions` | `src/app/admin/commissions/page.tsx`, `src/app/api/admin/commissions/route.ts` |
| The fee engine (never re-implement this math) | `src/lib/fees/engine.ts` (`calculateFee`, `resolveFirstDealCredit`) |
| Contact masking (anti-circumvention) | `src/lib/guard.ts` (`maskContacts`) |
| Admin access gating | `src/lib/assistant/auth.ts` (`isAdminRequest`), `src/lib/server/admin-session.ts`, `src/components/AccessGate.tsx`, `src/lib/privateAccess.ts`, `src/middleware.ts` |
| Binding plans this runbook follows | `workplace/plans/DECISIONS-2026-07-21.md`, `workplace/plans/operations-map.md`, `workplace/plans/payments-and-tracking.md`, `workplace/plans/payments-s0-ledger-merge-plan.md`, `workplace/plans/contracts-legal.md`, `workplace/plans/finance-money-model.md` |

*Verified against the codebase 2026-07-21 by reading the routes/pages listed above and probing a local `npm run dev` instance (read-only checks only — see the companion verification report for what was and wasn't tested live).*
