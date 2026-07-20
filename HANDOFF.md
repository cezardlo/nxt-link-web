# NXT//LINK Handoff

Last updated: 2026-04-06
Latest commit: `72a4a27`
Repo: `https://github.com/cezardlo/nxt-link-web`

## Mission
NXT//LINK is being focused into an industrial intelligence system that watches global industry and technology movement, translates it into El Paso relevance, ranks what matters, and recommends what to do next.

Core product loop:
1. Watch signals
2. Map movement
3. Rank what matters for El Paso
4. Explain what to do

## What Was Finished
- Added an El Paso relevance and action layer in `src/lib/intelligence/el-paso-relevance.ts`
- Wired that layer into the unified brain report in `src/lib/intelligence/brain-orchestrator.ts`
- Extended `/api/brain/sync` output with:
  - `signalAssessments`
  - `memory`
  - `opportunities`
- Extended `/api/intel/feed` so signals now carry:
  - `global_significance`
  - `el_paso_relevance`
  - `opportunity_score`
  - `urgency_score`
  - `why_now`
  - `who_it_matters_to`
  - `what_changed_vs_last_week`
  - `opportunity_type`
  - `recommended_actions`
  - `suggested_targets`
  - `local_pathway`
- Extended `/api/briefing` so briefing now includes:
  - `local_relevance_summary`
  - `top_opportunities`
  - `action_queue`
  - `memory`
- Extended `/api/industry/[slug]` so industry pages now reuse the same El Paso brain outputs
- Updated these UI surfaces to show the new logic:
  - `src/app/intel/page.tsx`
  - `src/app/briefing/page.tsx`
  - `src/app/map/page.tsx`
  - `src/app/industry/[slug]/page.tsx`

## Files To Read First
1. `CLAUDE.md`
2. `claude/repo-organization.md`
3. `docs/architecture/current-system.md`
4. `src/lib/intelligence/el-paso-relevance.ts`
5. `src/lib/intelligence/brain-orchestrator.ts`

## Validation Status
Passed:
- `npm run typecheck`
- `npm run lint` with older pre-existing warnings only
- `npm run build`

Runtime spot check passed:
- `/api/brain/sync?limit=40` returned `signalAssessments` with `el_paso_relevance`
- `/api/briefing` returned `action_queue` and `local_relevance_summary`

## Important Context
- The active app is `src/`
- The active brain is the TypeScript path under `src/lib/intelligence`
- Archived Python systems remain in `archive/` and should stay inactive unless explicitly reactivated
- The project is NVIDIA-first, but this phase focused on intelligence scoring and product outputs, not model-provider changes

## Best Next Step
Improve real-world live inputs for the mission:
- border and customs
- trade and manufacturing
- contracts and grants
- patents
- logistics and supply chain
- regional economic signals

Do that through the active TypeScript intake path only. Do not create a parallel ingestion system.

## After That
- Add feedback learning from user behavior and confirmed outcomes
- Tighten the industry pages around tracked sectors and clearer action output

## Known Non-Blocking Warnings
Existing lint warnings remain in unrelated files such as:
- `src/app/industry/[slug]/components/KeyPlayers.tsx`
- `src/app/leads/page.tsx`
- `src/app/products/compare/page.tsx`
- `src/app/signals/page.tsx`
- `src/components/CompanyCard.tsx`
- `src/components/CompanyTooltip.tsx`
- `src/components/ProductCatalog.tsx`
- `src/components/ui/TimeAgo.tsx`
- `src/hooks/useRealtimeSignals.ts`

These did not block the El Paso phase.
