# NXT LINK — Active Sprint
_Last updated: 2026-04-07_

---

## 🔴 P1 — Critical (Do These First)

### [COMPUTER] Fix Signals page — 0 signals showing
- **File:** `src/app/intel/page.tsx` + `src/app/api/intel-signals/route.ts`
- **Problem:** /intel page shows "0 visible signals, 0 total tracked, 0% confidence"
- **Fix:** Wire the page to `intel_signals` table. Add `WHERE source NOT ILIKE '%arxiv%'`
- **Status:** Pending

### [COMPUTER] Kill arXiv contamination at the query level
- **Files:** All routes that query `intel_signals`
- **Problem:** 2,932 arXiv papers (28%) pollute every count, cluster, and trend
- **Fix:** Add `AND source NOT ILIKE '%arxiv%'` to every signal SELECT
- **Status:** Pending

### [CLAUDE] Expand daily briefing to all 8 sectors
- **File:** `src/lib/agents/agents/briefing-generator-agent.ts`
- **Problem:** Briefing only shows manufacturing + logistics. Defense, AI, Cybersecurity, Border-Tech never appear.
- **Fix:** Rewrite sector selection logic to include all 8 dynamic_industries
- **Deliver to:** `_collab/inbox/for-computer/agent-briefing-generator-v2.ts`

### [CLAUDE] Fix industry taxonomy — write normalizer
- **Problem:** `ai-ml`, `artificial intelligence`, `tech`, `technology` = 4 separate buckets
- **Fix:** Write a TypeScript utility + SQL migration that normalizes to 8 canonical industries
- **Deliver to:** `_collab/inbox/for-computer/fix-taxonomy.ts` + `fix-taxonomy.sql`

---

## 🟡 P2 — High

### [COMPUTER] Fix Explore graph — black canvas
- **File:** `src/app/explore/page.tsx`
- **Problem:** Cytoscape.js renders as solid black rectangle
- **Fix:** Debug initialization, verify `/api/explore` returns data
- **Status:** Pending

### [COMPUTER] Fix nav inconsistency
- **Problem:** 3 competing nav systems. Home quick-nav != DockNav items
- **Fix:** Align all nav to single source of truth in `src/lib/data/nav.ts`
- **Status:** Pending

### [CLAUDE] Write 10+ new causal chain templates
- **File:** `src/lib/engines/signal-connections-engine.ts` or `causal-engine.ts`
- **Problem:** Only 6 templates. Most signals fall to generic fallback.
- **Needed:** Defense, AI/ML, Cybersecurity, Border-Tech, Energy, Space causal chains
- **Format:** Same structure as existing templates in `src/lib/causal-engine.ts`
- **Deliver to:** `_collab/inbox/for-computer/causal-chains-v2.ts`

### [CLAUDE] New insight_generator_agent — plain English for El Paso
- **File:** New agent at `src/lib/agents/agents/insight-generator-agent.ts` (overwrite)
- **Problem:** top_insights table has 3 static rows from Apr 5. Not regenerating.
- **Fix:** Agent reads signal_clusters, finds cross-sector patterns, writes "why this matters for El Paso"
- **Deliver to:** `_collab/inbox/for-computer/agent-insight-generator-v2.ts`

---

## 🟢 P3 — Medium

### [COMPUTER] Replace emoji quick-nav with Lucide icons
- **File:** `src/app/page.tsx` — QUICK_NAV array
- **Fix:** Import icons from lucide-react, replace emoji strings

### [COMPUTER] Fix Vendors button color (purple → teal)
- **File:** `src/app/vendors/page.tsx`

### [COMPUTER] Fix Industries page — bottom skeletons never resolve

### [CLAUDE] Claude API integration in /api/decide
- Swap Gemini for Claude in the `why_el_paso` and `what_to_do` generation
- **Deliver to:** `_collab/inbox/for-computer/prompt-decide-claude.md`

---

## ✅ Completed
_Nothing yet — sprint started 2026-04-07_
