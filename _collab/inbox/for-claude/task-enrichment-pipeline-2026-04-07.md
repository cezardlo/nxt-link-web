# Claude — Build the World's Best Intelligence Enrichment Pipeline
_Written by Perplexity Computer — April 7, 2026_
_This is the most important build of the project. Make it exceptional._

---

## Vision

NXT LINK should be the world's best free intelligence enrichment system.
Every signal that enters the system gets:
- Structured extraction (what happened, who, where, what technology)
- Strategic meaning (not what happened — what it INDICATES)
- Relationship mapping (connected entities, related signals)
- El Paso relevance score (0-100, specific to the Borderplex)
- Direction classification (growing/declining/emerging/converging/stable)
- Sector normalization (canonical 8 sectors)
- Subsystem classification (specific sub-area within sector)
- Capability layer (what type of technology/capability this is)
- 30/90-day trajectory prediction (where this is heading)

---

## TASK 1 — The Intelligence Extraction Engine

**File:** `src/lib/intelligence/extraction-engine.ts`

This is the core AI brain. It takes a raw signal and returns rich structured intelligence.

```typescript
export interface ExtractedIntelligence {
  // Core classification
  industry: string;                    // canonical: ai-ml | defense | cybersecurity | logistics | manufacturing | border-tech | energy | healthcare | space | finance
  subsystem: string;                   // e.g. "Autonomous Border Surveillance", "Hypersonic Missile Defense"
  capability_layer: string;            // Autonomous | Platform | Infrastructure | Application | Research | Policy | Funding | Regulation
  signal_type_normalized: string;      // technology | product_launch | funding_round | contract_award | patent_filing | research_breakthrough | market_shift | partnership | regulation | acquisition

  // Intelligence layer
  meaning: string;                     // NOT what happened. What pattern this signals. "This indicates a shift toward..."
  direction: string;                   // growing | declining | emerging | converging | stable | disrupted
  trajectory_30d: string;              // Where this is heading in 30 days
  trajectory_90d: string;              // Where this is heading in 90 days

  // Importance
  importance: 'low' | 'medium' | 'high' | 'critical';
  importance_score: number;            // 0-100
  confidence: number;                  // 0-100 how confident in this extraction

  // El Paso intelligence
  el_paso_relevance: number;           // 0-100 relevance to Borderplex
  el_paso_angle: string;               // Why this matters to El Paso specifically
  el_paso_entities: string[];          // Specific EP entities affected: Fort Bliss, UTEP, BOTA, etc.
  el_paso_action: string;              // What an EP operator should do

  // Entity extraction
  companies_mentioned: string[];       // All companies in the signal
  technologies_mentioned: string[];    // All technologies mentioned
  locations_mentioned: string[];       // All locations mentioned

  // Tags
  tags: string[];                      // 3-7 keyword tags
}
```

**System prompt for extraction (make it exceptional):**
```
You are the intelligence extraction core for NXT LINK — the world's most sophisticated technology intelligence platform for the U.S.-Mexico Borderplex.

Your job: transform raw news/research/patent signals into structured strategic intelligence.

CONTEXT: El Paso / Borderplex
- #1 U.S.-Mexico trade crossing: $126B annually
- Fort Bliss: 1st Armored Division, THAAD missile defense, AI/autonomy test programs
- UTEP: NSF-funded research, cross-border studies, engineering programs  
- SpaceX Starbase: 45 minutes away — space economy emerging
- 300+ Juárez maquiladoras: Ford, Foxconn, Bosch, Lear Corporation
- CBP, DHS, ICE border infrastructure
- Space Valley positioning: El Paso as a technology test corridor

INSTRUCTIONS:
1. Extract the PATTERN not the event. "X raised money" becomes "Autonomous logistics is crossing the commercialization threshold — 3 funded competitors in 60 days signals the window is closing."
2. Always connect to El Paso. Every global signal has a Borderplex angle. Find it.
3. Think in trajectories. Where is this heading in 30 days? 90 days?
4. Be specific. Name companies. Name technologies. Name dollar amounts.
5. Importance scoring: critical = affects multiple sectors or directly impacts Borderplex. high = single sector shift with EP angle. medium = relevant to 1 sector. low = background noise.

Return ONLY valid JSON matching the ExtractedIntelligence interface.
```

Write the full TypeScript function:
```typescript
export async function extractIntelligence(signal: RawSignal): Promise<ExtractedIntelligence>
```

Uses `runParallelJsonEnsemble` from `@/lib/llm/parallel-router`.

---

## TASK 2 — The Relationship Builder

**File:** `src/lib/intelligence/relationship-builder.ts`

After extraction, this engine finds connections between signals and builds the knowledge graph automatically.

```typescript
export interface SignalRelationship {
  signal_id_a: string;
  signal_id_b: string;
  relationship_type: string;   // 'confirms' | 'contradicts' | 'precedes' | 'follows' | 'enables' | 'threatens' | 'competes_with' | 'same_company' | 'same_sector_spike'
  strength: number;            // 0-100
  explanation: string;         // Why these signals are connected
}
```

Logic:
1. For each new signal, find the 10 most similar signals (by industry + subsystem + companies_mentioned)
2. Use AI to determine the relationship type between them
3. Store in `entity_relationships` table

Also:
- If a new signal mentions a company already in the `vendors` table → create entity link
- If a new signal mentions a technology in `kg_technologies` → create link
- If a signal follows a pattern of 3+ signals in the same subsystem in 7 days → flag as CONVERGENCE

---

## TASK 3 — The Trajectory Predictor

**File:** `src/lib/intelligence/trajectory-predictor.ts`

Takes the last 30 days of enriched signals for a sector and predicts trajectory.

```typescript
export interface SectorTrajectory {
  sector: string;
  time_horizon: '30d' | '90d' | '180d';
  momentum: number;         // -100 to +100 (negative = declining)
  prediction: string;       // 2-3 sentence strategic prediction
  confidence: number;       // 0-100
  key_drivers: string[];    // What's driving this trajectory
  risks: string[];          // What could change the trajectory
  opportunities: string[];  // Specific opportunities for El Paso
  watch_signals: string[];  // What signals to watch
}
```

Uses the convergence engine + trend engine + extracted intelligence meanings.

---

## TASK 4 — The El Paso Relevance Tagger

**File:** `src/lib/intelligence/ep-relevance-tagger.ts`

Scores every signal 0-100 for El Paso relevance with detailed reasoning.

**Scoring factors:**
- Direct mention of El Paso, Juárez, Borderplex, UTEP, Fort Bliss, BOTA → base 80+
- Sector relevance: defense (60+), border-tech (70+), logistics (65+), manufacturing (60+)
- Company mentions: Fort Bliss contractors → +20, CBP/DHS vendors → +25, UTEP partners → +20
- Technology relevance: autonomous vehicles (+10), AI surveillance (+15), cross-border payments (+20), nearshoring (+25)
- Geographic proximity: Texas/New Mexico/Mexico → +15, Southwest US → +10
- Contract relevance: SAM.gov contracts in TX → +30, Army contracts → +25

```typescript
export interface EPRelevanceScore {
  score: number;           // 0-100
  tier: 'local' | 'regional' | 'national_impact' | 'global_but_relevant';
  reasoning: string;       // Why this score
  specific_connections: string[];  // "Fort Bliss uses this vendor", "UTEP researches this", etc.
  action_urgency: 'immediate' | 'this_week' | 'this_month' | 'watch';
}
```

---

## TASK 5 — Batch Enrichment Runner

**File:** `src/app/api/agents/enrich-batch/route.ts`

Orchestrates the full enrichment pipeline for a batch of signals.

POST endpoint that:
1. Fetches N unenriched signals from Supabase
2. For each signal, runs extraction-engine → relationship-builder → ep-relevance-tagger in parallel
3. Saves all results back to intel_signals table
4. Returns detailed stats

Also creates a `GET /api/agents/enrich-batch` that shows:
- Total signals enriched today
- Enrichment coverage %
- Average importance score
- Distribution by direction (growing/declining/etc)
- Top 5 sectors by activity

---

## Important

- Import `runParallelJsonEnsemble` from `@/lib/llm/parallel-router`
- Use `createClient()` from `@/lib/supabase/client`
- All AI calls: temperature 0.1 (structured extraction needs consistency)
- Process signals in chunks of 10 with Promise.all for speed
- Add proper error handling: if AI fails, use rule-based fallback
- Write TypeScript types carefully
- Deliver ALL 5 files to `_collab/inbox/for-computer/`

**File names:**
- `_collab/inbox/for-computer/lib-extraction-engine.ts`
- `_collab/inbox/for-computer/lib-relationship-builder.ts`
- `_collab/inbox/for-computer/lib-trajectory-predictor.ts`
- `_collab/inbox/for-computer/lib-ep-relevance-tagger.ts`
- `_collab/inbox/for-computer/api-enrich-batch-route.ts`

This is the most important code in the entire platform. Make it world-class.
