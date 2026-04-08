# NXT LINK — Current State
_Updated: April 8, 2026 @ 1:00 AM MDT_

## SITE IS LIVE ✅
https://nxt-link-real-jn0k25gpv-cezardlos-projects.vercel.app (latest deploy)
https://nxt-link-web.vercel.app (production domain)

---

## What's Built (Complete)

### Backend APIs
- `/api/agents/enrich-signals-v2` — POST batches 25 signals to Gemini, writes back meaning/direction/el_paso_score/el_paso_angle
- `/api/intelligence/morning-brief` GET (existing) + POST (Jarvis narrative: world_headline, situation, accelerating, emerging, for_el_paso, top_3_moves)
- `/api/explore` — vendor fallback when entities=0
- `/api/intelligence/convergence` — convergence events
- `/api/agents/world-feed-ingest` — 137 RSS/Atom sources, daily
- Full ingest pipeline across all 13 sectors

### UI Components (new)
- `src/components/JarvisBriefPanel.tsx` — 3-tab panel (overview/EP/moves), Jarvis morning brief
- `src/components/ConvergenceAlertBanner.tsx` — multi-event navigator with dismiss
- `src/components/ElPasoSignalBadge.tsx` — EP DIRECT/RELEVANT/CONTEXT + DirectionBadge
- `/sector/[slug]` — signal cards now show: meaning, direction badge, EP badge
- Home page (`/`) — JarvisBriefPanel + ConvergenceAlertBanner above Top 3 cards

### Data
- `intel_signals`: 7,363 clean signals — **0 enriched** (pipeline at `/api/agents/enrich-signals-v2` is ready to run)
- `vendors`: 442 IKER-scored
- `conferences`: 1,040 with exhibitors
- `kg_discoveries`: 973 breakthroughs
- `entities`: 3,575 / `entity_relationships`: 3,953

---

## What Claude Should Build Next

See `_collab/inbox/for-claude/task-april8-ui-sprint.md` for full spec.

**Still needed:**
1. `fix-signal-feed-regions.tsx` — add country flags + meaning + EP badges to intel/radar signal feed
2. Personalization layer — user can select sectors they care about, feed filters accordingly

**For enrichment:** Computer will POST to `/api/agents/enrich-signals-v2` to start processing signals.
Run: `POST https://nxt-link-web.vercel.app/api/agents/enrich-signals-v2` with `{ "batch_size": 50 }`

---

## Architecture Reminders
- `createClient()` from `@/lib/supabase/client` — always
- `export const dynamic = 'force-dynamic'` at TOP of API files (before imports!)
- Teal `#0EA5E9` — primary. No purple buttons.
- No localStorage/sessionStorage (blocked in Next.js edge)
- `runParallelJsonEnsemble` from `@/lib/llm/parallel-router`
