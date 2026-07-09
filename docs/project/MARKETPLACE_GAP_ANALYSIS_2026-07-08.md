# NXT Link Marketplace Gap Analysis

Date: 2026-07-08

Product definition: `docs/product/MARKETPLACE_BLUEPRINT.md`

This compares the clarified two-sided marketplace model against the current
Next.js application and live-database truth documented in
`TECH_HANDOFF_CURRENT.md`.

## Executive finding

The app already has a credible marketplace shell: vendor accounts, company
profiles, products and services, AI-assisted listing drafts, review before
publish, public search/filter/save/compare, detail pages, quote-request leads,
and admin moderation.

What is missing is the operating system around those pages: credential tokens
and permission gates, complete target-customer profiles, enforced listing
standards, richer fit/budget search, real messaging and scheduling, connected
quote/pilot/deal records, buyer status, commission records, and eventually
compliant payment routing.

## Capability matrix

| Capability | Status | Current evidence | Required next step |
| --- | --- | --- | --- |
| Buyer/vendor/operator roles | Partial | Signup/login and vendor/admin routing exist | Add buyer dashboard and company-team membership model |
| Vendor storefront | Partial | `/vendor/portal` stores categories, industries, client types, and service areas | Add maturity type, detailed fit profile, public credential summary, team members |
| Products and services | Built foundation | `/vendor/listings`; separate `marketplace_products` and `marketplace_services` | Keep one shared offering standard and add bundles/rentals/pilot links |
| Structured listing blocks | Partial | Pilot, implementation, pricing, warranty/support, fit, risk, ROI types exist | Expose and require all relevant fields; add delivery, training detail, TCO, maintenance, evidence status |
| Service listings | Partial | Service areas, response time, process, certifications, pricing model, emergency flag | Add delivery mode, team/licenses/insurance, minimum engagement, deliverables, workmanship/change-order terms |
| Startup marketplace status | Missing | Vendor status is pending/approved/rejected/paused | Add startup/evidence-developing maturity label and restricted permission set |
| Credential tokens | Missing | Admin displays a general verification status only | Add evidence-backed token records, expiry, reviewer, scope, status, and automatic permission effects |
| Insurance/certification expiry | Missing | Certification text exists on some records | Store documents, issuer, policy/credential number, effective/expiry dates, verification history |
| Publish requirements | Partial | Accuracy checkbox and listing lifecycle exist | Add category-based completeness and credential gates; server and DB must reject bypasses |
| Case studies/evidence | Partial | `case_studies` and listing documents are readable in detail/review views | Add vendor creation/consent/evidence workflow and NXT verification status |
| Vendor target-client profile | Partial | Industries and client types exist; application has some target fields | Add size, facilities, geography, budget/deal range, use cases, readiness, integrations, decision roles, not-a-fit |
| Public marketplace | Built foundation | `/marketplace` and detail routes work against published listings | Add category taxonomy, pagination, SEO/data-quality rules, empty-state lead capture |
| Search and filters | Partial | Keyword, listing type, category, save and compare exist | Add industry, problem, budget, company size, location, timeline, pilot, credential, maturity, availability filters |
| Comparison | Partial | Basic local comparison for three cards | Normalize up to five listings; show install/training/support/TCO, tokens, missing data, vendor-confirmed status |
| Instant estimate | Missing | Pricing range/model displayed | Add deterministic configurable price rules; label estimate versus firm quote |
| Quote request / lead | Built foundation | Listing form -> `quote_requests` -> `/vendor/leads` | Link buyer account/company, protect identity choices, add structured requirements and audit trail |
| Vendor messaging | Missing | General AI chat widget is not buyer-vendor messaging | Add conversation/thread/message tables, attachments, masking, moderation, notification, retention |
| Scheduling | Missing | No vendor call/demo/site-visit workflow | Add availability/request/confirmation/calendar records and advisor handoff |
| NXT advisor path | Partial concept | Intake/admin request tools exist separately | Put “Ask an NXT advisor” on listings/compare; connect it to buyer request and operator queue |
| Structured quote workspace | Blocked | `/vendor/quotes` exists; quote migration is unapplied and collides with legacy `vendors` | Reconcile migration around `vendor_profiles`, apply only after environment decision, connect quote requests |
| Buyer dashboard | Missing | Buyer intake persists; buyer cannot see status | Build `/buyer` with inquiries, requests, quotes, comparisons, pilots, and purchases |
| RFQ/approval confidentiality | Missing/blocked | Logic and documents exist but no live tables | Persist packets, vendor assignments, buyer approval, reveal consent, and audit events |
| Pilot listing data | Partial | Pilot availability/duration/cost/scope supported | Add success criteria editor, responsibilities, credit, prerequisites, stop/exit rules |
| Pilot execution workflow | Missing | No pilot records/stages/results UI | Build pilot plan, approvals, milestones, measurements, results, decision, evidence permission |
| Orders/purchases | Missing | No marketplace order or purchase workflow | After quote/pilot proof, add purchase record, PO/invoice references, implementation and acceptance status |
| Commission engine | Partial/blocked | Deterministic fee engine and planned tables exist | Finalize business policy; persist fee version, acknowledgments, transaction value, invoice/payment status |
| Marketplace payments/payouts | Missing and intentionally later | No Stripe/marketplace routing | Legal/accounting design first; then connected-account onboarding, ACH/card choice, refunds/chargebacks/payouts |
| Vendor moderation | Built foundation | `/admin/marketplace`, reports, force-unpublish | Add credential queue, expiry queue, evidence review, suspension/appeal and action audit |
| Notifications | Partial | Some email/outbox foundations exist | Add in-app/email events for inquiry, reply, quote, demo, pilot, expiry, purchase, dispute |
| Terms and policies | Missing from product flow | Agreement schema is planned but core legal pages/acceptance are incomplete | Attorney-reviewed document set; versioned acceptance tied to vendor permissions and transactions |
| Reviews | Missing | No verified-engagement review system | Build only after completed pilot/purchase records exist |
| Bilingual coverage | Partial | Several surfaces are bilingual, marketplace is mostly English | Make structured data labels, workflows, emails, policies, and vendor content EN/ES aware |
| End-to-end verification | Missing | Unit tests pass; no Playwright flow | Add buyer/vendor/operator acceptance test plus RLS/route authorization tests |

## Important technical inconsistencies

1. `src/lib/marketplace/types.ts` exposes fit, risk, ROI, pilot success
   criteria, maintenance, and integrations, but the Seller Central editor does
   not expose all of those fields. Stored capability and visible workflow are
   out of sync.
2. Public compare covers basic identity, type, category, best-for, pilot,
   lead/response time, pricing, and warranty. It does not yet compare the
   standardized implementation/training/maintenance/TCO and credential data
   that differentiates NXT Link.
3. Vendor applications contain richer certifications, pain points, target
   company types, budget, and demo data than `vendor_profiles`; approved
   application data is not one canonical live fit/credential profile.
4. Marketplace quote requests/leads and the private RFQ/quote system are
   separate concepts. They need one inquiry -> opportunity -> quote -> pilot ->
   purchase model, not parallel pipelines.
5. The planned quote/deal migration cannot be applied because it collides with
   the existing intel-era `vendors` table. It should use `vendor_profiles` as
   the marketplace vendor identity.

## Exact build order

### P0 — product and data truth

1. Adopt `MARKETPLACE_BLUEPRINT.md` as the definitive product model.
2. Decide the database environment strategy; the current Supabase project is
   live and shared, so no migration is safe without explicit approval.
3. Define one canonical taxonomy for industry, problem/use case, offering
   category, company size, facility type, geography, availability, and vendor
   maturity.
4. Reconcile vendor applications into `vendor_profiles`; remove duplicate
   target-fit and credential concepts.
5. Redesign the unapplied quote/deal migrations around `vendor_profiles` and
   the existing marketplace tables.

Exit: one reviewed data model supports vendor -> offering -> inquiry -> quote
-> pilot -> purchase without duplicate vendor or opportunity identities.

### P1 — vendor trust and standardized supply

1. Add startup/established/service-provider maturity classification.
2. Build the detailed Vendor Fit Profile.
3. Add credential-token records, evidence upload, verification, expiry, and
   category-based requirements.
4. Add server-enforced permission gates for profile/listing/pilot/purchase.
5. Complete the product/service editor fields and four standard packages.
6. Add case-study/reference/testing submission and consent.

Exit: a startup and an established vendor can publish honest, differently
permissioned profiles; incomplete or expired vendors cannot bypass publish
rules through the API.

### P2 — buyer discovery and contact

1. Expand filters to industry, problem, budget, size, location, timeline,
   pilot, maturity, credentials, and availability.
2. Expand comparison to five offerings with total-cost and missing-data rows.
3. Add buyer company profile, saved listings, and dashboard.
4. Add structured quote request plus “Ask an NXT advisor.”
5. Build vendor-buyer messaging and demo/site-visit scheduling.

Exit: a buyer can find three relevant offerings, understand differences,
contact a vendor or advisor, and see every interaction from their dashboard.

### P3 — quote, pilot, and purchase decision

1. Connect marketplace inquiry to one opportunity and assigned vendor(s).
2. Persist structured, versioned quotes and comparison.
3. Build pilot plan, approval, milestones, measurements, and results.
4. Add agreement, consent, reveal, and fee-acknowledgment gates.
5. Record final selection, purchase value, implementation, acceptance, and
   support status.

Exit: one real concierge transaction completes from discovery through measured
pilot and final purchase decision with no spreadsheet or hidden DB edits.

### P4 — payment routing and scale

1. Obtain legal/accounting decision on seller-of-record, fee payer, refunds,
   taxes, chargebacks, and cross-border transactions.
2. Integrate a marketplace payment provider and connected vendor onboarding.
3. Support ACH/invoice flows appropriate for large industrial purchases;
   cards are not the default for every transaction.
4. Route vendor payout, NXT Link fee, refunds, and adjustments through the
   provider; do not manually custody funds.
5. Add verified-engagement reviews, subscriptions/sponsored listings, and
   broader categories only after transaction proof.

Exit: payment and payout reconciliation is auditable, compliant, and tested
for success, failure, refund, cancellation, and dispute scenarios.

## Next three implementation tasks

1. Create the canonical vendor-fit, credential-token, and permission model on
   paper/SQL draft without applying it to the live database.
2. Extend the Seller Central UI and publish validator against that model.
3. Build the buyer dashboard, then connect saved listings and quote requests
   to the signed-in buyer.

