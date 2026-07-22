# Faceted Filter Engine — UX + Build Spec (from Cesar, 2026-07-22)

**Department: ENGINEERING** (frontend-dev owns the sidebar/chips/mobile sheet
UX; backend-dev owns the attribute schema + facet-count index). **Design**
collaborates on §11 (sidebar visual tokens). Companion to
`structured-search-blueprint-2026-07-22.md` — that one is the data-model
"why"; this is the detailed filter-panel "what/how".

**Status: RESEARCH INPUT — not scheduled.** No build without Cesar's go;
sequence with the structured-search work (schema P1 → facets P2 → this panel).

## Engineering framing (how it maps to today)

- The current `/marketplace` sidebar already does the §6 zero-result-hiding
  idea in a primitive way ("Filters reflect what vendors actually listed").
  This spec is the full version: per-category dynamic specs + live facet
  counts + active-filter chips + mobile bottom-sheet.
- §1/§4 (category-specific mandatory specs) DEPEND on the
  `category_attributes` schema + publish-time enforcement from the companion
  blueprint's Phase 1. Don't build the dynamic "Category Filters" section
  before that schema exists — it's the data source.
- §5 multi vs single-select, §7 chips, §6 counts: all Phase-2 (Postgres
  facet aggregation) territory — no Elasticsearch needed at current scale.
- §11 colors: reconcile with Design System v1.0 tokens. NOTE the spec here
  uses `#7C3AED` purple; our system violet is `#6C5CE0` (`--spec-violet`).
  Use the DS token, not the raw hex, when building (flag for Design).
- Constraints carry over: bilingual EN/ES labels for every filter/spec;
  validate all facet params against the schema table (no raw user input in
  `.or()`/query strings — known injection surface); no fee/dispatch changes.

---

## Cesar's spec (verbatim)

### 1. The Core Filtration Engine (behind the scenes)
Every product/service listing has: **Category** (leaf node in a tree, e.g.
Security & Surveillance → IP Cameras → AI-Enabled), **Industry tags**
(multi-select), **Type** (Product or Service), **Standard attributes** (price
model, lead time, location, verified status), **Category-specific specs**
(mandatory key-value pairs, e.g. Resolution=1080p, Power Source=Electric).
All stored in a search index. Applying any filter returns matching items PLUS
updated facet counts for every remaining option → zero-result options hidden
automatically; counts reflect the current narrowed set, never the whole
catalog.

### 2. Filter panel layout (desktop)
Sidebar on all search/browse/category pages, strict hierarchy: FILTERS
[Clear all] · "I'm looking for" (Products/Services) · Industry (checkboxes w/
counts, expandable) · Category (Current: All; "Select a category to unlock
detailed filters"; breadcrumb when selected) · Price Type (Fixed / Request a
quote / Rent-lease) · Supplier Location (type-ahead + checkboxes) · Verified
Supplier · Lead Time · Rating · then dynamic category-specific filters (§4).
Each section is a collapsible accordion; Industry/Category/Price Type expanded
by default, rest collapsed to prevent overwhelm.

### 3. Product / Service toggle (master filter)
First switch in sidebar. Default "All" (both; union of relevant filters).
"Products" → category tree = product categories only; product specs (Load
Capacity etc.) on category pick; Price Type = Fixed/Request Quote/Rent-lease
(no subscription). "Services" → service categories (Maintenance & Repair,
Consulting); specs like Service Type/Response Time/Certifications; Price Type
= Request Quote/Subscription/Fixed Packages. Landing via an industry tile
shows both; toggle narrows; counts update instantly.

### 4. Dynamic category-specific filters (Amazon-style unlock)
Selecting a leaf category adds a "Category Filters" section containing only
that category's relevant specs w/ facet counts (e.g. AI-Enabled Safety
Cameras → Resolution 1080p(15)/4MP(8)/5MP(5), Connectivity PoE(22)/WiFi(6),
AI Features, Indoor/Outdoor, Certifications). Switching category swaps the
specs; clearing category removes the section. Built from a per-leaf-category
"Filterable Attributes" table = the same attributes vendors must fill when
listing.

### 5. Multi vs single-select
Industry/Category/Price Type/Certifications = multi-select checkboxes (OR
within group, expands results). Location/Lead Time/Rating/most specs =
single-select (radio/slider) since contradictory values → zero results.
Resolution etc. allow multi-select. Mirrors Amazon (many brands, one
condition/price range).

### 6. Zero-result prevention
After every change, remove any option with count 0 — never show a filter
leading to an empty page. Example: Industry=Food&Beverage drops Forklift
Near-Miss AI 12→2; +Request a Quote makes Rent/Lease vanish; +Category shows
dynamic filters for that industry+quote combo. If a selection yields zero
total: "No results for these filters. Try removing some filters or [Post a
Need]." Selected filters shown as removable chips.

### 7. Active filter chips (above results)
All active filters as chips w/ ✕ + "Clear all" (e.g. [Warehousing & 3PL ✕]
[AI-Enabled Safety Cameras ✕] [PoE ✕]). ✕ removes that filter, updates
results + sidebar counts without full page reload (AJAX/client-side state).

### 8. Browsing without search (industry → category drilldown)
Homepage tile "Warehousing & 3PL" → pre-filtered results page, sidebar shows
that industry active, product/service toggle neutral, category section shows
only categories w/ ≥1 listing for that industry. Toggle Products → categories
update; pick category → dynamic specs; refine by location/lead time. Whole
marketplace navigable by filters alone (how procurement specialists operate).

### 9. Mobile filter experience
Filter panel behind a "Filter" button; opens full-screen bottom sheet, same
hierarchy simplified (top sections shown, rest collapsed); active-filter
chips row sticky at top; "Apply" button at bottom closes + refreshes.

### 10. What this improves over a generic marketplace
Industry is a first-class filter (not a hidden dropdown) — buyers think in
industry terms. Product-vs-Service is a toggle, not a separate site — one
interface adapts. Category-specific filters appear on-demand, not a permanent
overwhelming list. Zero-result options hidden, always with a "Post a Need"
fallback.

### 11. Visual integration
Sidebar white bg; section titles #111827; options #374151; counts #6B7280;
checkboxes/radios active purple #7C3AED *(→ use DS `--spec-violet` #6C5CE0)*.
Hover label = tint #F5F0FF. Selected chips = purple accent bg. Dynamic
section = smooth expand animation. Feel: crisp modern industrial control
panel, not a cluttered catalog.
