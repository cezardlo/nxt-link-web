# NXT LINK — Database Schema Reference

> Last updated: March 2026
> Supabase project: `yvykselwehxjwsqercjg`

---

## Architecture Overview

```
PLANET
  |
  +-- continents (6)          NA, SA, EU, AF, AS, OC
  |     |
  |     +-- countries (32)    US, CN, JP, DE, IL, KR, TW, IN, GB...
  |           |
  |           +-- regions     Cities, metros, innovation districts
  |
  +-- KNOWLEDGE GRAPH
  |     |
  |     +-- kg_industries (20)        Defense, AI, Semiconductors, Space...
  |     +-- kg_technologies (20)      AI, Robotics, Quantum, CRISPR, LLMs...
  |     +-- kg_companies              Global companies with IKER scores
  |     +-- kg_products               Products linked to companies
  |     +-- kg_discoveries            Scientific breakthroughs, TRL levels
  |     +-- kg_signals                P0-P3 priority intelligence signals
  |     +-- kg_events                 Conferences, IPOs, acquisitions
  |     +-- kg_policies               Regulations, sanctions, subsidies
  |     |
  |     +-- RELATIONSHIPS (junction tables)
  |           kg_company_technologies      (develops, uses, researches, commercializes)
  |           kg_company_industries
  |           kg_technology_industries     (low, medium, high, transformative)
  |           kg_product_technologies
  |           kg_discovery_technologies    (advances, enables, disrupts)
  |           kg_signal_entities           (polymorphic: company, tech, industry, country)
  |           kg_country_industry_strengths (0-100 score + world rank)
  |
  +-- INTELLIGENCE PIPELINE
  |     |
  |     +-- raw_feed_items         Raw articles from GDELT, arXiv, RSS, OpenAlex
  |     +-- feed_items             Processed RSS with scoring + sentiment
  |     +-- signals                Legacy signal table (vendor-focused)
  |     +-- feed_signals           RSS-sourced fallback signals
  |     +-- source_trust_scores    Reliability scores per news source
  |
  +-- AGENT SYSTEM
  |     |
  |     +-- agent_runs             Execution logs (status, timing, items)
  |     +-- agent_events           Inter-agent event bus
  |     +-- ml_patterns            Learned patterns across runs
  |     +-- prediction_outcomes    IKER ground truth for learning loop
  |
  +-- USER & ALERTS
  |     |
  |     +-- alert_rules            Keyword-based alert triggers
  |     +-- notifications          Fired alerts when rules match
  |     +-- vendors                El Paso vendor registry with IKER
  |
  +-- OPERATIONAL
        |
        +-- country_activity       Real-time country heat scores
        +-- continent_activity     Continent-level aggregations
        +-- trends                 Signal momentum by category
        +-- sector_scores          Daily sector health snapshots
        +-- feed_sources           1M+ quality-scored RSS sources
```

---

## Table Details

### GEOGRAPHY LAYER

#### `continents`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | UNIQUE — "North America", "Europe", etc. |
| code | text | UNIQUE — NA, SA, EU, AF, AS, OC |
| intelligence_report | jsonb | AI-generated continent analysis |
| last_analyzed_at | timestamptz | |
| created_at | timestamptz | |

**Seeded:** 6 continents

#### `countries`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| continent_id | uuid | FK → continents |
| name | text | |
| iso_code | text | UNIQUE — ISO 3166-1 alpha-2 |
| latitude | float | |
| longitude | float | |
| gdp_usd | bigint | |
| innovation_score | float | 0-100, computed by IKER agent |
| created_at | timestamptz | |

**Seeded:** 32 countries (US, CA, MX, BR, AR, CO, CL, GB, DE, FR, NL, SE, CH, IT, ES, PL, FI, IL, CN, JP, KR, TW, IN, SG, AU, NZ, SA, AE, NG, ZA, KE, EG)

#### `regions`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| country_id | uuid | FK → countries |
| name | text | |
| latitude | float | |
| longitude | float | |
| type | text | city, metro, innovation_district, manufacturing_hub |
| created_at | timestamptz | |

---

### KNOWLEDGE GRAPH — Core Entities

#### `kg_industries`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | |
| slug | text | UNIQUE |
| description | text | |
| parent_industry_id | uuid | FK → self (nesting) |
| iker_score | float | Innovation momentum |
| created_at | timestamptz | |

**Seeded:** Manufacturing, Healthcare, Agriculture, Energy, Logistics, Defense, Semiconductors, Finance, Automotive, Construction, AI, Cybersecurity, Space, Biotechnology, Telecommunications, Mining, Aerospace, Robotics, Climate Tech, Quantum Computing

#### `kg_technologies`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | |
| slug | text | UNIQUE |
| description | text | |
| maturity_stage | text | research, emerging, early_adoption, growth, mainstream, legacy |
| adoption_curve_position | text | innovators, early_adopters, early_majority, late_majority, laggards |
| radar_quadrant | text | adopt, trial, assess, explore |
| iker_score | float | |
| signal_velocity | float | Rate of mention increase |
| fts | tsvector | Full-text search (auto-generated) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Seeded:** AI, Robotics, Quantum Computing, Gene Therapy, Solid State Batteries, Autonomous Vehicles, Digital Twins, Advanced Manufacturing, CRISPR, SMRs, LLMs, Computer Vision, 5G, Edge Computing, Blockchain, Nuclear Fusion, BCI, Photonics, 3D Printing, Synthetic Biology

#### `kg_companies`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | |
| slug | text | UNIQUE |
| description | text | |
| country_id | uuid | FK → countries |
| region_id | uuid | FK → regions |
| company_type | text | enterprise, startup, research_lab, university, government, ngo |
| founded_year | int | |
| employee_count_range | text | |
| total_funding_usd | bigint | |
| website | text | |
| linkedin_url | text | |
| iker_score | float | 0-100 IKER rating |
| latitude | float | |
| longitude | float | |
| fts | tsvector | Full-text search (auto-generated) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `kg_products`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK → kg_companies |
| name | text | |
| slug | text | UNIQUE |
| description | text | |
| product_type | text | hardware, software, platform, service |
| price_range | text | |
| deployment_complexity | text | low, medium, high |
| adoption_level | text | niche, growing, mainstream |
| created_at | timestamptz | |

#### `kg_discoveries`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| title | text | |
| summary | text | |
| discovery_type | text | scientific, medical, technology, engineering, materials, energy, space, biological, pharmaceutical |
| source_url | text | |
| source_name | text | |
| research_institution | text | |
| country_id | uuid | FK → countries |
| trl_level | int | 1-9 Technology Readiness Level |
| published_at | timestamptz | |
| iker_impact_score | float | Predicted industry impact |
| created_at | timestamptz | |

#### `kg_signals`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| title | text | |
| description | text | |
| signal_type | text | breakthrough, investment, policy, disruption, startup_formation, manufacturing_expansion, supply_chain_risk, regulatory_change, geopolitical, research_acceleration |
| **priority** | text | **P0** (global crisis), **P1** (industry disruption), **P2** (emerging trend), **P3** (early signal) |
| source_url | text | |
| source_name | text | |
| country_id | uuid | FK → countries |
| detected_at | timestamptz | |
| is_active | boolean | |
| created_at | timestamptz | |

**Realtime enabled** — Supabase pushes INSERT events to connected clients.

**Indexed:** `(priority, detected_at DESC)` for fast P0-first queries.

#### `kg_events`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | |
| event_type | text | conference, product_launch, acquisition, ipo, funding_round, policy_change, discovery, disruption |
| description | text | |
| country_id | uuid | FK → countries |
| occurred_at | timestamptz | |
| source_url | text | |
| created_at | timestamptz | |

#### `kg_policies`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| title | text | |
| description | text | |
| country_id | uuid | FK → countries |
| policy_type | text | regulation, subsidy, trade_restriction, innovation_program, sanctions, environmental, data_privacy, ai_governance |
| impact_level | text | low, medium, high, critical |
| announced_at | timestamptz | |
| source_url | text | |
| created_at | timestamptz | |

---

### KNOWLEDGE GRAPH — Relationships

#### `kg_company_technologies`
| Column | Type | Notes |
|--------|------|-------|
| company_id | uuid | FK → kg_companies |
| technology_id | uuid | FK → kg_technologies |
| relationship | text | develops, uses, researches, commercializes |

**PK:** (company_id, technology_id, relationship)

#### `kg_company_industries`
| Column | Type |
|--------|------|
| company_id | uuid | FK → kg_companies |
| industry_id | uuid | FK → kg_industries |

**PK:** (company_id, industry_id)

#### `kg_technology_industries`
| Column | Type | Notes |
|--------|------|-------|
| technology_id | uuid | FK → kg_technologies |
| industry_id | uuid | FK → kg_industries |
| impact_level | text | low, medium, high, transformative |

**PK:** (technology_id, industry_id)

#### `kg_product_technologies`
| Column | Type |
|--------|------|
| product_id | uuid | FK → kg_products |
| technology_id | uuid | FK → kg_technologies |

**PK:** (product_id, technology_id)

#### `kg_discovery_technologies`
| Column | Type | Notes |
|--------|------|-------|
| discovery_id | uuid | FK → kg_discoveries |
| technology_id | uuid | FK → kg_technologies |
| relationship | text | advances, enables, disrupts |

**PK:** (discovery_id, technology_id, relationship)

#### `kg_signal_entities`
| Column | Type | Notes |
|--------|------|-------|
| signal_id | uuid | FK → kg_signals |
| entity_type | text | company, technology, industry, country |
| entity_id | uuid | Polymorphic — points to any entity table |

**PK:** (signal_id, entity_type, entity_id)

#### `kg_country_industry_strengths`
| Column | Type | Notes |
|--------|------|-------|
| country_id | uuid | FK → countries |
| industry_id | uuid | FK → kg_industries |
| strength_score | float | 0-100 |
| rank_in_world | int | |

**PK:** (country_id, industry_id)

---

### INTELLIGENCE PIPELINE

#### `raw_feed_items`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| source | text | GDELT, arXiv, Google News, etc. |
| source_type | text | news, research, patent, startup, policy, social |
| title | text | |
| content | text | |
| url | text | UNIQUE — dedup key |
| published_at | timestamptz | |
| processed | boolean | false until entity extraction runs |
| extracted_entities | jsonb | LLM extraction output |
| created_at | timestamptz | |

**Realtime enabled.** Indexed on `(processed, created_at)` for entity agent queue.

#### `source_trust_scores`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| source_name | text | UNIQUE |
| trust_score | float | 0.0 - 1.0 |
| total_articles_processed | int | |
| last_updated | timestamptz | |

---

### PRIORITY SYSTEM

```
P0 — GLOBAL CRISIS
     Nuclear threat, global pandemic, worldwide financial collapse,
     global internet shutdown, catastrophic solar storm
     Confidence: 0.95

P1 — INDUSTRY DISRUPTION
     Escalating armed conflict, major sanctions, market crash,
     technology export ban, critical infrastructure cyber attack,
     major facility destruction, magnitude 7+ earthquake
     Confidence: 0.85

P2 — EMERGING TREND
     New tariff, new regulation, currency crisis, major data breach,
     severe weather, significant funding round, patent activity
     Confidence: 0.70

P3 — EARLY SIGNAL
     Default for detected signals that don't match higher patterns.
     Research papers, hiring spikes, conference mentions.
     Confidence: 0.50
```

---

### DATA FLOW

```
                    SOURCES
                      |
    +--------+--------+--------+--------+
    |        |        |        |        |
  GDELT   arXiv   OpenAlex  Google   NewsAPI
    |        |        |      News RSS    |
    +--------+--------+--------+--------+
                      |
                raw_feed_items
                      |
              Entity Extraction
              (Ollama / Gemini)
                      |
         +------+-----+------+------+
         |      |     |      |      |
    kg_companies | kg_signals |  kg_discoveries
         |   kg_technologies |
         |      |     |      |
         +--junction tables--+
                      |
                 IKER Scoring
                 (0-100 scale)
                      |
              +-------+-------+
              |       |       |
          countries  industries  technologies
          heat map   momentum    radar chart
                      |
              Supabase Realtime
                      |
                  LIVE UI
              (P0-P3 feed)
```

---

### ROW LEVEL SECURITY

All tables follow this pattern:
- **anon role** — `SELECT` only (public read access)
- **service_role** — Full `INSERT/UPDATE/DELETE` (agent writes)

This means:
- Frontend reads with the anon key (safe to expose)
- Agents write with the service role key (server-side only)

---

### FULL-TEXT SEARCH

Available on:
- `kg_companies.fts` — searches name + description
- `kg_technologies.fts` — searches name + description

Query example:
```sql
SELECT * FROM kg_companies
WHERE fts @@ to_tsquery('english', 'defense & robotics')
ORDER BY iker_score DESC;
```

---

### REALTIME SUBSCRIPTIONS

These tables push live updates to connected clients:
- `kg_signals` — new intelligence signals (P0-P3)
- `raw_feed_items` — new articles ingested
- `agent_runs` — agent execution status
- `agent_events` — inter-agent communication
- `signals` — legacy signals
- `notifications` — alert matches
- `entities` — knowledge graph updates
- `entity_relationships` — graph edge updates

---

### TABLE COUNT SUMMARY

| Category | Tables | Purpose |
|----------|--------|---------|
| Geography | 3 | Continents, countries, regions |
| Knowledge Graph Core | 8 | Industries, technologies, companies, products, discoveries, signals, events, policies |
| Knowledge Graph Relations | 7 | Junction tables linking entities |
| Intelligence Pipeline | 2 | raw_feed_items, source_trust_scores |
| Agent System | 4 | agent_runs, agent_events, ml_patterns, prediction_outcomes |
| User & Alerts | 2 | alert_rules, notifications |
| Operational | 5 | country_activity, continent_activity, trends, sector_scores, feed_sources |
| Legacy | 3 | vendors, signals, feed_signals |
| **Total** | **~34** | |
