# Web-Claude "Terminal Handoff FINAL" (received 2026-07-28 night via Google Doc 1-O1nnXFZfJyFrc_kEV5H5NSc_LrWHkwRGaqBPEoTBHo)

> TERMINAL-CLAUDE RECONCILIATION HEADER — read before trusting the brief below.
> Web-Claude's sandbox was reset; this brief predates tonight's launch and is stale in key places:
> - §0 zip/push: MOOT. No zip exists (checked twice); GitHub master = `92d42fc` = the LIVE production site (nxt-link-real.vercel.app), pushed by Cesar tonight. The branch claude/website-functionality-trd0mu is a dead July-2 relic — do NOT push to it.
> - §5 step 1 (demo/prod split): DONE tonight — new Supabase `dwotpviynxkbvyxambdy` (nxtlink-production), real site live, current site = demo (banner pending env flip).
> - §5 step 2 (chat thread): ALREADY BUILT + shipped (messages + in-thread attachments, contact masking, one thread per request).
> - §5 step 3 (RFQ quote form + compare table): ALREADY BUILT + shipped (vendor quote form, buyer QuoteCompareTable).
> - §4 "NO AI in user flows, extract engine hidden/dormant": MATCHES tonight's state — Cesar had the AI-fill panel removed 2026-07-28; endpoint dormant. ✓ consistent.
> - ⚠️ CONFLICT 1 — fee cap: brief says $12,500 "locked". Cesar's explicit 7/27 ruling = **$20,000**, built, live, in published Terms on both sites, promoted by his click. UNRESOLVED — needs Cesar's fresh ruling before any change.
> - ⚠️ CONFLICT 2 — money flow: brief §3 now decrees "single-milestone HOLD" (separate charges+transfers, release on buyer approval) as "founder's final call" — the PREVIOUS brief and Cesar's 7/24 lock said the opposite (destination charges, NO hold/escrow, platform never holds funds; that stance is also KB #41★'s money-transmitter rationale). UNRESOLVED — needs Cesar's confirmation. Moot until a Stripe account exists (payments parked).
> - Also remember (workplace/research/stripe-mexico-payouts-2026-07-28.md): separate-charges-and-transfers cross-border US→MX is NOT self-serve — the hold model worsens the Mexico-vendor problem vs destination charges.
> - Genuinely NEW ideas worth keeping for when payments unpark: three transaction modes (RFQ / Buy Now / Post-a-Budget with accept=hold-24h safeguard), ONE order state machine (order→funded→delivered→approved→released|refunded), auto-release fuse (day-7 reminder, day-30 auto-release), receipts w/ PDF, video link fields, lean 9-control admin list, "removed from v1" cut list.

---

[VERBATIM BRIEF FOLLOWS]

== 0. READ FIRST — current situation ==
- The web sandbox was reset; the NEWEST build exists only in nxtlink-LIVE-ready.zip (user's Downloads) and on the live site — NOT on GitHub yet.
- FIRST JOB: unzip that file, commit everything, PUSH to GitHub cezardlo/nxt-link-web, branch claude/website-functionality-trd0mu. Confirm. (A reset already wiped unpushed work once.)
- Live (older): https://nxt-link-web.vercel.app · Domain owned: nxtlinktech.com

== 1. What NXT//LINK is ==
Industrial B2B marketplace for the El Paso–Juárez Borderplex. Vendors list products/services; buyers browse and post requests (RFQs); they talk and transact ON the platform; NXT//LINK earns a commission on purchases through the site.

== 2. LOCKED revenue model (exact terms for code + agreements) ==
- Free to join and list. No fee until the buyer pays.
- Commission ONLY when the purchase happens THROUGH the website (auto-captured, see §3).
- 4% on first $50,000; 2% above. Cap: $12,500 per deal. [CONFLICT — live model = $20,000 cap per Cesar 7/27]
- 0% on a vendor's PRE-EXISTING customer — only with dated proof (invoice/contract/email predating the NXT//LINK request), registered at request time, admin-reviewed. No retroactive claims.
- First deal: 50% off (NOT free).
- Collected as the Stripe Connect application fee. (NOT the 2% flat from any draft spec — founder locked 4%/2%/cap.)

== 3. Money flow — STRIPE CONNECT, SINGLE-MILESTONE HOLD (founder's final call) ==
Buyer accepts a quote → funds the order (card or ACH) via Stripe Connect separate-charges-and-transfers: money sits in Stripe's flow (never in a bank account we control); transfer to vendor is RELEASED when the buyer approves delivery — or by admin decision in a dispute (release vs refund). ONE milestone per order, full amount. Fee auto-deducted at release. Stripe carries KYC/compliance/processor-of-record. Build in: auto-release fuse (reminder day 7, auto-release day 30 unless disputed — stays inside Stripe's ~90-day transfer window). Attorney sanity-check on the hold flow once revenue exists. [CONFLICT — reverses prior no-hold decree + 7/24 no-escrow lock; needs Cesar]

== 4. v1 scope — FINAL: "Upwork for industrial, phase 1" ==
Manual, human, lean. NO AI in any user flow (the built AI extract engine stays in the codebase but HIDDEN/dormant — manual forms only). No recommendation engines, scoring, or auto-generated content. Matching = category + service-area filter only.

--- The three transaction modes (all manual) ---
A. BUY NOW (fixed price): "Fixed Price: $349/unit" + Place Order. Product page: quantity input · delivery location (auto-filled from profile, override allowed) · optional vendor-defined add-on checkboxes (Installation +$500, etc.) · optional quantity discounts (10+ → $320) · lead time. Total recalculates instantly client-side. Services can be fixed-price packages (scope bullets, duration, coverage). No negotiation.
B. REQUEST A QUOTE: short manual form (quantity, delivery location, note) → vendor fills manual quote form (price, lead time, warranty) → buyer compares in one simple table → accept → fund.
C. POST A BUDGET: buyer posts a need WITH a budget ("2 forklifts serviced, $400"). Shows in matching vendors' dashboards. Vendor taps Accept Job → HOLDS the job 24h pending buyer funding. Buyer sees who accepted and confirms BY FUNDING — or declines and it reopens. (Safeguard: accept = hold-pending-funding, never an instant order.)
All three modes converge: order → single-milestone escrow → deliver → approve → release (minus fee). Fixed-price listings still require per-category spec fields (manual) so the compare table works everywhere.

--- Professional build guidance ---
- Build B (RFQ) FIRST (core engine of industrial B2B), then A (Buy Now). C (Post a Budget) is a fast-follow 2–4 weeks post-launch, NOT a launch feature.
- New vendors default to Request-a-Quote; Buy Now is opt-in per listing.
- ONE order state machine under all modes: order → funded → delivered → approved → released | refunded. One escrow flow, one dispute view, one ledger row per transition.
- Auto-release fuse: approval requested at delivery → reminder day 7 → auto-release day 30 unless disputed.
- Receipts everywhere: funded/delivered/approved each send a deep-linked email with a PDF record.

--- Core workflow (all manual) ---
1. Browse/search — keyword + category + location; standardized cards/pages. (mostly built)
2. Post a listing — manual form: photos (1 req, up to 12) → name → category (tap list) → price (fixed · per-unit · starting-at · range · quote-on-request) → live. Products AND services. Video = optional YouTube/Vimeo link field (embed, lightbox). No AI drafting shown.
3. RFQ — "Request Quote" on a listing or a general need: quantity, delivery location, note. Routed by category + service area only.
4. Vendor responds — manual quote form: price, lead time, warranty, note. [BUILD] [terminal: EXISTS]
5. Compare — simple table (price · lead time · warranty · vendor). [BUILD] [terminal: EXISTS]
6. Chat — plain-text thread + attachments, one per buyer↔vendor per request. [BUILD — #1 new piece] [terminal: EXISTS + attachments]
7. Accept & pay — single-milestone escrow per §3, card or ACH. [BUILD] [terminal: PARKED — no Stripe account + conflict 2]
8. Company profiles — logo, about, verified ✓, listings grid, case studies (problem → what we did → result, manually written), optional storefront intro video (MP4/MOV ≤100MB or YouTube link + caption). (extend)

--- Admin panel — exactly 9 controls ---
1. View all users (status) — partly built
2. Verify a vendor — review docs, flip Verified flag manually — extend existing
3. Suspend/reactivate — built (keep audit log)
4. View all RFQs & quotes — read-only — partly built
5. Disputes case view (order+messages+evidence) → release or refund [BUILD]
6. Transaction ledger (every payment, fee, payout) [BUILD, simple table] [terminal: commissions ledger EXISTS for manual deals]
7. Reported content — flagged messages/listings, remove [BUILD, light] [terminal: reported-listings queue EXISTS]
8. Audit log of admin actions — built, extend
9. Role-based access — owner vs support-agent [BUILD, light]

--- REMOVED from user flows ---
AI descriptions/auto-fill, AI matching, AI summaries, chatbots in core flows, predictive analytics, vendor scoring, recommendation engines, completeness gamification, multi-milestone escrow, comparison beyond the simple table, package tiers, innovation shelf, org accounts, net terms, WhatsApp, auto-translate, analytics dashboards, quote version history.

== 5. Build order ==
0. Push to GitHub (safety). [DONE — master 92d42fc live]
1. Demo/prod split: fresh production Supabase + schema; env keys in Vercel; connect nxtlinktech.com; current site stays demo with ~8 example listings. [DONE except DNS + demo seed]
2. Chat thread. [DONE] 3. RFQ quote form + compare table. [DONE] 4. Stripe Connect escrow (needs user's Stripe account). [PARKED + conflict] 5. Profile/product page upgrades (video fields, case studies). [PARTIAL] 6. New admin screens (disputes, ledger, reports, roles). [PARTIAL] 7. Polish + browser-test → launch (first ~10 vendors onboarded by hand). [POLISH DONE tonight]

== 6. Purchase-flow UX principles ==
Easy: one clear Buy / Accept-and-Pay; saved payment; instant confirmation + order status. Trusted: "payment protected," verified vendors, Stripe checkout, clear refund/dispute policy. Anti-leakage: payment + messaging stay on-site; Terms prohibit circumventing introduced deals; protection applies only on-platform.

== 7. Gaps on the radar ==
Demand (first buyers = biggest risk) · Legal lean: form LLC (~$300 DIY) before money moves; publish drafted ToS/Privacy/Vendor Agreement templates as-is, attorney later · Bilingual EN/ES · Before real users: DB backups, error monitoring, security review, email deliverability (SPF/DKIM/DMARC).

== Immediate next actions [per brief — see reconciliation header for real status] ==
1. Unzip → commit → PUSH → confirm. [MOOT/DONE]
2. Report built-vs-brief. [DONE — this file's annotations]
3. Begin demo/prod split. [DONE]
