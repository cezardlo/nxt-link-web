# Claude App to Claude Code Handoff — NXT Link

Date: 2026-07-06

This document transfers the important product and project context from the
user's Claude web-app conversations into Claude Code in VS Code. Read this
file, `CLAUDE.md`, and `docs/product/master-plan.md` before continuing.

## What the user is building

NXT Link is a private, bilingual B2B sourcing and deal-coordination platform
for El Paso and Ciudad Juarez, expanding later to other regions. It connects
companies with industrial problems to verified problem-solvers: technology
vendors, suppliers, service providers, installers, integrators, consultants,
and innovators.

Plain-language positioning:

> NXT Link connects problems with the correct problem-solvers. We bring the
> right companies together, protect confidential information, manage the
> process, and earn a disclosed success fee when a purchase happens.

The product must support human workers and improve safety, quality,
productivity, visibility, training, and maintenance. Do not position it as a
worker-replacement platform.

## Users and portals

### Customer / buyer

- Creates an account and company profile.
- Describes a need in plain English or Spanish.
- Uses AI-guided intake that asks only relevant missing questions, including
  quantity, timeline, budget/range, location, integrations, constraints,
  decision criteria, confidentiality, and desired outcome.
- Chooses anonymous, semi-anonymous, or identified sharing.
- Reviews and approves the exact information and vendor list before anything
  is sent.
- Receives and compares quotes, requests revisions or meetings, shortlists a
  vendor, and follows the project through pilot, purchase, implementation,
  and support.

### Vendor / problem-solver

- Creates an account and company profile.
- Uploads brochures, product sheets, videos, certifications, service areas,
  target industries, target client types, case studies, and pricing notes.
- AI extracts and organizes brochure/product information as a draft; the
  vendor must approve it before publication or matching.
- Receives only opportunities explicitly selected for that vendor.
- Customer identity stays hidden until the approved reveal stage.
- Uses AI to draft quotes, answer RFIs/RFQs, identify missing quote details,
  and create reusable bilingual quote templates.
- Saves, edits, duplicates, versions, and reuses quote templates.
- Never sees competing vendors or their quotes.

### NXT Link operator / admin

- Uses a field-friendly portal to capture a customer need and select likely
  vendors while visiting warehouses, factories, maquiladoras, and logistics
  companies.
- Reviews intake, creates an anonymized RFQ packet, chooses vendors, requests
  quotes, compares responses, controls identity reveal, manages agreements,
  schedules demos/site visits, and advances pilots and paid projects.
- Sees clear explanations for AI matching, but makes the final decision.
- Manages vendors, customers, opportunities, communications, documents,
  event strategy, and fee records.

## Required deal workflow

The product is not only a directory or chat tool. It must manage a controlled
commercial workflow:

1. Initial conversation
2. Qualification and smart intake
3. NDA or MNDA requested and signed when required
4. RFI drafted, approved, sent, and answered
5. RFQ drafted and clarified
6. Customer approves the RFQ packet and vendor list
7. RFQ sent to selected vendors
8. Vendor questions and clarifications
9. Quotes received and revised
10. Side-by-side comparison and shortlist
11. NCA / introduction protection and identity reveal when approved
12. Demo or site visit
13. Pilot proposed, approved, run, and evaluated
14. Proposal, SOW, MSA/contract, and purchase order
15. Implementation, acceptance, support, and renewal

Include on-hold, declined, lost, cancelled, and closed-without-selection
states. Every reveal, approval, agreement, and stage change must be logged.
AI drafts and recommends; deterministic code validates, calculates, persists,
and enforces gates; humans approve consequential actions.

## Quotes and AI assistance

- AI should create quote drafts from opportunity details and vendor data.
- AI should ask for missing information rather than inventing it.
- Quote fields include scope, quantity, unit pricing, implementation,
  delivery/timeline, assumptions, exclusions, taxes, shipping, warranties,
  support, payment terms, validity period, and optional services.
- Vendors can save a quote as a reusable template and create several
  templates for different products/services.
- Templates need variables, optional sections, EN/ES variants, version
  history, internal notes, and customer-safe preview/PDF output.
- No quote is sent automatically; the vendor/operator must approve it.

## Confidential matching

- AI ranks vendors based on category, product/service fit, industry,
  geography, company size, pain point, technology readiness, budget,
  timeline, integrations, certifications, and worker-support value.
- Show human-readable reasons for each match.
- Customer identity and sensitive operational data are withheld until the
  customer approves disclosure and configured agreement gates are satisfied.
- A customer approves the exact RFQ packet and vendor list before fan-out.
- Preserve vendor-private pricing, templates, and notes.
- Never expose competitor quotes to vendors.

## Success fee

The user wants a clearly disclosed NXT Link fee, generally 10–15% depending
on purchase size. The deterministic fee engine currently uses provisional
marginal brackets of 15%, 12.5%, and 10%; do not let AI perform the binding
calculation. Both sides must acknowledge the current versioned fee policy
before a protected introduction and again before quote acceptance. The fee
base, exclusions, adjustments, evidence, invoice, payment status, and any
authorized exception must be auditable. Final legal and tax wording requires
professional review before launch.

## Conference and event strategy

NXT Link also uses B2B conferences, supplier expos, manufacturing/logistics
events, and cross-border business events to find prospects, vendors, and
technology partners. The platform should help catalog and score events,
segment target companies, build invite lists, create event concepts, match
vendors with local industrial companies, plan impressive worker-supporting
demos, schedule private meetings, and convert conversations into audits,
pilots, and paid projects.

Important local event concepts include:

- El Paso Warehouse Technology Showcase
- Juarez Manufacturing Tech Day
- Cross-Border Industrial Innovation Forum
- Smart Warehouse and Maquiladora Solutions Expo
- Worker-Support Technology Demo Day
- Supply Chain Visibility Roundtable
- Quality, Safety, and Productivity Tech Forum

See `docs/architecture/event-strategy-platform.md` for the implemented data
model and APIs.

## WAT operating architecture

Follow `docs/AGENT_INSTRUCTIONS.md`:

- Workflows are Markdown SOPs describing objectives, inputs, tools, outputs,
  approval gates, and failure handling.
- Agents reason and coordinate.
- Deterministic tools execute API calls, transformations, database work, file
  operations, validation, and calculations.
- Look for existing tools before creating new ones.
- When something fails: identify the cause, fix the tool, verify the fix, and
  update the relevant workflow with the learned constraint.
- Keep secrets only in `.env`; never commit credentials.

## Current repository and branch

- Repository: `cezardlo/nxt-link-web`
- Local folder: `C:\Users\Cesar\Documents\New project\nxt-link-restored`
- Working branch: `claude/event-strategy-platform`
- Remote branch: `origin/claude/event-strategy-platform`
- Latest handoff-time commit: `1ff15fb` (`Fix Vercel preview route pattern`)
- Do not overwrite or replace the current production website.
- Use a separate preview/sandbox until the user explicitly approves a
  production release.

## Current demo/deployment situation

- The Vercel branch preview builds successfully, but `/` currently redirects
  to `public/landing.html`, the old marketing website.
- Current Vercel preview used during handoff:
  `https://nxt-link-web-fresh-l30otlpyf-cezardlos-projects.vercel.app`
- The earlier connected customer/vendor/admin prototype is visible on GitHub
  Pages:
  `https://cezardlo.github.io/nxt-link-web/welcome.html`
- That prototype includes customer, vendor, and admin paths, but it is a demo,
  not the final production architecture.
- Real Next.js product routes already exist, including `/intake`,
  `/vendor-signup`, `/vendor-login`, `/vendor/portal`, `/vendor/quotes`,
  `/admin/requests`, `/admin/match`, `/apply`, and `/sign-in`.
- The immediate UX problem is that the sandbox's default entrance shows the
  old marketing site instead of a clear web-app welcome/role-selection page.

## Honest implementation status

Already present or substantially implemented:

- Next.js application and product routes
- Customer AI intake surface
- Vendor signup/login/profile portal
- Brochure and video upload APIs
- Vendor quote workspace and AI drafting helpers
- Admin request review and matching surfaces
- Matching, event scoring, validation, fee engine, and agreement gates
- Supabase schemas/migrations for platform, quotes, agreements, fees, and
  event strategy

Partial or still needing product completion:

- A unified role-based web-app entrance and navigation
- Fully connected customer dashboard
- Persistent RFQ creation, approval, and selected-vendor fan-out
- Complete quote template UI, versions, PDFs, and side-by-side comparison
- End-to-end NDA/MNDA/NCA and deal-stage UI
- Consent/reveal audit interface
- Fee disclosure/acknowledgment and transaction UI
- Notifications and messaging
- Operator field portal
- Brochure AI extraction with vendor approval
- Applying and reconciling pending Supabase migrations in the correct
  environment
- End-to-end testing with real auth and non-production test data

## Immediate continuation order

1. Inspect the current branch and preserve unrelated work.
2. Read `docs/product/master-plan.md` and route/database inventories.
3. Do not apply migrations or touch production data without explicit user
   approval and a verified backup/target environment.
4. Make the preview open a clear NXT Link web-app welcome screen with three
   choices: Customer, Vendor, and NXT Link Operator/Admin.
5. Connect those choices to the real Next.js routes rather than the legacy
   static demo.
6. Build and verify the smallest real vertical slice: customer intake ->
   operator review -> approved anonymized RFQ -> selected vendor quote ->
   customer comparison.
7. Keep the current production website untouched; deploy changes only to the
   branch preview until approved.

## How to communicate with this user

The user is the product owner, not a developer. Use simple, concrete language.
Lead with what changed and what they can click or see. Avoid jargon and long
terminal instructions. When a decision is needed, explain the visible result
of each option. Keep them oriented: say whether work is local, in the sandbox,
on GitHub, or live in production.
