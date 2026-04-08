# NXT LINK — Current State
_Updated: April 8, 2026 @ 12:30 AM MDT_

## What's Live / Built

### Database (Supabase: yvykselwehxjwsqercjg)
- `intel_signals`: 10,415 total (7,363 clean after arXiv filter) — **0 enriched** (pipeline ready)
- `vendors`: 442 (IKER scored)
- `kg_discoveries`: 973
- `conferences`: 1,040
- `products`: 1,041
- `entities`: 3,575 (may have RLS, vendor fallback now in place)
- `entity_relationships`: 3,953

### New columns on intel_signals (need enrichment to populate):
`subsystem | capability_layer | meaning | direction | enriched_at | el_paso_score | el_paso_angle`

---

## What Computer Built This Session

### New API Routes (all deployed)
- `/api/agents/enrich-signals-v2` — GET (status) + POST (batch enrich signals with Gemini)
  - POST body: `{ batch_size: 25 }` (max 50)
  - Returns: meaning, direction, subsystem, capability_layer, el_paso_score, el_paso_angle per signal
- `/api/intelligence/morning-brief` — GET (existing brief) + **new POST** (Jarvis narrative)
  - POST returns: `{ world_headline, situation, accelerating[], emerging[], for_el_paso, top_3_moves[], signals_analyzed }`
- `/api/explore` — Added vendor fallback: if entities table returns 0, serve top 150 vendors as nodes

### Fixes
- `vercel.json` — Reduced to daily-only crons (Hobby plan compatible), deployment triggered
- Explore graph blank canvas → vendor fallback guarantees always shows content

---

## What's Still Needed (Claude's Job)

See `_collab/inbox/for-claude/task-april8-ui-sprint.md` for full spec.

**TL;DR Claude needs to build:**
1. `JarvisBriefPanel.tsx` — UI for POST /api/intelligence/morning-brief
2. `ElPasoSignalBadge.tsx` — EP relevance badge component
3. Signal feed improvements (country flags + el_paso_score display)
4. `ConvergenceAlert.tsx` — improved convergence banner (current one is basic)
5. Home page wiring — insert JarvisBriefPanel + improved ConvergenceAlert

---

## Architecture Reminders (CRITICAL for Claude)
- `createClient()` from `@/lib/supabase/client` — NOT getSupabaseClient()
- `export const dynamic = 'force-dynamic'` at TOP of all API files (before imports)
- Teal `#0EA5E9` = primary accent. NO purple buttons anywhere
- `runParallelJsonEnsemble` from `@/lib/llm/parallel-router`
- All pages are Next.js 14 App Router, TypeScript, Tailwind CSS
- For 'use client' pages: no localStorage, no sessionStorage (blocked)
- Images via Clearbit: `https://logo.clearbit.com/{domain}`

## Vercel
- Project: nxt-link-real
- Deployment QUEUED as of 12:30 AM MDT (dpl_4EXJ3sCPquTyj4FqNWu57vE8Edpc)
- Live URL: https://nxt-link-real-g4b17xtiq-cezardlos-projects.vercel.app (when ready)
- Production: https://nxt-link-web.vercel.app
