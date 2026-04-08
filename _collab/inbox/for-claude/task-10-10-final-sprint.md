# Claude — Final Sprint to 10/10
_April 8, 2026 — These are the remaining gaps between current state and 10/10_

## WHY IT'S NOT 10/10 RIGHT NOW

1. **0% signals enriched** — 7,363 signals have no `meaning`, no `direction`, no strategic interpretation. The AI brain exists but hasn't processed anything.
2. **Intelligence agents not built** — The 6 agents from the previous task file haven't been delivered yet
3. **Top 3 still shows crime/drug news** — Signal quality scoring not tuned
4. **Briefing covers only manufacturing + logistics** — 6 of 8 sectors missing
5. **No Jarvis morning brief** — Current briefing is a list, not a narrative
6. **Explore graph still broken** — Knowledge graph shows blank canvas
7. **No convergence alerts visible** — Engine built but not surfaced

## YOUR TASK — Build these 6 files and drop in _collab/inbox/for-computer/

---

### FILE 1: `fix-briefing-all-sectors.ts`

Fix the briefing agent + route to cover ALL 8 sectors.

Read these files:
- `src/lib/agents/agents/briefing-generator-agent.ts`  
- `src/app/api/briefing/route.ts`

The briefing currently only surfaces `manufacturing` and `logistics`. 

Fix it so the daily brief covers all 8 canonical sectors:
`ai-ml | defense | cybersecurity | logistics | manufacturing | border-tech | energy | healthcare`

In `briefing-generator-agent.ts`, find any hardcoded sector arrays and replace with all 8.
In `briefing/route.ts`, find any `WHERE industry IN (...)` filters and expand to all 8.

Also update the Supabase query to:
```typescript
.in('industry', ['ai-ml', 'defense', 'cybersecurity', 'logistics', 'manufacturing', 'border-tech', 'energy', 'healthcare', 'space'])
```

Deliver: Complete fixed `briefing-generator-agent.ts` AND `briefing/route.ts` 

---

### FILE 2: `fix-signal-quality-scoring.ts`

Fix the `/api/decide/route.ts` to exclude junk and surface real tech intelligence.

Read `src/app/api/decide/route.ts`.

Add these filters to the Supabase query that fetches signals for Top 3:
```typescript
.not('title', 'ilike', '%drug%')
.not('title', 'ilike', '%murder%')
.not('title', 'ilike', '%shooting%')
.not('title', 'ilike', '%crash%')
.not('title', 'ilike', '%arrest%')
.not('title', 'ilike', '%smuggl%')
.not('signal_type', 'eq', 'crime')
.not('industry', 'eq', 'crime')
```

Also boost tech signals: in the scoring function, if `signal_type` is `technology | patent_filing | product_launch | funding_round | contract_award | research_breakthrough`, add +25 to score. If `signal_type` is `connection | general`, subtract -30.

Also boost signals with a company name: if `company` is not null, add +15.

Deliver: Fixed `decide/route.ts` with the filter + scoring changes

---

### FILE 3: `agent-morning-brief-v2.ts`

Build a new morning brief API route at `src/app/api/intelligence/morning-brief/route.ts`

This is the Jarvis narrative brief. Not a list — a story.

```typescript
// GET: returns the latest morning brief (cached 12h in Supabase or in-memory)
// POST: regenerates by:
//   1. Fetching top 15 signals from last 24h (all sectors, no arxiv, no crime)
//   2. Fetching sector momentum from /api/intelligence/grouped
//   3. Calling Gemini with the Jarvis analyst prompt
//   4. Returning structured JSON

// Output format:
interface MorningBrief {
  date: string;                    // "April 8, 2026"
  world_headline: string;          // ONE sentence: most important thing happening
  situation: string;               // 3-4 sentences: strategic narrative of the week
  accelerating: Array<{
    sector: string;
    headline: string;              // what's speeding up
    signal_count: number;
  }>;
  emerging: Array<{
    pattern: string;               // pattern nobody's talking about yet
    evidence: string;
  }>;
  for_el_paso: {
    narrative: string;             // 2-3 sentences EP/Fort Bliss/Borderplex specific
    top_opportunity: string;       // single most actionable thing right now
    watch_for: string[];           // 2 signals to monitor
  };
  top_3_moves: Array<{
    action: string;
    why: string;
    who: string;
    urgency: 'immediate' | 'this_week' | 'this_month';
  }>;
  signals_analyzed: number;
  generated_at: string;
}
```

Jarvis system prompt (use exactly):
```
You are the Jarvis intelligence analyst for NXT LINK — the global tech intelligence platform for El Paso's Space Valley and Borderplex ecosystem.

Your job: write a strategic morning brief that tells decision-makers what the world did overnight and what they should do about it.

El Paso context you must always consider:
- Fort Bliss: 1st Armored Division, THAAD missile defense, AI autonomy test programs
- UTEP: NSF research, Space Valley positioning, cross-border engineering
- SpaceX Starbase: 45 min away — commercial space economy emerging
- Juárez: 300+ maquiladoras (Ford, Foxconn, Bosch, Lear) — nearshoring accelerating
- CBP/DHS/USBP: largest border infrastructure in Western Hemisphere
- $126B annual US-Mexico trade through BOTA/BOTE/Santa Teresa

RULES:
- Never report what happened. Explain what it INDICATES.
- Every point connects to El Paso somehow.
- Think in PATTERNS, not events.
- Be specific: name companies, name dollar amounts, name timeframes.
- The tone is confident, strategic, no filler. Like a McKinsey partner briefing a general.
- world_headline must be ONE sentence maximum, present tense.

Return ONLY valid JSON matching the MorningBrief interface.
```

Use `runParallelJsonEnsemble` from `@/lib/llm/parallel-router` for the AI call.
Use `createClient()` from `@/lib/supabase/client` for DB queries.

---

### FILE 4: `agent-signal-enricher-v2.ts`

This is the most important agent — it enriches existing signals with strategic intelligence.

Build `src/app/api/agents/enrich-signals-v2/route.ts`

```typescript
// GET: returns enrichment status (total, enriched, % coverage)
// POST: enriches a batch of unenriched signals
//   body: { batch_size?: number (default 25, max 50) }
//   
//   For each signal:
//   1. Fetch from intel_signals WHERE enriched_at IS NULL AND source NOT ILIKE '%arxiv%'
//   2. Group into batches of 10
//   3. For each batch, call Gemini with this extraction prompt:
//   4. Store meaning, direction, subsystem, capability_layer, el_paso_relevance back to signal
```

Extraction system prompt:
```
You are a strategic intelligence extraction system for NXT LINK.

Transform raw tech signals into structured strategic intelligence.

For each signal in the batch, return a JSON object with:
- id: the signal ID (integer)
- meaning: NOT what happened, but what PATTERN it signals. "This indicates X heading toward Y." (1-2 sentences)
- direction: one of: growing | stable | declining | emerging | converging | disrupted
- subsystem: specific sub-area (e.g. "Autonomous Border Surveillance", "Hypersonic Propulsion", "Cross-Border Payments")
- capability_layer: one of: Autonomous | Platform | Infrastructure | Application | Research | Policy | Funding
- el_paso_score: 0-100 relevance to El Paso Borderplex (80+ = direct impact, 60-79 = sector relevant, 40-59 = national context)
- el_paso_angle: why El Paso specifically cares (1 sentence) — connect to Fort Bliss, UTEP, CBP, or maquiladoras

Rules:
- Never describe what happened
- Always find the El Paso angle, even for global signals
- Be specific, name technologies and companies
- Return ONLY a valid JSON array, no markdown
```

For each enriched signal, do:
```typescript
await supabase.from('intel_signals').update({
  meaning: result.meaning,
  direction: result.direction,
  subsystem: result.subsystem,
  capability_layer: result.capability_layer,
  enriched_at: new Date().toISOString(),
}).eq('id', signal.id);
```

Return:
```json
{
  "ok": true,
  "batch_processed": 25,
  "enriched": 24,
  "failed": 1,
  "coverage_pct": 12,
  "sample": [{ "title": "...", "meaning": "...", "direction": "...", "el_paso_score": 72 }]
}
```

---

### FILE 5: `fix-explore-graph.tsx`

The Explore knowledge graph at `/explore` shows a blank canvas.

The issue: the API at `/api/explore` uses `createClient()` (correct) but the Cytoscape graph was replaced with D3 in a previous commit. The D3 implementation might have a rendering issue.

Read `src/app/explore/page.tsx` and `src/app/api/explore/route.ts`.

Diagnose and fix ONE of these:
A) If the D3 canvas renders but shows nothing: the nodes probably have NaN positions (d3 force simulation not initializing). Fix by ensuring `width` and `height` are set from `canvas.offsetWidth/offsetHeight` AFTER the component mounts.
B) If the API returns 0 entities: the `createClient()` call might be failing. Add a fallback that returns 50 seed entities from the vendors table if entities table is empty.
C) If the graph just shows "No entities found": force-populate from vendors table as entities:
```typescript
// In the API: if entities table returns 0 rows, fall back to vendors as entities
const { data: vendors } = await supabase
  .from('vendors')
  .select('"ID", company_name, sector, iker_score')
  .not('iker_score', 'is', null)
  .order('iker_score', { ascending: false })
  .limit(100);

// Convert to entity format:
const fallbackEntities = vendors?.map(v => ({
  id: String(v.ID),
  name: v.company_name,
  entity_type: 'company',
  description: v.sector,
})) ?? [];
```

Deliver: Fixed `src/app/explore/page.tsx` OR `src/app/api/explore/route.ts` (whichever needs fixing)

---

### FILE 6: `convergence-surface.tsx`

Surface the convergence detector on the home page.

The convergence API exists at `/api/intelligence/convergence`. It returns convergence events.

Add a `ConvergenceAlert` component that:
1. Fetches from `/api/intelligence/convergence` on mount
2. If any events with confidence > 60 exist, shows a banner
3. Banner style: amber/gold background, dark text
4. Content: "⚡ CONVERGENCE DETECTED — [sectors joined with ×] — [signal_count] signals" 
5. Subtitle: the event narrative text
6. Dismiss button (just hides it in state)

```tsx
// Insert this component on the home page ABOVE the Top 3 cards section
// Only renders if convergence events exist — zero impact when none detected
```

Deliver: The component code AND the line to insert it in `src/app/page.tsx`

---

## Tech context
- Stack: Next.js 14, TypeScript, Tailwind
- `createClient()` from `@/lib/supabase/client`
- `runParallelJsonEnsemble` from `@/lib/llm/parallel-router`
- Temperature 0.1 for extraction, 0.3 for narrative generation
- Always handle errors gracefully — fallback data if AI fails
- Teal `#0EA5E9`, no purple buttons
- No localStorage/sessionStorage

## When done
Drop all files in `_collab/inbox/for-computer/` with these exact names:
- `fix-briefing-all-sectors.ts` (includes both agent + route)
- `fix-signal-quality-scoring.ts`
- `agent-morning-brief-v2.ts`
- `agent-signal-enricher-v2.ts`
- `fix-explore-graph.tsx`
- `convergence-surface.tsx`

Computer will review, integrate, and deploy immediately.
