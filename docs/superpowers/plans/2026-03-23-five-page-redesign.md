# NXT//LINK 5-Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse 30+ pages into 5 essential decision-focused pages: /world, /industry, /solve, /store, /command — with a clean 5-tab navigation.

**Architecture:** Replace the current 13-item NavRail with a 5-item navigation (+ logo home). Each page answers ONE decision question. Old routes get Next.js redirects to their new homes. Components are reused, not rewritten — we reassemble existing building blocks into the new structure.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS, MapLibre GL, deck.gl, SWR, Supabase

---

## Current State → Target State

### Route Mapping

| OLD ROUTE | ACTION | NEW HOME |
|---|---|---|
| `/` (home/industry picker) | **MERGE** into /solve | `/solve` |
| `/map` | **MERGE** with /world | `/world` (map is primary view) |
| `/world` | **KEEP** as primary | `/world` |
| `/intel` | **MERGE** into /command | `/command` |
| `/command-center` | **RENAME** | `/command` |
| `/sweep` | **DELETE** (niche, confusing) | redirect → `/world` |
| `/trajectory` | **MERGE** graph into /industry | redirect → `/industry/ai-ml` |
| `/explore` | **DELETE** (redundant with /command) | redirect → `/command` |
| `/search` | **MERGE** into /solve | redirect → `/solve` |
| `/industry/[slug]` | **KEEP** (sharpen) | `/industry/[slug]` |
| `/industry/[slug]/solve` | **MERGE** into /solve | redirect → `/solve?industry=[slug]` |
| `/products` | **MERGE** into /store | `/store` |
| `/products/[id]` | **KEEP** under /store | `/store/product/[id]` |
| `/products/compare` | **KEEP** under /store | `/store/compare` |
| `/vendors` | **MERGE** into /store | `/store?tab=vendors` |
| `/vendor/[id]` | **KEEP** under /store | `/store/vendor/[id]` |
| `/technologies` | **MERGE** into /store | `/store?tab=technologies` |
| `/opportunities` | **MERGE** into /command | `/command?tab=opportunities` |
| `/iker` | **MERGE** into /command | `/command?tab=leaderboard` |
| `/rfp` | **MERGE** into /store | `/store?tab=contracts` |
| `/following` | **MERGE** into /command | `/command` (watchlist section) |
| `/conferences` | **MERGE** into /world | `/world` (layer) |
| `/dossier` | **MERGE** into /industry | redirect → `/industry` |
| `/dossier/[slug]` | **REDIRECT** | redirect → `/industry/[slug]` |
| `/entity/[id]` | **KEEP** | stays as detail page |
| `/conference/[id]` | **KEEP** | stays as detail page |
| `/technology/[id]` | **REDIRECT** | redirect → `/store/technology/[id]` |
| `/report/[slug]` | **KEEP** | stays as detail page |
| `/industry/[slug]/solve` | **REDIRECT** | redirect → `/solve?industry=[slug]` |
| `/platform/status` | **KEEP** but hide from main nav | stays, accessible via /command |
| `/login` | **KEEP** | stays |

### Navigation: 13 items → 5 items

```
OLD (NavRail — 13 items + status):        NEW (5 items):
MAP                                        WORLD    ◎  — Global intelligence map
EXPLORE                                    INDUSTRY ◇  — Deep sector intelligence
INTEL                                      SOLVE    ◆  — Problem → solution engine
WORLD                                      STORE    ◫  — Technology marketplace
TRENDS                                     COMMAND  ⬡  — Executive dashboard
VENDORS
PRODUCTS
─── divider ───
SWEEP
OPPS
IKER
RFP
DASHBOARD
STATUS
```

---

## Page Architecture

### PAGE 1: `/world` — Global Intelligence Map
**Decision it answers:** "What's happening in the world right now that affects me?"

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ [TopBar: NXT//LINK | ⌘K Search | Time Range]   │
├────────┬────────────────────────────┬───────────┤
│ Layers │    FULL MAP CANVAS         │  Intel    │
│ Panel  │    (MapLibre + deck.gl)    │  Panel    │
│        │                            │           │
│ ☑ Live │    Countries + Vendors     │  Briefing │
│ ☑ Risk │    + Signals + Flights     │  Signals  │
│ ☑ Trade│    + Conferences           │  Vendors  │
│        │                            │  Ops      │
├────────┴────────────────────────────┴───────────┤
│ [FeedBar: Live scrolling signal ticker]         │
└─────────────────────────────────────────────────┘
```

**Merges:** Current `/map` + `/world` + `/conferences`
**Components reused:** MapCanvas, MapTopBar, MapLayerPanel, MapFilterPanel, RightPanel (all tabs), FeedBar, CmdK, BorderCameraOverlay, CrimeNewsOverlay
**New:** World scoreboard view (from current /world page) becomes a tab/overlay on the map
**What's removed:** Separate /world page (folded into map as view toggle)

---

### PAGE 2: `/industry/[slug]` — Deep Industry Intelligence
**Decision it answers:** "What's really happening in [industry] and what should I do about it?"

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ [TopBar: ← Back | Industry Name | Search]       │
├─────────────────────────────────────────────────┤
│ HERO: Industry name, icon, one-line insight     │
│ KEY METRICS: Market size, growth, trend          │
├─────────────────────────────────────────────────┤
│ [Section Nav: Overview | Players | Trends |      │
│  Signals | Solve ]                               │
├─────────────────────────────────────────────────┤
│                                                  │
│  SECTION CONTENT (scrollable)                    │
│  - Overview: TrajectoryMatrix + RecommendedMoves │
│  - Players: KeyPlayers + VendorCards             │
│  - Trends: TechCatalog + Countries + Conferences │
│  - Signals: LiveSignals feed                     │
│  - Solve: Embedded ProblemSolver (links to       │
│           /solve?industry=slug)                  │
│                                                  │
├─────────────────────────────────────────────────┤
│ [BottomNav]                                      │
└─────────────────────────────────────────────────┘
```

**Merges:** Current `/industry/[slug]` + `/trajectory` graph (becomes inline) + `/dossier/[slug]`
**Components reused:** HeroSection, TrajectoryMatrix, RecommendedMoves, KeyMetrics, TechnologyCatalog, CountriesSection, ConferencesSection, LiveSignals, KeyPlayers, ProblemSolver, SectionNav
**What's removed:** Separate trajectory page, separate dossier page

---

### PAGE 3: `/solve` — Problem → Solution Engine (MOST IMPORTANT)
**Decision it answers:** "I have this problem. What technology/vendor/product solves it?"

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ [TopBar: NXT//LINK SOLVE | Global Search]        │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────────────────────────────────┐        │
│  │  What problem are you trying        │        │
│  │  to solve?                          │        │
│  │                                     │        │
│  │  [Industry chips: optional filter]  │        │
│  │                                     │        │
│  │  [ Big search input ____________ ]  │        │
│  │                                     │        │
│  │  [Suggestion chips below]           │        │
│  └─────────────────────────────────────┘        │
│                                                  │
│  ── OR if result is showing: ──                  │
│                                                  │
│  PROBLEM STATEMENT (reformulated)                │
│  ┌──────────────┐ ┌──────────────────┐          │
│  │ RECOMMENDED  │ │ MARKET INSIGHT   │          │
│  │ SOLUTION     │ │ Growth: HIGH     │          │
│  │ Product name │ │ Competition: MED │          │
│  │ Technology   │ │ Summary...       │          │
│  │ Price: $$    │ │                  │          │
│  │ [Visit] [Buy]│ │                  │          │
│  └──────────────┘ └──────────────────┘          │
│  ┌──────────────────────────────────────┐       │
│  │ OTHER OPTIONS (sortable table)       │       │
│  │ Product | Tech | Price | Action      │       │
│  └──────────────────────────────────────┘       │
│  ┌──────────────┐ ┌──────────────────┐          │
│  │ BEST REGIONS │ │ VENDORS          │          │
│  │ 1. Texas     │ │ Company A  [85]  │          │
│  │ 2. California│ │ Company B  [72]  │          │
│  └──────────────┘ └──────────────────┘          │
│  ┌──────────────────────────────────────┐       │
│  │ NEXT STEP: Clear actionable advice   │       │
│  │ [Talk to a Broker] [Explore Industry]│       │
│  └──────────────────────────────────────┘       │
│                                                  │
├─────────────────────────────────────────────────┤
│ [BottomNav]                                      │
└─────────────────────────────────────────────────┘
```

**Merges:** Current `/` (home) + `/search` + `/industry/[slug]/solve`
**Components reused:** Section, Badge (from current page.tsx), ProblemSolver
**Key improvement:** This becomes the LANDING PAGE. User arrives → asks question → gets answer → takes action. The industry picker becomes optional filter chips, not a gate.
**What's removed:** Multi-step wizard (pick industry first, then ask). Now it's ONE input.

---

### PAGE 4: `/store` — Technology Marketplace
**Decision it answers:** "What products/vendors/technologies are available for my needs?"

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ [TopBar: NXT//LINK STORE | Search | Filters]     │
├─────────────────────────────────────────────────┤
│ [Tab Bar: Products | Vendors | Technologies |    │
│  Contracts ]                                     │
├─────────────────────────────────────────────────┤
│ [Filter Bar: Category ▾ | Sort ▾ | Price ▾]     │
├─────────────────────────────────────────────────┤
│                                                  │
│  CARD GRID (responsive: 1-3 columns)            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Product  │ │ Product  │ │ Product  │        │
│  │ Card     │ │ Card     │ │ Card     │        │
│  │ Score 85 │ │ Score 72 │ │ Score 68 │        │
│  │ ▲ rising │ │ → stable │ │ ▲ rising │        │
│  │ $$$      │ │ $$       │ │ $        │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│  ... more cards ...                              │
│                                                  │
├─────────────────────────────────────────────────┤
│ [BottomNav]                                      │
└─────────────────────────────────────────────────┘
```

**Merges:** `/products` + `/vendors` + `/technologies` + `/rfp` (as "Contracts" tab)
**Components reused:** ProductCard, ProductCatalog, CompanyCard, CompanyTooltip
**Key improvement:** Single marketplace with tabs instead of 4 separate pages
**Subroutes kept:** `/store/product/[id]`, `/store/vendor/[id]`, `/store/compare`

---

### PAGE 5: `/command` — Executive Dashboard
**Decision it answers:** "What needs my attention right now?"

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ [TopBar: NXT//LINK COMMAND | Live ● | Mode ▾]   │
├─────────────────────────────────────────────────┤
│                                                  │
│  DAILY BRIEFING (collapsible card)              │
│  "3 critical signals, 2 opportunities..."       │
│                                                  │
│  ┌─────────────┐ ┌─────────────┐               │
│  │ TOP SIGNALS │ │ SECTOR      │               │
│  │ P0: 2       │ │ MOMENTUM    │               │
│  │ P1: 5       │ │ ▲ AI        │               │
│  │ P2: 12      │ │ ▲ Defense   │               │
│  │             │ │ → Energy    │               │
│  │ [See all]   │ │ ▼ Logistics │               │
│  └─────────────┘ └─────────────┘               │
│                                                  │
│  ┌──────────────────────────────────────┐       │
│  │ LIVE SIGNAL FEED (filterable)        │       │
│  │ [ALL] [CONTRACTS] [FUNDING] [RISK]   │       │
│  │                                      │       │
│  │ ● P0 CRITICAL: Army IDIQ award...   │       │
│  │ ● P1 HIGH: AI startup raises $42M   │       │
│  │ ● P2 NORMAL: Patent filing...       │       │
│  └──────────────────────────────────────┘       │
│                                                  │
│  OPPORTUNITIES (top 5, link to full list)       │
│  WATCHLIST (followed items with changes)        │
│                                                  │
├─────────────────────────────────────────────────┤
│ [BottomNav]                                      │
└─────────────────────────────────────────────────┘
```

**Merges:** `/command-center` + `/intel` + `/explore` + `/opportunities` + `/iker` + `/following`
**Components reused:** MorningBrief, SignalFeed, SignalCard, TrendPanel, WatchList, AlertToast, IntelBadge, IKERPanel, SectorMomentumBoard
**Key improvement:** One dashboard instead of 6 scattered pages

---

## What Gets DELETED (files to remove)

### Pages to delete entirely:
- `src/app/sweep/` — entire directory (niche, confusing)
- `src/app/trajectory/` — entire directory (graph merges into /industry)
- `src/app/explore/` — entire directory (redundant with /command)
- `src/app/search/` — entire directory (merges into /solve)
- `src/app/intel/` — entire directory (duplicate of /command-center)
- `src/app/dossier/` — entire directory (merges into /industry)
- `src/app/following/` — entire directory (merges into /command watchlist)
- `src/app/conferences/` — entire directory (merges into /world layer)
- `src/app/iker/` — entire directory (merges into /command leaderboard)
- `src/app/rfp/` — entire directory (merges into /store contracts tab)
- `src/app/opportunities/` — entire directory (merges into /command)
- `src/app/technologies/` — entire directory (merges into /store)

### Pages to move/rename:
- `src/app/map/` → content absorbed into `/world`
- `src/app/products/` → moves to `/store`
- `src/app/vendors/` → moves to `/store` (tab)
- `src/app/command-center/` → renames to `/command`

### Components safe to delete (only used by deleted pages):
- `src/components/ExploreGraph.tsx` — only used by /explore
- `src/components/TechJourney.tsx` — only used by deleted pages

### Components to KEEP (used by surviving pages):
- `src/components/AgentControlRoom.tsx` — used by /platform/status (KEPT)
- `src/components/SwarmStatusPanel.tsx` — used by RightPanel OpsTab (KEPT in /world)
- `src/components/SystemDashboard.tsx` — used by /platform/status (KEPT)
- `src/components/TechRadar.tsx` — verify no functional dependency before deleting

---

## File Structure (New/Modified)

### New files to create:
```
src/app/solve/page.tsx                    — New /solve page (moves home logic here)
src/app/store/page.tsx                    — New /store page (merges products+vendors+tech)
src/app/store/product/[id]/page.tsx       — Product detail (move from /products/[id])
src/app/store/vendor/[id]/page.tsx        — Vendor detail (move from /vendor/[id])
src/app/store/compare/page.tsx            — Product comparison (move from /products/compare)
src/app/store/technology/[id]/page.tsx    — Technology detail (move from /technology/[id])
src/app/command/page.tsx                  — New /command page (rename command-center)
src/app/command/components/               — Move command-center components
src/app/command/hooks/                    — Move command-center hooks
src/app/command/types/                    — Move command-center types
src/lib/data/nav.ts                       — Shared navigation config (5 items)
```

### Files to modify:
```
src/components/NavRail.tsx                — 13 items → 5 items
src/components/MobileNav.tsx              — 5 items → new 5 items
src/components/AppShell.tsx               — Update hide logic (hide on /solve instead of /)
src/app/page.tsx                          — Becomes redirect to /solve
src/app/layout.tsx                        — No changes needed
src/app/world/page.tsx                    — Absorb /map functionality
src/app/industry/[slug]/page.tsx          — Minor: add "Solve" section tab
```

### Redirect files to create:
```
src/app/map/page.tsx                      — redirect → /world
src/app/sweep/page.tsx                    — redirect → /world
src/app/trajectory/page.tsx               — redirect → /industry/ai-ml
src/app/explore/page.tsx                  — redirect → /command
src/app/search/page.tsx                   — redirect → /solve
src/app/intel/page.tsx                    — redirect → /command
src/app/dossier/page.tsx                  — redirect → /industry
src/app/dossier/[slug]/page.tsx           — redirect → /industry/[slug]
src/app/following/page.tsx                — redirect → /command
src/app/conferences/page.tsx              — redirect → /world
src/app/technology/[id]/page.tsx          — redirect → /store/technology/[id]
src/app/industry/[slug]/solve/page.tsx    — redirect → /solve?industry=[slug]
src/app/iker/page.tsx                     — redirect → /command
src/app/rfp/page.tsx                      — redirect → /store
src/app/opportunities/page.tsx            — redirect → /command
src/app/technologies/page.tsx             — redirect → /store
src/app/vendors/page.tsx                  — redirect → /store
src/app/products/page.tsx                 — redirect → /store
src/app/products/[id]/page.tsx            — redirect → /store/product/[id]
src/app/products/compare/page.tsx         — redirect → /store/compare
src/app/vendor/[id]/page.tsx              — redirect → /store/vendor/[id]
src/app/command-center/page.tsx           — redirect → /command
```

---

## Tasks

> **Execution note:** Tasks 1-4 set up navigation infrastructure. Tasks 5-10 create the actual pages. During tasks 2-4, nav links will point to pages that don't exist yet — this is expected. All pages are created by Task 10. Task 11 (redirects) and Task 12 (cleanup) finalize the migration.

### Task 1: Create shared navigation config + industry landing page

**Files:**
- Create: `src/lib/data/nav.ts`

- [ ] **Step 1: Create navigation data file**

```typescript
// src/lib/data/nav.ts
export type NavItem = {
  href: string;
  label: string;
  icon: string;
  color: string;
  description: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/world',    label: 'WORLD',    icon: '◎', color: '#00d4ff', description: 'Global intelligence map' },
  { href: '/industry', label: 'INDUSTRY', icon: '◇', color: '#ffd700', description: 'Deep sector intelligence' },
  { href: '/solve',    label: 'SOLVE',    icon: '◆', color: '#ff6600', description: 'Problem → solution engine' },
  { href: '/store',    label: 'STORE',    icon: '◫', color: '#00ff88', description: 'Technology marketplace' },
  { href: '/command',  label: 'COMMAND',  icon: '⬡', color: '#a855f7', description: 'Executive dashboard' },
];

/** Industry selector for /solve and /industry landing */
export const INDUSTRIES = [
  { id: 'defense',        label: 'Defense',        icon: '◆', color: '#ff6600' },
  { id: 'ai-ml',          label: 'AI / ML',        icon: '◇', color: '#00d4ff' },
  { id: 'cybersecurity',  label: 'Cybersecurity',  icon: '◈', color: '#00d4ff' },
  { id: 'manufacturing',  label: 'Manufacturing',  icon: '▣', color: '#00ff88' },
  { id: 'logistics',      label: 'Logistics',      icon: '⬡', color: '#ffd700' },
  { id: 'energy',         label: 'Energy',         icon: '◉', color: '#ffd700' },
  { id: 'healthcare',     label: 'Healthcare',     icon: '◎', color: '#00ff88' },
  { id: 'border-tech',    label: 'Border Tech',    icon: '⊕', color: '#ff6600' },
] as const;
```

- [ ] **Step 2: Create /industry landing page**

Create `src/app/industry/page.tsx` — an industry selector grid using INDUSTRIES from nav.ts. Each card links to `/industry/[slug]`. This prevents 404 when nav links to `/industry` before Task 10.

- [ ] **Step 3: Verify files created**

Run: `ls src/lib/data/nav.ts src/app/industry/page.tsx`
Expected: Both files exist

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/nav.ts src/app/industry/page.tsx
git commit -m "feat: add shared navigation config + industry landing page"
```

---

### Task 2: Rewrite NavRail to 5 items

**Files:**
- Modify: `src/components/NavRail.tsx`
- Read: `src/lib/data/nav.ts`

- [ ] **Step 1: Rewrite NavRail**

Replace the 13-item NAV_ITEMS with import from `@/lib/data/nav`. Remove the divider at index 7. Keep: logo, keyboard shortcuts (Ctrl+1..5), active indicator, hover states, bottom SYS status link. Remove: the "overflow" feeling of 13 icons.

Key changes:
- Import `NAV_ITEMS` from `@/lib/data/nav`
- `SHORTCUT_COUNT = 5`
- Remove divider logic (`i === 7`)
- Keep everything else (active state, glow, aria attributes)

- [ ] **Step 2: Verify NavRail renders 5 items**

Run: `grep -c "href:" src/components/NavRail.tsx`
Expected: Should show far fewer hardcoded hrefs (they come from nav.ts now)

- [ ] **Step 3: Commit**

```bash
git add src/components/NavRail.tsx
git commit -m "refactor: NavRail from 13 items to 5 core pages"
```

---

### Task 3: Rewrite MobileNav to 5 items

**Files:**
- Modify: `src/components/MobileNav.tsx`

- [ ] **Step 1: Rewrite MobileNav**

Replace `MOBILE_TABS` with import from `@/lib/data/nav`. All 5 items now show on mobile (previously only showed 5 of 13).

- [ ] **Step 2: Commit**

```bash
git add src/components/MobileNav.tsx
git commit -m "refactor: MobileNav to match new 5-page navigation"
```

---

### Task 4: Update AppShell hide logic

**Files:**
- Modify: `src/components/AppShell.tsx`

- [ ] **Step 1: Update AppShell**

Change: Nav is hidden on `/world` (full-screen map page) and `/login`. Show nav everywhere else including `/solve` (which replaces `/` as landing).

```typescript
const isFullscreen = pathname === '/world' || pathname.startsWith('/world');
const isAuth = pathname === '/login';
const showNav = !isFullscreen && !isAuth;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AppShell.tsx
git commit -m "refactor: AppShell nav visibility for new 5-page structure"
```

---

### Task 5: Create `/solve` page (THE MOST IMPORTANT PAGE)

**Files:**
- Create: `src/app/solve/page.tsx`
- Read: `src/app/page.tsx` (current home — this is the source material)

- [ ] **Step 1: Create /solve page**

Move the entire current `src/app/page.tsx` logic to `src/app/solve/page.tsx` with these improvements:

1. **Remove the industry gate.** User lands directly on the search input. Industry is an optional filter (chip row above input), not a required first step.
2. **Bigger, bolder input.** The search box is the hero element — centered, large, with a glow effect.
3. **Smarter suggestions.** Show suggestions from ALL industries by default, filtered when an industry chip is selected.
4. **Better results layout.** Two-column grid for recommended solution + market insight. Card-based other options. Clearer vendor scores.
5. **Flow links.** "Explore this industry →" links to `/industry/[slug]`. "Find vendors →" links to `/store`. "See global signals →" links to `/world`.

The page structure:
- Input state (no result yet): Big centered input + industry chips + suggestions + live signals
- Result state: Problem header → Recommended Solution card → Market Insight card → Other Options → Regions → Vendors → Next Steps → CTAs

- [ ] **Step 2: Test page loads**

Run: open `http://localhost:3000/solve` in browser
Expected: Solve page renders with search input

- [ ] **Step 3: Commit**

```bash
git add src/app/solve/
git commit -m "feat: create /solve page — problem-to-solution engine"
```

---

### Task 6: Redirect `/` to `/solve`

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace home page with redirect**

```typescript
import { redirect } from 'next/navigation';
export default function Home() {
  redirect('/solve');
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "refactor: redirect / to /solve (new landing page)"
```

---

### Task 7: Create `/store` page (merged marketplace)

**Files:**
- Create: `src/app/store/page.tsx`
- Read: `src/app/products/page.tsx`, `src/app/vendors/page.tsx`, `src/app/technologies/page.tsx`

- [ ] **Step 1: Create /store page**

Build a tabbed marketplace page with 4 tabs:
- **Products** — From current `/products` page (ProductCard grid, category filter, sort)
- **Vendors** — From current `/vendors` page (CompanyCard grid, Supabase fetch)
- **Technologies** — From current `/technologies` page (tech catalog with maturity filter)
- **Contracts** — From current `/rfp` page (federal contracts search)

Use `useSearchParams()` to read `?tab=vendors` etc. Default tab is "Products".

Shared filter bar across all tabs: Category dropdown, Sort dropdown, Search input.

- [ ] **Step 2: Create store subroutes**

Move `/products/[id]` → `/store/product/[id]`
Move `/products/compare` → `/store/compare`
Move `/vendor/[id]` → `/store/vendor/[id]`

- [ ] **Step 3: Test all tabs render**

Run: open `/store`, `/store?tab=vendors`, `/store?tab=technologies`, `/store?tab=contracts`
Expected: Each tab shows relevant content

- [ ] **Step 4: Commit**

```bash
git add src/app/store/
git commit -m "feat: create /store page — merged technology marketplace"
```

---

### Task 8: Create `/command` page (executive dashboard)

**Files:**
- Create: `src/app/command/page.tsx`
- Create: `src/app/command/components/` (move from command-center)
- Create: `src/app/command/hooks/` (move from command-center)
- Create: `src/app/command/types/` (move from command-center)

- [ ] **Step 1: Move command-center to command**

Copy `src/app/command-center/` contents to `src/app/command/`. Update all internal imports.

- [ ] **Step 2: Enhance the dashboard**

Add these sections from merged pages:
- **Opportunities section** — Top 5 opportunity clusters (from /opportunities page)
- **Watchlist section** — Followed items with change status (from /following page)
- **Leaderboard section** — IKER scores ranking (from /iker page, collapsible)

Layout should follow the information hierarchy:
1. Daily Briefing (headline insight)
2. Top Signals + Sector Momentum (key metrics)
3. Live Signal Feed (supporting data)
4. Opportunities + Watchlist + Leaderboard (actionable next steps)

- [ ] **Step 3: Test dashboard renders**

Run: open `/command`
Expected: Full dashboard with briefing, signals, opportunities

- [ ] **Step 4: Commit**

```bash
git add src/app/command/
git commit -m "feat: create /command page — executive dashboard"
```

---

### Task 9: Upgrade `/world` page (absorb map)

**Files:**
- Modify: `src/app/world/page.tsx`
- Read: `src/app/map/page.tsx`

- [ ] **Step 1: Merge map into world**

The current `/world` page is a scoreboard view. The current `/map` page is the full map experience. Merge them:

1. `/world` becomes the full-screen map (from current `/map/page.tsx`)
2. Add a view toggle: MAP | SCOREBOARD
3. MAP view = current MapCanvas + layers + right panel + feed bar
4. SCOREBOARD view = current /world country scores + tech race data
5. Conference data becomes a map layer (already partially there)

Since `/world` will be full-screen (no NavRail), it gets its own back-to-nav button.

- [ ] **Step 2: Test both views**

Run: open `/world`, toggle to SCOREBOARD view
Expected: Map view with all layers, scoreboard with country data

- [ ] **Step 3: Commit**

```bash
git add src/app/world/
git commit -m "feat: merge /map into /world — unified global intelligence view"
```

---

### Task 10: Polish /industry landing page

**Files:**
- Modify: `src/app/industry/page.tsx` (created in Task 1 as basic grid)

- [ ] **Step 1: Enhance industry landing**

The basic grid was created in Task 1. Now enhance it: add signal counts per industry (fetch from `/api/intel-signals`), momentum indicators, and a "What's hot" highlight for the sector with the most activity. Add smooth card-hover animations.

- [ ] **Step 2: Commit**

```bash
git add src/app/industry/page.tsx
git commit -m "polish: enhance /industry landing with signal counts and momentum"
```

---

### Task 11: Create all redirect pages

**Files:**
- Create/modify: 20+ redirect files (see list in File Structure section)

- [ ] **Step 1: Create redirect utility**

Create each old route as a simple redirect:

```typescript
// Example: src/app/map/page.tsx
import { redirect } from 'next/navigation';
export default function MapRedirect() { redirect('/world'); }
```

Do this for ALL routes in the redirect list above. For dynamic routes like `/dossier/[slug]`, use:

```typescript
// src/app/dossier/[slug]/page.tsx
import { redirect } from 'next/navigation';
export default function DossierRedirect({ params }: { params: { slug: string } }) {
  redirect(`/industry/${params.slug}`);
}
```

For routes with IDs like `/products/[id]`:
```typescript
import { redirect } from 'next/navigation';
export default function ProductRedirect({ params }: { params: { id: string } }) {
  redirect(`/store/product/${params.id}`);
}
```

- [ ] **Step 2: Test redirects work**

Run: open `/map`, `/sweep`, `/intel`, `/explore`, `/search`
Expected: Each redirects to new location

- [ ] **Step 3: Commit**

```bash
git add src/app/map src/app/sweep src/app/intel src/app/explore src/app/search \
  src/app/dossier src/app/following src/app/conferences src/app/iker \
  src/app/rfp src/app/opportunities src/app/technologies src/app/vendors \
  src/app/products src/app/vendor src/app/command-center
git commit -m "refactor: add redirects from all old routes to new 5-page structure"
```

---

### Task 12: Clean up deleted page content

**Files:**
- Delete: Old page content that has been replaced by redirects

- [ ] **Step 1: Remove old page content**

For each redirected page, the old content (components, hooks, types specific to that page) can be deleted IF they are not imported by the new pages. Check imports before deleting.

Pages whose content is fully absorbed:
- `src/app/sweep/` — delete all components/hooks (SweepHit grid is not reused)
- `src/app/trajectory/` — delete (graph logic not reused, too complex)
- `src/app/explore/` — delete (card builder logic not reused)
- `src/app/following/` — delete (watchlist is in command-center hooks already)

Pages whose content moved:
- `src/app/command-center/` — content moved to `/command`, keep redirect only

- [ ] **Step 2: Run build to verify no broken imports**

Run: `npx next build`
Expected: Build passes with no errors

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: clean up old page content replaced by 5-page structure"
```

---

### Task 13: Final build verification and polish

**Files:**
- All modified files

- [ ] **Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: Run Next.js build**

Run: `npx next build`
Expected: Build passes, all pages compile

- [ ] **Step 3: Manual smoke test**

Open each page and verify:
- `/solve` — Input works, suggestions show, results render
- `/world` — Map loads, layers toggle, scoreboard view works
- `/industry/defense` — All sections render, section nav works
- `/store` — All 4 tabs render, filters work
- `/command` — Briefing loads, signals show, watchlist renders
- `/` — Redirects to `/solve`
- `/map` — Redirects to `/world`
- `/intel` — Redirects to `/command`

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: NXT//LINK v3 — 5-page redesign complete"
```

---

## Suggestions to Improve /solve Quality

### Current weaknesses:
1. **Industry gate blocks users** — Forcing industry selection before asking a question loses users
2. **Results are text-heavy** — Wall of text, not scannable
3. **No confidence indicator** — User doesn't know how reliable the answer is
4. **No comparison** — Can't compare multiple solutions side-by-side
5. **Weak vendor section** — Just names + scores, no actionable detail

### Improvements:
1. **Single input, no gate** — Industry becomes optional filter chips. User can just type "reduce shipping costs" without picking Logistics first. The AI detects the industry.
2. **Card-based results** — Each result section is a card with a clear title, key metric, and action button. Scannable in 5 seconds.
3. **Confidence badge** — Show "87% confidence" on the recommended solution. Uses IKER scoring for vendors.
4. **Compare mode** — "Compare top 3" button opens side-by-side view of recommended + alternatives.
5. **Rich vendor cards** — Show vendor logo, IKER score, recent signals, website link, "Contact" button.
6. **Streaming response** — Use SSE/streaming for the API response so results appear progressively (technology first, then vendors, then market insight).
7. **Save & share** — "Save this recommendation" (localStorage) + "Share as link" (URL params).
8. **Follow-up questions** — After initial result, show "People also asked:" with related problems.

---

## User Flow (Natural Path)

```
USER ARRIVES
    │
    ▼
/solve ─── "I have a problem" ──→ Gets recommendation
    │                                    │
    │                                    ├──→ "Explore this industry" ──→ /industry/[slug]
    │                                    ├──→ "Find vendors" ──→ /store
    │                                    └──→ "See global map" ──→ /world
    │
    ├── User browses industries ──→ /industry ──→ /industry/[slug]
    │                                                    │
    │                                                    └──→ "Solve a problem in this industry" ──→ /solve?industry=slug
    │
    ├── User wants to shop ──→ /store ──→ Product/Vendor detail
    │
    ├── User wants overview ──→ /world ──→ Click country/signal ──→ /industry/[slug]
    │
    └── User wants briefing ──→ /command ──→ Click signal ──→ /industry/[slug] or /store
```

Every page has clear exits to the other 4 pages. No dead ends. No confusion.
