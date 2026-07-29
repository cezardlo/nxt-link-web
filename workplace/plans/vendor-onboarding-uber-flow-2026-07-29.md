# Vendor Onboarding → Uber-style Card Flow (Cesar spec, 2026-07-29)

Cesar's directive: the vendor profile is a "monster page — complex, boring, long." Replace it with an Uber-driver-signup-style guided flow: one clear question per full-screen card, gentle forward motion, no wall of fields. Below = his 8-point spec + the design philosophy he attached, decomposed into buildable slices with guardrails.

## Design philosophy (from the video Cesar shared — the lens for every decision)
- **User intent first.** Each card exists to move the vendor toward "storefront live," not to look pretty. Function over flair.
- **Leverage familiar layouts.** Top→bottom, nav up top, one eye-catching CTA. Don't reinvent where reinvention doesn't serve the user; make it ours with tasteful micro-interactions, not novelty.
- **Progressive disclosure.** Show only what's needed now; reveal more as required. (This IS the card flow — and why the checklist/AI/percentage-ring disappear during the flow and reappear on a summary screen.)
- **Functional animation only.** Buttons get a small responsive animation; transitions add clarity (slide = "moving forward"). No scrolljacking, no decorative motion. Reduced-motion always respected.
- **Lean design system.** Reuse Design System v1.0 tokens + the installed taste skills; lightweight, easy to change. Consistency = shared language, bent with intention.

## The 8-point spec (Cesar, verbatim intent)
1. **Swipeable card flow** — one card per concept (logo / tagline / industries / …). Thin progress line or dots (not a %). Desktop = subtle Next; mobile = swipe. No scrolling within a card.
2. **Remove visual noise** — white space, one large input/image, single CTA. Collapse everything not the current task (checklist, AI chat, % ring) → they live on a final "Profile Summary" screen. Big friendly headlines ("What does your company do?"). Illustration + short sentence instead of text walls.
3. **One-click vendor agreement** — clean card, 3–4 key bullets, prominent "Acepto y continuar", full terms behind a link (not required reading), brief "You're all set!" celebration after accept. Feels like agreeing, not a legal hurdle.
4. **Smart category search** — single search field + autocomplete + 4–6 popular chips (tap to add/remove). No nested trees, no long scroll.
5. **Micro-interactions** — soft purple checkmark animates in when a field is filled; 200ms ease-out slide between cards; gentle gradient progress; optional light haptic on mobile for critical actions.
6. **Mobile-first, thumb-friendly** — ≥48px targets, primary CTA pinned bottom, camera opens directly from the card, native safe-areas + keyboard handling.
7. **Warm human tone, one language** — short encouraging copy in the vendor's chosen language, never mixed. Example: "¿Qué hace tu empresa? Ejemplo: 'Servicio de montacargas en la frontera desde 2009.'" Scout (AI) only on-demand as a chat bubble, never a persistent footer.
8. **"You're online" dashboard** — after the flow: status card ("Tu tienda está activa", green dot / or "in review"), daily pulse ("0 cotizaciones hoy"), big tappable quick-actions (Nueva publicación / Responder cotización / Mensajes). Calm, generous white space, black/violet identity.

## Buildable slices (each gated + reviewed; merge local; Cesar pushes)
- **S1 — Card-flow shell (backbone).** Full-screen one-card-per-question stepper: top progress dots, desktop Next + mobile swipe/next, 200ms slide, autosave "Saved ✓" flash (reuse existing autosave), thumb-bottom CTA, safe-areas, reduced-motion safe. Wraps the EXISTING vendor fields, one concept per card. No new data.
- **S2a — NEW (Cesar 2026-07-29): "Where are you based?" card — company HQ address/location.** Today vendor_profiles has only `city` (text) + `service_areas` (jsonb) — no street address / HQ. Add it:
    - OWNER: **backend-dev** adds ONE small additive column (`hq_address text`, flexible free-form so MX + US formats both work — KB #187) + wires save; **frontend** adds the onboarding card ("¿Dónde está tu empresa? / Where's your company based?") with address + reuse existing city, and shows it on the public storefront.
    - PRIVACY DEFAULT (recommend): show **city/region publicly** (builds "local + verified" trust, on-brand for Borderplex, KB #10) but keep the **exact street address private** — used for verification/logistics, not splashed on the public page. Cesar can override to fully-public if he wants.
    - Additive column only (safe); no other schema churn. Folds into the onboarding flow build.
- **S2 — Card content + warm EN/ES copy + per-card illustration/icon.** Big headlines, example placeholders, human microcopy both languages. The three "who are your clients" pickers become their own optional cards a vendor can skip (supersedes tonight's collapse tweak).
- **S3 — Smart category search.** Replace the category tree with search + autocomplete + 4–6 popular chips. ⚠️ CategoryPicker is a SHARED component — must not break its buyer/marketplace uses; branch a flow-specific variant if needed.
- **S4 — One-click agreement card.** 3–4 bullets + "Acepto y continuar" + full-terms link + success moment. ⚠️ MUST still write the click-wrap acceptance record server-side (recordLegalAcceptance / VENDOR_TERMS_VERSION) — the UI is friendlier but the LEGAL record is unchanged. Backend-light + review.
- **S5 — "You're online" dashboard.** Status card + daily pulse + big quick-action cards; Scout on-demand only.
- **Design + review pass** at the end (taste skills + [[use-design-skills]] + a11y).

## Guardrails (do NOT violate)
- No DB schema changes — reuse existing vendor_profiles fields.
- No AI injected into the flow (Scout on-demand only) — consistent with Cesar removing the listing AI panel + web-Claude's manual-forms "phase 1" brief.
- EN/ES parity, never mixed mid-screen.
- Legal acceptance record preserved exactly (S4).
- Reuse existing autosave; don't fork a second save mechanism.
- Fees/money/quote logic untouched — this is profile/onboarding UI only.
- Every animation reduced-motion safe; functional not decorative.

## Senior-level design rubric (from the 2nd video Cesar shared — the build + the design-review pass are GRADED against these, measurably)
- **Copy:** clear, short, say more with less; no repeated/redundant words; every label matches the action it triggers. Reduce cognitive load — don't repeat a word the heading already says.
- **Visuals:** simplicity over flashiness; if a fancy effect can't be pulled off cleanly, use the simple version. Emphasis ONLY on what matters. Reuse visual patterns to connect related parts of the UI (e.g. one accent motif ties "in review" status → the thing it refers to).
- **Color — 60/30/10:** ~60% neutral (white/light gray), ~30% ink/complement, ~10% brand violet. Use tints/shades of ONE color, not a rainbow. Reserve the violet accent for the one thing that should draw the eye per screen (usually the CTA).
- **Type:** ≤ 4 font sizes, ≤ 2 weights across the flow. Consider tabular/mono for big numbers (dashboard metrics).
- **Spacing — 8-point grid:** every spacing/size value divisible by 8 or 4 (24 not 25, 12 not 11). Deliberate, consistent; group related elements; align everything.
- **The "movie" test (the hidden senior mistake):** don't design isolated static cards — design the FLOW as one connected experience. The slide transitions, the progress dots filling, the "Saved ✓" flash, and a consistent accent motif are what turn 8 screens into one journey. This is the whole point of the card flow.
- **Data hierarchy (4th video):** make the VALUE prominent and the label secondary — on the dashboard's daily pulse, the number reads big/bold and its caption small/muted ("**0** cotizaciones hoy", not big "Cotizaciones" over a tiny 0). Use size+weight+color+an icon to guide the eye to what matters; never present every field with equal weight (kills the hierarchy).
- **Shadows (4th video):** soft, not harsh — gentle depth. And TINT the shadow toward the surface/background hue (a violet-tinted shadow on violet/light surfaces), never pure gray/black on a colored background. One subtle elevation cue per card, not a heavy drop shadow.
- **Test + iterate:** ship a slice, watch it on a real phone, refine — don't assume the first cut is final (this is why we build S1 and show Cesar before S2–S5).
- Cross-check: these align with the installed taste skills ([[use-design-skills]]) — the design-review agent runs the flow against BOTH this rubric and the skills' anti-generic checks before merge.

## Mobile bottom-nav standards (from the 3rd video — applies to S5 dashboard + the vendor app's mobile shell)
- Bottom nav = the app's top-level structure + prime real estate. Only the most-used destinations. **3–5 tabs (6 absolute max)** — avoid choice paralysis.
- Proposed vendor tabs: **Home (dashboard) · Leads · [＋ New listing = center CTA] · Messages · Storefront/Profile.** Center create-CTA is prominent + thumb-reachable. Keep Help/Logout/Legal OUT of the bar (they go in Profile).
- Don't put top-nav things (back button, logo) in the bottom bar — Jakob's law, match patterns users know.
- **Labels ON under icons** — our vendors are industrial shop owners, phone-first, often less app-fluent (KB #2/#97); labels build confidence. Icons ~24px, labels 10–12px.
- **Respect the safe area / home indicator** — never overlap it; sit the bar above it (mistaps + "broken" feel otherwise). Tap targets ≥ 44×44.
- **Active vs inactive = at least TWO visual changes** (filled-icon + violet color, or color + bolder label) — never text-only. Inactive = reduced opacity, not a clashing color; contrast ≥ 3:1.
- One icon style (outline), fill only for the active tab; consistent icon complexity. Stick to brand palette; nav stays neutral (white/gray/ink) so the violet accent marks the active tab + key actions — don't color each tab differently.
- Notification badges: small, top-right of icon, subtle outline, readable count, ONLY for essential things (new lead / new message) — avoid badge fatigue.
- Separate nav from content with ONE subtle cue: 1px top border OR a light-gray bar bg OR a soft top shadow (elevated). Keep it subtle.
- Micro-interactions: tap feedback (color/scale), sliding indicator on tab switch, soft fade/slide screen transitions — functional, reduced-motion safe.
- Note: today the vendor portal uses a SIDE nav (VendorNav). This bottom-nav is the MOBILE shell; desktop keeps a suitable layout. Folded into S5 (+ a small mobile-shell task).

## 2026-07-29 EXPANSION — dashboards, hierarchy, and the agreement-as-milestone (Cesar spec)

### Profile page visual hierarchy (video tips 1–2)
- De-emphasize labels (gray ~13px), make VALUES big/bold/ink (company name large, not the "Nombre de la empresa" label). Instantly shows filled vs missing.
- **Profile completion = the HERO.** Replace the small % ring with a large calm card at the very top: "Completa tu perfil para empezar a recibir cotizaciones" + a simple progress BAR (not %ring) + the first incomplete step highlighted violet with a "Continuar" button. Collapse company-info / capabilities / trust by default. One task at a time (Uber).
- Checklist items large: green check on done, violet circle on the suggested next step; step title bold, "Desbloquea: …" subtext small/light-gray.
- **Purple used for ONE actionable thing per screen** (the primary CTA / next-step) — not everywhere.

### Premium shadow token (video tip 3) — apply globally
- White cards: `box-shadow: 0 4px 12px rgba(124,58,237,0.08)` (soft, violet-tinted — cohesive on our violet brand). Dark header: none/subtle. Buttons: gentle lift on hover, 150ms ease-out. Add as a design-system token so every card (profile, quote-compare, onboarding, dashboards) shares it.

### Trust via real photos (video tip 4)
- Profile media placeholders show a GOOD-example + note: "Fotos reales de tu almacén o equipo — los compradores confían más cuando ven tu operación real." Listing gallery: zoom + full-screen, consistent white backgrounds. Storefront case-studies prominent (thumbnail + quote + result). Landing "Featured suppliers" carousel later = vendor-uploaded photos, never stock.

### Three dashboards (signals pattern — hero insight + next step)
- **Buyer "sourcing pulse":** hero card ("2 quotes waiting · best offer $11,800 · 1 request matched with 5 suppliers"), request PIPELINE as a horizontal stepper of cards (status icon + #quotes + "Comparar cotizaciones"), finished requests collapse, gentle 3-day "unreviewed quotes" nudge. Saved products/messages move to tabs; home = the pulse.
- **Vendor "deal flow":** compact horizontal funnel (Nuevas → Cotizaciones enviadas → Negociando → Cerradas), 3 big at-a-glance numbers (big value / small label), action-first card ("2 cotizaciones por responder — vence mañana · Responder"), motivating empty-state (illustration + "completa tu caso de éxito mientras te revisamos"), and an owned metric **"Índice de Respuesta NXT"** (response time + quote completeness + on-time).
- **Admin:** ONE hero insight line ("32 proveedores activos · 52 compradores · $480k en oportunidades este mes"), map as a light heatmap (violet pulse = new vendor, blue = new RFQ, darker = high-supply/low-demand), industry doughnut with hover insight card, 5-second-scannable activity feed. Drill-down behind a single link, not ten metrics on the home view.
- All dashboards: soft violet shadow, big-number/small-label hierarchy, mobile-first swipeable ("story"-like) daily check. Leave an EMPTY slot for a future AI "smart summary" — do NOT build it (no-AI rule).

### The vendor agreement = a milestone, not a hurdle (paywall psychology)
- **Move acceptance to the END of onboarding** — after the vendor has built a first listing draft + seen their storefront preview (value felt first). Framed as the final unlock: "Tu tienda está casi lista."
- **3-card flow:** (1) value recap (benefits, visual), (2) transparent TERMS TABLE (scannable, not a wall) + a short pilot-vendor testimonial, (3) one-click "Activar mi tienda" + subtitle + discreet full-terms link.
- Polish: soft shadows, slide transitions, optional mobile haptic on accept. Build the flow A/B-test-ready (video vs bullets vs table; interstitial vs bottom-sheet; button-label variants).

## ✅ CESAR'S RULINGS ON THE 3 FLAGS (2026-07-29 — these are FINAL, build to these)
1. **Fee wording = "first deal 50% off"** (NOT the stale $1,250 credit). The agreement's risk-reduction framing uses the 50%-off, consistent with the 7/27 live model. Marketing drafts final copy → Cesar approves.
2. **Agreement copy — "cancel anytime" is BANNED.** Cesar's exact approved wording:
   - Main line: EN "No subscription or monthly commitment. You only pay when a qualifying deal is completed." · ES (pending his ES ok) "Sin suscripción ni compromiso mensual. Solo pagas cuando se completa un trato que califica."
   - Smaller link beneath: EN "Introduced-customer and protected-period terms may continue as described in the Vendor Agreement." · ES "Los términos de cliente presentado y del período de protección pueden continuar según se describe en el Acuerdo de Proveedor."
   - The 3-card flow STILL records the click-wrap legally (VENDOR_TERMS_VERSION + recordLegalAcceptance) — unchanged.
3. **Analytics DEFERRED to Phase 2 (confirmed).** Cesar: "simplify, launch, learn from the first 10–25 vendors. Heavy analytics without real transaction volume = dashboards full of meaningless zeros." Phase-1 goal = vendors onboarded → published → receiving requests → submitting quotes → first real deal.

### ✅ PHASE-1 DASHBOARD SCOPE (Cesar, final — build ONLY this)
- A clear **"You're live"** completion moment.
- **One main next step** (e.g. "Create your first listing").
- **Four simple numbers:** Active listings · New requests · Quotes submitted · Completed deals. (Big value / small label; violet-tinted soft shadow.)
- **Useful empty states** that explain exactly what to do next (motivating, not sad).
- Premium visual design, no unnecessary complexity.
- DEFERRED to Phase 2 (do NOT build now): live heatmap, deal-flow funnel, "Índice de Respuesta NXT" owned metric, A/B-test infrastructure, hover-insight doughnut, story-swipe feed.

## ⚠️ (RESOLVED — kept for history) Original coordinator flags
1. **🔴 The "$1,250 founding credit / first 3 closed quotes practically no commission" copy is STALE/WRONG.** That's the OLD deprecated credit model. Your live, ruled model (7/27) = **"first deal 50% off"** — the $250/$1,250 credits were REMOVED. Shipping "$1,250 credit" in the agreement = the exact same false-terms error the audit flagged in the stale emails. The agreement's risk-reduction framing must use "tu primer trato con 50% de descuento," NOT credits. (Marketing writes final copy → Cesar approves.)
2. **🟡 "Sin compromiso — puedes darte de baja cuando quieras" is a LEGAL claim, not just a button subtitle.** It must be TRUE and consistent with the actual Vendor Agreement — specifically the commission-through-platform + protected-period clauses (a vendor can leave, but deals introduced on-platform may still owe commission through the protected window). Don't add that subtitle until the wording is reconciled with the real terms. Attorney question. And the friendlier 3-card UI must STILL record the click-wrap legally (VENDOR_TERMS_VERSION + recordLegalAcceptance) — UI polish can't weaken the legal record.
3. **🟡 The fancy analytics partially CONFLICT with the locked "lean phase-1, NO analytics dashboards" scope** (web-Claude's FINAL brief §4 removed analytics dashboards; KB too). The live heatmap, deal-flow funnels, the "Índice de Respuesta NXT" computed metric, and A/B-test infrastructure are real NEW engineering — phase-2, not launch. RECOMMEND: build the LIGHTWEIGHT version now (calm hero card + next-step nudge + big-number/small-label + the empty-state motivation), DEFER heatmap/funnel/owned-metric/A-B to a later phase once the core loop has real volume to visualize. Confirm you're OK deferring the heavy parts.

## Sequencing (coordinator recommendation)
The two LAUNCH-GATING safety fixes are running now (quote-send core-loop + security hardening). A gorgeous onboarding that can't send a quote helps no one → let those land + Cesar pushes them first. THEN build S1, show Cesar the feel on his phone, iterate, then S2–S5. This is the next big project after the fixes.

## 2026-07-29 — Onboarding-research video takeaways (Cesar paste; apply in S2–S5)
- Long flows are FINE if delightful (Duolingo 60 screens; split-up signup RAISED conversions 15% at Haus) → validates the 12-card flow; don't shorten for its own sake.
- Sell the OUTCOME not features → S2 copy shows what the vendor GETS ("buyers ready to purchase"), and the storefront PREVIEW card (also in team-accounts doc) makes the outcome tangible mid-flow.
- Design toward the AHA moment: vendor = first lead/quote received; buyer = comparing real quotes. Everything funnels there.
- Checklists beat popups (Mural +10% retention) → our profile-strength meter already IS this; keep, no tours.
- Teach in context / empty states — already site pattern, keep.
- Multi-select intent questions beat single-pick (Headspace +10%) → industries/clients cards already multi-select ✓.
- FOUNDER'S NOTE idea (One Year / Basecamp / Airbnb CEO video): a short personal note from Cesar at the "You're online" moment — cheap, human, perfectly on-brand for the concierge model. OFFERED to Cesar (his words/photo, his approval).
- Pre-permission screens (custom screen BEFORE the browser notification prompt) → note for R5 notifications.
