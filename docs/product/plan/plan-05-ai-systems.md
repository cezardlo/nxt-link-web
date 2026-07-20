## AI Systems: Matching Logic, Extraction, and Human-Review Gates

NXT//LINK's AI layer is already built around one non-negotiable principle: **every AI output is a draft until a human approves it.** The wrapper `aiDraft()` in `src/lib/assistant/llm.ts` marks every result `is_draft: true`, never throws (it falls back to a deterministic result with `provider: 'fallback'`), and logs every generation to `ai_draft_logs` with an `approval_status`. Underneath it, `src/lib/llm/parallel-router.ts` routes to 8 providers (nvidia, anthropic, gemini, openrouter, groq, ollama, together, openai) with per-provider **daily token budgets** and JSON-consensus voting. This section defines where AI runs, how matching works, and exactly where humans stand between the AI and anything a customer or vendor can see.

### Where AI is used — the complete map

| # | AI use case | Status | Grounding |
|---|---|---|---|
| 1 | Customer request clarification (intake Q&A, EN/ES) | **BUILT** | `src/lib/assistant/intake-flow.ts` — deterministic bilingual question engine (works with zero LLM keys; LLM only rephrases), served by `POST /api/assistant/intake` |
| 2 | Ticket organization / categorization | **BUILT** | `detectCategory()` keyword classifier + `RequestSummary` (problem, category, budget, urgency, `missing_info`, `recommended_categories`) written to `client_requests.ai_summary` |
| 3 | Summary generation | **BUILT** | Intake summary above; admin drafting via `POST /api/assistant/admin` (`ADMIN_PROMPT` in `src/lib/assistant/prompts.ts`) |
| 4 | RFQ / anonymized packet generation | **PARTIAL** | Admin assistant drafts packets and outreach (`/api/assistant/admin`); persistence into `quote_packets` and fan-out to `vendor_opportunities` not yet wired (see plan section 04) |
| 5 | Vendor matching | **PARTIAL** | Stage 1 deterministic scorer **BUILT** (`src/lib/matching.ts` + admin-gated `POST /api/match`); Stage 2 LLM re-rank/explain **MISSING** (design below) |
| 6 | Vendor quote drafting | **BUILT** | `POST /api/assistant/vendor-quote` (`VENDOR_QUOTE_PROMPT`) + bilingual draft legal terms generator `src/lib/assistant/terms.ts` (Net-30, warranty, non-circumvention, "not legal advice" disclaimer) |
| 7 | Quote comparison | **PARTIAL** | Admin assistant can draft comparisons; the structured comparison schema (`quotes`, `deal_shares` in `supabase/migrations/20260705_quotes_deals_private_comparison.sql`) is written but **not yet applied** |
| 8 | Brochure reading / extraction | **MISSING** | Upload + private storage **BUILT** (`/api/vendor/brochures` → `vendor_brochures` table, private `vendor-brochures` bucket, signed URLs); no text extraction or field extraction exists — pipeline proposed below |
| 9 | Product categorization | **PARTIAL** | Taxonomy columns exist (`vendor_applications.offering_types`, `supply_chain_stages` jsonb, GIN-indexed; `vendor_profiles.industries`, `client_types`); population is manual — AI suggestion proposed |
| 10 | Vendor profile enrichment | **PARTIAL** | An enrichment pipeline exists on the intel side (`/api/agents/vendor-enrichment` → `enriched_vendors`), but it is **not connected** to marketplace `vendor_profiles`; bridging is proposed |
| 11 | Event matchmaking / lead scoring | **PARTIAL** | Intel side has `conferences` (1,772+ events), `exhibitors`, `conference_vendor_links`, and scored `conference_leads` (`logistics_score`, `lead_tier`, `el_paso_relevant`); the Conference & Event Strategy modules (event scoring, invite-list builder) will formalize this — the matching engine here must feed their company-matching step |
| 12 | Follow-up suggestions | **PARTIAL** | Chatbot returns `suggested_actions` (`POST /api/chat`); structured next-step suggestions per request status proposed as an admin-assistant mode |
| 13 | Search / recommendation | **PARTIAL** | Intel-side search (`/api/search`, `/api/search/hybrid`, `/solve` problem-solver) is built; marketplace directory search is deterministic filtering — LLM query understanding proposed, low priority |
| 14 | EN↔ES translation | **PARTIAL** | First-class bilingual strings **BUILT** (intake flows, statuses in `src/lib/assistant/branding.ts`, quote terms with `spanish_version` on templates); page-level Google Translate widget (`src/components/TranslateButton.tsx`); **MISSING**: LLM translation of vendor-authored quote text and client-authored problem text, with the human-review gate below |

Note: the repo has a second, Gemini-only AI stack ("Jarvis", `src/lib/ai/provider.ts` + ~40 intel agents). The marketplace path (`src/lib/llm` + `src/lib/assistant`) is the authoritative one for everything in this section; intel agents feed it data (events, leads) but never touch customer/vendor communications.

### Matching: all signals, two stages

**Stage 1 — deterministic filter + score (extend `src/lib/matching.ts`).** Today `scoreVendors()` is pure-function (no I/O, testable) and scores: category match ×62, service-area match ×28, approved status +8, has-brochure +2, dropping zero-score vendors. Extend it — keeping the pure-function contract — with hard filters first, then weighted soft signals:

| Signal (from spec) | Type | Data source (existing → proposed) | Stage |
|---|---|---|---|
| Problem type / category | Soft, heaviest weight | `client_requests.category` ↔ `vendor_profiles.categories` — **BUILT** (×62) | 1 |
| Location / service area | Soft, heavy | `client_requests.location` ↔ `vendor_profiles.service_areas` — **BUILT** (×28, national=0.7 floor) | 1 |
| Cross-border requirement (El Paso↔Juárez, customs, IMMEX) | **Hard filter** when required | `client_requests.vendor_scope` (local/global/both) — BUILT; proposed `vendor_profiles.cross_border_capable` boolean + customs category tags | 1 |
| Language (EN/ES service delivery) | **Hard filter** when client requires ES | `client_requests.locale` — BUILT; proposed `vendor_profiles.languages` jsonb | 1 |
| Vendor approval status | **Hard filter** | `vendor_profiles.status = 'approved'` — BUILT (approved-only unless admin `include_all`) | 1 |
| Industry (client's) | Soft | proposed `client_requests.industry` (plan 04 §A) ↔ `vendor_profiles.industries` (column BUILT, 20260701b) | 1 |
| Facility type (warehouse, maquiladora, 3PL, cross-dock) | Soft | proposed `client_requests.company_type` ↔ `vendor_profiles.client_types` (column BUILT) | 1 |
| Company size / facility size | Soft | proposed columns (plan 04); `vendor_applications.company_size` column BUILT (pending migration) | 1 |
| Budget range | Soft (never shown to vendors) | `client_requests.budget_range` ↔ `vendor_applications.price_range` — bands compared deterministically, admin-only | 1 |
| Timeline / deadline / urgency | Soft | `client_requests.deadline`, `urgency` ↔ proposed vendor `typical_lead_time` (extractable from brochures/quotes) | 1 |
| Need domain: safety / quality / inventory / maintenance / logistics / production | Soft | proposed `client_requests.need_domains` jsonb ↔ vendor `offering_types` + brochure-extracted tags | 1 |
| Current systems (WMS/ERP/MES in use) | LLM signal | `intake_answers` jsonb (asked in warehouse_tech flow) — integration fit is judgment, not string match | 2 |
| Implementation complexity tolerance | LLM signal | intake answers + vendor's stated installation/training offering | 2 |
| Technology readiness of the client | LLM signal | inferred from intake answers ("current process" questions) | 2 |
| Desired outcome | LLM signal | `intake_answers` / proposed `desired_outcome` column — semantic match to vendor use-cases | 2 |
| Worker-supportive design | LLM signal + output rule | judged from vendor materials (training included, operator-assist framing); every explanation must state how the solution supports existing workers | 2 |

**Stage 2 — LLM re-rank + explain (existing router, budget-capped).** Take Stage 1's top K (recommended: 15), and call `aiDraft()` once with: the **anonymized** request summary (never client name/email/exact address), each candidate's profile facts and brochure-extracted tags, and the Stage 1 scores/reasons. The LLM re-ranks on the judgment signals above and produces explanations. Cost control is already built: per-provider daily token budgets (`LLM_DAILY_TOKEN_BUDGET` et al.), `maxProviders: 1` with Gemini preference for cheap paths, and budget exhaustion degrades to the single best provider rather than failing. If the LLM is unavailable, **Stage 1 order with its `reasons[]` is the shipped fallback** — matching never goes down. Estimated cost (recommendation, not a quote): one re-rank ≈ 2–4k tokens; even 100 matches/day fits comfortably inside the existing 120k-token Gemini daily budget.

### Match-explanation output contract

Every Stage 2 result is a JSON array of objects with this contract (rendered in `/admin/match`; the table in plan section 04 §G is the human-readable rendering of this same contract):

```json
{
  "vendor_id": "uuid",
  "fit_score": 87,                    // 0-100, LLM-adjusted
  "deterministic_score": 83,          // Stage 1 score, always shown
  "rank_change": +2,                  // vs Stage 1, so admins see what the LLM did
  "why_it_fits": ["...max 3 bullets..."],
  "why_it_fits_es": ["..."],          // bilingual by contract, not afterthought
  "gaps_or_risks": ["..."],
  "questions_to_ask": ["...for the vendor..."],
  "worker_support_note": "How this supports the existing workforce", 
  "estimated_cost_band": "labeled ESTIMATE, admin-only, never vendor-visible",
  "confidence": "high|medium|low",
  "is_draft": true
}
```

Contract rules: `worker_support_note` is **mandatory** — a match with no credible worker-support story gets flagged, not hidden; `deterministic_score` and `rank_change` are always present so the LLM's judgment is auditable; the vendor-visible variant of any packet built from a match **structurally omits** `estimated_cost_band` and all client-identifying fields; parse failure → deterministic fallback (Stage 1 output mapped into the same shape with `confidence: "low"`). Logged to `ai_draft_logs` with `ai_mode: 'admin'`.

### Vendor data organization: brochure → structured profile

Uploads are BUILT; intelligence on them is not. Proposed pipeline, reusing built components at every step:

1. **Upload** — BUILT: `/api/vendor/brochures`, private bucket, signed URLs only.
2. **Text extraction** — MISSING: PDF text layer first, OCR fallback for scanned brochures (common from smaller Juárez vendors).
3. **Sanitization** — BUILT and critical: brochures are untrusted third-party content, i.e. a prompt-injection surface. Run `sanitizeUntrustedLlmInput()` and wrap with `boundedDataPrompt()` (`src/lib/llm/sanitize.ts`, tested) before any LLM sees a byte.
4. **Field extraction** — MISSING: one `runParallelJsonEnsemble()` call (consensus voting across providers is worth the tokens here — this data drives matching for months). Target fields per spec: products/services offered, offering types (product/service/software/hardware/consulting/installation/logistics/training), industries served, client types, service areas, certifications, stated price ranges (extracted verbatim, labeled "as stated in brochure"), languages, installation/training included, cross-border capability claims.
5. **Staging** — MISSING: write to a proposed `vendor_extractions` table as a draft diff against the current `vendor_profiles` row; log to `ai_draft_logs`.
6. **Admin review gate** — the extraction is merged into `vendor_profiles` (`categories`, `service_areas`, `industries`, `client_types` — all existing columns) **only** after an admin accepts each field in `/admin/vendors`. Nothing extracted ever auto-publishes to the directory or the matcher.

The same pipeline, pointed at vendor websites, must pass URLs through the SSRF guard `normalizePublicHttpUrl()` (`src/lib/http/url-safety.ts`, BUILT, DNS-rebinding-checked).

### Human-review gates — where an admin must approve

| Gate | What is blocked until approval | Enforcement | Status |
|---|---|---|---|
| **Vendor approval** | Vendor appearing in matching/directory | `vendor_profiles.status` pending→approved (admin PATCH `/api/vendors/manage`); `guard_vendor_application_update()` trigger silently reverts non-admin status edits even via direct REST; approval auto-creates the live `vendors` row (`promote_approved_vendor_application()`) | **BUILT** (guard/promote triggers in migrations 20260702b/20260705, pending apply) |
| **Extraction merge** | AI-read brochure data entering profiles/matching | Staging table + per-field accept in `/admin/vendors` | **PROPOSED** |
| **RFQ/packet send-out** | Any opportunity reaching any vendor | `quote_packets.status` draft→approved→sent; vendors only ever see their own `vendor_opportunities`/`deal_invites` rows (RLS) | **PARTIAL** (schema BUILT; admin send wiring pending) |
| **Identity reveal** | Client or vendor learning who the other party is | `visibility_permissions` row (reveal_client/reveal_vendor, `approved_by`) — no code path reveals without it; prompts forbid it independently | **BUILT** (schema + prompt guardrails) |
| **AI-drafted messages / email** | Any outbound email or meeting invite | `sendZohoMail`/`createZohoMeeting` degrade to drafts when unconfigured; every attempt logged to `zoho_outbox` (draft/sent/failed); routes admin-gated | **BUILT** (`src/lib/zoho/*`) |
| **Quote sharing with client** | Vendor quotes reaching the customer | Admin sets `selected_for_client` (non-admins blocked by `guard_quote_update()` trigger), then mints an immutable tokenized `deal_shares` snapshot resolved only server-side | **BUILT** schema (20260705, pending apply) |
| **Translation release** | Machine-translated quote/legal text reaching the other party | Translated drafts flagged `is_draft`; bilingual admin (or vendor for their own text) approves — mistranslated warranty terms are a real liability | **PROPOSED** |

### Confidentiality guardrails — AI cannot leak what it never sees

Defense in depth, strongest layer first:

1. **Context minimization (structural, BUILT-by-schema):** vendor-facing artifacts are generated *only* from `quote_packets`/`deals` fields, which by design contain no client identity — `general_industry`, anonymized `problem_summary`, `OPP-`/`DEAL-` refs, `hide_client_identity`/`hide_budget` flags. The vendor-quote AI mode never receives the client's name, email, or exact address in its prompt, so no jailbreak can extract them. `AiMode` separation (`intake | admin | vendor_quote | chatbot`) is BUILT in `src/lib/assistant/llm.ts`.
2. **RLS (BUILT):** vendors read only their own invites/quotes; `deals` has no vendor-readable client fields; `admin_notes` and `ai_draft_logs` are admin-only; a vendor never sees who else was invited.
3. **Prompt layer (BUILT):** the shared `GUARDRAILS` block (`src/lib/assistant/prompts.ts`) — never reveal identities without admin approval, never auto-send, everything is a draft, respect NDA/MNDA.
4. **Input layer (BUILT):** `sanitizeUntrustedLlmInput()` on all vendor/client-supplied text before prompting.
5. **Output scrub (PROPOSED):** before any AI draft is marked shareable-to-vendor, run a deterministic redaction check of the output against the request's client company name, contact name, email, and domain; on hit, block, flag in `ai_draft_logs`, and require admin edit. Cheap, deterministic, catches the residual case where an admin pasted identifying context into a draft prompt.
6. **Audit (BUILT):** `ai_draft_logs.visibility_used` + `platform_audit_log` record what visibility settings governed each generation.

### Worker-friendly enforcement (PROPOSED additions)

Extend `GUARDRAILS` with: "Never describe any solution as replacing workers or reducing headcount. Frame benefits as productivity, safety, quality, visibility, training, and maintenance support for the existing workforce." Add a deterministic post-generation phrase lint on all client/vendor-visible drafts — flag (not silently rewrite) phrases like "replace workers," "reduce headcount," "labor savings," and Spanish equivalents ("reemplazar trabajadores," "eliminar puestos," "reducir personal") for admin edit. Combined with the mandatory `worker_support_note` in every match explanation, the positioning is enforced in code, not just in copy.

### Build order for this section

1. Wire packet persistence + send gate (unblocks the RFQ gate end-to-end).
2. Brochure extraction pipeline with staging + review UI (biggest data-quality lever for matching).
3. Extend `scoreVendors()` with the new Stage 1 signals + hard filters (pure functions, add tests alongside `tests/rate-limit.test.ts` etc.).
4. Stage 2 re-rank with the explanation contract.
5. Output identity scrub + worker-language lint.
6. Bridge intel-side event/lead data (`conference_leads`, `conference_vendor_links`) into the matcher as inputs for the Conference & Event Strategy modules' company-matching and invite-list builder.
