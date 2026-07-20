# Agent Instructions — WAT Framework for NXT Link

You're working inside the **WAT Framework** (Workflows, Agents, Tools). This
architecture separates concerns so probabilistic AI handles reasoning while
deterministic code handles execution. That separation is what makes the
system reliable.

> **NXT Link context.** This repository is the NXT Link platform: it connects
> industrial problems and buying needs (El Paso / Ciudad Juárez region) with
> verified problem-solvers, while protecting confidentiality, trust, and
> NXT Link's introduction. Everything in this document is subordinate to that
> mission and to the governance gates in
> [WAT Governance — Human Approval Gates](#wat-governance--human-approval-gates).

---

## The WAT Architecture

### Layer 1: Workflows (The Instructions)
- Markdown SOPs stored in `workflows/`.
- Each workflow defines the **objective**, **required inputs**, **tools to
  use**, **expected outputs**, and **edge-case handling**.
- Written in plain language, like briefing a teammate.

### Layer 2: Agents (The Decision-Maker)
- Agents coordinate intelligently.
- Read the relevant workflow, run tools in the correct sequence, handle
  failures gracefully, and ask clarifying questions when needed.
- Connect intent to execution without trying to do everything directly.
- Example: for website data, read `workflows/scrape_website.md`, determine
  required inputs, then execute `tools/scrape_single_site.py`.

### Layer 3: Tools (The Execution)
- Deterministic scripts live in `tools/` (this repo also keeps operational
  TypeScript utilities in `scripts/` — treat those as tools too).
- They handle API calls, data transformations, file operations, and database
  queries.
- Credentials/API keys live **only** in `.env`.
- Tools must be consistent, testable, and fast.

## Why This Matters

When AI performs every step directly, compounded uncertainty reduces
reliability. Deterministic scripts should handle execution while agents focus
on orchestration, judgment, and recovery.

---

## Division of Labor (NXT Link rule of thumb)

| Layer | Does | Never does |
|---|---|---|
| **AI agents** | Draft, extract, classify, rank, compare, explain, recommend, ask clarifying questions | Send, sign, accept, publish, reveal identities, move money, finalize fees |
| **Deterministic tools** | Validate, calculate (incl. commissions), transform, persist, notify, enforce permissions, log | Guess, improvise, silently change rules |
| **Humans** | Approve sensitive or binding actions (see gates below), review low-confidence AI output, own legal documents | — |

## WAT Governance — Human Approval Gates

An explicit human approval is **required** before any of the following. AI may
prepare and recommend; deterministic tools enforce that the gate was passed
(consent record + audit log) before the action executes.

1. **Confidentiality / identity reveal** — a customer's identity, contacts,
   facility details, documents, or pricing expectations are shared with any
   vendor. Field-level, per-vendor, logged, revocable where legally possible.
2. **AI matching publication** — a match list leaves the internal/operator
   view and becomes visible to a customer or vendor.
3. **Vendor outreach** — any RFI/RFQ package or introduction is sent to a
   vendor.
4. **RFI/RFQ publication** — AI-drafted structured documents are shown to
   counterparties only after the customer (or operator on their behalf, with
   client consent) approves the exact content.
5. **Quote sending** — a vendor quote (including template-generated drafts)
   is sent to a customer. **AI must never send a quote automatically.**
6. **NDA / MNDA / NCA execution** — legal templates are organization-approved
   *starting drafts only*, clearly marked **not legal advice**; human/legal
   review is required before signature. Non-circumvention (NCA) records gate
   contact reveal to protect NXT Link's introduction and success fee.
7. **Identity reveal at deal gates** — protected contact information is
   released only after required agreements (NDA/MNDA/NCA as configured) AND
   client consent are complete.
8. **Commission decisions** — the deterministic fee engine calculates; AI may
   only recommend a bracket or flag missing data; an **authorized admin**
   reviews exceptions, adjustments, refunds, and clawbacks. Fee policy changes
   require elevated permission, effective dates, and immutable version
   history.
9. **Vendor data publication** — AI-extracted vendor profile data (from
   brochures/uploads) is published only after the vendor reviews and approves
   it.
10. **Low-confidence output** — any extraction or match below the configured
    confidence threshold routes to human review instead of auto-proceeding.

## How to Operate

### 1. Look for existing tools first
Before building anything, inspect `tools/` (and `scripts/`, `src/lib/`) for an
existing capability required by the workflow. Create a new script only when no
appropriate tool exists.

### 2. Learn and adapt when things fail
When an error occurs:
- Read the complete error and trace.
- Fix the tool and retest it.
- **Before repeating a paid API call or anything consuming credits, ask the
  user.**
- Document durable lessons in the workflow, including rate limits, timing
  quirks, and unexpected behavior.
- Example: after an API rate limit, research the documented batch endpoint,
  refactor and verify the tool, then update the workflow.

### 3. Keep workflows current
Workflows evolve when better methods, constraints, or recurring issues are
discovered. **Do not create, replace, or overwrite workflows without explicit
user authorization.** Refine and preserve them.

## Self-Improvement Loop
1. Identify what broke.
2. Fix the tool.
3. Verify the fix.
4. Update the **authorized** workflow with the improved approach.
5. Continue with a stronger system.

## File Structure

| Path | Purpose |
|---|---|
| `.tmp/` | Disposable temporary inputs, scraped data, intermediate exports. Everything here is reproducible and deletable. |
| `tools/` | Deterministic execution scripts. |
| `workflows/` | Markdown SOPs: objectives, inputs, steps, tools, outputs, validation, edge cases. |
| `.env` | Environment variables and API keys. **Never commit or copy secrets elsewhere.** |
| `credentials.json`, `token.json` | OAuth credentials — always gitignored. |

### Deliverables
Final outputs go to the approved cloud service when the workflow calls for
one, so the user can access them directly.

### Intermediates
Local intermediate files exist only for processing and must be reproducible.
Everything in `.tmp/` is disposable.

## Safety Rules (NXT Link)

- **Least privilege** everywhere: role-based permissions (customer, vendor,
  operator, manager/admin) + organization/row-level authorization in the
  database (RLS). No cross-vendor visibility of competitors or their quotes.
- **Audit trails**: every reveal, consent, send, approval, stage transition,
  and fee event is logged with actor + timestamp; histories are immutable.
- **Idempotency**: tools that write must be safe to re-run; retries are
  bounded with limits and backoff.
- **Structured logs without secrets**: never log credentials, tokens, or
  protected identity fields.
- **Validation at every boundary**: zod (or equivalent) on every API input;
  file-upload validation (type/size) before storage.
- **Bilingual EN/ES**: user-facing flows support English and Spanish; Spanish
  is first-class for Ciudad Juárez users.
- **No automatic sending, signing, or accepting** — see the governance gates.
- **No hard-coded shared secrets**: server-side auth with env-managed secrets
  only (see `src/lib/server/admin-session.ts` for the pattern that replaced
  the old hardcoded access code).
- Any example credentials in docs or fixtures are **placeholders only**.

## Recommended Initial Workflows & Tools (documentation only — build when authorized)

Recommended `workflows/` SOPs for the NXT Link MVP (create the files only when
the implementation plan authorizes them):

1. `workflows/vendor_brochure_extraction.md` — upload → AI extraction →
   vendor review/approve → publish (gate 9).
2. `workflows/adaptive_ticket_intake.md` — conversational intake → structured
   RFI/RFQ draft → customer approval (gate 4).
3. `workflows/vendor_matching.md` — deterministic score + AI explanation →
   operator review → customer-visible shortlist (gate 2).
4. `workflows/protected_outreach.md` — RFQ package versioning → consented
   send → response tracking (gates 1, 3).
5. `workflows/quote_from_template.md` — template pick → AI tailoring → vendor
   review → send (gate 5) → comparison.
6. `workflows/agreement_gates.md` — NDA/MNDA/NCA drafting → legal review →
   signature status → identity reveal (gates 6, 7).
7. `workflows/commission_calculation.md` — eligible-subtotal derivation →
   bracket math → disclosure/acknowledgment → fee statement (gate 8).

Corresponding deterministic tools largely already exist in `src/lib/` (e.g.
`src/lib/matching.ts`, `src/lib/events/scoring.ts`, `src/lib/http/rate-limit.ts`,
validation schemas) or belong there; prefer extending those over new
free-standing scripts.

## Acceptance Criteria for This Document

- ✅ Lives at `docs/AGENT_INSTRUCTIONS.md`.
- ✅ Navigable headings (WAT layers, governance, operations, structure, safety).
- ✅ Clear WAT boundaries: AI reasons/drafts, tools execute deterministically,
  humans approve.
- ✅ NXT Link approval gates enumerated (confidentiality, matching, outreach,
  RFI/RFQ, quotes, NDA/MNDA/NCA, identity reveal, commissions).
- ✅ Directory conventions (`.tmp/`, `tools/`, `workflows/`, `.env`,
  gitignored credentials).
- ✅ Failure/self-improvement loop documented.
- ✅ No secrets — placeholders only.

## Bottom Line

The agent sits between user intent (workflows) and reliable execution
(tools). It reads instructions, makes decisions, calls the right tools,
recovers from errors, verifies results, and continuously improves authorized
workflows.

Stay pragmatic. Stay reliable. Keep learning.
