# First-deal fee-credit rework (task #7b) — architecture plan

Status: DESIGN APPROVED-IN-PRINCIPLE by DECISIONS-2026-07-21.md §5; ONE open choice for Cesar (grandfathering, §8 below) before Slices 3+5 ship. Produced 2026-07-21 by the Architecture Advisor (Opus, read-only). Sonnet implements.

## Verified load-bearing facts
1. The engine is ALREADY launch-v2 (5% first $50k / 3% above / $20k cap). The 6 failing tests in tests/fee-engine.test.ts expect the RETIRED 15/12.5/10 schedule — fix = update test expectations, engine percentages stay byte-identical.
2. "First two deals, $1,250 each" is NOT enforced in code — it's a client checkbox the server trusts (`admin/deals/route.ts` trusts `body.is_free_credit`; nothing ever writes `free_deals_used`/`free_deals_reserved`; the vendor "2 of 2 credits" banner is decorative).
3. Schema drift: `vendor_profiles` repo migration lacks columns code reads (free-deal counters, moderation). Same house law as the ledger plan: introspect live first, `IF NOT EXISTS`, preview branch, migrations before code.
4. Signup anchor = `vendor_profiles.created_at` (indexed; no approved_at exists).
5. Founding toggle host = existing admin-gated `PATCH /api/vendors/manage` + `/admin/vendors` page.
6. Invite emails already omit the credit — welcome emails are the only over-promising copy.

## Design
- **Founding designation:** additive `vendor_profiles.founding_vendor boolean NOT NULL DEFAULT false` + `founding_set_by text` + `founding_set_at timestamptz` (audit). Operator-only via `/api/vendors/manage` allowlist; never settable from vendor-facing routes or profile-creation defaults. Also source-control `free_deals_used`/`free_deals_reserved` (`ADD COLUMN IF NOT EXISTS`, match live types).
- **Engine:** `calculateFee`/policy untouched. Replace `FREE_DEAL_CREDIT=1250` with `FIRST_DEAL_CREDIT_STANDARD=250`, `FIRST_DEAL_CREDIT_FOUNDING=1250`, `CREDIT_WINDOW_DAYS=90`, and pure `resolveFirstDealCredit({tier, signupAt, now, priorCreditedDeals, fee}) → {eligible, cap, creditApplied, reason, expiresAt}`. Eligible strictly before day 90; requires `priorCreditedDeals === 0`.
- **Server-authoritative:** `POST /api/admin/deals` — checkbox becomes a REQUEST; server looks up `founding_vendor` + `created_at` + prior credited count (company key = `vendor_profiles.id`; prior count = manual_deals where vendor_id = profile.id AND credit_applied > 0 AND status != 'cancelled'), calls resolver, uses ITS creditApplied, increments `free_deals_used` on grant. Client preview defaults to $250. Free-text co-pilot deals (null vendor_id): fall back to `free_deals_used` + operator judgment; strengthens as ledger Phase C links more deals.
- **Counter:** `vendor/deals/route.ts` remaining = `max(0, 1 - max(reserved, used))` (was 2).
- **No second money record:** credit stays the `credit_applied` field on the ONE manual_deals row (DECISIONS §1); `commission_ledger` surfaces it automatically. Never mutate existing credit_applied/commission_amount/fee_policy_version.

## Implementation slices (Sonnet)
1. **Engine + tests** (pure TS): new consts/resolver; fix 6 stale tests to launch-v2 numbers (60k → fee 2,800, lines [2,500, 300], rate 4.67%; 50k → fee 2,500, lines.length 1; cap test on 1M; explanation asserts '$2,800'/'4.7%'); add credit tests (250/1250 caps, day-89/90/91 expiry, second deal = 0, min(cap, fee)). Ships alone.
2. **Migration** (additive, §Design cols, rollback = drop). Ships alone; columns unused until slice 3.
3. **+ 5 TOGETHER (one deploy): server enforcement** (`admin/deals/route.ts` resolver + counter increment; `admin/deals/assist` copy line; `vendor/deals` remaining=1) **and copy sync EN+ES** (`vendor/deals/page.tsx` banner "1 credit up to $250"; `admin/deals/page.tsx` preview $250 default, tier-aware; both welcome-email routes: "first deal up to $250"). Copy may lead (promise less), never lag.
4. **Founding toggle:** `/api/vendors/manage` allowlist + stamps + optional audit_log row; `/admin/vendors` toggle "Founding vendor ($1,250 credit)".

## Top risks
1. Schema drift → introspect live, IF NOT EXISTS, preview branch. 2. Copy/engine mismatch window → slices 3+5 same deploy. 3. Null-vendor co-pilot deals dodge one-per-company → durable `free_deals_used` guard + ledger Phase C. 4. Client-side $1,250 escalation → server derives cap from DB flag only. 5. Rewriting honored history → new policy applies to NEW deals only; existing $1,250 credits stay.

## §8 CESAR'S OPEN CHOICE — vendors already emailed the old promise
Welcome emails already sent say "first two deals get up to $1,250 credit each". Retracting a written promise has relationship/legal exposure. Options:
- **(A) Grandfather (recommended):** honor the old promise for already-emailed vendors via a SEPARATE `legacy_two_deal_credit boolean` flag (distinct from founding_vendor) set for profiles created before the cutover date; new rule applies from cutover onward. Cheap (early-access numbers small), legally clean.
- **(B) Migrate everyone** to the new rule + send a correction email. Cheaper long-term; walks back a written offer.
Either way: deals already credited at $1,250 are never rewritten.
