# Claude — April 8 UI Sprint
_Computer has built the backend. Now Claude builds the UI layer._

## WHAT COMPUTER BUILT (don't rebuild these)

1. **`/api/agents/enrich-signals-v2`** — POST endpoint that enriches signals with meaning/direction/el_paso_score via Gemini. Already deployed.
2. **`/api/intelligence/morning-brief` POST** — Jarvis narrative brief (world_headline, situation, accelerating, for_el_paso, top_3_moves). Already deployed.
3. **`/api/explore` vendor fallback** — Explore graph now always renders. Already deployed.
4. **vercel.json fixed** — Daily crons only, deployment triggered.

## YOUR 5 TASKS

Drop all files in `_collab/inbox/for-computer/` with exact names listed below.

---

### TASK 1: `JarvisBriefPanel.tsx`

Build a Jarvis-style intelligence brief component for the home page.

**File to deliver:** `JarvisBriefPanel.tsx`  
**Insert at:** Top of `src/app/page.tsx`, before the sector bars section (around line 900 in the JSX return)

The component calls `POST /api/intelligence/morning-brief` on mount.

```typescript
// Response shape from POST /api/intelligence/morning-brief:
interface JarvisResponse {
  ok: boolean;
  data: {
    date: string;
    world_headline: string;           // ONE sentence headline
    situation: string;                 // 3-4 sentence strategic narrative
    accelerating: Array<{
      sector: string;
      headline: string;
      signal_count: number;
    }>;
    emerging: Array<{
      pattern: string;
      evidence: string;
    }>;
    for_el_paso: {
      narrative: string;
      top_opportunity: string;
      watch_for: string[];
    };
    top_3_moves: Array<{
      action: string;
      why: string;
      who: string;
      urgency: 'immediate' | 'this_week' | 'this_month';
    }>;
    signals_analyzed: number;
    generated_at: string;
  };
}
```

**Design spec:**
- Dark panel with `bg-[#0C1015]` background, `border border-[#1A2332]`
- Header: `JARVIS INTEL BRIEF` label (teal `#0EA5E9`, uppercase, monospace font, small)
- World headline in large bold text (`text-xl font-bold text-white`)
- Situation paragraph in muted text
- "ACCELERATING" section: 3 horizontal chips `bg-teal-500/10 border border-teal-500/20 text-teal-400`
- "FOR EL PASO" section: amber/gold accent `text-amber-400`, shows narrative + top_opportunity
- "TOP 3 MOVES" section: numbered list, urgency badge (`immediate`=red, `this_week`=amber, `this_month`=teal)
- Loading state: pulsing skeleton rows
- If API fails: show a fallback "SIGNAL FEED ACTIVE" state (no error message)
- Collapsible: clicking the header toggles collapse, defaults to expanded

**Component structure:**
```tsx
'use client';
export function JarvisBriefPanel() {
  const [brief, setBrief] = useState<JarvisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetch('/api/intelligence/morning-brief', { method: 'POST' })
      .then(r => r.json())
      .then(d => { if (d.ok) setBrief(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // render...
}
```

---

### TASK 2: `ElPasoSignalBadge.tsx`

Build a reusable El Paso relevance badge component.

**File to deliver:** `ElPasoSignalBadge.tsx`
**Save to:** `src/components/ElPasoSignalBadge.tsx`

```tsx
// Props
interface ElPasoSignalBadgeProps {
  score: number;      // 0-100
  angle?: string;     // Optional one-sentence explanation
  size?: 'sm' | 'md'; // default 'sm'
}
```

**Design:**
- Score 80+: `🎯 EP DIRECT` — amber badge `bg-amber-500/15 text-amber-400 border border-amber-500/30`
- Score 60-79: `📡 EP RELEVANT` — teal badge `bg-teal-500/10 text-teal-400 border border-teal-500/20`
- Score 40-59: `🌎 EP CONTEXT` — gray badge `bg-gray-500/10 text-gray-400 border border-gray-500/20`
- Score below 40: render nothing (return null)
- If `angle` provided and size='md': show tooltip on hover with the angle text
- Monospace font, uppercase text, `text-[10px]` for sm, `text-xs` for md

---

### TASK 3: `fix-signal-feed-regions.tsx`

Upgrade the Intel/Radar page signal feed to show country flags + EP badges.

**Read first:** `src/app/radar/page.tsx` OR `src/app/intel/page.tsx` (whichever has the signal list)

For each signal card in the feed:
1. Add country flag emoji based on `region` column:
   - "United States" → 🇺🇸, "China" → 🇨🇳, "Israel" → 🇮🇱, "Germany" → 🇩🇪,
     "UK" / "United Kingdom" → 🇬🇧, "Japan" → 🇯🇵, "France" → 🇫🇷,
     "South Korea" → 🇰🇷, "Canada" → 🇨🇦, "Australia" → 🇦🇺,
     "India" → 🇮🇳, "Russia" → 🇷🇺, "UAE" → 🇦🇪, "Taiwan" → 🇹🇼,
     default → 🌐
2. Show the flag as a small chip `text-sm` next to the source name
3. If signal has `el_paso_score >= 40`, show `<ElPasoSignalBadge score={el_paso_score} />`
4. If signal has `meaning`, show it as the secondary description instead of raw evidence text

**API change needed:** The API serving the radar/intel feed should also return `el_paso_score`, `el_paso_angle`, `meaning`, `direction` in the signal objects. Check `/api/intelligence/grouped/route.ts` or `/api/briefing/route.ts` — add those 4 fields to the select query if not present.

Deliver the fixed page component OR a patch showing exactly what lines to change.

---

### TASK 4: `ConvergenceAlertBanner.tsx`

The current convergence implementation on the home page is basic. Upgrade it.

**Read first:** Find `convergenceAlerts` in `src/app/page.tsx` (around line 828) and see the current rendering.

Build a better `ConvergenceAlertBanner` component:

```tsx
// Fetches from /api/intelligence/convergence?window=24h&min_confidence=0.6
// Shows if any events with confidence > 0.6 exist

// Design:
// - Animated pulsing border: `animate-pulse border border-amber-500/40`
// - "⚡ CONVERGENCE DETECTED" label in amber
// - Sectors joined with " × " separator in white
// - Signal count and confidence %
// - The event summary text (truncated to 120 chars)
// - Dismiss button (X) that hides in local state
// - If multiple events: cycle through them with prev/next arrows
// - Zero-footprint when no events (renders nothing)
```

---

### TASK 5: `fix-sector-deep-dive-signals.tsx`

The sector deep-dive pages at `/sector/[slug]` (e.g. `/sector/defense`) show sector info but the signals list is not pulling from the database.

**Read:** `src/app/sector/[slug]/page.tsx`

Fix the signals section so it:
1. Queries from `intel_signals` WHERE industry = slug (or normalized version)
2. Shows the signal `meaning` if enriched, otherwise the `title` + `evidence`
3. Shows `direction` badge (growing=teal, emerging=amber, converging=purple, declining=red)
4. Shows `el_paso_score` badge if ≥ 40
5. Orders by `importance_score DESC`
6. Shows 10 most recent

The API at `/api/agents/intel-signals` already exists. The sector page just needs to call it with the right parameters.

---

## HOW TO DELIVER

Drop all 5 files in `_collab/inbox/for-computer/` with these exact names:
- `JarvisBriefPanel.tsx`
- `ElPasoSignalBadge.tsx`
- `fix-signal-feed-regions.tsx`
- `ConvergenceAlertBanner.tsx`
- `fix-sector-deep-dive-signals.tsx`

Computer will review, integrate, and deploy within minutes of your drop.

---

## TECH REMINDERS
- Next.js 14 App Router, TypeScript, Tailwind CSS
- `'use client'` at top for interactive components
- No localStorage / sessionStorage
- Teal `#0EA5E9` — primary. No purple buttons.
- Imports: `@/components/...`, `@/lib/supabase/client`, etc.
- Clearbit logos: `https://logo.clearbit.com/{domain}`
- Add `// @ts-nocheck` at top if complex types
