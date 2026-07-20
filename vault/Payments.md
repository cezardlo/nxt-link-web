# Payments — escrow model (decided 2026-07-16, not yet built)

The synthesis of Fiverr / Upwork / Alibaba Trade Assurance, tailored for
industrial B2B. Cesar supplied the full research; this note is the distilled,
canonical version. Commission math stays per [[Fees]] (`calculateFee` — 5%
first $50k, 3% above, $20k cap). Ignore the research doc's "5–12%" range.

## Core principle
Every transaction flows through **NXT//LINK escrow** on a licensed provider —
**Stripe Connect** for Phase 1 (manual capture + destination transfers with
application fee). NXT//LINK never holds funds directly.

## Flows
**Type 1 — fixed-price product (accepted quote, no milestones)**
Accept → pay total into escrow → vendor ships (tracking) → buyer gets a
**5-day inspection window** → auto-release day 6 → commission deducted at
release → payout.

**Type 2 — service/project with milestones**
Accepted quote carries a milestone plan (e.g. 30/40/30). Buyer funds ONE
milestone at a time; vendor submits → buyer approves or requests changes →
release (minus commission) → next milestone funding unlocks. **14-day
auto-approve** after submission (Upwork model). Disputes stop the clock.

**Type 3 — rent/lease (future)**
Recurring monthly charge through the platform; first month held as deposit.

## Rules that keep it fair
- Commission is taken **at release**, never before — full refund ⇒ zero fee.
- Disputes freeze escrow; operator reviews within 48h; outcomes: full refund /
  partial / release. All logged immutably.
- Buyer pays no platform fee (B2B-clean); processing cost lives inside the
  vendor commission.
- Off-platform bypass = suspension + forfeiture of pending funds (must be in
  vendor terms); on-platform = escrow protection, reviews, reorder history.

## Wiring into what exists
- Accepted quote already auto-creates a draft `manual_deals` row ([[Fees]]).
  The Order object extends that: status `awaiting_payment → funded →
  in_progress → completed | disputed`, milestones[], payment_intent_id.
- Vendor onboarding gains a **"connect payout method"** step (Stripe Connect
  Express onboarding; Stripe does KYC).
- Buyer sees: "Pay $X to start" → "Payment secured in NXT//LINK Escrow" →
  milestone progress bar → "Review and release $Y".
- Vendor sees: "Milestone 1 funded — start work" → "Awaiting buyer approval" →
  "Released. Next milestone pending funding." + Payouts tab.
- Stripe Tax for sales tax/VAT; auto-generated PDF invoice naming NXT//LINK as
  marketplace facilitator.

## Blockers only Cesar can clear (Phase 0)
1. Create the Stripe account + enable Connect; get API keys into Vercel env.
2. Lawyer pass on vendor terms (bypass forfeiture clause, escrow terms).
3. Tax advisor on marketplace-facilitator nexus (Stripe Tax config).

## Build phases (see [[Backlog]])
- **P1**: Stripe Connect Express vendor onboarding + Type 1 flow (manual
  capture, 5-day window, auto-release, refund path).
- **P2**: milestones (Type 2) + dispute freeze + operator resolution screen.
- **P3**: rent/lease recurring, ACH/wire, multi-currency payouts, B2B net-30
  via BNPL partner (Billie/Hokodo).
