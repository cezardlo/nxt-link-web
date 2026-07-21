# NXT//LINK Engineering & Design Process (v1)

**Binding for every agent — coding, design, and process — on all NXT//LINK work.
Modeled on the stage-gated delivery process used by established enterprises
(spec → build → review → QA → release). No stage may be skipped.**

---

## 1. The gates (every piece of work passes all six)

| Gate | What happens | Who owns it |
|---|---|---|
| G1 Spec | Work starts from a written spec (a `workplace/plans/*.md` section or task brief). No spec → write a 10-line mini-spec FIRST and include it in your report. | The agent |
| G2 Build | Small, targeted changes matching existing patterns. Reuse existing helpers (auth, email, fees, admin gating) — never fork a second version of something that exists. | The agent |
| G3 Self-review | Re-read your own diff before finishing. Check against §3 Definition of Done. | The agent |
| G4 Verify | `npm run typecheck` MUST pass clean. Run the relevant flow locally when feasible. | The agent |
| G5 Peer review | The orchestrator (main session) reads the diff/report before the next task starts. Weak output = one revision round. | Orchestrator |
| G6 Release | ONE deploy per batch, executed only by Cesar. Migrations applied to live DB only with explicit approval. | Cesar |

## 2. Single source of truth (alignment rule)

- Specs live in `workplace/plans/` (MASTER-PLAN.md is the index; department plans hold detail).
- Project memory lives in `vault/` (Home.md first).
- Status lives in the shared STATE Google Doc (orchestrator updates it).
- **If two documents disagree: MASTER-PLAN.md §3 (resolved conflicts) wins, then the department plan, then vault history.**
- Every agent updates the doc it changed the truth of (e.g. built a feature → note it in the relevant plan's status line). Never leave docs describing a state that no longer exists.

## 3. Definition of Done (checklist — all boxes or it isn't done)

- [ ] Typecheck clean (`npm run typecheck`, 0 errors)
- [ ] Matches existing code patterns; no duplicate helpers/components created
- [ ] All user-facing text bilingual EN/ES via the shared i18n mechanism
- [ ] Accessible: labels on inputs, keyboard reachable, visible focus, no color-only meaning
- [ ] Loading + empty + error states on every new screen/fetch
- [ ] Security: server-side auth on every new API route (fail-closed), ownership checks on user data, no secrets in code, migrations as FILES only (never applied to prod by an agent)
- [ ] Money math: only `calculateFee()` computes commission — never re-implement
- [ ] Copy rules: never "NXT//LINK holds your money"; no escrow promises pre-P1; no $1,250-credit mentions (pending attorney)
- [ ] Do-not-regress list respected (experience-design plan §4.3)
- [ ] Committed with `git -c user.email=delaocesar65@gmail.com -c user.name=cezardlo commit`; NOT pushed, NOT deployed
- [ ] Report: files changed, what works, what needs applying (migrations/env), assumptions made

## 4. Onboarding program standard (the funnel is a managed process, not a page)

Enterprise onboarding = staged, owned, measured. Ours:

| Stage | Definition of success | Owner | Metric |
|---|---|---|---|
| INVITED | Invite sent, tracked in `vendor_invites` | Growth | Invites sent |
| JOINED | Account created via /join/[token] (invited = skip review) or /signup+review (organic = admin review REQUIRED — two lanes, per Cesar) | Onboarding | Join rate |
| PROFILED | Profile ≥ the strength threshold shown by the ONE shared ProfileStrengthMeter | Design | % complete profiles |
| LISTED | First listing published (post email-verify + accuracy confirm) | Onboarding | Time-to-first-listing |
| QUOTING | First quote submitted on an RFQ | Ops | Time-to-first-quote |
| DEALING | First accepted quote → order | Payments | First-deal rate |

Rules:
- One signup system. Invited and organic are two LANES of the same flow, not two systems. Shared account-creation code; the lanes differ only in the review gate.
- Every stage transition is recorded with a timestamp (that's how we get the metrics).
- Every automated email states why the recipient got it + unsubscribe. Hard cap 4 emails/sequence; stop instantly on signup/reply/unsubscribe.
- Legal acceptance (click-wrap) is captured AT the gate where terms start applying, stored in `terms_acceptances` with document version + timestamp — never a bare checkbox that saves nothing.

## 5. Working agreements between departments

- Coding agents implement to the design plan's specs; design agents design within what the code/data can serve; process (ops) owns the SOP the feature must fit. Conflicts → escalate to the orchestrator, who rules per §2 and records the ruling in MASTER-PLAN §3.
- Two agents never edit the same working tree in parallel.
- Sequential handoff: each agent's report is the next agent's context — write it so a colleague can start without re-exploring.
