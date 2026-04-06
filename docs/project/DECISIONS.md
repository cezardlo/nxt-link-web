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

## 2026-03-22 — Signal pipeline wired to frontend

**Decision**: TODAY, Industry, and WORLD pages now consume real signals from /api/intel-signals.

**Pipeline**: nxt-brain scan → Supabase intel_signals → /api/intel-signals → Brain.morning()/Brain.map()/direct fetch → UI

**TODAY**: Fetches top 5 signals on mount, shows "LIVE INTELLIGENCE" ticker. Graceful degradation if empty.
**Industry**: LiveSignals falls back to /api/intel-signals filtered by category when industry API returns <3 signals.
**WORLD**: Already wired via Brain.map() → /api/intel-signals. STUB_SIGNALS only activates on zero results.

## 2026-03-22 — Unified DECIDE + Industry flow

**Decision**: Home page bridges to Industry deep-dive pages. Results link back via "GO DEEPER" section.

**How**: Home shows "Explore Intelligence" row with 8 strategic industry pills → /industry/[slug]. DECIDE results include "GO DEEPER" link to the matching industry command center. Home accepts ?industry= query param for deep-linking.

**Mapping**: restaurant/construction/cleaning → manufacturing, logistics/warehouse → logistics, border_tech → border-tech.

**Why**: Users need one coherent loop: pick industry → describe problem → get recommendation → explore deeper intelligence → come back with more context.

## 2026-03-22 — Sweep Radar

**Decision**: Built a company discovery grid at /sweep — 10 logistics categories × 4 global regions (40 cells).

**How**: Each cell triggers POST /api/sweep which searches Google News RSS per country, extracts company names via regex, detects signals (funding, acquisition, launch, expansion), and returns structured hits. Results persist in sessionStorage. No API keys required.

**Categories**: TMS, WMS, Last-Mile, Fleet, Freight Brokerage, Cold Chain, Customs/Trade, Yard Mgmt, Visibility, Returns/Reverse

**Regions**: Americas (6 countries), EMEA (7), APAC (6), Emerging (4) = 23 countries total

**Future**: Persist to Supabase kg_companies table, add LLM enrichment via runParallelJsonEnsemble, connect to existing vendor-discovery and intel-discovery agents for deeper scans.
