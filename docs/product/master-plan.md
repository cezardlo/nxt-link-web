# NXT Link — Consolidated Platform Architecture & Implementation Plan

**Status: gating document.** All requirements gathered to date are treated as
ONE product. No further implementation scope is added until this plan and the
current change set are reviewed. Detailed section documents live in
[`docs/product/plan/`](./plan/) (01–10 + codebase inventories); the agent
operating rules live in [`docs/AGENT_INSTRUCTIONS.md`](../AGENT_INSTRUCTIONS.md).

## 1. Mission & positioning

NXT Link connects industrial problems and buying needs (El Paso / Ciudad
Juárez, then other regions) with verified problem-solvers — vendors,
suppliers, service providers, consultants, installers, integrators — while
protecting confidentiality, trust, and NXT Link's introduction (success fee).
Positioning: *the private sourcing desk for the border's industrial economy* —
neutral broker, confidential by architecture (RLS-enforced, not
policy-promised), binational/bilingual EN-ES, human-reviewed AI.
**Worker-support rule:** all copy and matching favor technology that supports
the existing workforce; "replace workers" positioning is banned platform-wide.

## 2. Personas → roles & permissions

~15 spec personas collapse into 5 enforced roles (`platform_users.role`)
plus tags (categories, offering types, segments):

| Role | Sees / does | Never sees |
|---|---|---|
| **customer/buyer** (`client`) | Own tickets, statuses, approved matches, quotes shared with them, own consents | Vendor-private pricing/templates, other customers |
| **vendor/problem-solver** (`vendor`) | Own profile/application, RFQs explicitly sent to them, own quotes/templates, own leads | Competitors, competitor quotes, customer identity pre-reveal, invite universes |
| **operator** (internal; today = admin, later distinct role) | Opportunities, anonymized packets, match tooling, outreach | — (internal-only notes never leave) |
| **admin / super_admin** | Everything + approvals, fee exceptions, policy versions | — |
| **partner/event organizer** | Tag, not a role (deferred) | Anything confidential |

Enforcement layers: Supabase RLS per table (owner-scoped or admin-only) →
server guards (`isAdminRequest`, `getVendorSession`, `getApplicantSession`) →
zod validation → rate limits. One organization/company model with
memberships (users may belong to multiple orgs) is the **target** model —
today auth is per-user with owner-scoped rows; the orgs/memberships migration
is Phase 2.

## 3. Canonical entities (deduplication ruling)

Overlapping ticket/RFQ/quote/opportunity concepts resolve to:

- **Ticket** = `client_requests` (the customer's need, any confidentiality
  mode). THE intake object; adaptive intake writes here.
- **RFQ packet** = `quote_packets` (20260705): the admin/customer-approved,
  anonymized, versioned document vendors actually see. A ticket has ≤1 active
  packet.
- **Quote** = vendor response to a packet (20260705 `quotes` + planned
  `quote_versions`); template-instantiated, versioned, stateful.
- **Quote template** = vendor-private reusable document (sections, variables,
  EN/ES) — extends 20260705 `quote_templates`.
- **Opportunity/Deal** = the commercial workflow wrapper (stage machine §5,
  NDA/NCA gates, fee tracking) — new tables, Phase 2 migration.
- **Event entities** = `event_organizations`, `event_concepts`,
  `invite_lists`, `target_companies`, `wow_ideas`, `event_pipeline_items`
  (20260706) — SECONDARY; they feed the same companies/opportunities, never a
  duplicate pipeline.

## 4. Core vertical slice (the product) & truth table

accounts → vendor onboarding/brochures → adaptive ticket intake →
client-approved RFQ → operator/AI shortlist → protected outreach →
NDA/MNDA/NCA gates → quotes (templates) → comparison/shortlist → demo/site
visit → pilot → SOW/MSA/PO → implementation/support → success-fee tracking.

**Honest status** (details: plan-10 §10.1): auth/roles/intake/matching/vendor
portal/brochure storage/admin review/AI drafting = **functional now**; RFQ
persistence + fan-out, approval & comparison UIs, client dashboard,
notifications send-path = **partial**; brochure AI-extraction w/ vendor
approval, templates system, deal-flow gates, consent ledger, fee
persistence/disclosure UI, operator portal, messaging = **missing (planned)**.
The 20260702→20260705 migration chain is **written but unapplied** — applying
and reconciling it is the first gate of any launch.

## 5. Canonical state machines

- **Ticket ladder** (bilingual, in `src/lib/assistant/branding.ts`): Draft →
  Submitted → Needs clarification → Matching in progress → Waiting for
  customer approval → Sent to vendors → Vendor questions → Quotes received →
  Demo scheduled → Site visit scheduled → In negotiation → Selected vendor →
  Completed | Closed without selection.
- **Quote**: draft → sent → revised → accepted | declined | expired (version
  history; save-as-new-template; internal notes; customer-visible preview).
- **Deal flow** (configurable, Phase 2): initial conversation → qualification
  → NDA/MNDA requested → signed → RFI draft/sent/answered → RFQ
  draft/clarification/sent → vendor questions → quotes received/revised →
  shortlist → demo/site visit → pilot proposed/approved/running/evaluated →
  proposal/SOW → MSA/contract/PO → implementation → acceptance →
  support/renewal; plus on-hold / declined / lost / cancelled. **Stage gates**
  enforce: identity, private documents, and pricing are shared only after the
  required consent + NDA/MNDA (+ NCA for contact reveal) are recorded.
- **Event pipeline** (built, 20260706): research → … → pilot_conversion.

## 6. AI / human boundaries & confidentiality

Binding rules live in `docs/AGENT_INSTRUCTIONS.md` (WAT governance, 10 gates).
Summary: AI drafts/extracts/asks/ranks/explains ONLY; deterministic code
validates/calculates/persists/enforces; humans approve publication, matching
visibility, outreach, quote sending, legal docs, identity reveal, and fees.
Every AI output is draft-first and logged (`ai_draft_logs`). Reveal rules are
field-level, per-vendor, consent-logged, revocable where legally possible;
anonymous / semi-anonymous / identified ticket modes; AI-visible vendor text
may never contain customer identity. NDA/MNDA/NCA templates are
organization-approved starting drafts, **not legal advice**, human/legal
review required.

## 7. Commission / success fee

Deterministic engine: `src/lib/fees/engine.ts` (13 tests). Marginal brackets,
provisional schedule 15% / 12.5% / 10% (first $10k / to $50k / above);
$60,000 → $7,500 (12.5% effective). Eligible base excludes tax, refundable
deposits, separately stated shipping, pass-throughs, refunds/credits/
cancellations unless a negotiated policy says otherwise; supports negotiated
rate, min/max, adjustments-with-reason. Policy is versioned and immutable;
AI may only recommend/flag; admins with elevated permission handle
exceptions. **Disclosure**: both parties see and acknowledge fee terms before
protected introduction AND again before quote acceptance; live calculator +
plain-language fee statement in quotes/deals. Persistence (policies,
acknowledgments, transaction evidence, invoice status) is a Phase-2
migration. Legal/tax review of final language is required before launch.

## 8. Page / API inventory (current)

Public: `/`, `/intake`, `/apply(+login,status)`, `/vendor-signup`,
`/vendor-login`, `/sign-in`, directory browse. Vendor: `/vendor/portal`,
`/vendor/quotes`. Admin: `/admin`, `/admin/{requests,vendors,directory,match}`
(+ planned `/admin/applications`, `/admin/events/*`). APIs: `/api/auth/
access-code`; `/api/apply/*`; `/api/vendor(s)/*`; `/api/platform/requests`;
`/api/match`; `/api/assistant/*`; `/api/chat`; `/api/zoho/*`; `/api/events/
{catalog,ideas,companies,concepts,pipeline,export}` (admin-guarded, zod,
rate-limited; `invites` + `match` routes pending). Full route-by-route table:
`docs/product/plan/inventory-routes.md`.

## 9. Notifications & analytics

`platform_notifications` + `zoho_outbox` (audited email) exist; automated
status emails, in-app notification UI, and per-user notification preferences
are T1/T2 work. Analytics: operator dashboards aggregate regional demand
(ticket themes, category counts, funnel conversion, stalled deals) without
exposing confidential client data; event demand-signals feed event concepts.

## 10. MVP acceptance criteria (vertical slice)

1. Customer signs up, completes bilingual adaptive intake (anonymity mode,
   consent choices, uploads), sees a completeness score, approves an
   AI-drafted editable ticket summary — nothing sent automatically.
2. Admin/operator reviews ticket, generates + edits an anonymized RFQ packet,
   customer approves the exact packet + vendor list before fan-out.
3. Selected vendors see only the packet, respond with structured quotes
   (template-assisted, human-reviewed before send).
4. Customer compares quotes side-by-side, requests meeting/revision,
   accepts/declines; introduction happens only after consent (+ configured
   agreement gates) and fee acknowledgment; all reveals logged.
5. Every step: authz enforced at RLS + route level, validated inputs, rate
   limits, loading/empty/error states, EN/ES, accessible forms; tests cover
   happy path, validation, authorization, confidentiality, failure states.

## 11. Phases

- **MVP (T1)** — complete the vertical slice on existing rails (plan-10
  §10.1 "Build first" list) + apply/reconcile migrations.
- **Phase 2 (T2)** — quote templates full system, fee persistence +
  disclosure, consent ledger, NDA/MNDA/NCA records + deal-flow stage gates,
  orgs/memberships model, vendor-applications admin queue, notifications.
- **Phase 3 (T3+)** — brochure AI-extraction w/ vendor approval, operator
  field portal (mobile, voice/photo capture, offline-tolerant drafts),
  messaging workspace, funnel dashboard, events UI + matchmaking, reviews,
  then payments/e-sign/CRM/mobile (T4).

## 12. Environment & migrations

Required env (see `.env.example`): Supabase URL/keys, LLM provider keys +
budgets, Zoho OAuth, `ADMIN_ACCESS_CODE` (+ optional `ADMIN_SESSION_SECRET`),
`CRON_SECRET`. Migrations pending apply: 20260625→20260705 chain (platform,
RLS, vendor signup/videos, applications, taxonomy, quotes/deals) +
20260706 (event strategy). Phase-2 migrations to write: orgs/memberships,
quote template sections/variables + quote_versions + activity history,
deal-flow (opportunities, stage history, agreements NDA/MNDA/NCA, consent
ledger), fee (policies, agreements, acknowledgments, transactions,
adjustments), notifications preferences.

## 13. Risks & test plan

Risks + mitigations: plan-10 §10.4. Test plan: unit tests for every
deterministic lib (matching, scoring, fees, validation, csv, sessions —
75 passing today); route-level authz tests (guards reject anon/vendor on
admin routes; vendors cannot read competitor rows); permission tests for
every reveal gate; stage-transition tests for deal flow; fee calculations
incl. thresholds/refunds/authorization; intake branching + EN/ES snapshot
checks; `npm run verify` (lint + typecheck + tests + build) green before any
merge.
