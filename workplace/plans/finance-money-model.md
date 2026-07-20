# NXT//LINK — Money Model (Finance Plan)

**Author:** Finance dept · **Date:** 2026-07-20 · **Status:** PLANNING ONLY — no app changes.
**Verified against:** `src/lib/fees/engine.ts` (policy `launch-v2`), `vault/Fees.md`, `vault/Payments.md`, `vault/Project.md`.
Every number that is not from the code or a cited source is tagged **[ASSUMPTION]**.

---

## 0. The fee policy as it actually exists in code

From `src/lib/fees/engine.ts` (`DEFAULT_FEE_POLICY`, version `launch-v2`):

- **Marginal brackets** (like tax brackets, no cliffs): **5%** on the first **$50,000** of the *eligible subtotal*, **3%** on everything above.
- **Hard cap: $20,000 per project.** The cap starts binding at an eligible subtotal of **$633,334** (2,500 + 3% × (X − 50,000) = 20,000 → X = $633,333.33).
- **No minimum fee** in launch-v2 (`minimumFee: null`). Note: `vault/Fees.md` says "there's also a minimum floor" — the *engine supports* a floor, but the launch policy sets none. Vault note should be corrected.
- **Eligible subtotal excludes** sales tax/VAT, separately stated shipping, refundable deposits, pass-throughs, refunds, credits, cancelled quantities. So commission (and this whole model) runs on *net deal value*, not the invoice total.
- **Free-deal credit:** first **two** eligible deals per company get up to a **$1,250 commission credit each** (`FREE_DEAL_CREDIT = 1250`). Finance treatment below (§2.5).
- Manual adjustments require a reason + approver (`applyAdjustments`) — good; keep that discipline in the books too.

---

## 1. Unit economics of one deal

### 1.1 Processor rates used (researched July 2026 — re-verify at Stripe signup)

| Item | Rate | Source |
|---|---|---|
| Card (US, online) | **2.9% + $0.30** per charge | stripe.com/pricing |
| Card, international-issued | **+1.5%** (and +1% if currency conversion) | stripe.com/pricing |
| **ACH bank debit** | **0.8%, capped at $5.00** | stripe.com/pricing |
| Connect payout to vendor (platform-handles-pricing model, which is ours) | **0.25% + $0.25 per payout** | stripe.com/connect/pricing |
| Connect active account | **$2 per monthly-active connected account** | stripe.com/connect/pricing |
| Dispute fee | $15 each | stripe.com/pricing |
| Instant payout (avoid; use standard) | 1% of payout | stripe.com/connect/pricing |

Two structural facts drive everything:

1. **Stripe's percentage is charged on the FULL deal amount that flows through escrow, not on our commission.** The whole $700k moves through the platform to earn a capped $20k fee.
2. Per `vault/Payments.md`, the **buyer pays no platform fee — processing cost lives inside the vendor commission**, i.e. processing is NXT//LINK's cost of revenue.

### 1.2 Worked examples (plain math)

Commission = engine math. Processing = Stripe charge fee on full deal + payout fee on vendor payout (deal − commission). The $2/mo active-account fee is excluded here (it's per-vendor-month, not per-deal; see §6).

**Deal A — $10,000**
- Commission: 5% × 10,000 = **$500.00** (effective 5.00%)
- Vendor payout: 10,000 − 500 = 9,500 → payout fee: 0.25% × 9,500 + 0.25 = **$24.00**
- **If paid by card:** fee = 2.9% × 10,000 + 0.30 = $290.30 → **net to NXT//LINK = 500 − 290.30 − 24.00 = $185.70** (we keep 37% of our commission)
- **If paid by ACH:** fee = min(0.8% × 10,000, $5) = $5.00 → **net = 500 − 5.00 − 24.00 = $471.00** (we keep 94%)

**Deal B — $80,000**
- Commission: 5% × 50,000 + 3% × 30,000 = 2,500 + 900 = **$3,400.00** (effective 4.25%)
- Vendor payout: 76,600 → payout fee: **$191.75**
- **Card:** fee = $2,320.30 → **net = 3,400 − 2,320.30 − 191.75 = $887.95** (we keep 26%)
- **ACH:** fee = $5.00 → **net = 3,400 − 5.00 − 191.75 = $3,203.25** (we keep 94%)

**Deal C — $700,000 (cap hit)**
- Commission: 2,500 + 3% × 650,000 = 22,000 → **capped at $20,000** (effective 2.86%)
- Vendor payout: 680,000 → payout fee: **$1,700.25**
- **Card:** fee = 2.9% × 700,000 + 0.30 = **$20,300.30 — more than our entire commission** → **net = 20,000 − 20,300.30 − 1,700.25 = −$2,000.55. WE LOSE MONEY.**
- **ACH:** fee = $5.00 → **net = 20,000 − 5.00 − 1,700.25 = $18,294.75** (we keep 91%)

### 1.3 Summary table

| Deal | Commission | Net (card) | Net (ACH) | Card destroys |
|---|---|---|---|---|
| $10k | $500 | $185.70 | **$471.00** | 63% of commission |
| $80k | $3,400 | $887.95 | **$3,203.25** | 74% of commission |
| $700k | $20,000 (cap) | **−$2,000.55 (loss)** | **$18,294.75** | >100% |

### 1.4 Recommendations (payment rails)

1. **ACH bank debit is the default and only standard rail for escrow funding.** At these ticket sizes it is not an optimization, it is the business model. Policy: **[ASSUMPTION — proposed rule]** deals ≥ $10k are ACH-only; deals < $10k may offer card but card fees eat ~58%+ of commission, so prefer ACH everywhere.
2. If a buyer insists on card, either decline or surcharge — **card surcharging has legal/network rules (varies by state; Texas has restrictions)** → Legal must review before any surcharge is offered. Until then: ACH only.
3. **ACH caveats to design around** (Engineering + Ops):
   - ACH debits settle in ~4 business days. "Funded" status must mean **settled**, not initiated; vendor doesn't start/ship until settled.
   - ACH returns exist (insufficient funds; unauthorized-return windows — ~2 business days for business accounts). Stripe failed-ACH fee ≈ $4 **[verify at signup]**.
   - Stripe applies **default per-transaction ACH limits**; a single $700k debit likely needs a limit increase or milestone-split funding **[verify with Stripe]**. Milestone funding (Type 2 in `vault/Payments.md`) naturally splits big deals anyway.
4. **Borderplex-specific flag:** ACH requires a **US bank account**. Juárez-side buyers paying from Mexican accounts can't use ACH; a Mexican-issued card adds +1.5% (+1% FX) on top of 2.9%. **[ASSUMPTION]** most maquilas/manufacturers on the MX side have US entities or USD accounts — must be validated with the first real MX-side buyers. For pure-MX buyers, wire/bank transfer into Stripe (customer balance) is the fallback — pricing to verify. This is a real product/finance question, not a footnote.

---

## 2. Cash-flow mechanics of escrow

### 2.1 Timeline of one Type-1 deal (fixed-price, per vault/Payments.md)

```
Day 0   Buyer accepts quote → buyer funds FULL amount into Stripe (escrow)
Day ~4  ACH settles → status "funded" → vendor ships
Day D   Delivery → 5-day inspection window starts
Day D+6 Auto-release (or buyer approves earlier)
        → commission deducted AT RELEASE → vendor payout initiated
Day D+8 (approx) payout lands in vendor bank
```

### 2.2 When is it NXT//LINK's money?

- **At funding: $0 is ours.** The escrowed balance is the buyer's money held for the transaction — a **custodial liability**, not an asset, not revenue, not "cash we have." It never appears in NXT//LINK's P&L and should never be spent, borrowed against, or counted in runway.
- **At release: only the commission becomes ours.** Revenue is **recognized at release** — that is when NXT//LINK's performance obligation (a facilitated, protected transaction) is complete. Per the engine + vault rule: full refund ⇒ **zero** fee, which is exactly why recognizing anything earlier would be wrong.
- Simple bookkeeping: at funding — memo entry only ("escrow held — custodial: $X"); at release — revenue = fee, cost of revenue = Stripe charge fee + payout fee; vendor payout reduces the custodial balance to zero.

### 2.3 Why this ties to Legal's money-transmission flag

Holding other people's money for later payout is **money transmission**, a licensed activity (state by state, incl. Texas). NXT//LINK avoids needing a license **only** because funds live inside **Stripe Connect** (Stripe is the regulated party) and move via Stripe's charge/transfer primitives. The finance rules that keep us on the safe side of that line:

- Funds **never** touch a NXT//LINK bank account on the way from buyer to vendor. Ever.
- No manual "collect to our account, then pay the vendor" workarounds, even once, even for a friend.
- Stripe limits how long platform funds can sit before transfer **[verify current limit at signup]** — fine for a 5-day inspection window; must be checked for long multi-month milestone projects.
- Anything fancier (interest on float, holding deposits ourselves, MX-peso handling outside Stripe) = Legal review first.

### 2.4 Refund / dispute reserve

- Disputes freeze escrow (vault rule) — that part self-insures because commission wasn't taken yet.
- The exposure is **post-release**: clawbacks, goodwill credits (`applyAdjustments`), card chargebacks ($15 + reversal), late ACH returns.
- **[ASSUMPTION — starting policy]** Hold back **5% of monthly recognized revenue** in a reserve for **90 days**, then release to available cash. Recalibrate to the actual dispute/refund rate after ~20 deals. Concretely: on a $3,203 net-ACH deal, $170 sits in the reserve bucket for a quarter.

### 2.5 Free-deal credits are CAC, not lost revenue

First two deals per company get up to $1,250 commission credit each. Book credits as **contra-revenue tracked as customer-acquisition cost**. Note the cash reality: a first $10k ACH deal produces **$0 revenue and ~$29 of processing/payout cost** → net **−$29**. That's fine — it's the cheapest CAC in B2B — but it must be *visible* in the ledger, or month-1 revenue will look mysteriously bad versus GMV.

---

## 3. Track from day one: the minimal finance ledger

### 3.1 One row per deal (the ledger)

| Column | Where it comes from |
|---|---|
| `deal_id` / `source_quote_id` | `manual_deals` row (auto-created on quote accept, deduped by `source_quote_id`) |
| buyer / vendor | `manual_deals` |
| `deal_value` (eligible subtotal) | engine `computeEligibleSubtotal` — store it, plus gross and exclusions |
| `fee_charged`, `policy_version`, `effective_rate`, `applied_maximum` | engine `calculateFee` result — store the whole result, it's built to be recorded |
| `credit_applied` (free-deal) | deal/free-deal layer |
| `payment_method` (ach / card / wire) | Stripe PaymentIntent |
| `processor_cost` (charge fee + payout fee, **actuals**) | **Stripe balance-transactions API — never hand-compute when actuals exist** |
| `net_revenue` | fee_charged − credit_applied − processor_cost |
| `funded_at` (settled), `released_at`, `payout_at` | Order object status timestamps + Stripe payout |
| `status` | awaiting_payment → funded → in_progress → completed / disputed / refunded |

Until the Order object exists, the interim version is: `manual_deals` + a spreadsheet with the Stripe columns. Do not wait for engineering to start keeping this.

### 3.2 Monthly one-pager Cesar reads (10 numbers, no more)

1. Deals closed (count) · 2. GMV released ($) · 3. Commission billed · 4. Free-deal credits given · 5. Processing costs · 6. **Net revenue** · 7. Escrow currently held (custodial — labeled "NOT OUR MONEY") · 8. Disputes open / refunds issued · 9. Fixed costs (infra) · 10. Cash in bank.

Rule of thumb for reading it: **net revenue ≈ 91–94% of commission if everything ran on ACH.** If that ratio drops, someone paid by card — investigate.

---

## 4. Pricing sanity check: is 5% / 3% / $20k-cap competitive?

Light research, July 2026:

| Comparable | Take rate | Comparability |
|---|---|---|
| **Alibaba.com Trade Assurance** | **~3%** of order (some categories 3–8%) | **Closest analog** — escrow'd B2B industrial trade |
| General B2B marketplaces | ~2–10% (commonly 3–15% with value-add) | Direct range check |
| **Faire** (wholesale) | 15% commission + 1.9–3.5% processing; 0% on self-referred retailers | Consumer-goods wholesale, higher margins — not our category |
| **Xometry** | ~20–33% effective take | Managed buy/resell of custom parts — different model entirely |
| Industrial equipment auctions (Ritchie Bros, Liquidity Services) | 15–25% | Includes auction/inspection services |

**Verdict: KEEP 5% / 3% / $20k cap for launch.** Reasoning:
- The blended effective rate **glides down with deal size** (5.0% @ $10k → 4.25% @ $80k → 4.0% @ $100k → 2.86% @ $700k), which matches thin industrial margins on big-ticket deals — big buyers effectively get Alibaba-level pricing (~3%) *plus* local, bilingual, escrow-protected service; small deals pay a fair 5%.
- We are far below every high-touch comparable and inside the standard B2B band. There is no competitive pressure to cut, and cutting below 3% breaks unit economics once the 0.25% payout fee and reserve are counted.
- The free-deal credit already functions as the introductory discount — no need for a lower headline rate.

**Two watch-items for the first repricing review (after ~10 real closed deals):**
1. **Micro-deals:** a $2k deal nets ~$89 after ACH+payout fees. The engine already supports `minimumFee` — consider a small floor (e.g. $100–250 **[ASSUMPTION]**) if micro-deals become common.
2. **Mega-deals:** the uncapped 0.25% payout fee keeps eroding capped deals ($1M deal: $20k fee − ~$2,500 payout fee − $5 = ~$17.5k, 1.75% net). Acceptable, but worth negotiating with Stripe at volume.

**FUTURE options only — do NOT add at launch** (success-fee-only is the adoption pitch: "you pay when you get paid"): featured placement / sponsored listings; vendor SaaS tiers (analytics, CRM-lite); listing fees; financing/net-30 referral fees (P3 BNPL partner); logistics/customs referral fees (very Borderplex-appropriate).

---

## 5. 12-month projection FRAME (structure, not forecast)

Five input drivers → everything else is derived. All values below are **placeholders [ASSUMPTION]** for Cesar to overwrite with real numbers.

### 5.1 Drivers (inputs — one row each, 12 monthly columns)

| # | Driver | Placeholder | Real source in app |
|---|---|---|---|
| D1 | Invites/outreach sent per month | 40 | outreach tracker (outside app for now; early-access table) |
| D2 | Invite → active-vendor rate | 15% | vendor signups with a live storefront ÷ invites (Supabase) |
| D3 | Vendor monthly churn | 2% | vendors with zero activity 60 days |
| D4 | Quotes per active vendor per month | 1.5 | quotes table |
| D5 | Quote → close rate | 10% | accepted quotes (`manual_deals` created) ÷ quotes sent |
| D6 | Average deal size (eligible subtotal) | $30,000 | mean of `manual_deals.deal_value` |

### 5.2 Derived rows (formulas — engineering can render this as a dashboard)

```
active_vendors[m] = active_vendors[m-1] × (1 − D3) + D1 × D2
deals_closed[m]  = active_vendors[m] × D4 × D5
GMV[m]           = deals_closed[m] × D6
commission[m]    = deals_closed[m] × calculateFee(D6).fee     ← use the real engine, not a flat %
credits[m]       = (new companies' first/second deals) × min(fee, 1250)   ← CAC line
processing[m]    = deals_closed[m] × (5 + 0.25% × (D6 − fee) + 0.25)      ← ACH assumption
net_revenue[m]   = commission − credits − processing
fixed_costs[m]   = see §6
cash_flow[m]     = net_revenue − fixed_costs
```

Sanity anchor with placeholders: at $30k average, `calculateFee(30,000)` = $1,500 (5.0%); net per deal after ACH + payout fee ≈ **$1,424**. So "deals needed to cover ~$70/mo fixed costs" ≈ **1 deal every 20 months of infra covered per deal** — the model lives or dies on deal count, not costs.

Dashboard note for engineering (later): inputs D1–D6 as an editable drivers table; actuals overlay from `manual_deals` + Stripe balance transactions; chart actual vs. driver-implied per month. The fee engine is importable — never re-implement the fee math in the dashboard.

### 5.3 What this frame deliberately excludes

Milestone-deal timing (Type 2 splits cash across months), rent/lease recurring (Type 3), MX-peso deals — add rows only when the first real one happens.

---

## 6. Runway and costs reality

Monthly fixed costs, current vs. at-commercial-launch:

| Item | Now | At launch | Notes |
|---|---|---|---|
| Vercel | $0 (Hobby) | **$20/mo (Pro)** | **⚠ Hobby prohibits commercial use — must upgrade before charging money.** |
| Supabase | $0 (Free) | **$25/mo (Pro)** | Free tier pauses after inactivity + no PITR backups — not OK once real deals exist. |
| Stripe | $0 | $0 fixed + per-txn (§1) + **$2/mo per monthly-active vendor account** | 10 transacting vendors = $20/mo. |
| Email (Resend — confirmed in `src/lib/mail.ts`, Zoho fallback) | $0 (free 3k emails/mo) | $0 → $20/mo at scale | |
| SMS | $0 — **no SMS provider exists in the code today** | $0 unless added (Twilio ~$0.008/msg **[ASSUMPTION]**) | |
| Domain | ~$2/mo amortized | same | |
| **Total fixed** | **~$0–5/mo** | **~$65–90/mo** | |

One-time, pre-launch (from `vault/Payments.md` Phase-0 blockers): lawyer pass on vendor terms + tax advisor on marketplace-facilitator nexus — **[ASSUMPTION] $1,500–5,000 total.**

**Runway reading:** at ~$70/mo, cash runway is effectively unlimited for a solo founder — **the scarce resources are Cesar's time and the one-time legal spend.** One average ACH deal (~$1,400 net) covers ~20 months of infrastructure. Break-even is a deal-count problem, not a cost problem — which is exactly what §5's drivers measure.

---

## Sources

- Stripe pricing (card 2.9% + 30¢; ACH 0.8% capped $5; disputes $15): https://stripe.com/pricing ; corroborated by https://checkoutpage.com/blog/stripe-processing-fees and https://www.swipesum.com/insights/guide-to-stripe-fees-rates-for-2025
- Stripe Connect pricing ($2/monthly-active account; 0.25% + 25¢ per payout; 1% instant payout): https://stripe.com/connect/pricing
- B2B marketplace take rates (2–10% typical; industrial 15–25% for managed/auction): https://www.softwareplatform.net/2026/02/02/b2b-marketplace-take-rates/ ; https://www.shipturtle.com/blog/marketplace-commission-charges-industry-vendors-shipturtle-2026 ; https://www.tidemarkcap.com/vskp-chapter/marketplace-take-rates
- Xometry ~20–33% take: https://bowerycap.com/blog/insights/s-1-teardown-xometry ; https://multiples.vc/coverage/b2b-marketplaces
- Faire 15% commission + processing: https://craftybase.com/blog/how-much-does-faire-charge ; https://www.faire.com/support/articles/360015893392
- Alibaba Trade Assurance ~3% seller transaction fee: https://activity.alibaba.com/ggs/trade_assurance.html ; https://us.alibaba.com/blog/understanding-alibaba-seller-pricing-plans

*All Stripe rates must be re-verified on the live dashboard when the account is created (Phase-0 blocker #1).*
