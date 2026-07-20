## Confidentiality System, Trust & Safety

Confidentiality is NXT//LINK's core differentiator: an El Paso warehouse or Juárez maquiladora can describe an operational problem without broadcasting to competitors that it has one, and a vendor can quote without its pricing leaking to rivals. The good news: most of this system is already engineered into the database layer. This section documents the anonymity model, the permission matrix, the trust-and-safety rulebook, and one security defect and its remediation status.

### A. Confidential Matching: Anonymity Modes

Three disclosure modes, selectable per ticket at intake and changeable per vendor later. Bilingual labels are required wherever the mode is shown (the intake wizard at `/intake` already runs EN/ES).

| Mode | EN / ES label | What an invited vendor sees | Status |
|---|---|---|---|
| **Anonymous** | Anonymous / Anónimo | Only the anonymized quote packet: general industry, general location (e.g. "El Paso metro" / "zona Juárez"), problem summary, scope, quantity, timeline, urgency. No company name, no contacts, no exact site. | **BUILT (schema)** — `client_requests.hide_identity`, `quote_packets.hide_client_identity` + packet fields `general_industry`, `general_location`, `problem_summary` (migration `supabase/migrations/20260625_nxtlink_platform.sql`) |
| **Semi-anonymous** | Semi-anonymous / Semianónimo | Packet plus admin-approved extras: budget band (`hide_budget = false`), selected documents, industry specifics — still no identity. | **BUILT (schema)** — `quote_packets.hide_budget`, `files_approved` jsonb; `client_requests.share_summary / share_budget / share_documents` flags |
| **Fully identified** | Identified / Identificado | Client identity revealed to that specific vendor after explicit approval, typically at quote-acceptance/introduction stage. | **BUILT (schema)** — `visibility_permissions` (per request × vendor: `reveal_client`, `reveal_vendor`, `approved_by`); reveal timestamp on `proof_of_introduction.identity_revealed` |

The same model runs in reverse for vendors: a client comparing quotes sees capability, price, and terms — not the vendor's name — until `reveal_vendor` is approved, so clients cannot bypass the platform and vendors' quote structures stay confidential. In the newer deal-comparison schema (`20260705_quotes_deals_private_comparison.sql`, **PARTIAL — migration written, not yet applied**), `deals` carry no client PII by design and clients receive an immutable, tokenized, expiring snapshot (`deal_shares.token`, resolved only by a server route with the service role — no anonymous DB read path exists).

#### Consent-before-reveal workflow

1. Client sets confidentiality flags at intake (`/intake`, stored on `client_requests`) — **BUILT**.
2. Admin builds an anonymized packet (`quote_packets`, status `draft → approved → sent`) — **BUILT (schema + `/admin/requests` drafting)**; the AI admin assistant is prompt-bound to keep identities out of drafts (`src/lib/assistant/prompts.ts` GUARDRAILS: "Do NOT reveal client identity unless admin approval is marked").
3. Vendors quote against the packet only (`vendor_opportunities` → `vendor_responses`) — **BUILT**.
4. Client picks a finalist; admin records a per-vendor reveal approval in `visibility_permissions` with `approved_by` — **BUILT (schema)**, **PARTIAL (no dedicated approval UI yet)**.
5. Introduction is made and evidenced on `proof_of_introduction` (timestamps for terms-accepted, quote-submitted, identity-revealed, client-selected) — **BUILT (schema)**, **PARTIAL (workflow UI)**.

Reveals are per-vendor, not per-ticket: approving Vendor A never exposes the client to Vendors B and C on the same ticket.

#### Exactly which fields are protected

| Protected data | Where it lives | Protection mechanism | Status |
|---|---|---|---|
| Customer company name | `client_requests.client_id` → `platform_users.company` | Vendors have **no RLS path to `client_requests` at all** (owner-or-admin only, `20260626_nxtlink_rls_user.sql`); packets carry `general_industry` only | BUILT |
| Customer contact info | `client_requests.contact_email/contact_name`; `platform_users` | Same RLS; `platform_users` readable only as own-row-or-admin | BUILT |
| Facility details | `client_requests.location` | Packet exposes `general_location` only | BUILT (schema) |
| Sensitive documents | `request_files` + private storage | `visibility` enum (`private / admin_only / selected_vendors / selected_client`), `nda_required`, `approved_to_share`; no client/vendor RLS policy — server-mediated only | BUILT (schema), PARTIAL (share UI) |
| Pricing expectations / budget | `client_requests.budget_range` | `share_budget` flag + `quote_packets.hide_budget` | BUILT |
| Operational problems | `client_requests.problem`, `intake_answers` | Vendors see the admin-approved `problem_summary` rewrite only | BUILT |
| Quote details | `vendor_responses`; `quotes` (pending schema) | RLS: vendor sees **own quotes only** (`vendor_id = current_pu_id()` / `current_vendor_id()`); zero cross-vendor visibility; `deal_invites` never reveal co-invitees | BUILT / pending apply |
| Private conversations & notes | `admin_notes`, `ai_draft_logs`, `zoho_outbox`, `platform_notifications` | Admin-only or service-role-only RLS; GUARDRAILS: "Never show internal notes to clients or vendors" | BUILT |
| Vendor identity & contact data | `vendor_profiles`, `vendor_applications` | Service-role-only / admin+owner-only RLS — the vendor catalog is **never publicly readable** ("catalog never public", `20260702_vendor_applications_private_intake.sql`); Zoho OAuth tokens in `zoho_connections` are service-role only | BUILT |

#### Vendor document & brochure protection

All three storage buckets are **private**: `vendor-brochures` (`20260629`), `vendor-logos` and `vendor-product-images` (`20260702`, pending apply). Nothing is served by public URL; every read mints a short-lived signed URL (1-hour expiry) server-side — see `createSignedUrl(path, 3600)` in `src/app/api/vendor/brochures/route.ts`, `src/app/api/vendor/profile/route.ts`, and `src/app/api/apply/my/route.ts`. Vendor-portal routes scope strictly to the caller's own profile row (`src/lib/vendor/auth.ts` — never a client-supplied vendor id).

**Gap to fix:** the legacy route `src/app/api/vendors/brochures/route.ts` has **no auth guard** — GET lists any vendor's brochures by `vendor_id` with fresh signed URLs, and POST lets anyone upload into any vendor's folder using the admin client. The vendor-session-gated `/api/vendor/brochures` already covers the legitimate use; the ungated route should be deleted or admin-gated before launch. (If brochures are meant to be public marketing collateral for *approved* vendors, that should be an explicit per-file `is_public` choice, not a default.)

### B. Role-Based Permission Matrix

Roles come from `platform_users.role` (`public | client | vendor | admin | super_admin`, `20260625`), enforced in three layers: Postgres RLS, service-role server routes, and route guards (`isAdminRequest` in `src/lib/assistant/auth.ts`, `getVendorSession` in `src/lib/vendor/auth.ts`, `getApplicantSession` in `src/lib/apply/auth.ts`).

| Resource | Public | Client | Vendor | Admin | Super_admin |
|---|---|---|---|---|---|
| **Tickets** (`client_requests`) | Submit via `/intake` (server-mediated); no read-back | Own tickets only (RLS owner policy) | **None** — sees anonymized packets only | All | All |
| **Quotes** (`vendor_responses`, `quotes`) | None | Curated comparison via tokenized `deal_shares` link only | Own quotes only; never other vendors' | All + curation flag (`selected_for_client`, guarded by `guard_quote_update()` trigger) | All |
| **Documents** (`request_files`, storage buckets) | None | Own uploads | Files explicitly approved to the packet (`files_approved`); own brochures/logos via signed URLs | All, via signed URLs | All |
| **Messages/notes** (`admin_notes`, `zoho_outbox`, notifications) | None | Own notifications | Own notifications | All; sends email/meetings via admin-gated `/api/zoho/*` | All |
| **Directory** (`vendor_profiles`, `vendor_applications`) | Approved-vendor public cards only (no contact data) — *policy target; today the catalog is fully private* | Anonymized vendor capability summaries during comparison | Own profile/application (owner RLS + `guard_vendor_application_update()` trigger) | All + approve/reject | All + role management |
| **Events** (conferences data + planned event modules) | Era-1 `conferences` catalog is anon-readable today | Event recommendations (planned module) | Event recommendations (planned) | Event dashboard, scoring, invite-list builder — **admin-only by default** | All |

Notes: (1) `super_admin` is currently identical to `admin` in every policy (`is_admin()` checks `role in ('admin','super_admin')`, `20260626`) — differentiating it (user/role management, commission-terms versioning, destructive operations) is **MISSING** and recommended. (2) The planned Conference & Event modules must land on the Era-2 side of the access split: invite lists and company-match outputs contain exactly the client/vendor identities the rest of the platform protects, so they get admin-only RLS plus service-role writes, not the Era-1 anon-read pattern.

### C. Trust & Safety Rulebook

| Rule | Mechanism | Status |
|---|---|---|
| **Vendor verification** | Every vendor passes admin review before matching: `vendor_applications` / `vendor_profiles` status `pending → approved/rejected`; reviewed at `/admin/vendors`; matching engine scores only approved vendors by default (`src/lib/matching.ts`, +8 for approved). A SECURITY DEFINER trigger (`guard_vendor_application_update`, `20260702b`) silently reverts any non-admin attempt to self-approve — even via direct REST calls. | BUILT |
| **Customer verification** | Auth accounts auto-provision as `client` (`handle_new_auth_user()`, `20260626`); admin reviews tickets before any vendor sees them. Formal business verification (email domain match, phone verification, RFC/EIN check for larger deals) | PARTIAL — recommend adding before high-value RFQs |
| **Consent before sharing** | `share_summary/share_budget/share_documents/hide_identity` collected at intake in EN/ES (`src/lib/assistant/intake-flow.ts` closing questions include NDA and share-permission); per-vendor `visibility_permissions` | BUILT (schema + intake), PARTIAL (approval UI) |
| **No spam** | Vendors receive only admin-routed opportunities (`vendor_opportunities` / `deal_invites`); vendors cannot discover or cold-contact clients (no RLS path); all outbound email goes through admin-gated `/api/zoho/email` and is logged to `zoho_outbox`. Policy: platform introductions only; repeated off-platform solicitation = suspension (`vendor_profiles.status = 'paused'` exists). | BUILT (routing), policy text to publish |
| **No fake quotes** | Every AI draft is marked `is_draft: true` and logged to `ai_draft_logs` with `approval_status` (`src/lib/assistant/llm.ts`); `vendor_responses.ai_generated` flags machine-drafted quotes; GUARDRAILS forbid auto-sending and pricing promises; quotes bind the vendor once submitted. | BUILT |
| **No misleading product claims** | Admin review of vendor descriptions/brochures at approval; worker-friendly language check (claims must be about productivity, safety, quality, visibility, training, maintenance — never workforce replacement, per platform positioning); right to reject/pause listings. | PARTIAL — process exists, checklist to formalize |
| **Document access controls** | Private buckets + 1-hour signed URLs + `request_files.visibility` + append-only `platform_audit_log` and `audit_log` (no-update/no-delete rules, `20260323_audit_log.sql`) | BUILT |
| **Review & dispute process** | Structured post-introduction reviews, dispute intake, mediation SLA, and outcome recording | MISSING — design: reviews attach to `proof_of_introduction` outcomes only (verified transactions, no drive-by reviews); disputes open a ticket type visible to admin + both parties; resolution logged to `platform_audit_log` |
| **Introductions & commissions** | `proof_of_introduction` records lifecycle + `commission_terms_version` + `agreement_status`; the bilingual terms generator already emits an NXT//LINK introduction/non-circumvention block and a mandatory "not legal advice" disclaimer (`src/lib/assistant/terms.ts`, served by `/api/assistant/terms`) | BUILT (schema + terms text), PARTIAL (signature/acceptance flow) |

#### Data privacy practices (US + Mexico) — practical level

Cross-border matching means personal data of Mexican and US contacts flows through one platform. Practical obligations to implement (label: **recommendations pending counsel review**, not legal advice):

- **Mexico — LFPDPPP awareness:** publish a bilingual *Aviso de Privacidad* (privacy notice) at collection points (`/intake`, `/vendor-signup`, `/apply`) naming the data controller, purposes, and transfer recipients; honor **ARCO rights** (Acceso, Rectificación, Cancelación, Oposición — access, rectification, cancellation, objection) via a documented request channel; obtain consent before transferring a Juárez contact's data to a US vendor — the per-vendor `visibility_permissions` approval doubles as this consent record.
- **US side:** no single federal law; follow Texas state privacy law and FTC "unfair or deceptive practices" baselines — accurate privacy policy, honor stated retention, breach notification plan. Verify current Texas requirements with counsel.
- **Already-built supports:** data minimization by design (vendors never receive client PII by default), append-only audit logs, service-role-only storage of Zoho tokens, EN/ES locale field on `platform_users` and `client_requests` for notice delivery in the user's language.
- **To add:** retention schedule (e.g. purge rejected applications and expired `deal_shares` after a defined window), data-export/delete endpoint for ARCO/consumer requests, subprocessor list (Supabase, Zoho, LLM providers — note `ai_draft_logs` truncates prompts to 4,000 chars but still stores request text, so LLM-bound data belongs in the notice).

### D. Security Defect: the Hardcoded '4444' Access Code — Remediation Status

**Defect (confirmed in repo history):** `src/lib/privateAccess.ts` exported a hardcoded `PRIVATE_ACCESS_CODE = '4444'` that shipped in the client JavaScript bundle and doubled as the server-accepted `x-access-code` header for admin routes (`/api/match`, `/api/zoho/*`, admin assistant). Anyone reading the bundle had admin API access — cosmetic gating, not security.

**Remediation (BUILT in the current working tree):**

- `src/lib/server/admin-session.ts` — server-only module; code lives in the `ADMIN_ACCESS_CODE` env var, never sent to the browser; constant-time comparison (`timingSafeEqual` over SHA-256); HMAC-signed httpOnly cookie `nxt_admin_session` with 12-hour TTL, secret from `ADMIN_SESSION_SECRET`.
- `src/app/api/auth/access-code/route.ts` — verifies the code server-side, rate-limited to 5 attempts/minute per client IP, sets the cookie (`secure` in production, `sameSite: lax`).
- `src/lib/assistant/auth.ts` `isAdminRequest()` — now accepts only: a signed-in Supabase `admin`/`super_admin`, the signed cookie, or (transitional, for scripts) an `x-access-code` header checked against the **env** code in constant time.
- `src/lib/privateAccess.ts` — reduced to a UI hint: `localStorage` stores a non-secret "granted" flag that authorizes nothing by itself.

**Remaining hardening (recommended order):** (1) rotate/retire any deployment still configured with a guessable code and set a strong `ADMIN_ACCESS_CODE` + distinct `ADMIN_SESSION_SECRET`; (2) sunset the transitional `x-access-code` header once tooling moves to per-admin Supabase accounts; (3) enforce MFA for admins (`platform_users.mfa_enabled` column exists, unenforced); (4) move rate limiting from the in-process `Map` (`src/lib/http/rate-limit.ts`) to a shared store before multi-instance deployment; (5) close the Era-1 leftovers that predate the private-by-default model — world-writable RLS on `causal_maps`, `decision_log`, `exhibitors`/`enriched_vendors`, and the ~161 unguarded intel API routes (inventory: `undefined/inventory-db.md` §6, `undefined/inventory-routes.md`) — none touch marketplace PII, but they share the deployment and the brand.
