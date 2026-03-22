# NXT//LINK Status — Last updated 2026-03-22

## What's Live
- **Production**: https://www.nxtlinktech.com (Vercel)
- **Backend**: nxt-brain on Railway (Python/FastAPI, port 8000)

## Route Map (36 pages, post-prune)

### Core Consumer Flow
| Page | Route | Status |
|------|-------|--------|
| DECIDE (home) | `/` | WORKING — Supabase queries for 6 SMB industries |
| EXPLORE | `/explore` | WORKING — Cytoscape graph |
| WORLD | `/world` | WORKING — SVG map + signal dots |
| FOLLOW | `/following` | WORKING — localStorage follows |
| STORE | `/store` | WORKING — product catalog |
| DOSSIER | `/dossier` + `/dossier/[slug]` | WORKING — search → brief |
| INTEL | `/intel` | WORKING — 3-screen Bloomberg dashboard |
| TRAJECTORY | `/trajectory` | WORKING — tech trajectory |

### Industry System
| Page | Route | Status |
|------|-------|--------|
| Industries list | `/industries` | WORKING — links to deep-dive |
| Industry deep-dive | `/industry/[slug]` | WORKING — 10-section command center |
| Industry solve | `/industry/[slug]/solve` | WORKING — per-industry problem solver |

### Discovery
| Page | Route | Status |
|------|-------|--------|
| Sweep Radar | `/sweep` | WORKING — 10 categories × 4 regions, Google News sweep |

### Reference Pages
| Page | Route | Status |
|------|-------|--------|
| Search | `/search` | WORKING |
| Signals | `/signals` | PARTIAL — needs nxt-brain pipe |
| Map | `/map` | WORKING — deck.gl + MapLibre |
| Companies | `/companies` | STATIC |
| Vendors | `/vendors` + `/vendor/[id]` | STATIC |
| Products | `/products` + `/products/[id]` + `/products/compare` | STATIC |
| Technologies | `/technologies` + `/technology/[id]` | STATIC |
| Conferences | `/conferences` + `/conference/[id]` | STATIC |
| Opportunities | `/opportunities` | STATIC |
| IKER scoring | `/iker` | STATIC |
| RFP finder | `/rfp` | STATIC |
| Reports | `/report/[slug]` | STATIC |
| Entity detail | `/entity/[id]` | API-driven |
| Solve | `/solve` | WORKING |
| Compare | `/compare` | STATIC |

### System
| Page | Route | Status |
|------|-------|--------|
| Command Center | `/command-center` | WORKING — ops dashboard |
| Platform Status | `/platform/status` | WORKING |
| Status | `/status` | WORKING |
| Login | `/login` | WORKING |

## What's Real vs Hardcoded
- **Real (Supabase)**: DECIDE queries, industry profiles (if DB populated), intel signals
- **Real (API pipeline)**: TODAY shows live signals, Industry pages fetch from intel-signals with fallback, WORLD maps signal dots
- **Hardcoded**: El Paso vendors (178KB), technology catalog (80 techs), country-tech map, conferences (86), industry stories
- **nxt-brain scans**: Writes to intel_signals in Supabase → consumed by TODAY, Industry, WORLD pages

## Next Priorities
1. Deploy and verify production data flow end-to-end
2. Connect /signals page to real nxt-brain output (full signal browser)
3. Add user preferences / personalization (saved industries, followed signals)
4. Upgrade sweep to persist discoveries to Supabase (kg_companies table)
