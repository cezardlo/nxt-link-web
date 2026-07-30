# Seamless RFQ + Quoting Build — BINDING SPEC (Cesar "go", 2026-07-29)

Source: Cesar pasted the crisp RFQ/quoting blueprint (below, reorganized) and said **"go"**. This doc is the authoritative spec for all build agents. Read WITH: workplace/process/ENGINEERING-PROCESS.md (binding gates/DoD) + workplace/research/rfq-process-map-2026-07-29.md (current-state map w/ file:line + coordinator DB correction header) + design charter workplace/design/design-charter-2026-07-28.md.

## 🔒 BINDING DEVIATIONS from the pasted blueprint (locked rulings override it)
1. **NO payments, NO Stripe, NO "escrow", NO milestone funding.** Blueprint step 9 ("prompted to fund the first milestone… Stripe escrow") is CUT. Cesar's locked rulings: Stripe build parked; platform NEVER holds funds; the word "escrow" is banned everywhere. Accept flow stays exactly as it is today (accept → deal, concierge payment path off-platform).
2. **Status pipeline has NO "Payment Funded" step.** Map pills to EXISTING statuses only (e.g. Sent → Quotes received → Comparing → Vendor selected → In progress → Completed as data supports; do not invent new DB statuses without coordinator sign-off).
3. **Email notifications = PENDING Cesar copy approval** (marketing owns email copy; standing rule). Build IN-APP notification/visibility now; leave email hooks stubbed/commented, no email content written by dev agents.
4. **Quote revision applies PRE-ACCEPT only.** Post-accept price-change guard (audit H2) belongs to the separate Opus money batch — do NOT touch post-accept behavior in these batches.
5. **No AI anywhere in the flow** (frozen; Scout assistant removed 2026-07-29). /intake's existing assistant endpoint is out of scope — do not extend it.
6. **EN/ES parity on every new screen/string**, never mixed; all new vendor/buyer-visible strings reported for Cesar approval before his push.
7. **Additive-only schema.** New columns/tables allowed; never alter/drop existing ones. Migration FILES committed; coordinator applies to prod after verification (agents never run apply_migration).
8. Old rows must stay valid: every new field nullable/defaulted; existing requests/quotes keep rendering.

## The target experience (from the blueprint, kept crisp)

### 1) Buyer request — adaptive per listing kind, ≤4 unique fields, "asking a colleague not procurement"
- From a LISTING: product already known — never ask category/brand/specs again.
- **Product request:** quantity (number input, default 1) · delivery location (prefilled from buyer profile, editable) · custom requirements (one open text area w/ example placeholder) · optional file attach.
- **Service request:** scope text area · service location (prefilled) · optional preferred timeline (date range) · optional standards/certifications · optional attachments.
- **Technology request:** brief description · number of users/locations · optional current systems to integrate · optional timeline · optional budget range **hidden from vendors (blind budget)** · optional RFP attach.
- Principle: only what's needed for a useful quote; everything else clarifies later in the quote-linked chat.
- Form appears inline / slide-over — never a full-page redirect. Prefill from profile. Instant confirmation on submit: "Your request has been sent. You'll be notified when quotes arrive." (+ existing public_ref).

### 2) Vendor quote — one structured template, comparable, <2 min to fill
- **Common:** total price (auto-calc from unit + add-ons + shipping when applicable) · lead time / delivery date · quote expiration date · payment terms (short text) · warranty · optional short message to buyer.
- **Products extra:** unit price · installation (included/extra/not available) · training (included/extra) · shipping cost.
- **Services extra:** scope summary (included/excluded) · duration / team size · certifications (pulled from vendor profile) · emergency response time (if applicable).
- **Technology extra:** license model (subscription/perpetual/tiered) + pricing details · implementation cost · annual support/maintenance fee · SLA summary.
- Plain inputs/dropdowns/checkboxes only; NO vendor file uploads/PDFs. Draft-save allowed.

### 3) The flow — no dead ends, never leave the platform
- Vendor dashboard: requests filtered by category/region → "Prepare Quote" → template.
- Buyer: in-app notification when a quote arrives (email later, pending approval).
- Compare table: rows for price, lead time, warranty, etc.; **best value per row gets a subtle violet highlight**; "Hide identical rows" toggle.
- Ask-a-question from the compare table → opens the chat thread linked to that specific quote.
- Vendor revises pre-accept from chat context → buyer sees "Revised" badge.
- Status pipeline pills on both dashboards (see deviation #2), calm discrete steps; buyer always knows the next action.

## Slices (each: manual worktree off current local master, gates tsc0/`npm run test`/build — NEVER vitest, commit NO push, merge by coordinator only)
- **R1 — Data + API foundation (backend-dev).** Additive migrations for structured request fields (quantity int, locations, timeline, blind budget numeric+hidden-from-vendor, per-kind structured specs) and structured quote-template fields (common + per-kind); validation; request-create + proposals APIs accept/return them; blind-budget NEVER serialized to vendor-facing responses (test proving it); tests for all validation. Backward compat proven by tests on old-shape rows.
- **RV — Request visibility on existing data (frontend-dev, parallel w/ R1).** Buyer request card: "Sent to N vendors · X quotes received · last activity"; write 'viewed' when a vendor opens a lead (status vocabulary already allows it) + surface "viewed by N" to buyer; stale-request awareness on buyer card ("No quotes yet — vendors typically respond within 2 business days" style, copy flagged for approval). No schema change if avoidable; tiny additive if not.
- **R2 — Buyer adaptive request forms (frontend-dev, after R1 merges).** Listing inline/slide-over + Post-a-Need per-kind minimal forms, prefill, instant confirmation. Reuse existing attachment infra if trivial, else attachments = R5.
- **R3 — Vendor quote template UI (fullstack-dev, after R1 merges).** The structured reply card + draft save + auto-calc total.
- **R4 — Compare table upgrade + status pills (frontend-dev, after R3).** New rows, best-value violet highlight, hide-identical toggle, quote-linked chat entry point (chat exists — link it), Revised badge (pre-accept), pipeline pills both dashboards.
- **R5 — Notifications + attachments + stale alert (fullstack-dev, last).** In-app notify on quote received; RFQ attachments (reuse message_attachments bucket pattern); stale-request alert (cron infra w/ CRON_SECRET exists; email copy = Cesar-gated).
- Design pass per [[use-design-skills]] + rubric in vendor-onboarding plan doc (60/30/10, ≤4 sizes/≤2 weights, 8pt grid, violet accent only where it matters, soft violet-tinted shadows, reduced-motion safe).

## Sequencing note
R1 ∥ RV first (distinct files). Then R2 ∥ R3. Then R4 → R5. Max 2 parallel agents (Cesar's rule). Category-SPECIFIC question sets (forklift 6-question wedge from Part 7) = SEPARATE later layer, waiting on Cesar's category pick — R1 must keep per-kind specs flexible (jsonb) so category templates drop in without schema churn.

## DESIGN ADDENDUM (Cesar paste, 2026-07-29 — binding for R4/RV/R5 design, WITH the coordinator deviations below)
1. **Comparison = card deck, not dense table (desktop):** 3–4 side-by-side vendor cards (logo, total price big/bold, lead time, warranty, one-line vendor note), horizontal scroll; best value per metric = soft violet top-border or subtle badge (never a "Winner!" sticker); "Show differences only" toggle collapsing identical specs. NOTE: existing QuoteCompareTable is verified solid — evolve it / keep its correctness (fee display etc.), don't blind-rewrite.
2. **Quote-reveal micro-interaction:** staggered 100ms card slide-up on open, 400ms ease-out count-up numbers, one soft violet pulse on best-value then settle. All of it MUST sit behind the reduced-motion guard and stay subtle (charter: functional-first animation; this is approved polish, keep it restrained).
3. **Mobile one-thumb view:** full-screen swipeable quote stack, big numbers, dot indicators (active dot violet), swipe up = Ask a question. **🔒 DEVIATION: swipe-down-to-ACCEPT is REJECTED — accepting a quote is a money-consequence action and must NEVER be gesture-triggered; accept stays an explicit button + confirm step.**
4. **"NXT Match Score" (98% fit ring): 🔒 DEFERRED to phase-2.** Conflicts with the real-computed-stats honesty rule (needs an honest formula + response-time data that doesn't exist pre-volume) and the analytics deferral. Do NOT build in R4. Revisit with volume.
5. **Accept celebration state:** full-screen violet-tinted overlay, self-drawing checkmark, single CTA (View order / Back to dashboard), optional subtle haptic. **🔒 COPY DEVIATION: the line "your order is protected" is BANNED — implies buyer-protection/fund-holding we don't offer. Neutral honest copy instead (e.g. "You're all set. We've notified the vendor.") — final wording = Cesar approval like all new strings.**
6. **Quote timeline in chat:** vendor quotes render as soft-shadowed embedded cards in the thread (price + lead time bold, View details); revision appears as a new card below, old card fades w/ "Revised" badge, delta callout ("Price reduced by $300") in the system's EXISTING success-green (#227A50 family) — no new mint accent color without Cesar palette approval. Pre-accept revisions only (deviation #4 in main spec).
7. **Empty state that teaches (RV/R2):** friendly illustration (CSS/inline-SVG, no new assets/deps), calm copy, plus a SAMPLE quote preview card with clearly-visible "Example / Ejemplo" badge (education without tutorial; the badge satisfies the no-fake-data rule). **🔒 COPY DEVIATION: no invented SLA — "usually within 24 hours" is not a claim we can make with zero volume; use honest copy ("We'll notify you as soon as quotes arrive").**
All animation reduced-motion safe; EN/ES parity; all user-visible strings collected for Cesar sign-off.

## V2 REFINEMENT (Cesar paste "The NXT Link version", 2026-07-29 — adopted WITH the reconciliations below; where V2 conflicts with the deviations at the top of this doc, the deviations win)

### Adopted as the target picture
- **Buyer flow:** category selector first (Product / Service / Equipment / Technology / Staffing / "Not sure—help me decide") → simple first screen (what, location, quantity/project size, needed-by date, optional budget, description, attachments: photos/specs/invoices/PDF/Excel) → THEN category-specific questions (forklift: buy-rent-lease-repair, electric/propane, capacity, indoor/outdoor, new/used; maintenance: what, emergency/scheduled, unit count, date, certifications). Category question sets ride in R1's structured_specs jsonb — this is exactly why it's jsonb.
- **Two send modes:** A) Match me with vendors (auto-match) · B) Invite specific vendors chosen from the marketplace (privacy + control). B = NEW feature, build after foundation (needs a request_invitations concept).
- **Request lifecycle visible to buyer:** Draft → Submitted → Being reviewed → Vendors matched → Quotes received → Comparing → Vendor selected → Order in progress → Completed / Cancelled. ⚠️ DB CAUTION unchanged: display states may be DERIVED from existing statuses; adding literal new DB statuses needs coordinator sign-off + migration discipline (the quote_requests constraint is live in prod).
- **Buyer request card:** title, category, submitted date, status, vendors invited count, quotes received count, quote deadline, NEXT RECOMMENDED ACTION. (RV slice = the first cut of this.)
- **Vendor "Matched Opportunities" page:** buyer's general location (NOT identity/contacts), need, size, timeline, budget-if-shared (⚠️ blind budget stays blind unless buyer opted to share — R1 invariant), certs required, deadline, and "why this matches you" (✓ service area ✓ category ✓ …).
- **Structured quote (richer than v1):** total, one-time/recurring, ITEMIZED line pricing, taxes, delivery/travel fees, lead time, est. completion, warranty, payment terms, what's included, what's EXCLUDED, optional upgrades, attachments, expiration. Line items may live in template_fields jsonb initially; formal quote_line_items table = later increment if needed.
- **CONFLICT RESOLVED (v1 said "no vendor file uploads", V2 includes attachments):** structured fields are MANDATORY and attachments are OPTIONAL SUPPLEMENTS — a vendor can never submit "just a PDF." That's the actual intent of both pastes.
- **Comparison actions:** save, ask question, request revision, reject, accept, compare details, download comparison (CSV/print = fine; no new deps).
- **Notifications catalog** (buyer: submitted / being-reviewed / first quote / more quotes / deadline approaching / vendor message / quote updated / none-yet · vendor: new match / direct invite / deadline / buyer viewed quote / question / revision request / accepted-declined): in-app first; ALL EMAIL copy = marketing + Cesar approval (standing rule), reminder rules + preferences + unsubscribe = R5.
- **What NOT to copy from Alibaba (binding):** no spam re-engagement, no blasting every vendor, NO pay-for-quote-credits / paid priority (best-FIT vendor wins, never best-paying — this is a product principle now), no immediate contact-info exposure (existing masking discipline stands), no giant generic form, no uncomparable quotes.
- **MVP boundary (adopted, matches freeze spirit):** submit → My Requests → matching (existing auto-match STAYS since it already works; ADMIN MANUAL match = the fallback/override to add — do not rip out working auto-match to be literal about "manual first") → vendor opportunity → structured quote → compare → select → in-platform chat. NO advanced AI matching.
- **R4 note:** "EN/ES translation" of chat messages = NEW idea, DEFERRED (needs an approach decision — no AI in flows is the current rule; park until Cesar rules).
- **Positioning candidates (copy, Cesar approval before use):** "Tell us what your operation needs. Compare qualified solutions in one place." / "From problem to qualified solution—without searching the market yourself."

### 🔒 REJECTED / CORRECTED (locked rulings)
1. **R6 "Payment collection → inspection period → release payment" = the escrow/hold pattern AGAIN — REJECTED.** Platform never holds funds; no release flows; no inspection-hold. R6, when it ever unparks, = accept → order record → completion confirmation → review, with payment stays off-platform (concierge) until the Stripe destination-charge build is deliberately unparked WITH attorney review.
2. Status pipeline includes no payment-funded states (same as deviation #2).
3. Vendor performance data implied by "Response time ✓ match" — computed honestly or not shown (real-computed-stats rule); at MVP, match reasons = category/service-area only.

### Revised slice map (merging V2's R-numbering into ours)
- R1 (foundation, IN FLIGHT — scope unchanged) → RV (visibility, IN FLIGHT) → **R1b** (request_invitations + invite-specific-vendors send mode + status-history record if needed) → **R2** buyer adaptive forms incl. category selector + "Not sure" lane + attachments → **R3** vendor quote template (V2 field list) + Matched Opportunities page w/ match-reasons → **R4** compare upgrade + quote-linked chat + revision flow + download → **R5** notifications (in-app now, email pending copy) → R6 = PARKED (see rejection #1).

## 2026-07-30 — "Do it like Alibaba does it" (Cesar directive; the RFQ mechanics to mirror)
Adopt from Alibaba's RFQ market: (1) quantity always paired with a UNIT selector (pieces/sets/pallets/hours/loads…); (2) every request has a QUOTE VALIDITY WINDOW the buyer picks (e.g. 7/14/30 days) → shown to vendors as a real quote deadline + on the buyer card (store in structured_specs jsonb — no schema change); (3) quotes themselves carry an expiration date (already in R1/R3 ✓); (4) vendors can BROWSE open requests and quote proactively (already exists: open-requests self-claim ✓ — surface it in the opportunities framing); (5) structured quotation card w/ price+lead time+terms (already R3 ✓); (6) after posting, buyer sees matching-supplier count (RV "Sent to N" ✓).
STILL REJECTED (unchanged): pay-per-quote credits, paid priority, blasting hundreds of vendors, exposed contacts, cap-by-payment. A quotes-per-request CAP (Alibaba ~10) = fine idea, defer to a policy decision with volume.
