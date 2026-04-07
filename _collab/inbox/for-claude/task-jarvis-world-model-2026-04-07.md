# Claude — Build the Jarvis World Model Layer
_Written by Perplexity Computer — April 7, 2026_

## Vision

NXT LINK needs to become a Jarvis-style intelligence system that:
1. Thinks in patterns and directions, not events
2. Shows the world as a connected node map (like OBSERVER_05)
3. Briefs like a strategist ("This indicates a shift toward...")
4. Covers conferences as tracked objects in the world model
5. Looks like World Monitor + Palantir Gotham + OBSERVER_05

Computer already upgraded the AI prompts. Your job is the intelligence layer.

---

## TASK 1 — Build /api/trajectory route

Build a new API route at `src/app/api/trajectory/route.ts`.

This is the "where is the world heading?" endpoint. It returns a trajectory map for each sector — used by the OBSERVER_05-style node visualization on the home page.

Return this structure:
```typescript
{
  generated_at: string
  sectors: Array<{
    id: string           // 'ai-ml' | 'defense' | 'logistics' | 'manufacturing' | 'border-tech' | 'energy' | 'space' | 'cybersecurity'
    label: string        // 'AI / ML'
    signal_count: number // from intel_signals last 7 days
    momentum: 'accelerating' | 'stable' | 'slowing' | 'emerging'
    momentum_pct: number // +23, -5, +41 etc
    headline: string     // "Autonomous systems crossing the lab-to-field threshold"
    direction: string    // "Convergence with defense and logistics creating new deployment windows"
    emerging_threat: string | null  // "China semiconductor gap closing faster than expected"
    el_paso_angle: string  // "Fort Bliss as primary test site creates local opportunity"
    top_companies: string[]  // ['Palantir', 'Shield AI', 'L3Harris']
    signal_velocity: number  // signals this week vs last week
  }>
  world_headline: string  // "The single most important thing happening in global tech this week"
  world_direction: string // "Where the world is heading in the next 30-90 days"
}
```

To generate this:
1. Query intel_signals from Supabase: `SELECT industry, count(*) as cnt, signal_type FROM intel_signals WHERE discovered_at > NOW() - INTERVAL '7 days' AND source NOT ILIKE '%arxiv%' GROUP BY industry, signal_type`
2. Calculate momentum by comparing this week vs last week signal counts per sector
3. Use the Gemini AI call (same pattern as /api/decide) to generate headline, direction, emerging_threat, el_paso_angle for each sector
4. Use `import { getSupabaseClient } from '@/lib/supabase/client'` with admin: true
5. Cache result for 1 hour

**Deliver:** `_collab/inbox/for-computer/api-trajectory-route.ts`

---

## TASK 2 — Build the "World Wire" component

Build `src/components/WorldWire.tsx` — a World Monitor-style live scrolling intelligence wire.

Design: Inspired by world-monitor.com's "THE WIRE" — a vertical timeline of signals with:
- Green timeline line on the left (like a terminal)
- Each entry: location tag + sector badge + signal type + headline + timestamp
- Monospace font for metadata, regular for headline
- Auto-scrolls, new entries appear at top with fade-in
- Color-coded severity: critical = red glow, high = amber, normal = teal

```tsx
interface WorldWireEntry {
  id: string
  title: string
  signal_type: string
  industry: string
  region: string | null
  discovered_at: string
  importance_score: number
  company: string | null
}

// Fetches from /api/intel/feed?page_size=20&tab=all
// Refreshes every 60 seconds
// Shows max 50 entries, older ones fade out
```

Visual spec:
```
│ [●] LIVE WIRE                              Updated 2m ago
│
├─ [BORDER TECH]  [CONTRACT]   12:34 UTC
│   El Paso County sues ICE over detention center records
│   ── 2h ago
│
├─ [DEFENSE]  [TECHNOLOGY]   11:58 UTC  
│   Metallium achieves Pentagon gallium contract
│   ── 3h ago ● HIGH
│
├─ [CYBERSECURITY]  [MARKET_SHIFT]   11:22 UTC
│   Cloudflare accelerates post-quantum deadline
│   ── 4h ago
```

Dark terminal aesthetic:
- Background: `bg-black border border-teal-500/20`
- Timeline line: `border-l-2 border-teal-500/40`
- Entry hover: `hover:bg-teal-500/5`
- Monospace labels: `font-mono text-xs`
- High importance: `border-l-2 border-amber-400` instead of teal
- Critical: `border-l-2 border-red-500 bg-red-500/5`

**Deliver:** `_collab/inbox/for-computer/component-world-wire.tsx`

---

## TASK 3 — Build the Sector Trajectory Node Map

Build `src/components/TrajectoryMap.tsx` — the OBSERVER_05-style visualization.

Reference image: The user showed an image of "HUMAN TRAJECTORY 2026" with a central glowing node connected by lines to 8 outer sector nodes (Quantum Basis, Agentic Charges, Solid-State Icons, etc.), all on a dark background with green/teal glow.

NXT LINK version: "BORDERPLEX TRAJECTORY" at center, 8 sector nodes around it.

Implementation using SVG (no external library needed):

```tsx
// Center node: "BORDERPLEX TRAJECTORY" or the world_headline text
// 8 outer nodes: one per sector, positioned in a circle
// Lines: animated dashed lines connecting center to each node
// Node glow: CSS box-shadow with sector color
// Click node: expands to show headline + direction + top_companies

interface TrajectoryMapProps {
  sectors: TrajectoryData['sectors']
  worldHeadline: string
  onSectorClick: (sectorId: string) => void
}
```

Node positioning (8 nodes in a circle, radius ~200px from center):
- AI/ML: top-right
- Defense: right
- Cybersecurity: bottom-right
- Logistics: bottom
- Manufacturing: bottom-left
- Border Tech: left
- Energy: top-left
- Space: top

Momentum indicators on each node:
- Accelerating: green pulse animation + ↑
- Stable: teal static + →
- Slowing: amber + ↓
- Emerging: purple pulse + ◉ NEW

Dark background, near-black (`#050a05`), nodes glow in teal/green.
Lines pulse/animate from center outward.
On hover, node shows: momentum badge + headline text.

This component is used on the home page as the main visual centerpiece.

**Deliver:** `_collab/inbox/for-computer/component-trajectory-map.tsx`

---

## TASK 4 — Conference Intelligence Upgrade

The conference system needs to understand conferences as intelligence objects, not just calendar entries.

Build `src/app/api/conferences/intelligence/route.ts` that:
1. Queries upcoming conferences from Supabase (next 60 days)
2. For each conference, finds related intel_signals (by industry match)
3. Returns: conference + related_signals + exhibitor_count + "why attend" (AI-generated)
4. The "why attend" should say: "At this conference, X companies will be showing technology that directly addresses [sector trend]. For Borderplex operators, this is an opportunity to [specific action]."

Also add a `conference_intelligence` field to each conference object:
```typescript
{
  why_this_matters: string  // "This is where the logistics automation shift gets announced to industry"
  signals_connected: number // how many related signals
  sector_momentum: string   // "High — 47 signals this week in manufacturing"
  el_paso_attendees: string[] // known companies from El Paso/Borderplex area
}
```

**Deliver:** `_collab/inbox/for-computer/api-conference-intelligence-route.ts`

---

## TASK 5 — The Jarvis Morning Brief Format

Rewrite the daily briefing output format to feel like Jarvis.

Current format: lists news items with impact analysis
Target format: strategic narrative brief

Build a new Gemini prompt in `src/app/api/intelligence/morning-brief/route.ts`:

```
THE BRIEF — [DATE]

THE WORLD THIS WEEK:
[2-3 sentences on the single most important pattern forming across ALL sectors]

WHAT'S ACCELERATING:
• [Sector]: [What's happening and why it's speeding up]
• [Sector]: [...]

WHAT'S EMERGING (nobody's talking about this yet):
• [Pattern that hasn't hit mainstream coverage]

FOR THE BORDERPLEX:
[2-3 sentences specific to El Paso / Fort Bliss / Juárez / UTEP]

TOP 3 MOVES THIS WEEK:
1. [Specific action with named company or institution]
2. [...]
3. [...]

WATCH FOR IN 7-14 DAYS:
• [Forward-looking signal to monitor]
• [...]
```

This is a new endpoint that replaces the current /api/briefing for the home page.

**Deliver:** `_collab/inbox/for-computer/api-morning-brief-route.ts`

---

## Context

- Stack: Next.js 14, TypeScript, Tailwind CSS, Supabase, Gemini AI
- Use `import { getSupabaseClient } from '@/lib/supabase/client'` (admin: true for all queries)
- Use `import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router'` for all AI calls
- Dark theme: bg-black/near-black, teal accents (#4F98A3 or brighter #00ff88 for terminal style)
- The platform aesthetic is shifting toward World Monitor + Palantir Gotham + OBSERVER_05
- Monospace font for data/metadata, sans-serif for narrative text

Drop all files in `_collab/inbox/for-computer/` with exact filenames above.
