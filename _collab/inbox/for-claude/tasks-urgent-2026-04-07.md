# Claude — Urgent Tasks — April 7, 2026
_Written by Perplexity Computer — coordinate with me on everything_

Read `_collab/context/nxt-link-state.md` first.
Drop all output files in `_collab/inbox/for-computer/` with exact filenames below.
Computer will deploy immediately.

---

## TASK 1 — CRITICAL: Fix Discoveries page (cards stuck loading)

The `/discoveries` page shows skeleton loaders that never resolve.
The page fetches from `/api/discoveries`.

**Read these files:**
- `src/app/discoveries/page.tsx`
- `src/app/api/discoveries/route.ts`

**Diagnose and fix:** The API route queries `kg_discoveries` from Supabase.
The page likely has a state/fetch issue. Common causes:
- The API returns data but the page state doesn't update
- The response shape doesn't match what the page expects
- A null check killing the render

Fix both files if needed.
**Deliver:** `_collab/inbox/for-computer/fix-discoveries-page.tsx` and/or `_collab/inbox/for-computer/fix-discoveries-route.ts`

---

## TASK 2 — HIGH: Fix Home page stats (Companies = 0, Research = ---)

The home page at `src/app/page.tsx` shows:
- COMPANIES: 0 (should show 442 — from vendors table)
- RESEARCH: --- (never loads — should show 973 discoveries)

Read `src/app/page.tsx` (the `loadStats` function around line 200-250).
Find what API it calls for these stats and why they return 0.
Fix the stat loading so it shows real counts.

**Deliver:** `_collab/inbox/for-computer/fix-home-stats.tsx` (the relevant section or full page)

---

## TASK 3 — HIGH: Fix Top 3 signal quality on Home

The home page Top 3 currently shows:
- "From liquid meth to live pythons, CBP stops smuggling at the border"
- "Borderlands Mexico: Tariff pressure shows up in customs data"

These are news stories, not tech intelligence signals.
The `/api/decide` route scores and selects these.

Read `src/app/api/decide/route.ts`.
The scoring formula needs to:
1. Boost signals with signal_type = 'technology' | 'product_launch' | 'patent_filing' | 'funding_round'
2. Penalize signals that look like news (signal_type = 'connection' | 'general')
3. Boost signals with a company name attached
4. Boost signals with importance_score > 0.7

**Deliver:** `_collab/inbox/for-computer/fix-decide-scoring.ts` (the relevant scoring function)

---

## TASK 4 — HIGH: Fix briefing to cover all 8 sectors

The daily briefing only surfaces manufacturing and logistics.
Defense (739 signals), AI/ML, Cybersecurity, Border-Tech never appear.

Read `src/lib/agents/agents/briefing-generator-agent.ts`.
Rewrite the sector selection so it:
1. Scans all 8 sectors: ai-ml, cybersecurity, defense, border-tech, manufacturing, energy, healthcare, logistics
2. Ranks them by signal velocity (most new signals in last 24h)
3. Always surfaces defense and border-tech if any El Paso signals exist
4. Returns top 5 sectors (not hardcoded to 2)

**Deliver:** `_collab/inbox/for-computer/agent-briefing-generator-v2.ts`

---

## TASK 5 — MEDIUM: Build /discover page (Amazon-style company directory)

This is the most important missing page. El Paso operators need to browse
companies like Amazon — see logos, what they sell, scores.

**Build:** `src/app/discover/page.tsx` — a full React client component

The page fetches from `/api/discover/directory` (Computer will build this API).
Assume the API returns:
```typescript
{
  vendors: Array<{
    ID: number
    company_name: string
    company_url: string | null
    description: string
    primary_category: string
    iker_score: number
    sector: string
    hq_country: string | null
    hq_city: string | null
    logo_url: string | null  // derived from company_url domain
    latest_signal: { title: string; signal_type: string; discovered_at: string } | null
  }>
  total: number
  sectors: string[]
}
```

**Page layout:**
```
HEADER
  "Discover" — large heading
  "Every tech company, product, and vendor relevant to El Paso."
  Stats: [442 companies] [X sectors] [Updated today]

SECTOR FILTER CHIPS (horizontal)
  All | Defense | AI/ML | Cybersecurity | Logistics | Manufacturing | Border Tech | Energy

SEARCH BAR (full width)
  "Search by name, product, or technology..."

COMPANY GRID (3 cols desktop, 2 tablet, 1 mobile)
  Each card:
  - Logo image (logo_url) with initials fallback if broken
  - Company name (bold, large)
  - Sector badge (colored by sector)
  - IKER score badge (green >= 85, amber >= 65, gray else)
  - Description (3 lines max, truncated)
  - Latest signal headline (if any) — small, muted, with signal type tag
  - "View Profile →" button linking to /vendor/[ID]
```

Initials fallback for logos:
```tsx
function CompanyInitials({ name }: { name: string }) {
  const initials = name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()
  return <div className="w-12 h-12 rounded-lg bg-nxt-elevated flex items-center justify-center text-sm font-bold text-nxt-accent">{initials}</div>
}
```

Use framer-motion for card entrance (stagger 0.05s).
Use loading skeletons while fetching.
Show empty state if no results.

**Deliver:** `_collab/inbox/for-computer/page-discover.tsx`

---

## TASK 6 — MEDIUM: Write "Why El Paso" for top 20 companies

For the company cards, each needs a 1-sentence "Why El Paso needs to know this."
Based on the vendor data below, write the JSON.

Top companies to cover:
- Jacobs Solutions (iker 100) — Infrastructure, border, Fort Bliss
- Booz Allen Hamilton (95) — Defense AI, DoD, CBP
- Leidos (95) — Border security, military IT
- General Dynamics IT (95) — Army networks, Fort Bliss
- SAIC (95) — AI/ML for Army, border tech
- BAE Systems (92) — Bradley vehicles, electronic warfare
- TekSynap (90) — Army IT, Fort Bliss contracts
- Lockheed Martin Missiles (90) — THAAD at Fort Bliss
- MesaAI (90) — El Paso-founded bilingual AI startup
- Palantir (90) — AI platform for 1st Armored Division
- CrowdStrike Federal (90) — Cybersecurity for Fort Bliss + CBP
- Boeing Defense (90) — Apache helicopter support at Fort Bliss
- Shield AI (listed) — Autonomous drone system, Fort Bliss evaluation
- Anduril (listed) — Lattice perimeter security for Army
- L3Harris (listed) — C4ISR facility expansion in El Paso
- Benchmark Electronics (listed) — Defense manufacturing contracts
- Amazon (listed) — Fulfillment center in Horizon City
- MesaAI (listed) — El Paso-founded bilingual AI
- UTEP (institution) — Local university research partner
- Fort Bliss (entity) — Primary Army installation and tech test site

Format:
```json
[
  { "company_name": "Jacobs Solutions", "ep_why": "Holds active DHS and CBP border infrastructure contracts — already embedded in El Paso's critical systems." },
  ...
]
```

**Deliver:** `_collab/inbox/for-computer/ep-why-copy.json`

---

## Context for all tasks

- Stack: Next.js 14 App Router, TypeScript, Tailwind CSS
- Supabase: `import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client'`
- Dark theme: bg-nxt-bg, text-nxt-text, nxt-accent (teal), nxt-muted, nxt-border, nxt-surface, nxt-elevated
- No localStorage/sessionStorage (sandboxed)
- External links: target="_blank" rel="noopener noreferrer"
- Icons: lucide-react
- Animation: framer-motion (already installed)
- Always handle loading + error states

Computer is working on these simultaneously:
- Fixing the Explore graph (Cytoscape black canvas)
- Unifying the two nav systems
- Building /api/discover/directory
- Adding Clearbit logos to vendor cards
- Fixing Intel signal count (showing only 3)
