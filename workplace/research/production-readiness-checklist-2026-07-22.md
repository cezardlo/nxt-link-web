# NXT//LINK production-readiness checklist triage

**Date:** 2026-07-22

**Input:** founder-provided 17-area web-app checklist

**Scope:** evidence-based repository audit and prioritization; no runtime code,
database, fee-engine, deployment, or production setting changed

## G1 mini-spec

1. Compare the checklist with the current NXT//LINK repository.
2. Do not count framework/cloud defaults as missing custom code.
3. Do not mark a feature complete merely because a file or package exists.
4. Separate MVP requirements from launch hardening and enterprise scaling.
5. Keep NXT//LINK's Project-centered purchasing model as the product priority.
6. Treat privacy, auth, money, and authenticated caching as correctness gates.
7. Prefer evidence from active `src/`, migrations, tests, CI, and binding plans.
8. Treat old intelligence-system files as historical, not current coverage.
9. Record concise priorities in `vault/Backlog.md`; keep full evidence here.
10. Make no deploy, migration, or fee-policy change in this audit.

## Executive decision

The checklist is a good review tool, not an MVP specification. NXT//LINK already
has a meaningful production foundation. The correct next move is not to build
all missing enterprise features. It is to close a small set of safety, testing,
observability, accessibility, SEO, and product-continuity gaps around the core
buyer/vendor Project journey.

Status language:
- **Covered:** meaningful current implementation exists.
- **Partial:** useful pieces exist but the checklist outcome is not dependable.
- **Platform:** primarily provided/configured through Vercel or Supabase; verify
  configuration instead of rebuilding it.
- **Later:** valuable only after usage, integrations, or risk justifies it.

## Area-by-area classification

| Area | Status | Evidence and decision |
|---|---|---|
| 1. Core functionality | **Partial, strong** | Supabase email/password sessions, email verification/reset pages, flag-gated Google OAuth, buyer/vendor/admin authorization, profiles, CRUD, search/suggest, cart bulk insert, messages, uploads, and server validation exist. GitHub OAuth is unnecessary for this audience. Pagination is uneven; full-text search is basic; several routes use hand-written validation rather than one shared schema standard; upload content checks are incomplete. |
| 2. UX/interface | **Partial** | Responsive screens, a design system target, loading/error/empty states, progress meters, autosave, language persistence, and micro-interactions exist. The app still has mixed design eras, inconsistent toasts/confirmations, limited undo, no shared breadcrumb system, inconsistent offline feedback, and many page-local component/dictionary implementations. Fix the primary buyer/vendor/Project journeys before adding theme options. |
| 3. Accessibility | **Partial** | Root skip link, landmarks, many labels/ARIA attributes, focus styles, alt text, and keyboard-aware controls exist. Coverage is inconsistent across 41 pages. No automated axe tests or completed WCAG-AA audit proves compliance; dynamic feedback rarely uses a shared `aria-live` pattern, and custom modal/error/form associations need flow-by-flow verification. |
| 4. Performance | **Partial + platform** | Next/Vercel provide minification, splitting, compression, CDN assets, and modern transport. `next/font`, lazy images, parallel reads, and Vercel Analytics exist. Verified gaps are recorded in `performance-audit-2026-07-22.md`: unsafe blanket API caching, RFQ N+1 writes, dashboard waterfalls, weak latency evidence, heavy client rendering, and inconsistent optimistic UI. No service worker is needed for the initial transactional MVP. |
| 5. Security | **Partial; launch gate** | HTTPS/WAF/at-rest encryption are platform concerns; server-side authorization, signed httpOnly admin cookies, RLS migrations, parameterized Supabase queries, security headers, request IDs, rate limiting, secret env vars, audit logs, anti-bot checks, input caps, and contact masking exist. Missing/weak: CSP, HSTS, auth-specific distributed throttling/lockout evidence, dependency scanning config, centralized security alerts, magic-byte/malware upload checks, and a documented CSRF assessment. Never rely on middleware as the only auth check. |
| 6. SEO/discoverability | **Partial** | Root title/description/robots/Open Graph/Twitter metadata, semantic headings, redirects, and helpful 404 exist. Only Terms/Privacy have page metadata; dynamic public listing/vendor metadata is absent. No `robots.ts`, `sitemap.ts`, canonical strategy, social images, or JSON-LD was found. Public marketplace pages should receive these; authenticated workspaces should remain noindex/private. |
| 7. Analytics/monitoring | **Weak** | Vercel page analytics, request IDs, health and ledger-reconcile endpoints, audit tables, and LLM latency exist. Missing: product event taxonomy/funnel tracking, centralized error reporting, uptime alerts, RUM/Core Web Vitals dashboard, API/error/slow-query alerts, and business/feature-adoption dashboards. Session recording/heatmaps require an explicit privacy decision and are not launch necessities. |
| 8. Infrastructure/hosting | **Platform-adequate** | Vercel + Supabase already provide scalable hosting, CDN/storage, TLS, managed database, and deployment previews; cron jobs and a legacy Docker setup exist. Verify backup/PITR plan, production plan tiers, environment separation, health alerting, and rollback process. Load balancers, autoscaling groups, custom containers, Redis, queues, Terraform, blue-green infrastructure, and multi-region architecture are later unless measured load or SLA requires them. The existing Docker file references removed intelligence paths and is not a truthful marketplace dev environment. |
| 9. Development/DevOps | **Partial** | Git, branch rules, binding six-gate process, ESLint, TypeScript, tests, env examples, plan/decision records, runbooks, and GitHub Actions exist. Critical mismatch: CI push trigger uses `main`, while live deploy branch is `master`. Missing/weak: formatter/pre-commit standard, Dependabot, PR template, current API reference, centralized logs, incident/on-call runbook, and a truthful one-command local setup. Feature flags exist for selected capabilities but not as a managed system. |
| 10. Testing/QA | **Weak beyond unit tests** | Unit tests cover fee math, admin sessions, ledger helpers, rate limiting, sanitization, URL safety, Google auth, retries, and LLM routing. CI runs lint/typecheck/unit/build on PRs. No current integration suite, end-to-end marketplace journeys, visual regression, axe, Lighthouse budget, SAST/DAST, load/stress, or explicit browser/device matrix was found. Money and core Project flows need E2E coverage before broad polish. |
| 11. Legal/compliance | **Partial; attorney gate remains** | Public Terms/Privacy pages, versioned acceptance records, fail-closed click-wrap, consent/agreement migrations, unsubscribe handling, and legal planning exist. Terms explicitly remain draft pending attorney. Missing operational mechanisms include data export/deletion, retention schedule, finalized vendor/payment terms, DPA/subprocessor posture, jurisdiction-specific privacy assessment, and accessibility statement. Do not add a cookie banner unless non-essential cookies or applicable law requires it. |
| 12. Content/media | **Partial** | Vendor media, galleries, brochures, documents, listing drafts/statuses, SVG/icon system, storage, alt fields in many screens, and moderation/reporting exist. Add one media library/metadata model, consistent responsive `next/image` use, stronger content verification, safe document preview/download, and malware scanning before the Deal Room becomes document-heavy. A general CMS/blog is later. |
| 13. Internationalization | **Partial, strategically important** | Core marketplace flows have EN/ES dictionaries, a persistent `nxt_lang` preference, and bilingual onboarding/transactional copy in important paths. Translation logic is duplicated and coverage is uneven. Centralize keys, use locale-aware date/number/currency formatting, respect browser language on first visit, and test Spanish expansion. RTL and many locale URL trees are not needed for the current EN/ES Borderplex launch. |
| 14. Mobile/PWA | **Partial** | Responsive layouts, viewport metadata, touch-oriented screens, manifest/icons, and app-capable metadata exist. The manifest still describes the removed intelligence product and dark branding. No service worker, offline data model, push system, or install prompt exists. Correct the manifest now; defer offline transactions/push until the reliability and consent model is designed. |
| 15. Integrations/APIs | **Partial, sufficient internally** | Internal REST-style route handlers, Zoho, mail providers, Supabase, Google OAuth, cron, health, and future Stripe plans exist. Public API versioning, scoped API keys, OAuth authorization server, public status page, and generalized webhooks are not MVP needs. Add signature-verified Stripe webhooks with Payments P1 and document external integrations when the first partner needs them. |
| 16. Business/marketing | **Partial** | Early-access capture, transactional/welcome/reminder emails, unsubscribe, first-time onboarding, invite links/QRs, and profile completion nudges exist. Missing: product analytics events, feedback mechanism, referral tracking, announcement system, and CMS/resources. Build activation measurement and a small feedback loop before A/B-test, affiliate, referral-platform, or newsletter infrastructure. |
| 17. Data/storage | **Partial, strong schema base** | Relational Supabase schema, migrations, RLS, audit logs, many indexes, server-only secrets, storage buckets, ledger reconciliation, statuses, and some recoverable moderation states exist. Verify backups/PITR and indexes against real query plans. Define retention/anonymization/export/deletion. Soft-delete semantics are inconsistent; PostgreSQL full-text search is not a unified marketplace capability. A graph/document database is not justified for the active marketplace. |

## P0 - before treating a preview as launch-ready

1. **Cache isolation:** remove the blanket public `/api/(.*)` cache header and
   explicitly keep authenticated buyer/vendor/admin responses private/no-store.
2. **CI branch correction:** run push verification for `master` (and optionally
   the active integration branch), not only nonexistent `main`; retain PR checks.
3. **Manifest truth:** replace Technology Intelligence/IKER/signals wording with
   the active industrial marketplace and current violet/warm-white branding.
4. **Security headers:** add HSTS and deploy CSP in report-only mode first;
   inventory inline CSS/styles, fonts, images, Supabase, Vercel Analytics, and
   OAuth domains before enforcement.
5. **Error and uptime visibility:** add centralized exception reporting and an
   external uptime check for homepage, auth, health, marketplace, and one private
   synthetic flow that never touches real customer data.
6. **Deployment gates already owned by Cesar:** apply/verify the Wave-1 database
   migrations and environment settings in the existing deploy checklist. No
   agent deploys or applies live migrations without explicit approval.

## P1 — prove the actual marketplace experience

1. Add Playwright journeys for buyer signup/onboarding -> project/RFQ -> message
   -> quote -> accept; vendor edit/list/respond/demo/pilot; operator approve/match/
   moderate/reconcile. Seed isolated test data, never production data.
2. Add axe checks and a manual keyboard/screen-reader/mobile checklist to those
   same journeys; fix primary flow barriers before auditing low-traffic admin UI.
3. Add dynamic metadata, sitemap/robots/canonical rules, and accurate JSON-LD
   for public listings/vendors. Keep drafts, private projects, auth, and admin out
   of search indexes.
4. Harden uploaded documents with signature/magic-byte inspection, safe download
   headers, quarantine/scanning, metadata/alt text, and ownership/retention rules.
5. Centralize EN/ES keys and formatting; default from browser preference only on
   first visit, then respect the saved user choice.
6. Add product events for onboarding completed, listing published, project
   created, action type selected, vendor responded, demo/pilot progressed, quote
   accepted, purchase completed, and reorder - without message/document content.
7. Implement the performance work in the linked performance audit and set a
   measured p95/Core Web Vitals baseline before creating arbitrary budgets.

## Later - require evidence before building

- MFA/WebAuthn for normal users (consider earlier for operator/payment admins).
- Service worker, offline mutation queues, A2HS promotion, and web push.
- GraphQL, public API keys/scopes, generalized webhooks, and public status page.
- Redis/cache tier, message queue, custom load balancer/autoscaling, Terraform,
  canary/blue-green infrastructure, and cross-region data replication.
- RTL, many locale URL trees, enterprise translation platform.
- Session replay/heatmaps, A/B platform, affiliate/referral platform, CMS/blog,
  NPS suite, and marketing-automation stack.
- Microservice contract tests and graph/document stores while the app remains a
  coherent Next.js + Supabase product.

## Explicit non-findings and corrections

- Do not build password hashing in application code; Supabase Auth owns secure
  credential storage and sessions.
- Do not add GitHub social login merely because it was in the checklist; Google
  and email fit the industrial audience unless research proves otherwise.
- Do not add custom compression, CDN, TLS, connection pooling, or load balancers
  where Next/Vercel/Supabase already provide them; verify configuration/SLOs.
- Do not use public caching for personalized responses in pursuit of speed.
- Do not promise WCAG, GDPR, CCPA, escrow, backups, or uptime from the existence
  of code alone; those claims require operational and legal verification.
- Do not resurrect the legacy intelligence Docker stack or paused product to
  satisfy an infrastructure checkbox.

## Definition of done for this checklist

This checklist is "handled" when each P0/P1 item has an owner, written spec,
verification evidence, and status in the shared backlog. It is not done by
checking every generic line. Enterprise items remain explicitly deferred until
real usage, integration contracts, legal scope, or measured reliability demands
them.
