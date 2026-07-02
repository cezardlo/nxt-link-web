## User Types, Dashboards, Permissions & Example Journeys

### From fifteen personas to five account types

The specs name many personas: buyers/customers, product vendors, service providers, software companies, hardware companies, equipment suppliers, consultants, installers/integrators, logistics providers, warehouse operators, manufacturers, maquiladoras, event organizers, partners, and admins. The platform does **not** need fifteen account types — the database already collapses them correctly. `platform_users.role` is a CHECK-constrained enum of exactly five values — `public | client | vendor | admin | super_admin` — in `supabase/migrations/20260625_nxtlink_platform.sql` (**BUILT**), and every persona nuance is expressed as **tags on the account**, not as a new role:

| Spec persona | Account type | Where the distinction lives (tag mechanism) |
|---|---|---|
| Warehouse operator, 3PL, manufacturer, maquiladora, distributor (any buyer) | **Client** | `client_requests.category`, `location`, `vendor_scope (local/global/both)`, locale `en/es` — the buyer's *industry* is captured per request, not per role |
| Product vendor, equipment supplier, hardware co. | **Vendor** | `vendor_profiles.categories` jsonb (16 warehouse categories, `src/app/vendor-signup/page.tsx`) + `vendor_applications.offering_types` (products) |
| Service provider, installer/integrator, consultant, trainer | **Vendor** | Same `categories` list (forklift maintenance, electrical, IT support, staffing…) + `offering_types` values for services/installation/consulting/training |
| Software company (WMS/TMS), telematics | **Vendor** | `vendor_applications.category` CHECK: `TMS / WMS / Telematics-ELD / Forklifts / Customs-Cross-Border / Cold Chain / Robotics / Other` (`20260702_vendor_applications_private_intake.sql`) |
| Logistics provider (FTL/LTL, cross-border) | **Vendor** | `categories: transport` + `service_areas` (`El Paso, Juárez, New Mexico, West Texas, Cross-border, National`) |
| Maquiladora *selling* capacity (contract manufacturing) | **Vendor** (can also hold a Client account) | `vendor_profiles.industries` + `client_types` jsonb (added `20260701b_vendor_industry_clients.sql`, GIN-indexed) |
| Event organizer, chamber/eco-system partner | **Partner** — *tagged*, not a new role | **MISSING** as self-serve; recommended: a `partner` tag on `platform_users` or a `client_types:['partner']` vendor profile, managed by admin. Event data itself already has homes: `conferences`, `exhibitors`, `conference_vendor_links`, `conference_leads` tables (**BUILT**, Era-1 schema) — the Conference & Event Strategy module set will sit on top of these |
| Platform staff | **Admin / Super-admin** | `platform_users.role`; RLS helper `is_admin()` (`20260626_nxtlink_rls_user.sql`) |

One person can hold two hats (a maquiladora that buys robotics *and* sells assembly capacity) by holding a client-role `platform_users` row plus a `vendor_profiles` row — both key off the same Supabase `auth_id`, and the signup trigger `handle_new_auth_user()` (**BUILT**) auto-creates the platform_users row on first login.

**Bilingual note (EN/ES):** locale is a first-class column on `platform_users`, `client_requests`, `vendor_profiles`, and `vendor_responses` (CHECK `en/es`). The intake wizard (`/intake`), vendor signup (`/vendor-signup`), and vendor quote workspace (`/vendor/quotes`) already ship with EN/ES toggles; the 10 client-facing statuses are stored bilingually in `src/lib/assistant/branding.ts` (*Solicitud recibida → Proveedor seleccionado → Cerrado*). Admin surfaces are EN-only today (**PARTIAL**).

### Account type profiles

#### 1. Public visitor (role `public`)
- **Why they arrive:** research a problem before committing. Can browse the marketing landing (`/landing.html`), talk to the bilingual `ChatWidget` (`POST /api/chat`, guardrail-bound, never reveals vendor identities — **BUILT**), and read `published=true` rows of `site_content`.
- **Can do:** submit an anonymous vendor application (`/apply`, anon INSERT allowed with `auth_id NULL`) or start a client intake (`/intake` is public). Cannot read any vendor catalog, quote, or request — Era-2 RLS is private-by-default (service-role writes, owner/admin reads).
- **Value created:** zero-friction entry; the platform converts an anonymous conversation into a structured record before an account exists.

#### 2. Client / Buyer (role `client`)
- **Why they sign up:** they have an operational problem (equipment, service, software, staffing, logistics) and want vetted, confidential quotes without fielding 30 cold calls.
- **What they can request:** anything in the intake taxonomy — `detectCategory()` in `src/lib/assistant/intake-flow.ts` routes to `forklift | staffing | warehouse_tech | transportation | facility | unsure`, each with a 5–9-question bilingual flow plus 6 closing questions (**BUILT**).
- **Onboarding info required:** problem description, category, quantity, location, deadline, urgency, budget range, current vendor (optional), confidentiality flags (`nda_required`, `mnda_required`, `hide_identity`, share-summary/budget/documents permissions, `vendor_scope`), contact email/name — all real columns on `client_requests` (**BUILT**).
- **Dashboard:** **PARTIAL — the biggest UI gap for this account type.** The data layer is ready (owner-scoped RLS: `client_id = current_pu_id()` on `client_requests` + `request_status_history`, `20260626`), and a client-dashboard prototype existed (`nxtlink-client.html`, removed at HEAD). A `/requests` page should show: each request with `public_ref` (REQ-xxxxxxxx), its position on the 10-step bilingual status ladder, options-ready quote comparisons (via `deal_shares` token snapshots once `20260705` is applied), and uploaded files.
- **Actions:** submit/edit requests, upload files (`request_files`, visibility-controlled), approve identity reveal, state a preference on shared quotes (lands in `leads` with `source: quote_preference` — schema pending).
- **Permissions:** read/write own requests only; never sees vendor identity until the admin-approved reveal (`visibility_permissions`); never sees other clients' anything.
- **Notifications:** `platform_notifications` table is **BUILT** (recipient_role/recipient_id/read); status-change emails go out via admin-triggered Zoho mail (`/api/zoho/email`, logged to `zoho_outbox`). An in-app notification UI and automatic status emails are **MISSING**.
- **Value:** one structured ask → anonymized competition among qualified vendors → side-by-side options, with NDA and identity controls enforced at the database layer, not by policy promises.

#### 3. Vendor / Provider (role `vendor`) — all seller flavors
- **Why they sign up:** *"List what you solve. Receive quote-ready work."* (the literal `/vendor-signup` headline) — pre-qualified, protected opportunities instead of cold prospecting, with a human follow-up.
- **Two BUILT intake doors:** (a) `/vendor-signup` → `vendor_profiles` (public self-serve directory profile: company, contact, website, city, 16 category chips, 6 service-area chips, description, brochures ≤15 MB, EN/ES); (b) `/apply` (+ `/apply/login`, `/apply/status`) → `vendor_applications` — the *private* catalog intake (never publicly listed) capturing category, problem solved, target customer, price range, logo, ≤3 product images, and — in the pending `20260703/20260704` migrations — `offering_types`, `supply_chain_stages`, `company_size`, `region`. Recommendation: keep both, position `/vendor-signup` as directory listing and `/apply` as confidential marketplace enrollment; the account-claim logic (anonymous submission later claimed by email match, then locked) is **BUILT** in `src/lib/vendor/auth.ts` and `src/lib/apply/auth.ts`.
- **Dashboard (BUILT):** `/vendor/portal` — self-service profile: statuses, categories, service areas, brochures (`vendor_brochures`, private bucket), showcase videos (`vendor_videos`). `/vendor/quotes` — the quote workspace (EN/ES) with the AI quote assistant (`POST /api/assistant/vendor-quote` → `aiDraft`, always `is_draft:true`), reusable `quote_templates` (with `spanish_version` jsonb), `saved_quotes`, and bilingual draft legal terms via `generateTerms()` (`src/lib/assistant/terms.ts`) including the NXT//LINK non-circumvention block.
- **Actions:** maintain profile, receive opportunities (`vendor_opportunities`, 10 statuses: `new_opportunity → viewed → interested/needs_more_info → quote_in_progress → quote_submitted → selected/not_selected/declined/expired`), submit structured responses (`vendor_responses`: price/labor/travel/parts, lead time, warranty, payment terms, expiration, questions back).
- **Permissions (the confidentiality core, BUILT in RLS):** vendors read/write **only their own rows** (`vendor_id = current_pu_id()` policies, `20260626`; `current_vendor_id()` in pending `20260705`). A vendor never sees the client's identity (packets are anonymized `quote_packets` with `hide_client_identity`), never sees who else was invited (`deal_invites` scoped per vendor), and never sees competing quotes. The guard trigger `guard_quote_update()` stops a vendor from flagging their own quote `selected_for_client` even via direct REST.
- **Notifications:** opportunity received / deadline approaching / status change — schema ready (`platform_notifications`, `sent_at/viewed_at` on `vendor_opportunities`), Zoho outreach email **BUILT** admin-side; vendor-facing automated alerts **MISSING**.
- **Value:** demand arrives pre-qualified and anonymized; AI cuts quote drafting to minutes in either language; the introduction/commission trail (`proof_of_introduction`) protects the platform relationship transparently.

#### 4. Partner / Event organizer (tag, not a role) — **MISSING as self-serve, PARTIAL as data**
- **Why they'd sign up:** fill exhibitor rosters and invite lists with matched regional buyers/vendors; co-brand B2B matchmaking around their event.
- **What exists:** rich event data (`conferences` — 1,772+ events with sector tags and relevance scores; `exhibitors`; `conference_vendor_links`; `conference_leads` with `el_paso_relevant` flag) plus browse pages `/conferences`, `/conference/[id]`, `/leads` (**BUILT**, Era-1). What's missing is the *account*: recommend admin-managed partner records first (a tag + admin CRM view), deferring a partner login until the Conference & Event Strategy modules (event scoring, invite-list builder, event dashboard) define what a partner actually needs to see. Candidate partner targets to verify — never claim as confirmed: chambers of commerce, Borderplex Alliance, INDEX Juárez.
- **Onboarding info (recommended):** organization, events owned, audience profile, dates/venues, co-marketing permissions.
- **Value:** the platform turns their attendee list into matched B2B meetings; they turn the platform's directory into exhibitors.

#### 5. Admin / Super-admin (roles `admin`, `super_admin`)
- **Dashboard (BUILT):** `/admin/requests` (request queue + AI drafting via `POST /api/assistant/admin`), `/admin/vendors` (approve/reject/pause `vendor_profiles`, view brochures), `/admin/match` (scores vendors against a request — `src/lib/matching.ts`: category ×62, service-area ×28, approved +8, brochure +2, top 50 returned), `/admin/directory` (vendor browser), `/admin` (maintenance jobs).
- **Actions & exclusive permissions:** move requests through the 12-column pipeline; build anonymized `quote_packets`; route `vendor_opportunities`; approve identity reveals (`visibility_permissions`); approve every AI draft before anything sends (`ai_draft_logs.approval_status`); send Zoho email / schedule Zoho meetings (`/api/zoho/email`, `/api/zoho/meeting`, both admin-gated); read `admin_notes`, `platform_audit_log`. Curate `quotes.selected_for_client` and mint client share tokens (`deal_shares`) once `20260705` applies.
- **Auth caveat to fix before launch:** `isAdminRequest` still accepts the hardcoded transitional access code from `src/lib/privateAccess.ts` alongside real Supabase role checks; the hardened `src/lib/server/admin-session.ts` exists and should fully replace it.

### Permission matrix (enforced by RLS, not just UI)

| Capability | Public | Client | Vendor | Admin |
|---|---|---|---|---|
| Submit intake / vendor application | ✔ | ✔ | ✔ | ✔ |
| Read own requests + status history | — | ✔ (owner RLS) | — | ✔ |
| Read own vendor profile / application | — | — | ✔ (owner RLS + guard trigger) | ✔ |
| See opportunity packets routed to them | — | — | ✔ (own rows only) | ✔ |
| See competing vendors / quotes | — | — | ✖ never | ✔ |
| See client identity pre-reveal | — | n/a | ✖ until `visibility_permissions` | ✔ |
| Approve AI drafts, send email, reveal identity | — | — | — | ✔ only |
| Read audit logs / admin notes | — | — | — | ✔ only |

### Example journey 1 — El Paso 3PL needs barcode + inventory tracking (customer)

*"Borderline Fulfillment"* (illustrative name), a 3PL on the east side of El Paso, mis-ships because receiving is still pen-and-paper.

1. The ops manager opens **`/intake`** (public, EN/ES). She types: *"We need barcode scanners and inventory tracking for a 40-dock warehouse."* `detectCategory()` keys on "barcode/inventory" → `warehouse_tech`; the wizard asks its category questions plus the 6 closers (location, deadline, budget, NDA, scope, share permission) — **BUILT**, works even with zero LLM keys.
2. `POST /api/assistant/intake` returns a `RequestSummary`; a `client_requests` row is created — `public_ref REQ-4f2a9c1b`, status `request_received`, `hide_identity: true` because she doesn't want vendors knowing a 3PL is shopping. Logged to `ai_draft_logs` (provider `intake-engine`).
3. She creates a login (`/login`); the `on_auth_user_created` trigger makes her `platform_users` row (role `client`). Her request is now readable only by her and admins. *(Status page UI for clients: **MISSING** — she'd get status by email today.)*
4. Admin sees the request in **`/admin/requests`**, uses the AI assistant to draft clarifying questions and a packet summary — every draft `is_draft:true`, approved by a human.
5. Admin runs **`/admin/match`**: `POST /api/match` scores approved `vendor_profiles` — vendors tagged `whtech` / `labels` with service area `El Paso` or `Cross-border` float to the top with human-readable reasons.
6. Admin builds a `quote_packet` (`OPP-…`): "3PL warehouse, El Paso region, barcode + inventory tracking, 40 docks, 60-day timeline" — no company name, budget hidden. Routes it to 4 vendors as `vendor_opportunities`; Zoho emails go out (logged in `zoho_outbox`).
7. Quotes arrive via `/vendor/quotes`; status walks `collecting_quotes → comparing_options → options_ready` (bilingual ladder in `branding.ts`). With `20260705` applied, admin marks 3 quotes `selected_for_client` and sends a tokenized read-only comparison link (`deal_shares`) — no login needed to view, no vendor identity shown.
8. She picks option B; that preference lands as a `leads` row; admin approves identity reveal (`visibility_permissions`), books a Zoho intro meeting, and `proof_of_introduction` timestamps the lifecycle for the commission trail. Status: `vendor_selected`. The pitch throughout: this system helps her *existing* receiving team scan faster and train quicker — nobody is replaced.

### Example journey 2 — Juárez-serving RFID/barcode integrator (vendor)

*"Integradora RFID del Norte"* (illustrative), a 12-person integrator installing Zebra scanners and RFID portals in Juárez maquiladoras and El Paso warehouses.

1. The owner finds **`/vendor-signup`**, flips the toggle to **Español**, and registers: categories *Etiquetas / Zebra*, *Tecnología para almacén*, *Soporte IT*; service areas *Juárez*, *El Paso*, *Cross-border*; uploads a capabilities PDF (private `vendor-brochures` bucket) and a YouTube install video (`vendor_videos`). A `vendor_profiles` row is created, status `pending` (**BUILT**; `POST /api/vendors/signup`).
2. He also files the confidential marketplace application at **`/apply`** (category *WMS*-adjacent → *Other*, problem solved, target customer, price range, product photos). Later he creates a login at `/apply/login`; the email-claim logic in `src/lib/apply/auth.ts` links his anonymous submission to his account, then locks it (**BUILT**).
3. Admin reviews him in **`/admin/vendors`**, checks the brochure, approves. (With `20260705` applied, the `promote_approved_vendor_application()` trigger would auto-create his live `vendors` account row.)
4. A week later the Borderline Fulfillment packet is routed to him: a `vendor_opportunities` row, status `new_opportunity`. He sees an anonymized brief — industry, region, scope, deadline — never the client's name, never the other three invitees.
5. In **`/vendor/quotes`** he works in Spanish: the AI assistant (`/api/assistant/vendor-quote`) drafts a structured quote from his bullet points — hardware, labor, travel from Juárez, 10-day lead time; `generateTerms('es', …)` appends draft bilingual terms including warranty, Net-30, and the NXT//LINK non-circumvention clause. Everything is a draft he edits and owns; he saves it as a `quote_template` for the next RFID job.
6. He submits → `vendor_responses` status `submitted`; opportunity status `quote_submitted`. RLS guarantees his pricing is invisible to competitors.
7. He's `selected`. Identity reveal is approved on both sides; the admin's Zoho meeting invite connects him with the 3PL; `proof_of_introduction` records terms acceptance and deal status. His profile now carries a track record that improves his future match score — and his pitch to the maquiladora market stays worker-friendly: RFID that gives operators visibility and cuts recount drudgery, alongside the crew they already have.
