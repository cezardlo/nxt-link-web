# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Research Rule - ALWAYS follow this before making any change
Before implementing anything (new package, API, pattern, config change): search the web for the newest official documentation and only proceed if you are 100% certain it will work. Do not guess at API shapes, method signatures, or version compatibility.

## Execution Discipline
- Think before acting. Read existing files before writing code.
- Prefer small targeted edits over rewriting whole files.
- Keep solutions simple and direct. No speculative features.
- Do not re-read files you already read unless they may have changed.
- Validate changes before declaring done.
- User instructions always override this file.

## Project
El Paso technology intelligence platform. Bloomberg Terminal + Palantir AIP + WorldMonitor aesthetic.
Non-technical founder. Explain things simply. Build the NXT//LINK vision: impartial tech acquisition middle-man covering ALL industries globally. El Paso is home base, not the limit.

**Production**: https://www.nxtlinktech.com - deploy with `npx vercel --prod --yes`

## Commands
```bash
npm run dev          # start local dev server (port 3000)
npm run build        # production build
npm run typecheck    # tsc --noEmit - run after EVERY file edit
npm run lint         # eslint
npm run verify       # lint + typecheck + test + build (run before deploy)
npm run db:seed      # seed Supabase with vendors/conferences/technologies
```

## Stack
- Next.js 15 App Router, TypeScript strict (`"es2017"` target), Tailwind CSS
- deck.gl (ScatterplotLayer, TextLayer) + MapLibre GL via `react-map-gl/maplibre`
- Supabase - access only via `getDb()` from `@/db/client`, never `getSupabaseClient()` directly
- LLM: Gemini 2.0 Flash + Groq Llama via `src/lib/llm/parallel-router.ts`
- Fonts: JetBrains Mono (consumer screens), IBM Plex Mono (map overlays), Space Grotesk (headings)

## Known Dependency Issues (fix if they reappear)
- `object-assign` - ships without `index.js`. Fix: write `module.exports = Object.assign;` to `node_modules/object-assign/index.js`
- `@deck.gl/widgets` - install with `npm install @deck.gl/widgets --legacy-peer-deps`
- `next.config.mjs` has a webpack alias for `object-assign` - do not remove it
- After clearing `.next` cache, these errors can reappear - fix the files, restart the server

## Design System - NEVER deviate

**Consumer screens** (/, /explore, /world, /following, /store, /dossier, /intel):
- Font: `'JetBrains Mono', 'Courier New', monospace` inline style
- Orange: `#ff6600` (primary), Cyan: `#00d4ff` (data), Green: `#00ff88`, Gold: `#ffd700`, Red: `#ff3b30`
- Bottom nav: `position: fixed, bottom: 0, height: 48px, background: #050505, borderTop: 1px solid #1a1a1a`

**Map page** (`/map`) and overlays:
- Font: IBM Plex Mono via Tailwind `font-mono`
- Cyan `#00d4ff`, Orange `#f97316`, Gold `#ffb800`, Green `#00ff88`, Red `#ff3b30`
- Overlays: `absolute z-20 bg-black/92 border border-white/8 backdrop-blur-md rounded-sm`

## Architecture

### Consumer Navigation - CRITICAL
Every consumer screen has its own inline nav array. **All must point to the same routes.** The correct nav:

```
TODAY -> /       EXPLORE -> /explore    WORLD -> /world
FOLLOW -> /following    STORE -> /store    DOSSIER -> /dossier
```

Files that each contain their own nav (update ALL when adding a route):
- `src/app/page.tsx` - NAV_TABS array
- `src/app/explore/page.tsx` - NAV_TABS array
- `src/app/world/page.tsx` - NAV_TABS array
- `src/app/following/page.tsx` - NAV_ITEMS array
- `src/app/store/page.tsx` - NAV_ROUTES object
- `src/app/dossier/page.tsx` - NAV_ITEMS array
- `src/app/dossier/[slug]/page.tsx` - NAV_ITEMS array
- `src/app/intel/page.tsx` - inline nav in JSX

**Past bug**: Several pages had nav pointing to `/map`, `/industries`, `/vendor`, `/dashboard`, `/ask` - these are all wrong for the consumer nav.

### Consumer Screens
| Tab | Route | File |
|-----|-------|------|
| TODAY | `/` | `src/app/page.tsx` |
| EXPLORE | `/explore` | `src/app/explore/page.tsx` - Cytoscape.js graph |
| WORLD | `/world` | `src/app/world/page.tsx` - SVG world map, signal dots |
| FOLLOW | `/following` | `src/app/following/page.tsx` - localStorage follows |
| STORE | `/store` | `src/app/store/page.tsx` - product catalog |
| DOSSIER | `/dossier` + `/dossier/[slug]` | search -> industry/vendor brief |
| INTEL | `/intel` | three-screen Bloomberg dashboard (Signals/Trends/5 Whys) |

### Map Platform (`/map`)
Thin composition of three hooks:
- `src/hooks/useMapLayers.ts` - LayerState, DEFAULT_LAYERS, URL state sync
- `src/hooks/useMapData.ts` - all live data fetching
- `src/hooks/useMissionBriefing.ts` - Gemini briefing

Adding a new map layer requires 4 changes: LayerState interface -> DEFAULT_LAYERS -> MapLayerPanel GROUPS array -> map/page.tsx JSX.

### Data Access Layer (`src/db/`)
All Supabase queries go through `src/db/queries/`. Pattern: `isSupabaseConfigured()` -> query Supabase -> fallback to hardcoded TS data. Never call `getSupabaseClient()` - use `getDb()`.

### LLM Router
```typescript
const result = await runParallelJsonEnsemble<MyType>({
  systemPrompt: '...',
  userPrompt: '...',
  maxProviders: 1,
  parse: (content) => JSON.parse(content) as MyType,
});
// result.result is MyType
```
Always provide algorithmic fallbacks - never depend solely on LLM responses.

### Intelligence Engines (`src/lib/engines/`)
- `ask-engine.ts` - core assembler for `/api/ask` (17 sections)
- `signal-connections-engine.ts` - causal/temporal/thematic signal connections
- `prediction-engine.ts` - 30d/90d trajectory forecasts
- `opportunity-engine.ts` - 9 algorithmic opportunity detectors
- `industry-profile.ts` - 11-block auto-generated pages (any keyword)

### Agent Pipeline (`src/lib/agents/`)
37 agents across 5 phases, running via `/api/agents/cron-step?agent=<name>` (one agent per 60s Vercel request).

**Phase 1 (Discovery):** orchestrator, intel-discovery, product-discovery, conference-intel, entity, patent-discovery, startup-discovery, research-discovery, supply-chain, disruption-monitor, persist-kg
**Phase 2 (Processing):** intel-curation, auto-discovery, graph-builder
**Phase 3 (Intelligence):** intelligence-loop, insight, country-activity, continent-intel
**Phase 4 (Learning):** iker-learn, ceo-briefing, prediction-outcomes
**Phase 5 (Vendor Pipeline):** vendor-scrape, vendor-enrich, vendor-maintain, vendor-pipeline

**Data flow:** RSS feeds -> signals -> intel-curation -> knowledge graph -> vendors -> marketplace
**Conference flow:** conferences -> conference-intel -> exhibitor-scraper -> vendor-matcher -> conference_vendor_links -> /conferences frontend

**Pipeline health:** Hit `/api/pipeline/health` or check `conference_scrape_runs` table for recent run status.

### Agent OS (`src/lib/agents/os/`)
7-layer pipeline running via `/api/agents/cron`. Each layer independent - one crash does not stop others.

### Focus: Trucking & Logistics
NxtLink is focused on trucking, logistics, and supply chain intelligence. When adding agents or discovery logic, prioritize categories: Trucking, Supply Chain, Logistics, Warehousing, Fleet Management, Transportation.

## Key Patterns

### TypeScript
- `import MapGL from 'react-map-gl/maplibre'` (not `Map` - conflicts with JS built-in)
- `Array.from(map.entries() as Iterable<[K,V]>)` for downlevel iteration
- `as unknown as Layer` cast for new deck.gl layers
- Never use `any` - type all API responses explicitly

### localStorage Keys (consumer screens)
- `nxt_streak` - daily visit streak
- `nxt_last_query` - last search query
- `nxt_follows` - followed topics/vendors
- `nxt_recent_dossiers` - recently viewed dossier slugs

### iframe / YouTube
- NEVER use React `key` prop to force iframe reload for state changes
- Use `enablejsapi=1` + `postMessage({event:'command', func:'mute', args:[]})` for audio
- Channel switch: set `iframeRef.current.src` directly (one reload acceptable)

## Never Do
- Don't add `any` types
- Don't amend commits - always new commit
- Don't auto-push to remote
- Don't call `getSupabaseClient()` directly - use `getDb()`
- Don't spread API response objects into NextResponse.json if fields could duplicate
- Don't reload iframes - use postMessage
- Don't delete `.next` cache unless necessary - rebuilding re-triggers the missing package bugs above

## Output and Formatting
- Be concise in output. Explain only what is necessary.
- No sycophantic openers or closing fluff.
- No unsolicited "you might also want..." suggestions unless asked.
- No em dashes, smart quotes, or decorative Unicode in generated text when plain ASCII works.
- Keep code copy-paste safe.

## Token Efficiency
- Use `/compact` before starting a new major feature
- Say "in parallel" when giving 2+ independent tasks
- Keep feature requests short: "Add X to Y using Z pattern from existing code"
