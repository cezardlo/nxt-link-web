# NXT Link Ops

**Slogan:** "Connecting People. Solving Problems."

NXT Link Ops is a neutral innovation operating system for structured 45-day sandbox pilots. It is built for disciplined challenge intake, provider screening, pilot execution, paperwork control, and measurable result publication.

## Repo Status

- Active product app: `src/`
- Active brain path: `src/lib/intelligence` and `src/app/api/brain`
- Archived historical systems: `archive/services/*`

Historical Python systems were moved out of the active repo root. Treat anything under `archive/services/` as reference-only unless explicitly reactivated.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- MapLibre GL + deck.gl
- Prisma ORM
- SQLite (local)
- FastAPI (Python 3.11) archive in `archive/services/intelligence/intel_backend`
- Postgres + pgvector schema archive in `archive/services/intelligence/db/schema.sql`
- Prefect flows archive in `archive/services/intelligence/intel_backend/app/orchestration/flows.py`
- Lucide React
- Inter font

## Core Modules

1. Challenges
2. Vendors
3. Submissions / Matches (pipeline)
4. Pilots (45-day control panel)
5. Documents (NDA, agreements, other)
6. Budget & ROI calculator
7. Results registry
8. Decision Engine (problem interpreter, pilot blueprint, decision pack export)
9. Intelligence Layer (whitepaper ingestion, trend/funding extraction, graph)
10. Ecosystem Portals (company onboarding + vendor submissions)

## Workflow Guardrails

- Challenge cannot be published without measurable desired outcome and KPI name.
- Match pipeline cannot skip stages.
- Pilot can only be created from `SELECTED` matches.
- Pilot cannot be completed without decision (`SCALE`, `EXTEND`, `STOP`).
- Budget panel auto-calculates ROI and payback months.

## Routes

### Public

- `/` landing page
- `/command` Innovation Command Monitor (map-first command center)
- `/platform` phase-by-phase platform hub
- `/challenges` read-only challenge list
- `/challenges/[id]` challenge detail, public submission form, published result
- `/onboarding/company` company onboarding form
- `/submit-vendor` vendor submission form

### Admin

- `/admin` dashboard with stats + attention alerts
- `/admin/challenges` challenge builder and registry
- `/admin/challenges/[id]` challenge workspace + Kanban pipeline + pilot launch
- `/admin/vendors` vendor CRUD
- `/admin/decision-engine` Phase 1 decision engine workbench
- `/admin/intelligence` whitepaper/trend/funding graph + ecosystem queues
- `/admin/pilots` pilot list
- `/admin/pilots/[id]` pilot control panel (KPI, docs, budget, close decision, result)
- `/admin/results` result library

### Public Portals

- `/onboarding/company` company onboarding portal
- `/submit-vendor` vendor submission portal

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Apply local migration SQL:

```bash
npm run db:migrate
```

3. Seed sample data:

```bash
npm run db:seed
```

4. Start dev server:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

5. Open:

```text
http://127.0.0.1:3000
```

## Innovation Command Monitor (MVP Slice)

Implemented features:

- Fullscreen MapLibre + deck.gl interface (`/command`)
- Layer toggle system with grouped controls
- URL state sync (`lat`, `lon`, `zoom`, `view`, `timeRange`, `layers`, `mode`)
- Progressive disclosure by zoom (hex/heat at low zoom, points at high zoom)
- Story-first right panel with mission narrative
- Mobile briefing-first stack with layer bottom-sheet style toggles
- Required APIs:
  - `POST /api/mission/analyze`
  - `GET /api/map/layers`
  - `GET /api/vendors/search`
  - `GET /api/vendors/[id]`
  - `POST /api/feedback`

### Live Opportunity Signals API

NXT LINK includes a consolidated endpoint for public federal and infrastructure signals:

- `GET /api/live/opportunities`

It normalizes these sources into one response shape for map/feed UI use:

- SAM.gov
- USASpending.gov
- SBIR.gov
- NSF Awards API
- USPTO Patent API (live mode requires `USPTO_PATENTSVIEW_API_KEY`)
- BTS Border Crossing
- ERCOT supply/demand dashboard API
- Grants.gov Search2 API
- OpenCorporates API (requires `OPENCORPORATES_API_TOKEN`)

Notes:
- SAM.gov v2 calls require `SAM_GOV_API_KEY`.
- SAM query date window is constrained to one year per API rules.
- OpenCorporates uses versioned endpoint (default `v0.4`) and can report remaining API quota.

### MVP Demo Data

- Source registry: 5 demo sources
- Truth cards: 10 demo cards
- Trend signals: multiple signal types (jobs/patents/conferences/funding/github/pilots)
- Files:
  - `src/lib/command-monitor/demo-data.ts`
  - `src/lib/command-monitor/service.ts`

## FastAPI Backend (Production Scaffold)

Location:

- `archive/services/intelligence/intel_backend`

Key endpoints:

- `GET /health`
- `POST /api/mission/analyze`
- `GET /api/map/layers`
- `GET /api/vendors/search`
- `GET /api/vendors/{id}`
- `POST /api/feedback`

Start locally (Python):

```bash
cd archive/services/intelligence/intel_backend
pip install .
uvicorn app.api:app --reload --port 8100
```

Seed demo dataset (5 sources + 10 truth cards):

```bash
cd archive/services/intelligence/intel_backend
python scripts/seed_demo.py
```

Smoke test:

```bash
cd archive/services/intelligence/intel_backend
python scripts/smoke_test.py
```

## Docker Compose (Web + Backend + Postgres + MinIO)

Bring up stack:

```bash
docker compose up --build
```

Services:

- Web app: `http://localhost:3000`
- FastAPI backend: `http://localhost:8100`
- Postgres: `localhost:5432`
- MinIO: `http://localhost:9001`

Compose file:

- `docker-compose.yml`

## SQL Schema and Migrations

- Base schema archive: `archive/services/intelligence/db/schema.sql`
- Command monitor migration archive: `archive/services/intelligence/db/migrations/20260226_command_monitor.sql`

## Supabase Connection

NXT Link now includes a Supabase integration layer.

1. Set environment variables in `.env`:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://yvykselwehxjwsqercjg.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<your-anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
```

2. Verify connection health:

```text
GET /api/integrations/supabase/health
```

If keys are missing, the endpoint returns `400`.
If Supabase is unreachable or unauthorized, it returns `502`.
If reachable, it returns `200`.

## NVIDIA-First AI Setup (Recommended)

To run intelligence directly inside NXT Link with NVIDIA Build as the main provider:

```bash
NVIDIA_API_KEY="<your-nvidia-build-api-key>"
NVIDIA_MODEL="nvidia/llama-3.1-nemotron-ultra-253b-v1"
NXT_LINK_LLM_PROVIDER="nvidia"
LLM_PROVIDER_LOCK="nvidia,gemini,groq"
SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
```

Optional fallbacks:

```bash
GEMINI_API_KEY="<optional-gemini-api-key>"
GROQ_API_KEY="<optional-groq-api-key>"
```

Then restart dev server and use:

```text
http://127.0.0.1:3000/admin/vendors
```

## Built-in Vendor Discovery (No n8n)

NXT Link includes a direct in-app discovery flow:

1. Go to `/admin/vendors`
2. In **Vendor Discovery (No n8n)**, paste a company website URL
3. Click **Discover Vendor**

What it does:

## Brain Mapping API

NXT//LINK now includes a first-pass mapping layer that turns incoming signals into:

- entities
- relationships
- map-ready location points

Preview recent mapping output:

```text
GET /api/brain/map?limit=100
```

Persist mapped entities and relationships to the knowledge graph tables:

```text
POST /api/brain/map
```

## Obsidian Brain Import

If you keep research and notes in Obsidian, NXT//LINK can import them as graph memory.

Set the vault path:

```bash
OBSIDIAN_VAULT_PATH="V:\\usuario\\Documents\\NXT LINK"
```

Preview the import:

```text
GET /api/brain/obsidian
```

Persist Obsidian notes and links into the knowledge graph:

```text
POST /api/brain/obsidian
```

## Unified Brain Sync

Run the live signal mapping and Obsidian memory import together through one endpoint:

```text
GET /api/brain/sync?limit=100
```

Persist both sources into the same knowledge graph:

```text
POST /api/brain/sync
```

This route:

- maps incoming live signals into companies, industries, locations, and map points
- imports Obsidian notes, tags, and wiki links when `OBSIDIAN_VAULT_PATH` is set
- merges both sources into one graph response
- keeps working even if the Obsidian vault is not configured yet

- Fetches website text server-side
- Uses parallel AI routing (OpenRouter/Groq/Ollama/Together/OpenAI) to extract structured vendor fields
- Inserts or updates `public.vendors` in Supabase

Required environment variables:

```bash
# Gemini-first setup (recommended)
GEMINI_API_KEY="<your-gemini-api-key>"
GEMINI_MODEL="gemini-2.0-flash"
NXT_LINK_LLM_PROVIDER="gemini"

# Optional additional providers:
OPENROUTER_API_KEY="<your-openrouter-api-key>"
OPENROUTER_MODEL="meta-llama/llama-3.1-8b-instruct:free"
GROQ_API_KEY="<your-groq-api-key>"
GROQ_MODEL="llama-3.1-8b-instant"
OLLAMA_BASE_URL="http://127.0.0.1:11434"
OLLAMA_MODEL="llama3.2:3b"
TOGETHER_API_KEY="<optional-together-api-key>"
TOGETHER_MODEL="meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"
OPENAI_API_KEY="<optional-openai-api-key>"
OPENAI_MODEL="gpt-4o-mini"
LLM_DAILY_TOKEN_BUDGET="300000"
GEMINI_DAILY_TOKEN_BUDGET="120000"
OPENROUTER_DAILY_TOKEN_BUDGET="160000"
GROQ_DAILY_TOKEN_BUDGET="160000"
OLLAMA_DAILY_TOKEN_BUDGET="0"
TOGETHER_DAILY_TOKEN_BUDGET="160000"
OPENAI_DAILY_TOKEN_BUDGET="90000"
NXT_LINK_PARALLEL_CHUNK_THRESHOLD="8500"
NXT_LINK_PARALLEL_CHUNK_SIZE="5500"
NXT_LINK_PARALLEL_CHUNK_OVERLAP="500"
NXT_LINK_PARALLEL_MAX_CHUNKS="6"
SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
```

## Route Optimization Ingestion (Version 1)

You can run a curated ingestion pipeline directly from the app:

1. Open `/admin/vendors`
2. In **Route Optimization Ingestion**, click **Run Ingestion**
3. Review inserted/updated/skipped/failed counts

Pipeline behavior:

- Uses a curated source list (`src/lib/ingestion/route-optimization-sources.ts`)
- Fetches public website metadata only
- Applies URL normalization + de-duplication
- Respects `robots.txt` disallow-all rules
- Upserts into Supabase `public.vendors` by `company_url`

## Vendor Intelligence Engine UI

Use `/admin/vendors` -> **Global Vendor Intelligence Engine** to run your master prompt flow directly in NXT Link.

Input fields:

- Source type
- Industry focus
- Region
- Date scraped
- Raw text
- Persist toggle

API endpoint:

```text
POST /api/intelligence/extract
```

Required env:

```bash
# Same AI settings as above. For Gemini only:
GEMINI_API_KEY="<your-gemini-api-key>"
GEMINI_MODEL="gemini-2.0-flash"
NXT_LINK_LLM_PROVIDER="gemini"

# Optional additional providers:
OPENROUTER_API_KEY="<your-openrouter-api-key>"
GROQ_API_KEY="<your-groq-api-key>"
OLLAMA_BASE_URL="http://127.0.0.1:11434"
TOGETHER_API_KEY="<optional-together-api-key>"
OPENAI_API_KEY="<optional-openai-api-key>"
SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
```

Token/budget behavior:

- Providers run in parallel with low-cost preference (`gemini -> ollama -> openrouter -> groq -> together -> openai`).
- Estimated token usage is tracked per provider (daily in-memory counters).
- Per-provider daily budgets can be set with `*_DAILY_TOKEN_BUDGET` env variables.
- Long raw text is automatically chunked and processed as parallel subtasks before final classification.

## AI Build Orchestrator (Multi-LLM)

Use `/admin` -> **Multi-LLM Build Orchestrator** to turn your master prompt into executable implementation output.

What it does:

- Splits the master prompt into parallel sections (repo, DB, backend, frontend, ML, delivery)
- Runs those sections across multiple configured providers simultaneously
- Merges results into one structured blueprint
- Auto-creates action workflow tasks in Ops (optional)
- Persists run history (`OpsBuildRun`) for replay and audit

API endpoint:

```text
POST /api/admin/ops/ai-builder
GET  /api/admin/ops/ai-builder
```

Request options:

- `master_prompt` (raw text) OR `master_prompt_path` (server path to `.md`)
- `mission`
- `persist_actions`
- `action_owner`

Optional env:

```bash
NXT_LINK_MASTER_PROMPT_PATH="c:\\Users\\usuario\\Dropbox\\My PC (DESKTOP-VB2843U)\\Downloads\\NXT_LINK_MASTER_PROMPT.md"
```

## Local Autobuilder (Ollama, no API key)

Run a local autonomous build loop for backend agents with Ollama:

```bash
npm run ai:autobuild
```

Useful options:

```bash
npm run ai:autobuild -- -PromptPath "V:\downloads\NXTLINK_MASTER_PROMPT.md" -Commit
npm run ai:autobuild -- -DryRun -SkipPull
```

Script location:

- `scripts/run-autobuilder.ps1`
- `autobuilder.py`

## Decision Engine Workbench (Phase 1)

Use `/admin/decision-engine` to run the monetization core:

- Company problem interpreter
- 45-day pilot blueprint generator
- Vendor fit recommendations from your current registry
- Decision pack exporter (JSON + Markdown)
- Saved run history with reload support in the UI

API endpoint:

```text
POST /api/decision-engine/generate
```

History endpoints:

```text
GET /api/decision-engine/packs
GET /api/decision-engine/packs/[id]
```

## Intelligence Layer (Phase 2)

Use `/admin/intelligence` to run the strategic intelligence layer:

- Whitepaper ingestion (URL and/or raw text)
- Trend extraction
- Startup + funding signal analysis
- Simple relationship graph visualization
- Run history persistence

API endpoints:

```text
POST /api/intelligence/whitepaper/analyze
GET /api/intelligence/whitepaper/runs
```

## Ecosystem Portals (Phase 3 foundation)

Public forms:

- Company onboarding: `/onboarding/company`
- Vendor submission: `/submit-vendor`

API endpoints:

```text
POST /api/onboarding/company
POST /api/onboarding/vendor
```

## Week 1 + Week 2 Hardening

Implemented reliability and guardrails:

- Request ID propagation middleware (`x-request-id`) for all routes
- Rate limiting on ingestion/discovery/intelligence APIs
- Structured JSON logs for route start/complete/fail events
- Retry/backoff wrappers for external HTTP calls
- Admin Supabase client now requires `SUPABASE_SERVICE_ROLE_KEY` (no anon fallback)
- Challenge KPI fields lock after testing starts
- Challenge close/test transitions require valid pilot state
- Pilot close requires signed documents + progress updates
- Admin dashboard includes stale-stage alerts (reviewing >14d, NDA >7d)

## Week 4 Quality + Safety

Week 4 focuses on release confidence and operational discipline:

- CI pipeline at `.github/workflows/ci.yml` (lint, typecheck, tests, build)
- Test suite for workflow logic and API rate limiting (`tests/*.test.ts`)
- Accessibility baseline with skip link to main content (`src/app/layout.tsx`, `src/app/globals.css`)
- Security headers via Next config (`next.config.mjs`)
- Single command quality gate (`npm run verify`)

## n8n -> Supabase (vendors table)

An importable n8n workflow is included at:

```text
n8n/workflows/supabase-vendors-ingest.json
```

Workflow path:

1. `Vendor Webhook` (POST)
2. `Normalize Vendor Payload`
3. `Insert Vendor in Supabase`
4. `Respond Success`

### n8n Environment Variables

Set these in your n8n environment (not in browser/client code):

```bash
SUPABASE_URL=https://yvykselwehxjwsqercjg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-sb_secret-or-service-role-key>
```

### Import + Activate

1. In n8n, import `n8n/workflows/supabase-vendors-ingest.json`.
2. Save the workflow.
3. Activate it.
4. Copy the production webhook URL for the `Vendor Webhook` node.

### Test Request

```bash
curl -X POST "<your-n8n-webhook-url>" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test AI Company",
    "company_url": "https://example.com",
    "description": "AI fraud detection platform",
    "primary_category": "Fraud Detection",
    "extraction_confidence": 0.92,
    "status": "approved"
  }'
```

Then verify in Supabase `public.vendors` and in:

```text
http://127.0.0.1:3000/vendors
```

## Prisma Commands

- Generate client:

```bash
npx prisma generate
```

- Apply migration SQL:

```bash
npm run db:migrate
```

- Seed:

```bash
npm run db:seed
```

- Studio:

```bash
npm run db:studio
```

## Build

- Lint:

```bash
npm run lint
```

- Typecheck:

```bash
npm run typecheck
```

- Tests:

```bash
npm run test
```

- Full verification gate:

```bash
npm run verify
```

- Production build:

```bash
npm run build
```

- Start production server:

```bash
npm run start
```

## Seed Contents

- 1 challenge: **Restaurant Water Waste Reduction** (El Paso)
- Measurable goal: reduce water usage by 10% in 45 days
- 2 vendors
- 2 matches
- 1 active pilot with KPI baseline/target/current
- Document checklist records
- Budget + ROI sample
