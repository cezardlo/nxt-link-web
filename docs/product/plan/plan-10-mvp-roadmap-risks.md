# 10. MVP Status Map, Admin Dashboard, Roadmap, Risks & Recommended First Version

## 10.1 MVP feature status map

Status is against the working tree of `claude/event-strategy-platform`
(clean branch = master + reviewed website-functionality work + security
hardening + event-strategy foundation). **BUILT** = code exists and passes
typecheck/tests; it may still depend on unapplied migrations (flagged).

| MVP feature (both specs) | Status | Where / gap |
|---|---|---|
| User accounts (Supabase auth, cookie sessions) | BUILT | `src/lib/supabase/server-auth.ts`, `browser-auth.ts` |
| Roles (public/client/vendor/admin/super_admin) | BUILT | `platform_users.role` (20260625/20260626 migrations) |
| Admin auth without shared hardcoded code | BUILT | `src/lib/server/admin-session.ts` + `POST /api/auth/access-code`; env `ADMIN_ACCESS_CODE` |
| Vendor sign-up (directory profile) | BUILT | `/vendor-signup` → `vendor_profiles` |
| Vendor private application intake | BUILT | `/apply`, `/apply/login`, `/apply/status` (migration chain 20260702–20260704 **not yet applied**) |
| Vendor profile self-service | BUILT | `/vendor/portal` + `/api/vendor/*` (owner-scoped) |
| Brochure upload (private bucket + signed URLs) | BUILT | `/api/vendor(s)/brochures`, private storage |
| AI brochure **extraction → editable record → vendor approval** | MISSING | Spec'd in plan-05; no extraction pipeline yet |
| Product/service listings & categorization | PARTIAL | Category/offering-type facets exist; no per-product records |
| Ticket submission form (bilingual, AI-guided) | BUILT | `/intake` + `src/lib/assistant/intake-flow.ts` → `client_requests` |
| Ticket fields: company type, facility size, employees, site-visit, wants-multi-select, anonymity mode | PARTIAL | Engine is data-driven; fields cheap to add (plan-04 §a) |
| AI ticket categorization + missing-info + clarifying Qs | BUILT | draft-first via `aiDraft` + `ai_draft_logs` |
| Professional RFQ rewrite persisted & fanned out to vendors | PARTIAL | Drafted in `/admin/requests`; not persisted to `quote_packets`/vendor opportunities (top workflow gap) |
| Confidential matching (deterministic + explainable) | BUILT | `/api/match` + `src/lib/matching.ts`; identity anonymized in packets |
| Customer approval before vendor sees ticket | PARTIAL | Status ladder supports it; approval UI missing |
| Admin review of vendors | BUILT | `/admin/vendors`, `/admin/directory`; applications queue UI MISSING |
| Vendor notifications | PARTIAL | `platform_notifications` + `zoho_outbox` tables exist; no automated sends, no in-app UI |
| Vendor quote responses | BUILT* | `/vendor/quotes` AI quote builder (*persists via 20260705 schema — **not yet applied**) |
| Customer quote comparison | PARTIAL | 20260705 comparison schema + tokenized `deal_shares` written, unapplied; comparison UI missing |
| Saved quote templates | PARTIAL | `quote_templates` concept in 20260705; full template/versioning system (sections, variables, PDF, EN/ES) MISSING |
| Basic messaging | MISSING | No message threads yet |
| Ticket status tracking (14-status ladder) | BUILT | bilingual ladder in `src/lib/assistant/branding.ts` + `request_status_history`; client dashboard UI MISSING |
| Marketplace directory | PARTIAL | Exhibitor-style browse + facets built; must be separated from legacy scraped `/vendors` |
| Basic event listing | BUILT | events API (`/api/events/*`, 6 routes, admin-guarded) + `event_organizations`; admin events UI MISSING |
| Success-fee engine (deterministic, versioned, marginal brackets) | BUILT (lib) | `src/lib/fees/engine.ts` + 13 tests; DB persistence, disclosure UI, acknowledgments MISSING |
| Consent logs / audit trail for reveals | PARTIAL | `visibility_permissions`, `ai_draft_logs`, `request_status_history` exist; unified consent-log + reveal gates MISSING |
| NDA/MNDA/NCA gates, deal-flow stages, operator portal | MISSING | Spec'd (master plan §5–6); next migrations |

**Build first** (vertical slice): apply/reconcile the 20260702→20260705
migration chain → persist RFQ packets + vendor fan-out → customer approval +
comparison UI → client dashboard → quote templates on top of 20260705 →
consent/reveal gates + fee disclosure. **Can wait**: events admin UI,
messaging, reviews, analytics dashboards. **Do not build in v1**: payments,
e-sign integration, mobile app, CRM sync, subscriptions.

## 10.2 Admin dashboard vs spec

Built: `/admin/requests` (tickets + AI drafts), `/admin/vendors`,
`/admin/directory` (+ Zoho email/meeting), `/admin/match`, `/admin` (catalog
jobs). Gaps: vendor-applications review queue, brochure review, category
management, analytics, featured vendors, event pages UI, sponsorships,
CSV report UI (API exists at `/api/events/export`), revenue tracking,
dispute/message moderation, confidential-permission manager.

## 10.3 Future roadmap (tranches)

1. **T1 (vertical slice completion)** — RFQ persistence + fan-out, approval
   gates, comparison UI, client dashboard, notifications send-path.
2. **T2 (monetization + trust)** — quote templates full system, fee
   disclosure/acknowledgment + statements, consent ledger, NDA/MNDA/NCA
   records + stage gates, verified badges.
3. **T3 (scale)** — AI brochure extraction with vendor approval, operator
   field portal, deal-flow board + funnel analytics, messaging, reviews,
   event matchmaking UI, EN/ES everywhere, exports/reporting.
4. **T4 (platform)** — payments, e-sign, CRM integrations, mobile app,
   subscriptions, API.

## 10.4 Risks and solutions

| Risk | Mitigation |
|---|---|
| Two-sided cold start | Concierge mode: operator hand-carries first 10 tickets; recruit vendors in categories with ≥3 candidates (plan-03) |
| Unapplied migration chain collides with legacy `vendors` table | Apply in staging first; reconcile naming; gate launch on it (plan-03 week-1 precondition) |
| Confidentiality breach | RLS-first design; reveal only via consent-logged gates; no identity in AI-visible vendor text; tests on guards |
| AI mismatch / hallucinated claims | Deterministic scoring + AI explain-only; human approval gates (docs/AGENT_INSTRUCTIONS.md); low-confidence → human review |
| Fee disputes | Deterministic versioned engine, disclosure + acknowledgment before intro AND before acceptance; immutable policy history; legal review pre-launch |
| Bilingual quality drift | ES-first review for Juárez surfaces; bilingual status ladder already canonical |
| Vendor spam / fake quotes | Admin approval gate, rate limits, dedup/junk jobs (built), no-spam terms |
| Single-operator bandwidth | Dashboard queues + reminders (T3); keep MVP scope narrow |

## 10.5 Recommended first version

Ship the **hardened existing flow, completed end-to-end** — not a green-field
build: intake → admin match → RFQ packet persisted → customer-approved vendor
fan-out → vendor quote → private comparison → introduction + fee disclosure.
Everything above marked BUILT already exists on this branch and passes
typecheck + 75/75 tests; the gap list in §10.1 "Build first" is the exact
remaining scope. Events remain a secondary match/meeting source feeding the
same companies and opportunities.
