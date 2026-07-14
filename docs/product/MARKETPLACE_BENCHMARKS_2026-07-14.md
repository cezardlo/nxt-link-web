# Marketplace Benchmarks — How Other Companies Do It

Date: 2026-07-14

Purpose: pattern library for NXT Link's vendor storefront, onboarding, pricing,
matching, certifications, and coverage design. Compiled from platform seller
documentation and public product knowledge (early 2026); spot-verify any pattern
before copying exact wording or legal claims.

---

## 1. Industrial / B2B platforms

### Thomasnet (now part of Xometry)

- **Profile anatomy:** company header (name, location, year established,
  employee band, annual revenue band, business type: manufacturer / custom
  manufacturer / distributor / service company), long-form capabilities
  description, product/service catalog, CAD files, white papers, news.
- **Certifications:** a dedicated, structured attribute set (ISO 9001, AS9100,
  IATF 16949, ITAR registered, UL, FDA…) plus diversity credentials
  (woman-owned, minority-owned, veteran-owned, small business). Crucially these
  are **search facets**, not just profile decoration — buyers filter supplier
  lists by certification. Registered/verified tiers distinguish self-reported
  data from platform-checked data.
- **Location:** HQ plus branch locations; search facets by state/region and
  proximity. "Serving" coverage is distinct from "located in."
- **Lesson for NXT Link:** certifications and diversity credentials must be
  structured + filterable, never free text. Business type and revenue/employee
  bands make suppliers comparable at a glance.

### Alibaba.com

- **Profile anatomy (minisite):** banner, logo, "Gold Supplier — N years,"
  Verified Supplier badge, company video/factory tour, production capacity,
  main markets, QC capability, certificates gallery, product showcases.
- **Marketplace stats shown publicly:** response time, on-time delivery rate,
  transaction volume band ("US $1M+ in last 180 days"), repeat-buyer/reorder
  rate, years on platform. These stats are computed from platform activity —
  vendors cannot type them in.
- **Certifications:** certificate images with issuer, certificate number, and
  **validity dates**; Verified Supplier status is backed by third-party on-site
  audits (SGS / TÜV / Intertek) with the **audit report viewable on the
  profile**. The badge says exactly what was checked.
- **Pricing:** the industry standard for quantity-tier ladder pricing:
  "MOQ 500 · 500–999 pcs $3.10 · 1,000+ $2.50." Ranges allowed; "Contact
  supplier" fallback. Trade Assurance (payment protection) is a separate badge.
- **RFQ marketplace:** buyers post structured RFQs (category, quantity, specs,
  attachments, deadline); suppliers spend a limited monthly quota of RFQ
  responses — scarcity forces vendors to self-select relevant leads (an
  implicit do-not-send mechanism).
- **Onboarding:** AI listing generation from images/text is now standard; drafts
  require seller confirmation before publish.
- **Lesson:** platform-computed trust stats + evidence-backed verification with
  visible audit trail + tiered pricing as a first-class structure.

### Amazon Business

- **Seller credentials:** quality certifications (ISO 9001 etc.) and diversity
  credentials appear on seller profiles and as **B2B search filters**.
- **Pricing:** business-only pricing and **quantity discount tables visible
  only to signed-in business accounts** — the canonical real-world example of
  the "signed-in clients" pricing visibility tier. Manual "request a quote"
  path exists for large quantities.
- **Onboarding:** guided setup with completeness prompts; generative-AI listing
  creation from a URL or product images, always seller-confirmed.
- **Lesson:** gated pricing by account status is a proven, non-shady pattern;
  quantity price-break tables convert better than "call for pricing."

### Xometry

- **Instant quoting:** upload CAD → algorithmic instant price across processes.
  The strongest example of a deterministic estimate engine. Their partner side
  profiles manufacturers by capability (processes, materials, certifications)
  and matches jobs; partners set preferences for job types they accept.
- **Lesson:** estimates are only offered where deterministic rules exist —
  everything else routes to quote. Capability-profile-driven matching with
  vendor-set acceptance preferences is exactly NXT Link's Section 21/22 model.

### Machinio / MachineryTrader (equipment listings)

- **Category-specific spec templates are the norm:** a forklift listing has
  capacity/mast/hours/fuel; a lathe has swing/bed/spindle. Price or "Call for
  price"; dealer pages show inventory + location + distance from buyer.
- **Lesson:** buyers expect per-category spec fields on equipment; a generic
  spec form reads as amateur.

### Grainger / Zoro

- Deep spec tables, compliance flags (UL, NSF, OSHA-relevant attributes),
  real-time availability, and **visible quantity price breaks**.
- **Lesson:** availability status and lead time belong on the card, not buried.

### GlobalSpec / DirectIndustry

- Parametric technical search: filter by numeric spec ranges (load capacity,
  accuracy, speed). Datasheet-driven.
- **Lesson:** structured spec values (with units) eventually enable spec-range
  search — store specs typed, not as strings, even if the UI comes later.

---

## 2. Software / services review marketplaces

### G2 / Capterra

- **Profiles:** product-centric, quarterly Leader/High-Performer grid badges,
  screenshots, feature checklists.
- **Pricing norms:** vendors choose to publish tier cards or show "pricing
  available on request." Both platforms publicly push vendors to disclose:
  hidden pricing measurably reduces qualified-lead quality — buyers who see at
  least a starting price convert better and waste less vendor time.
- **Reviews:** identity-verified reviewers (LinkedIn login, screenshot
  validation); incentivized reviews labeled.
- **Lesson:** "starting at" pricing beats hidden pricing for lead quality; if a
  vendor insists on private pricing, still collect it internally for quoting.

### Clutch.co

- **Profile anatomy:** hourly-rate band, **minimum project size ($5k+ / $10k+ /
  $25k+…) as a first-class public, filterable field**, team size, founded,
  locations, service-focus percentage breakdown, portfolio, case studies, and
  phone-interview-verified client reviews. Business-entity verification tier.
- **Lesson:** minimum project value works in public and pre-filters bad-fit
  leads — this is exactly NXT Link's "minimum project value" and validates
  making it visible, not just a private matching input.

---

## 3. Local services marketplaces (closest to service-vendor matching)

### Thumbtack

- **Profile anatomy:** photo, "responds within ~X hours," **number of hires on
  the platform**, years in business, background-check badge, license
  verification, photos of work, Q&A ("what should customers know about your
  pricing"), starting prices for standard jobs, reviews.
- **Matching / do-not-send:** pros configure **targeting preferences** — job
  types, travel radius / geography, availability, job-size filters. Leads
  outside preferences are simply never sent. This is the cleanest production
  implementation of the master prompt's do-not-send preferences.
- **Certifications/licenses:** license numbers checked against state boards for
  licensed trades; displayed with a checkmark near the top of the profile.
- **Location:** travel-radius selector; buyer sees "serves your area" at search
  time based on zip.
- **Lesson:** vendor-set lead preferences + platform-verified licenses + a
  response-time stat are the trust trio for service providers.

### Angi

- License and insurance verification with state license numbers displayed;
  expired credentials remove the badge. Service-area radius. "Angi Certified"
  bundles background check + license screen.
- **Lesson:** expiry must automatically remove the badge — never let a stale
  credential keep rendering.

### Houzz Pro

- Portfolio-first profiles (project photo albums), Best-of badges by year,
  service areas, reviews.
- **Lesson:** for visual trades, gallery quality is the conversion driver —
  photo/case-study prompts should be early in onboarding, not an afterthought.

---

## 4. Wholesale + reference models

### Faire

- Brand storefronts show minimum order value, lead time ("ships in 3–5 days"),
  and **insider pricing / net-60 terms visible only to signed-in retailers** —
  another production example of tiered pricing visibility.
- **Lesson:** lead time on the card; gate wholesale terms behind sign-in, not
  behind a sales call.

### LinkedIn company pages

- Header (banner, logo, tagline, industry, size, followers), About, **Featured
  (pinned content)**, People. The user-requested "Featured" pin pattern comes
  from here.
- **Lesson:** one pinned "Featured" slot at the top of the storefront for the
  vendor's best product or case study.

---

## 5. Certification display — synthesis (the pattern to build)

Across Thomasnet, Alibaba, Thumbtack, and Angi, the winning pattern is:

1. **Structured record:** name, issuer, credential/license number, issue date,
   **expiry date**, document/image, scope.
2. **Verification status on the record:** self-reported → platform-verified
   (with what-was-checked language). Only the platform can flip it.
3. **Placement:** summarized as badges in the profile header; full detail in a
   Proof/Credentials section with viewable documents (Alibaba shows the audit
   report itself).
4. **Search integration:** certifications are facets buyers filter by.
5. **Expiry behavior:** expired ⇒ badge removed automatically, vendor alerted
   ahead of time, dependent permissions (e.g., on-site work) suspended.

NXT Link already stores name/issuer/credential/expires_on/image in
`vendor_certifications` — missing pieces are verification status, expiry
automation, header badges, and search facets.

## 6. Location & coverage — synthesis

- Separate **HQ** from **coverage**; coverage split by mode (deliver / install /
  on-site service / remote) is NXT Link's differentiator — no benchmark does
  the 4-way split explicitly; Thumbtack's travel radius is the closest.
- Show a "serves El Paso / Juárez / cross-border" indicator on cards at search
  time (Thumbtack's "serves your area").
- A simple coverage map (highlighted regions, not pins) reads better than text
  chips for multi-region vendors.
- Cross-border readiness (Mexico + US, bilingual, customs experience) is the
  Borderplex-unique badge no benchmark platform has.

---

## 7. Patterns worth copying into NXT Link

| # | Pattern | Best example | Why it works | NXT Link adaptation |
|---|---|---|---|---|
| 1 | Platform-computed trust stats (response time, deals closed, repeat rate) | Alibaba, Thumbtack | Can't be faked; builds trust fast | "Responds in ~3 hrs · N quotes sent · N deals closed" from `quote_requests` timestamps; hide until minimum sample (e.g., 5 events) |
| 2 | Quantity-tier ladder pricing | Alibaba, Zoro | Buyers self-serve budget fit | `pricing_tiers` on listing price models |
| 3 | Pricing visibility gated by account tier | Amazon Business, Faire | Discloses without leaking to competitors | 5-level visibility enum (public → private) per price model |
| 4 | "Starting at" beats hidden pricing | G2/Capterra norm | Better lead quality both sides | Nudge (not force) vendors toward at least a starting price; store private pricing for quoting anyway |
| 5 | Minimum project size as public filterable field | Clutch | Pre-filters bad-fit leads | `min_project_value` in match profile + optional public display |
| 6 | Vendor lead-targeting preferences (do-not-send) | Thumbtack | Vendors stop paying attention to junk leads | Opportunity preferences + exclusions tables driving lead routing |
| 7 | Evidence-backed verification with visible audit trail | Alibaba Verified Supplier | Badge means something concrete | Credential tokens say exactly what NXT checked; document viewable |
| 8 | License/insurance expiry auto-removes badge | Angi | Prevents stale trust | Expiry job on `vendor_certifications` + permission effects |
| 9 | Certifications as search facets | Thomasnet | Buyers actually filter by them | Add cert facet to marketplace filters |
| 10 | Category-specific spec templates | Machinio | Industrial buyers expect the right fields | `specification_definitions` per category |
| 11 | Brands-supported as structured field | Thomasnet capability data | #1 search axis for service buyers | `vendor_brands` (brand, sell/service/authorized) + facet + match rule |
| 12 | Instant estimate only where rules are deterministic | Xometry | Honest automation | Estimate calculator only from vendor-entered formulas; labeled estimate |
| 13 | RFQ response quota / relevance forcing | Alibaba RFQ | Vendors self-select relevant leads | Decline-with-reason feedback loop; consider soft caps later |
| 14 | "Serves your area" at search time | Thumbtack | Kills the #1 industrial disqualifier early | Coverage-mode-aware area matching in guided search |
| 15 | Featured/pinned slot at profile top | LinkedIn | Vendor pride + faster buyer scan | `featured_*_ids` already exist — add pin UI + storefront slot |
| 16 | Hires/transactions counter | Thumbtack | Social proof without fake reviews | Deals-closed counter from `purchases`/accepted quotes |
| 17 | Verified-transaction-only reviews | NXT Link already does this | Keeps reviews meaningful | Keep; label "from verified NXT Link deals only" |
| 18 | Lead time + availability on the card | Grainger, Faire | Reduces dead-end clicks | Already partially on cards; make it a structured band filter |
| 19 | Completeness meter + "next best action" | Amazon Seller Central | Drives profile quality without force | Extend existing `profileCompletion()` to the wizard + dashboard |
| 20 | One-page downloadable line card | Industrial distributor norm | Buyers forward it internally | Dedicated `line_card` document slot; later auto-generate from profile |

## 8. Anti-patterns to avoid

1. **Leaky directory:** exposing vendor phone/website as the primary CTA
   (old-Thomasnet weakness). Primary actions must run through NXT Link —
   already blueprint §16 policy.
2. **Pay-to-win ranking:** letting spend override technical fit (a widespread
   G2/Capterra complaint). Sponsored slots only if labeled and never replacing
   fit requirements.
3. **Fake urgency / fake scarcity / unexplained match percentages:** damage
   trust with professional buyers; use explainable plain-language matches only.
4. **Charging for junk leads:** Thumbtack's biggest vendor complaint. Free,
   preference-respecting leads first; monetize the transaction (commission),
   not the lead.
5. **Vendor-typed trust stats:** never let vendors self-enter response time,
   deals closed, or ratings. Compute or omit.
