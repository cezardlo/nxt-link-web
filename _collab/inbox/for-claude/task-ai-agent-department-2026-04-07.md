# Claude — Build the NXT LINK AI Agent Department
_Full sprint — April 7, 2026 — Make it world-class_

The mission: build the complete AI brain for NXT LINK.
Every signal gets enriched. Every sector gets a trajectory. Every question gets a Jarvis answer.

Stack: Next.js 14, TypeScript, `createClient()` from `@/lib/supabase/client`, `runParallelJsonEnsemble` from `@/lib/llm/parallel-router`
Drop files: `_collab/inbox/for-computer/` with exact filenames below.

---

## AGENT 1 — Signal Enrichment Engine (MOST IMPORTANT)
**File:** `_collab/inbox/for-computer/agent-signal-enricher.ts`

Batch enriches intel_signals with:
- `meaning`: strategic interpretation (not description)
- `direction`: growing|declining|emerging|converging|stable
- `subsystem`: specific sub-area
- `capability_layer`: Autonomous|Platform|Infrastructure|Application|Research|Policy
- `el_paso_relevance_score`: 0-100
- `el_paso_angle`: why EP cares specifically

System prompt (use exactly):
```
You are the intelligence extraction core for NXT LINK.

Transform raw tech signals into strategic intelligence for El Paso / Borderplex operators.

El Paso context:
- #1 US-Mexico trade corridor — $126B annually through BOTA/BOTE ports
- Fort Bliss: 1st Armored Division, THAAD missile defense, AI/autonomy test site
- UTEP: NSF grants, cross-border engineering, Space Valley research
- SpaceX Starbase: 45 min away — commercial space economy emerging
- 300+ Juárez maquiladoras: Ford, Foxconn, Bosch, Lear, Foxconn
- CBP/DHS/ICE border infrastructure — largest in Western Hemisphere
- El Paso = Space Valley test corridor positioning

RULES:
1. NEVER describe what happened. Explain what it INDICATES.
   BAD: "Company raised $500M"
   GOOD: "This marks autonomous logistics crossing the commercialization threshold — window closing for early adopters"
2. Every signal has a Borderplex angle. Find it even if it's global.
3. Direction choices: growing=more activity/investment, declining=less, emerging=brand new and accelerating, converging=two sectors merging, stable=normal baseline
4. El Paso relevance 0-100: 80+ = direct EP impact, 60-79 = regional impact, 40-59 = sector relevant, 20-39 = national context, 0-19 = background
5. Be specific. Name companies, technologies, dollar amounts, timeframes.

Return ONLY valid JSON array. No markdown.
```

Function signature:
```typescript
export async function enrichSignals(signalIds: string[]): Promise<{
  enriched: number;
  errors: number;
  sample: Array<{ title: string; meaning: string; direction: string; ep_score: number }>;
}>
```

Process in batches of 10. For each batch:
1. Fetch from intel_signals WHERE id IN (signalIds) AND source NOT ILIKE '%arxiv%'
2. Call Gemini with the system prompt + batch of signals (title + evidence + industry + signal_type)
3. Parse JSON response array
4. Update each signal in Supabase with meaning, direction, subsystem, capability_layer, meaning, enriched_at

Also export `enrichUnenrichedSignals(limit = 50)` that auto-picks unenriched signals.

---

## AGENT 2 — Sector Trajectory Engine
**File:** `_collab/inbox/for-computer/agent-sector-trajectory.ts`

Analyzes the last 30 days of enriched signals per sector and generates:
- 30-day trajectory prediction
- 90-day forecast
- Key drivers
- Risks
- El Paso opportunities
- What to watch

```typescript
export interface SectorTrajectory {
  sector: string;
  label: string;
  momentum_score: number;        // -100 to +100
  momentum_direction: string;    // accelerating | stable | slowing | emerging | disrupted
  signal_count_7d: number;
  signal_count_30d: number;
  velocity_change_pct: number;   // % change week over week
  
  // AI-generated intelligence
  situation: string;             // 2-3 sentences: what's happening in this sector globally
  trajectory_30d: string;        // Where this is heading in 30 days
  trajectory_90d: string;        // Where this is heading in 90 days
  key_drivers: string[];         // What's driving momentum (3-5 items)
  risks: string[];               // What could reverse the trajectory
  
  // El Paso specific
  ep_opportunities: string[];    // Specific opportunities for Borderplex (3 items)
  ep_companies_to_watch: string[]; // Companies active in this sector + EP angle
  ep_action: string;             // One specific action for an EP operator this week
  
  // Data
  top_signals: Array<{ title: string; meaning: string; date: string }>;
  top_companies: string[];
  generated_at: string;
}

export async function generateSectorTrajectory(sector: string): Promise<SectorTrajectory>
export async function generateAllSectorTrajectories(): Promise<SectorTrajectory[]>
```

Store results in a `sector_trajectories` table or as a JSON in Supabase storage.
Cache for 24 hours.

---

## AGENT 3 — El Paso Intelligence Writer
**File:** `_collab/inbox/for-computer/agent-ep-intelligence.ts`

Generates the "Why El Paso Cares" narrative for any signal, sector, or company.

```typescript
export async function writeEPIntelligence(input: {
  type: 'signal' | 'sector' | 'company' | 'discovery';
  title: string;
  context: string;
  industry: string;
}): Promise<{
  ep_angle: string;          // Why EP specifically cares (2-3 sentences)
  ep_entities: string[];     // Specific EP entities affected: Fort Bliss, UTEP, CBP, etc.
  ep_action: string;         // What an EP operator should do
  ep_score: number;          // 0-100 relevance score
  ep_timeline: string;       // When this becomes actionable for EP: immediate | 30d | 90d | watch
}>
```

The Jarvis EP prompt:
```
You are the El Paso / Borderplex intelligence specialist for NXT LINK.

Your job: explain why any global tech signal, company, or sector matters SPECIFICALLY to El Paso.

Never give generic answers. Always connect to:
- Fort Bliss (Army, THAAD, 1st Armored, AI/autonomy programs)
- UTEP (NSF research, Space Valley, cross-border engineering)
- CBP/DHS (border crossings, surveillance, trade compliance)
- Maquiladoras (Ford, Foxconn, Bosch, Lear in Juárez)
- $126B annual US-Mexico trade (BOTA, BOTE, Santa Teresa, Ysleta)
- SpaceX Starbase (45 min away, commercial space economy)
- Horizon City, Fort Bliss contractors, local defense industry

Score rubric:
80-100: Direct EP contract, institution, or company involved
60-79: Sector directly employs 1000+ EP residents
40-59: Technology relevant to EP's top 3 industries
20-39: National policy/funding that flows through EP
0-19: Background context, monitor only

Be specific. Name dollar amounts. Name contacts if you know them.
```

---

## AGENT 4 — Morning Brief v2 (Jarvis-Style Narrative)
**File:** `_collab/inbox/for-computer/agent-morning-brief-v2.ts`

Build a new morning brief API route at `src/app/api/intelligence/morning-brief/route.ts`

This replaces the current /api/briefing for the home page.

Output format:
```json
{
  "date": "April 8, 2026",
  "world_headline": "One sentence: the most important thing happening in global tech today",
  "situation": "3-4 sentence strategic narrative of what's happening globally this week",
  
  "accelerating": [
    { "sector": "AI/ML", "headline": "What's speeding up", "signal_count": 47, "key_driver": "why" }
  ],
  
  "emerging": [
    { "pattern": "Name the emerging pattern nobody's talking about yet", "evidence": "what signals indicate this" }
  ],
  
  "for_el_paso": {
    "narrative": "2-3 sentences specifically about El Paso / Fort Bliss / Borderplex",
    "top_opportunity": "The single most actionable thing right now",
    "watch_for": ["Signal 1 to monitor", "Signal 2 to monitor"]
  },
  
  "top_3_moves": [
    { "action": "Specific action", "why": "Why now", "who": "Named company or institution", "urgency": "immediate|this_week|this_month" }
  ],
  
  "signals_used": 0,
  "generated_at": ""
}
```

Build the full route with Supabase query + Gemini call + JSON response.

---

## AGENT 5 — Relationship Builder
**File:** `_collab/inbox/for-computer/agent-relationship-builder.ts`

Automatically builds knowledge graph relationships from new signals.

When a new signal comes in:
1. Find 5 most similar existing signals (by industry + company match)
2. Determine relationship: confirms | precedes | enables | threatens | same_sector_spike
3. Find matching entities in vendors table by company name
4. Upsert into entity_relationships table

```typescript
export async function buildRelationships(signalId: string): Promise<{
  relationships_created: number;
  entities_linked: number;
}>
```

---

## AGENT 6 — Convergence Detector
**File:** `_collab/inbox/for-computer/agent-convergence-detector.ts`

Detects when multiple sectors are co-moving (the "dots connecting" moment).

Checks every 6 hours:
1. Count signals per sector in last 24h vs previous 24h
2. Find sectors that both spiked >20% simultaneously
3. Check if those sectors share entity/technology relationships
4. If yes → convergence event

```typescript
export interface ConvergenceEvent {
  id: string;
  sectors: string[];           // e.g. ['ai-ml', 'defense', 'border-tech']
  headline: string;            // "AI × Defense × Border Tech: unusual co-movement"
  narrative: string;           // Why this convergence matters
  confidence: number;          // 0-100
  signal_count: number;
  ep_implication: string;      // What it means for El Paso specifically
  detected_at: string;
}

export async function detectConvergence(): Promise<ConvergenceEvent[]>
```

Store in `convergence_events` table. Return active events (last 7 days) via `GET /api/intelligence/convergence`.

---

## Also do this: `/api/intelligence/morning-brief/route.ts`
Build this as an actual Next.js route file:
- GET: returns latest morning brief (cached 12h)
- POST: regenerates morning brief using all agents

---

## Notes
- Use `createClient()` from `@/lib/supabase/client`
- Use `runParallelJsonEnsemble` from `@/lib/llm/parallel-router`
- Temperature 0.1 for structured extraction, 0.3 for narrative generation
- Always include fallback data if AI fails
- Process in chunks to avoid rate limits
- All files should be complete, working TypeScript with proper types

Drop all 6 files + the route file in `_collab/inbox/for-computer/`.
This is the most important code in the platform.
