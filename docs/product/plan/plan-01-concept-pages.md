## Platform Concept, Positioning & Public Website Pages

### 1. The Platform Concept: Tickets In, Confidential Matches Out

**NXT//LINK is a two-sided B2B connection platform for the El Paso–Ciudad Juárez industrial corridor.** Warehouses, cross-border logistics operators, distributors (El Paso side) and manufacturers/maquiladoras (Juárez side) submit a **ticket** — a plain-language request for anything their operation needs. The platform's AI organizes the ticket into a structured, anonymized opportunity; NXT//LINK confidentially routes it to matched, vetted vendors; vendors respond with structured quotes; the client receives a curated comparison — without either side's identity being exposed until both agree to an introduction.

This is not a lead-list or an open directory-with-a-contact-form. The confidentiality mechanics are the product, and they are already engineered into the data model:

| Concept element | Status | Where it lives |
|---|---|---|
| Client ticket intake (bilingual AI wizard, works with or without an LLM) | **BUILT** | `src/app/intake/page.tsx`, `src/lib/assistant/intake-flow.ts`, `POST /api/assistant/intake` |
| Structured request record with confidentiality flags (`hide_identity`, `nda_required`, `vendor_scope`, share-permissions) | **BUILT** (schema) | `supabase/migrations/20260625_nxtlink_platform.sql` → `client_requests` |
| Anonymized opportunity packets routed per-vendor | **BUILT** (schema) | same migration → `quote_packets`, `vendor_opportunities` |
| Vendor quote workspace with AI drafting + bilingual terms generator | **BUILT** | `src/app/vendor/quotes/page.tsx`, `src/lib/assistant/terms.ts` |
| Private quote comparison shared to client via expiring token (no vendor ever sees another vendor's quote — enforced by RLS) | **PARTIAL** — schema written, migration **not yet applied** | `supabase/migrations/20260705_quotes_deals_private_comparison.sql` (`deals`, `deal_invites`, `quotes`, `deal_shares`, `leads`) |
| Vendor matching engine (category × 62, service-area × 28, approval + brochure bonuses) | **BUILT** | `src/lib/matching.ts`, `POST /api/match` |
| Admin operating console (request queue, vendor management, match, directory) | **BUILT** | `src/app/admin/requests`, `/admin/vendors`, `/admin/match`, `/admin/directory` |
| Proof-of-introduction / non-circumvention record (the revenue backbone) | **BUILT** (schema) | `proof_of_introduction` table + non-circumvention clause in `src/lib/assistant/terms.ts` |

**What flows through the platform.** One ticket pipe carries every industrial need category — the vendor side already captures this taxonomy in `vendor_profiles.categories/industries/client_types` (16 warehouse categories at `src/app/vendor-signup/page.tsx`) and `vendor_applications.category/offering_types/supply_chain_stages` (`supabase/migrations/20260703_vendor_applications_taxonomy.sql`):

- **Products & equipment**: forklifts and material handling, racking, dock equipment, cold chain, packaging machinery
- **Software**: WMS, TMS, telematics/ELD, inventory, quality, visibility platforms
- **Hardware & data capture**: barcode, labeling, RFID, scanners, IoT sensors
- **Services**: installation, maintenance, consulting, integration, facility services, staffing, training
- **Operations domains**: safety, quality, inventory accuracy, automation/robotics (worker-assistive)
- **Cross-border trade**: customs brokerage, IMMEX/maquila compliance support, drayage, carrier capacity, warehousing on either side
- **Events**: conference presence, invite-list building, event-driven vendor discovery (aligns with the Conference & Event Strategy module set)

**Geography.** El Paso + Ciudad Juárez is the launch market — one binational production-and-distribution system split by a border and a language. Everything ships bilingual EN/ES from day one (already true for `/intake`, `/vendor-signup`, `/vendor/quotes`, and the landing page's language-choice popup in `public/landing.html`). Expansion path: the Borderplex region (Las Cruces/Santa Teresa) → other Texas–Mexico border pairs (Laredo/Nuevo Laredo, McAllen/Reynosa) → national. The `vendor_scope` field (`local/global/both`) and `service_areas` matching signal already anticipate multi-region routing.

### 2. Positioning & Worker-Friendly Messaging

**Positioning statement (EN):** *"NXT//LINK is the private sourcing desk for the border's industrial economy. Tell us what your operation needs — we confidentially match you with vetted vendors and bring back comparable quotes, in English or Spanish, with your identity protected until you choose to connect."*

**Posicionamiento (ES):** *"NXT//LINK es la mesa privada de abastecimiento para la economía industrial de la frontera. Díganos qué necesita su operación — lo conectamos confidencialmente con proveedores verificados y le traemos cotizaciones comparables, en español o inglés, protegiendo su identidad hasta que usted decida conectar."*

Four pillars: (1) **neutral broker** — we sell introductions, not any vendor's product; (2) **confidential by architecture** — RLS-enforced, not policy-promised; (3) **binational & bilingual** — one platform, two languages, both sides of the bridge; (4) **human-reviewed AI** — every AI output is a draft (`is_draft: true` in `src/lib/assistant/llm.ts`), logged to `ai_draft_logs`, approved by a person before it moves.

#### Worker-friendly messaging rules (mandatory, both languages)

NXT//LINK positions every technology as something that **supports the existing workforce** — productivity, safety, quality, visibility, training, maintenance. Never as labor replacement. This is a strict copy rule for every page, chatbot reply, quote packet, and event pitch.

| | DO say | DON'T say |
|---|---|---|
| **EN** | "Help your team move more, more safely." / "Give your people better tools." / "Reduce injuries, errors, and downtime while supporting the workforce you already have." / "Training included, so your crew grows with the technology." / "Free your operators from the heaviest, most repetitive strain." | "Replace workers." / "Cut headcount." / "Eliminate labor costs." / "Lights-out / fully unmanned operation." / "Do more with fewer people." / "Automate away manual labor." |
| **ES** | "Ayude a su equipo a mover más, con más seguridad." / "Mejores herramientas para su gente." / "Menos lesiones, errores y paros — apoyando a la plantilla que ya tiene." / "Capacitación incluida, para que su personal crezca con la tecnología." | "Reemplazar trabajadores." / "Reducir personal / recortar plantilla." / "Eliminar mano de obra." / "Operación sin personal." / "Hacer más con menos gente." |

**Enforcement (concrete gaps):**
- **MISSING** — the shared `GUARDRAILS` block in `src/lib/assistant/prompts.ts` covers confidentiality and draft-only behavior but contains **no worker-friendly language rule**. Add one clause (both languages) so `/api/chat`, intake, admin drafting, and vendor-quote drafting all inherit it.
- **PARTIAL** — the `site_content` table (bilingual key/value_en/value_es with draft + published states, `supabase/migrations/20260625_nxtlink_platform.sql`) is the right home for all public-page copy below, but no page reads from it yet and there is no editing UI.

### 3. Public Website Page Plan

Fourteen public pages. Every page ships EN/ES (recommend `?lang=` param + persisted preference, matching the pattern already used by `/intake` and `/vendor-signup`), reuses `ChatWidget` (`src/components/ChatWidget.tsx` → `POST /api/chat`), and funnels to one of two conversions: **Request a Quote** (clients) or **Become a Vendor** (suppliers).

#### Route mapping summary

| # | Page | Target route | Status | Existing asset |
|---|---|---|---|---|
| 1 | Home | `/` | **PARTIAL** | `src/app/page.tsx` redirects to static `public/landing.html` (bilingual, dated messaging, links to legacy `admin.html`) |
| 2 | For Warehouses | `/warehouses` | **MISSING** | closest: intake categories in `src/lib/assistant/intake-flow.ts`; `/solve` (`src/app/solve/page.tsx`) |
| 3 | For Manufacturers | `/manufacturers` | **MISSING** | none (must be ES-first) |
| 4 | For Vendors | `/for-vendors` | **PARTIAL** | landing.html `#vendor-signup` section; functional flows exist but no marketing page |
| 5 | For Events | `/events` | **PARTIAL** | `src/app/conferences/page.tsx`, `src/app/conference/[id]/page.tsx` are intel tools, not a public offer page |
| 6 | How It Works | `/how-it-works` | **PARTIAL** | "Three steps" section inside landing.html only |
| 7 | Marketplace / Solutions Directory | `/marketplace` | **PARTIAL** | `src/app/vendors/page.tsx`, `src/app/products/page.tsx`, `src/app/products/compare/page.tsx` (Era-1 intel data, not curated marketplace) |
| 8 | Request a Quote | `/request-quote` → `/intake` | **BUILT** | `src/app/intake/page.tsx` (EN/ES AI wizard); add marketing-friendly alias route |
| 9 | Become a Vendor | `/become-a-vendor` → `/apply` | **BUILT** | `src/app/apply/page.tsx` + `/apply/login` + `/apply/status`; parallel flow `src/app/vendor-signup/page.tsx` (consolidate) |
| 10 | Case Studies | `/case-studies` | **MISSING** | none (launch with anonymized pilot stories only — no invented clients) |
| 11 | About | `/about` | **MISSING** | none |
| 12 | Contact | `/contact` | **PARTIAL** | `mailto:` + ChatWidget only; `leads` table (source `contact_form`) exists in unapplied `20260705` migration |
| 13 | Sign In | `/sign-in` | **PARTIAL** | four fragmented flows: `src/app/sign-in`, `/login`, `/vendor-login`, `/apply/login` — needs one router page |
| 14 | Create Account | `/create-account` | **PARTIAL** | signup embedded in `/login`, `/vendor-login`, `/apply/login`; no unified role-picker page |

#### Per-page specification

**1. Home (`/`)** — *Goal:* route each visitor to their lane in under 10 seconds. *Message:* "The private sourcing desk for El Paso–Juárez industry." *Sections:* language chooser (keep the existing popup pattern); hero with dual CTA; three-lane selector (Warehouses / Manufacturers / Vendors); how-it-works strip; category wall; confidentiality promise; event strip; footer. *CTA:* "Request a Quote" + "Become a Vendor." *Trust:* bilingual toggle, confidentiality-by-design explainer, "AI drafts, humans decide" note, regional identity (bridge/borderplex imagery). *Action:* rebuild as a Next page reading `site_content`; retire the redirect and the `admin.html` link.

**2. For Warehouses (`/warehouses`)** — *Goal:* convert El Paso warehouse/3PL/distribution operators into tickets. *Message:* "One request. Every warehouse need. Vendors compete for you — confidentially." *Sections:* pain framing (hours lost calling vendors); category grid mapped to intake categories (forklifts, WMS, racking, labor/staffing services, safety, facility); 3-step flow; sample anonymized quote comparison; worker-friendly technology note. *CTA:* "Start a Request" → `/intake` (pre-seeded category). *Trust:* "Your competitors never know you're shopping" (backed by `hide_identity` + `quote_packets` anonymization); no-cost-to-request statement.

**3. For Manufacturers (`/manufacturers`)** — *Goal:* convert Juárez maquiladora/manufacturing buyers; **ES-default, EN toggle**. *Message (ES):* "Encuentre proveedores para su planta — calidad, mantenimiento, empaque, etiquetado, capacitación — sin revelar su identidad." *Sections:* plant-side categories (quality, maintenance/MRO, packaging, labeling/barcode/RFID, IoT, safety, training, cross-border logistics); cross-border sourcing explainer (US vendors serving Juárez plants and vice versa); worker-support pledge prominent (maquila workforce sensitivity is highest here). *CTA:* "Iniciar una solicitud" → `/intake?lang=es`. *Trust:* Spanish-first everything, confidentiality mechanics, human review of all AI output.

**4. For Vendors (`/for-vendors`)** — *Goal:* explain the vendor value proposition before the form. *Message:* "Qualified, anonymized opportunities delivered to you. Quote in minutes with AI help. Pay only when introduced." *Sections:* how opportunities arrive (`vendor_opportunities` flow); the AI quote assistant demo (screenshot of `/vendor/quotes`); what confidentiality means for vendors (you never see competing quotes — RLS-enforced); commission/introduction model summary (details in the business-model section); bilingual selling advantage. *CTA:* "Apply to Join" → `/apply`. *Trust:* private catalog promise (vendor list is never publicly scraped — `vendor_applications` has zero public read path per its RLS), non-circumvention cuts both ways.

**5. For Events (`/events`)** — *Goal:* sell NXT//LINK as the connection layer around regional B2B events and trade shows. *Message:* "Meet the right ten companies, not a hundred badges." *Sections:* pre-event matching (submit needs before the event, arrive with confirmed meetings); vendor event packages (curated invite lists, demo-slot matching); post-event follow-through via the quote pipeline; upcoming-events module placeholder (populated by the Conference & Event Strategy modules — event catalog, scoring, invite-list builder — when they land; the existing `conferences` table with 1,700+ events and `/api/conferences` endpoints are the data substrate). *CTA:* "Plan your event presence" (event-flavored intake). *Trust:* candidate partners named honestly as targets-to-verify (chambers of commerce, Borderplex Alliance, INDEX Juárez) — never claimed as confirmed.

**6. How It Works (`/how-it-works`)** — *Goal:* remove process fear for both sides. *Message:* "Describe → We match confidentially → Compare quotes → Connect when you're ready." *Sections:* client journey using the 10 client-facing statuses already defined in `src/lib/assistant/branding.ts`; vendor journey (opportunity → AI-assisted quote → introduction); confidentiality deep-dive (what each party sees at each stage — directly derived from the RLS design); AI-with-human-review explainer; FAQ. *CTA:* both funnels. *Trust:* the honesty of showing the actual pipeline stages builds more trust than marketing gloss.

**7. Marketplace / Solutions Directory (`/marketplace`)** — *Goal:* SEO surface + self-serve browsing of solution categories and approved public vendor listings. *Message:* "Browse the solution space; request quotes on anything." *Sections:* category taxonomy pages; opt-in public vendor cards (only vendors who choose visibility — the legacy `vendors` table already restricts anon reads to `approved/active` status via `20260323_rls_policies.sql`); "can't find it? open a ticket" banner on every category. *CTA:* per-category "Request quotes." *Decision required:* the Era-1 `/vendors` and `/products` pages surface scraped intel data; the curated marketplace must be a separate, opt-in view of `vendor_profiles` — do not expose applicants (`vendor_applications` is private by design). *Trust:* "listed" ≠ "endorsed" labeling; verified-vendor badge criteria.

**8. Request a Quote (`/request-quote` → `/intake`)** — **BUILT.** *Goal:* the client conversion. *Message:* "Tell us once. We do the legwork." *Sections:* the existing bilingual AI wizard (category detection, 5–9 adaptive questions, confidentiality preferences, file upload via `request_files`). *CTA:* submit → confirmation with `REQ-` reference + status expectations. *Trust:* NDA/MNDA options in-flow, explicit share-permission questions (already implemented in `intake-flow.ts`), works even if AI is down (deterministic fallback). *Action:* add the marketing alias route and a short pre-wizard reassurance screen.

**9. Become a Vendor (`/become-a-vendor` → `/apply`)** — **BUILT.** *Goal:* the vendor conversion. *Sections:* existing low-friction application (no login required; account claim later via `/apply/login`, status tracking at `/apply/status`; logo + up to 3 product images to private buckets). *CTA:* submit → `APP-` reference. *Trust:* "your application is private — never published" (true by RLS); human review promise. *Action:* consolidate the parallel `/vendor-signup` → `vendor_profiles` flow with the `/apply` → `vendor_applications` flow, or clearly assign each a distinct role (fast directory listing vs. full marketplace membership).

**10. Case Studies (`/case-studies`)** — **MISSING.** *Goal:* proof. *Message:* "Real requests, real quotes, real outcomes — identities protected." *Sections:* anonymized deal stories in problem→match→outcome format (the anonymization discipline of `quote_packets` extends naturally to marketing); metrics only when actually measured — **no fabricated statistics**; launch state: "pilot program" framing with 2–3 anonymized pilot walkthroughs once real ones exist. *CTA:* "Start your request." *Trust:* the anonymization itself demonstrates the confidentiality promise.

**11. About (`/about`)** — **MISSING.** *Goal:* legitimacy for skeptical industrial buyers. *Sections:* why the border, the neutral-broker stance, worker-friendly commitment (full pledge text EN/ES), team, regional roots. *CTA:* soft — "Talk to us." *Trust:* photos of real people, physical regional presence, the pledge in writing.

**12. Contact (`/contact`)** — **PARTIAL.** *Goal:* catch everyone who won't self-serve. *Sections:* short bilingual form (name, company, need, language preference) writing to the `leads` table (source `contact_form` — schema ready in the unapplied `20260705` migration); direct email; ChatWidget prompt; optional meeting booking via the existing Zoho Meeting integration (`src/lib/zoho/meeting.ts`). *CTA:* "Send — we reply within one business day" (commit only if staffed). *Trust:* human response promise, Spanish-language response parity.

**13. Sign In (`/sign-in`)** — **PARTIAL.** *Goal:* one door for all roles. Today there are four sign-in surfaces (`/sign-in`, `/login`, `/vendor-login`, `/apply/login`). *Action:* make `/sign-in` the single entry that routes by `platform_users.role` (client → request status, vendor → `/vendor/portal`, applicant → `/apply/status`, admin → `/admin/requests`); keep the existing animated UI (`src/app/sign-in/page.tsx`). *Trust:* "we never share your login across the marketplace divide."

**14. Create Account (`/create-account`)** — **PARTIAL.** *Goal:* explicit role-choice signup ("I need solutions" / "I provide solutions") instead of the current signup forms embedded inside three login pages. Client accounts already auto-provision via the `on_auth_user_created` trigger → `platform_users` (role `client`); vendor path routes into `/apply`. *CTA:* role cards → the matching flow. *Trust:* minimal required fields; bilingual from the first screen.

**Cross-page requirements:** every page reads copy from `site_content` (bilingual, draft/publish — table BUILT, wiring MISSING); every page carries the worker-friendly pledge in the footer (EN: "Technology that supports your workforce — never replaces it." / ES: "Tecnología que apoya a su gente — nunca la reemplaza."); every claim about confidentiality on these pages must remain literally true of the RLS implementation, which is the platform's most defensible marketing asset.
