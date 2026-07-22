# Product Risk Mitigations — Cesar's 15-item list (2026-07-22)

Source: risk/fix list Cesar supplied mid demo-sprint ("leverage some of these").
Triage by coordinator against the codebase + binding decisions. Nothing here
is built without Cesar's go per item; conflicts with recorded decisions are
flagged loudly so wrong numbers/claims never ship by accident.

## ⚠️ CONFLICTS with binding decisions — reconcile with Cesar BEFORE any build

| # | The list says | What's actually decided/built | Needed |
|---|---|---|---|
| 7 | "fee structure 2% capped" | Fee engine (sacred): 5% first $50k, 3% above, $20k cap (launch-v2, DECISIONS-2026-07-21) | The 2% premise is wrong; revenue-diversification ideas (promoted listings, subscriptions) can proceed WITHOUT touching fees |
| 14 | $250 credit "first three transactions"; $1,250 after verification+listing+response | Binding: $250 FIRST deal only; $1,250 founding = manual approval; server-enforced resolver already live | The *gating spirit* (credit only after verification) matches F1; the numbers/mechanics differ — Cesar picks: keep decided policy (recommended) or reopen |
| 8 | "value of escrow… will keep them in platform" | Standing rule: NEVER say/imply NXT//LINK holds funds; no Stripe yet | Email-relay + post-accept contact reveal ideas are fine (reveal already built); any copy mentioning escrow is banned |
| 12 | "NXT LINK guarantees up to $10,000 if a supplier fails" | No such liability exists; legal/finance never reviewed | Do NOT ship any guarantee claim without Cesar + legal. Founding-badge + video-vetting parts are fine |

## Already built or largely built (verify/extend, don't rebuild)

- **#8 contact reveal after acceptance** — masking pre-acceptance + reveal
  post-accept is the shipped design. Remaining idea = masked email relay
  (new, backlog).
- **#2 terminology** — buyer UI already avoids "RFQ" (uses Request a Quote /
  quote request). Sweep for stragglers during Slice 4/5 copy pass.
- **#12 founding vendors** — founding_vendor flag + $1,250 manual tier exist;
  "Founding Supplier" public badge = small addition once Cesar wants it.
- **#4 palette** — decided (violet Design System v1.0) and WCAG-checked in
  Slices 1–2 (AA-verified text shades). Preference-testing with real buyers
  can still happen; invoices/contracts staying black/white is sensible and
  costs nothing now (no invoice UI exists yet).

## Post-demo QUICK WINS (small, high value — propose as next mini-slice)

1. **#3 cart reframe**: rename buyer-facing "Cart" → "Quote List", add the
   "this is not a purchase" tooltip + post-submit expectation line. Copy
   via marketing → Cesar approves strings → tiny UI change.
2. **#13 honest no-match**: when dispatch matches zero qualified vendors,
   tell the buyer honestly + keep looking window, instead of silence. Needs
   a look at what dispatch does today on zero matches.
3. **#6 dispatch cap**: cap invited vendors per request (5–8 default) with
   ranking already present in dispatch scoring; add "expand" affordance
   later.
4. **#15 response nudges**: 24h vendor nudge cron (profile-nudges cron is
   the pattern to copy); response-time display on profiles once data exists.
5. **#5 industries required at publish**: publish gate already exists —
   add "industries you serve" to its required-fields check + buyer-side
   sparse-results message.

## Bigger builds (backlog, sequence after reskin slices)

- **#1 two-track intake** (simple vs "complex project" toggle w/ milestones,
  compliance docs, attachments) — natural Slice-4 companion when /intake
  and /projects merge.
- **#10 comparison "value story" row** (300-char vendor narrative +
  attachment in QuoteCompare) — extends existing compare table.
- **#7 revenue diversification** (promoted listings, Pro/Scale subscriptions,
  value-add services) — product/finance decision first, then build.
- **#11 desktop-first investment split** — direction note for all future UX
  work (70/30), not a task.
- **#6 learning matcher / quality threshold** — after basic cap ships.

## Leverage TODAY (demo narrative only — zero code)

- **#9 focused wedge**: demo story = "Borderplex, warehouse & logistics
  first — density before breadth." (Already true of the seeded data.)
- **#12 human curation**: "first suppliers personally vetted on video call"
  = exactly the invite + verification flow being demoed.
- **#13 honesty principle**: say it as a value: "we never blast irrelevant
  vendors — verified matches or we keep looking."
