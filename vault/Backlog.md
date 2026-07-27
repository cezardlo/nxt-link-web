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
  work without it). NOT deployed. **2026-07-21 G5 review of commit 85dcf35**
  found 3 Important findings (cross-account cart leakage on shared devices;
  raw English error text shown to Spanish /cart users; hardcoded Terms/Privacy
  labels) — all 3 fixed same day. 5 Minor cleanup items from that review still
  open (not urgent, do in a later pass): non-transactional cart replace in
  `POST /api/buyer/cart` (partial failure can leave it half-written); no
  debounce on `pushToAccount()` in `useCart.ts` (fires a network call per
  keystroke on qty/note edits); `clampQty`/`UUID_RE`/the 999 qty cap are each
  duplicated in `useCart.ts` and `api/marketplace/request/route.ts` instead of
  a shared helper; the `'·'` fallback group-key in `/cart`'s vendor grouping
  can collapse two different no-vendor-name items into one group; the qty `+`
  button has no `disabled` at the 999 cap (the `−` button does disable at 1).
- ~~**Contact-flow verify/polish (Wave 1 task #5)**~~ — **SHIPPED 2026-07-21**:
  assisted-RFQ dispatch (`src/lib/requests/dispatch.ts`) now emails each
  matched vendor (was in-app-notification-only) and gates matching on BOTH
  `vendor_profiles.status='approved'` AND `moderation_status` (not-suspended/
  banned) — the old status-only filter could still fan a lead out to a vendor
  an admin had just suspended; verified against `src/lib/vendor/profile.ts` +
  `src/lib/vendor/moderation.ts`. Listing detail (`/marketplace/[kind]/[id]`),
  vendor storefront (`/marketplace/vendor/[id]`), vendor leads inbox
  (`/vendor/leads`), and the buyer dashboard (`/buyer`) are now fully EN/ES via
  the shared `LanguageToggle`/`useLang` pattern (previously hardcoded English
  except one bundle-note string on leads/buyer). Vendor storefronts with no
  published listings now route their "Request a quote" CTAs to `/intake`
  (assisted RFQ) instead of dead-ending on `/marketplace`; `/intake` reads a
  cheap `?vendor=&vendor_id=` hint to prefill + banner-reference the vendor
  (no schema change). `sendMail` (`src/lib/mail.ts`) now logs to
  `console.error` (domain-only, no PII) when both Resend and Zoho fail to
  send, instead of vanishing silently. No migrations, no new deps.
- ~~**One deal ledger — Payments S0 merge (Wave 1 task #7, Phases A–D)**~~ —
  **SHIPPED 2026-07-21** (commits `30b3aec` A, `ec31af6` B, `55a3873` C,
  `54caf28` D; plan `workplace/plans/payments-s0-ledger-merge-plan.md`):
  `manual_deals` is now the single settlement ledger. A = additive migration
  `20260721_one_deal_ledger.sql` (baseline snapshot, `commission_id` link +
  backfill, superset status check, `commission_ledger` view w/ `discrepancy`
  flag, RLS). B = both admin money pages read the view (verbatim fallback +
  `ledger_source` until the migration is applied live). C = writes stop
  duplicating: quote-accept stamps `commission_id`, admin deal POST dedupes on
  `source_quote_id`, mark-paid mirrors `{status, paid_at}` (only) onto the
  linked deal, guarded against disputed/credited/cancelled. D = admin-gated
  `GET /api/admin/reconcile` (discrepancies + orphans; zero = healthy) +
  amber ⚠ badges on flagged rows in `/admin/deals` + `/admin/commissions`.
  G5 money review of C (Opus): **PASS**, fee engine untouched by construction.
  Everything inert-but-safe until the migration is applied (house law:
  DB first, deploy second — see `workplace/plans/DEPLOY-CHECKLIST-WAVE1.md`).
  NOT deployed.
- ~~**"Continue with Google" sign-in (flag `NEXT_PUBLIC_AUTH_GOOGLE`)**~~ —
  **SHIPPED 2026-07-21**: Fiverr-style Google button (shared
  `src/components/GoogleAuthButton.tsx` + `src/lib/auth/google.ts`) on
  `/vendor-signup`, `/join/[token]`, `/login`, `/signup`, `/vendor-login`
  (`/sign-in` excluded — dead scaffold, not wired to any real auth). Renders
  ONLY when `NEXT_PUBLIC_AUTH_GOOGLE==='1'` — absent by default, zero visual
  diff until Cesar configures the provider. On signup screens the click-wrap
  checkbox gates the button (moved above it) exactly like the email path;
  `signInWithOAuth` can't carry `signup_lane` metadata the way
  `signInWithOtp` does, so the button threads lane/locale/invite-token on
  `redirectTo` instead, and `/auth/callback` records the ToS/Privacy
  acceptance fail-closed at first authenticated touch (bounces back with
  `?err=google_terms` if the write fails, same as the email path failing
  closed when the legal_acceptances migration isn't applied). Vendor lane
  integrity preserved: organic Google clicks run `ensureVendorProfile` lane
  `'organic'` (born PENDING, same as the magic-link quick lane); `/join`
  Google clicks match the invite by TOKEN first (falls back to email, since
  a Google account's email can differ from the invited address), born
  APPROVED. No migrations, no new deps. NOT deployed — Cesar still needs to
  enable the Google provider in Supabase Auth + create a Google Cloud OAuth
  client before flipping the flag on.
- **Wire admin deal UI to the quote link** (G5 of `55a3873`, Finding 3): the
  admin deals page never sends `source_quote_id` — assist accepts and threads
  it and the POST dedupes on it, but nothing in the UI passes it yet, so the
  admin-side dedupe is an inert (safe) dead path; buyer-accept's own dedupe
  still prevents double deals. Wire assist → confirm POST round-trip + surface
  the `deduped: true` response ("already recorded") in the UI.
- **Payments P1 — Stripe Connect escrow** (see [[Payments]]): vendor payout
  onboarding (Connect Express) + fixed-price flow: pay-into-escrow on quote
  accept, manual capture, ship → 5-day inspection → auto-release day 6,
  commission via `calculateFee` at release. **Blocked on Cesar:** Stripe
  account + Connect enabled + keys in Vercel; terms/tax review.
- **Payments P2** — milestone escrow (fund → work → approve → release, 14-day
  auto-approve), dispute freeze + operator resolution screen.
- **Reskin to Design System v1.0 — signed-in dashboards** — Phase 2 SHIPPED
  2026-07-23 (buyer + full vendor suite; see "Done recently" below). Still
  dark v4, deliberately: `/admin/*` (operator tool, out of scope). Phase 3
  (Wave 5+): `/forgot-password`, `/reset-password`, `/apply/*`.
- **Delete dead code** `src/lib/intelligence/*` — done on branch
  `claude/website-functionality-trd0mu` (55093bf); not yet folded into the
  live-ready featured package.

## Nice-to-have (from marketplace study)
- Dynamic per-category filters.
- Image / part-number search (study Phase 2/3).

## Known gaps — deliberately deferred (contact-flow recon, 2026-07-21)
Found during Wave 1 task #5 recon (`workplace/research/contact-flow-recon.md`);
explicitly out of scope for that task, needs its own pass:
- **Anonymous listing-request senders can't track replies** — `/api/marketplace/request`
  has no auth, and the buyer dashboard only matches requests to a verified
  signed-in email, so a buyer who submits a quote request without an account
  has no page to come back to and see the vendor's reply. Needs either a
  magic-link-to-claim flow or a public per-request tracking page.
- **Phone-mask false positives on long part numbers** — `src/lib/guard.ts`
  masks any 7+ digit run as hidden contact info, so long part/PO numbers in
  pre-acceptance chat get replaced with "[hidden until accepted]". Cosmetic
  but confusing. Do NOT loosen the mask casually — it's anti-circumvention
  surface (stops buyers/vendors swapping phone numbers to go off-platform);
  needs a dedicated review, not a quick regex tweak.

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

## Accepted risks (documented, deliberately not fixed)
- **Timing side channel on restricted-vendor 404s** (G5 review of `dd7ae17`,
  2026-07-21): listing-detail and single-request routes return a byte-identical
  "Listing not found" for suspended/banned vendors, but reach it after 2
  sequential DB queries vs 1 for a truly missing listing — response latency
  could statistically reveal "exists but suspended" to an attacker enumerating
  IDs. Content identical; bundle path already indistinguishable. Fixing means
  padding latency or extra queries on hot public paths — poor trade at this
  stage. Revisit if suspension status ever becomes commercially sensitive.
- **Settlement toggle is a lossy one-way mapping** (G5 of `55a3873`, Finding 1,
  2026-07-21): admin mark_unpaid reverts the linked deal to `won` — an
  intermediate `invoiced`/`payment_confirmed`/`overdue` state is not restored —
  and mark_paid overwrites any earlier `paid_at` with "now". Accepted as
  documented behavior: `won` is the canonical closed-but-unpaid state and the
  toggle is an explicit admin action. Revisit only if per-state settlement
  history matters later (would need read-then-restore).
- **`deal_settled:false` is ambiguous** (G5 of `55a3873`, Finding 2): the
  commissions mark-paid response can't distinguish "no linked deal" from
  "mirror write failed" (error is logged server-side only, so the commissions
  settlement never 500s). Accepted: drift is surfaced by the `discrepancy`
  flag + `/api/admin/reconcile` (Phase D, shipped same day), which is exactly
  the net that catches it.
- **Malformed `source_quote_id` in admin deal POST → 500 not 400** (G5 of
  `55a3873`, Finding 4): a non-UUID value hits Postgres 22P02. Matches the
  existing behavior of every other uuid field on the route; admin-only input;
  tighten only in a general input-hardening pass.

## Standing reminders
- User applies the combined patch + pushes to deploy; help with `git am` errors.
- A live preview can't be produced from the sandbox (see [[Gotchas]]).

## Done recently
See tasks list / [[Decisions]]. Marketplace search bar + RFQ CTA + How-it-works
strip, autocomplete, vendor moderation, NXT AI concierge + commission co-pilot,
compare fill bars, view-as-buyer — all shipped.
- **File attachments on buyer<->vendor message threads (sticky-platform gap,
  in-app messaging) — BUILT 2026-07-27 in worktree `msg-attachments-20260727`
  (branch `wt/msg-attachments`, commits `8de82bb` + fix-first round
  `eab5a5b`), NOT deployed. Security review verdict: FIX-FIRST then SHIP —
  fixes applied same day, still PENDING re-review/deploy.** Buyers/vendors
  can attach specs, drawings, POs, and photos to chat on `/buyer` and
  `/vendor/leads` (paperclip button, file chips, download via signed URL) —
  PDF/PNG/JPG/WEBP/XLSX/CSV/DWG/DXF, max 10 MB/file, 5 files/message,
  bilingual errors. REUSES the existing private `vendor-brochures` Storage
  bucket under a new `message-attachments/<quote_request_id>/` prefix — no
  new bucket. New `message_attachments` table: migration
  `supabase/migrations/20260727_message_attachments.sql` (not yet applied to
  the live DB — attachments won't persist until it is). Both
  `/api/buyer/messages` and `/api/vendor/messages` extend the existing
  ownedThread auth check (only the two thread parties may upload/fetch) —
  now backed by pure, unit-tested decision functions in
  `src/lib/messages/authz.ts`. **Fix-first round (`eab5a5b`) closed 3 of the
  review's findings:** (I-1) signed URLs now force a download
  (`{ download: name }`) instead of letting a browser render a stored file
  inline from the storage origin, AND Storage Content-Type / the stored
  `file_type` are derived only from the validated extension via a fixed map
  — the browser-declared `File.type` is never trusted/used anywhere; (I-2)
  attachment file NAMES are now contact-masked pre-acceptance, mirroring the
  exact `buyer_decision !== 'accepted'` check already used for message
  bodies (`displayAttachmentName()` in `attachmentsServer.ts`, display-only —
  DB row/storage path untouched); (M-3) `buildAttachmentStoragePath()` now
  throws on a non-UUID `quoteRequestId`. Also added a small pre-acceptance
  warning line near the attach button (EN/ES, copy supplied by the review —
  **Cesar should approve/reword before ship**). **Still an accepted, flagged
  gap (not fixable by masking):** a file's actual CONTENTS (not its name)
  can't be scanned — a spec sheet or PO could still contain a phone number or
  email inside the document itself; files are allowed pre-acceptance anyway
  since sharing specs before a vendor can quote is the point of the feature.
  36 tests total for this feature (24 original + 12 from the fix-first
  round: content-type mapping, UUID rejection, pre-accept-masked/
  post-accept-verbatim filename behavior). Typecheck 0, tests 199/199 (full
  suite), build clean.
- **Two flow-breaking gaps fixed (CEO flow assessment) — BUILT 2026-07-24 in
  worktree `worktree-agent-ae960b911fbd30718`, NOT deployed, PENDING security +
  money review.** FIX 1 (orphaned comparison): the real side-by-side quote table
  lived only in the `/projects/[id]` Deal Room (inline `pd-cmp`), where the buyer
  flow never sends quotes; the buyer's actual page `/buyer` had none. Lifted that
  table into a shared `src/components/marketplace/QuoteCompareTable.tsx` (both the
  Deal Room and `/buyer` now render it) and wired it onto `/buyer`: competing
  quotes for the SAME open RFQ (grouped by `answers.source_request`) show side by
  side (vendor, price + lowest tag + bar, lead time + bar, valid-until, status);
  single-listing quotes degrade to the normal single-quote card. Dashboard API
  now also returns each quote's PUBLIC `vendor_name` (company name only — no
  email/phone; masking untouched) so competing quotes are distinguishable. FIX 2
  (accept dead-end): after Accept, `/buyer` now shows a bilingual "Deal in
  progress — what happens next" panel (agreed price/timeline, contact-now-unlocked
  in chat, deal on record, Continue-in-chat button) instead of a one-line "You
  accepted". NO payment/escrow added; accept API contract (draft deal + commission
  + notify) unchanged; `calculateFee` untouched. Pure logic extracted to
  `src/lib/buyer/compare.ts` (grouping / best-value pick / accepted-state
  selector) with 12 new tests. Gates: typecheck 0, tests 162/162, build clean.
  Note: the old dark-themed `src/components/marketplace/QuoteCompare.tsx` is
  pre-existing dead code (never rendered/imported) — left in place, superseded by
  `QuoteCompareTable`.
- **Flexible vendor listing form (no more fixed presets) — BUILT 2026-07-23,
  local commit `348ecfd`, NOT deployed, PENDING security review (vendor-typed
  content renders to buyers).** `/vendor/listings`: Category/Industries/Best
  for/Use cases are now a chip/tag input — suggested chips sourced from the
  real taxonomy (`/api/marketplace/categories`) + the vendor's own other
  listings, but typing a custom value is always allowed (new
  `src/components/marketplace/ChipTagInput.tsx`). Pilot/demo is repeatable
  ("+ Add another pilot or demo"); Implementation/Warranty & support/Pricing
  each get a "+ Add field" for vendor-defined {label, value} rows. Persisted
  shape unchanged for category/industries/best_for/use_cases; `pilot` keeps
  its old single-object shape for 0-1 pilots (entry 0 always mirrored onto
  the legacy fields even at 2+), `entries`/`custom` arrays only appear past
  that — read everywhere through shared `pilotEntriesOf()`/`customFieldsOf()`
  (`src/lib/marketplace/types.ts`) so old- and new-shape listings render
  identically. Caps enforced server-side in `normalizeListingInput`/
  `cleanBlock`: ≤8 pilots, ≤20 custom fields/block, label ≤60 / value ≤300
  chars, trimmed, empties dropped. Listing detail + the review-before-publish
  modal render the repeats/custom fields generically as text (no HTML
  rendering of vendor input); storefront verified compatible, no changes
  needed. No migration (all JSONB columns, additive-only shape). 25 new unit
  tests (sanitization + back-compat reads). Typecheck 0, tests 137/137, build
  clean.
- **Self-service account deletion (buyers + vendors) — BUILT 2026-07-23, local
  commit, NOT deployed, PENDING adversarial security review.** `/account` gets
  a bilingual "Danger zone" (type DELETE/ELIMINAR + password for password
  accounts, second click for OAuth). `POST /api/account/delete` (auth via
  getSessionUser, no client id ever; admins blocked). Policy: personal rows
  DELETED; financial/legal/audit RETAINED with identity anonymized;
  `vendor_profiles` ANONYMIZED not deleted (its id is the ON DELETE CASCADE
  anchor for commissions/purchases/moderation — deleting it would destroy the
  fee ledger). Auth user deleted LAST. Fee engine untouched. Pure rules in
  `src/lib/account/deletion-rules.ts`, orchestration in
  `src/lib/account/deletion.ts`. No migration. Gates: typecheck 0, tests
  112/112, build clean. Security review returned FIX-FIRST → three fixes
  applied on top (retry-key reorder so a failed run's retry still finishes
  vendor cleanup; abuse-report preservation — listing_reports.product_id/
  service_id nulled before the listing cascade so reports survive;
  manual_deals.buyer_name/buyer_company scrub via source_quote_id + truthful
  danger-zone copy). **Deferred from the security review (do NOT build until
  scheduled):** (1) free-text blob scrubbing — buyer/vendor free-text inside
  `quote_requests.answers`, `reviews.body`, and `messages.body` is retained
  (matches the "don't null bodies" rule) and may contain self-identifying text;
  (2) side-table scrubs for `chat_conversations`, `client_requests`,
  `company_equipment`, `zoho_outbox`, `early_access_leads` (legacy/near-empty
  tables not in the current delete path); (3) M-4 OAuth step-up factor on
  delete (passwordless accounts confirm with typed phrase + second click only);
  (4) M-6 explicit Origin/CSRF assertion on `POST /api/account/delete`
  (currently relies on session cookie + JSON content-type + typed phrase +
  password); (5) M-5 align the access-code admin path with the role/
  ADMIN_EMAILS self-delete block; (6) M-7 add a `lower(email)`/citext index so
  buyer-email matching can't miss legacy mixed-case rows.
- **Signup 4th role choice "Something else" (2026-07-23)** — `/signup` Step 1
  now has a 4th tile alongside Buy for my company / Join as a vendor / Buyer
  and vendor. Treated as a buyer (no new lane): `sellerMode` stays false,
  redirect `/buyer`, buyer confirmation copy. Optional free-text field on
  the details step (`use_case`, capped 200 chars) posts to
  `POST /api/auth/signup` and is stored in the new account's Supabase user
  metadata (password-signup path only). No schema change, no migration,
  click-wrap/magic-link/lane logic untouched. Committed locally, NOT deployed.
- **Marketplace login wall + role-based admin login + vendor-nav fix
  (2026-07-23, commit `0961b7b`, local, NOT pushed)** — full sign-in wall on
  the marketplace (owner decision): `middleware.ts` gates `/marketplace` + all
  subpaths → `/login?next=<path+query>`; read APIs (listings, listings/[id],
  vendor/[id], suggest) return 401 for anonymous via a real server-side
  `getUser()` check (new `src/lib/auth/require-user.ts`);
  `/api/marketplace/categories` stays PUBLIC (homepage tiles);
  `POST /api/marketplace/request` now auth-required (keeps honeypot/timing,
  attributes to the signed-in email + `answers.requested_by`). Role-based
  admin: new `src/lib/auth/admin-allowlist.ts` (`ADMIN_EMAILS` env allowlist,
  case-insensitive, empty=nobody, server-only) consulted in `auth/callback` +
  `api/auth/me` as a 2nd path to `admin` alongside `platform_users.role`;
  `ADMIN_ACCESS_CODE` AccessGate kept. VendorNav gets a Marketplace/Mercado
  link. Fee engine, `guard.ts` masking, RLS, legal lanes untouched. Gates:
  typecheck 0, tests 97/97, build clean. **PROD FLIP for owner admin: add
  Vercel env `ADMIN_EMAILS=delaocesar65@gmail.com` (Production), redeploy.**
- **Premium-polish Phase 1 — first-session surfaces to Design System v1.0
  (2026-07-23)** — per `workplace/design/premium-polish-audit.md`. Visual/CSS
  only, no behavior changes: `error.tsx` and `not-found.tsx` rebuilt light
  (warm-white/violet, bilingual "EN / ES" one-string copy — no toggle on
  these screens, matches the existing no-toggle idiom); `loading.tsx`
  skeleton recolored to spec tokens (was `bg-black`/`zinc-900`); `/login` and
  `/vendor-login` CSS rewritten to the light palette matching `/signup` and
  `/vendor-signup` pixel-for-pixel (same class names, same handlers/OAuth
  flag branches — only the `CSS` template literal + an IBM Plex Sans
  `next/font` import changed); `/marketplace/[kind]/[id]` gets a scoped
  violet `:focus-visible` override (was inheriting the old v4 blue accent
  from `globals.css`); `layout.tsx` gets `metadataBase` +
  `src/app/opengraph-image.tsx` (next/og `ImageResponse`, 1200×630, edge
  runtime — the Node runtime throws "Invalid URL" prerendering on Windows);
  `icon.svg` redrawn on-brand (was black/cyan v4 leftover) as the violet "//"
  device mark per the brand kit. `manifest.ts` colors were already correct.
  Gates: typecheck 0, tests 97/97, build clean. **Known-skipped:** the raster
  `public/icon-192.png`/`icon-512.png` PWA icons are still the old black/cyan
  art — regenerating binary PNGs needs an image tool, not available this
  pass. `/sign-in` (redirects to `/login` already) and the buyer/vendor
  dashboards are Phase 2/3, untouched.
- **Premium-polish Phase 2 — signed-in experience to Design System v1.0
  (2026-07-23, commit `60228ec` on branch `phase2-signed-in-reskin`, local,
  NOT pushed/merged)** — per `workplace/design/premium-polish-audit.md`.
  Visual/CSS only, same technique as Phase 1's `/login`: same class names,
  same handlers/state — only the `CSS` template literal + a scoped IBM Plex
  Sans `next/font` import changed per page. Reskinned: `/buyer`,
  `/buyer/profile`, `/vendor/portal`, `/vendor/listings`, `/vendor/leads`,
  `/vendor/quotes`, `/vendor/deals`, `/vendor/start`, `/cart`, `/projects`,
  `/projects/[id]`. Shared components that render on these pages also
  reskinned: `VendorNav`, `EmptyAction`, `MatchReasons`, `StageTracker`,
  `ProfileStrengthMeter`, `CategoryPicker`, `ChatWidget` ("Scout", embedded on
  `/vendor/portal`). Buyer↔vendor chat (`useChatPolling`, optimistic send,
  unread dot) on `/buyer` + `/vendor/leads` restyled light — polling hook and
  message handlers untouched. Kept the soft-blue `#3B6EA5` best-value
  fill-bar rule (see above). Also fixed a `/marketplace` listing-card bug: the
  no-photo image placeholder repeated the kind ("PRODUCT PRODUCT") that the
  badge row already showed — now shows the brand mark instead. Gates:
  typecheck 0, tests 97/97, build clean. Browser-verified `/cart`,
  `/projects`, `/vendor/deals` render light with no console errors; `/buyer`
  and `/vendor/leads` are gated by `src/middleware.ts` server-side auth and
  the verifying worktree had no Supabase credentials, so those two specific
  routes could not be interactively verified (CSS applied identically).
  **Setup note for whoever continues this branch:** the `.claude/worktrees/`
  copy this shipped from had been checked out from a stale, unrelated ancient
  branch (pre-marketplace "intel/brain" era) rather than `master` — had to
  create a fresh branch from `master`'s tip before any of this was possible.
  If a future worktree agent finds `src/app/buyer` missing, check
  `git log --oneline -5` first.

---

## Codex audit findings (imported 2026-07-22, from codex/cofounder-baseline)

Two full reports preserved in `workplace/research/`:
`performance-audit-2026-07-22.md` and `production-readiness-checklist-2026-07-22.md`.
Codex independently confirmed the blanket-`/api` public-cache bug (already FIXED
in commits c9937cf + 338caa1). Remaining items to schedule:

**Fixed alongside this import:** CI push trigger was `main` (never ran on the
real branch) → now `master` + `claude/v2-merged-baseline`; PWA manifest still
named the dead "Technology Intelligence / IKER / signals" product → now the
marketplace with violet/warm-white branding.

**Perf backlog (P1):**
- N+1 writes in RFQ fan-out: `api/marketplace/request::handleBundle` and
  `lib/requests/dispatch.ts` await one insert per vendor — batch into one
  insert + a DB uniqueness/upsert for idempotency; send emails after persist
  with bounded concurrency (never in the transaction path).
- Dashboard fetch waterfalls (buyer/vendor) — parallelize independent reads;
  `projects/[id]` reloads the whole payload after a mutation (update only the
  changed collection).
- No per-stage latency instrumentation (request-id + Server-Timing on
  non-sensitive diagnostics) → can't name the real bottleneck yet.
- Heavy client rendering: 39/41 pages are `'use client'` — move interactive
  bits to small client islands; consider ISR for public catalog pages.
- Optimistic UI inconsistent (ties into the money-button error/rollback work).

**Production-readiness backlog (P0/P1):**
- Security headers: add HSTS + CSP (report-only first) — still open from the
  original audit too.
- No E2E tests (Playwright) for buyer signup→RFQ→message and money flows.
- No centralized error reporting + external uptime monitoring.
- SEO: no `sitemap.ts`/`robots.ts`, no dynamic per-listing/vendor metadata
  (public pages only; keep authed workspaces noindex).
- Legal/ops: data export/deletion + retention (post-attorney).

Landing rewrite from that branch NOT imported (conflicts with the approved live
landing; superseded by the Alibaba-direction redesign, 2026-07-22).
