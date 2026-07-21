# Backlog — what's next / open items

> **2026-07-20: Full operating blueprint exists.** All 7 departments planned
> payments, onboarding, ops, contracts, experience, finance, and growth —
> reconciled in `workplace/plans/MASTER-PLAN.md` (read it first; it links the
> 7 department plans and carries Cesar's 14-item decision list).

## Sticky-platform gaps (from Cesar's positioning, 2026-07-20)
The positioning ([[Project]]) promises contracts + alerts + documents +
communication + relationship tracking. Contracts and alerts are planned;
these three are under-planned — scope them after Wave 2:
- **Deal documents hub** — per-deal file storage (quotes, POs, invoices,
  spec sheets, photos) in the deal room; vendors already upload brochures,
  generalize that.
- **In-app messaging** — buyer ↔ vendor conversation thread per request/deal
  (today it's mostly email notifications); keeps communication (and evidence)
  on-platform, reinforces anti-circumvention.
- **Relationship tracking** — per-counterparty history: past deals, reorder
  ("request quote again", Backlog item 6), renewal reminders for recurring
  needs; the seed of the future CRM-lite tier (see finance plan §4).

## Ready when user says go
- ~~**One signup system + legal click-wrap (Wave 1)**~~ — **SHIPPED 2026-07-20**:
  all account doors merged into one system (shared `ensureVendorProfile()` in
  `src/lib/vendor/profile.ts`; organic /signup vendors now route into /apply
  review — invited /join vendors still skip it, decision #5); ToS/Privacy
  click-wrap checkbox + fail-closed server recording at every lane
  (`terms_acceptances`), server-side signup via `POST /api/auth/signup`.
  Migration `supabase/migrations/20260720_legal_acceptances.sql` must be
  applied to the live DB before acceptances record (until then signup lanes
  fail closed with a clear bilingual error).
- ~~**Easy vendor onboarding (invite funnel)**~~ — **SHIPPED 2026-07-20**
  (slices 1–4): `/admin/invites` 3-field capture → bilingual invite email →
  `/join/<token>` magic-link quick account → pre-approved profile at
  `/auth/callback` → day 2/5/9 reminder cron + unsubscribe. Migration
  `supabase/migrations/20260720_vendor_invites.sql` must be applied to the
  live DB before use. Still on Cesar: Supabase Auth Site URL + custom SMTP
  (DEPLOY.md §B) or magic links rate-limit. SMS = Phase 2 (not built).
- ~~**Conference-fast quick signup (fast-signup brief §3)**~~ — **SHIPPED
  2026-07-20** (commit 9a68246): `/vendor-signup` rebuilt as the organic
  60-second quick signup (3 fields + supply chips + click-wrap, magic link,
  no password → PENDING profile → live portal); `/join/<token>` gets the same
  3 fields; publish gate now ALSO requires vendor status approved (admin
  review gates anything public); portal shows a pending-review "what you can
  do meanwhile" banner; `/apply` pre-fills from the profile (never ask twice);
  ONE shared ProfileStrengthMeter (30% pre-credited, 5 items, named unlocks,
  disappears at 100%) on portal + `/vendor/start`; shared LanguageToggle
  (`nxt_lang`); `/admin/invites` has per-invite QR + full-screen conference
  "Scan to join" QR (in-repo generator `src/lib/qr.ts`, no new deps).
  No new migrations. NOT deployed.
- ~~**Quote cart / bundled RFQ (Wave 1 task #4)**~~ — **SHIPPED 2026-07-21**:
  buyers collect listings into a cart ("Add to cart" on marketplace cards +
  listing detail, cart icon w/ live count in both navs) and submit them from
  `/cart` (fully EN/ES) as ONE bundled quote request through the EXISTING
  pipeline — one `quote_requests` row per vendor, items in `answers.items`
  (jsonb), so one vendor quote + one accept + one commission (fee engine
  untouched). Anonymous cart = localStorage `nxt_cart` (survives magic-link
  round trip); signed-in cart merges into new `cart_items` table via
  `/api/buyer/cart`. Vendor leads inbox + buyer dashboard render ALL bundle
  items. Migration `supabase/migrations/20260721_cart_items.sql` must be
  applied to the live DB before signed-in cart sync works (anonymous carts
  work without it). NOT deployed.
- **Payments P1 — Stripe Connect escrow** (see [[Payments]]): vendor payout
  onboarding (Connect Express) + fixed-price flow: pay-into-escrow on quote
  accept, manual capture, ship → 5-day inspection → auto-release day 6,
  commission via `calculateFee` at release. **Blocked on Cesar:** Stripe
  account + Connect enabled + keys in Vercel; terms/tax review.
- **Payments P2** — milestone escrow (fund → work → approve → release, 14-day
  auto-approve), dispute freeze + operator resolution screen.
- **Reskin to Design System v1.0** — the app is still the dark command-center
  theme; the spec is light content + dark 248px sidebar in violet `#6C5CE0`.
  Do it screen-by-screen against [[Design-System]] (Marketplace Home → Search →
  Vendor Profile → Buyer/Vendor/Operator dashboards → Create-Project wizard →
  Deal Room). Tokens are already wired (`spec` in tailwind, `--spec-*` in CSS);
  now apply them. Verify each screen live (terminal Claude can, the sandbox can't).
- **Delete dead code** `src/lib/intelligence/*` — done on branch
  `claude/website-functionality-trd0mu` (55093bf); not yet folded into the
  live-ready featured package.

## Nice-to-have (from marketplace study)
- Dynamic per-category filters.
- Image / part-number search (study Phase 2/3).

## Competitive-research backlog (2026-07-16, from Cesar's Amazon/Grainger/Alibaba/Fiverr/Upwork study)
Shipped already: quote compare with fill bars; buyer "Needs attention" strip;
graded trust badges (identity / insurance / certified) with hover explanations;
match-reason chips on vendor open requests; action-first empty states.
Shipped 2026-07-16 evening (UX-video A/B patterns): Accept button shows the
total ("Accept — $5,760"); quote expiry with day names + countdown ("Valid
until Fri, Mar 28 · 6 days left"); intake success card has a Today/Next/Then
transparency timeline (EN/ES); "Free to send · no commitment" safety-net line
under listing request CTAs; card prices show "From $X · final in quote"
instead of anchoring-heavy ranges.
Still open, in rough priority order:
1. **Part-number search mode** — "Search / Part number" tab in the search bar
   (Grainger "Order by Part Number"); aggressive normalization (hyphens, case).
2. **Compare from search results** — always-visible compare checkbox on cards +
   sticky bottom "Compare (N)" bar (Grainger); extend to services.
3. **"Hide identical values" toggle** on all comparison tables (Grainger).
4. **Trust badge click-through popover** — badge click explains exactly what was
   checked (Alibaba Verified Supplier popup). Hover titles exist; add tap/click.
5. **Vendor response-rate metric** on listing chat button (Alibaba).
6. **Reorder list** — "Buy again / Request quote again" from completed orders
   (Amazon Business); crucial for MRO consumables.
7. **Bulk RFQ pad** — paste many part numbers + quantities → one request
   (Grainger Quick Order).
8. **CTA taxonomy on listings** — Ask a Question / Request Demo / Request Pilot /
   Request Quote / Contact Sales as one underlying RFQ system with pre-tagged
   templates; demo scheduling with calendar slots + ICS.
9. **Milestone payment pipeline** — funded/unfunded milestones with visual
   status (Upwork), on top of the existing fee engine.
10. **Mobile**: bottom tab bar, bottom-sheet autocomplete (Fiverr), floating
    center "+" post-request button (Upwork/Alibaba), voice + nameplate photo
    search for hands-free warehouse use.
11. **Vendor "Needs attention" strip** — quotes due in 48h, unanswered
    questions (buyer side shipped; vendor side pending).
12. **Payment terms display** (e.g. Net 60) on order summaries (Faire).
13. **Emotional listing pages** — bigger hero images with photo-count badge
    ("1 of 24"), vendor guidance for sensory titles ("Beachside escape steps
    from the sand" pattern → "Same-day forklift service across the Borderplex").
14. **Honest anchor pricing** — strike-through compare-at price with % badge,
    ONLY where a real list price exists (never fabricate discounts).

## Standing reminders
- User applies the combined patch + pushes to deploy; help with `git am` errors.
- A live preview can't be produced from the sandbox (see [[Gotchas]]).

## Done recently
See tasks list / [[Decisions]]. Marketplace search bar + RFQ CTA + How-it-works
strip, autocomplete, vendor moderation, NXT AI concierge + commission co-pilot,
compare fill bars, view-as-buyer — all shipped.
