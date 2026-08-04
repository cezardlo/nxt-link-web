# KIMI BATCH B REPORT — Spanish tú register, tienda, "needs more info", branded email (2026-08-04)

Branch: `wt/vendor-application-2026-08-04` (already checked out — stayed on it,
never branched, never touched master). Scope executed: items **1, 2, 3, 4** of
`KIMI-BATCH-2026-08-04B-followups.md`. Batch A items 1-7 and 9 were NOT redone.

---

## ⚠️ COORDINATOR — READ FIRST

**1. ONE NEW MIGRATION FILE — WRITTEN, NOT APPLIED. Apply before/with deploy.**
`supabase/migrations/20260804_vendor_applications_needs_info.sql`
- Widens `vendor_applications.status` check constraint to allow `'needs_info'`
  (drops whatever status-related check constraint exists — the name may differ
  if the table was touched in the dashboard — and re-adds the canonical one).
- Adds `vendor_message text` — the vendor-visible send-back note (deliberately
  NOT `admin_notes`; that column may hold internal comments and stays internal).
- Extends `guard_vendor_application_update()` so non-admin / non-service-role
  sessions also get `vendor_message` reverted (same protection `status` and
  `admin_notes` already had).
- Idempotent, additive, nothing renamed or dropped.
- **The new code selects `vendor_message` and writes status `'needs_info'`** —
  if this ships before the migration, `/apply/status`, `/api/apply/my`, and the
  admin applications screen error (same failure mode Batch A flagged).

**2. GATES COULD NOT BE RUN — ALL COMMANDS DENIED BY SESSION PERMISSIONS.**
Exactly like Batch A: `npm run typecheck`, `npm test`, and `npm run build`
were each attempted and each denied ("This command requires approval") in both
the Bash and PowerShell tools. I am NOT claiming they passed. What I did
instead: full manual self-review (G3) of every diff, traced the new types by
hand, and added 4 unit tests to the existing node-runner suite. **Do not treat
the gates as passed until you run them and see the numbers** (expected: typecheck
0 errors; tests 532 Batch A baseline + 4 new = 536; build clean).

**3. Env vars (coordinator's job, per brief):** set
`MAIL_FROM="NXT//LINK <contact@nxtlinktech.com>"` and verify the
`nxtlinktech.com` domain with Resend. Until then the code degrades to Resend's
sandbox sender (`onboarding@resend.dev`) — documented in `src/lib/mail.ts`.

---

## ITEM 1 — Spanish converted to informal "tú" (Cesar's binding ruling)

**In-scope pages converted** — `/apply`, `/apply/login`, `/apply/status`,
the vendor portal review card, and the landing FAQ answer.

The six pre-approved strings were used **verbatim**:
- `/apply/page.tsx` confirmation card: "Un último paso — crea tu cuenta o inicia sesión." · "Tu solicitud ya está guardada. Usa el mismo correo y se vinculará a tu cuenta automáticamente — no perderás nada de lo que escribiste." · "Guardada en tu cuenta. Puedes ver su estado o actualizarla cuando quieras."
- `/apply/status/page.tsx`: "Una persona de nuestro equipo está revisando tu solicitud — aún puedes actualizar cualquier dato abajo." · "Estás aprobado — tu tienda puede salir en vivo. Nuestro equipo te contactará con los siguientes pasos." · "Tu solicitud no fue aprobada esta vez. Puedes actualizarla abajo y nuestro equipo la revisará de nuevo."

Also converted (every remaining usted string on those pages — these are NEW
wording and are on the approval list below): `/apply/status` full dictionary
(Cargando/Inicia sesión/Envía/Selecciona/Describe/agrégala/agrégalo/¿atiendes?/
¿resuelves?…), `/apply/login` notice, the `/apply` confirmation "revisará tu
solicitud y te contactará pronto" line. The `/apply` form itself and the vendor
portal card were already tú — verified, no changes needed there.

## ITEM 2 — "storefront" = **tienda**

Standardized on the in-scope pages (`src/app/page.tsx` landing):
- `vendorBody` (:282): "Crea un escaparate estandarizado…" → "Crea una tienda estandarizada…"
- `vendorPoint4` (:286): "Escaparate bilingüe…" → "Tienda bilingüe…"
- `faq5a` (:303): "publica tu escaparate" → "publica tu tienda"

`/apply/status` and the portal already said "tienda". Remaining "escaparate"
occurrences elsewhere are in the inventory below (not converted, per scope).

## ITEM 3 — "needs more info" status, end to end

- **Migration** (above) — new `needs_info` status value + dedicated
  `vendor_message` column + guard-trigger coverage.
- **Admin API** (`src/app/api/admin/vendor-applications/route.ts`) — new
  `action: 'needs_info'` on the SAME POST route, behind the SAME
  `isAdminRequest` gate as approve/reject (no new privilege path, fails
  closed). Requires a non-empty `message` (trimmed, capped 500 chars via the
  new pure helper `cleanVendorMessage`), writes `status='needs_info'` +
  `vendor_message`, re-reads and honestly reports `status_advanced` (same
  pattern as reject), and emails the vendor through the existing `sendMail`
  path. Copy is on the approval list.
- **Admin UI** (`src/app/admin/vendor-applications/page.tsx`) — "✉ Ask for
  info" button opens an inline note box per card ("Send back & email vendor");
  a violet "Needs info" badge; the note already sent is shown on the card.
- **Vendor side** — `/api/apply/my` GET now returns `vendor_message`;
  `/apply/status` shows a "Needs a bit more info" badge (MessageCircle icon,
  violet — distinct from pending amber, not rejection red), the warm
  explainer line, and the team note in a quoted card. Saving the form
  resubmits: the PATCH route flips the SAME row back to `'pending'` (new pure
  helper `resubmitStatusPatch` — only `needs_info` flips; a vendor can never
  self-approve or un-reject). **No second application is ever created** — the
  PATCH updates by `id` + `auth_id`, and the signed-out resume path in
  `/api/apply/submit` got the same flip. The portal review card gained an
  `app_status_needs_info` line pointing the vendor to their application.
- **Tests** — 4 new tests in `tests/vendor-application-batch.test.ts` pin
  `cleanVendorMessage` (trim/cap/reject-empty) and `resubmitStatusPatch`
  (only needs_info → pending; pending/approved/rejected untouched).
- **Wording** — EN + ES (tú), warm, explicitly "not a rejection". On the
  approval list below.

## ITEM 4 — emails: NXT//LINK-branded, sender from config

Audit result: **no hardcoded sender exists anywhere in app code.**
- `src/lib/mail.ts` (the one transactional path; Resend → Zoho fallback):
  `from: process.env.MAIL_FROM || 'NXT//LINK <onboarding@resend.dev>'` (:38,
  config + documented sandbox degradation). The sandbox retry (:54) hardcodes
  the Resend sandbox sender **intentionally** (domain-unverified fallback so
  owner-inbox delivery works during setup). Zoho fallback sender comes from
  `ZOHO_FROM_ADDRESS` (`src/lib/zoho/client.ts:25`).
- **Fixed this batch:** the Zoho fallback inside `sendMail` previously sent
  the RAW plain-text body (unbranded, and Zoho sends it as `mailFormat:
  'html'` so line breaks would collapse). It now sends the same branded
  `htmlWrap` the Resend path uses — every email we send is NXT//LINK-branded
  on both providers.
- All callers verified to go through `sendMail`/`sendZohoMail` (invites,
  welcome, dispatch, quote/proposal/listing/lead notifications, cron nudges,
  admin notifications, early-access, vendor signup welcome).
- NOT touched (per brief): the Supabase-sent account-verification email that
  says "Supabase" — dashboard template, coordinator's job.

---

## NEW USER-FACING STRINGS — NEEDS CESAR APPROVAL (EN + ES, tú)

**A. Register conversions (new wording, tú — the six verbatim strings Cesar
already approved are NOT repeated here):**
1. EN (existing): "A human on the NXT//LINK team will review your application and follow up shortly."
   ES: "Una persona del equipo de NXT//LINK revisará tu solicitud y te contactará pronto." (`/apply` confirmation)
2. ES `/apply/login` notice: "Tu solicitud está guardada. Crea tu cuenta / Inicia sesión con este mismo correo y se vinculará automáticamente — no perderás nada de lo que escribiste."
3. `/apply/status` dictionary conversions (EN unchanged, existing):
   "Cargando tu solicitud…" · "No se pudo cargar tu solicitud." · "Inicia sesión para ver tu estado" · "Inicia sesión para revisar el estado de tu solicitud y hacer cambios." · "Aún no has aplicado" · "Envía una solicitud rápida para empezar — solo toma un par de minutos." · "Tu solicitud" · "Selecciona una categoría" · "Selecciona un tamaño" · "Describe el tamaño de tu empresa" · "¿Qué ubicaciones atiendes?" · "Selecciona todas las que apliquen" · "Otra ubicación — agrégala" · "Otra — agrega tu propia etapa" · "¿Qué problema resuelves?" · "¿A quién atiendes mejor?" · "Otro tipo de cliente — agrégalo"
4. Landing (tienda standardization): "Crea una tienda estandarizada, publica productos y servicios y administra solicitudes de compradores desde un solo espacio de proveedor." · "Tienda bilingüe en inglés y español" · "…y publica tu tienda. Cuando tu perfil esté completo y verificado…"

**B. needs_info — vendor-facing (NEW):**
5. Badge: EN "Needs a bit more info" / ES "Necesita un poco más de información"
6. Explainer: EN "We need a bit more information before we can approve you — this is not a rejection. Update anything below and save; your application goes straight back to review."
   ES "Necesitamos un poco más de información antes de poder aprobarte — no es un rechazo. Actualiza lo que haga falta abajo y guarda; tu solicitud vuelve directo a revisión."
7. Label: EN "Message from our team:" / ES "Mensaje de nuestro equipo:"
8. Portal card: EN "Status: we need a bit more information — open your application to see our note and update it."
   ES "Estado: necesitamos un poco más de información — abre tu solicitud para ver nuestro mensaje y actualizarla."

**C. needs_info — vendor EMAIL (wired but copy awaits Cesar, per the absolute rule):**
9. Subject: "A quick question about your NXT//LINK application / Una pregunta sobre tu solicitud"
   Body (EN then ES, both in the code at `src/app/api/admin/vendor-applications/route.ts` `needsInfoEmail`):
   EN — "Thanks for applying to join NXT//LINK with {company}. We need a bit more information before we can approve you — this is not a rejection. Our team's note: {message}. You can update your application here (sign in or create your account with this same email — everything you already entered is saved): {link}. Reply to this email anytime if you'd rather just answer here. — NXT//LINK"
   ES — "Gracias por aplicar a NXT//LINK con {company}. Necesitamos un poco más de información antes de poder aprobarte — no es un rechazo. Nota de nuestro equipo: {message}. Puedes actualizar tu solicitud aquí (inicia sesión o crea tu cuenta con este mismo correo — todo lo que ya escribiste está guardado): {link}. Si prefieres, responde a este correo directamente. — NXT//LINK"

**D. Admin UI (operator-facing, English — consistent with the rest of /admin):**
10. "✉ Ask for info" · "What should the vendor add or fix? (They see this exact note — keep it warm; they are not being rejected.)" · "Send back & email vendor" · "Needs info" badge · "Your note to the vendor (sent):" · flash messages "✓ Sent back for more info — vendor emailed" / "(email not sent)" / "Send-back recorded — application status held by DB guard"

---

## USTED INVENTORY (NOT converted — its own batch, per scope)

| path:line | where |
|---|---|
| `src/app/vendor-signup/page.tsx:85, 93, 95, 100-104, 108, 111` | whole ES dictionary is usted ("Cotícelo", "será su inicio de sesión", "agregue", "Ingrese", "acepte", "¿Ya tiene cuenta? Inicie sesión", "lo revisa") |
| `src/app/join/[token]/page.tsx:113, 124, 126, 127, 133` | whole ES dictionary is usted ("Su correo", "Enviando su enlace…", "Revise su correo", "Cargando su invitación…") |
| `src/lib/assistant/intake-flow.ts:93-151` | the buyer-intake assistant's entire ES question set is usted ("¿Necesita…?", "¿Puede subir…?", "¿Cuál es su fecha límite?", "¿Desea…?", "su solicitud") — ~40 strings |
| `src/lib/invites/emails.ts:43, 49, 88, 115, 121, 151, 180, 184-188` | the vendor invite email sequence (4 emails) is usted throughout, incl. the shared unsubscribe footer ("Darse de baja") |
| `src/app/api/invites/unsubscribe/route.ts:33` | unsubscribe confirmation page ("Se dio de baja… Si cambia de opinión…") |
| `src/app/marketplace/page.tsx:1017` | MIXED register in one sentence: "armando sus escaparates" (usted) + "Vuelve pronto, o dile…" (tú) — also one of the last "escaparate" |

**"escaparate" word inventory** (tienda standardization — not in scope): `src/app/buyer/page.tsx:347` ("Crea el escaparate de tu empresa…" — already tú, word only) and `src/app/marketplace/page.tsx:1017` (above).

## MIGRATION FILES WRITTEN (NOT applied)

- `supabase/migrations/20260804_vendor_applications_needs_info.sql` — see §1 at top. **Apply before/with deploy.**

## GATES (honest)

| Gate | Status |
|---|---|
| `npm run typecheck` | **NOT RUN — command denied by session permissions** (tried in both Bash and PowerShell). Coordinator must run; 0 errors expected. |
| `npm test` | **NOT RUN — same.** Expected 532 baseline + 4 new = 536. |
| `npm run build` | **NOT RUN — same.** |
| Commit | NOT done by me — `git` state changes expected to be coordinator-run. All work is in the working tree on `wt/vendor-application-2026-08-04`. |

## FOUND BUT NOT FIXED

1. **`support@nxtlink.io` shown to vendors** — `src/app/vendor/portal/page.tsx:447`
   ("email support@nxtlink.io to dispute"). Stale domain — Cesar's real address
   is `contact@nxtlinktech.com` (terms/privacy pages use `hello@nxtlinktech.com`).
   Vendor-facing contact wording → Cesar's decision which mailbox is canonical;
   reported per Item 4 rather than changed.
2. **Fallback site URL is the DEMO site** — `NEXT_PUBLIC_SITE_URL` defaults to
   `https://nxt-link-web.vercel.app` in `src/app/api/admin/vendor-applications/route.ts:26-27`,
   `src/lib/invites/emails.ts:16`, `src/lib/admin/notify.ts:25`. If that env var
   is ever unset in prod, emailed links point at the demo site. Verify it's set
   to `https://nxtlinktech.com` in production (env, not code).
3. **Supabase account-verification email still says "Supabase"** — dashboard
   template; coordinator's job per the brief.
4. **`vendor_message` survives resubmission** (kept as admin history; the
   vendor only sees it while status is `needs_info`). If Cesar wants it wiped
   on resubmit, that's a one-line change.
5. **Invite email sequence (`src/lib/invites/emails.ts`) is entirely usted**
   and also pre-dates the tú ruling — included in the inventory; converting
   email copy needs Cesar's wording approval anyway (standing rule 5).
6. **Approve of a `needs_info` application** works (status → approved, note
   kept as history). No UI friction added either way — flagged, not a bug.
