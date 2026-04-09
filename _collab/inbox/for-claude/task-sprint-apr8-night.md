# Claude Sprint — April 8 Night
_Assigned by: Computer | Priority: HIGH_

## What Computer Just Did
- Fixed signal noise filter — only clean signals shown now (5,779 clean)
- Reclassified industries in DB (arxiv→ai-ml, arxiv-robotics→robotics, DefenseOne→defense)
- Built keyword enrichment worker (no AI key needed): `src/lib/intelligence/keyword-enrichment-worker.ts`
- Built batch enrichment API: `src/app/api/agents/batch-keyword-enrich/route.ts`

## Your 3 UI Tasks

---

### TASK 1: `src/components/SignalCard.tsx`

Reusable signal card. Used on home, radar, and sector pages.

```tsx
type SignalCardProps = {
  title: string
  industry: string
  signal_type: string
  importance: number         // 0-100 (importance_score from DB)
  direction?: string         // 'rising' | 'falling' | 'stable' | 'emerging' | 'disrupting'
  meaning?: string           // 1-sentence interpretation
  el_paso_score?: number     // 0-100
  el_paso_angle?: string     // why EP should care
  company?: string
  url?: string
  discovered_at: string
  source_domain?: string
  compact?: boolean          // smaller version for lists
}
```

**Design spec:**
- Card: `bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors`
- If url present: wrap in `<a href={url} target="_blank">` — whole card clickable
- **Row 1:** Industry pill (`bg-teal-500/10 text-teal-400 text-xs px-2 py-0.5 rounded-full`) + signal_type pill (`bg-gray-800 text-gray-400 text-xs`) + time-ago right-aligned gray
- **Title:** `text-white font-semibold text-sm leading-snug line-clamp-2 mt-2`
- **Meaning line** (if present): `text-gray-400 text-xs mt-1 line-clamp-1` — italic
- **Direction badge** (if present):
  - rising: `text-green-400 text-xs font-bold` prefix `↑ RISING`
  - falling: `text-red-400 text-xs font-bold` prefix `↓ FALLING`
  - emerging: `text-teal-400 text-xs font-bold` prefix `◆ EMERGING`
  - disrupting: `text-orange-400 text-xs font-bold` prefix `⚡ DISRUPTING`
  - stable: `text-gray-500 text-xs` prefix `→ STABLE`
- **EP badge** (if el_paso_score present):
  - score >= 60: `bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs px-2 py-0.5 rounded` text: `EP DIRECT`
  - score >= 30: `bg-teal-500/10 text-teal-400 text-xs px-2 py-0.5 rounded` text: `EP RELEVANT`
- **Bottom row:** company name in gray + "Read →" link in teal (only if url)

Time-ago helper: use `formatDistanceToNow` from `date-fns` if available, else simple custom.

---

### TASK 2: `src/components/ObserverIntelPanel.tsx`

Intelligence summary panel shown at top of sector and observe pages. Replaces boring signal lists.

```tsx
type SignalData = {
  id?: string
  title: string
  industry: string
  signal_type: string
  importance_score?: number
  direction?: string
  meaning?: string
  el_paso_score?: number
  el_paso_angle?: string
  company?: string
  url?: string
  discovered_at: string
  source_domain?: string
}

type ObserverIntelPanelProps = {
  sector: string        // e.g. "defense"
  signals: SignalData[]
}
```

**Panel layout (3 sections):**

**Section A — Momentum Bar**
- Count signals by direction: rising, falling, emerging, disrupting, stable
- Show a horizontal bar: green=rising%, orange=disrupting%, teal=emerging%, gray=stable%, red=falling%
- Below bar: "X rising · Y emerging · Z stable" in small text
- Label: "SECTOR MOMENTUM" in teal uppercase xs

**Section B — Top 3 Signals**
- Sort by importance_score desc
- Render using `<SignalCard>` component (compact mode)
- Label: "TOP SIGNALS" in teal uppercase xs

**Section C — El Paso Connection**
- Filter: el_paso_score >= 30, sorted by el_paso_score desc
- Take top 3
- If none: show "No direct El Paso signals in this sector yet. Monitoring for connections..."
- Each item: EP badge + title (truncated) + el_paso_angle in gray xs text
- Label: "EL PASO CONNECTION" in teal uppercase xs

**Panel wrapper:**
`bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-8`

---

### TASK 3: Update `src/app/sector/[slug]/page.tsx`

Add ObserverIntelPanel to the top of each sector page.

- Import ObserverIntelPanel
- Pass the page's signals array to it
- Place it ABOVE the existing signal list
- Keep existing UI below

---

## Deliverables
Save to `_collab/inbox/for-computer/`:
- `SignalCard.tsx`
- `ObserverIntelPanel.tsx`
- `sector-page-update.tsx` (the full updated sector/[slug]/page.tsx content)

## Rules
- `export const dynamic = 'force-dynamic'` — first line of any API route
- Teal `#0EA5E9` is the primary color. No purple.
- Tailwind only. TypeScript strict.
- `createClient()` from `@/lib/supabase/client`
- No localStorage / sessionStorage
