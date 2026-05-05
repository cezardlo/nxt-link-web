# AGENTS.md — nxtlink shared playbook

This file is the handoff document for any AI agent (Claude Code, Codex, etc.)
picking up work on the nxtlink web repo. Read this before doing anything.
Keep it up to date as you ship changes — append to the **Recent changes**
section, prune what's stale.

---

## What this project is

**nxtlink** — a global tech-vendor catalog. Cesar (the owner) is non-technical;
build for that. The headline page is `/vendors`, a directory of ~7,300+
classified tech companies organised into 13 industry tiles.

The repo also contains an "El Paso industrial intelligence" layer
(`src/lib/intelligence/*`, `src/app/api/brain/*`, the agents under
`src/lib/agents/`) — that work pre-dates the catalog focus. Treat it as
present but not the active surface unless Cesar explicitly asks.

## Live URLs (bookmark these)

- **Production site:** https://nxt-link-web.vercel.app
- **Catalog page:** https://nxt-link-web.vercel.app/vendors
- **Admin panel** (gated by AccessGate, password `4444`): https://nxt-link-web.vercel.app/admin
- **GitHub repo:** https://github.com/cezardlo/nxt-link-web (default branch `master`, not `main`)
- **Supabase dashboard:** https://supabase.com/dashboard/project/yvykselwehxjwsqercjg
- **GitHub Actions:** https://github.com/cezardlo/nxt-link-web/actions

## Catalog state (as of last update)

| Stat | Value |
|---|---|
| Total rows in `vendors` | 14,261 |
| Marked `status='duplicate'` | 514 |
| Marked `status='junk'` | 1,561 |
| Visible in catalog | ~7,300 |
| YC vendors | 4,041 |
| Industry tiles | 13 + Other catch-all |

YC distribution after expanding to 13 tiles:
AI/ML (2,120), Healthcare (517), Fintech (462), Consumer (414),
Manufacturing (296), Real Estate (98), Education (86), Defense (31), Other (17).

## Active 13-industry taxonomy

Defined in `src/lib/data/technology-catalog.ts` `INDUSTRIES`:

`ai-ml`, `cybersecurity`, `defense`, `border-tech`, `manufacturing`,
`energy`, `healthcare`, `logistics`, `fintech`, `consumer`, `real-estate`,
`education`, `media`. Plus an implicit `Other` bucket for unclassified rows.

The `vendors.sector` column stores the **label** (e.g. `"Fintech"`), not the
slug. The mapping from label ↔ slug ↔ raw scraped sector is in
`src/lib/data/sector-mapping.ts`. The catalog API normalises everything
through that.

## Vendor data sources

| Source | Mechanism | Status |
|---|---|---|
| YC companies | `/api/admin/import-yc` pulls from YC's public Algolia | Live, ~5,800 fetched, 4,041 inserted |
| Conference exhibitor scrapes | Pre-existing `scraped_v1` rows | Static, 10k+ rows of mixed quality |
| (TODO) GitHub orgs | Not built | Was floated then deferred |
| (TODO) Product Hunt, Crunchbase | Not built | — |

## Admin endpoints (all under `/api/admin/`)

All accept `POST` (cron + curl) or `GET` (browser). Auth: either the
`x-cron-secret` header matching `CRON_SECRET` env, OR an `x-access-code`
header matching `PRIVATE_ACCESS_CODE` (currently `'4444'` in
`src/lib/privateAccess.ts`). The `/admin` browser page sends the access
code automatically.

| Endpoint | What it does | Cron |
|---|---|---|
| `clean-junk` | Marks junk-name rows as `status='junk'`; blanks junk descriptions; decodes HTML entities. Heuristics in `src/lib/vendors/junk-detector.ts`. | 14:20 UTC daily |
| `dedup-vendors` | Groups by normalised URL via `src/lib/vendors/normalize-url.ts`, marks lower-quality copies as `status='duplicate'`. | 14:30 UTC daily |
| `import-yc` | Pulls all YC companies via Algolia batch facets; inserts new ones with `source='yc' status='active'`; also re-classifies existing YC rows when sector/country drift. | Mondays 15:00 UTC |

Plus a Python mirror at `scripts/python/run_catalog_jobs.py` and a
GitHub Actions workflow at `.github/workflows/catalog-jobs.yml` that
runs the Python version daily at 03:30 UTC.

## Catalog API surface

`/api/vendors` (`src/app/api/vendors/route.ts`):
- Hides rows with `status IN ('duplicate', 'junk')` by default.
- Hides rows with no URL **and** no description (override with `?include_unverified=true`).
- Aggregates the `sector` facet into the 13 canonical industries (+ Other).
- Accepts a canonical-industry name in `?sector=` and expands it server-side
  to the underlying raw sector strings via `industryToRawSectors()`.

`/api/vendors/route.ts` is also the source of truth for the catalog page;
don't add filtering anywhere else.

## Known schema quirks

The `vendors` table has TWO id columns (this is historical):
- `id` (text, NOT NULL, no default) — used by all UI links (`/vendor/<id>`).
  YC inserts use `crypto.randomUUID()`. Pre-existing rows use short hex hashes.
- `ID` (bigint, NOT NULL, no default) — legacy numeric id. New inserts read
  `MAX("ID")` and increment.

The `/vendor/[id]` page tries the text `id` first, then falls back to numeric
`ID` if the URL is purely digits. Don't break either path.

`status` values currently in use: `discovered` (default scrape), `active`
(curated/promoted, including all YC), `approved`, `duplicate`, `junk`,
sometimes `pending`. Don't repurpose any of these.

`source` values: `yc`, `scraped_v1`, `phase1a_no_match`, `null`. Used by
import-yc and clean-junk to scope which rows to touch.

## Required env vars (Vercel + GitHub)

| Var | Where | What for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + GH | Read access |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | Anon read fallback |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + GH | Admin endpoint writes |
| `CRON_SECRET` | Vercel | Optional — needed only for scheduled cron auth |
| `YC_ALGOLIA_*` | Optional | Override defaults if YC keys rotate |

`SUPABASE_SERVICE_ROLE_KEY` was added on 2026-05-04 — don't repaste it. If
`/api/health` reports `set: false`, the deploy hasn't picked up env yet —
trigger a redeploy.

## Local dev caveats

- **Node is not installed** on Cesar's Windows machine. Don't suggest
  `npm run typecheck` / `npm run dev` workflows. Push to GitHub, let Vercel
  build, verify via PowerShell `Invoke-WebRequest` against the live URL.
- **Git identity is not configured.** Pass per-commit:
  `git -c user.email="delaocesar65@gmail.com" -c user.name="cezardlo" commit ...`
  Don't modify `.gitconfig` globally.
- **Default branch is `master`**, not `main`.
- The Vercel/Claude Code permission hook blocks **direct prod-data writes**
  via the Supabase MCP, even after AskUserQuestion confirmation. Workaround:
  build server-side endpoints that run on Vercel and call them externally.

## How to resume work in a fresh session

1. Read this file. Read the latest 5–10 commits: `git log --oneline -10`.
2. Hit `https://nxt-link-web.vercel.app/api/health` to confirm env vars set.
3. If picking up a specific change: check the **Recent changes** section
   below for the most recent task; the conversation context is gone but
   the commits + this file should give you what you need.
4. Cesar communicates in plain English. He's non-technical. Don't dump
   jargon. Offer concrete buttons / URLs / single-line commands.
5. Auto mode is usually active — prefer action over planning, push fixes,
   verify via live API rather than asking for confirmation on routine work.

## Recent changes log

(Newest first. Append a one-liner per significant push. Prune anything more
than ~30 entries old to keep the file scannable.)

- 2026-05-05 `eda528b` — Added Fintech, Consumer, Real Estate, Education,
  Media tiles (8 → 13 industries). Reclassified 1,060 YC rows out of "Other"
  into the right new tile. Added junk-description detector + HTML entity
  decoder; first run blanked 483 junk descriptions and decoded 103.
- 2026-05-05 `51e50bd` — GitHub Actions workflow `catalog-jobs.yml` runs the
  Python script in the cloud (no local Python install needed).
- 2026-05-05 `f5d3f21` — Expanded `scripts/python/requirements.txt` from
  one package to ~57 (broad data/AI/scraping toolkit).
- 2026-05-05 `966e0f4` — Added `scripts/python/run_catalog_jobs.py` —
  Python mirror of the three admin endpoints. README + .env.example.
- 2026-05-05 `a577c58` — `/api/admin/clean-junk` endpoint + heuristics in
  `src/lib/vendors/junk-detector.ts`. Catches mid-sentence text fragments,
  JS variable names, sponsor template URLs, etc. First run marked 1,561
  rows `status='junk'`.
- 2026-05-05 `69f5f04` — Tightened YC industry classifier — drop the
  description-blob keyword fallback that was mis-tagging Stripe/Airbnb as
  AI/ML. Trust YC's structured industry/industries fields only.
- 2026-05-05 `057535a` — YC import gained an UPDATE pass that re-classifies
  existing `source='yc'` rows when sector or country drift. Country now
  pulled from `regions[0]`, not `country` (which YC leaves empty).
- 2026-05-05 `97b8dc2` — `/admin` browser page with three Run-Now buttons
  for the admin endpoints. Gated by AccessGate password `4444`.
- 2026-05-05 `3beac82` — First admin endpoints (`dedup-vendors`,
  `import-yc`) + Vercel cron config for nightly automation.
- 2026-05-04 `01ea789` — Sector translation layer in
  `src/lib/data/sector-mapping.ts` maps the ~200 raw scraped sector strings
  to the 8 canonical slugs. Catalog API aggregates facets under canonical
  labels.
- 2026-05-04 `b1cb8c5` — Fixed `/vendor/[id]` profile page lookup
  (was always 404'ing because cards link by text id but page queried
  numeric ID).
- 2026-05-04 `f8b3759` — Hide IKER score everywhere it would render an
  empty placeholder.
- 2026-05-04 `67aa69b` — Catalog API hides rows with no URL and no
  description by default.
- (Earlier 2026-04 history is in git — see `HANDOFF.md` in the repo root
  for the pre-catalog-focus phase.)

## Open TODO

- **`CRON_SECRET` env var** — not yet added to Vercel. Without it, the
  Vercel cron jobs can't authenticate. Manual `/admin` button clicks work
  regardless. Cesar can add any random string.
- **Empty industry tiles** — Cybersecurity (3), Border Tech (0), Energy
  (0) have very few YC matches. Adding GitHub orgs / Product Hunt /
  Crunchbase would diversify.
- **Pre-existing `scraped_v1` rows still have shape issues** — mismatched
  URLs (e.g. `lift.io` labelled "i-Lift Equipment Ltd."), bare names with no
  description. The junk filter caught the obvious garbage; subtler cases
  remain. Diminishing returns; leave alone unless asked.
- **Profile pages are thin for YC vendors** — name + description + website,
  but the Products and Latest-Intelligence sections are empty. Would need
  a separate enrichment job to populate.

## Conventions

- Commit messages: imperative ("Add X", "Fix Y"). Co-authored line at the
  bottom — current style:
  `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- One concern per commit. Bundle tightly related changes (e.g. an endpoint
  + the page button that triggers it).
- Push to `master` only after live verification via PowerShell. Vercel
  auto-deploys. Don't force-push.
- Add new endpoints under `/api/admin/*` if they need write access. Use
  `requireCronSecret` + access-code fallback (see `dedup-vendors/route.ts`
  for the pattern).
- Add new buttons to `/admin/page.tsx` `JOBS` array — auto-renders.

---

Last touched: 2026-05-05.
