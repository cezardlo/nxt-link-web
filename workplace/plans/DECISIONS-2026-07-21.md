# Cesar's decisions — 2026-07-21 (BINDING)

Resolves master-plan decision items #6, #7, #8, #9, #11 and approves the Payments S0 ledger merge. Every agent working on payments, contracts, copy, or the deal workflow follows this file. Supersedes the older recommendations where they differ.

## 1. One payments ledger (S0 merge APPROVED)
Every payment creates ONE permanent record showing: buyer, vendor, contract/order, amount, NXT//LINK fee, processing fee, vendor payout, refunds or disputes, current payment status. All dashboards read from that same ledger. Separate payment records that can disagree are not allowed.
→ Implementation follows `payments-s0-ledger-merge-plan.md` (approved); the `commission_ledger` view must expose all fields above — processing fee, vendor payout, and refunds/disputes enter as nullable Stripe-era columns until Stripe is live.

## 2. Payment methods (replaces "cards only below $5,000")
| Amount | Recommended payment |
|---|---|
| Under $2,500 | Card or ACH |
| $2,500–$25,000 | ACH recommended |
| Above $25,000 | ACH or bank wire |
| International | Bank wire or supported international transfer |

ACH is the DEFAULT (large card transactions are expensive). ACH settles over several business days — a vendor payment is NOT "paid" until Stripe confirms settlement; the ledger status model must distinguish initiated vs settled.

## 3. Inspection / approval period (replaces the universal 5-day rule)
| Purchase type | Approval period |
|---|---|
| Normal physical product | 5 BUSINESS days after confirmed delivery |
| Custom equipment | Per the buyer–vendor contract |
| Digital product / software | 3 business days |
| Service or project | Buyer confirms the agreed milestone |
| Recurring contract | No monthly inspection unless the contract requires it |

NXT//LINK TRACKS the approval but does NOT judge whether an installation or service was completed correctly — the buyer and vendor decide that under their contract.

## 4. Payment wording (approved sentence)
USE: "Your payment is processed securely by our payment partner and released according to the agreed payment terms."
NEVER: "NXT//LINK holds your money" / "NXT//LINK escrow account" / "guaranteed escrow protection". Stripe does not provide legal escrow accounts; delayed payouts are not legally escrow.
Audit 2026-07-21: current codebase is CLEAN (invite emails are Variant B pre-escrow; no violations found in src/).

## 5. First-deal credit (replaces "2 × $1,250 for everyone")
- Normal invited vendor: up to **$250** fee credit on the FIRST deal.
- Important founding vendor: up to **$1,250**, approved MANUALLY per vendor.
- Credit applies only to NXT//LINK fees; expires 90 days after signup; no cash value; ONE promotion per company.

⚠️ CODE CONFLICT (open task): the shipped engine and copy still implement the old policy — `src/lib/fees/engine.ts` (`FREE_DEAL_CREDIT = 1250`, first TWO deals), vendor deals page banner, admin deals credit calc, and the approval welcome emails in `api/admin/vendor-applications` + `api/admin/applications` (EN+ES) all say "first two deals up to $1,250 each". Engine + copy must change TOGETHER (copy must never promise what the engine doesn't do). This is commission-calculation work → Opus designs (founding-vendor flag, expiry, one-per-company enforcement), Sonnet implements, alongside the ledger phases. Invite emails are unaffected (credit deliberately not mentioned).

## Final instruction (verbatim intent)
Approve the three user-facing cart fixes (done, commit 1e5d5db). Use one official payments ledger. ACH default for larger transactions. Approval rules by purchase type, not one universal 5-day rule. Never describe Stripe as legal escrow. Standard first-deal credit $250; $1,250 reserved for selected founding vendors.
