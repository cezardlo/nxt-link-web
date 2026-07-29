# Post-login experience + Team accounts (Cesar paste, 2026-07-29)

## Coordinator triage — read first
- STATUS: filed as the build-ready spec for BOTH topics. NOTHING dispatched — freeze + RFQ slices take priority. Build trigger for team accounts = first real vendor asking "can my employee also answer quotes?" (expected within first 10 vendors).
- ⚠️ CORRECTION to the doc's claim "NXT Link already has a simple, secure model designed exactly for this": NOT built. Reality: one user = one account today; an unused `vendor_team` table exists in the schema and an invite-link system exists for vendor RECRUITING (/join/[token]) — a foundation, not a feature. Everything in §3 is TO BUILD.
- Much of §1 is ALREADY DECIDED/BUILT — map:
  - New buyer screen = exists ("What do you need today?" + cards). The "[Post a Need & Get Quotes]" card = the still-OPEN front-door-flip decision (this doc is another vote FOR; Cesar hasn't ruled).
  - New vendor "progress-guided, only next step highlighted, agreement LAST" = exactly the locked Uber-onboarding decisions (S1 built 2026-07-29; agreement-as-milestone-at-end = locked; "no payment setup" trivially true — no payments exist).
  - Returning buyer "sourcing pulse" + returning vendor "control room" (metrics strip = 4 simple counts + needs-attention list) = matches the LOCKED phase-1 dashboard scope (Cesar 2026-07-29: "You're live" moment + ONE next step + 4 simple counts + useful empty states; heavy analytics deferred). The "3 quotes waiting — best offer $X" hero = a natural follow-up on the just-built RV data. Heatmaps/funnels remain phase-2.
  - "No forced profile wizard / no blank dashboards / teach via empty states" = existing site philosophy (audit-praised).
- Genuinely NEW in this doc (queued, not built): storefront PREVIEW card during vendor setup (motivating, S2/S5 fit); team avatar strip; RFQ assignment to a team member + one-click reassign with history; internal team-only notes on a lead; "Explore by industry" strip on buyer home.
- Benchmark table (Amazon Business / Upwork / Fiverr / Alibaba) kept as reference; its Alibaba row ("suppliers share login credentials — messy") = the anti-pattern we refuse.

## Team accounts — the model (spec, launch-lean)
- Company = its own entity; people BELONG to it. Creator = **Owner**. Roles at launch: Owner (everything incl. financial/legal), **Manager** (everything except critical financial/legal changes), **Member** (respond to assigned quotes, message buyers, view team work). [Coordinator note: could launch with Owner+Member only if simpler; decide at build time.]
- Invites by email from settings; each person signs in with their OWN Google/LinkedIn/password — NEVER shared credentials. All share the company storefront, listings, reputation.
- Team avatar strip (initials/photo, hover = name+role) so it's always clear who's acting.
- Leads are shared; a Manager can assign an RFQ → assignee becomes primary contact; internal notes visible only to the vendor team; one-click reassignment moves full history+chat context.
- ONE company per user at launch (no personal/company switching — avoids Amazon Business's dual-account confusion). Multi-company account switcher (Google-style "add another account") = FUTURE phase, explicitly not day one.
- Role checks are SERVER-side permissions, not UI hiding (security dept reviews before ship; touches money-adjacent actions like accepting deals → Owner-only).

## Sequencing
1. NOW: RFQ slices (in flight) unchanged. Welcome-strip idea (one-time "Welcome 👋" + one next step, dismisses forever) = cheap, fold into an RFQ UI slice.
2. Post-RFQ-MVP: returning-buyer hero card ("N quotes waiting") on RV data + vendor needs-attention list = phase-1-dashboard-scope compliant.
3. ON DEMAND (first vendor team request): team accounts build — schema (companies/members/roles or revive vendor_team), invite flow (reuse invite infra), role middleware, avatar strip, assignment. Opus/security review required (auth + permissions).
