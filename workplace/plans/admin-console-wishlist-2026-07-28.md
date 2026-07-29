# Admin Console Wishlist (from Cesar via web-Claude, 2026-07-28) — WITH TRIAGE

> STATUS: BACKLOG OF RECORD for the admin/operator console. Feature freeze (7/27) still applies — nothing here is approved for build until Cesar picks it.
> TRIAGE KEY: ✅ BUILT · 🟡 PARTIAL · ⬜ NOT BUILT · 🔒 PARKED (depends on parked payments/Stripe build) · ⚠️ CONFLICT (contradicts a locked decision — needs Cesar ruling before ever building)
> Triage basis: 2026-07 audits + shipped work. Current /admin surface: operator console home, applications, vendors, invites, directory, requests, match, marketplace-moderation, deals, commissions (+ reconcile health check, ban with audit log). Admin auth = ADMIN_EMAILS allowlist + ADMIN_ACCESS_CODE gate (single tier, no RBAC).

## ⚠️ Three corrections/conflicts flagged to Cesar up front
1. **Escrow items (§4)**: "view escrow balances / manually release or refund escrow" — there IS no escrow and the locked decision (7/24, reaffirmed by web-Claude's own brief §3/§4) is **Stripe Connect only, platform NEVER holds funds** (also KB item #41★, keeps NXT//LINK out of money-transmitter law). These items must be re-worded to their Stripe equivalents (view payment/transfer status, issue refund via Stripe) when payments unpark. Do not build literal escrow tooling.
2. **Fee numbers (§7)**: doc says "2% calculation" — the live engine is **4% first $50k / 2% above / cap $20,000 / first deal 50% off** (Cesar's ruling, live on both sites).
3. **Trust bar numbers (§8)**: "update '1,200+ Verified Suppliers', '$4.2M+ in secured deals'" — current homepage computes REAL numbers from the live catalog (deliberate honesty decision from the 7/23 benchmark work). Hand-editable marketing stats would allow publishing false numbers. If a config UI is ever built, it should stay computed-with-override-off, or Cesar explicitly owns the truthfulness call.

## 1 · User & Account Management
- View all buyer and vendor accounts w/ filters — 🟡 (vendor directory + vendors screens exist; unified buyer+vendor directory w/ filters not)
- Suspend / reactivate any account — 🟡 (vendor ban/suspend w/ audit log ✅; buyer suspend ⬜)
- Permanently delete an account + archived audit — 🟡 (self-serve deletion w/ anonymize/retain rules ✅ shipped; ADMIN-initiated delete ⬜)
- Reset passwords / force 2FA — ⬜ (self-serve reset exists via Supabase; admin-forced flows ⬜)
- Edit user profile fields (limited, logged) — ⬜
- Per-user activity logs — ⬜ (moderation log exists; comprehensive per-user timeline ⬜)
- Merge duplicate accounts — ⬜ (KB edge-case #195: "eventually")
- Internal operator roles (RBAC: Verification Specialist / Support / Super Admin) — ⬜ (single admin tier today)

## 2 · Verification & Trust
- Verification queue — 🟡 (vendor application review/approve = today's equivalent ✅; document-centric queue ⬜)
- Approve/reject documents w/ reason shown to vendor — 🟡 (approve/reject exists; structured reasons ⬜)
- Request additional documents — ⬜ (manual email today)
- Manually verify a vendor — ✅ (admin approval lane)
- Revoke verification — 🟡 (suspend exists; badge-only revoke ⬜)
- Verification tiers ("Verified", "Proven Partner") — ⬜
- Certification expiry alerts — ⬜
- Buyer verification toggle — ⬜

## 3 · Listing & Content Moderation
- Approve/reject new listings before live — ✅ (marketplace-moderation + admin_approval lane)
- Edit any listing (with history) — 🟡 (verify current edit capability; edit history ⬜)
- Suspend/remove a live listing — ✅
- Flag listing for later review — ⬜
- Reported-listings queue — ✅ (listing_reports + report API, auth-gated)
- Manage category taxonomy — ⬜ as UI (categories table seeded, 96 rows; changes via SQL today)
- Mandatory spec templates per category — ⬜ (pairs with the slim AI-listing work later)
- Featured/promoted listings — ⬜ 🔒 (monetization explicitly after liquidity, KB #180)

## 4 · RFQ & Transaction Oversight
- View all active RFQs — ✅ (admin/requests)
- Override matching (add a missed supplier) — ✅ (admin/match)
- Cancel an RFQ — 🟡 (verify)
- View all quotes w/ versions — 🟡 (quotes visible via requests/deals; version history ⬜ — quote versioning itself is future)
- View all orders pipeline — 🟡 (admin/deals for manual deals ✅; "orders" as a concept 🔒 waits for payments)
- Override order status — 🟡 (deal status editable; force-complete/cancel semantics 🔒)
- View escrow balances — ⚠️ 🔒 (see conflict #1 — no escrow, ever, per locked decision)
- Manually release/refund escrow (dual-admin confirm) — ⚠️ 🔒 (same; Stripe-refund equivalent when payments unpark)

## 5 · Communication & Messaging Oversight
- View any conversation (disputes/QA) — ⬜ as admin UI (threads in DB, retained forever ✅)
- Flag or delete messages — ⚠️ partial conflict: KB #37 "threads are dispute evidence — never deletable." Redaction/hide-from-display OK; hard delete no.
- Bypass-detection alerts queue — 🟡 (contact-masking pre-accept ✅ shipped incl. filenames; alert/flag queue ⬜)
- Broadcast notifications to segments — ⬜ (bulk email known-missing; ALSO: marketing dept owns email copy + Cesar approves — standing rule)
- Manage notification templates — ⬜ (emails live in code; same approval rule applies)

## 6 · Disputes & Fraud
- Dispute case queue / investigation view / binding mediation / resolution log — ⬜ all (PREREQ: the one-page dispute policy itself is still unwritten — KB #55, do that first, costs $0)
- Flag suspicious users/listings/transactions — ⬜ (manual notes today)
- Automated fraud alerts — ⬜ (far future)

## 7 · Financial & Commission Management
- View all transactions — 🟡 (commissions + deals + ONE-LEDGER reconcile ✅ for today's manual-deal world; Stripe transaction feed 🔒)
- Commission ledger w/ fee breakdown — ✅ (incl. mismatch badges + health check; Opus money-review passed)
- Adjust a commission (logged) — 🟡 (operator free-credit flag exists; formal adjust+audit flow ⬜)
- Set/update fee structure — 🟡 deliberate: fee_policies ledger table ✅, changes via migration + Cesar ruling (a UI for changing fees is intentionally NOT wanted yet)
- Vendor subscription tiers — ⬜ 🔒 (revenue expansion after liquidity)
- Manual payouts / invoices / refunds — ⬜ 🔒 (payments build)

## 8 · Platform Configuration
- Manage homepage content — ⬜ (code-managed; cheap to change via dev)
- Manage trust bar numbers — ⚠️ see conflict #3 (real computed numbers today)
- Help center articles — ⬜ (an FAQ page kills half of support load — KB #154; good cheap candidate)
- Matching algorithm parameters — ⬜ (matching is rule-based today)
- Platform-wide banners (maintenance/policy) — ⬜
- Languages beyond EN/ES — ⬜ (EN/ES parity ✅ on core flows)

## 9 · Analytics & Reporting
- KPI dashboard (GMV, transactions, users, dispute rate, response time) — ⬜ (KB says: simple metrics table + 6 numbers weekly, NOT GA4; good small build someday)
- Revenue reports / growth charts / category & vendor performance / CSV export — ⬜ all

## 10 · Security & Compliance
- Comprehensive admin-action audit log — 🟡 (moderation + deletion + commission events logged; unified viewer ⬜)
- RBAC for admin roles — ⬜ (single tier; becomes relevant with first hire)
- IP whitelisting for admin — ⬜
- 2FA enforcement for admins — 🟡 (allowlist + access code = 2 layers today; TOTP 2FA ⬜)
- GDPR/CCPA export + delete — 🟡 (delete ✅ self-serve w/ retention rules; data EXPORT ⬜)
- System health view — 🟡 (/api/health booleans ✅; uptime/error dashboards ⬜ — error monitoring itself is a KB★ gap)

## PM summary (honest)
Roughly **a third of this wishlist already exists** in some form — the operator console is genuinely mission control for today's manual-deal reality. The biggest truly-missing clusters: disputes (blocked on writing the policy, not code), analytics dashboard, admin RBAC/audit-viewer, communication oversight, and everything payment-shaped (parked with Stripe). Cheapest high-value items whenever Cesar picks from this list: (1) one-page dispute policy (writing, not code), (2) FAQ page, (3) six-number weekly metrics view, (4) buyer suspend to match vendor suspend. Everything else waits per the freeze.
