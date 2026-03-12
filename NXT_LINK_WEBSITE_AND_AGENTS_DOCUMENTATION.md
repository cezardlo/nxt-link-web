# NXT//LINK Website + Agent System Documentation

Snapshot date: March 6, 2026
Codebase path: `nxt-link-web`

## 1) What NXT//LINK is

NXT//LINK is a Next.js intelligence platform centered on a live operations map for El Paso, Texas. It combines:
- Real-time and near-real-time data layers (flights, border, contracts, seismic, feeds, etc.)
- Vendor and technology intelligence pages
- Industry deep-dive workflows
- A multi-agent system for discovery, vetting, comparison, pilot planning, trend detection, narrative generation, alerting, and operational orchestration

The product experience is map-first, with additional pages for industries, vendors, conferences, technologies, and platform health.

## 2) Technical foundation

- Frontend/runtime: Next.js App Router + TypeScript + Tailwind
- Mapping/rendering: MapLibre + deck.gl
- Data + storage: Supabase (when configured), plus in-memory caches/fallbacks
- Optional local/remote AI providers: Anthropic, Gemini, OpenAI-compatible providers, Ollama
- Optional external Intel backend proxy: `/api/intel/[...path]` to `INTEL_API_URL` (default `http://localhost:8100`)

Main shell behavior:
- Root layout (`src/app/layout.tsx`) loads app fonts and wraps with `AppShell`
- `AppShell` shows top navigation on most routes, hides it on `/` and `/map`

## 3) Main website routes and how they work

### `/` (Landing)
- High-contrast mission-style landing page
- Provides direct entry points to:
  - `/map`
  - `/industries`
  - `/vendors`
  - `/solve`
  - `/conferences`
  - `/technology/[id]`
- Displays top-level platform counts (vendors/technologies/industries/conferences)

### `/map` (Core command center)
- 3-column operator layout:
  - Left: `MapLayerPanel` toggles grouped into GLOBAL/LIVE/VENDORS/MOMENTUM/INTEL/IKER
  - Center: `MapCanvas` (deck.gl layers + MapLibre basemap)
  - Right: `RightPanel` with 5 tabs (`BRIEF`, `VENDOR`, `INTEL`, `PROCURE`, `OPS`)
- Bottom ticker: `FeedBar`
- Command palette: `CmdK` (`Ctrl/Cmd+K`)

State model:
- URL-synced state includes time range + active layers + map view params
- Layer toggles drive conditional fetches from relevant APIs
- Data freshness timestamps are tracked per layer for UI freshness badges

Mission briefing flow:
- User enters mission text in `MapTopBar`
- POST to `/api/intel/api/mission/analyze`
- If providers fail, route returns static curated El Paso fallback briefing

### `/industries`
- Sector monitor page for the 8 core industries
- Pulls live sector scores from `/api/intel-signals`
- Displays momentum-style cards + links to industry deep-dives

### `/industry/[slug]`
- Industry dossier page built from static catalog + live/intel inputs
- Loads products via `/api/industry/[slug]/products`
- Loads industry-related feed signals via `/api/feeds`
- "Explain Simply" action calls `/api/industry/explain`
- Links into industry-specific problem solving flow

### `/industry/[slug]/solve` and `/solve`
- Uses shared `ProblemSolver` UI
- Submits problem to `/api/industry/solve`
- Returns diagnosis, recommended solutions, matching products/vendors, evidence examples, and pilot plan

### `/vendors`
- Vendor registry page sourced from Supabase `vendors` table when configured
- Filters/search/category controls
- Links to vendor detail pages

### `/vendor/[id]`
- Fetches vendor detail from `/api/intel/api/vendors/[id]`
- Shows dossier + IKER panel + evidence/tags/signals + product scan outputs (if available)

### `/conferences`
- Conference intelligence list from local conference dataset
- Filtering by category/month + search + relevance ranking
- Links to conference details + map jump links

### `/conference/[id]`
- Static detail page for a conference record
- Shows relevance tier, stats, location intelligence, related conferences, and map link

### `/technology/[id]`
- Technology profile page from catalog + knowledge graph data
- Shows maturity/relevance, related vendors, applications, signal keywords, and dynamic knowledge graph visualization

### `/platform/status`
- Operational status page
- `SystemDashboard` reads `/api/agents/swarm` for memory/events/reliability/coordinator state
- `AgentControlRoom` reads `/api/agents/run` history and can manually trigger agent pipeline

### `/innovation`
- Innovation lifecycle explorer page using local innovation-cycle datasets
- Stage-based visualization and lifecycle graph interactions

## 4) Map layer system (what each class of layer represents)

GLOBAL:
- `globalHubs`: key tech hubs (including El Paso HQ marker)
- `conferences`: conference points + clusters

LIVE:
- `flights` + `military`: OpenSky-derived flight tracks with category classification
- `seismic`: USGS earthquakes around El Paso region
- `borderTrade`: border trade volume + wait-time overlays
- `crimeNews`: crime feed overlays + clustered hotspot interpretation
- `samContracts`: live contract signal points
- `liveTV`: embedded live local channels overlay

VENDORS:
- `vendors`: vendor location points
- `products`: product/capability points
- `samBusinesses`: SAM registered entities with NAICS-based sector coloring

MOMENTUM:
- `momentum`: momentum signal points
- `adoption`: adoption/deployment signal points

INTEL:
- `funding`, `patents`, `hiring`, `news`
- `swarm`: agent swarm visibility toggle

IKER:
- `ikerScores`: health-style score overlays
- `ikerRisk`: risk overlays

`MapCanvas` merges:
- Static curated stubs
- Local vendor-derived points
- Dynamic API-derived points
- Live overlays (flights/seismic/border/crime/contracts/sam businesses)

## 5) API architecture (grouped)

### Agent control + orchestration
- `POST /api/agents/run`
  - If `trigger` is provided: runs operational orchestrator pipeline
  - Else: validates request and runs LLM specialist agent system (`runAgentSystem`)
  - Optionally persists run output
- `GET /api/agents/run`
  - Reads recent runs from Supabase `agent_runs`
- `GET /api/agents/runs/[id]`
  - Fetches stored run details from local store
- `GET/POST /api/agents/swarm`
  - GET: swarm memory/events/reliability/coordinator status
  - POST: manual full swarm pipeline run
- `GET /api/agents/cron`
  - Triggers orchestrator with `hourly`

### Specialized agent endpoints
- `GET/POST /api/agents/vendor-discovery`
- `GET/POST /api/agents/quality-sources`
- `GET/POST /api/agents/product-scanner`
- `GET/POST /api/agents/audit`
- `GET/POST /api/agents/docs-sync`

### Intelligence + map support
- `GET /api/intel-signals`
  - Runs signal engine over feed cache
- `GET/POST /api/feeds`
  - Cached enriched feeds or forced refresh
- `GET /api/feeds/live`
  - Raw live RSS helper output
- `GET /api/map/layers`
  - Builds mapped points from opportunity signals
- `GET /api/intel/api/map/layers`
  - Vendor map points from local vendor dataset
- `POST /api/intel/api/mission/analyze`
  - LLM sequential fallback chain with static fallback
- `GET /api/intel/api/vendors/[id]`
  - Vendor dossier endpoint (IKER + industrial scores + cached product scan overlay)
- `GET/POST /api/intel/[...path]`
  - Proxy to external Intel backend

### Live feeds/data endpoints
- `GET /api/live/flights`
- `GET /api/live/seismic`
- `GET /api/live/border-trade`
- `GET /api/live/border-wait`
- `GET /api/live/border-cameras`
- `GET /api/live/contracts`
- `GET /api/live/opportunities`

### Industry/technology/discovery endpoints
- `POST /api/industry/explain`
- `POST /api/industry/solve`
- `GET /api/industry/[slug]/products`
- `GET /api/industry/[slug]/timeline`
- `GET /api/technology/[id]/graph`
- `GET /api/discover/search`
- `GET /api/discover/related`
- `GET /api/discover/vendors`
- `GET /api/discover/technologies`
- `GET /api/discover/sbir`

### Vendor/commercial verification endpoints
- `POST /api/vendors/discover`
- `GET /api/market`
- `GET /api/sam/businesses`
- `GET /api/sam/entity-check`
- `GET /api/sam/exclusions`

### Conference endpoint
- `GET /api/conferences/intelligence`

## 6) Agent systems: full breakdown

NXT//LINK uses multiple agent layers that serve different jobs.

### A) User-facing LLM specialist system (problem-solving stack)

Entry point:
- `runAgentSystem` (`src/lib/agents/runner.ts`)

Flow:
1. Sanitize problem statement
2. Orchestrator selects specialist agents
3. Selected specialists run in parallel
4. Synthesis step combines all outputs into one executive result

Specialist agents:
- `discovery`
  - Finds relevant vendors/solutions for the exact problem
- `vetting`
  - Scores vendors on signal strength, deployment readiness, and fit
- `comparison`
  - Produces side-by-side tradeoff table and winner/no-winner conclusion
- `pilot_design`
  - Creates structured, metric-driven 30-90 day pilot plan
- `market_intel`
  - Returns leaders, emerging players, trends, dynamics, and opportunity gaps

Synthesis output includes:
- executive summary
- top vendors
- recommended pilot path
- next actions
- confidence score

### B) Operational pipeline agents (continuous platform intelligence)

Base class:
- `BaseAgent` handles run lifecycle, run logging, event emission, and best-effort swarm integration

Pipeline agents:
- `FeedAgent`
  - Pulls large feed registry with tiered rotation
  - Keyword-first classification; Gemini fallback for low-confidence items
  - Caches + optional Supabase `feed_signals` upsert
- `EntityAgent`
  - Resolves vendor identities and links signal rows to vendor IDs
- `IKERAgent`
  - Computes IKER scores for unscored signals
- `TrendAgent`
  - Computes 30/90/180 day category momentum, writes to `trends`
- `NarrativeAgent`
  - Builds narrative-ready summary payload from recent high-signal data
- `AlertAgent`
  - Applies alert rules to recent signals and inserts notifications

Coordinator/orchestration:
- `OrchestratorAgent` triggers pipeline (manual/feed/hourly)
- Delegates execution to swarm coordinator pipeline

### C) Swarm layer (event-driven routing + shared memory + feedback learning)

Core modules:
- `swarm/bus.ts`
  - Typed event bus around `agent_events` with in-memory fallback
- `swarm/memory.ts`
  - Shared blackboard for agent findings with filters/read-tracking helpers
- `swarm/learning.ts`
  - Feedback + reliability scoring for agent weighting
- `swarm/coordinator.ts`
  - Rule-based routing engine, plus explicit pipeline execution stages

Default routing rules include examples such as:
- `finding_new` -> `EntityAgent` + `IKERAgent`
- `entity_discovered` -> `TrendAgent`
- `trend_shift` or `risk_detected` -> `NarrativeAgent` + `AlertAgent`

### D) Specialized/support agents

- `vendor-discovery-agent`
  - Scans selected feeds, extracts companies (dictionary + regex + entity matching), uses LLM only for uncertain unknowns, assigns relevance score
- `source-quality-agent`
  - Discovers high-quality sources with heuristic authority/relevance/verifiability scoring, optional LLM enrichment, plus arXiv supplement
- `product-scanner-agent`
  - Deterministic extraction of vendor products/capabilities from local vendor metadata, no external calls
- `conference-agent`
  - Scores conference profiles and ingests/classifies conference-related news
- `audit-agent`
  - Deterministic platform audit checks (data quality, alignment, stale constants, layer sync, design consistency, env dependency mapping)
- `docs-agent`
  - Generates plain-language feature descriptions via LLM and writes structured sections to Google Docs through `updatePlatformDoc`
- `market-agent`
  - Pulls watchlist quotes from Yahoo Finance and maps vendors to tickers for market context

## 7) Data and persistence behavior

Primary behavior:
- Many routes and agents work with in-memory caching + fallback logic
- Supabase-backed behavior activates when env is configured

Typical persistence targets:
- `feed_signals`
- `signals`
- `trends`
- `notifications`
- `agent_events`
- `agent_runs`
- `swarm_memory`
- `swarm_learning`

Local run store:
- Agent run snapshots can also be persisted via Prisma-backed local table (`AgentRun`) in the app DB context

## 8) Fallback model and resilience design

The platform is intentionally layered with graceful degradation:
- If AI providers fail: static curated fallback (mission briefing, explain, solve routes)
- If Supabase not configured: agent paths skip DB writes and use in-memory fallbacks where implemented
- If external live APIs fail: several live endpoints return fallback/demo-safe payloads
- If Intel backend is offline: `/api/intel/[...path]` returns controlled offline response

## 9) End-to-end example: what happens when an operator uses the map

1. User opens `/map`.
2. UI restores map/layer state from URL params.
3. Active toggles trigger data calls (feeds, flights, contracts, border, etc.).
4. Map renders combined static + dynamic points.
5. User submits mission text.
6. `/api/intel/api/mission/analyze` runs provider fallback chain and returns a briefing.
7. Right panel updates BRIEF tab with movement/risk/opportunity.
8. If user clicks a vendor point, VENDOR tab opens dossier (including IKER and linked context).
9. Platform status page can be used to monitor/trigger agent pipeline behavior.

## 10) Quick glossary

- IKER: Internal vendor scoring concept used across map and dossier contexts
- Swarm: Event-driven coordination layer connecting pipeline agents
- Signal Engine: Feed-derived scoring and sector momentum computation layer
- Mission Briefing: Operator-facing synthesized intelligence summary for the current query

---

This document reflects the current code implementation in `nxt-link-web` as inspected on March 6, 2026.
