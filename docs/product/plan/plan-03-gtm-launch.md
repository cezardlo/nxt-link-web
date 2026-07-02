## Sign-Up Strategy, Launch Plan & First 90 Days

The funnel infrastructure already exists: vendors register at `/vendor-signup` (bilingual, 16 categories, brochures → `vendor_profiles`) or the lower-friction `/apply` (→ `vendor_applications`, self-managed via `/apply/login` + `/apply/status`); customers submit tickets at `/intake` (bilingual AI wizard → `client_requests`); the team works everything from `/admin/requests`, `/admin/vendors`, and `/admin/match` (scoring in `src/lib/matching.ts`); follow-up goes out through Zoho (`src/lib/zoho/*`, drafts-by-default). GTM is therefore a recruiting, trust, and repetition problem — not a build problem.

### A. Per-segment sign-up strategy

Two tables: A1 = why each segment joins; A2 = how we ask, what we collect, what pushes back. Onboarding info maps to real columns in `vendor_profiles` / `vendor_applications` / `client_requests`.

#### A1 — Value proposition, problem solved, sign-up offer

| Segment | Value proposition | Problem the app solves | Sign-up offer (recommended) |
|---|---|---|---|
| **Vendors (general)** | Pre-qualified, quote-ready opportunities matched to exactly what you sell — no cold-calling | Local vendors find industrial buyers by word of mouth; RFQs arrive messy or not at all | Founding Vendor: free listing + first N introductions commission-free (suggest N=3) |
| **Service providers** (maintenance, electrical, fire safety, pest, waste, IT) | Recurring service contracts from warehouses that need you on a schedule | Facility managers churn through providers found via search; providers can't reach the decision-maker | Free profile + priority routing on recurring-service tickets for 90 days |
| **Product suppliers** (pallets, racking, parts, packaging, propane, labels) | Standing purchase demand from operations that reorder monthly | Distributors compete on relationships they don't have on the other side of the bridge | Free listing + brochure/line-card hosting (`vendor-brochures` bucket, BUILT) |
| **Software companies** (WMS, TMS, inventory, visibility, quality) | Warm mid-market deals with a bilingual broker doing discovery for you | Border SMB warehouses are hard to prospect: fragmented, bilingual, relationship-driven | Free listing + inclusion in AI category recommendations; demo-day slot at first event |
| **Hardware companies** (barcode, RFID, scanners, sensors, telematics/ELD) | Deals arrive scoped (quantity, site, deadline already captured by intake) | Hardware sales cycles die in the "who do I even talk to" phase | Free listing + structured pilot-deal packet from the first matching ticket |
| **Logistics companies** (carriers, drayage, freight brokers, 3PL services) | Lane- and capacity-specific requests from shippers on both sides — and they can post their own tickets too (dual-sided) | Cross-border capacity matching still runs on phone calls and WhatsApp | Free dual account: vendor profile + unlimited quote requests as a customer |
| **Warehouses / 3PLs / distributors** (customer side) | One ticket → three comparable quotes, identity protected, EN/ES | Sourcing anything (forklift repair to WMS) means hours of calls and incomparable bids | First 3 quote requests fully concierge (human + AI); no fee ever to request |
| **Manufacturers** (El Paso side) | Confidential sourcing for plant needs without revealing expansion plans to the market | Asking around telegraphs strategy; vendor discovery in a border market is opaque | Concierge onboarding: we file the first ticket for you from a phone call |
| **Maquiladoras** (Juárez) | Spanish-first sourcing desk that reaches US-side vendors without a bilingual purchasing hire | Purchasing teams face English-language vendor markets, customs complexity, corporate procurement rules | ES-native onboarding + NDA-first handling (`nda_required`, `hide_identity` flags, BUILT in schema) |
| **Consultants** (lean, quality, IMMEX/customs compliance, safety training) | Scoped engagements from clients who already described the problem to the intake AI | Consultants can't economically prospect SMB industrial clients | Free listing + "recommended expert" placement on matching tickets |
| **Event attendees** | Pre-event matchmaking: arrive with meetings booked, not a badge and hope | Conference ROI is random walking-the-floor | Free event-edition account: register at the event, get matched before you leave |
| **Event sponsors** | Sponsor a matchmaking engine, not a logo wall — measurable introductions | Sponsors can't attribute pipeline to sponsorship | Sponsored-category placement + introduction-count report (recommend as paid tier) |
| **Local business organizations** (chambers, EDOs, industry associations — *candidate partners to verify, no confirmed relationships*) | Member benefit that produces measurable member-to-member and cross-border commerce | Orgs struggle to show hard economic value of membership | Co-branded onboarding page + member-cohort reporting; revenue share on sponsored events (proposal, to negotiate) |

#### A2 — Attraction message (EN/ES), onboarding data, objections

| Segment | One-liner EN / ES | Onboarding info to collect (where it lives) | Top objection → counter |
|---|---|---|---|
| Vendors (general) | "Stop chasing leads — quote-ready work finds you." / "Deja de perseguir clientes — el trabajo listo para cotizar te encuentra." | Company, contact, email, phone, city, categories, service areas, description, brochures (`vendor_profiles` via `/vendor-signup`) | "Another lead-gen site that sells my info" → identity stays private until selected; catalog is never public (RLS-enforced, `20260702` migration) |
| Service providers | "Your next service contract is already written up." / "Su próximo contrato de servicio ya está redactado." | + response time, certifications, emergency availability (description field; structured fields recommended — MISSING) | "I'm too busy for a platform" → 3-step signup, ~5 minutes, then it's inbound-only |
| Product suppliers | "Warehouses reorder every month. Be the one they reorder from." / "Los almacenes recompran cada mes. Sé su proveedor." | + product lines, price ranges, delivery areas (`vendor_applications.price_range`, `offering_types`) | "My margins can't absorb a fee" → free to list; commission only on introduced, closed work (proof_of_introduction model) |
| Software companies | "We do the bilingual discovery. You do the demo." / "Nosotros hacemos el descubrimiento bilingüe. Tú haces el demo." | + product category (TMS/WMS/etc. `/apply` taxonomy), target customer, deployment model, price band | "Border SMBs won't pay for software" → tickets arrive with budget_range captured; you only see funded, scoped demand |
| Hardware companies | "Scoped deals: quantity, site, deadline — before your first call." / "Negocios definidos: cantidad, sitio y fecha — antes de tu primera llamada." | Same as software + installation partner needs | "Integration/install is the hard part" → we match installers too; bundle recommendations are on the roadmap |
| Logistics companies | "Capacity meets cargo — both sides of the bridge." / "La capacidad encuentra la carga — a ambos lados del puente." | + lanes, equipment types, cross-border authority, `service_areas` incl. 'Cross-border' (BUILT option in `/vendor-signup`) | "We already have brokers" → this is direct shipper demand plus you can source your own needs on the same account |
| Warehouses / 3PLs | "One request. Three comparable quotes. Your name stays out of it." / "Una solicitud. Tres cotizaciones comparables. Su nombre queda protegido." | Problem, category, quantity, location, deadline, urgency, budget, confidentiality flags — all captured by `/intake` wizard (BUILT) | "Free? Then I'm the product" → vendors pay success fees on introductions; your data is never sold, quotes are anonymized both ways |
| Manufacturers | "Source for the plant without tipping your hand." / "Abastezca la planta sin revelar sus planes." | Same as warehouses + NDA requirement (`nda_required`, `mnda_required` BUILT) | "Corporate procurement won't allow it" → we produce documented, comparable bids — procurement-friendly output |
| Maquiladoras | "Su mesa de abastecimiento en español, con proveedores de ambos lados." / EN: "Your Spanish-first sourcing desk, vendors from both sides." | Same, ES flow (`/intake` ES toggle BUILT); customs/IMMEX notes in problem text | "US vendors don't answer us" → NXT//LINK is the bilingual intermediary; vendor responses come back structured, translated workflow on roadmap (`quote_templates.spanish_version` field exists) |
| Consultants | "Clients arrive with the problem already scoped." / "Los clientes llegan con el problema ya definido." | Specialty, industries served, engagement model, bilingual capability (`vendor_profiles.industries`, `client_types` BUILT) | "Platforms commoditize consulting" → matching is confidential and curated, not a public bid war |
| Event attendees | "Leave the event with meetings, not just badges." / "Salga del evento con reuniones, no solo gafetes." | Name, company, role, what they're looking for (maps to `leads` table; event-module capture TBD) | "Another app for one event" → same account works year-round for quotes |
| Event sponsors | "Sponsor introductions you can count." / "Patrocine presentaciones que se pueden contar." | Sponsor tier, target categories, invite-list criteria (aligns with event-module invite-list builder) | "Prove ROI first" → pilot sponsorship priced low, introduction report included (numbers labeled as estimates until measured) |
| Local business orgs | "A member benefit that closes deals across the border." / "Un beneficio para socios que cierra negocios a través de la frontera." | Org type, member count, co-marketing contact (track in `leads`, source 'manual') | "We can't endorse one platform" → position as pilot program with member-cohort data; no exclusivity requested |

### B. Launch plan

**First 20 vendors to recruit (by archetype — weighted toward categories that generate fast, repeat tickets; all 16 `/vendor-signup` categories get at least one path to coverage):**

| # | Archetype | Why first |
|---|---|---|
| 1–2 | Forklift service/parts (one EP, one Juárez-serving) | Highest-frequency warehouse pain; `/apply` category exists |
| 3–4 | FTL/LTL carriers or cross-border drayage | Dual-sided; every prospect needs freight |
| 5–6 | Staffing agencies (bilingual) | Recurring demand; strict worker-supportive framing showcase |
| 7–8 | Customs broker + IMMEX/trade-compliance consultant | The cross-border wedge; maquiladora trust builders |
| 9 | Labels/barcode consumables (Zebra-class reseller) | Reorder velocity |
| 10 | Pallet supplier | Simple, comparable quotes — ideal pilot category |
| 11 | Fire safety (extinguisher/fire-door inspection) | Compliance-driven, calendar-recurring |
| 12 | Electrical / general facility maintenance | Broad ticket coverage |
| 13 | IT support (warehouse-focused) | Category exists; SMB demand |
| 14 | Pest control or waste collection | Easy wins, fast quotes |
| 15 | WMS or inventory software vendor | Anchor "technology" credibility |
| 16 | Telematics/ELD provider | Fleet crossover with logistics prospects |
| 17 | Racking/dock equipment dealer + installer | Ties products to installation services |
| 18 | Cold-chain equipment/service | Border produce/pharma flows |
| 19 | Worker-assistive robotics/automation integrator | Flagship worker-friendly story — positioning proof |
| 20 | Safety/quality training provider (bilingual) | Workforce-support pillar made tangible |

Recruit via: (1) the conference-derived research data already in the database — `conference_leads`, `enriched_vendors`, `exhibitors` hold scored, El Paso-relevant candidates (BUILT pipeline, `20260328`/`20260402` migrations) — contacted individually; (2) chamber/association directories (candidate partners to verify); (3) referrals from each signed vendor.

**First 50 customer prospects (by segment, not named companies):** 15 El Paso warehouses/3PLs (5k–200k sq ft, the sweet spot for concierge sourcing) · 10 cross-border logistics operators/freight brokers (dual-sided accounts) · 10 Juárez maquiladora plant/purchasing managers (ES-first outreach) · 5 regional distributors · 5 El Paso-side manufacturers · 5 Santa Teresa/Las Cruces industrial operators (tests `service_areas` breadth). Source from public industrial-park tenant lists, org memberships (to verify), and event attendance.

**First event to connect:** one regional borderplex logistics/manufacturing event or chamber industrial mixer within the first 90 days — selected from the `conferences` table (1,772+ events, BUILT) using the upcoming event-scoring module; treat all specific events as candidates to verify, never announce partnerships before agreement. Run the event-edition offer: QR to `/vendor-signup` and `/intake`, on-site concierge intake, and a follow-up match report to every scanned attendee (aligns with the invite-list builder and execution-pipeline modules).

**First pilot quote requests (5–10 tickets):** choose categories with ≥3 registered vendors so every ticket yields a real comparison — pallets, forklift maintenance, one freight lane, fire-extinguisher inspection, labels reorder. Flow: `/intake` → `/admin/requests` → `/admin/match` → quote packet → vendor responds via `/vendor/quotes`. **Precondition (PARTIAL):** the private comparison chain (`deals`, `quotes`, `deal_shares`) in `supabase/migrations/20260705_quotes_deals_private_comparison.sql` is *written but not applied*, and collides with the legacy `vendors` table — reconcile and apply in Week 1, or run pilots on the applied `quote_packets`/`vendor_responses` path from `20260625_nxtlink_platform.sql`.

**Testing vendor usefulness:** % of routed opportunities viewed (`vendor_opportunities.viewed_at`, BUILT), % quoted within 48h, quote completeness (price + lead time + terms), and client's blind ranking of quote quality. Drop or coach vendors below thresholds; the matching engine's approval bonus (`src/lib/matching.ts`) already lets admins throttle weak vendors by status.

**Testing customer trust:** second-ticket rate (the single most honest trust metric), NDA-flag usage, willingness to accept an introduction, and post-quote survey (EN/ES, 3 questions max). Log all of it: `request_status_history`, `admin_notes`, and `leads` tables are BUILT for exactly this.

**Success metrics (targets are recommendations, not benchmarks):**

| Metric | 30-day target | 90-day target |
|---|---|---|
| Approved vendors (`vendor_profiles.status`) | 20 | 60 |
| Categories with ≥3 vendors | 5 | 12 |
| Client tickets submitted | 10 | 50 |
| Tickets receiving ≥2 quotes | 60% | 80% |
| Median time-to-first-quote | <72h | <48h |
| Introductions made (`proof_of_introduction`) | 3 | 15 |
| Second-ticket rate | — | ≥40% |
| ES-language sessions share | ≥25% | ≥40% |

**Feedback collection & improvement loop:** weekly — review `ai_draft_logs` entries where humans heavily edited the AI draft (prompt-gap signal), scan `request_status_history` for stall points, call 2 vendors + 2 clients. Bi-weekly — ship one funnel fix (copy, form field, matching weight) and one ops fix. Monthly — re-run the metrics table and re-rank recruiting toward categories showing demand without supply (empty `/admin/match` results).

### C. First 90 days, week by week (owner-agnostic)

| Weeks | Focus | Key actions |
|---|---|---|
| **1** | Technical readiness | Apply/reconcile pending migrations (`20260702`→`20260705`, resolve `vendors` table collision — see inventory); replace the hardcoded `'4444'` access code with the env-based `src/lib/server/admin-session.ts` path everywhere before any external user touches admin surfaces; configure Zoho send; smoke-test `/intake` → `/admin/match` → `/vendor/quotes` end-to-end in EN and ES |
| **2** | Founding-vendor materials | Finalize Founding Vendor offer + one-page pitch (EN/ES); build recruit list of 40 candidates from `conference_leads`/`enriched_vendors` research + local directories; draft org-partnership proposal for chambers/EDOs (candidates to verify) |
| **3–4** | Vendor recruiting sprint | 1:1 outreach; goal 20 approved `vendor_profiles` across the archetype table; every signup gets a 15-minute onboarding call; upload brochures; approve in `/admin/vendors` |
| **5** | Customer prospecting | Begin the 50-prospect outreach (concierge framing: "we'll file your first request for you"); first org-partner meetings |
| **6** | First live tickets | 5+ pilot tickets in ≥3-vendor categories; run full quote loop; measure time-to-first-quote; fix intake friction immediately |
| **7–8** | Quote-loop hardening | 10+ more tickets; first introductions + `proof_of_introduction` records; first commission conversations; post-quote surveys running; publish internal metrics dashboard (even a spreadsheet) |
| **9** | Event prep | Select first event from scored candidates (verify details directly with organizer); prep QR flows, event-edition accounts, on-site intake script (EN/ES); invite-list build for signed vendors |
| **10** | Event execution | Work the event; target: 30 attendee accounts, 10 vendor leads, 5 tickets sourced on-site; same-week follow-up via Zoho drafts |
| **11** | Post-event conversion | Convert event signups to first tickets/quotes; sponsor debrief with introduction counts; second wave of vendor recruiting into demand-heavy empty categories |
| **12–13** | Review & decision gate | Score against the metrics table; decide: double down on top 3 ticket categories, formalize commission collection, lock event #2, and prioritize the top build gaps surfaced by ops (expected: client status portal, structured service-provider fields, `site_content`-driven pages) |
