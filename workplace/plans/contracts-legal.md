# NXT//LINK — Contracts & Legal Plan (v1)

**Author:** Legal dept (AI paralegal — NOT a lawyer; nothing here is legal advice)
**Date:** 2026-07-20
**Status:** PLAN ONLY. No document here is ready to publish. Every item marked
`[ATTORNEY]` requires a licensed attorney before it goes live.
**Engineering status (2026-07-20):** §5 groundwork BUILT — `legal_documents` +
`terms_acceptances` migration (`supabase/migrations/20260720_legal_acceptances.sql`,
FILE only, not applied) with immutability guards + seeded DRAFT /terms + /privacy
snapshots; click-wrap checkbox + fail-closed server recording at every
account-creation lane (signup, apply, /join invite, vendor-signup, the two
login-page signup modes) via `src/lib/legal/acceptance.ts`. Later flow points
(§1.2 quote-submit / quote-accept / re-acceptance) and rendering docs from
`legal_documents` are NOT built yet — until then, page edits to /terms or
/privacy require a new seeded version row. Sources of truth
read: `vault/Home.md`, `vault/Project.md`, `vault/Fees.md`, `vault/Payments.md`.

**Money facts this plan protects** (from `vault/Fees.md` / `vault/Payments.md`):
vendor-side commission of 5% on first $50k / 3% above, capped at $20k, with a
minimum floor; `PROTECTION_MONTHS = 12`; `FREE_DEAL_CREDIT = 1250`; escrow via
Stripe Connect (manual capture + destination transfers with application fee);
buyer funds on quote-accept; 5-day inspection; auto-release day 6; commission
taken at release only; disputes freeze escrow; NXT//LINK never holds funds
directly.

---

## 1. The contract stack — what documents exist and how they bind

### 1.1 The six documents

| # | Document | Who it binds | Core job |
|---|----------|--------------|----------|
| 1 | **Platform Terms of Service (ToS)** | Everyone with an account | Umbrella rules: accounts, acceptable use, content, IP, liability limits, governing law, changes to terms |
| 2 | **Vendor Agreement** | Vendors | The money document: commission schedule, non-circumvention, payout terms, delivery obligations, indemnity |
| 3 | **Buyer Terms** | Buyers | RFQ conduct, what "accepting a quote" means legally, funding obligation, inspection duties, dispute rights |
| 4 | **Escrow & Payment Terms** | Buyers AND vendors (shared annex) | Funding, inspection window, release, refunds, disputes, milestones — one document both sides accept so the rules can't diverge |
| 5 | **Privacy Policy** | Everyone (notice, not a bargain) | What data is collected, who sees it (buyer contact revealed to vendors on quote), retention, rights |
| 6 | **Stripe agreements** (Stripe Services Agreement; Connected Account Agreement for vendors) | Stripe's own docs | Stripe presents and records these during Connect Express onboarding — NXT//LINK does not draft them, but Vendor Agreement must reference them |

Design principle: ToS is the umbrella; Vendor Agreement and Buyer Terms
incorporate the ToS and the Escrow & Payment Terms by reference. The Escrow &
Payment Terms are ONE shared document so a buyer and vendor on the same deal
are always under identical escrow rules. Each document is short, versioned,
and published in EN and ES (see §4.3 for which language controls).

### 1.2 Where each acceptance happens in the product flows (click-wrap map)

Click-wrap (an unticked checkbox + "I agree" the user must act on) is the
strongest common pattern; browse-wrap ("by using this site you agree") is the
weakest. Every acceptance below is a click-wrap event, and every one writes an
evidence row (fields in §5).

| Flow moment | Who | What they accept | UI mechanics |
|---|---|---|---|
| **Signup** (buyer or vendor) | All users | ToS + Privacy Policy | Unticked checkbox above the submit button, linking to full text; cannot submit unchecked |
| **Vendor application submit / onboarding completion** | Vendor | Vendor Agreement + Escrow & Payment Terms | Separate checkbox; show commission schedule inline (5%/3%/$20k cap) so the vendor can't claim surprise |
| **Stripe Connect "connect payout method" step** | Vendor | Stripe Connected Account Agreement | Stripe's hosted onboarding handles this; we only record that onboarding completed |
| **Every quote submission** | Vendor | Reaffirmation of current Vendor Agreement + Escrow Terms version | One line + checkbox (or recorded affirmation) on the quote form: "This quote is subject to Vendor Agreement vX.Y" — this catches vendors who signed up before a terms update |
| **Quote accept → pay** (the deal-forming click) | Buyer | Buyer Terms + Escrow & Payment Terms | THE most important acceptance. Checkbox immediately above the "Pay $X to start" button, naming the inspection window and auto-release explicitly. Record links to the quote id |
| **Terms version change** | All affected users | New version | Blocking interstitial on next login for material changes ("we changed X — review and accept"); silent notice-only for typo-level changes. Existing in-flight deals stay on the version accepted at quote-accept `[ATTORNEY: confirm change-in-terms mechanics]` |

### 1.3 What gets recorded as evidence (summary — schema in §5)

For every acceptance: user id, document slug, exact version, SHA-256 of the
exact text shown, language shown (EN/ES), UTC timestamp, IP address, user
agent, the flow context (signup / vendor_onboarding / quote_submit /
quote_accept_payment / reacceptance), and the related object (quote id or
order id) when the acceptance forms a deal. Old document versions are never
edited — full text snapshots are kept forever. This record is what gets shown
to a court or arbitrator if a vendor says "I never agreed to the commission."

---

## 2. Clause-level outlines (outline only — drafting is attorney work)

### 2.1 Vendor Agreement — clause list with why-it-protects-Cesar notes

1. **Parties & definitions.** Define "Introduced Party" (any buyer the vendor
   first contacted, quoted, or transacted with through NXT//LINK), "Net Deal
   Value," "Platform Deal," "Protection Period" (12 months, matching
   `PROTECTION_MONTHS`). *Why: every money clause hangs off these definitions;
   vague definitions are how vendors escape commissions.*
2. **Relationship of the parties.** NXT//LINK is a marketplace venue/
   facilitator, not a party to the buyer–vendor sale, not the vendor's agent
   or employer, and not a guarantor of the buyer's performance. *Why: keeps
   Cesar out of the middle of product-defect and non-payment lawsuits.*
3. **Eligibility, account accuracy, verification.** Vendor warrants its
   business info is true; NXT//LINK may reject, suspend, or require
   re-verification at its discretion. *Why: admission control and a clean
   basis to remove bad actors.*
4. **Commission.** State the schedule exactly as the engine computes it: 5% of
   first $50,000 of net deal value, 3% above, $20,000 cap, minimum floor,
   policy version noted; first-deal credit ($1,250) as a discretionary
   promotion NXT//LINK can change prospectively; commission deducted at escrow
   release; **full refund ⇒ zero commission**; commission also due on ANY deal
   with an Introduced Party during the Protection Period even if concluded
   off-platform (see clause 5). *Why: this is the revenue clause — it must
   mirror `calculateFee` exactly so the contract and the code never disagree.*
5. **Non-circumvention.** For 12 months after introduction to an Introduced
   Party, all quotes, contracts, and payments with that party must run through
   the platform. Taking the deal off-platform does not remove the commission:
   the commission (computed on the actual deal value, or a reasonable estimate
   if the vendor conceals it) remains due, plus suspension, plus forfeiture of
   pending platform funds per `vault/Payments.md`. Optional buy-out: a
   conversion fee to take a relationship off-platform legitimately (Upwork
   model — see §3). `[ATTORNEY: forfeiture-of-pending-funds and any fixed
   damages amount must be reviewed against the penalty/liquidated-damages
   doctrine; set the conversion fee amount; confirm 12 months is defensible
   under Texas law]`. *Why: this is the single clause that protects the
   business model.*
6. **Quotes and deal formation.** A submitted quote is a binding offer; buyer
   acceptance + funding forms a contract **between buyer and vendor** on the
   quote's stated terms plus the Escrow & Payment Terms. Vendor is responsible
   for the accuracy of specs, price, lead time, and legal saleability. *Why:
   makes the deal enforceable while keeping NXT//LINK out of it.*
7. **Delivery, inspection, acceptance standard.** Vendor must ship with
   tracking (Type 1) or submit milestones (Type 2); buyer has a 5-day
   inspection window; non-rejection by day 6 = deemed acceptance and
   auto-release; milestone submissions auto-approve after 14 days; rejection
   must claim non-conformance with the quote (not buyer's remorse). *Why:
   contractual backbone for the escrow engine — auto-release is only safe if
   the vendor agreed to the deemed-acceptance rule in writing.*
8. **Payouts.** Stripe Connect Express account required; Stripe performs KYC;
   payouts only after release; NXT//LINK may offset amounts the vendor owes
   (refunds, chargebacks, owed commissions) against pending payouts. *Why:
   the offset right is how commissions on misbehavior actually get collected.*
9. **Warranties & compliance.** Vendor warrants title, conformance to quote,
   and compliance with applicable law including licensing, safety, and — for
   cross-border deals — customs/export/import requirements, which are the
   vendor's and buyer's responsibility, not NXT//LINK's. *Why: pushes
   cross-border regulatory risk onto the parties actually shipping goods.
   [FLAG, not resolved: US–MX trade compliance is its own specialty.]*
10. **Taxes.** Vendor responsible for its income taxes; sales tax handled per
    the marketplace's Stripe Tax configuration; vendor must provide W-9/W-8 as
    applicable; note marketplace-facilitator treatment `[ATTORNEY + tax
    advisor: Texas marketplace provider rules and MX side]`.
11. **Platform content & IP license.** Vendor grants NXT//LINK a license to
    display its storefront content; vendor warrants non-infringement. *Why:
    lets the site show catalogs/photos without IP exposure.*
12. **Buyer data & confidentiality.** RFQ contents and buyer contact details
    are confidential platform data, usable ONLY to quote and perform Platform
    Deals — no exporting, scraping, list-building, or off-platform marketing.
    *Why: closes the "harvest the buyer list then leave" hole; also backs the
    non-circumvention clause with a data-use violation.*
13. **Indemnification.** Vendor indemnifies NXT//LINK for claims arising from
    its products/services, IP infringement, tax failures, and legal
    violations. *Why: a defective industrial machine hurts someone — the claim
    should land on the vendor and its insurer, not on Cesar.*
14. **Insurance.** Placeholder: option to require commercial general liability
    (and product liability for equipment vendors) with certificates.
    `[ATTORNEY/insurance broker: decide threshold; common in industrial B2B]`
15. **Limitation of liability & disclaimer.** NXT//LINK's aggregate liability
    capped (typical pattern: fees paid to NXT//LINK in the prior 12 months);
    no consequential damages; platform provided "as is"; no promise of deal
    volume or buyer quality. *Why: keeps a worst-case lawsuit smaller than the
    company.*
16. **Suspension & termination.** Either party may terminate on notice;
    NXT//LINK may suspend immediately for circumvention, fraud, or legal risk;
    pending deals complete under existing terms (or are refunded); **the
    Protection Period and money clauses survive termination** — a vendor
    cannot quit to dodge the 12-month window. *Why: survival is the whole
    point; otherwise clause 5 is trivially escapable.*
17. **Modifications.** NXT//LINK may update terms with notice; material
    changes need re-acceptance (per §1.2); in-flight deals stay on their
    accepted version. *Why: lets the terms evolve without losing enforceability.*
18. **Dispute resolution with NXT//LINK; governing law.** Texas law; venue El
    Paso County; `[ATTORNEY: choose arbitration vs courts, class-action
    waiver, jury-trial waiver — these are enforceability-sensitive choices]`.
19. **Language clause.** English version controls; Spanish provided as a
    courtesy translation `[ATTORNEY: confirm this works for Mexico-domiciled
    vendors — see §4.3]`.
20. **Boilerplate.** Assignment (vendor may not assign; NXT//LINK may),
    notices (email to account address suffices), force majeure, severability,
    entire agreement, no waiver.

### 2.2 Escrow & Payment Terms — clause list

1. **Role of NXT//LINK and Stripe.** All funds are held and moved by Stripe
   (a licensed payment provider) under Stripe's agreements; NXT//LINK never
   takes possession of buyer funds; "escrow" is a product name for
   Stripe-managed delayed capture/transfer, not a licensed escrow service.
   `[ATTORNEY: the exact characterization here is the money-transmission
   question — see §4.1; also whether buyer's payment into the flow legally
   discharges the buyer's debt to the vendor ("payments agent" language)]`
2. **Funding.** Type 1: full quote amount funded at acceptance before any
   vendor obligation starts. Type 2: one milestone at a time; next milestone
   unlocks only after prior release. Order statuses named as in
   `vault/Payments.md` (`awaiting_payment → funded → in_progress → completed |
   disputed`).
3. **Inspection window.** 5 days from confirmed delivery (define the trigger:
   carrier-confirmed delivery date; **define calendar vs business days —
   currently ambiguous, pick one** `[DECISION NEEDED]`); how to reject
   (in-app, with reasons + evidence); silence = acceptance on day 6.
4. **Release.** Auto-release day 6 (Type 1) / 14-day auto-approve (Type 2
   milestones); commission deducted at release; vendor payout per Stripe
   timing.
5. **Refunds.** Full refund available before shipment or for conceded
   non-conformance; full refund ⇒ zero commission; partial refunds by
   agreement or dispute outcome; refund path when vendor fails to ship by
   promised date.
6. **Disputes.** Filing window (during inspection / before auto-approve);
   filing freezes the escrow clock; both sides submit evidence; operator
   reviews within 48h; outcomes: full refund / partial / release; all steps
   logged immutably; the operator decision is final **as to the escrowed
   funds only** — parties keep their ordinary legal rights against each other
   beyond the escrow. *Why: NXT//LINK decides where the money in the box goes,
   without pretending to be a court.* Chargeback interplay: filing a card
   chargeback while a platform dispute is open is a terms violation
   `[ATTORNEY: how far this can go]`.
7. **Fees.** Buyer pays no platform fee; processing cost lives inside the
   vendor commission; currency USD for Phase 1 `[FLAG: MXN pricing/payouts is
   Phase 3 — new FX and MX-law questions when it lands]`.
8. **Failed payments and reversals.** Failed capture voids the deal-start;
   chargebacks/reversals after release may be offset against vendor payouts.
9. **No off-platform settlement.** Settling a platform deal outside the escrow
   flow is circumvention under the Vendor Agreement.
10. **Versioning.** Deals are governed by the Escrow Terms version accepted at
    quote-accept; later changes don't reach in-flight deals.

---

## 3. Commission protection — how the big marketplaces do it (light research, 2026-07-20)

What was found:

- **Upwork — non-circumvention window + paid buy-out.** For **24 months** from
  the start of an "Upwork Relationship," both sides must keep all payments for
  that relationship on the platform; the only clean exit is paying a
  **Conversion Fee** (minimum $1,000, up to $50,000 per relationship), waived
  after a 2-year platform relationship. Violation is a material breach:
  permanent suspension **and** the conversion fee may be charged.
  Sources: [Upwork Help — Circumvention](https://support.upwork.com/hc/en-us/articles/360052511133-Circumvention-and-why-it-s-against-the-rules),
  [Upwork Help — Conversion Fee](https://support.upwork.com/hc/en-us/articles/360043723533-What-is-the-Upwork-Conversion-Fee),
  [Upwork User Agreement (archived PDF)](https://upwork.pactsafe.io/versions/64a63ee98763a953463e10af.pdf).
- **Fiverr — flat prohibition, account-death enforcement.** No off-platform
  payments or contact-sharing at all; no buy-out path; enforcement is warnings
  up to permanent suspension. Sources:
  [Fiverr — Off-platform policy](https://help.fiverr.com/hc/en-us/articles/12792122691601-Stay-protected-Fiverr-s-off-platform-policy),
  [Fiverr Community Standards — Off-platform](https://help.fiverr.com/hc/en-us/articles/38829941264785-Community-Standards-Off-platform-policy).
- **Alibaba — carrot, not stick.** Trade Assurance (escrow, money-back,
  dispute resolution) applies ONLY to orders placed and paid on-platform; go
  off-platform and you simply lose all protection. The protection itself is
  the retention mechanism. Sources:
  [Alibaba Trade Assurance](https://tradeassurance.alibaba.com/),
  [Alibaba — Stay on-platform guide](https://reads.alibaba.com/stay-on-platform-stay-protected-a-practical-guide-to-secure-your-trading-on-alibaba-com/).

**Recommended NXT//LINK posture (matches what `vault/Payments.md` already
decided, refined):** a hybrid —

1. **Stick:** 12-month non-circumvention per Introduced Party (mirrors
   `PROTECTION_MONTHS = 12`; deliberately shorter than Upwork's 24 — easier to
   defend, matches the fee engine). Commission remains due on off-platform
   deals inside the window; suspension + forfeiture of pending funds per the
   vault decision.
2. **Exit valve:** an Upwork-style conversion fee as the legitimate way out —
   a clause with a buy-out reads more like a fee schedule and less like a
   penalty, which likely helps enforceability. `[ATTORNEY: set the amount and
   bless the structure]`
3. **Carrot (Alibaba lesson):** market the on-platform benefits — escrow
   protection, dispute resolution, reviews, reorder history — so staying
   on-platform is rational, not just compelled. Cheapest enforcement is a
   product people don't want to leave.
4. **Data backstop:** the buyer-data confidentiality clause (§2.1.12) makes
   contact-harvesting an independent breach even where the deal itself is
   hard to prove.

Honest note for Cesar: detection is the hard part for every marketplace —
these clauses mostly deter and give leverage after the fact; they don't
physically stop a determined vendor. Enforceability of forfeiture and fixed
fees against a Texas or Mexican vendor is exactly the `[ATTORNEY]` question.

---

## 4. Compliance flags (flag, don't resolve)

### 4.1 Money transmission — the structural question `[ATTORNEY — HIGH PRIORITY]`
Holding other people's money while it moves between parties is regulated
activity (federally, money-services-business registration; in Texas, money
transmission licensing under the state's money services statutes — an
attorney must cite and apply the current law; this plan deliberately does
not). The plan in `vault/Payments.md` — Stripe Connect, manual capture,
destination transfers with application fee, "NXT//LINK never holds funds
directly" — is the standard structure platforms use to stay on the right side
of this line, because the licensed entity (Stripe) custodies the funds.
**But whether the structure actually works depends on details an attorney
must confirm:** how the flow of funds is papered, whether NXT//LINK is
appointed as the vendor's limited payments agent (so buyer payment = vendor
paid), and that nothing in our UX copy promises "NXT//LINK holds your money
in escrow" (say "payment secured via Stripe" — marketing must not write
checks the legal structure can't cash). Also do NOT call the product a
licensed "escrow" service in legal copy. Ask the attorney to review the exact
Stripe Connect charge type and the Escrow Terms clause 1 language together.

### 4.2 SMS invites — TCPA basics `[ATTORNEY before any SMS campaign]`
The TCPA applies to texts to US cell numbers **even when the recipient is a
business** — B2B is not an exemption. Safe-side operating rules for the
invite feature: (1) collect **prior express written consent** (an unticked
checkbox with clear disclosure that they'll receive texts from NXT//LINK,
consent not a condition of purchase) before any marketing/invite text;
(2) honor opt-outs made by **any reasonable method** (STOP, email, reply in
Spanish, etc.) within 10 business days — process them faster in practice;
(3) identify NXT//LINK in every message; (4) respect quiet hours; (5) keep
consent records like terms-acceptance records (§5). **Caution:** this area is
actively moving — an appeals-court decision in early 2026 unsettled parts of
the written-consent framework, so a quick attorney check before launch is
cheap insurance. Texting Mexican numbers is NOT covered by TCPA — that's
Mexican telecom/data law, separate flag. Sources:
[Infobip — TCPA SMS 2026 guide](https://www.infobip.com/blog/tcpa-compliance-sms),
[BCLP — TCPA opt-out rules eff. Apr 11, 2025](https://www.bclplaw.com/en-US/events-insights-news/the-tcpas-new-opt-out-rules-take-effect-on-april-11-2025-what-does-this-mean-for-businesses.html),
[Holland & Knight — Fifth Circuit consent ruling (Mar 2026)](https://www.hklaw.com/en/insights/publications/2026/03/tcpa-reset-fifth-circuit-rejects-prior-express-written-consent-rule).
One more: "invite a colleague" flows where a USER sends the text can raise
platform liability questions too — have the attorney look at the actual flow,
not just the concept.

### 4.3 EN/ES — which language controls `[ATTORNEY with cross-border experience]`
Recommended default: publish both languages, with a clause stating the
**English version controls** and Spanish is a courtesy translation; record
which language the user actually saw at acceptance (§5 `locale_shown`).
Rationale: one controlling text prevents two-version disputes. BUT: for
vendors/buyers domiciled in Mexico, enforcement may happen in Mexican courts,
where Spanish-language documents and local formalities matter — an
English-controls clause may be weak or counterproductive there. This is a
genuine cross-border complexity: **flagged, not resolved.** Ask the attorney
whether Mexico-side counterparties need a Spanish-controlling version, a
Mexican-entity contracting party, or both. Until advised, treat the ES
translation as needing the same care as the EN original (a bad translation of
the commission clause is a real dispute waiting to happen — professional
legal translation, not machine translation, for the final documents).

### 4.4 Data privacy — vendor/buyer contact data `[ATTORNEY for the policy pass]`
- The Privacy Policy must disclose the platform's defining data move: **when
  a vendor quotes / a deal forms, buyer contact info is shared with the
  vendor** (and vice versa), plus SMS/email contact practices, Stripe as
  processor, analytics, retention.
- Texas has a comprehensive privacy law (Texas Data Privacy and Security Act)
  with small-business accommodations but a notable rule involving sensitive
  data even for small businesses — applicability to NXT//LINK's size and
  B2B data is an attorney check, not an assumption.
- Mexican counterparties' personal data implicates Mexico's federal data
  protection law (LFPDPPP) — Mexican-law advice needed if/when Mexico-side
  individuals' data is processed at scale. Flagged, not resolved.
- Practical now: collect minimum data, restrict vendor use of buyer data by
  contract (§2.1.12), delete on request where feasible, and never sell
  contact lists.

### 4.5 Other flags (parking lot)
- **Marketplace facilitator sales tax:** Texas marketplace-provider rules
  likely make NXT//LINK responsible for collecting/remitting sales tax on
  facilitated sales — the vault already routes this to a **tax advisor** with
  Stripe Tax; keep it there. Invoice language ("NXT//LINK as marketplace
  facilitator") must match the tax posture.
- **Cross-border goods movement:** customs, import/export, USMCA origin —
  contractually assigned to buyer/vendor (§2.1.9); NXT//LINK should not
  perform or advise on customs. Flag for attorney review of that allocation.
- **1099-K / tax reporting for vendor payouts:** Stripe typically handles for
  Express accounts — confirm during Stripe setup.
- **E-SIGN/UETA formalities:** click-wrap + records per §5 is the standard
  pattern for electronic contracting; attorney to sanity-check the flow
  screenshots once built.
- **No dark patterns** (`vault/Project.md`) also protects legally: honest UI
  is the best defense to "I didn't understand what I agreed to."

---

## 5. Version & record-keeping plan (spec for engineering)

Goal: for any deal, be able to produce — years later — the exact text each
party agreed to, when, and in which language. Two tables (Supabase/Postgres),
**insert-only** (no UPDATE/DELETE via RLS; admin reads only).

### 5.1 `legal_documents`
| field | type | notes |
|---|---|---|
| id | uuid pk | |
| slug | text | `tos`, `vendor-agreement`, `buyer-terms`, `escrow-terms`, `privacy` |
| version | text | semver-ish, e.g. `1.0.0`; bump = new row, never edit |
| language | text | `en` / `es` — EN and ES of the same version share `version` |
| content_md | text | full snapshot of the exact published text |
| content_sha256 | text | hash of `content_md`; shown text must hash-match |
| effective_date | timestamptz | when this version starts applying |
| published_by | uuid | admin user id |
| created_at | timestamptz | default now() |

### 5.2 `terms_acceptances`
| field | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid | FK → users |
| document_slug | text | which doc |
| document_version | text | which version |
| language_shown | text | `en`/`es` — which translation the user actually saw |
| content_sha256 | text | copied from `legal_documents` at accept time |
| context | text | `signup` \| `vendor_onboarding` \| `quote_submit` \| `quote_accept_payment` \| `reacceptance` |
| related_object_type / related_object_id | text / uuid | quote id or order id when the acceptance forms/affirms a deal; null otherwise |
| ip_address | inet | from request |
| user_agent | text | from request |
| accepted_at | timestamptz | UTC, default now() |

### 5.3 Rules for engineering
1. Acceptance UI renders the doc from `legal_documents` (never a hardcoded
   copy) so the hash recorded is the hash shown.
2. One row per checkbox event; accepting two docs at once = two rows.
3. Quote-accept/pay writes its acceptance rows **in the same transaction** as
   the order-creating write, before payment capture is triggered.
4. On new `effective_date` version: material changes gate the next relevant
   action (blocking re-accept); in-flight orders keep their recorded version.
5. Admin: read-only "acceptance history" view per user and per deal (this is
   the litigation-evidence screen).
6. SMS consent records reuse the same pattern (`document_slug =
   'sms-consent'`), satisfying §4.2's record-keeping.

Note: accepted quote → draft `manual_deals` row already exists
(`vault/Fees.md`); `related_object_id` should link acceptances to that same
`source_quote_id` chain so money records and consent records join cleanly.

---

## 6. Take-to-a-licensed-attorney list (prioritized)

> Engage a **Texas-licensed business attorney with marketplace/payments
> experience**; for item 4, one with US–Mexico cross-border practice (plenty
> in El Paso). Bring this plan document to the first meeting.

1. **Vendor Agreement drafting — before the first commissioned deal.**
   Ask: draft from the §2.1 outline; is the 12-month non-circumvention +
   commission-still-due + forfeiture-of-pending-funds combo enforceable under
   Texas law, or does forfeiture read as an unenforceable penalty? Should we
   add an Upwork-style conversion fee, and at what amount? Arbitration vs
   courts, class-action waiver, liability cap number.
2. **Escrow & Payment Terms + money-transmission review — before escrow
   launches (P1).** Ask: given the exact Stripe Connect setup (manual capture,
   destination transfers, application fee), does NXT//LINK avoid Texas money
   transmission licensing and federal MSB registration? What flow-of-funds /
   payments-agent language must the terms contain? Review our "escrow"
   naming and all payment UX copy. (This pairs with `vault/Payments.md`
   Phase-0 blocker #2.)
3. **ToS + Buyer Terms + Privacy Policy pass — before public launch
   marketing.** Ask: review §1 stack and §2 outlines; confirm the click-wrap
   flow (§1.2) and evidence records (§5) are sufficient under E-SIGN/UETA;
   TDPSA applicability at our size.
4. **Cross-border & language — before actively onboarding Mexico-domiciled
   vendors.** Ask: does English-controls-with-ES-courtesy hold up against a
   Juárez vendor? Do we need Spanish-controlling versions, Mexican-law
   riders, or a Mexican contracting entity? LFPDPPP exposure for MX personal
   data.
5. **TCPA check — before the SMS invite feature sends its first text.**
   Ask: review the actual consent screen + message copy + opt-out handling
   (§4.2) against the current, in-flux consent rules; user-initiated invite
   texts vs platform-initiated.
6. **Tax advisor (not the attorney): marketplace-facilitator nexus** —
   already a vault Phase-0 blocker; Stripe Tax configuration + invoice
   language + TX filing obligations.

Sequencing note: items 1–2 gate real money flowing; 3 gates loud public
launch; 4–5 gate specific features. One attorney can likely handle 1–3 in a
single engagement; ask for flat-fee scoping.

---

## 7. Cross-department dependencies

- **Engineering (backend-dev):** build §5 tables + click-wrap capture at the
  §1.2 flow points; wire `related_object_id` to the `source_quote_id` chain;
  RLS insert-only.
- **Design/Frontend:** checkbox placement per §1.2 (unticked, above the
  action button, full-text links, EN/ES rendered from `legal_documents`);
  blocking re-accept interstitial; "Review and release" copy must state the
  deemed-acceptance rule in plain words.
- **Marketing/Content:** all payment copy says "secured via Stripe"-style
  language, never "NXT//LINK holds your money"; no SMS sends before §4.2
  consent flow exists; ES legal translation is professional, not machine.
- **Operations (Cesar):** attorney engagement (§6), Stripe account creation
  (vault Phase-0 blocker #1), tax advisor (blocker #3).
- **Finance:** liability-cap number and conversion-fee amount need a revenue
  sanity check before the attorney sets them.

*End of plan. Nothing above is legal advice; it is a structured briefing for
a licensed attorney.*
