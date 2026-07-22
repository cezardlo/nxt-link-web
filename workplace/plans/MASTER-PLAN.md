# NXT//LINK — Master Blueprint (all departments, reconciled)

**Date:** 2026-07-20 · **Assembled by:** the orchestrator, from the 7 department
plans in this folder. Read this first; open a department plan when you need its
detail. Every claim here traces to a department plan, which traces to the real
code/vault.

**The seven plans:**
[payments-and-tracking](payments-and-tracking.md) ·
[vendor-onboarding](vendor-onboarding.md) ·
[operations-map](operations-map.md) ·
[contracts-legal](contracts-legal.md) ·
[experience-design](experience-design.md) ·
[finance-money-model](finance-money-model.md) ·
[growth-and-invites](growth-and-invites.md)

---

## 1. The company in one picture

**Product contract (Cesar, clarified 2026-07-22):** NXT//LINK is an end-to-end
industrial purchasing workspace, not only a directory or RFQ tool. A **Project**
is the system of record for discovery, saved vendors/offerings, questions,
messages, NDAs, documents, demos, pilots, quote revisions, decision, purchase,
delivery/implementation, and relationship history. See `vault/Project.md` for
the canonical operating model and onboarding/revenue contracts. Every department
builds into that shared lifecycle; it must not create a second parallel workflow.

One pipeline, every department owning a piece:

```
INVITE ──── SIGN UP ──── PROFILE ──── LISTED ──── QUOTING ──── DEAL ──── ESCROW ──── PAID
(Growth      (Onboarding:  (Design:      (Ops:       (Ops SLAs,   (Payments: orders + one   (Finance:
 sequences,   /join link,   strength      approve,    nudges)      ledger; Legal: click-wrap  ledger, KPIs,
 warm calls)  magic link)   meter)        moderate)                terms at every step)       reserve)
```

- **Revenue rule (every plan agrees):** commission computed ONLY by
  `calculateFee()` (5% first $50k, 3% above, $20k cap), taken ONLY at escrow
  release. Full refund = zero fee.
- **Money rule (Finance + Legal, absolute):** funds live inside Stripe Connect
  only. They never touch a NXT//LINK bank account — that line is what keeps
  NXT//LINK out of money-transmitter licensing. No exceptions, ever.
- **Copy rule (Growth + Legal):** never promise escrow before Payments P1 is
  live; never write "NXT//LINK holds your money" (see §3.3).
- **Payment rail rule (Finance, decisive):** ACH bank debit is the default.
  Cards would destroy 60–100% of the commission on big deals ($700k card deal
  = a LOSS; same deal via ACH nets ~$18.3k).

## 2. Roadmap — merged build order (Ops runbook × Payments slices × Design waves)

**Wave 0 — Prove the machine (this week, no new code)**
- Deploy the merged app build (still waiting on Cesar's command).
- Ops rehearsal: one test run of apply → approve → RFQ → quote → accept →
  deal (prod tables have 0 rows — nothing is proven live yet).
- Verify env: `CRON_SECRET`, email vars, `ADMIN_ACCESS_CODE`, Supabase Auth
  Site URL + custom SMTP (magic links rate-limit without it).

**Wave 1 — Fill the funnel (weeks 1–2)**
- Onboarding slices 1–4: `vendor_invites` table → `/admin/invites` 3-field
  capture → `/join/[token]` magic-link quick account → reminder cron +
  unsubscribe. (Ops' "invited_at on leads" idea is superseded by the fuller
  `vendor_invites` table — one system, not two.)
- Payments S0 (no Stripe needed): merge the two commission ledgers, add FKs,
  reconcile endpoint.
- Legal groundwork: `legal_documents` + `terms_acceptances` tables + click-wrap
  checkboxes at signup (cheap now, painful to retrofit).
- Design foundations + first-touch: AppShell, shared LanguageToggle/i18n,
  unified ProfileStrengthMeter, invite landing built spec-native.
- Growth: first batch of 10–25 warm invites using the written EN/ES sequences
  (Email 3 = Variant B, pre-escrow, until P1 ships). Ops daily SOP starts day 1.
- Nudges: first-listing + quote-response waves (clone profile-nudges pattern).

**Wave 2 — Turn on the money (weeks 3–6; gated on Stripe account + attorney items 1–2)**
- Payments S1–S3: Stripe foundation, vendor payout onboarding (Express),
  Type-1 escrow end-to-end (fund → ship → 5-day inspection → auto-release
  day 6 → commission at release), admin payments console, vendor payouts tab.
- Design money screens born spec-native: EscrowTimeline, PaymentStatusChips,
  EscrowCheckoutPanel, FundedBadge, money emails (bilingual).
- Legal: Vendor Agreement + Escrow Terms live with click-wrap; quote-accept
  acceptance rows written in the same transaction as the order.
- Go/no-go to real money: full test-mode transaction incl. refund + dispute
  freeze; fee spot-check ($100k → $4,000); white-glove the first 3 live deals.
- Growth flips Email 3 to Variant A (escrow version). Ops adds funding/dispute
  steps to the daily SOP.

**Wave 3 — Scale & polish (after P1 stabilizes)**
- Payments S4–S5: milestones (cumulative fee rule!), disputes, hardening.
- Reskin continues: storefront → vendor tools → admin console + Today strip.
- Growth: referral loop, Borderplex institutions (INDEX Juárez first),
  programmatic SEO pages (quality-gated), SMS/WhatsApp phase 2 (after 10DLC +
  attorney TCPA check).
- Finance: repricing review after ~10 real deals (minimum-fee floor question).

## 3. Conflicts found between departments — resolved

1. **Landing route:** Onboarding says `/join/[token]`, Design says
   `/invite/[token]`. **Resolved: `/join/[token]`** (Onboarding owns the flow;
   Design's specs apply to that route).
2. **Reminder cadence:** Onboarding built 2 reminders (day 2, day 5, expire 30);
   Growth's sequence wants day 2, day 5, day 9 final-close (+2 optional SMS).
   **Resolved: adopt Growth's cadence** — the day-9 "honest close" email
   demonstrably converts fence-sitters and costs one extra cron wave.
   Engineering adds a third wave to the invite-reminders cron. Hard cap stays:
   4 emails + 2 SMS, stop instantly on signup/reply/STOP.
3. **Escrow safety-line wording:** Design mocked "Held by NXT//LINK until you
   approve" (option A). Legal §4.1 and Finance §2.3 both prohibit implying
   NXT//LINK holds funds. **Resolved: option B wording** — "Held securely by
   our payment partner (Stripe) until you approve" — pending attorney final
   phrasing. Design must update EscrowTimeline/FundedBadge copy accordingly.
4. **Free-deal credit wording:** it's up to $1,250 off each of the FIRST TWO
   eligible deals per company (per the engine), not "first deal" — all public
   copy must match the engine. Finance books credits as acquisition cost.
5. **Card threshold:** Payments suggested cards allowed under ~$5k; Finance
   proposed ACH-only ≥$10k. **Recommended to Cesar: ACH default everywhere;
   cards only below $5k** (and no card surcharge until Legal clears Texas
   rules). Decision item #6 below.
6. **Small doc fix:** `vault/Fees.md` claims a minimum-fee floor; the launch-v2
   engine has `minimumFee: null`. Vault to be corrected (one line).

## 4. Cesar's consolidated decision & action list

> **2026-07-21:** items #6, #7, #8, #9, #11 are DECIDED — binding answers in
> `DECISIONS-2026-07-21.md` (tiered payment methods, per-type approval periods,
> approved payment-partner wording, $250 standard / $1,250 founding-only credit,
> plus S0 one-ledger approval). Items #1–4, #10, #12–14 remain open.

**Accounts / money (gates Wave 2):**
1. Create the Stripe account, activate it, enable Connect (Express) + ACH,
   paste keys into Vercel — numbered walkthrough in payments plan §5.
2. Hire the Texas marketplace attorney (list of exact questions in legal plan
   §6; items 1–2 gate real money) + a tax advisor (marketplace-facilitator).
3. Upgrade Vercel Hobby → Pro (~$20/mo) BEFORE charging money (Hobby bans
   commercial use). Supabase → Pro (~$25/mo) at launch.

**Config (gates Wave 1):**
4. Set `ADMIN_ACCESS_CODE` in Vercel; set Supabase Auth Site URL + redirect
   URLs; set up custom SMTP on Supabase Auth (magic links rate-limit without).

**Product decisions (say yes/no/change):**
5. Invited vendors skip admin review (recommended: yes — the invite IS the review).
6. ACH default; cards only below $5,000; no surcharges yet (recommended: yes).
7. Inspection window: 5 CALENDAR days (recommended) or business days — the
   contract must pick one.
8. Escrow safety line: option B "held by our payment partner" (recommended).
9. Market the $1,250 first-two-deals credit in invites? (recommended: yes,
   after attorney confirms the promo terms).
10. SMS at launch? (recommended: later — email now, WhatsApp for Juárez;
    10DLC + TCPA check first).
11. Confirm business rules to hard-code: 5-day inspection, 14-day milestone
    auto-approve.

**People / habits:**
12. Sending identity: from-domain, operator name, the phone number that answers.
13. The first list: 10–25 vendors you can call warmly — you call, then the
    sequence runs.
14. Run the Wave-0 rehearsal; commit to the 20-minute daily SOP (ops plan §2).

## 5. Cross-department dependency matrix (who waits on whom)

| Needs | From | For |
|---|---|---|
| vendor_invites + magic-link + event tracking | Engineering | Growth's funnel numbers, Ops' KPI #1 |
| terms tables + click-wrap capture | Engineering | Legal's evidence records (before first $) |
| EscrowTimeline states | Payments S2 backend | Design's money screens |
| Escrow wording sign-off | Attorney (via Cesar) | Design + Growth copy |
| Invoice/chase templates (pre-P1) | Finance | Ops' manual commission collection |
| Consent script + who-sends-invites rule | Ops | Onboarding SMS phase 2 |
| $1,250 credit sign-off | Cesar + attorney | Growth copy |
| Attorney items 1–2 | Cesar | Wave 2 go-live |

## 6. Standing protections (never regress)

The 10-item do-not-regress list lives in the design plan §4.3 (Accept-with-total,
static dates not timers, "Free to send" lines, trust badges, fill bars,
Today/Next/Then, hidden buyer contact pre-acceptance, honest pricing). Every
future PR checks against it.
