# AI / Intelligence + Integration Layer Inventory — nxt-link-web

Scope: `src/lib/assistant/*`, `src/lib/llm/*`, `src/lib/matching.ts`, `src/lib/apply/auth.ts`, `src/lib/vendor/auth.ts`, `src/lib/zoho/*`, `src/lib/privateAccess.ts`, `src/lib/server/admin-session.ts`, `src/lib/http/*`, `.env.example`, tests.

---

## 1. AI Features & LLM Routing

### 1.1 Provider router — `src/lib/llm/parallel-router.ts` (the core LLM engine)
- **`runParallelJsonEnsemble<T>()`** — fan-out a system+user prompt to multiple providers in parallel, parse each response as JSON, pick a winner by **consensus vote** (`pickConsensusCandidate` groups identical `stableJsonStringify` outputs; ties broken by provider rank). Throws only if *all* providers fail/parse-fail.
- **`runParallelJsonTaskBatch<T>()`** — worker-pool wrapper (default concurrency 4) running many tasks through the ensemble.
- **8 supported providers** (`LlmProviderName`): `nvidia`, `anthropic`, `gemini`, `openrouter`, `groq`, `ollama`, `together`, `openai`. A provider is active when its env key is set (`getConfiguredProviders`).
- **Default models** (env-overridable): NVIDIA `nvidia/llama-3.1-nemotron-ultra-253b-v1`, Anthropic `claude-sonnet-4-20250514`, Gemini `gemini-2.0-flash`, OpenRouter `meta-llama/llama-3.1-8b-instruct:free`, Groq `llama-3.1-8b-instant`, Ollama `llama3.2:3b`, Together `Meta-Llama-3.1-8B-Instruct-Turbo`, OpenAI `gpt-4o-mini`.
- **Priority order**: `nvidia > anthropic > gemini > openrouter > groq > ollama > together > openai`; a separate low-cost order exists when `preferLowCostProviders` is set.
- **Provider lock**: `NXT_LINK_LLM_PROVIDER` env (comma list) restricts routing; callers can further narrow via `preferredProviders`.
- **Budgets** (in-process, per-UTC-day token ledger, estimated at ~4 chars/token + 8/message overhead):
  - Per-provider: `<PROVIDER>_DAILY_TOKEN_BUDGET` env; shared fallback `LLM_DAILY_TOKEN_BUDGET`.
  - Per-call `RouterBudgetOptions`: `maxTotalEstimatedTokens`, `maxProviders`, `reserveCompletionTokens` (default 500), `providerMaxEstimatedTokens`, `preferLowCostProviders`.
  - Budget exhaustion never hard-fails: falls back to the single best candidate provider.
- JSON mode enforced per provider (Gemini `responseMimeType: application/json`, OpenAI-style `response_format: json_object`, Ollama `format: 'json'`, plus an appended "Return valid JSON only" user message). Anthropic uses `x-api-key` + `anthropic-version: 2023-06-01`, max_tokens 2048.
- Uses `fetchWithRetry` (`src/lib/http/fetch-with-retry.ts`) with 1 retry, 600ms delay.

### 1.2 Assistant AI wrapper — `src/lib/assistant/llm.ts`
- **`aiDraft<T>()`** — thin wrapper over the ensemble: temperature default 0.4, `preferredProviders: ['gemini']`, `budget.maxProviders: 1`, caller supplies `parse` and a **deterministic `fallback()`** — **never throws**; falls back with `provider: 'fallback'`. All results marked `is_draft: true` (human-review-first design).
- **`logAiDraft()`** — best-effort audit write to Supabase `ai_draft_logs` (mode, request/vendor id, prompt input truncated to 4000 chars, output, provider, `approval_status: 'draft_generated'`).
- **`logAudit()`** — best-effort write to `platform_audit_log` (action, role, before/after status).
- `AiMode = 'intake' | 'admin' | 'vendor_quote' | 'chatbot'`.

### 1.3 Prompts & guardrails — `src/lib/assistant/prompts.ts`
- `GUARDRAILS` block shared by every assistant prompt: one question at a time; never reveal client/vendor identity without admin approval; never auto-send quotes/messages; no pricing promises; no legal advice; everything is a DRAFT pending human review; respect NDA/MNDA + visibility controls.
- Three role prompts: `CLIENT_INTAKE_PROMPT`, `ADMIN_PROMPT`, `VENDOR_QUOTE_PROMPT`.

### 1.4 Deterministic intake engine — `src/lib/assistant/intake-flow.ts`
- Works **with or without an LLM** (LLM only rephrases/enriches). Keyword-based `detectCategory()` → `forklift | staffing | warehouse_tech | transportation | facility | unsure`.
- Per-category bilingual (EN/ES) question flows (5–9 questions) + 6 common closing questions (location, deadline, budget, NDA, scope, share-permission). `nextStep()` returns the next question or a final `RequestSummary` (problem, category, quantity, location, deadline, budget, urgency, `nda_required`, permissions, `missing_info`, `recommended_categories`).
- Wired via `POST /api/assistant/intake` (`src/app/api/assistant/intake/route.ts`) — pure engine, logs the final summary to `ai_draft_logs` with provider `intake-engine`.

### 1.5 Quote terms generator — `src/lib/assistant/terms.ts`
- `generateTerms(locale, opts)` — pure-function bilingual DRAFT legal-template blocks: quote validity (default 30 days), Net-30 payment, warranty (default 12 months), exclusions, category-aware lead time, emergency service, liability/insurance, NDA-aware confidentiality, **NXT//LINK introduction/non-circumvention agreement**, Texas governing law, and a mandatory "not legal advice" disclaimer. Served by `/api/assistant/terms`.

### 1.6 Branding / statuses — `src/lib/assistant/branding.ts`
- `Locale = 'en' | 'es'`, `t()` translation helper, assistant name strings, 10 ordered client-facing statuses, 12-column admin request pipeline, 10 vendor opportunity statuses.

### 1.7 AI route surfaces (consumers of `aiDraft`)
- `POST /api/chat` — public/vendor bilingual chatbot (temperature 0.6, JSON `{reply, suggested_actions}`, keyword-based deterministic fallback, never reveals vendor identities).
- `POST /api/assistant/intake` — intake engine (above).
- `POST /api/assistant/admin` — admin drafting (request review, vendor outreach, quote packets).
- `POST /api/assistant/vendor-quote` — vendor quote drafting.
- `POST /api/assistant/terms` — terms generation.

### 1.8 Secondary AI path — `src/lib/ai/provider.ts` ("Jarvis", intel side)
- Gemini-only via `@google/genai`, default model `gemini-2.5-flash`, in-process daily request limiter (400/day total, ÷3 per agent), 503-aware exponential-backoff retry. Used by the ~40 intel agents in `src/lib/agents/*` (separate from the marketplace assistant path).

---

## 2. Matching Engine — `src/lib/matching.ts`
- **Pure functions, no I/O** (easy reuse/testing).
- **Input**: `MatchInput { category?, location? }` + `MatchableVendor[]` (`id, company_name, email, categories[], service_areas[], status, brochure_count`).
- **Signals & weights** (`scoreVendors`, 0–100):
  - Category match × **62** — exact normalized match = 1.0, substring containment = 0.85, else token-overlap ratio; no category filter → flat +20 for all.
  - Service-area match × **28** — location/area substring = 1.0, `national`/`nacional` = 0.7 floor, else token overlap.
  - `status === 'approved'` → **+8** ("Approved vendor").
  - `brochure_count > 0` → **+2**.
- **Output**: `ScoredVendor[]` sorted desc, each with human-readable `reasons[]`; zero-score vendors dropped.
- **Consumer**: `POST /api/match` (admin-gated via `isAdminRequest`) — loads `vendor_profiles` (approved-only unless `include_all`, limit 500), joins brochure counts, can pull category/location from a `client_requests` row by id or `REQ-` public_ref, returns top 50. Degrades to empty list without Supabase.

---

## 3. Auth Model (per role)

### 3.1 Platform roles — `src/lib/assistant/auth.ts`
- `PlatformRole = 'public' | 'client' | 'vendor' | 'admin' | 'super_admin'` from Supabase Auth session + `platform_users.role` (default `client` when no row).
- **`isAdminRequest(req)`**: signed-in admin/super_admin **OR** transitional header `x-access-code === PRIVATE_ACCESS_CODE` (the hardcoded `'4444'`, see 3.4).

### 3.2 Vendor portal — `src/lib/vendor/auth.ts`
- Supabase email/password session → `getOrCreateVendorProfile`: (1) `vendor_profiles` by `auth_id`, (2) claim legacy anonymous row by `ilike(email)` where `auth_id IS NULL` (then locked), (3) create fresh `pending` row. All vendor-portal API routes scope to the **caller's own row** — never a client-supplied vendor id. Uses the **service-role** Supabase client for these lookups.

### 3.3 Vendor applications — `src/lib/apply/auth.ts`
- Same pattern for `vendor_applications` (separate table): by `auth_id`, else one-time email-claim of an anonymous submission; **does NOT auto-create** — null means "send to /apply".

### 3.4 Private access code — `src/lib/privateAccess.ts` ⚠️
- **`PRIVATE_ACCESS_CODE = '4444'` hardcoded and exported** — client-side gate stored in `localStorage` key `nxt-link-private-access`; guards paths `/markets`, `/intel`, `/admin`, `/crm`.
- **Usage sites**: `AccessGate.tsx`, `PrivateAccessPrompt.tsx`, `DockNav.tsx`, `tubelight-navbar.tsx` (UI gating); admin pages (`/admin`, `/admin/requests|vendors|match|directory`); server-side as the `x-access-code` header check in `src/lib/assistant/auth.ts` `isAdminRequest` and admin API routes (`import-yc`, `dedup-vendors`, `clean-junk`). Since the constant ships in the client bundle, this is **cosmetic gating, not security**.

### 3.5 Hardened replacement — `src/lib/server/admin-session.ts`
- Server-only successor: `ADMIN_ACCESS_CODE` env (never shipped to browser), constant-time compare (`timingSafeEqual` over sha256), HMAC-signed httpOnly cookie `nxt_admin_session` (12h TTL, `v1.<expiry>.<hmac>`) minted by `POST /api/auth/access-code`, plus transitional `x-access-code` header vs env code. Secret from `ADMIN_SESSION_SECRET` or derived from the code. **Coexists with the old '4444' path** — migration is incomplete (`assistant/auth.ts` still imports the hardcoded constant).

---

## 4. Zoho Integration — `src/lib/zoho/*`

### 4.1 `client.ts` — OAuth core
- Env config: `ZOHO_CLIENT_ID/SECRET/REFRESH_TOKEN`, `ZOHO_ACCOUNTS_DOMAIN`, `ZOHO_API_DOMAIN`, `ZOHO_MAIL_ACCOUNT_ID`, `ZOHO_FROM_ADDRESS`, `ZOHO_MEETING_ZSOID`. Scopes: `ZohoMail.messages.CREATE`, `ZohoMeeting.meeting.CREATE`.
- Refresh-token → access-token exchange, **cached in-process** with 60s expiry margin. `zohoFetch()` = authorized fetch. All functions return null / degrade instead of throwing when unconfigured.

### 4.2 `mail.ts` — `sendZohoMail({to, subject, body, cc, bcc})`
- POSTs `/mail/v1/accounts/{accountId}/messages` (HTML format). Unconfigured → `{ok:true, sent:false, provider:'fallback'}` so the UI stores a **draft a human sends manually**.
- Route `POST /api/zoho/email` (admin-gated) logs every attempt to Supabase `zoho_outbox` with status `sent|draft|failed`.

### 4.3 `meeting.ts` — `createZohoMeeting({topic, agenda, startTime, durationMinutes=30, timezone='America/Denver', presenterEmail})`
- POSTs `https://meeting.zoho.com/api/v2/{zsoid}/sessions.json`; returns `joinUrl`/`meetingId`. Unconfigured → proposes the slot with `scheduled:false` for human finalization. Route: `POST /api/zoho/meeting` (admin-gated).

---

## 5. Security Utilities (reusable)

### 5.1 Rate limiting — `src/lib/http/rate-limit.ts` (tested: `tests/rate-limit.test.ts`)
- `checkRateLimit({key, maxRequests, windowMs})` → `{allowed, remaining, retryAfterMs}`. In-memory `Map` fixed-window counter with lazy expiry cleanup. **Per-process only** (no Redis) — fine for single-instance, resets on deploy.

### 5.2 LLM input sanitizer — `src/lib/llm/sanitize.ts` (tested: `tests/sanitize.test.ts`)
- `sanitizeUntrustedLlmInput(rawText, maxChars=15000)` — strips control chars, collapses whitespace, redacts 8 prompt-injection patterns (ignore/disregard instructions, "system prompt", "developer mode", "act as", "you are chatgpt", `<script>` blocks, code fences) → `{sanitized_text, risk_score (0–1), flags[], removed_chars}`.
- `boundedDataPrompt(label, content)` — wraps untrusted content in `UNTRUSTED DATA START/END` markers.

### 5.3 SSRF guard — `src/lib/http/url-safety.ts` (tested: `tests/url-safety.test.ts`)
- `normalizePublicHttpUrl(url, resolver?)` — enforces http/https only, no embedded credentials, ports 80/443 only; blocks `localhost`, `.local/.internal/.corp/.home.arpa` suffixes; rejects private/reserved IPv4 (10/8, 127/8, 169.254, 172.16–31, 192.168, CGNAT 100.64–127, 0/8, multicast ≥224) and IPv6 (::1, ULA fc/fd, link-local fe80–feb, ::ffff: mapped); **double DNS resolution with overlap check** as a DNS-rebinding guard. Injectable resolver for tests.

### 5.4 Also available
- `src/lib/http/fetch-with-retry.ts` — retrying fetch with in-flight dedupe option (tested: `tests/fetch-with-retry.test.ts`).
- Audit trails: `ai_draft_logs`, `platform_audit_log`, `zoho_outbox` (all best-effort, never block the request).

---

## 6. Env Vars (`.env.example`)

| Group | Vars |
|---|---|
| DB / backends | `DATABASE_URL` (sqlite dev), `INTEL_API_URL` (:8100 FastAPI), `NEXT_PUBLIC_BRAIN_URL` (:8000) |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| LLM keys/models | `NVIDIA_API_KEY/MODEL`, `GEMINI_API_KEY/MODEL`, `OPENAI_API_KEY/MODEL`, `OPENROUTER_API_KEY/MODEL`, `GROQ_API_KEY/MODEL`, `OLLAMA_BASE_URL/MODEL`, `TOGETHER_API_KEY/MODEL` (Anthropic supported in code via `ANTHROPIC_API_KEY/MODEL`, not in the example) |
| LLM routing | `NXT_LINK_LLM_PROVIDER="nvidia"`, `LLM_PROVIDER_LOCK="nvidia,gemini,groq"` (note: code reads `NXT_LINK_LLM_PROVIDER` for the lock) |
| Token budgets | `LLM_DAILY_TOKEN_BUDGET=300000` shared; per-provider `GEMINI(120k)/OPENROUTER(160k)/GROQ(160k)/OLLAMA(0)/TOGETHER(160k)/OPENAI(90k)/NVIDIA(200k)_DAILY_TOKEN_BUDGET` |
| Chunking | `NXT_LINK_PARALLEL_CHUNK_THRESHOLD=8500`, `_CHUNK_SIZE=5500`, `_CHUNK_OVERLAP=500`, `_MAX_CHUNKS=6` |
| External data | `USPTO_PATENTSVIEW_API_KEY`, `SAM_GOV_API_KEY`, `OPENCORPORATES_API_TOKEN(+_API_VERSION)` |
| Google | `GOOGLE_SERVICE_ACCOUNT_KEY_JSON`, `GOOGLE_DOC_ID` |
| Local paths | `NXT_LINK_MASTER_PROMPT_PATH`, `OBSIDIAN_VAULT_PATH` (Windows paths — dev machine artifacts) |
| Zoho | `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ACCOUNTS_DOMAIN`, `ZOHO_API_DOMAIN`, `ZOHO_MAIL_ACCOUNT_ID`, `ZOHO_FROM_ADDRESS`, `ZOHO_MEETING_ZSOID` |
| Admin (code-only, not in example) | `ADMIN_ACCESS_CODE`, `ADMIN_SESSION_SECRET` |

---

## 7. Key Observations
1. **Human-in-the-loop by design**: every AI output is a draft (`is_draft: true`), logged, and requires approval; Zoho send/schedule degrade to drafts.
2. **Graceful degradation everywhere**: no LLM key → deterministic fallbacks; no Supabase → degraded empty responses; no Zoho → drafts. The platform runs with zero external services.
3. **Two parallel AI stacks**: marketplace assistant (multi-provider ensemble, `src/lib/llm` + `src/lib/assistant`) vs intel/agents ("Jarvis", Gemini-only, `src/lib/ai/provider.ts` + `src/lib/agents/*`).
4. **Security gap**: hardcoded `'4444'` in `src/lib/privateAccess.ts` is still the accepted `x-access-code` in `src/lib/assistant/auth.ts:isAdminRequest` (used by `/api/match`, `/api/zoho/*`, assistant admin routes) even though the hardened env-based `admin-session.ts` exists. Budgets and rate limits are in-memory/per-process only.
