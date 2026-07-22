# Flow + Visual System Blueprint — 2026-07-22

**Prepared by:** Design department. **Status:** Approved-pending-Cesar.
Read-only against the live repo — no code changed. Synthesizes marketing's
research (`workplace/research/flow-redesign-market-research.md`), Design
System v1.0 (`vault/Design-System.md`), the current landing (`src/app/
page.tsx`), and the reskin backlog item (`vault/Backlog.md`). Every claim
about current code below was verified by reading the actual files.

---

## 1. Summary for Cesar (bottom line first)

**Bottom line: keep the buyer search homepage exactly as its job, but put
"join as a vendor" one click away from anywhere, fix the header so people can
actually read it, and stop the site changing its whole color scheme every
time someone clicks a link.**

1. **Homepage stays buyer-first** — search and "describe what you need" keep
   the hero. No vendor-only homepage (Amazon's route) — that loses reach on a
   cold-start marketplace that needs every visitor to see both pitches.
2. **"Become a Vendor" becomes a permanent, equal-weight header item** next
   to "Sign in," on every page, not buried in a footer — the single
   highest-leverage change (Thomasnet/Fiverr both ship exactly this).
3. **The vendor pitch moves from the bottom of the page to right after the
   hero.** Today it's below How-it-works, category tiles, and featured
   listings — a vendor has to scroll past the whole buyer experience first.
4. **"Post a Request" stops competing for the #1 spot** — moves out of the
   header into the hero as a secondary button next to search, so there is
   exactly one dominant action per screen region.
5. **One color system, everywhere.** The homepage was reskinned to Design
   System v1.0 (light + violet `#6C5CE0`). Verified: `/marketplace` and
   `/intake` — the very next click from the homepage — are **still** the old
   dark theme (`#0A0A0F`, a different font, a slightly different purple
   `#7C5CFC`). That's the "theme whiplash" bug, on the single most common
   click in the product. Sequenced to fix in §3/§7.
6. **The header flips from dark to light.** The dark header's own code
   comment calls it a "bridge" to the app's dark chrome — but the spec's real
   signed-in chrome is a *light* top bar next to a dark *sidebar*, so a light
   public header is the more accurate bridge, and it directly fixes the
   illegible/near-invisible Sign-in/Join contrast problem.
7. **Categories shrink from two lists (6 + 14) to one list of 6** — matching
   every competitor checked (Thomasnet/Alibaba ~4, Fiverr's ceiling ~10).
8. **Vendor pages get ONE shared navigation** instead of 5 different ones
   found in the code today, and the orphaned `/vendor/quotes` page (unlinked
   from the vendor's main portal, listings, and leads screens) gets a link.
9. **The two separate "start a request" flows merge.** `/intake` (assisted
   RFQ) and `/projects` (a second, separate drafting flow) become one buyer
   workspace; the Deal Room's Quotes tab — confirmed read-only, no
   Accept/Decline control in the code — gets the accept action wired in.
10. **No new features, no new claims.** Every new sentence is marked
    `[COPY: ...]` for marketing to draft and Cesar to approve — including one
    **existing** copy conflict found here: current landing copy promises
    "first two deals commission-free"; Cesar's binding decision (2026-07-21)
    sets standard credit at $250 on the first deal only.

### Landing, top of page (target)

```
┌ HEADER — light ──────────────────────────────────────────────────┐
│ NXT//LINK   [ Search equipment, services, part numbers…      ]    │
│                                    EN|ES  [Become a Vendor] Sign in  Join │
├ CATEGORY BAR — 6 items, no second list ───────────────────────────┤
│ Material Handling | Safety & PPE | Warehouse Tech | Automation &  │
│ Robotics | Maintenance & Repair | Supply Chain Services           │
├ HERO — dark accent band (unchanged buyer promise) ────────────────┤
│ Find industrial suppliers. Get competitive quotes.                │
│ ┌──────────────────────────────────────────┐ ┌─────────────────┐ │
│ │ I need maintenance for 6 forklifts…       │ │ Post a Request →│ │
│ └──────────────────────────────────────────┘ └─────────────────┘ │
│  chips: Forklift repair · Racking · Barcode · Conveyor · PPE      │
│  ✓ Verified suppliers  ✓ Protected intros (12mo)  ✓ Free to send  │
│                                        [ Search Products & Svcs ] │
├ VENDOR PITCH — moved here, right after hero ──────────────────────┤
│ Showcase your technology to Borderplex buyers                     │
│ Free to join · 60-second signup · no long forms                   │
│           [ Apply for early access ]  ← the one primary CTA here  │
└────────────────────────────────────────────────────────────────────┘
```

### Vendor pitch section (detail)

```
┌────────────────────────────────────────────────────────────────┐
│  [COPY: headline naming the audience directly]                 │
│  [COPY: one-line frictionless-signup proof, no invented stats] │
│                                                                  │
│  ✓ Free to join              ✓ 60-second signup, no long form  │
│  ✓ QR-code conference join   ✓ Protected introductions (12 mo) │
│  ✓ Bilingual storefront (EN/ES)                                 │
│                                                                  │
│                 [ Apply for early access ]  ← ONE button        │
└────────────────────────────────────────────────────────────────┘
```

### Header (target, light)

```
┌────────────────────────────────────────────────────────────────┐
│ NXT//LINK    [ 🔍 Search box, flexes to fill                ]  │
│                                EN|ES  [Become a Vendor] Sign in  Join │
└────────────────────────────────────────────────────────────────┘
  bg: --spec-warm-white   text: --spec-ink   accent: --spec-violet
```

---

## 2. Landing blueprint

### Exact section order (top to bottom)

1. **Header** (light, sticky) — logo, search, language, Become a Vendor, Sign
   in, Join, cart icon if items. *(spec in §4)*
2. **Category bar** — the 6 canonical categories only, always visible,
   horizontal-scroll on mobile (existing `.hp-catbar` mechanism, unchanged).
3. **Hero** — unchanged: eyebrow, headline, "describe your need" prompt card
   (primary here), quick-start chips, trust checks, "Search Products &
   Services" secondary. **Post a Request lives here now, not the header** —
   it's the prompt card's own button (`heroCta2`), still one click away, just
   not competing with header CTAs.
4. **Vendor pitch band** ("Are you a supplier?") — **moved from the bottom of
   the page to directly after the hero.** The single highest-evidence
   structural change (Thomasnet pattern; matches Cesar's cold-start
   priority). Content spec in §5.
5. **How it works** (3 steps) — unchanged; buyer-trust build after the vendor
   ask, before browsing.
6. **Category tiles** (same 6, larger grid) — unchanged position and list.
7. **Trust bar** — unchanged, no escrow language (already correct).
8. **Featured listings** — unchanged, real data.
9. **~~Shop by department (14 items)~~ retired from the homepage.** The full
   taxonomy still exists and is useful, but two differently-sized category
   lists on one page is the exact anti-pattern the research flagged. It moves
   behind `/marketplace`'s existing department filter (`?department=<fg>`,
   already wired), reached via "Browse all categories," not duplicated here.
10. **Buying tools** — unchanged. 11. **FAQs** — unchanged. 12. **Footer** —
    unchanged (For buyers / For vendors / Company columns already balanced).

### CTA hierarchy — one primary per region

| Region | Primary | Secondary | Removed from here |
|---|---|---|---|
| Header | *(none — utility bar)* | Search, Become a Vendor, Sign in, Join | Post a Request (→ hero) |
| Hero | "Describe your need" → Post a Request | "Search Products & Services" | — |
| Vendor pitch band | "Apply for early access" | — | — |
| Category tiles / featured | (navigation only) | "Create a free account" (after featured) | — |

No region ever shows two equal-weight buttons both claiming to be the main
action — the one rule every real competitor in the research follows.

### Where buyer RFQ lives
Unchanged, confirmed correct: the hero's prompt card (`/intake`) and header
search (`/marketplace?q=`) are both one click from the top — buyer discovery
gets no harder, only the vendor ask gets easier to find.

### Categories — the 6, named from the real taxonomy
Confirmed in `src/app/page.tsx` (`CATEGORY_TILES`, `fg` = real
functional-group values `/marketplace` also filters on): **Material
Handling, Safety & PPE, Warehouse Technology, Automation & Robotics,
Maintenance & Repair, Supply Chain Services.** Already right-sized (research:
6–8) — no change to the list, only to where the *other* 14-item list lives.

---

## 3. Palette decision

**Commit fully to Design System v1.0 (light content + violet `#6C5CE0`) as
THE system, sitewide.** Not a new call — `vault/Decisions.md` already
resolved it ("Palette RESOLVED → violet spec system... blue-on-light option
dropped") and nothing in the research argues for an alternative. This
blueprint's job is the header treatment and rollout order only.

### Header treatment: FULL LIGHT, not the dark-ink bridge

The current header (`.hp-header`) is deliberately dark — its own comment
calls it "the bridge into the rest of the app's dark chrome." **Flip it to
light**, for three reasons:

1. **Fixes the contrast defect directly** — reuses only the already-proven
   light-surface + ink-text + violet-accent combos the rest of the page uses
   (how-it-works, category tiles, FAQ). No ambiguity, no sub-AA pairing.
2. **The "bridge" doesn't point where it thinks.** The spec's actual
   signed-in chrome (`Design-System.md` §5) is a **248px dark sidebar** next
   to a **66px top bar** — the top bar itself is never spec'd dark. A dark
   public header bridges to a chrome pattern that doesn't exist downstream; a
   light header is the more accurate preview.
3. **Removes a whiplash moment at the very top** — dark header → light
   category bar → dark hero was already an odd sandwich; light → light →
   dark (kept, deliberately, as one accent moment) reads as one intentional
   choice.

**Target header tokens** (already wired, no new tokens needed):

| Element | Background | Text | Notes |
|---|---|---|---|
| Header bar | `--spec-warm-white`/white, `--spec-border` bottom | — | replaces `rgba(20,19,32,.94)` |
| Logo | transparent | `--spec-ink`, "//" in `--spec-violet` | unchanged mark |
| Search bar | white/`--spec-surface`, `--spec-border` outline | `--spec-ink`, placeholder `--spec-text-2nd` | violet focus ring |
| Become a Vendor | `--spec-violet` fill | white | same button component as Join, different label |
| Join | bordered, transparent | `--spec-ink` | outline button |
| Sign in | transparent | `--spec-text-2nd`, hover `--spec-ink` | lightest-weight item |

The **dark hero band stays dark** — a deliberate accent moment, not a
legibility surface; every real competitor pairs a light shell with one strong
accent zone (Thomasnet's search hero, Amazon's CTA block).

### Sitewide rollout order — sequenced by journey, not by screen list

`vault/Backlog.md`'s existing reskin order (Marketplace Home → Search →
Vendor Profile → dashboards → wizard → Deal Room) is a **screen** list.
Reskinning in that order can still leave a mid-*journey* crossing at an
intermediate checkpoint (Marketplace Home done, Vendor Profile not yet — a
buyer mid-search still hits a dark vendor page). This reorders the same work
around **complete journeys**, so at every checkpoint a user who starts a
journey never crosses a theme boundary mid-flow:

| Stage | Journey completed in one palette | Screens | Confirmed current state |
|---|---|---|---|
| Done | — | `/` | Light + violet (commit `0364299`) |
| 1 | Anon. buyer: land → search/RFQ → view listing/vendor | `/marketplace`, `/intake`, `/marketplace/[kind]/[id]`, `/marketplace/vendor/[id]` | Confirmed dark: `#0A0A0F`/`Outfit` (marketplace); `#0A0A0F`/system-ui/`#7C5CFC` (intake) — neither matches spec |
| 2 | Become a user: sign up / sign in | `/login`, `/signup`, `/vendor-login`, `/vendor-signup`, `/join/[token]`, `/forgot-password`, `/reset-password` | Not individually verified this pass — treat as legacy until confirmed |
| 3 | Signed-in buyer: track → compare → accept → deal | `/buyer`, `/projects`, `/projects/[id]`, `/account`, `/cart` | Legacy; dual-flow merge (§4) lands here |
| 4 | Signed-in vendor: onboard → list → lead → quote → deal | `/vendor/portal`,`/listings`,`/leads`,`/quotes`,`/deals`,`/start` | Legacy; the spec's dark 248px sidebar belongs here; shared VendorNav (§4) ships here |
| 5 | Operator: review → moderate → reconcile | `/admin/*` | Legacy; lowest visibility, last |

Same order as Implementation Slices §7 — highest-visibility, most-crossed
journey first.

---

## 4. Navigation spec

### ONE public header (all anonymous/marketing-facing pages)

Logo · Search (flex-fill) · Language toggle (EN/ES text, already correct — no
flags) · **Become a Vendor** · Sign in · Join · Cart icon (only when items
present, already built via `useCart`).

- Applies to `/`, `/marketplace`, `/intake`, `/marketplace/[kind]/[id]`,
  `/marketplace/vendor/[id]` — the whole anonymous-buyer journey (Stage 1)
  gets this ONE header, replacing `/marketplace`'s separate `mk-*` header and
  `/intake`'s header-less layout.
- **Mobile:** logo + collapsed search icon (expands on tap) + hamburger
  holding language/Become a Vendor/Sign in/Join. The bottom sticky CTA stays
  but never overlaps a floating element — any chat/concierge FAB anchors
  above the sticky bar's height (fixes "FAB collides with hero proof card"
  structurally: floating elements get a defined, non-overlapping stack
  order, not ad hoc positioning per page).

### ONE shared VendorNav (replaces 5 divergent navs found in code)

Confirmed today — five implementations, five CSS conventions, no two pages
agreeing on the link set:

| Page | Nav class | Links present |
|---|---|---|
| `/vendor/portal` | `.vp-navlink` | Listings, Leads, Deals *(no Quotes)* |
| `/vendor/listings` | `.sc-link` | Leads inbox, Company profile, Get set up, Profile, Leads |
| `/vendor/leads` | `.ld-link` | Profile, Your listings *(no Deals, no Quotes)* |
| `/vendor/deals` | `.vd-pill` | Leads, Quotes, Listings |
| `/vendor/quotes` | `.vp-pill` | Leads, My deals, Listings |

**`/vendor/quotes` is genuinely orphaned** — the vendor's main hub
(`/vendor/portal`) and the two busiest daily screens (`/vendor/listings`,
`/vendor/leads`) never link to it.

**Target — one `<VendorNav>`, identical on all six pages:**
```
NXT//LINK · Seller Central     Portal · Listings · Leads · Quotes · Deals     [Sign out]
```
- Full link set, every page: **Portal (profile/home) · Listings · Leads ·
  Quotes · Deals.** "Seller Central" already exists as a subtitle in two of
  the five current navs — standardize everywhere.
- **Mobile:** reuse the homepage's proven horizontal-scroll pill pattern
  (`.hp-catbar` mechanism — no new pattern) — direct fix for the audited
  "mobile nav overflow on buyer/vendor dashboards" finding.
- `/vendor/start` (onboarding wizard) intentionally keeps only a "skip to
  Listings" link — it's a linear first-run flow, unchanged.

### Buyer nav (thinner surface, still ONE nav)

Marketplace · My Projects · Account, with the cart icon. `/buyer` (today's
"dashboard") and `/projects` (today's "workspace") merge into one destination
(below), so there's one nav entry, not two — `/marketplace`'s "My dashboard"
link repoints from `/buyer` to `/projects`, the canonical landing view.

### Dual-flow merge: `/intake` vs `/projects`

Confirmed in code: `/intake` posts to `POST /api/platform/requests`
(`client_requests`); `/projects` is a **separate** conversational drafting
flow with its own AI-draft endpoint and stage tracker (`organizing →
requirements_ready → matching → …`) — not the same record type. **Direction:**
`/intake` stays the fast, no-account-needed way to *start* a request;
`/projects` becomes the ONE buyer workspace listing every request regardless
of origin door, and `/projects/[id]` (Deal Room) becomes the canonical place
to manage it, including accept/decline. Flow-level direction for engineering
to schema-map — this blueprint does not redesign the database.

**Deal Room quotes tab — confirmed read-only today.** `src/app/projects/[id]/
page.tsx`'s `quotes` tab renders amount/status/compare table but has **no
Accept/Decline control anywhere in it.** The accept action already works
(`POST /api/buyer/quote-decision`, used from `/buyer` today) — surface it
inside the Deal Room's Quotes tab too, so a buyer never has to leave the
workspace to close a deal.

---

## 5. Vendor showcase emphasis

No new features — brochures, case studies, gallery/photos, videos,
logo/banner, and certifications APIs all already exist (confirmed per repo
audit). The work is **emphasis and framing**, not engineering.

The existing Profile-Strength meter (`src/components/ProfileStrengthMeter.tsx`,
confirmed 5 items, 30% pre-credited, named unlocks) already asks for exactly
the assets the pitch should sell: **(1)** logo & one-line description,
**(2)** first listing (draft is fine), **(3)** business details, **(4)**
**"add proof — a certification, photo, or case study,"** **(5)** payment
setup.

**Pitch-section mapping** (same order every competitor studied uses — a
proof-rich profile is the product, the landing page's job is only to start
the vendor filling it in):
- **Photos** → bullet + link to a real, published example storefront.
- **Case studies** → bullet framed as "show buyers who you've already helped."
- **Certifications** → bullet + reuse the existing trust-badge visual
  language (Verified/Insurance reviewed/Certified, Design-System.md §3), so
  the pitch previews the exact badges a storefront will carry.
- **Brochures/spec sheets** → bullet, "buyers can download your specs without
  asking."
- **Video** → bullet, low-effort framing ("even a phone video of the shop
  floor works").

**Onboarding nudge reuse:** the existing day-based cron
(`/api/cron/profile-nudges`) already emails vendors with incomplete
profiles — its copy should name item 4 ("add proof") specifically instead of
generic "complete your profile" language. A copy change inside an existing
job, not new engineering.

---

## 6. Copy slots

Marketing drafts these; Cesar approves. No escrow/payment-security language.
No invented stats. Bilingual (EN/ES) for every slot.

- **[COPY: "Become a Vendor" nav label]** — open question from research:
  literal ("Become a Vendor"/"List Your Company") vs. Borderplex-specific
  ("Showcase Your Technology"). Affects EN and ES.
- **[COPY: vendor pitch headline]** — name the audience directly (Amazon:
  "Sell more with Amazon"; Thomasnet: "For Suppliers").
- **[COPY: vendor pitch one-line proof]** — the true, already-built fact
  (60-second signup), no invented number.
- **[COPY: vendor pitch value bullets, 4–5]** — free to join; 60-second
  signup, no long form; QR-code conference onboarding; protected
  introductions (12 months); bilingual storefront. Hold the first-deal-credit
  bullet until legal wording is final — don't reuse the current wording.
- **[COPY FIX — conflicts with a binding decision, not a new slot]:** current
  live copy (`src/app/page.tsx`, `vendorBody`/`eaFootnote`, EN+ES) says
  **"your first two deals are commission-free"** / "then 5%." Cesar's binding
  decision (`workplace/plans/DECISIONS-2026-07-21.md` item 5, 2026-07-21)
  sets the standard at **up to $250 credit on the FIRST deal only**; $1,250
  is reserved for manually-approved founding vendors. Correct as part of
  Slice 1 — flagging so marketing doesn't redraft the old, wrong number.
- **[COPY: vendor showcase micro-copy]** — captions for the pitch section's
  photo/case-study/certification/brochure/video callouts (§5).
- **[COPY: shared VendorNav labels]** — confirm EN/ES strings for
  Portal/Listings/Leads/Quotes/Deals are consistent (some currently differ —
  e.g. "Your listings" vs "Company profile" naming the same destination).
- **[COPY: profile-nudge cron email]** — wording naming "add proof"
  specifically, both reminder waves (~24h/72h).
- **[COPY: mobile sticky CTA]** — confirm final wording once "Post a Request"
  is no longer the header's dominant action (may stay as-is).
- **[COPY: "Browse all categories" link]** — taking buyers from the
  homepage's 6-item set to the full taxonomy on `/marketplace`.

---

## 7. Implementation slices

Five sequential slices, each independently shippable, highest-visibility
first. Builds on: reskin commit `0364299`, Google auth commits `76f4686` +
`0265767`.

**Slice 1 — Landing header, nav, and reorder** *(builds on `0364299`)*
Flip header to light (§3 tokens); add "Become a Vendor"; remove "Post a
Request" from the header (stays in the hero prompt card only); move the
vendor pitch band directly after the hero; trim homepage to the 6 canonical
categories, retire the 14-item "Shop by department" section (relink to
`/marketplace`'s existing filter); fix the copy conflict (§6); fix hero chip
contrast, header click-zone overlap, and the floating-element stacking rule
(§4). Single file (`src/app/page.tsx` + scoped CSS) — lowest risk, highest
payoff, ships first.

**Slice 2 — Public buyer journey theme parity** *(builds on Slice 1)*
Apply Design System v1.0 to `/marketplace`, `/intake`,
`/marketplace/[kind]/[id]`, `/marketplace/vendor/[id]` — replacing confirmed
`#0A0A0F`/`Outfit` (marketplace) and `#0A0A0F`/system-ui/`#7C5CFC` (intake)
with `--spec-*` tokens + Space Grotesk/IBM Plex Sans. Ship the ONE public
header (§4) across all four screens. Direct fix for the highest-traffic
instance of theme whiplash.

**Slice 3 — Shared VendorNav + vendor journey reskin** *(builds on `76f4686`
+ `0265767` for the sign-in doors it touches)*
Build the ONE `<VendorNav>` (§4), replacing the five divergent navs
(`vp-navlink`/`sc-link`/`ld-link`/`vd-pill`/`vp-pill`); wire `/vendor/quotes`
into every page's nav, fixing the orphan; apply Design System v1.0 across all
six vendor pages, introducing the spec's dark 248px sidebar here (the chrome
it was designed for); ship the vendor showcase emphasis copy/layout from §5.

**Slice 4 — Buyer journey reskin + dual-flow merge**
Reskin `/buyer`, `/projects`, `/projects/[id]`, `/account`, `/cart`; merge
the `/intake`-vs-`/projects` flows per §4 so every request lands in one
workspace; add the missing Accept/Decline control to the Deal Room's Quotes
tab (wiring the already-working `POST /api/buyer/quote-decision`, not new
accept logic). UI/flow merge only — no new database tables.

**Slice 5 — Admin reskin + Spanish-language gap closure**
Reskin `/admin/*` last (lowest visibility, internal-only); close the Spanish
gap on the 10 pages confirmed to lack it, reusing the existing
`LanguageToggle`/`useLang` pattern already proven elsewhere. Bundled last —
internal-facing or a known content gap, not a growth-blocking flow issue.

---

*Cap note: decisive, not exhaustive. Deeper engineering detail (schema for
the `/intake`/`/projects` merge, FK work, CSRF/build-safety items from
`vault/Audit.md`) is out of scope for a flow blueprint — scope separately
against this document's direction.*

---

**APPROVED by Cesar 2026-07-22** with one amendment: vendor-facing Spanish-language gap closure moves from Slice 5 into Slice 3 (vendor journey). Admin reskin + remaining buyer-side Spanish stays in Slice 5.
