# Structured Search & Faceted Filters Blueprint — from Cesar (2026-07-22)

**Department: ENGINEERING** (backend-dev owns the data model + index;
fullstack-dev owns the filter UX wiring). Routed by coordinator per Cesar's
"give this to the correct department."

**Status: RESEARCH INPUT — not scheduled.** No build without Cesar's go;
sequenced AFTER the reskin slices (4–5) unless he pulls it forward.

## Engineering framing — how this maps to what exists TODAY

What we already have (verified in repo/DB):
- `categories` table with `label_en` (+ listing `category` stores the
  English LABEL, not a slug — vault/Gotchas). `functional_group` column on
  listings = the department axis `/marketplace?department=` filters on.
- Listings carry semi-structured fields already: `specs` (jsonb),
  `industries`, `use_cases`, `best_for`, `availability`, `lead_time`,
  `pricing` — but they are free-form per vendor, NOT schema'd per category.
- `/marketplace` sidebar already does a primitive version of the right
  thing: filter options with no data are hidden ("Filters reflect what
  vendors actually listed"). What's missing vs this blueprint: per-category
  attribute schemas, required attributes at publish, facet counts, and
  count-accurate narrowing.
- Publish gate exists (pending vendors 403) — the natural enforcement point
  for "required attributes before a listing goes live" (and note risk-list
  item #5 already proposes industries-required at publish; this blueprint
  is the general version of that).

Suggested phasing when scheduled (engineering to refine):
1. **P1 — Attribute schemas:** `category_attributes` table (leaf category →
   ordered attribute defs, required flag, type, allowed values). Seed the 6
   live categories' schemas by hand. Vendor listing form renders the
   category's fields; publish gate enforces required ones. Existing
   listings grandfathered but nudged (profile-nudge cron pattern).
2. **P2 — Facets on Postgres first:** no new infra — GIN index on the
   attributes jsonb + aggregate counts in the listings API; sidebar becomes
   dynamic per category with true counts, zero-result options hidden
   (already the site's convention). Elasticsearch/Algolia ONLY if scale
   demands later (23 listings today — Postgres is plenty for a long time).
3. **P3 — Search polish:** autocomplete over names/brands/categories with
   department boost; category inference from query.

Constraints that carry over: bilingual labels for every attribute (EN/ES),
`.or()` injection rule (no raw user input in query strings — facet params
must be validated against the schema table), no fee/dispatch changes.

---

## Cesar's blueprint (verbatim)

### 1. The Core of Amazon's Discovery: Structured Data, Not Magic
Amazon doesn't rely on AI to guess what a "forklift camera" is. They rely on
a rigid, pre-defined product taxonomy combined with structured attributes
that sellers must fill in. Every product belongs to a Browse Node
(category), and within that node, there's a fixed set of specifications
(color, size, material, resolution, etc.). This structured data is what
powers every filter you see on the left sidebar.

Key principle: If the data isn't structured, it can't be filtered. Amazon
forces sellers to map products to the correct category and fill in required
attributes — otherwise the listing won't go live.

### 2. Amazon's Product Database Architecture (Simplified)
- Product table – ASIN, title, brand, description, price, images.
- Browse Node (Category) table – a tree of departments and subcategories
  (e.g., Electronics > Security & Surveillance > IP Cameras). Each product
  is linked to at least one leaf node.
- Attribute / Specification table – the secret sauce. For each product,
  multiple rows like: (Product A, "Resolution", "1080p"), (Product A,
  "Connectivity", "PoE"), (Product A, "Indoor/Outdoor", "Indoor").
- Filter Index (search engine like Elasticsearch) – all this data is pushed
  into a search index that handles instant faceted counts. Selecting a
  filter returns matching products and updates filter options with counts
  (e.g., "4K (12)").

Why this matters for NXT LINK: enforce a structured attribute system per
category. A product can't be listed without choosing the right category and
filling in the required specs. This is the only way to make filters that
actually work.

### 3. How Amazon's Search & Filtering Works End-to-End
A. **Autocomplete**: as you type, a backend service looks up popular
searches, brand names, department names; sorted by popularity/relevance.
On submit, full-text search across titles, descriptions, brand, backend
keywords, with a department boost.

B. **Results page & faceted filters**: left sidebar filters are dynamically
generated from the current result set, each with an accurate facet count;
selecting one refines the query and recomputes counts. Amazon never shows a
filter option with zero results.

C. **Category browsing**: the "All" menu walks the browse-node tree; each
category page offers the same faceted filters limited to that category's
attributes (Forklifts → Load Capacity, Power Source, New/Used).

### 4. Dynamic Filter Schema
For every leaf category, category managers maintain a set of refinement
attributes (not invented by sellers). Sellers see a form with mandatory and
optional fields for that category. Searching without a category infers a
dominant category or shows a union of relevant attributes, nudging the user
to pick a department.

### 5. Translating to NXT LINK
A. **Database model**: Categories tree · Attribute Definitions per leaf
category (with required flags) · Product Attributes as key-value/JSON ·
Search index (Elasticsearch/Algolia, or Postgres full-text + GIN at small
scale) supporting facets.

B. **Front-end filters**: sidebar queries aggregations for the current
result set; filter list changes with the selected category; without a
category, show universal filters (Industry, Product/Service, Location,
Verified), then unlock category-specific specs once chosen.
