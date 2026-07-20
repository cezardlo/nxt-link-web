# NXT LINK Architecture Research
## How a Vendor Intelligence Platform Should Work: Frontend, Backend, Data, Everything

---

## EXECUTIVE SUMMARY

This research synthesizes 100+ sources covering how intelligence platforms like Bloomberg Terminal, CB Insights, PitchBook, and Crunchbase are architected. The goal: define how NXT LINK should work across frontend, backend, data layer, real-time systems, and scoring algorithms.

**Core insight:** The best intelligence platforms share three traits:
1. **Data density without visual noise** — Bloomberg shows 4 panels simultaneously; users see everything at once
2. **Real-time by default** — Data flows continuously, not on refresh
3. **Trust through transparency** — Scores explain themselves; sources are visible

---

## PART 1: BACKEND ARCHITECTURE

### 1.1 Data Aggregation Layer

**How Bloomberg Does It:**
- Multiple data centers worldwide receive feeds from exchanges
- Data is cleaned, normalized from exchange-specific formats into consistent Bloomberg format
- "Ticker Plant" processes millions of data points per second using proprietary hardware/software
- Uses pub/sub architecture to distribute data to hundreds of thousands of terminals

**How CB Insights / PitchBook Do It:**
- Machine learning aggregates data from thousands of sources
- Human verification validates automated findings
- External risk intelligence platforms (Dun & Bradstreet, EcoVadis, Moody's) provide financial stability, ESG compliance, geopolitical risk data

**What NXT LINK Should Do:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA INGESTION LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   RSS Feeds ──────┐                                             │
│   (15+ sources)   │                                             │
│                   ├──► scan_news.py ──► Signal Classifier       │
│   Conference      │                           │                 │
│   Calendars ──────┘                           │                 │
│                                               ▼                 │
│   Vendor URLs ────────► scrape_vendor.py ──► Entity Extractor   │
│                                               │                 │
│   Crunchbase API ─────► (future) ─────────────┤                 │
│   LinkedIn API ───────► (future) ─────────────┤                 │
│                                               ▼                 │
│                                     ┌─────────────────┐         │
│                                     │   Supabase      │         │
│                                     │   PostgreSQL    │         │
│                                     └─────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Event-Driven Architecture

**Industry Standard Patterns:**

| Pattern | Use Case | NXT LINK Application |
|---------|----------|---------------------|
| **Pub/Sub** | Distributing market data | Signal distribution to subscribed users |
| **Event Sourcing** | Capturing all state changes | Vendor history, signal timeline |
| **CQRS** | Separating read/write paths | Fast dashboard reads, background writes |
| **Saga** | Multi-service transactions | Scrape → Classify → Score → Store |

**PostgreSQL Event Store Schema:**
```sql
CREATE TABLE intel_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID REFERENCES vendors(id),
  signal_type TEXT NOT NULL, -- 'ACQUISITION', 'FUNDING', 'PRODUCT_LAUNCH', etc.
  severity TEXT NOT NULL, -- 'P0', 'P1', 'P2', 'P3'
  title TEXT NOT NULL,
  summary TEXT,
  source_url TEXT,
  source_name TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB, -- Flexible storage for signal-specific data
  embedding VECTOR(1536) -- For semantic search (future)
);

CREATE INDEX idx_signals_vendor ON intel_signals(vendor_id);
CREATE INDEX idx_signals_type ON intel_signals(signal_type);
CREATE INDEX idx_signals_severity ON intel_signals(severity);
CREATE INDEX idx_signals_detected ON intel_signals(detected_at DESC);
```

### 1.3 Signal Classification Pipeline

**How News APIs Handle This:**
- AYLIEN News API: NLP + ML to classify and enrich stories
- Newsdata.io: Categorization by topic, language, region
- Custom classification: Zero-shot classification with LLMs

**NXT LINK Signal Types (P0-P3 Severity):**
```python
SIGNAL_TYPES = {
    # P0 - Critical (immediate action required)
    'ACQUISITION': {'severity': 'P0', 'color': 'red'},
    'BANKRUPTCY': {'severity': 'P0', 'color': 'red'},
    'DATA_BREACH': {'severity': 'P0', 'color': 'red'},
    'CEO_DEPARTURE': {'severity': 'P0', 'color': 'red'},
    
    # P1 - High (review within 24h)
    'MAJOR_FUNDING': {'severity': 'P1', 'color': 'orange'},
    'MAJOR_PARTNERSHIP': {'severity': 'P1', 'color': 'orange'},
    'MAJOR_PRODUCT_LAUNCH': {'severity': 'P1', 'color': 'orange'},
    
    # P2 - Medium (review within week)
    'EXPANSION': {'severity': 'P2', 'color': 'gold'},
    'NEW_HIRE': {'severity': 'P2', 'color': 'gold'},
    'MINOR_FUNDING': {'severity': 'P2', 'color': 'gold'},
    
    # P3 - Low (informational)
    'PRESS_MENTION': {'severity': 'P3', 'color': 'cyan'},
    'EVENT_PARTICIPATION': {'severity': 'P3', 'color': 'cyan'},
    'AWARD': {'severity': 'P3', 'color': 'cyan'}
}
```

### 1.4 Scheduled Processing (nexus.py)

**Industry Practice:**
- Bloomberg: Continuous real-time feeds
- CB Insights: Daily batch processing + real-time alerts
- PitchBook: Hourly updates for time-sensitive data

**NXT LINK Recommended Schedule:**
```
┌──────────────────────────────────────────────────────────────┐
│                     PROCESSING SCHEDULE                       │
├──────────────────────────────────────────────────────────────┤
│  Every 15 min   │  scan_news.py     │  RSS feed polling       │
│  Every 1 hour   │  scan_events.py   │  Conference calendars   │
│  Every 6 hours  │  scrape_vendor.py │  Website changes        │
│  Daily 2am      │  score_vendors.py │  IKER score recalc      │
│  Weekly Sunday  │  full_reindex.py  │  Complete data refresh  │
└──────────────────────────────────────────────────────────────┘
```

---

## PART 2: FRONTEND ARCHITECTURE

### 2.1 Data Fetching Patterns

**SWR (Stale-While-Revalidate) — Vercel's Recommendation:**
```typescript
// Good: SWR with automatic revalidation
import useSWR from 'swr';

function SignalFeed() {
  const { data, error, isLoading } = useSWR('/api/signals', fetcher, {
    refreshInterval: 30000, // Poll every 30 seconds
    revalidateOnFocus: true,
    revalidateOnReconnect: true
  });
  
  if (error) return <ErrorState />;
  if (isLoading) return <SkeletonLoader />;
  return <SignalList signals={data} />;
}
```

**React Query / TanStack Query — For Complex State:**
```typescript
// For paginated, infinite scroll, or dependent queries
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['signals', vendorId],
  queryFn: ({ pageParam = 0 }) => fetchSignals(vendorId, pageParam),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

**When to Use Each:**
| Scenario | Recommended |
|----------|-------------|
| Simple dashboard widgets | SWR |
| Complex filtering/pagination | React Query |
| Real-time streaming | Supabase Realtime |
| Static reference data | Server-side rendering |

### 2.2 Real-Time with Supabase

**Supabase Realtime Architecture:**
- Uses PostgreSQL's logical replication (WAL)
- Elixir-based Realtime server converts WAL to WebSocket messages
- Supports Broadcast (ephemeral), Presence (who's online), and Postgres Changes

**Implementation Pattern:**
```typescript
// Subscribe to new signals
useEffect(() => {
  const channel = supabase
    .channel('signals')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'intel_signals',
      filter: `vendor_id=eq.${vendorId}`
    }, (payload) => {
      // Optimistic UI update
      setSignals(prev => [payload.new, ...prev]);
      // Show toast notification
      toast.success(`New signal: ${payload.new.title}`);
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [vendorId]);
```

**Scaling Considerations:**
- Broadcast recommended over Postgres Changes for high scale
- Avoid RLS on high-traffic tables (use separate "public" tables)
- Filter subscriptions to reduce message volume

### 2.3 Dashboard UI Patterns

**Bloomberg's UX Philosophy:**
- "Hide complexity from the user"
- Multiple panels showing different data simultaneously
- Command-line + GUI hybrid (keyboard shortcuts essential)
- Black interface with color coding for data types

**Best Dashboard Component Libraries (2026):**
| Library | Strengths | Best For |
|---------|-----------|----------|
| **Tremor** | Data visualization, analytics focus | KPI dashboards, charts |
| **shadcn/ui** | Composable, Tailwind-native | Custom designs |
| **TailAdmin** | Complete templates | Quick deployment |
| **Recharts** | React charts, customizable | Data visualization |

**NXT LINK Design System:**
```css
/* Design tokens */
:root {
  --bg-primary: #000000;
  --accent-orange: #ff6600; /* Bloomberg orange */
  --accent-cyan: #00d4ff;
  --text-primary: #ffffff;
  --text-secondary: #888888;
  
  /* IKER Score colors */
  --score-trusted: #22c55e; /* 80-100 */
  --score-reliable: #eab308; /* 60-79 */
  --score-caution: #f97316; /* 40-59 */
  --score-risk: #ef4444; /* 0-39 */
}

/* Information density */
.data-grid {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  line-height: 1.4;
}
```

### 2.4 Mobile-First Patterns

**Thumb Zone Research (Steven Hoober, 2024):**
- 75% of users touch screens with one thumb
- Bottom 1/3 of screen = "green zone" (easy reach)
- Top corners = "stretch zone" (hard to reach)
- 49% use one-handed grip

**Mobile Navigation Best Practices:**
```
┌─────────────────────────────────────────┐
│                                         │
│              HARD TO REACH              │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│              MODERATE                   │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│    ✓ EASY REACH (Thumb Zone)            │
│                                         │
│   [Today] [Vendors] [World] [Events]    │  ← Bottom Tab Bar
└─────────────────────────────────────────┘
```

**Bottom Tab Bar Implementation:**
```tsx
// Mobile navigation component
const BottomNav = () => (
  <nav className="fixed bottom-0 w-full bg-black border-t border-gray-800 
                  flex justify-around py-3 z-50 md:hidden">
    <NavItem icon={<TodayIcon />} label="Today" href="/" />
    <NavItem icon={<VendorsIcon />} label="Vendors" href="/vendors" />
    <NavItem icon={<WorldIcon />} label="World" href="/world" />
    <NavItem icon={<EventsIcon />} label="Events" href="/conferences" />
    <NavItem icon={<MoreIcon />} label="More" href="/menu" />
  </nav>
);

// Critical: 44×44pt minimum touch targets
const NavItem = ({ icon, label, href }) => (
  <Link href={href} className="flex flex-col items-center min-w-[44px] min-h-[44px]">
    {icon}
    <span className="text-xs mt-1">{label}</span>
  </Link>
);
```

---

## PART 3: IKER SCORING SYSTEM

### 3.1 Industry Vendor Scoring Models

**Bitsight (Cybersecurity Rating):**
- Scale: 250-900 (higher = better)
- Data sources: 120+ global sources
- Categories: Compromised systems, security diligence, user behavior, public disclosures
- Algorithm: Subtractive (start at 950, deduct for each risk)

**UpGuard (Vendor Risk):**
- Scale: 0-950
- Real-time monitoring + point-in-time assessments
- Weighted deductions based on severity

**SecurityScorecard:**
- Letter grades: A-F
- Supply chain risk scoring
- Fourth-party visibility (vendors of vendors)

### 3.2 IKER Trust Score Architecture

**Score Components (Weighted):**
```
IKER TRUST SCORE (0-100)
├── External Signals (40%)
│   ├── Funding recency and amount
│   ├── Partnership announcements
│   ├── News sentiment analysis
│   └── Social media presence
│
├── Stability Metrics (35%)
│   ├── Years in business
│   ├── Employee count trend
│   ├── Leadership stability
│   └── Geographic presence
│
└── Business Context (25%)
    ├── Industry fit for El Paso
    ├── Customer reviews
    ├── Case study availability
    └── Response time (if contacted)
```

**Score Calculation:**
```python
def calculate_iker_score(vendor: Vendor) -> int:
    score = 0
    
    # External Signals (40 points max)
    if vendor.last_funding_date:
        recency = (datetime.now() - vendor.last_funding_date).days
        if recency < 180:  # Funded in last 6 months
            score += 15
        elif recency < 365:
            score += 10
        elif recency < 730:
            score += 5
    
    if vendor.recent_partnerships > 2:
        score += 10
    elif vendor.recent_partnerships > 0:
        score += 5
    
    score += min(vendor.positive_news_count * 2, 10)  # Max 10 pts
    score += min(vendor.social_followers / 10000, 5)  # Max 5 pts
    
    # Stability Metrics (35 points max)
    years = vendor.years_in_business
    if years >= 10:
        score += 15
    elif years >= 5:
        score += 10
    elif years >= 2:
        score += 5
    
    if vendor.employee_growth_trend == 'growing':
        score += 10
    elif vendor.employee_growth_trend == 'stable':
        score += 5
    
    if vendor.ceo_tenure_years >= 3:
        score += 5
    
    score += min(vendor.office_locations, 5)  # Max 5 pts
    
    # Business Context (25 points max)
    if vendor.has_elpaso_customers:
        score += 10
    if vendor.has_case_studies:
        score += 5
    if vendor.avg_review_score >= 4.0:
        score += 5
    if vendor.response_rate >= 0.8:
        score += 5
    
    return min(score, 100)

def get_score_tier(score: int) -> dict:
    if score >= 80:
        return {'label': 'TRUSTED', 'color': '#22c55e', 'tier': 1}
    elif score >= 60:
        return {'label': 'RELIABLE', 'color': '#eab308', 'tier': 2}
    elif score >= 40:
        return {'label': 'CAUTION', 'color': '#f97316', 'tier': 3}
    else:
        return {'label': 'RISK', 'color': '#ef4444', 'tier': 4}
```

### 3.3 Score Display Pattern

**Progressive Disclosure:**
```
Level 1 (0-2 seconds): Badge only
┌────────────────────────┐
│ IKER Score  ███ 78     │
│             RELIABLE   │
└────────────────────────┘

Level 2 (on hover): Key factors
┌─────────────────────────────────────┐
│ IKER Score: 78 RELIABLE             │
├─────────────────────────────────────┤
│ ▲ Recent $5M funding (Mar 2026)     │
│ ▲ 3 partnerships this quarter       │
│ ▼ No El Paso customers yet          │
│ ═ 7 years in business               │
└─────────────────────────────────────┘

Level 3 (on click): Full breakdown
[Navigate to /vendor/{id}/score]
```

---

## PART 4: DATA LAYER DESIGN

### 4.1 Supabase Schema

```sql
-- Core Entities
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  website TEXT,
  logo_url TEXT,
  founded_year INT,
  employee_count INT,
  headquarters_city TEXT,
  headquarters_country TEXT,
  iker_score INT DEFAULT 50,
  iker_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE technologies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT,
  description TEXT
);

CREATE TABLE vendor_technologies (
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  technology_id UUID REFERENCES technologies(id) ON DELETE CASCADE,
  PRIMARY KEY (vendor_id, technology_id)
);

CREATE TABLE industries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT
);

CREATE TABLE vendor_industries (
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  industry_id UUID REFERENCES industries(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (vendor_id, industry_id)
);

-- Signals (Event-sourced)
CREATE TABLE intel_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID REFERENCES vendors(id),
  signal_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('P0', 'P1', 'P2', 'P3')),
  title TEXT NOT NULL,
  summary TEXT,
  source_url TEXT,
  source_name TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Conferences/Events
CREATE TABLE conferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  location_city TEXT,
  location_country TEXT,
  website TEXT,
  industry_id UUID REFERENCES industries(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE intel_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE vendors;
```

### 4.2 API Route Structure

**Next.js App Router Pattern:**
```
/app
├── /api
│   ├── /signals
│   │   ├── route.ts          # GET /api/signals
│   │   └── [id]/route.ts     # GET /api/signals/[id]
│   ├── /vendors
│   │   ├── route.ts          # GET, POST /api/vendors
│   │   └── [id]
│   │       ├── route.ts      # GET, PATCH /api/vendors/[id]
│   │       ├── signals/route.ts
│   │       └── score/route.ts
│   ├── /conferences
│   │   └── route.ts
│   ├── /technologies
│   │   └── route.ts
│   └── /industries
│       └── route.ts
```

### 4.3 Caching Strategy

**Edge Caching (Vercel):**
```typescript
// app/api/vendors/route.ts
export const revalidate = 300; // Revalidate every 5 minutes

export async function GET() {
  const { data: vendors } = await supabase
    .from('vendors')
    .select('*, industries(*), technologies(*)')
    .order('iker_score', { ascending: false });
  
  return NextResponse.json(vendors, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
    }
  });
}
```

**SWR Client-Side Caching:**
```typescript
// Shared SWR config
export const swrConfig = {
  dedupingInterval: 10000, // 10 second deduplication
  focusThrottleInterval: 30000, // 30 second focus throttle
  errorRetryCount: 3,
  shouldRetryOnError: true,
};
```

---

## PART 5: WHAT NXT LINK SHOULD BUILD NEXT

### 5.1 Immediate Priorities (Before Demo)

| Task | Why | Effort |
|------|-----|--------|
| Fix MapLibre CSS import | World page broken | 10 min |
| Test all routes on mobile | Mobile demo likely | 1 hour |
| Add loading skeletons | Perceived performance | 30 min |
| Verify /vendor/[id] works | Core feature | 30 min |

### 5.2 Post-Demo Build Order

**Phase 1: Core Data Loop (Week 1-2)**
1. Run nexus.py on Railway schedule (cron)
2. Wire IKER score calculation
3. Add real-time signal notifications

**Phase 2: Discovery UX (Week 3-4)**
1. World map hover tooltips
2. Vendor comparison view
3. Industry deep-dive pages

**Phase 3: Intelligence Layer (Week 5-8)**
1. Signal threading (connect related signals)
2. Timeline scrubbing
3. Weekly intelligence brief generation
4. Connection Engine (entity relationships)

### 5.3 The Bloomberg-Inspired Vision

```
┌─────────────────────────────────────────────────────────────────┐
│  NXT LINK                              [Search...]    [Profile] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │  TODAY'S SIGNALS    │  │  TRENDING VENDORS   │              │
│  │  ─────────────────  │  │  ─────────────────  │              │
│  │  🔴 P0: Acme acquires│  │  1. TechCorp ↑ 85  │              │
│  │  🟠 P1: $50M funding │  │  2. DataCo   ↑ 78  │              │
│  │  🟡 P2: New product  │  │  3. CloudInc ↓ 72  │              │
│  │  🔵 P3: Conference   │  │  4. AIStartup → 68 │              │
│  └─────────────────────┘  └─────────────────────┘              │
│                                                                 │
│  ┌─────────────────────────────────────────────────┐           │
│  │                  WORLD MAP                       │           │
│  │       ●  ●     ●                                │           │
│  │    ●       ●        ●    ●                      │           │
│  │  ●     ●      ●  ●         ●                    │           │
│  │     ●      ●         ●                          │           │
│  │        [209 vendors across 45 technologies]      │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                 │
│  [Today] [Vendors] [Industries] [Technologies] [Conferences]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## APPENDIX: KEY RESEARCH SOURCES

### Architecture
1. Bloomberg Terminal Architecture — Client-server, multiprocessor Unix, Chromium frontend
2. AWS Serverless Aggregation Pipeline — Kinesis + Lambda + DynamoDB pattern
3. Supabase Realtime — Elixir-based, PostgreSQL logical replication

### Frontend
4. SWR Documentation — Stale-while-revalidate pattern
5. Next.js Data Fetching — Server Components, Suspense boundaries
6. Tremor Components — Analytics-focused React components

### Vendor Scoring
7. Bitsight VRM — 250-900 scale, 120 data sources
8. UpGuard Risk Scoring — 0-950 subtractive algorithm
9. DSALTA Research — Multi-factor scoring, 40/35/25 weighting

### Mobile UX
10. Smashing Magazine — Bottom navigation pattern, thumb zone research
11. Steven Hoober — 75% one-thumb usage statistic
12. React Navigation — Bottom tab implementation patterns

---

*Research compiled March 2026 for NXT LINK architecture planning*
