# NXT//LINK Architecture Decisions

## 2026-03-22 — Route pruning

**Decision**: Deleted 14 orphaned routes that had no navigation links.

**Deleted**: /auth, /command, /dashboard, /enter, /innovation, /marketplace, /notes, /ops, /problems, /product, /radar, /simulate, /timeline, /universe

**Why**: 50+ routes bloated the build and confused the codebase. Most were experiments that got superseded. Keeping only routes that are navigable.

**Canonical routes**:
- Auth → `/login` (not /auth)
- Dashboard → `/command-center` (not /command, /dashboard)
- Store → `/store` (not /marketplace)
- Problem solving → `/solve` and `/industry/[slug]/solve` (not /problems)
- Product detail → `/products/[id]` (not /product/[id])
- Timeline → `/trajectory` (not /timeline)
- Status → `/status` + `/platform/status` (not /ops)

## 2026-03-22 — Design system v2

**Decision**: Adopted dark gray (not true black) design system with 3 moods.

**Moods**: Calm intelligence (Today, Search), Living world model (World, Trajectory), Premium catalog (Marketplace/Store)

**Tokens**: `src/lib/tokens.ts` — single source of truth for colors, spacing, radii.

**Rules**: One electric accent + one warning + one neutral glow. 20-24px card radius. Large headlines, medium explanation, very small metadata. No donut charts, no dashboard clutter.

## 2026-03-22 — DECIDE as home page

**Decision**: Home page is now a problem solver ("What problem are you solving?"), not a feed.

**Why**: Feed-style home pages require live data to not feel empty. DECIDE is useful from day one — user picks industry, describes problem, gets vendor recommendations from Supabase.

**Limitation**: Only knows 6 SMB industries (restaurant, construction, warehouse, logistics, border_tech, window_cleaning). Strategic industries (ai-ml, defense, etc.) are on /industry/[slug] but not connected to DECIDE yet.

## 2026-03-19 — Industry command center

**Decision**: Each industry gets a 10-section deep-dive page at `/industry/[slug]`.

**Sections**: Overview → Matrix → Countries → Moves → Solver → Metrics → Tech → Events → Signals → Players

**Data**: Mix of static (technology catalog, country-tech map, conferences) and API (signals, vendors, profile from Supabase). SessionStorage caching with 5-min TTL.

**8 industries**: ai-ml, cybersecurity, defense, border-tech, manufacturing, energy, healthcare, logistics
