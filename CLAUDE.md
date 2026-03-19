# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Research Rule — ALWAYS follow this before making any change
Before implementing anything (new package, API, pattern, config change): search the web for the newest official documentation and only proceed if you are 100% certain it will work. Do not guess at API shapes, method signatures, or version compatibility.

## Project
El Paso technology intelligence platform. Bloomberg Terminal + Palantir AIP + WorldMonitor aesthetic.
Non-technical founder. Explain things simply. Build the NXT//LINK vision: impartial tech acquisition middle-man covering ALL industries globally — health, manufacturing, energy, logistics, fintech, biotech, agriculture, defense, cybersecurity, AI/ML, supply chain, construction, water, aerospace. El Paso is home base, not the limit.

**Production**: https://www.nxtlinktech.com — deploy with `npx vercel --prod --yes`

## Commands
```bash
npm run dev          # start local dev server (port 3000)
npm run build        # production build
npm run typecheck    # tsc --noEmit (run after every edit)
npm run lint         # eslint
npm run verify       # lint + typecheck + test + build (pre-deploy)
npm run db:seed      # seed Supabase with vendors/conferences/technologies
```
Always run `npm run typecheck` after any file edit before considering work done.

## Stack
- Next.js 15 App Router, TypeScript strict (`"es2017"` target), Tailwind CSS
- deck.gl (ScatterplotLayer, TextLayer) + MapLibre GL via `react-map-gl/maplibre`
- Supabase (auth + DB + all persistence) — access via `getDb()` from `@/db/client`
- Gemini 2.0 Flash (LLM enrichment), Groq Llama (5 Whys), parallel LLM router at `src/lib/llm/parallel-router.ts`
- JetBrains Mono (all UI labels on new pages), IBM Plex Mono (map page), Space Grotesk (headings)

## Design System — NEVER deviate
**New pages** (/, /explore, /world, /following, /store, /dossier):
- Font: `'JetBrains Mono', 'Courier New', monospace` via inline styles
- Primary accent: `#ff6600` (orange), Data labels: `#00d4ff` (cyan)
- Positive: `#00ff88`, Warning: `#ffd700`, Critical: `#ff3b30`
- Bottom nav: fixed 48px, `#050505` bg, `#1a1a1a` border

**Map page** (`/map`) and overlays:
- Font: IBM Plex Mono via Tailwind `font-mono`
- Cyan accent `#00d4ff`, Orange `#f97316`, Gold `#ffb800`, Green `#00ff88`, Red `#ff3b30`
- Overlays: `absolute z-20 bg-black/92 border border-white/8 backdrop-blur-md rounded-sm`
- Labels: `font-mono text-[7px]–text-[10px] tracking-wide`
- Glowing dots: `boxShadow: '0 0 6px {color}cc'`

## Architecture

### Six Consumer Screens (bottom nav on every page)
| Tab | Route | File |
|-----|-------|------|
| TODAY | `/` | `src/app/page.tsx` |
| EXPLORE | `/explore` | `src/app/explore/page.tsx` |
| WORLD | `/world` | `src/app/world/page.tsx` |
| FOLLOW | `/following` | `src/app/following/page.tsx` |
| STORE | `/store` | `src/app/store/page.tsx` |
| DOSSIER | `/dossier` + `/dossier/[slug]` | `src/app/dossier/` |

Each page has its own inline `NAV_ITEMS` array — if adding/changing routes, update all six files.

### Map Platform (`/map`)
`src/app/map/page.tsx` — thin composition of three hooks:
- `useMapLayers.ts` — LayerState, DEFAULT_LAYERS, URL state sync
- `useMapData.ts` — all live data fetching (flights, seismic, border, crime)
- `useMissionBriefing.ts` — Gemini briefing

Adding a new layer requires 4 changes: LayerState interface → DEFAULT_LAYERS → MapLayerPanel GROUPS array → map/page.tsx JSX.

### Data Access Layer (`src/db/`)
All Supabase queries go through `src/db/queries/`. Pattern: check `isSupabaseConfigured()` → query Supabase → fall back to hardcoded TS data if error/empty. Never call `getSupabaseClient()` directly — use `getDb()`.

### Intelligence Engines (`src/lib/engines/`)
- `ask-engine.ts` — core data assembler for `/api/ask`
- `signal-connections-engine.ts` — detects causal/temporal/thematic signal connections
- `prediction-engine.ts` — 30d/90d trajectory forecasts
- `opportunity-engine.ts` — 9 algorithmic opportunity detectors
- `industry-profile.ts` — 11-block auto-generated industry pages (works for any keyword)

### LLM Router (`src/lib/llm/parallel-router.ts`)
```typescript
const result = await runParallelJsonEnsemble<MyType>({
  systemPrompt: '...',
  userPrompt: '...',
  maxProviders: 1,
  parse: (content) => JSON.parse(content) as MyType,
});
// result.result is MyType
```
Always provide algorithmic fallbacks — never depend solely on LLM responses.

### Agent OS (`src/lib/agents/os/`)
7-layer pipeline: Signal Intake → Knowledge Engine → Reasoning → Prediction → Creation → Publishing → Quality Control. Runs via `/api/agents/cron`. Each layer is independent — failure in one doesn't crash others.

## Key Patterns

### TypeScript
- `import MapGL from 'react-map-gl/maplibre'` (not `Map` — conflicts with JS Map)
- `Array.from(map.entries() as Iterable<[K,V]>)` for downlevel iteration
- `as unknown as Layer` cast for new deck.gl layers
- Never use `any` — type all API responses explicitly

### iframe / YouTube
- NEVER use React `key` prop to force iframe reload for mute/play state changes
- Use `enablejsapi=1` + `postMessage({event:'command', func:'mute', args:[]})` for audio control
- Channel switch: set `iframeRef.current.src` directly (one reload acceptable)

### localStorage Keys (consumer screens)
- `nxt_streak` — daily visit streak
- `nxt_last_query` — last search query
- `nxt_follows` — followed topics/vendors
- `nxt_recent_dossiers` — recently viewed dossier slugs

### Supabase Migration
Migrations live in `supabase/migrations/`. After writing a migration, apply it manually — the codebase handles missing tables gracefully via try/catch.

## Feed System
- `FeedCategory`: `'AI/ML'|'Cybersecurity'|'Defense'|'Enterprise'|'Supply Chain'|'Energy'|'Finance'|'Crime'|'General'`
- Feed cache TTL: 5 min. POST `/api/feeds` to force refresh.
- Crime sources override Gemini categorization via `CRIME_SOURCE_IDS` set in `feed-agent.ts`

## Never Do
- Don't reload iframes to change mute/volume — use postMessage
- Don't add `any` types
- Don't amend commits — always new commit
- Don't auto-push to remote
- Don't call `getSupabaseClient()` directly — use `getDb()`
- Don't spread API response objects into NextResponse.json if fields could duplicate

## Token Efficiency
- Use `/compact` before starting a new major feature
- Say "in parallel" when giving 2+ independent tasks
- Keep feature requests short: "Add X to Y using Z pattern from existing code"
