# NXT//LINK App Surface Inventory

Generated 2026-07-02 from the checked-out branch (HEAD `ea1fdfd` "Drop offline HTML prototypes from clean branch").

Auth guard taxonomy (from route imports/handler heads):
- **applicant** = `getApplicantSession` / `getOwnApplication` (`src/lib/apply/auth.ts`, `vendor_applications` table, caller's own row only)
- **vendor** = `getVendorSession` / `getOrCreateVendorProfile` (`src/lib/vendor/auth.ts`, `vendor_profiles` table, caller's own row only)
- **admin** = `isAdminRequest` (`src/lib/assistant/auth.ts`; Supabase session with `platform_users.role` admin/super_admin, OR transitional `x-access-code: PRIVATE_ACCESS_CODE` header). `getCurrentUser` exists in the same file but no route calls it directly — only via `isAdminRequest`.
- **secret** = not one of the named guards, but protected by `CRON_SECRET` bearer/header (and/or `x-access-code`) checked inline in the handler
- **NONE** = no auth check found in the route file

---

## 1. API routes (`src/app/api/**`) — 178 route files

### Marketplace / intake / vendor-portal (the authenticated product surface)

| Path | Methods | Guard |
|---|---|---|
| /api/apply/submit | POST | applicant (`getApplicantSession`; anonymous submit allowed, session linked when present) |
| /api/apply/my | GET, PATCH | applicant (`getApplicantSession` + `getOwnApplication`) |
| /api/apply/my/media | POST, DELETE | applicant (`getApplicantSession` + `getOwnApplication`) |
| /api/vendor/profile | GET, PATCH | vendor (`getVendorSession` + `getOrCreateVendorProfile`) |
| /api/vendor/brochures | POST, DELETE | vendor |
| /api/vendor/videos | POST, DELETE | vendor |
| /api/assistant/admin | POST | admin (`isAdminRequest`) |
| /api/assistant/intake | POST | NONE (public client-intake assistant) |
| /api/assistant/terms | POST | NONE |
| /api/assistant/vendor-quote | POST | NONE |
| /api/match | POST | admin (`isAdminRequest`) |
| /api/platform/requests | GET, POST | admin (`isAdminRequest`) |
| /api/vendors/manage | GET, PATCH | admin (`isAdminRequest`) |
| /api/vendors/videos | GET | admin (`isAdminRequest`) |
| /api/vendors/signup | POST | NONE (public vendor signup) |
| /api/vendors/brochures | GET, POST | NONE |
| /api/vendors | GET | NONE |
| /api/vendors/discover | POST | NONE |
| /api/zoho/email | POST | admin (`isAdminRequest`) |
| /api/zoho/meeting | POST | admin (`isAdminRequest`) |
| /api/zoho/status | GET | NONE |

### Admin maintenance + cron (secret-header protected)

| Path | Methods | Guard |
|---|---|---|
| /api/admin/clean-junk | GET, POST | secret (CRON_SECRET or x-access-code) |
| /api/admin/dedup-vendors | GET, POST | secret (CRON_SECRET or x-access-code) |
| /api/admin/import-yc | GET, POST | secret (CRON_SECRET or x-access-code) |
| /api/cron | GET | secret (`Authorization: Bearer CRON_SECRET`, weak default `nxtlink-cron-2024`) |

### Agents (intelligence pipeline) — all NONE

| Path | Methods |
|---|---|
| /api/agents/audit | GET, POST |
| /api/agents/auto-discover | POST |
| /api/agents/batch-keyword-enrich | GET, POST |
| /api/agents/briefing | GET |
| /api/agents/client-audit | GET, POST |
| /api/agents/conference-discovery | GET, POST |
| /api/agents/conference-intel | GET, POST |
| /api/agents/cron | GET |
| /api/agents/cron-step | GET |
| /api/agents/docs-sync | GET, POST |
| /api/agents/enrich-entity | POST |
| /api/agents/enrich-signals | GET, POST |
| /api/agents/enrich-signals-v2 | GET, POST |
| /api/agents/entity | POST |
| /api/agents/exhibitor-scraper | GET, POST |
| /api/agents/extract | GET |
| /api/agents/global-ingest | GET, POST |
| /api/agents/iker-refresh | GET, POST |
| /api/agents/intel | GET, POST |
| /api/agents/intel-discovery | GET, POST |
| /api/agents/intel-signals | GET |
| /api/agents/patent-discovery | GET, POST |
| /api/agents/product-scanner | GET, POST |
| /api/agents/products | GET, POST |
| /api/agents/quality-sources | GET, POST |
| /api/agents/research-discovery | GET, POST |
| /api/agents/run | GET, POST |
| /api/agents/runs | GET |
| /api/agents/runs/[id] | GET |
| /api/agents/seed-entities | GET, POST |
| /api/agents/seed-graph | GET, POST |
| /api/agents/status | GET |
| /api/agents/swarm | GET, POST |
| /api/agents/test-gemini | GET |
| /api/agents/trends | GET |
| /api/agents/vendor-discovery | GET, POST |
| /api/agents/vendor-enrichment | GET, POST |
| /api/agents/vendor-pipeline | GET, POST |
| /api/agents/world-feed-ingest | GET, POST |
| /api/agents/worldwide-ingest | GET, POST |

(Note: several agent routes — patent-discovery, seed-graph, seed-entities, iker-refresh, research-discovery — reference CRON_SECRET/authorization strings internally, but the standard named guards are absent.)

### Brain / briefing / intelligence — all NONE

| Path | Methods |
|---|---|
| /api/brain | GET |
| /api/brain/causal | GET, POST, PUT |
| /api/brain/departments | GET, POST |
| /api/brain/map | GET, POST |
| /api/brain/obsidian | GET, POST |
| /api/brain/sync | GET, POST |
| /api/brain/sync/cron | GET |
| /api/briefing | GET |
| /api/jarvis-briefing | GET |
| /api/intelligence/connections | GET |
| /api/intelligence/convergence | GET |
| /api/intelligence/cross-sector | GET |
| /api/intelligence/daily-brief | GET |
| /api/intelligence/disruption-index | GET |
| /api/intelligence/enriched-signals | GET |
| /api/intelligence/grouped | GET |
| /api/intelligence/morning-brief | GET, POST |
| /api/intelligence/trending | GET |
| /api/insights | GET |
| /api/predictions | GET |
| /api/decide | GET, POST |
| /api/ask | POST |
| /api/chat | POST |
| /api/what-changed | GET |
| /api/trends/reasoning | GET |

### Intel feeds & external data — all NONE

| Path | Methods |
|---|---|
| /api/intel/[...path] | GET, POST (catch-all proxy) |
| /api/intel/api/map/layers | GET |
| /api/intel/api/mission/analyze | POST |
| /api/intel/api/vendors/[id] | GET |
| /api/intel/cyber | GET |
| /api/intel/digest | GET |
| /api/intel/economic | GET |
| /api/intel/federal-jobs | GET |
| /api/intel/feed | GET |
| /api/intel/hackernews | GET |
| /api/intel/patents | GET |
| /api/intel/research | GET |
| /api/intel/treemap | GET |
| /api/intel-curation | GET |
| /api/intel-signals | GET |
| /api/feeds | GET, POST |
| /api/feeds/live | GET |
| /api/live/border-cameras | GET |
| /api/live/border-trade | GET |
| /api/live/border-wait | GET |
| /api/live/contracts | GET |
| /api/live/flights | GET |
| /api/live/opportunities | GET |
| /api/live/seismic | GET |
| /api/sam/businesses | GET |
| /api/sam/entity-check | GET |
| /api/sam/exclusions | GET |
| /api/world/country/[code] | GET |
| /api/world/signals | GET |
| /api/world/tech-race | GET |
| /api/country-activity | GET |
| /api/continent-activity | GET |
| /api/map/layers | GET |
| /api/market | GET |
| /api/observer | GET, POST |
| /api/observer-v2 | POST |
| /api/observer-fallback | POST |

### Signals / graph / search / discovery — all NONE

| Path | Methods |
|---|---|
| /api/signals/[id] | GET |
| /api/signals/[id]/connections | GET |
| /api/signals/[id]/insight | GET, POST |
| /api/signals/stream | GET |
| /api/kg-browse | GET |
| /api/kg-signals | GET |
| /api/knowledge-graph | GET |
| /api/connections | POST |
| /api/connections/detect | POST |
| /api/explore | GET |
| /api/search | GET |
| /api/search/hybrid | GET |
| /api/discover/related | GET |
| /api/discover/sbir | GET |
| /api/discover/search | GET |
| /api/discover/technologies | GET |
| /api/discover/vendors | GET |
| /api/discoveries | GET |
| /api/discover-sources | GET, POST |
| /api/scrape-sources | POST |
| /api/sweep | POST |
| /api/vendor-discovery | GET, POST |
| /api/vendor-hunt | POST |
| /api/alerts | GET, POST, DELETE |
| /api/alerts/matches | GET, POST, PATCH |

### Domain pages' data (industry / products / conferences / misc) — all NONE

| Path | Methods |
|---|---|
| /api/industries | GET |
| /api/industry | GET |
| /api/industry/[slug] | GET |
| /api/industry/[slug]/products | GET |
| /api/industry/[slug]/profile | GET |
| /api/industry/[slug]/timeline | GET |
| /api/industry/explain | POST |
| /api/industry/solve | POST |
| /api/products | GET |
| /api/products/[id] | GET |
| /api/products/cleanup | POST |
| /api/technology/[id]/graph | GET |
| /api/conferences | GET |
| /api/conferences/[id]/exhibitors | GET |
| /api/conferences/global | GET |
| /api/conferences/intelligence | GET |
| /api/conference/run | POST |
| /api/leads/conference | GET |
| /api/assembly | GET, POST |
| /api/assembly/run | GET |
| /api/iker/leaderboard | GET |
| /api/opportunities | GET |
| /api/pipeline/health | GET |
| /api/pipeline/process | POST |
| /api/mcp | GET, POST |
| /api/health | GET |

**Guard summary:** 3 applicant routes, 3 vendor routes, 7 `isAdminRequest` routes, 4 secret-header routes; the remaining ~161 route files have NO auth guard.

---

## 2. Pages (`src/app/**/page.tsx`) — 51 pages

Access legend: **public** = no gate; **gate** = client-side `AccessGate` (shared `PRIVATE_ACCESS_CODE`, localStorage); **vendor** = vendor/applicant Supabase login flows; **admin** = admin tooling (AccessGate via `src/app/admin/layout.tsx` or access-code headers). EN/ES = has an explicit language toggle; all others are EN-only.

| Route | Purpose | Access | EN/ES |
|---|---|---|---|
| / | Redirects to static `/landing.html` marketing page | public | EN |
| /briefing | Daily intelligence briefing: ranked insights + related signals | public | EN |
| /command | Command center: map, morning brief, watchlist, live feed, alerts (reuses `src/app/command-center/*`) | public | EN |
| /intel | Signal browser with scoring/filtering | gate (`intel/layout.tsx` AccessGate) | EN |
| /map | Interactive globe of signals by world region | public | EN |
| /markets | Markets dashboard | gate (`markets/layout.tsx` AccessGate) | EN |
| /dashboard | Legacy overview (briefing, vendors, observer, connections) | public | EN |
| /observe | Observer analysis view | public | EN |
| /discoveries | "Innovation Radar" — browse tracked research breakthroughs | public | EN |
| /discover | Discovery search (vendors/technologies) | public | EN |
| /explore | Knowledge-graph explorer | public | EN |
| /entity/[id] | Entity profile page | public | EN |
| /signals | Signals explorer (calls Supabase edge fn `signal-insights` directly) | public | EN |
| /sector | Sector list (AI/ML etc.) | public | EN |
| /sector/[slug] | Sector momentum deep-dive | public | EN |
| /industry | Industry list | public | EN |
| /industry/[slug] | Industry deep-dive profile | public | EN |
| /industry/[slug]/solve | Redirect → `/solve?industry=slug` | public | EN |
| /solve | Problem-solver: describe a problem, get tech/vendor matches | public | EN |
| /products | Product catalog | public | EN |
| /products/[id] | Product detail (momentum, etc.) | public | EN |
| /products/compare | Side-by-side product comparison | public | EN |
| /technology/[id] | Technology-catalog detail page | public | EN |
| /vendors | Public vendor directory | public | EN |
| /vendor/[id] | Vendor detail page | public | EN |
| /report/[slug] | Industry report (Porter's forces etc.) | public | EN |
| /conferences | Conference exhibitor browser | public | EN |
| /conference/global | Global conference discovery | public | EN |
| /conference/[id] | Single-conference intel page | public | EN |
| /leads | Conference lead browser | public | EN |
| /trajectory | "Human Trajectory" big-picture discoveries page | public | EN |
| /iker | Redirect → `/command` | public | EN |
| /platform/status | Platform status page (force-dynamic) | public | EN |
| /test-api | API smoke-test page | public | EN |
| /login | Supabase email/password login/signup | public | EN |
| /sign-in | Animated sign-in page (modern-animated-sign-in UI) | public | EN |
| /crm | CRM console (hardcoded Supabase URL/anon key + `admin-auth` edge fn) | admin (edge-fn auth) | EN |
| /admin | Admin job console: dedup vendors, YC import, junk cleanup | admin (AccessGate layout) | EN |
| /admin/vendors | Vendor-profile management: statuses, brochures | admin | EN |
| /admin/requests | Client request queue with AI drafting (access code stored in localStorage) | admin | EN |
| /admin/match | Match client requests to vendors by category/service area | admin | EN |
| /admin/directory | Exhibitor-style vendor directory browser (reuses admin APIs) | admin | EN |
| /intake | Client request-intake wizard with AI follow-up questions | public | **EN/ES** toggle |
| /vendor-signup | Public vendor signup form (16 warehouse categories) + ChatWidget | public | **EN/ES** toggle |
| /vendor-login | Vendor sign in/up (vendor_profiles system) | vendor | EN |
| /vendor/portal | Vendor self-service profile portal (categories, areas, brochures, videos) | vendor | EN |
| /vendor/quotes | Vendor quote-response workspace | vendor | **EN/ES** toggle |
| /apply | Public low-friction vendor application form (no login; `vendor_applications` — standalone from vendor_profiles flow) | public | EN |
| /apply/login | Sign in/up to manage own vendor application | vendor (applicant) | EN |
| /apply/status | Applicant checks status / edits own submission | vendor (applicant) | EN |

---

## 3. Key components (`src/components/**`) — 132 files

**Shell / nav / gating:** AppShell, NavRail, DockNav, MobileNav, MobileBottomNav, PageTopBar, MapTopBar, SectionNav, PageTransition, CmdK, GlobalSearch, AccessGate (client-side access-code gate used by /admin, /intel, /markets layouts), PrivateAccessPrompt, AuthProvider.

**Marketplace / intake product:** ChatWidget (bilingual vendor/client assistant widget), VendorHuntForm, ProductCatalog, ProductCard, CompanyCard, CompanyTooltip, TechFitQuiz, TranslateButton, NextSteps, StickyLandingCta, OneTrackStyleLanding, BrandKitHero, MarketingDesignSections; `marketplace/` (ComparisonTable, FilterSidebar, ProductMarketCard, SortBar).

**Intelligence & signals:** SignalCard, SignalsFeed, SignalTicker, SignalBadge, IntelBadge, InsightCard, EvidenceList, ConfidenceBadge, SoWhat, ReasoningTrace, ClusterBriefings, JarvisBriefPanel, ObserverIntelPanel, IKERPanel, IkerBadge, ElPasoSignalBadge, P0AlertBanner, ConvergenceAlertBanner, DiscoveryFeed, FeedBar, ProblemSolver, SystemDashboard, AgentControlRoom, SwarmStatusPanel; `intelligence/` (DecisionBlock, IKERBadge, SignalCard, SignalFeed, VendorCard, TrendArrow, ResourceSection, WorldDot, LoadingSkeleton).

**Graphs / maps / viz:** MapCanvas, MapFilterPanel, MapLayerPanel, BubbleMap, KnowledgeGraph, ExploreGraph, ConnectionGraph, CausalGraph, EcosystemDiagram, IndustryEcosystemGraph, InnovationCycleGraph, IntelTreemap, TechRadar, TechJourney, AdoptionCurveChart, IndustryTimeline, EntityTimeline, SectorMomentumBoard; overlays: BorderCameraOverlay, CrimeNewsOverlay, LiveTVOverlay.

**Right panel:** `right-panel/RightPanel` with tabs (BriefingTab, IntelTab, OpsTab, ProcureTab, VendorTab), sections (Conference, Contracts, Feeds, Flights, Market, Opportunities), shared (AccordionSection, ScoreBar, LoadingSkeleton).

**UI kit (`ui/`):** Badge, Button, Card, StatCard, TopBar, BottomNav, SectionHeader, ScoreGauge, SeverityBadge, TimeAgo, Skeleton/PageSkeleton, ErrorState/ErrorToast, ProgressiveDisclosure, nxt-button, nxt-card, plus visual effects (interactive-globe, shadcn-map, radar-effect, radial-orbital-timeline, timeline, tubelight-navbar, flow-field-background, background-paths, shader-lines, core-spin-loader, database-with-rest-api, animated-state-icons, modern-animated-sign-in).

---

## 4. `public/nxtlink-*.html` demo files

**Status: REMOVED from this branch** at HEAD commit `ea1fdfd` ("Drop offline HTML prototypes from clean branch") — they were unreferenced single-file prototypes whose functionality was ported into real pages (/intake, /vendor/quotes, /admin/*); preserved on branch `claude/website-functionality-trd0mu`. From git history (`ea1fdfd^`):

| File | One-liner (from `<title>`) |
|---|---|
| nxtlink-app.html | "NXT//LINK — Private AI Sourcing Desk for Warehouses": full single-file app demo |
| nxtlink-demo.html | "NXT//LINK Assistant — Local Demo": offline assistant chat demo |
| nxtlink-admin.html | "NXT//LINK — Admin Operating Console": admin console prototype |
| nxtlink-vendor.html | "NXT//LINK — Vendor Quote Assistant": vendor quote-response prototype |
| nxtlink-smart-intake.html | "NXT//LINK — Request Intake": smart client intake prototype |
| nxtlink-client-intake.html | "NXT//LINK — Client Request": client request-form prototype |
| nxtlink-client.html | "NXT//LINK — Client Dashboard": client dashboard prototype |
| nxtlink-welcome.html | "NXT//LINK — Welcome": welcome/onboarding prototype |

Static HTML still present in `public/`: landing.html (root redirect target), admin.html, intel.html, catalog.html, "Warehouse Technology Catalog.html".
