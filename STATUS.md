# NXT//LINK Status — Last updated 2026-03-22

## What's Live
- **Production**: https://www.nxtlinktech.com (Vercel)
- **Backend**: nxt-brain on Railway (Python/FastAPI, port 8000)

## Route Map (31 pages)

### Core Consumer Flow
| Page | Route | Status |
|------|-------|--------|
| DECIDE (home) | `/` | WORKING — Supabase queries, live signals, industry links |
| EXPLORE | `/explore` | WORKING — curated discovery cards |
| WORLD | `/world` | WORKING — interactive world map + signal dots |
| FOLLOW | `/following` | WORKING — localStorage follows |
| INTEL | `/intel` | WORKING — Bloomberg-style dashboard (briefing, watchlist, radar, feed) |
| TRAJECTORY | `/trajectory` | WORKING — tech adoption maturity graph |
| DOSSIER | `/dossier` + `/dossier/[slug]` | WORKING — search → Porter analysis + brief |
| SEARCH | `/search` | WORKING — global search across all entity types |

### Industry System
| Page | Route | Status |
|------|-------|--------|
| Industries list | `/industries` | WORKING — 8 industries with momentum |
| Industry deep-dive | `/industry/[slug]` | WORKING — 10-section command center + map |
| Industry solve | `/industry/[slug]/solve` | WORKING — per-industry problem solver |

### Discovery
| Page | Route | Status |
|------|-------|--------|
| Sweep Radar | `/sweep` | WORKING — 10 categories × 4 regions, company discovery |
| Map | `/map` | WORKING — deck.gl + MapLibre, multi-layer intelligence |

### Catalog
| Page | Route | Status |
|------|-------|--------|
| Products | `/products` + `/products/[id]` + `/products/compare` | STATIC |
| Vendors | `/vendors` + `/vendor/[id]` | STATIC |
| Technologies | `/technologies` + `/technology/[id]` | STATIC |
| Conferences | `/conferences` + `/conference/[id]` | STATIC (1,005 entries, all with valid URLs) |

### Intelligence Tools
| Page | Route | Status |
|------|-------|--------|
| IKER scoring | `/iker` | STATIC |
| RFP finder | `/rfp` | STATIC |
| Opportunities | `/opportunities` | STATIC |
| Reports | `/report/[slug]` | STATIC |
| Entity detail | `/entity/[id]` | API-driven (internal) |

### System
| Page | Route | Status |
|------|-------|--------|
| Command Center | `/command-center` | WORKING — ops dashboard |
| Platform Status | `/platform/status` | WORKING — agents + health |
| Login | `/login` | WORKING |

### NavRail Order
MAP → EXPLORE → INTEL → WORLD → TRAJ → VENDORS → PRODS → SWEEP → OPPS → IKER → RFP → OPS → STATUS

## What's Real vs Hardcoded
- **Real (Supabase)**: DECIDE queries, industry profiles, intel signals
- **Real (API pipeline)**: TODAY live signals, Industry signals with keyword fallback, WORLD signal dots, Sweep Google News
- **Hardcoded**: El Paso vendors (178KB), technology catalog (80 techs), country-tech map, conferences (1,005), industry stories
- **nxt-brain scans**: Writes to intel_signals → consumed by TODAY, Industry, WORLD, Key Players

## Pruning History
- Session 1 (2026-03-22): Deleted 14 routes (auth, command, dashboard, enter, innovation, marketplace, notes, ops, problems, product, radar, simulate, timeline, universe)
- Session 2 (2026-03-22): Deleted 7 routes (signals→intel, solve→industry/solve, store→products, compare, companies, status→platform/status, ask)
- Total: 21 routes deleted, 31 remain

## Next Priorities
1. Deploy and verify production data flow end-to-end
2. Real-time signal streaming (WebSocket/SSE) — WorldMonitor gap
3. Signal severity escalation with visual urgency tiers
4. Cross-signal correlation (thread signals into narratives)
5. Timeline scrubbing (see signals over time)
6. Upgrade sweep to persist discoveries to Supabase
