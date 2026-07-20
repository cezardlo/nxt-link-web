# NXT//LINK Operations Map — how the company runs day to day

**Owner:** Operations (for Cesar, solo operator)
**Date:** 2026-07-20 · **Status:** Plan (no code changes in this doc)
**Grounded in:** `vault/Flow.md`, `vault/Payments.md`, `vault/Backlog.md`, the live
Operator Console (`src/app/admin/*`), and the cron job
(`src/app/api/cron/profile-nudges/route.ts`, scheduled daily 16:00 UTC in `vercel.json`).

**Principles:** blameless (fix the machine, not the person), everything has one
screen and one SLA, nothing depends on Cesar remembering — the reminder machine
and the daily checklist do the remembering.

---

## 1. The end-to-end operating pipeline (one map)

Eleven stages. Stages 1–6 are **live today**. Stages 7–10 (escrow) arrive with
**Payments P1** — until then, use the interim manual path in §1b. Console routes
are under `/admin` (access code → `ADMIN_ACCESS_CODE`).

| # | Stage | Automatic | Cesar does (screen) | SLA | Exception path |
|---|-------|-----------|---------------------|-----|----------------|
| 1 | **Vendor invited** | Nothing yet — no invite tracking exists in code (gap, §3). Homepage early-access modal writes `early_access_leads`; banned emails silently blocked. | Send invite (email/WhatsApp/in person), then log the lead's stage on **/admin/applications** (`new → contacted → onboarding → onboarded → declined`). | Log same day; first follow-up within 3 days. | No reply after 2 nudges + 14 days → mark `declined` with a note; recyclable next quarter. |
| 2 | **Signed up** | `/vendor-signup` creates auth user; `vendor_profiles` auto-created on first authed call. `/apply` writes `vendor_applications` (`pending`) with logo/images. | Check for new applications on **/admin/vendor-applications** (linked from /admin/applications). | Review within **1 business day**. | Signed up but never applied/completed → caught by the nudge cron (24h/72h waves) and the weekly sweep (§2). |
| 3 | **Profile complete** | Portal auto-saves (`PATCH /api/vendor/profile`); AI concierge drafts description; profile-strength meter guides them. Cron nudges at ~24h and ~72h if logo/description/categories missing (skips suspended/banned). | Spot-check stalled profiles via **/admin/directory**; call/text the vendor personally after the 72h email (personal touch closes what email can't). | Profile complete within **7 days** of signup. | Stuck >7 days → one personal call. Stuck >14 days → mark lead `declined`-equivalent in notes; stop chasing (cron auto-stops after ~10 days). |
| 4 | **Approved / listed** | Approve on the console idempotently creates/links a live `vendor_profiles` row (status `approved`, moderation `active`) and sends the bilingual welcome email. (Known quirk: the DB trigger holds the literal `vendor_applications.status` for access-code admins — the created profile is the source of approval truth. See `vault/Flow.md` gap 3.) | Approve/reject on **/admin/vendor-applications**. Verify their first listing appears on **/admin/marketplace**. | Decision within **1 business day**; first listing within **7 days** of approval. | Reject with reason (keep it kind — Borderplex is small). Approved but 0 listings at day 7 → personal nudge; listing-nudge email is a build item (§3). |
| 5 | **Quoting** | Buyer RFQs auto-dispatch to matched vendors (`dispatchRequestToVendors`); listing requests write `quote_requests` + notify/email vendor; vendor quote runs `calculateFee`, upserts `commissions` (`quoted`, 90-day protection), emails buyer. Buyer contact info **masked** until acceptance (anti-circumvention). | Watch unanswered leads on **/admin/requests**; re-rank and "Push to vendors" on **/admin/match** if an RFQ has no takers. | Vendor first response within **48h** of lead delivery (this is the marketplace's heartbeat metric). | Lead unanswered 48h → nudge vendor (manual today; automated nudge is a build item, §3). Unanswered by all at 72h → Cesar matches manually on /admin/match and phones the top vendor. Repeatedly unresponsive vendor → moderation note, eventually suspend (§5). |
| 6 | **Deal (quote accepted)** | Buyer accept runs `calculateFee`, flips `commissions` to `accepted`, auto-creates a draft `manual_deals` row (deduped by `source_quote_id`, 12-mo protection), emails vendor. Off-console deals: co-pilot (`/admin/deals` assist) parses plain English + prefills fee; save blocks suspended/banned vendors (409); `FREE_DEAL_CREDIT` $1,250 applies. | Confirm/advance the deal on **/admin/deals**; log any off-platform-reported deal via the co-pilot **the day you hear about it**. | Deal record confirmed within **1 business day** of acceptance. | Buyer accepts then ghosts → 2 nudges over 7 days, then mark deal lost and release the vendor. **Watch for duplicates**: co-pilot deals don't carry `source_quote_id`, so an accepted quote logged again via co-pilot double-counts (Flow gap 5) — dedupe by vendor+amount+date in the weekly reconcile (§2). |
| 7 | **Escrow funded** *(P1)* | Buyer pays into Stripe Connect escrow (manual capture) on accept; order status `awaiting_payment → funded`; vendor sees "funded — start work". | Check unfunded orders on the deals screen (P1 adds order status there). | Funded within **3 business days** of acceptance. | Unpaid buyer: reminder day 1 and day 3 (build item, §3); Cesar calls day 5; unfunded day 7 → quote reverts to open, vendor freed, deal marked lost-unfunded. |
| 8 | **Delivered** *(P1)* | Vendor marks shipped with tracking; buyer notified; inspection clock arms. | Nothing routine. If tracking is stale >7 days past promised date, contact vendor. | Ship by quoted timeline; tracking within 24h of shipping. | Vendor can't deliver → buyer chooses: wait (documented), partial, or full refund from escrow (commission = $0 on full refund — fee is taken **at release, never before**). |
| 9 | **Inspection** *(P1)* | **5-day inspection window**, auto-release day 6. Dispute press stops the clock and freezes escrow. | Nothing unless disputed. Disputes: run the freeze runbook (§5), review within **48h**. | Auto (5 days). | Dispute → §5. Outcomes: full refund / partial / release — all logged immutably. |
| 10 | **Released / paid** *(P1)* | Release triggers `calculateFee` at release; commission deducted as application fee; Stripe pays vendor out; invoice PDF names NXT//LINK as facilitator. | Verify payout succeeded (Stripe dashboard) and deal shows `paid` on **/admin/deals**. | Payout visible within 2 business days of release. | Stripe payout failure (KYC hold, bank issue) → vendor fixes in Stripe Express dashboard; Cesar tracks on the weekly sweep until cleared. |
| 11 | **Commission collected** | **Today (pre-P1):** nothing automatic — commission is invoiced manually (§1b). **P1:** automatic at release (stage 10) and this stage merges into it. | Advance deal to `paid` on **/admin/deals**; verify totals on **/admin/commissions**. | Invoice within 3 days of vendor being paid by buyer; chase at 15/30 days. | Unpaid commission at 30 days → payment-plan offer; at 60 days → suspend vendor (§5) + Legal letter. Circumvention (deal done off-platform to dodge fee) → §5. |

### 1b. Interim money path (today, until Payments P1)

There is no escrow yet, so stages 7–10 collapse to:
accepted quote → vendor and buyer transact directly → vendor reports outcome
(12-month protection window obligates them) → Cesar confirms deal on
**/admin/deals** → Cesar invoices the vendor the commission (Zoho email, manual)
→ marks `paid` when money lands. **This makes stage 11's SLA and chase cadence
the single most important manual discipline pre-P1.** Every accepted quote gets
a calendar follow-up at +14 days: "did this close? for how much?"

---

## 2. Daily / weekly operator SOP

### Daily — ~20 minutes, same order every day (with morning coffee)

| # | Min | Do | Screen |
|---|-----|----|--------|
| 1 | 2 | New vendor applications? Approve/reject (1-business-day SLA). | /admin/vendor-applications |
| 2 | 2 | Early-access leads: advance stages, log yesterday's outreach. | /admin/applications |
| 3 | 3 | New buyer RFQs: sanity-check each; if auto-dispatch found no vendors, match + "Push to vendors" manually. | /admin/requests → /admin/match |
| 4 | 3 | Quotes/leads older than 48h with no vendor response → nudge the vendor (text/call beats email here). | /admin/requests (+ vendor "needs attention" strip once built — Backlog item 11) |
| 5 | 3 | Accepted quotes: confirm draft deals; log any deal reported by phone via the co-pilot. | /admin/deals |
| 6 | 2 | Commissions owed: anything crossing 15/30 days → send the chase email today. | /admin/commissions |
| 7 | 2 | New listings look legit (no junk/spam)? | /admin/marketplace |
| 8 | 1 | Any moderation follow-ups (suspensions expiring, appeals)? | /admin/vendors |
| 9 | 2 | Inbox pass: buyer/vendor support emails — answer or file for the weekly block. | Zoho inbox |

*P1 adds:* unfunded orders (day-3+) and open disputes (48h clock) — both slot
into steps 5–6 without growing the 20 minutes, because disputed/unfunded items
should be rare.

### Weekly — Friday, ~45 minutes

1. **Reconcile the two ledgers** (Flow gap 4): compare `commissions` vs
   `manual_deals` on /admin/commissions + /admin/deals; flag any accepted
   commission without a deal, any co-pilot deal that duplicates an accepted
   quote (same vendor + similar amount + same week), and fix by hand.
2. **KPI snapshot** (§4): write the six numbers into a running note
   (`workplace/ops/kpi-log.md`, one line per week). 10 minutes, keeps trends honest.
3. **Stalled-vendor sweep**: /admin/directory — signups >7 days with incomplete
   profiles, approved vendors with 0 listings → pick up the phone (2–3 calls max).
4. **+14-day deal follow-ups** (pre-P1): every quote accepted 14 days ago —
   "did it close?" email/call.
5. **Pipeline review**: is anything violating its SLA two weeks running? That's
   a machine problem, not a Cesar problem — file it in `vault/Backlog.md`.

---

## 3. The reminder machine

### Exists today (live)

| Nudge | Trigger | Channel | Stop condition |
|-------|---------|---------|----------------|
| Profile nudge wave 1 | ~24h after signup, profile incomplete (no logo / description <40 chars / no categories) | Email (cron, daily 16:00 UTC = ~10am El Paso) | Profile complete, or `nudge_24_at` set (sent once), or suspended/banned, or >10 days old |
| Profile nudge wave 2 | ~72h after signup, still incomplete | Email (same cron) | Same, via `nudge_72_at` |
| New-lead alert | Buyer requests a quote / RFQ dispatched | Email + in-app notification to vendor | One-shot |
| Quote-received alert | Vendor sends quote | Email + notification to buyer | One-shot |
| Decision alert | Buyer accepts/declines | Email + notification to vendor | One-shot |
| Welcome email | Application approved (or early-access lead moved to `onboarded`, once via `welcomed_at`) | Email (bilingual) | One-shot |

### Missing — build list for the invite funnel (priority order)

1. **Invite tracking + invite nudge** — nothing in code knows an invite was
   sent. Smallest fix: add `invited_at` / `invite_channel` to
   `early_access_leads` (or log invites as leads at stage `contacted`), then a
   cron wave: no signup at day 3 and day 7 → bilingual "your invite is waiting"
   email. Stop: signup, or 2 sends, or declined.
2. **First-listing nudge** — approved vendor, 0 published listings at day 3 and
   day 7. Stop: first listing published, or 2 sends.
3. **Quote-response nudge (vendor)** — lead unanswered at 48h ("quote due —
   buyer waiting"), plus the vendor-side "needs attention" strip (Backlog
   item 11) so vendors see it on login. Stop: responded, or lead expired.
4. **Quote-expiry reminder (buyer)** — quote valid-until minus 48h. Stop:
   decision made or quote expired.
5. **Commission chase (pre-P1)** — deal `won` and unpaid at 15/30/45 days.
   Stop: marked `paid`. (Dies when P1 auto-deducts at release.)
6. **P1 set** — escrow-funding reminder (accepted, unfunded, day 1/3);
   inspection-window reminder (day 4 of 5: "release or dispute tomorrow");
   payout-failure alert to Cesar.

All new nudges follow the existing pattern: one cron route under
`/api/cron/*`, guarded by `CRON_SECRET`, timestamps on the row so each wave
sends at most once, skip suspended/banned, schedule in `vercel.json`.
**No dark patterns** — every nudge states a real fact and a real deadline.

### Full cadence table (target state)

| Who | When | Channel | Says | Stop |
|-----|------|---------|------|------|
| Invited vendor | Day 3, day 7 after invite | Email (+ Cesar WhatsApp day 10) | "Your NXT//LINK invite is waiting" | Signed up / 2 sends / declined |
| Signed-up vendor | 24h, 72h after signup | Email (live) | "Finish your profile" | Profile complete |
| Approved vendor | Day 3, day 7 after approval | Email | "Publish your first listing" | First listing live |
| Vendor with lead | 48h unanswered | Email + in-app strip | "Buyer waiting — quote due" | Quote sent / expired |
| Buyer with quote | 48h before quote expiry | Email | "Quote expires Fri — accept or ask" | Decision made |
| Buyer accepted, unfunded (P1) | Day 1, day 3 | Email | "Fund escrow to start" | Funded / day-7 revert |
| Buyer in inspection (P1) | Day 4 of 5 | Email | "Release or dispute by tomorrow" | Released / disputed |
| Vendor owing commission (pre-P1) | Day 15, 30, 45 | Email, then call | Invoice reminder | Paid |
| Cesar | Daily 10am | Console checklist (§2) | — | — |

---

## 4. KPIs that matter now

Six numbers, captured weekly (Friday, §2). Sources are what exists **today**;
the "later" column is the instrumentation to build so the number becomes
one-click. Targets are starting hypotheses to beat, not industry gospel.

| KPI | Definition | Source today | Later | Starting target |
|-----|-----------|--------------|-------|-----------------|
| Invite → account | % of invited vendors who sign up | Manual: invites logged on /admin/applications vs. new `vendor_profiles` (blocked on invite tracking, §3.1) | `invited_at` on leads → auto rate | ≥ 40% (warm, in-person Borderplex invites should convert far better than cold) |
| Account → first listing | Median days signup → first published listing; % within 14 days | `vendor_profiles.created_at` vs. earliest `marketplace_products/services.created_at` (visible via /admin/directory + /admin/marketplace) | "Days to first listing" column on /admin/directory | ≥ 60% within 14 days |
| Quote response time | Median hours lead created → vendor quote (`quote_requests.created_at` → responded) | Eyeball on /admin/requests | Ops metrics strip on /admin (p50/p90) | p50 < 24h, p90 < 72h |
| Deal cycle time | Days RFQ created → quote accepted (later: → escrow released) | `client_requests/quote_requests` dates vs. `manual_deals.created_at` | Same strip | < 21 days |
| Escrow disputes | Disputes per 100 released orders; % resolved < 48h | N/A until P1 (interim proxy: complaints reaching Cesar's inbox, tally in kpi-log) | P1 order table | < 5%; 100% first-response < 48h |
| Commission collected | $ collected vs. $ owed (`manual_deals` `won` vs `paid`), current month | **/admin/commissions** + **/admin/deals** | Auto at release (P1) | ≥ 90% within 30 days pre-P1; ~100% post-P1 |

One build item makes all six cheap: a read-only **"Ops metrics" strip on
/admin** computing these from existing tables. Until then the Friday manual
snapshot (5–10 min) is fine and keeps Cesar close to the numbers.

---

## 5. Risk & exception runbook

Blameless rule: write down *what happened and when*, never *whose fault*.
Every action below lands in an audit trail (`vendor_moderation_log`,
`platform_audit_log`) — that's the company's memory and its legal shield.

### 5.1 Dispute freeze (P1; principles apply to interim complaints today)

1. Buyer/vendor raises dispute → escrow **frozen**, auto-release clock stopped
   (P1 does this automatically; pre-P1, Cesar freezes the *commission invoice*).
2. **Within 48h**: Cesar acknowledges both sides in writing — "reviewing, no
   money moves until resolved."
3. Collect: quote, order record, tracking, photos, message thread. Facts only.
4. Decide within 5 business days: **full refund** (commission = $0 — fee only
   ever taken at release), **partial** (fee on the released portion), or
   **release** as agreed.
5. Log the outcome + reasoning immutably. Both parties get the written decision.
6. Party rejects the outcome → §5.4 (Legal). Money stays frozen meanwhile.

### 5.2 Refund path

- **Pre-shipment:** cancel PaymentIntent (manual capture not yet taken) — buyer
  never charged beyond auth. Deal marked lost; vendor notified.
- **Post-shipment full refund:** refund from escrow; commission $0; deal
  `refunded`; note whether vendor-caused (pattern → moderation).
- **Partial:** agreed split; `calculateFee` on the released amount only.
- **Pre-P1:** no escrow — refunds are between buyer and vendor; NXT//LINK
  waives/adjusts the commission to match the real net, and Cesar corrects the
  `manual_deals` amount on /admin/deals.

### 5.3 Vendor suspension / ban (screen: **/admin/vendors**)

Ladder — always in this order unless fraud (then jump to ban):
1. **Note + warning** (email, factual, cite the term broken).
2. **Timed suspension** — hidden from marketplace, keeps portal access;
   auto-reactivates on expiry (`autoReactivateIfExpired`); logged.
3. **Ban** — email blocked from re-applying (`isEmailBanned`); logged.

Standard triggers: circumvention attempt (contact-swap before acceptance) →
warning, second time → 30-day suspension; confirmed off-platform bypass of a
protected deal → suspension + commission still owed + pending-funds forfeiture
once vendor terms say so (P0 legal item); unpaid commission 60 days →
suspension until paid; fraud/misrepresentation → ban.
Suspended/banned vendors are automatically excluded from nudges and blocked
from new deals (409 on /admin/deals save) — the machine already enforces this.

### 5.4 Escalate to Legal / attorney (don't improvise)

- Any threat of lawsuit, or demand letter received.
- Dispute > $10k, or any dispute either party rejects after §5.1.
- Suspected fraud (fake company, stolen goods, sanctions/export questions —
  real risk in cross-border industrial trade; Juárez-side deals raise
  Mexico-law questions).
- Chargeback on a released escrow payment (P1).
- Before publishing/enforcing: vendor terms (bypass-forfeiture clause), escrow
  terms, marketplace-facilitator tax setup — the three items already flagged as
  Cesar-only blockers in `vault/Payments.md`.
- Rule of thumb: **if a step would need NXT//LINK to keep someone's money over
  their objection, a lawyer looks first.**

---

## 6. Launch runbook for this initiative

Order: **Wave 0 (prove today's machine) → Wave 1 (invite funnel) → Wave 2
(Payments P1) → Wave 3 (reskin)**. Ops logic: fill the top of the funnel with
the machine that exists, add money rails when there are deals to rail, repaint
last. Reskin is deliberately behind P1 — pixels don't move revenue; escrow does.

### Wave 0 — Prove the current loop end-to-end (this week)
Flow gap 9 says the core tables (`manual_deals`, `vendor_applications`,
`early_access_leads`, `platform_audit_log`) have **0 rows in prod** — the paths
are wired but unproven. Run one real rehearsal: Cesar submits a test
application → approves it on /admin/vendor-applications → welcome email lands →
test RFQ → dispatch → quote → accept → draft deal appears → advance to paid.
**Go/no-go:** every step leaves the expected row + email. Any break is a bug to
fix before inviting real vendors. Also verify `CRON_SECRET` is set in Vercel
and the nudge cron ran (Vercel cron logs show 200).

### Wave 1 — Onboarding funnel (weeks 1–2)
- Build: invite tracking + invite nudges, first-listing nudge, vendor
  "needs-attention" strip (Backlog 11), quote-response nudge. (Engineering)
- Cesar starts the §2 daily SOP on day one of Wave 1 — with the first 10
  invited vendors, not after.
- **Go/no-go to invite beyond the first 10:** ≥ 5 approved vendors each with
  ≥ 1 published listing; application-review SLA held for 2 consecutive weeks;
  zero unexplained funnel drop (every invited vendor's state is known).

### Wave 2 — Payments P1: Stripe Connect escrow (weeks 3–6)
- **Pre-req (blocked on Cesar, Phase 0):** Stripe account + Connect enabled +
  keys in Vercel; attorney pass on vendor/escrow terms; tax advisor on
  facilitator nexus (`vault/Payments.md`).
- Build per Payments P1: Connect Express onboarding, Type-1 flow (fund on
  accept, manual capture, ship + tracking, 5-day inspection, auto-release
  day 6, refund path), commission via `calculateFee` at release.
- **Go/no-go to real money:** one full test-mode transaction including a refund
  and a simulated dispute freeze; invoice PDF correct (facilitator named);
  fee math spot-checked against `vault/Fees.md` ($100k → $4,000); §5 runbook
  dry-run once; P1 reminder set (§3.6) live.
- First 3 live escrow deals get white-glove treatment: Cesar personally walks
  both sides through funding and release.

### Wave 3 — Reskin to Design System v1.0 (after P1 stabilizes)
- Screen-by-screen per `vault/Backlog.md` order; tokens already wired.
- **Go/no-go per screen:** verified live, EN/ES both render, no flow behind it
  broke (smoke: RFQ → quote → accept still works).
- Freeze rule: any open P1 payment incident pauses reskin work — money bugs
  outrank paint.

### Standing go/no-go for the whole machine
Weekly (§2 step 5): SLAs held? KPIs captured? Reconciliation clean? Two
consecutive misses on the same item = stop inviting, fix the machine, resume.

---

## Open dependencies (tracked)

- **Engineering:** invite tracking + 4 nudge crons (§3), vendor needs-attention
  strip (Backlog 11), Payments P1, ledger reconciliation guard (Flow gaps 4–5),
  /admin ops-metrics strip (§4).
- **Legal:** vendor terms (bypass forfeiture), escrow terms, dispute-decision
  template, marketplace-facilitator tax review.
- **Finance:** commission invoice template + chase-email templates (pre-P1),
  monthly commissions-collected roll-up.
- **Cesar (only Cesar can):** Stripe account + Connect + keys; pick attorney +
  tax advisor; confirm `CRON_SECRET`/email env live in Vercel; run Wave 0
  rehearsal; commit to the 20-minute daily SOP.
