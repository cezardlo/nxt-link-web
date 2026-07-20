# NXT//LINK Experience Design Plan

**Department:** Design & Creative · **Date:** 2026-07-20 · **Status:** PLAN (no code changed)
**Audience:** Cesar (owner) + Engineering, Operations, Legal/Finance departments
**Sources of truth:** `vault/Design-System.md` (Design System v1.0), `vault/Payments.md` (escrow model), `vault/Decisions.md`, `vault/Flow.md`, plus a fresh read of every screen under `src/app/`.

---

## 0 · Where the experience stands today (plain English)

The app **works**, but it wears the old dark "command-center" costume, and every page hand-rolls
its own styling. The new Design System v1.0 (light pages, dark violet sidebar, #6C5CE0) is
**declared and ready** in the code (`spec` tokens in `tailwind.config.ts` and `--spec-*` variables in
`src/app/globals.css`) — but **zero screens actually use it yet**. Only the admin home page already
*looks* like the spec (with hard-typed colors).

Other facts that shape this plan:

- **Language is patchy.** Only 3 pages speak Spanish (vendor signup, vendor portal, buyer intake),
  each with its own private dictionary. Everything else — listings, buyer dashboard, marketplace,
  all emails except the two welcome emails — is English-only. For a Spanish-first vendor on a phone,
  the experience currently switches language mid-journey.
- **There is no invite system at all.** No invite links, no pre-filled signup. The invite landing
  page in this plan is net-new.
- **Good trust patterns already shipped and must not regress:** Accept button shows the total
  ("Accept — $5,760"), quote expiry with day names ("Valid until Fri, Mar 28 · 6 days left"),
  "Free to send · no commitment" safety line, graded trust badges, compare tables with fill bars,
  the intake Today/Next/Then promise card, honest "From $X · final in quote" pricing.
- **Escrow does not exist yet** (Payments P1 in the backlog). That is our biggest experience
  opportunity: payment screens will be **born in the new design system** instead of reskinned later.
- **The operator console is a menu, not a cockpit.** No live counts anywhere on the admin home;
  the operator must open each screen to find work.
- **Emails** share one branded dark wrapper (`src/lib/mail.ts` → `htmlWrap`), text-first, wordmark
  in violet. Transactional emails are English-only.

Standing design rules we keep (from `vault/Decisions.md`): **no ticking countdown timers or dark
patterns — static dates only**; best-value table cells use soft blue `#3B6EA5` (not red/green);
fill bars on compare tables; vendors can "view as buyer".

---

## 1 · Experience principles (the feel we are building)

1. **One feeling per screen, one job per screen.** Every screen below names both.
2. **Money copy always tells the plain truth.** "Free to send." "Held by NXT//LINK until you
   approve." "Commission comes out at release, never before." Never vague, never scary.
3. **Dates, not timers.** "Auto-releases Fri, Aug 1 · 5 days left" — same calm pattern as our quote
   expiry line. No ticking clocks anywhere (owner decision).
4. **Spanish is a first-class citizen,** not a translation afterthought. One shared toggle,
   remembered across the whole app (`nxt_lang` already exists — use it everywhere).
5. **Phone-first for vendors.** Small industrial businesses run on phones. 48px inputs, single
   column, sticky bottom CTAs (the listing page already does this — generalize it).
6. **Every empty/error state has ONE clear next action** (spec §6 — already our house style).

---

## 2 · The Experience Map

Format: **Moment → Screen (route) → What they must FEEL → The ONE thing the screen must accomplish.**

### Journey A — Vendor: invite → account → profile saved → first listing published

| # | Moment | Screen | Must feel | The ONE thing |
|---|--------|--------|-----------|----------------|
| A1 | Invite arrives (email / WhatsApp text from operator) | Invite email (new template) | *"This is for me, personally — a real person picked my business."* | Get one tap on the link. Vendor's company name in the subject; sender is NXT//LINK but voice is human. |
| A2 | Invite landing | `/invite/[token]` (**net-new**, see §3) | *Ease. "This will take a minute, not an afternoon."* | Create the account in under 60 seconds — 3 fields, 2 already pre-filled. |
| A3 | First profile save | `/vendor/portal` (concierge open) | *Momentum. "It's writing itself."* | Get Profile Strength from 0% to ≥50% in the first sitting (concierge answers 2 questions → AI drafts the rest → vendor approves). |
| A4 | First listing draft | `/vendor/listings` | *Safety + pride. "AI helped, but I'm in control."* | One listing reaches "Review & publish". Keep the existing promise copy: *"It never invents: anything missing stays empty. You review before publishing."* |
| A5 | Published! | Publish confirmation state + "View as buyer" | *Anticipation. "I'm on the shelf. Now what?"* | Show exactly what buyers see + a Today/Next/Then card (reuse the intake pattern): Today: you're live · Next: matched requests land in your Leads · Then: quote inside NXT//LINK. |

### Journey B — Buyer: request → compare → accept → escrow → track → release

| # | Moment | Screen | Must feel | The ONE thing |
|---|--------|--------|-----------|----------------|
| B1 | Browse / find | `/marketplace` + listing detail | *Trust at a glance.* | Get the request sent. Guard the existing safety line: **"Free to send · no commitment until you accept a quote."** |
| B2 | Request sent / RFQ posted | listing success state, `/intake` success card | *Clarity. "I know exactly what happens next."* | Set expectations with the shipped Today/Next/Then card — do not touch its copy, it's our best trust moment. |
| B3 | Quotes arrive, compare | `/buyer` (+ `/projects/[id]` Quotes tab) | *Control. "I can see the whole picture."* | One confident decision. Keep: amber "Needs attention" strip, fill bars, "Best price" tag, soft-blue best-value rule, expiry with day names. |
| B4 | Accept | `/buyer` quote card | *Confidence, zero surprise.* | Understand exactly what Accept means. **Today** the note says "Accepting doesn't charge you anything." **With escrow this changes** — see §4.2. The button must always show the total. |
| B5 | Pay into escrow | **new** Escrow checkout panel (deal room Payments tab) | *Safety. "My money is held, not gone."* | One payment with one sentence of truth under the button: *"Held by NXT//LINK until you approve delivery."* |
| B6 | Track the order | `/projects/[id]` → Payments tab with **EscrowTimeline** | *Calm. Always know the current state and the next date.* | Show WHERE the money is (named stage) and WHEN it moves next (static date). |
| B7 | Inspect & release (or day-6 auto-release) | EscrowTimeline "Inspection" stage | *Finality without pressure.* | One green button: "Approve & release $X" — plus the honest note "Auto-releases Fri, Aug 1 · 5 days left" and a visible "Something wrong? Open a dispute (pauses the clock)." |

### Journey C — Operator (Cesar / ops person): the daily run

| # | Moment | Screen | Must feel | The ONE thing |
|---|--------|--------|-----------|----------------|
| C1 | Open the console | `/admin` (upgrade: **Today strip**) | *Command. "I can see everything that needs me."* | Live counts on the existing menu cards: applications awaiting review, requests with no match, quotes overdue, **disputes** (future), payouts pending. Today it is a menu with zero numbers — the daily run currently requires opening 9 screens. |
| C2 | Work the queues | `/admin/vendor-applications`, `/admin/requests`, `/admin/match` | *Focus. One queue at a time, oldest first.* | Empty the queue; every row's primary action is one click (Approve / Push to vendors / Advance). |
| C3 | Money pass | `/admin/deals`, `/admin/commissions` (+ future dispute screen) | *Certainty. The ledger is true.* | Reconcile: nothing overdue, nothing frozen without a note. Disputes (P2) get a 48h-response promise surfaced right on the row. |

---

## 3 · The Onboarding Experience (vendor)

### 3.1 The 3-field invite landing — `/invite/[token]` (net-new)

Nothing like this exists today (confirmed: no invite/prefill mechanism anywhere in `src/`).
The operator creates an invite from the admin directory/applications screen; the vendor gets a
short link. The page is the **first spec-native screen we build** — it IS the first impression.

**Layout (mobile-first, no app chrome):** one centered card on `spec-warm-white` (#F8F7FB)
background, NXT//LINK wordmark on top, ES|EN segmented toggle top-right (default comes from the
invite — operator picks the vendor's language when inviting).

**The promise, right under the headline:**
> **"Hi {FirstName} — {Operator} invited {Company} to NXT//LINK."**
> "Takes under a minute. / Menos de un minuto."

**Exactly 3 fields** (48px height, single column):
1. **Company name** — pre-filled from the invite (editable).
2. **Your name** — pre-filled if the operator knows it.
3. **Mobile or email** — pre-filled with wherever we sent the invite; this becomes their login.

One violet button: **"Create my account / Crear mi cuenta"** → magic-link or one-time code (no
password to invent on a phone). Below it, our safety-line pattern adapted:
*"Free to join · you choose what to publish."* Footer: tiny "Not {Company}? Start fresh →"
(falls back to `/vendor-signup`, which stays as the non-invited path).

**Under-1-minute mechanics:** the signed token carries company, name, contact, language, and any
categories the operator already knows — so after signup the portal opens with the concierge
pre-loaded ("We already know you do forklift service in El Paso — right?"). The vendor's first
minute is confirming, not typing.

### 3.2 Progressive profile after signup — the strength meter is the spine

What exists (keep it — it's good): `/vendor/portal` has a **6-task Profile Strength meter**
(logo · 40+ char description · categories · ≥1 listing · photo/case study · certification), each
worth ~17%, shown as percent + bar + checklist with "Add now →" deep links, auto-save with the
"Saving… ✓ Saved" pill, and a 100% celebration banner with "See how buyers see it →".

**Problem:** `/vendor/start` has a *separate* 7-step meter computed differently. Two meters =
two truths. **Fix: one shared ProfileStrengthMeter component, one task list, used on both.**

How the meter **drives completion** (the pattern, not just the widget):

1. **One task at a time.** The meter always nominates the single next task (highest payoff first:
   description → categories → first listing → photo → logo → certification) and the page's primary
   CTA is that task. Everything else is collapsed. Small businesses finish lists of one.
2. **Milestone meanings, not just percent.** 0–49%: "Buyers can't find you yet." 50%+: "You're
   visible in search." 100%: "Buyer-ready" + trust-badge eligibility. The percent gets a *meaning*
   label so it's motivating, not abstract.
3. **Nudge emails follow the meter.** The 24h/72h cron nudges already exist
   (`/api/cron/profile-nudges`) — upgrade their content to name the vendor's *exact* next task and
   deep-link straight to it, in the vendor's language. Subject stays warm ("You're almost live on
   NXT//LINK").
4. **The listing editor has its own weighted completeness score** (`scoreListing`, with
   good ≥80 / mid ≥50 bands and "Next: …" hints) — visually unify it with the profile meter
   (same bar, same bands, same voice) so the vendor learns ONE progress language.
5. **Spanish parity is part of "done".** The portal is already bilingual; `/vendor/start` and
   `/vendor/listings` are not. The unified meter and both pages ship EN/ES together.

---

## 4 · The Payments / Escrow Experience

Goal: make **"your money is held safely until you approve"** so visually obvious that nobody has
to read a help page. We follow the two best-in-class patterns from Cesar's research, confirmed by
light desk research:

- **Upwork:** milestones have named money states (Funded → Active → Approved); client has 14 days
  to approve, then funds auto-release; funds sit in a neutral place both sides can see.
  ([Upwork Help — how milestone payments work](https://support.upwork.com/hc/en-us/articles/211063718-How-payments-for-milestones-and-fixed-price-contracts-work),
  [Upwork Help — how Upwork protects payments](https://support.upwork.com/hc/en-us/articles/211062568-How-Upwork-protects-your-payments))
- **Alibaba Trade Assurance:** the order status *itself* is written in plain waiting language —
  "Waiting for buyer payment" → "Waiting for supplier to ship" → "Waiting for delivery
  confirmation" → buyer clicks Confirm to complete.
  ([Trade Assurance user guide](https://activities.alibaba.com/alibaba/buyer/cp/tradeassurance/guide.php))

Our model (already decided in `vault/Payments.md`): Stripe Connect escrow; Type 1 fixed-price
(pay → ship → 5-day inspection → auto-release day 6), Type 2 milestones (fund one at a time,
14-day auto-approve), commission taken **at release only**, buyer pays no platform fee.

### 4.1 The EscrowTimeline — the one component that carries the whole story

Extend the existing `StageTracker` (`src/components/marketplace/StageTracker.tsx` — segmented bar
+ stage pills, already accessible) into a **date-aware, money-aware timeline**. Lives in the deal
room Payments tab, on the buyer dashboard order card (compact), and in the vendor's Leads/Deals
view. Type 1 stages, written Alibaba-plain:

```
✓ Quote accepted        Mon, Jul 20
✓ Payment secured       Tue, Jul 21   [🔒 Held by NXT//LINK]
› Waiting for shipment  vendor adds tracking
· Inspection window     5 days after delivery
· Released to vendor    (auto Fri, Aug 1 unless you act)
```

Rules that make it feel safe:
- **The money always has a named location.** While held: a lock icon + "Held by NXT//LINK —
  released only when you approve." After release: "Paid to {Vendor} · {date}".
- **Every future stage shows its date or its trigger.** Never a mystery gap.
- **Auto-release uses the static-date pattern, not a timer:** "Auto-releases Fri, Aug 1 ·
  5 days left" (mono font, `spec-warning` color at ≤1 day) — identical grammar to our shipped
  quote-expiry line, honoring the no-countdown decision.
- **Dispute = visible pause, not a dead end.** Timeline bar turns `spec-warning`; stage label:
  "Paused — under review · NXT//LINK responds within 48h." The clock stops and SAYS it stopped.
- Type 2 (milestones): the same component repeats per milestone with a fund state per row —
  "Milestone 2 of 3 · Not funded yet — fund to unlock work" (Upwork's funded/unfunded made visual).

### 4.2 The Accept → Pay moment (the copy must evolve honestly)

Today's accept note says: *"Accepting doesn't charge you anything — it connects you with the
vendor…"*. Once escrow ships, that sentence becomes untrue for escrow deals. The transition:

- **Step 1 — Accept (unchanged, do not regress):** button still shows the total: **"Accept — $5,760"**.
- **Step 2 — new Escrow checkout panel:** total in IBM Plex Mono, line items (subtotal, tax via
  Stripe Tax, **"Platform fee: $0 — buyers never pay NXT//LINK"**), one violet button:
  **"Pay $5,760 into escrow"**. Under it, the new safety line (same visual slot as "Free to send"):
  *"Held by NXT//LINK until you approve delivery · full refund if it never ships."*
- Vendor's mirror moment, on their lead card: **FundedBadge** — "🔒 Funded — start work" (green),
  plus the standing line *"Commission comes out at release, never before."*
- **Payouts tab (vendor):** released amounts, commission shown per `calculateFee` (5%/3%/$20k cap),
  next payout date. Same timeline component, vendor-facing labels.

### 4.3 Do-NOT-regress list (existing trust UX that survives every change)

1. Accept button shows the total ("Accept — $5,760").
2. Quote expiry with day names + days-left ("Valid until Fri, Mar 28 · 6 days left").
3. "Free to send · no commitment until you accept a quote" on every request CTA.
4. Graded trust badges (identity / insurance / certified) with explanations.
5. Compare tables with fill bars; best value in soft blue `#3B6EA5`; "Best price" tag.
6. Intake success Today/Next/Then card (EN/ES).
7. "From $X · final in quote" honest pricing; no fabricated discounts.
8. Amber "Needs attention" strip on the buyer dashboard.
9. Anti-circumvention: buyer contact hidden until acceptance.
10. No ticking countdowns anywhere — static dates only.

### 4.4 Money emails

Every escrow state change sends a status email in the shared wrapper: "Payment secured for
{order}", "Shipped — inspection ends Fri, Aug 1", "Funds released to {Vendor}". **Bilingual from
day one** (today only welcome emails are EN/ES — money emails must not be English-only for
Spanish-first vendors). Each email = one sentence of state + one button to the timeline.

---

## 5 · Reskin sequencing to Design System v1.0

Principle: **trust surfaces first, and never skin the same screen twice.** Escrow screens are
being built anyway → build them spec-native; first-touch screens are small and high-impact →
do them early; the marketplace is huge → do it once the shared shell exists.

| Wave | Scope | Why this order |
|------|-------|----------------|
| **0. Foundations** | Shared **AppShell** (248px `spec-ink` sidebar + 66px topbar, content max 1120–1200px, 32px padding); swap page fonts Outfit → Space Grotesk / IBM Plex (already loaded in tailwind config, pages just ignore it); shared **LanguageToggle + i18n helper** (consolidate the 3 private dictionaries, persist `nxt_lang` app-wide); port `TrustBadges` / `StageTracker` / `QuoteCompare` CSS from hardcoded dark hex to `--spec-*` tokens with a theme variant. | Everything after this is assembly, not invention. |
| **1. Vendor first touch** | `/invite/[token]` (net-new, spec-native) · `/vendor-signup` · `/vendor/start` + unified ProfileStrengthMeter. | Smallest surfaces, biggest first impressions; invites are how we recruit supply. |
| **2. Money screens** | `/buyer` dashboard · `/projects/[id]` deal room (its 7 tabs, esp. Quotes + new Payments tab) · all new escrow components (§6). | Trust is won or lost where money moves. Escrow P1 engineering lands here — one build, already in spec. |
| **3. Public storefront** | `/marketplace` home · listing detail · vendor storefront · `/intake`. | Highest traffic and biggest pages; with the shell + tokens ready this is systematic. Keep every shipped pattern from §4.3 pixel-for-pattern. |
| **4. Vendor working screens** | `/vendor/portal` · `/vendor/listings` · `/vendor/leads` (+ vendor "Needs attention" strip from the backlog). | Vendors tolerate the old theme longer than buyers deciding whether to pay. |
| **5. Operator console** | `/admin` home + Today strip · unify the three coexisting admin themes (light-violet menu, light-navy requests, dark everything else) · dispute-resolution screen (P2). | Internal; last. Admin home is already closest to spec. |
| **6. Emails** | Restyle `htmlWrap` from dark to spec light (warm-white body, violet wordmark kept); bilingual transactional set. | Independent of app waves; can run parallel with Wave 2 since money emails ship with escrow. |

Each wave is verified **live on a phone** before the next (per backlog note — terminal Claude can
verify; the sandbox can't).

---

## 6 · Component shopping list (new builds — all on existing tokens, no new colors)

Token names below are the wired Tailwind `spec` namespace / `--spec-*` vars. The single sanctioned
off-token color is the pre-existing best-value soft blue `#3B6EA5` (owner decision — comparison
cells only). Radii: `rounded-spec-*` (8/12/16, buttons 10). Fonts: Space Grotesk (headings),
IBM Plex Sans (UI), IBM Plex Mono (money, refs, dates).

| # | Component | What it is | Token mapping |
|---|-----------|------------|---------------|
| 1 | **InviteLanding** (`/invite/[token]`) | 3-field pre-filled signup card, §3.1 | bg `spec-warm-white`; card white on `spec-surface`; CTA `spec-violet` → hover `spec-violet-deep`; helper text `spec-text-2nd`; inputs h-48 border `spec-border` |
| 2 | **LanguageToggle** + i18n helper | Shared EN\|ES segmented control, persists `nxt_lang` | segmented per spec §3; active `spec-violet` on white; inactive `spec-text-2nd` |
| 3 | **AppShell** | 248px sidebar + 66px topbar chrome | sidebar bg `spec-ink`, active item `spec-violet`, hover `spec-lilac`; content bg `spec-warm-white` |
| 4 | **EscrowTimeline** | Date-aware money timeline (§4.1); extends StageTracker; compact + full variants; Type 1 & milestone modes | done `spec-success`; current `spec-violet`; upcoming `spec-border`/`spec-text-2nd`; paused/dispute `spec-warning`; dates IBM Plex Mono |
| 5 | **PaymentStatusChip** set | Named money states as pills: Awaiting payment / **Funded · held by NXT//LINK** / Shipped / Inspection / Released / Refunded / Disputed | warning · success · violet · lilac · success · slate · error — all from spec status tokens; uppercase 10.5px pattern already used by TrustBadges |
| 6 | **FundedBadge** | Lock-icon "Funded — held by NXT//LINK" trust marker on order + lead cards | `spec-success` tint bg + border (mirror TrustBadges `.trust` recipe); lucide lock at 1.75px stroke |
| 7 | **AutoReleaseNote** | "Auto-releases Fri, Aug 1 · 5 days left" static-date line (also re-usable for quote expiry) | IBM Plex Mono; `spec-text-2nd`, switching `spec-warning` at ≤1 day; never animated |
| 8 | **EscrowCheckoutPanel** | Total + line items + "Pay $X into escrow" + safety line (§4.2) | total in Plex Mono `spec-ink`; fee-zero line `spec-success`; button `spec-violet`; safety line `spec-success` |
| 9 | **MilestoneList** | Per-milestone rows with funded/unfunded state + "fund to unlock" CTA | funded `spec-success`; unfunded outline `spec-border` + CTA `spec-violet`; amounts Plex Mono |
| 10 | **PayoutCard / Payouts tab** | Vendor-side released funds, commission line, next payout date | amounts Plex Mono; commission note `spec-text-2nd`; released chip `spec-success` |
| 11 | **ProfileStrengthMeter** (shared) | One meter for portal + start + nudge emails (§3.2) | bar fill `spec-violet` (→ `spec-success` at 100%); meaning labels `spec-text-2nd`; celebration `spec-success` |
| 12 | **OperatorToday strip** | Live-count metric cards on `/admin` (spec §4 "Metric card") | big number Space Grotesk `spec-ink`; alert counts `spec-warning`; dispute counts `spec-error` |
| 13 | **DisputeBanner** | "Paused — under review · we respond within 48h" state for timeline + order cards | `spec-warning` tint bg/border; body `spec-ink` |
| 14 | **EmailTemplate v2** | Light `htmlWrap`: warm-white body, white card, violet wordmark, one-button layout; bilingual blocks | hex equivalents of `spec-warm-white`/`spec-border`/`spec-violet`/`spec-ink` inlined (email-safe Arial stack stays) |
| 15 | **StickyMobileCTA** (generalized) | The listing page's sticky bottom action bar, extracted for reuse (pay, accept, publish moments on phones) | bar white, top border `spec-border`, button `spec-violet`, label shows the amount |
| 16 | **Light-theme ports** (not new, re-tokened) | TrustBadges · StageTracker · QuoteCompare · EmptyAction from hardcoded dark hex → `--spec-*` | 1:1 recipe swap; behavior and copy untouched (§4.3 guard) |

---

## 7 · Dependencies and open items

**On Engineering:** invite-token flow (signed token, magic-link/OTP auth, prefill API); Stripe
Connect escrow P1 (the order object + states the EscrowTimeline renders); shared i18n helper;
live counts endpoint for the OperatorToday strip.
**On Operations:** invite workflow (who invites, from which admin screen, WhatsApp vs email);
the 48h dispute-response promise must be a real staffed commitment before we print it.
**On Legal/Finance:** escrow wording review ("held by NXT//LINK" vs "held by our payment partner
(Stripe)" — Stripe holds the funds; the safety line must be accurate), vendor terms (bypass
forfeiture), marketplace-facilitator tax language on invoices.

**Blocked on Cesar (unchanged from `vault/Payments.md`):** Stripe account + Connect enabled +
keys in Vercel; lawyer pass on vendor terms; tax advisor on facilitator nexus. Plus one design
decision: confirm the escrow safety-line wording above (option A "Held by NXT//LINK" / option B
"Held securely by our payment partner until you approve").

---

*Research cited: [Upwork — how milestone payments work](https://support.upwork.com/hc/en-us/articles/211063718-How-payments-for-milestones-and-fixed-price-contracts-work) · [Upwork — payment protection](https://support.upwork.com/hc/en-us/articles/211062568-How-Upwork-protects-your-payments) · [Alibaba Trade Assurance user guide](https://activities.alibaba.com/alibaba/buyer/cp/tradeassurance/guide.php)*
