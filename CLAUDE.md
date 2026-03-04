# NXT//LINK — Claude Code Instructions

## Project
El Paso technology intelligence platform. Bloomberg Terminal + Palantir AIP + WorldMonitor aesthetic.
Non-technical founder. Explain things simply. Build the NXT//LINK vision: impartial tech acquisition middle-man.

## Stack
- Next.js 15, TypeScript strict, Tailwind CSS
- deck.gl (ScatterplotLayer, TextLayer) + MapLibre GL via react-map-gl
- Supabase (auth + DB), Prisma (schema), Gemini (LLM enrichment)
- IBM Plex Mono (monospace UI), Space Grotesk (headings)

## Design System — NEVER deviate from this
- Background: pure black `#000` / `bg-black`
- Cyan accent: `#00d4ff` (Palantir)
- Orange: `#f97316` (crime/intel)
- Gold: `#ffd700` / `#ffb800` (IKER/flights)
- Green live: `#00ff88`
- Red alert: `#ff3b30`
- All overlays: `absolute`, `z-20`, `bg-black/92`, `border border-white/8`, `backdrop-blur-md`, `rounded-sm`
- All labels: `font-mono`, tiny sizes (`text-[7px]` to `text-[10px]`), `tracking-wide`
- Glowing dots: `boxShadow: '0 0 6px {color}cc'`

## Key Files
- `src/app/map/page.tsx` — main platform page, LayerState, all data fetching useEffects
- `src/components/MapCanvas.tsx` — deck.gl layers, pulsing animation, all map rendering
- `src/components/MapLayerPanel.tsx` — left panel layer toggles (GROUPS array)
- `src/components/MapRightPanel.tsx` — right panel tabs (BRIEFING/DOSSIER/IKER/FEEDS/MTM)
- `src/components/CrimeNewsOverlay.tsx` — crime intel panel, Jaccard clustering, severity badges
- `src/components/LiveTVOverlay.tsx` — YouTube live TV, postMessage mute/pause, idle detection
- `src/components/BorderCameraOverlay.tsx` — border wait times + camera notice
- `src/lib/agents/feed-agent.ts` — RSS feed fetching, Gemini enrichment, 5min cache
- `src/lib/intelligence/signal-engine.ts` — signal detection, sector scoring

## LayerState (map/page.tsx)
Adding a new layer requires changes in 4 places:
1. `LayerState` interface — add `myLayer: boolean`
2. `DEFAULT_LAYERS` — add `myLayer: false`
3. `MapLayerPanel.tsx` GROUPS array — add `{ key: 'myLayer', label: 'MY LAYER', color: '#hex' }`
4. `map/page.tsx` JSX — add `{layers.myLayer && <MyOverlay />}` or pass to MapCanvas

## MapCanvas deck.gl Patterns
- Always use `as unknown as Layer` cast on new layers
- Pulsing: use `pulsePhase` state (0–1, 2s loop via requestAnimationFrame)
- Add new props to `Props` type + function destructuring + `useMemo` dependency array
- Crime hotspot colors: high=#ff3b30, moderate=#f97316, low=#6b7280
- All layer data typed as specific types (never `any`)

## Feed System
- `FeedCategory` type in feed-agent.ts: `'AI/ML' | 'Cybersecurity' | 'Defense' | 'Enterprise' | 'Supply Chain' | 'Energy' | 'Finance' | 'Crime' | 'General'`
- `CRIME_SOURCE_IDS` set forces Crime category post-Gemini for crime-specific sources
- Feed cache TTL: 5 min. POST `/api/feeds` to force refresh
- Crime sources: ktsm-crime, gn-ep-crime, gn-ep-police, gn-cbp-crime

## TypeScript Rules — Always run `npx tsc --noEmit` after edits
- `Map` import from react-map-gl: `import MapGL from 'react-map-gl/maplibre'`
- `Array.from(map.entries() as Iterable<[K,V]>)` to avoid downlevel iteration
- `tsconfig.json` target: `"es2017"`
- Never use `any` — always type API responses explicitly

## iframe / YouTube Rules
- NEVER use React `key` prop to force iframe reload for mute/play state changes
- Use `enablejsapi=1` in embed URL + `postMessage` for mute/unmute/play/pause
- Channel switch: set `iframe.src` directly via ref (one reload, acceptable)
- Always embed with `mute=1` as default; re-apply unmuted state via setTimeout after load

## CrimeNewsOverlay Conventions
- Severity order: critical → high → moderate → resolved (sort before render)
- Convergence badge (`◉ CONV`) when 3+ distinct sources cover same story
- Jaccard threshold: 0.3 for clustering
- Velocity: spike ≥4 articles in 1h, rising >55% of 3h window in last 1h

## Never Do
- Don't reload iframes to change mute/volume — use postMessage
- Don't add `any` types
- Don't create CLAUDE.md, README, or doc files unless asked
- Don't amend commits — always new commit
- Don't auto-push to remote
- Don't paste the full World Monitor doc — use bullet list of specific features wanted

## Token Efficiency Tips (for user)
- Use `/compact` before starting a new major feature
- Reference this CLAUDE.md instead of re-explaining stack each session
- Say "in parallel" when giving 2+ independent tasks
- Keep feature requests short: "Add X to Y using Z pattern from existing code"
