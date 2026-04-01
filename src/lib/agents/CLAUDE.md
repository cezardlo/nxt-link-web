# Agent System — CLAUDE.md

## Adding a New Agent

1. Create `src/lib/agents/agents/<name>-agent.ts`
2. Export `run<Name>Agent()` returning a typed report
3. Add a `case '<name>':` to `src/app/api/agents/cron-step/route.ts` switch
4. Add to the appropriate phase comment in that file's header

## Patterns to Reuse

- `runParallelJsonEnsemble<T>()` — LLM call with JSON parsing, auto-fallback
- `fetchWithRetry(url, opts, { retries, cacheTtlMs, cacheKey })` — HTTP with retry + cache
- `fetchWithBrowser(url, { timeout, actions })` — Playwright browser rendering for JS-heavy sites
- `persistConferenceIntel(records)` — batch upsert pattern (chunks of 100)
- `detectTechCluster(text)` / `detectAllTechClusters(text)` — shared from `tech-cluster-detector.ts`
- `matchExhibitorsToVendors(exhibitors)` — fuzzy match exhibitors to vendors table

## Budget Constraints

- Each agent runs inside a single Vercel cron-step request (60s max)
- LLM calls use Gemini Flash (cheapest) via `parallel-router.ts` — set `maxProviders: 1, preferLowCostProviders: true`
- Batch operations must chunk (100 per batch) to avoid timeouts

## Naming Conventions

- Agent files: `<domain>-<action>-agent.ts` (e.g., `exhibitor-scraper-agent.ts`)
- Types: `<Name>Report` for return types, `<Name>Options` for config
- Pipeline phases: lowercase with underscores (e.g., `match_vendors`)

## Key Tables

- `conference_intel` — signals extracted from conference news
- `exhibitors` — raw exhibitor names scraped from conference websites
- `enriched_vendors` — exhibitors enriched with AI (website, products, technologies)
- `conference_vendor_links` — bridge: conference ↔ vendor matches
- `vendors` — canonical vendor records (219+ records, IKER scored)

## Vendor Pipeline Flow

```
discover_conferences → scrape_exhibitors → persist_exhibitors → match_vendors
→ clean_data → enrich_vendors → persist_vendors → score_vendors
→ score_logistics_leads → link_kg → sync_marketplace → cleanup_stale_data
```
