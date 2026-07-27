# Fees — the real commission math

**Source of truth:** `src/lib/fees/engine.ts` → `calculateFee(net)`.
Use this engine everywhere. **Ignore** any older spec that says "7% / 5% / 3% /
$20k / $25k" — those were superseded schedules, not the app.

## Current policy (launch-v3 — Cesar's ruling 2026-07-27)
- **4%** on the first **$50,000** of net deal value
- **2%** on everything above $50,000
- Fee is **capped at $12,500** per deal (`appliedMaximum`)
- No minimum floor by default (a `minimumFee` can still be set per policy)

## First-deal benefit — 50% off (NOT a credit)
- A vendor company's **first eligible deal gets 50% OFF** the computed,
  already-capped fee. Order: **brackets → cap → 50% off**.
- Eligibility (kept from the old resolver): **one per company**, within
  **90 days** of signup.
- One resolver both sides: `resolveFirstDealDiscount()` +
  `firstDealDiscountAmount(fee)`. This REPLACED the old tiered credit system
  ($250/$1,250 + deprecated $1,250 free credit) — the admin-vs-vendor dollar
  mismatch is now structurally impossible.
- Phase 2 (NOT built): 0% pre-existing-customer exemption (dated-proof + admin
  review). Extension point noted in the code.

## `calculateFee(net)` returns
`{ fee, effectiveRate, appliedMaximum, appliedMinimum, policyVersion, lines }`

## Other constants
- `FIRST_DEAL_DISCOUNT_RATE = 0.5`, `FIRST_DEAL_WINDOW_DAYS = 90`
- `PROTECTION_MONTHS = 12`

## Where fees are used
- Accepted buyer quote → auto-creates a draft `manual_deals` row (deduped by
  `source_quote_id`) using `calculateFee`.
- Admin Commission Co-pilot (`/admin/deals`) parses a sentence like
  "Log Acme deal $100k for buyer XYZ" then computes the fee with `calculateFee`
  and **prefills** the form (does not save on its own).
