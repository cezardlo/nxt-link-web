# NXT//LINK — Vendor Acquisition Plan: Invites, Sequences & Growth
**Owner:** Marketing & Growth + Social & Content (one plan, two hats)
**Date:** 2026-07-20 · **Status:** Ready for Cesar's review · No app code changes in this doc.
**Companion:** the onboarding funnel plan (operator enters name + company + email/phone → magic-link invite → account in under a minute → profile later).

---

## 0. Ground rules (from the vault — non-negotiable)

- **No dark patterns.** No fake scarcity, no countdown pressure, no fabricated demand. Static dates only. (vault/Project.md)
- **Bilingual everywhere.** Every message ships EN + ES on day one. Spanish is not a translation afterthought — many invitees are Spanish-first.
- **Honor existing copy patterns:** "Free to send · no commitment" and transparent Today/Next/Then timelines.
- **The money facts we may state** (vault/Fees.md): commission is vendor-side, **5% on the first $50k, 3% above, capped at $20,000**, charged only on closed deals. Quotes are free. Buyers pay no platform fee.
- **⚠️ ESCROW COPY GATE:** Escrow (Stripe Connect) is *decided but not built* (vault/Payments.md). Until Payments P1 is live, **no message may say "your money is protected in escrow."** Every escrow-promise touchpoint below has a **Variant A (escrow live)** and **Variant B (pre-escrow)**. Ship B until engineering flips the switch. What we CAN honestly say pre-escrow: *commission only at deal close; full refund = zero fee; the fee rules are published.*
- **Only real personalization.** `{buyer_request}` must be an actual open RFQ on the platform that genuinely matches the vendor's category. If none exists, use the no-match variant — never invent demand.

---

## 1. The invite conversion journey — what makes a skeptical vendor click

### Who we're talking to
A small/mid industrial business owner or ops manager in El Paso or Juárez. Phone-first, busy, has been burned by "platforms" that charged monthly fees and delivered nothing. Reads texts within minutes, reads email when the subject earns it. Trusts *people* (a name, a phone number, a face at the chamber) far more than brands.

### The spine of the journey: ONE promise per touchpoint
Skeptical readers can absorb exactly one claim per message. Stacking three benefits reads like marketing; one concrete claim reads like a person.

| Touchpoint | The ONE promise | Why this one, here |
|---|---|---|
| Operator phone/WhatsApp call (Day 0, before any email) | "I have a real buyer request that matches you" | Warmth + specificity. The email that follows is *expected*, not cold. This call is the single biggest conversion lever in the whole plan. |
| Email 1 (Day 0) | **Real buyer demand** — a named, real request | Demand is the only reason a busy vendor acts today. |
| SMS 1 (Day 1) | "I sent you the invite — the buyer request is real" | Surfaces the email from a crowded inbox. |
| Email 2 (Day 2) | **Quoting is free, no commitment** | Answers the first silent objection: "what does this cost me?" |
| Email 3 (Day 5) | **Your money is protected** (A: escrow / B: fee rules in writing, zero fee on refunds) | Answers the second silent objection: "will I actually get paid / get tricked?" |
| Final email (Day 9) | **The door stays open, and we'll stop emailing** | Respect converts fence-sitters and protects the brand for round two. |
| Post-signup nudges | One next step at a time (profile → listing → first RFQ) | Momentum, not a checklist dump. |

### What kills trust (never do these)
1. **Fake urgency** — countdowns, "only 3 spots left," manufactured deadlines. (Real quote deadlines on real RFQs are fine — with the actual date.)
2. **Invented demand** — "buyers are waiting for you!" with no real request behind it.
3. **noreply@ senders.** Every message comes from a human name with a phone number that answers.
4. **Hiding the fee.** State 5%/3%/$20k-cap plainly and early. Skeptics respect a published price; they flee a vague one.
5. **English-only anything** — instantly signals "this isn't for Juárez."
6. **Asking for a credit card, tax documents, or long forms at invite time.** The promise is "under a minute" — the landing page must keep it.
7. **Over-messaging.** Hard cap: 4 emails + 2 SMS in the invite phase, then silence. Stop rules below.
8. **Promising escrow before it exists** (see gate above), or any capability we don't have yet.

---

## 2. The complete message sequences (ready to use)

**Merge fields:** `{name}` first name · `{company}` · `{buyer_request}` short real RFQ title (e.g. "forklift maintenance, 12 units, East El Paso") · `{category}` vendor's trade · `{city}` El Paso / Juárez · `{invite_link}` magic link · `{operator_name}` · `{operator_phone}` · `{deadline_date}` real quote deadline with day name (e.g. "Fri, Jul 24").

**Sending identity:** From "{operator_name} — NXT//LINK" `<firstname@nxtlink.___>`. Reply-to is the operator. Plain-ish text email (light logo header at most). ES copy uses **usted** — first-contact B2B in the Borderplex is formal.

**Timing map:** Day 0 call → Day 0 Email 1 → Day 1 SMS 1 → Day 2 Email 2 → Day 5 Email 3 → Day 6 SMS 2 (optional) → Day 9 Final email. Send window 8am–6pm local, Tue–Thu preferred for Day 0.

**STOP RULES (hard):**
- Stop everything instantly on: account created · any reply (human takes over) · unsubscribe/STOP · hard bounce · operator marks "not now."
- "Later" replies → 90-day snooze, then ONE re-invite, only with a fresh real buyer request.
- Sequence ends permanently after the final email. No "just circling back" forever-drips.

---

### 2.1 Email 1 — the invite (Day 0) · Promise: real buyer demand

**EN — Subject (with real match):** `A buyer needs {category} in {city} — thought of {company}`
**EN — Subject (no match):** `{operator_name} invited {company} to NXT//LINK`

> Hi {name},
>
> I'm {operator_name} with NXT//LINK — the El Paso–Juárez marketplace where industrial buyers post what they need and local vendors quote it.
>
> A buyer just posted this request: **"{buyer_request}"** (quotes due {deadline_date}). It matches what {company} does, so I'm sending you a direct invite.
>
> Sending a quote is **free · no commitment**. You only ever pay a commission when a deal actually closes — the rates are published on the site.
>
> Your account takes under a minute — no credit card, no paperwork:
>
> **[Create my free account]** → {invite_link}
>
> Questions? Reply here or call/text me: {operator_phone}. Hablamos español.
>
> {operator_name}
> NXT//LINK · El Paso–Juárez Borderplex

*(No-match variant: replace paragraph 2 with: "We're inviting a small group of {category} companies in {city} that buyers on the platform ask for. When a matching request comes in, you'll see it first.")*

**ES — Asunto (con solicitud real):** `Un comprador busca {category} en {city} — pensamos en {company}`
**ES — Asunto (sin solicitud):** `{operator_name} invitó a {company} a NXT//LINK`

> Hola {name}:
>
> Soy {operator_name}, de NXT//LINK — el marketplace de El Paso y Juárez donde compradores industriales publican lo que necesitan y proveedores locales cotizan.
>
> Un comprador acaba de publicar esta solicitud: **"{buyer_request}"** (cotizaciones hasta el {deadline_date}). Coincide con lo que hace {company}, así que le envío una invitación directa.
>
> Enviar una cotización es **gratis · sin compromiso**. Solo se paga una comisión cuando un trato se cierra de verdad — las tarifas están publicadas en el sitio.
>
> Su cuenta toma menos de un minuto — sin tarjeta, sin papeleo:
>
> **[Crear mi cuenta gratis]** → {invite_link}
>
> ¿Dudas? Responda este correo o llámeme / mándeme mensaje: {operator_phone}.
>
> {operator_name}
> NXT//LINK · Región fronteriza El Paso–Juárez

---

### 2.2 SMS 1 (Day 1) — surfaces the email · 160-char aware, opt-out included

> **EN:** {name}, it's {operator_name} w/ NXT//LINK. A {city} buyer needs {category} — I emailed {company} an invite. Quotes are free. Reply STOP to opt out
> *(~140 chars with typical values — enforce ≤160 at send time; if over, drop "w/ NXT//LINK".)*

> **ES:** {name}, soy {operator_name} de NXT//LINK. Un comprador en {city} busca {category}. Le mande la invitacion por correo. Cotizar es gratis. Responde STOP para salir
> *(~150 chars. **ES SMS rule:** write without accents on a/i/o/u (standard MX practice) — accented á/í/ó/ú force UCS-2 encoding and cut the limit to 70 chars. ¿ ¡ é ñ ü are safe in GSM-7.)*

WhatsApp variant = same text, accents restored, no STOP line needed (WhatsApp has native block), and may include the link directly.

---

### 2.3 Email 2 — reminder (Day 2) · Promise: quoting is free

**EN — Subject:** `Quoting is free on NXT//LINK — no commitment`

> Hi {name},
>
> Quick follow-up on the invite I sent {company}. The request — **"{buyer_request}"** — is still open (quotes due {deadline_date}).
>
> What it costs to look, to sign up, and to send quotes: **nothing**. Free to send · no commitment. A commission applies only if you close a deal, and the rates are published — no surprises.
>
> **[See the request — free]** → {invite_link}
>
> If it's not a fit, reply "not for us" and I won't bother you again.
>
> {operator_name} · {operator_phone}

**ES — Asunto:** `Cotizar en NXT//LINK es gratis — sin compromiso`

> Hola {name}:
>
> Le doy seguimiento a la invitación que le envié a {company}. La solicitud — **"{buyer_request}"** — sigue abierta (cotizaciones hasta el {deadline_date}).
>
> Lo que cuesta ver la solicitud, registrarse y cotizar: **nada**. Gratis · sin compromiso. La comisión aplica solo si cierra un trato, y las tarifas están publicadas — sin sorpresas.
>
> **[Ver la solicitud — gratis]** → {invite_link}
>
> Si no es para ustedes, responda "no nos interesa" y no le vuelvo a escribir.
>
> {operator_name} · {operator_phone}

---

### 2.4 Email 3 — reminder (Day 5) · Promise: your money is protected

**VARIANT A — use ONLY once escrow (Payments P1) is live.**

**EN — Subject:** `How you get paid on NXT//LINK: escrow, in writing`

> Hi {name},
>
> The #1 question vendors ask me: *"Do I actually get paid?"* Fair question. Here's how it works:
>
> - The buyer pays **into escrow before you start**. You see "funded" before you lift a finger.
> - You ship or deliver → short inspection window → funds release to you.
> - Commission (5% / 3%, capped) comes out **only at release**. Full refund = **zero fee**.
>
> Free to send quotes · no commitment. Account in under a minute:
>
> **[Create my free account]** → {invite_link}
>
> {operator_name} · {operator_phone}

**ES — Asunto:** `Así se le paga en NXT//LINK: fondos en garantía, por escrito`

> Hola {name}:
>
> La pregunta #1 de los proveedores: *"¿De verdad me pagan?"* Pregunta justa. Así funciona:
>
> - El comprador deposita **en garantía antes de que usted empiece**. Usted ve "fondeado" antes de mover un dedo.
> - Usted entrega → breve periodo de inspección → los fondos se liberan a su cuenta.
> - La comisión (5% / 3%, con tope) se cobra **solo al liberar el pago**. Reembolso total = **cero comisión**.
>
> Cotizar es gratis · sin compromiso. Cuenta en menos de un minuto:
>
> **[Crear mi cuenta gratis]** → {invite_link}
>
> {operator_name} · {operator_phone}

**VARIANT B — pre-escrow (ship this today).**

**EN — Subject:** `Our fee rules, in writing — no monthly fee, no surprises`

> Hi {name},
>
> Before you decide, here's exactly how the money works — in writing:
>
> - **No monthly fee. No fee to quote.** Free to send · no commitment.
> - Commission only when a deal closes: **5%** on the first $50k, **3%** above that, **capped at $20,000**.
> - Deal refunded in full? **You owe nothing.**
>
> That's the whole model. We make money only when {company} does.
>
> **[Create my free account]** → {invite_link}
>
> {operator_name} · {operator_phone}

**ES — Asunto:** `Nuestras tarifas, por escrito — sin mensualidad, sin sorpresas`

> Hola {name}:
>
> Antes de decidir, así funciona el dinero — por escrito:
>
> - **Sin mensualidad. Cotizar no cuesta.** Gratis · sin compromiso.
> - Comisión solo cuando un trato se cierra: **5%** sobre los primeros $50,000 USD, **3%** sobre el resto, **con tope de $20,000**.
> - ¿Trato reembolsado por completo? **Usted no debe nada.**
>
> Ese es todo el modelo. Nosotros ganamos solo cuando {company} gana.
>
> **[Crear mi cuenta gratis]** → {invite_link}
>
> {operator_name} · {operator_phone}

---

### 2.5 SMS 2 (Day 6, optional — send only if Email 1–3 all unopened/unclicked)

> **EN:** {name}, last text from me — {company}'s free NXT//LINK invite is in your email. Questions? Call me: {operator_phone}. Reply STOP to opt out
> *(~135 chars)*

> **ES:** {name}, ultimo mensaje — la invitacion gratis de {company} a NXT//LINK esta en su correo. ¿Dudas? Llameme: {operator_phone}. Responde STOP para salir
> *(~145 chars, accent-free rule applies)*

---

### 2.6 Final email — the honest close (Day 9)

**EN — Subject:** `Last note from me — the door stays open`

> Hi {name},
>
> I'll keep this short: this is my last email about the invite. No hard feelings if the timing's wrong — you know your business.
>
> Three things that stay true:
>
> - Your invite stays open. **[Create my free account]** → {invite_link}
> - If you'd rather I check back in a few months, just reply **"later."**
> - If you never want to hear from us, reply **"stop"** and that's that.
>
> Whatever you choose — good luck out there, and thanks for reading.
>
> {operator_name} · {operator_phone} · NXT//LINK

**ES — Asunto:** `Último mensaje de mi parte — la puerta queda abierta`

> Hola {name}:
>
> Seré breve: este es mi último correo sobre la invitación. Sin problema si no es el momento — usted conoce su negocio.
>
> Tres cosas que siguen en pie:
>
> - Su invitación queda abierta. **[Crear mi cuenta gratis]** → {invite_link}
> - Si prefiere que le escriba en unos meses, responda **"después"**.
> - Si prefiere que no le escribamos más, responda **"no"** y así será.
>
> Decida lo que decida — mucho éxito, y gracias por leer.
>
> {operator_name} · {operator_phone} · NXT//LINK

*(Engineering note: the magic link in this email must be long-lived or auto-regenerate on click — a dead link under "your invite stays open" breaks the promise.)*

---

### 2.7 Post-signup nudges

**N1 — Complete your profile** (24h after signup, only if profile incomplete; email)

**EN — Subject:** `{company} is 5 minutes from being quote-ready`
> Hi {name} — your account is live. One step left: your profile ({X}% done — add {missing items, e.g. "a logo and 2 services"}).
> Buyers compare vendors side by side; a complete profile is what wins the quote.
> **[Finish my profile — 5 min]** → {link}
> Today: finish profile · Next: publish a listing · Then: quote your first request.
> {operator_name} · {operator_phone}

**ES — Asunto:** `A {company} le faltan 5 minutos para poder cotizar`
> Hola {name} — su cuenta ya está activa. Falta un paso: su perfil (va al {X}% — agregue {faltantes, ej. "logo y 2 servicios"}).
> Los compradores comparan proveedores lado a lado; un perfil completo es lo que gana la cotización.
> **[Completar mi perfil — 5 min]** → {link}
> Hoy: completar perfil · Luego: publicar un servicio · Después: cotizar su primera solicitud.
> {operator_name} · {operator_phone}

**N2 — Publish your first listing** (Day 3 after signup, if zero listings; email)

**EN — Subject:** `Put {company}'s first service in front of Borderplex buyers`
> Hi {name} — profiles get found, but **listings get quoted**. Post one service or product ({category} is a good start) and buyers searching the Borderplex can find {company} today.
> It takes about 3 minutes: title, short description, starting price ("From $X · final in quote" is fine).
> **[Publish my first listing]** → {link}
> {operator_name} · {operator_phone}

**ES — Asunto:** `Ponga el primer servicio de {company} frente a compradores de la frontera`
> Hola {name} — los perfiles se encuentran, pero **las publicaciones se cotizan**. Publique un servicio o producto ({category} es buen inicio) y los compradores de la región podrán encontrar a {company} hoy mismo.
> Toma unos 3 minutos: título, descripción corta, precio inicial ("Desde $X · precio final en cotización" está bien).
> **[Publicar mi primer servicio]** → {link}
> {operator_name} · {operator_phone}

**N3 — First RFQ received** (event-triggered, immediate; email + SMS — this one is time-sensitive and genuinely urgent, so both channels)

**EN — Email subject:** `New buyer request for {company}: {buyer_request}`
> {name} — a buyer just posted a request that matches {company}:
> **"{buyer_request}"** · Quotes due {deadline_date}.
> Free to send · no commitment. Vendors who quote within 24h are most likely to be shortlisted.
> **[Review & quote — free]** → {link}
> {operator_name} · {operator_phone}

*(The 24h line may only be used once we have real data showing it; until then delete it — no invented stats.)*

**ES — Asunto:** `Nueva solicitud para {company}: {buyer_request}`
> {name} — un comprador acaba de publicar una solicitud que coincide con {company}:
> **"{buyer_request}"** · Cotizaciones hasta el {deadline_date}.
> Gratis · sin compromiso.
> **[Ver y cotizar — gratis]** → {link}
> {operator_name} · {operator_phone}

**EN — SMS:** `NXT//LINK: new buyer request for {company} — {buyer_request_short}. Quote free by {deadline_date}: {short_link} Reply STOP to opt out`
**ES — SMS:** `NXT//LINK: nueva solicitud para {company} — {buyer_request_short}. Cotice gratis antes del {deadline_date}: {short_link} Responde STOP para salir`
*(Keep {buyer_request_short} ≤40 chars; system truncates with "…" if longer.)*

---

## 3. Invite landing page (the "quick account" page)

Magic link lands here. Name + company prefilled and shown, one button, nothing else asked. Design to Design System v1.0.

**EN**
- **Headline:** `{name}, buyers in the Borderplex post what they need. {company} can quote it — free.`
  *(Fallback if no personalization: "Borderplex buyers post what they need. Quote it — free.")*
- **Trust bullets:**
  1. **Free to send · no commitment.** No monthly fee. No credit card. Quoting never costs a thing.
  2. **You pay only when a deal closes.** 5% on the first $50k, 3% above, capped at $20,000 — published, no surprises. *(Once escrow is live, swap to: "Buyer's payment is held in escrow before you start — commission only at release.")*
  3. **Real requests, real people.** Every buyer request is reviewed by our team. Bilingual support — call or text {operator_phone}.
- **Button:** `Create my free account`
- **Under button:** `Under a minute · No credit card` · then the honest timeline: `Today: your account · Next: complete your profile · Then: quote your first request`

**ES**
- **Titular:** `{name}, los compradores de la frontera publican lo que necesitan. {company} puede cotizarlo — gratis.`
  *(Sin personalización: "Los compradores de la frontera publican lo que necesitan. Cotícelo — gratis.")*
- **Puntos de confianza:**
  1. **Gratis · sin compromiso.** Sin mensualidad. Sin tarjeta. Cotizar nunca cuesta.
  2. **Paga solo cuando un trato se cierra.** 5% sobre los primeros $50,000 USD, 3% sobre el resto, con tope de $20,000 — publicado, sin sorpresas. *(Con escrow activo: "El pago del comprador queda en garantía antes de empezar — comisión solo al liberar.")*
  3. **Solicitudes reales, gente real.** Cada solicitud de compra la revisa nuestro equipo. Soporte bilingüe — llame o escriba al {operator_phone}.
- **Botón:** `Crear mi cuenta gratis`
- **Bajo el botón:** `Menos de un minuto · Sin tarjeta` · `Hoy: su cuenta · Luego: completar su perfil · Después: cotizar su primera solicitud`

---

## 4. Growth beyond invites (prioritized)

| # | Play | What it is | Effort | Impact | When |
|---|---|---|---|---|---|
| 1 | **Operator-led warm invites** (this plan) | Call/WhatsApp first, then the sequence. Small batches (10–25), tuned weekly. | Low | **High** — this is the engine | Now |
| 2 | **Borderplex institutions** | El Paso Chamber, El Paso Hispanic Chamber, Borderplex Alliance, **INDEX Juárez** (maquiladora association — its supplier members ARE our vendor list), CANACINTRA Juárez, industrial park managers (Santa Teresa, east-side EP, Juárez corridors). Ask for: a member-newsletter mention, a 10-minute slot at a member breakfast, an intro list of 10 supplier members. Offer: free bilingual storefronts for members + a real buyer-demand readout for their sector. One institution at a time; start where Cesar already knows someone. | Medium | High but slow (weeks to first list) | Start now, expect results in 4–8 weeks |
| 3 | **Referral loop — "invite a vendor you trust"** | Trigger at moments of earned goodwill: after first quote sent and after first deal closes. In-product card + email: "Who else should be quoting these requests? Invite a vendor you trust — they get the same free account." Referred invites inherit the referrer's name in Email 1 ("{referrer} at {referrer_co} thought of you") — warm by construction. Possible sweetener: extend the $1,250 first-deal credit to referrals — **needs Finance/Cesar sign-off before it appears in any copy.** No fake "give $50 get $50" gimmicks. | Low–Med | Med–High, compounds | After first ~20 active vendors |
| 4 | **Programmatic SEO: "{service} El Paso / Juárez" pages** | Auto-generated bilingual category × city pages ("Forklift repair El Paso", "Mantenimiento industrial Juárez") listing real vendors + a "Request quotes — free" CTA. **Quality gate: publish a page only when it has ≥3 real vendors or ≥1 real open request** — thin pages hurt rankings and trust. EN pages target El Paso searches, ES pages target Juárez. Engineering dependency (template + sitemap). | Medium | Medium now, compounds for 12+ months | After ~30 vendors across ~10 categories |
| 5 | **Local presence content** | Short bilingual posts (LinkedIn + WhatsApp-shareable images): "This week on NXT//LINK: 4 new buyer requests in logistics" — real numbers only. Doubles as chamber-meeting collateral. | Low | Low–Med, supports 1–3 | Ongoing, 1–2/week max |

---

## 5. Measurement — the 4 numbers Cesar watches

One row per weekly invite batch. Four numbers, in order; each is a % of the previous stage.

| # | Number | Definition | Healthy target | Worry line |
|---|---|---|---|---|
| 1 | **Delivered** | invites that reached the inbox / phone | **≥ 95%** (operator-typed contacts should be near-perfect) | < 90% → fix data entry / sender domain |
| 2 | **Clicked** | clicked the magic link ÷ delivered | **25–40%** for warm (called-first) invites; ≥15% floor if the call didn't happen | < 15% → subject/promise problem, or invites aren't actually warm |
| 3 | **Account created** | finished the quick account ÷ clicked | **≥ 60%** (the page asks for almost nothing) | < 40% → landing page friction — something on that page scares or stalls |
| 4 | **Listed** | published first listing OR sent first quote within 14 days ÷ accounts | **≥ 40%** with nudges N1–N3 | < 25% → onboarding/nudge problem, or no matching demand to quote |

**End-to-end:** ~10–15% of delivered invites become *listed* vendors per batch is a good first-quarter result; the operator's phone follow-up on "clicked but stalled" vendors is the cheapest recovery play.

**Why these targets are honest:** cold B2B email averages only ~3–6% replies and ~3–4% clicks, and small targeted batches (≤50) do ~2–3× better than blasts ([Built for B2B](https://www.builtforb2b.com/blog/b2b-cold-email-benchmark-2025), [Belkins](https://belkins.io/blog/cold-email-response-rates), [Instantly](https://instantly.ai/blog/cold-email-reply-rate-benchmarks/)). Our invites are *warm* (called first, operator-named, real demand attached), so we hold ourselves to ~10× cold-click benchmarks. SMS runs ~90%+ opens and ~19–36% CTR with opt-outs under ~1.5% when done sparingly ([Sakari](https://sakari.io/blog/sms-marketing-benchmarks-2025-performance-metrics-and-industry-insights), [Omnisend](https://www.omnisend.com/blog/sms-marketing-statistics/)) — which is why SMS is our surfacing channel, capped at 2 sends.

**Also track (not headline):** opt-out rate per batch (keep < 2%), reply rate (replies are gold — every reply gets a human answer same day), and time-to-first-quote.

---

## 6. Compliance & mechanics checklist

- **SMS consent:** operator confirms on the Day-0 call that texting the number is OK, and logs it. Every marketing SMS carries STOP (EN) / "Responde STOP" (ES). Honor STOP across both languages and both channels. US numbers → TCPA applies; MX numbers → prefer WhatsApp (normal business practice there, better than SMS anyway).
- **Email:** real physical address in footer, one-click unsubscribe on every send, warm up the sending domain before batch 1; keep batches ≤50/week initially.
- **ES SMS:** accent-free on a/i/o/u to stay GSM-7 (160 chars); é ñ ü ¿ ¡ are safe.
- **Suppression:** signup, reply, STOP, bounce, and operator "not now" all halt the sequence automatically — this must be enforced by the system, not by memory.
- **Copy gates:** escrow claims gated on Payments P1 live; "$1,250 first-deal credit" and "quote within 24h" stats gated on sign-off/real data as noted inline.

---

## 7. Dependencies & open items

**On Engineering (backend/fullstack):**
1. Magic-link invite infra: long-lived or self-regenerating links; prefilled quick-account page; per-stage event tracking (delivered/clicked/account/listed) so the Section-5 funnel is measurable from day one.
2. Transactional email + SMS/WhatsApp provider wiring (e.g. Resend + Twilio) with suppression rules from Section 6, and the `{buyer_request}` merge field pulled from real open RFQs.
3. Post-signup nudge triggers (profile %, zero-listings, RFQ-match event) + the referral "invite a vendor you trust" card.

**On Design/Frontend:** invite landing page + post-signup checklist to Design System v1.0; all strings into the EN/ES i18n system (copy above is final draft, not placeholder).

**On Finance/Legal/Ops:** confirm the $1,250 first-deal credit mechanics before it's marketed; vendor terms pass (fee wording, later escrow/bypass clauses); SMS consent logging process.

**Blocked on Cesar:**
1. Sending identity: the from-domain, operator name(s), and the phone number that actually answers (his cell? a Google Voice?).
2. Approve fee lines in public copy (5%/3%/$20k) and decide on marketing the $1,250 first-deal credit.
3. The first invite list: 10–25 real vendors he can call warmly — and who makes those calls.
4. Stripe/escrow timeline (decides when Email-3 Variant A replaces Variant B).
