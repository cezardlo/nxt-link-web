# Fees — the real commission math

**Source of truth:** `src/lib/fees/engine.ts` → `calculateFee(net)`.
Use this engine everywhere. **Ignore** any spec that says "7% / 5% / 3% /
$25k" — that was a proposal, not the app.

## Current policy (launch-v2)
- **5%** on the first **$50,000** of net deal value
- **3%** on everything above $50,000
- Fee is **capped at $20,000** (`appliedMaximum`)
- There's also a minimum floor (`appliedMinimum`)

## `calculateFee(net)` returns
`{ fee, effectiveRate, appliedMaximum, appliedMinimum, policyVersion, lines }`

## Other constants
- `FREE_DEAL_CREDIT = 1250` (first-deal credit)
- `PROTECTION_MONTHS = 12`

## Where fees are used
- Accepted buyer quote → auto-creates a draft `manual_deals` row (deduped by
  `source_quote_id`) using `calculateFee`.
- Admin Commission Co-pilot (`/admin/deals`) parses a sentence like
  "Log Acme deal $100k for buyer XYZ" then computes the fee with `calculateFee`
  and **prefills** the form (does not save on its own).
