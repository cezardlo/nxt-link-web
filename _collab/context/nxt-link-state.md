# NXT LINK — Current Platform State
_Last updated: 2026-04-07 by Perplexity Computer_

---

## What the Platform Is

NXT LINK is a technology intelligence platform for El Paso's Space Valley / U.S.-Mexico Borderplex ecosystem.
It reads global signals (news, patents, research, government contracts, startups) across 8 sectors,
connects the dots between them, and tells El Paso operators what matters and what to do next.

**Owner:** César / Next Link Solutions LLC  
**Live site:** https://nxt-link-web.vercel.app  
**GitHub:** https://github.com/cezardlo/nxt-link-web  
**Stack:** Next.js 14 App Router · TypeScript · Tailwind · Supabase (Postgres) · Gemini AI  
**Supabase project ID:** yvykselwehxjwsqercjg  

---

## Database — What's Alive

| Table | Rows | Status |
|-------|------|--------|
| intel_signals | 10,415 | Active — cron feeds daily |
| entities | 3,575 | Populated |
| entity_relationships | 3,953 | Populated |
| vendors | 442 | Active, IKER scored |
| products | 1,041 | Populated |
| signal_clusters | 494 | Active |
| daily_briefings | 12 | Cron runs daily at 6am UTC |
| kg_companies | 209 | Populated |
| kg_technologies | 64 | Populated |
| kg_discoveries | 973 | Populated |
| **patents** | **0** | **EMPTY — not yet populated** |
| **companies** | **0** | **EMPTY** |
| **opportunities** | **0** | **EMPTY** |
| top_insights | 3 | Static, stale since Apr 5 |
| causal_chains | 6 | Too few — needs expansion |
| decision_log | 1 | Barely used |

---

## Pages — What Works vs What's Broken

| Page | URL | Status |
|------|-----|--------|
| Home / Mission Control | / | Works — loads Top 3, search bar, stats |
| Briefing | /briefing | Works — full daily brief with AI analysis |
| Signal Desk | /intel | **BROKEN — shows 0 signals** |
| Brain Map | /map | Works — 6 place clusters, EP visible |
| Vendors | /vendors | Works — 442 vendors, filterable |
| Industries | /industry | Partially works — cards load, bottom skeletons frozen |
| Explore | /explore | **BROKEN — knowledge graph renders as black canvas** |
| Solve | /solve | Works — same engine as home + causal graph |
| Products | /products | Likely works |
| Command | /command | Redirects to /map |

---

## Known Data Quality Issues

1. **arXiv contamination** — 2,932 arXiv academic papers (28%) misclassified as manufacturing/funding events
2. **Industry taxonomy broken** — `ai-ml`, `artificial intelligence`, `tech`, `technology` are all separate buckets  
3. **Briefing only covers manufacturing + logistics** — Defense, AI, Cybersecurity never appear
4. **El Paso specific signals = 0.4%** — only ~40 of 10,415 signals are tagged El Paso
5. **"Top Company: Before"** — bad data showing through to Briefing page

---

## Daily Cron Schedule (Vercel)

| Time (UTC) | Job |
|------------|-----|
| 6:00am | intel-discovery agent |
| 7:00am | assembly/run |
| 9:00am | vendor-pipeline agent |
| 10:00am | brain/sync/cron |

---

## Active AI Systems Inside NXT LINK

- **Gemini** (current) — used in /api/decide, /api/briefing for explanation layer
- **Claude** (target) — should replace/augment Gemini for intelligence quality
- 40+ agents in /src/lib/agents/ — most built but not regularly triggered

---

## The 7-Layer Intelligence Loop

1. **Ingest** → 25+ RSS/API sources → intel_signals table ✓
2. **Classify** → signal_type, industry, region tagging ⚠️ (taxonomy broken)
3. **Cluster** → signal_clusters + cluster_signals ✓
4. **Reason** → causal_chains templates ⚠️ (only 6 templates)
5. **Narrate** → Gemini generates plain-English explanations ✓
6. **Surface** → pages show users the intelligence ⚠️ (2/9 pages broken)
7. **Learn** → decision_log tracks outcomes ✗ (barely used)
