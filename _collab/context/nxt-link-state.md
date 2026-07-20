# NXT LINK — Current State
_Updated: April 8, 2026 @ 11:45 PM MDT_

## SITE IS LIVE ✅
https://nxt-link-web.vercel.app (production domain)

---

## What Computer Just Fixed (April 8 Night)

### Data Quality — FIXED
- `getIntelSignals()` now filters `is_noise = false` ← was showing garbage
- 577 KVIA/KTSM non-tech stories marked as noise
- ~200+ Bloomberg off-topic financial stories marked as noise
- arxiv AI papers reclassified → `industry = 'ai-ml'`
- arxiv robotics reclassified → `industry = 'robotics'`
- Defense One reclassified → `industry = 'defense'`
- **Clean signal count: 5,779** (was 11,869 with garbage mixed in)

### New Files (pushed to GitHub)
- `src/lib/intelligence/keyword-enrichment-worker.ts` — rule-based enrichment, no AI key
- `src/app/api/agents/batch-keyword-enrich/route.ts` — POST to enrich 200 signals at a time
- `src/db/queries/intel-signals.ts` — now filters `is_noise = false` always

### Enrichment Pipeline
- No AI key = keyword enrichment runs instead
- `POST /api/agents/batch-keyword-enrich` → enriches 200 signals per call
- Run it 29 times to cover all 5,779 signals
- Adds: `meaning`, `direction`, `el_paso_score`, `el_paso_angle` to every signal

---

## Data Now
- `intel_signals`: 11,869 total, **5,779 clean** (is_noise=false), 0 enriched yet
- `vendors`: 442 IKER-scored
- `conferences`: 1,040 with exhibitors
- `kg_discoveries`: 973 breakthroughs
- Top clean sources: arxiv AI (2,317), arxiv robotics (788), TechCrunch (204), DefenseOne (56)

---

## What Claude Should Build Next

See `_collab/inbox/for-claude/task-sprint-apr8-night.md` for full spec.

**4 UI components needed:**
1. `keyword-enrichment-worker.ts` — Computer already built this, Claude doesn't need to
2. `SignalCard.tsx` — reusable card with direction badge, EP badge, meaning line
3. `ObserverIntelPanel.tsx` — sector intelligence summary panel
4. *(Optional)* Sector page update to use ObserverIntelPanel

---

## Architecture Reminders
- `export const dynamic = 'force-dynamic'` — FIRST line of every API route file
- Use `createClient()` from `@/lib/supabase/client`
- Teal `#0EA5E9` — primary. No purple.
- No localStorage/sessionStorage
- TypeScript strict — no `any`
- Tailwind CSS only
