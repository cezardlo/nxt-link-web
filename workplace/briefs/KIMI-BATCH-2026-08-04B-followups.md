# KIMI BATCH B — Spanish register, "needs more info", branded email (2026-08-04)

Follows Batch A (`KIMI-BATCH-2026-08-04-vendor-application.md`, landed as commit
`8e99801` on branch `wt/vendor-application-2026-08-04`). **Start from that branch —
it is already checked out. Do not branch again, do not touch master.**

## READ FIRST (binding)
1. `KIMI-START-HERE.md` — current live URL + DB. `AGENTS.md` is STALE.
2. `workplace/process/ENGINEERING-PROCESS.md` — six gates, DoD checklist.
3. `workplace/briefs/KIMI-BATCH-2026-08-04-REPORT.md` — your own Batch A report.
   Items 1-7 and 9 are DONE. Do not redo them.

## HARD RULES (unchanged from Batch A)
- **NEVER push. NEVER deploy. NEVER apply a migration** — write migration files
  only and flag them loudly.
- **Do not touch fee or commission math.**
- Every new user-facing string goes on a **NEEDS CESAR APPROVAL** list, EN + ES.
- No new dependencies. Design System v1.0. a11y floor.
- Gates: `npm run typecheck` 0 errors, `npm test` >= **532** passing (that is the
  new baseline after Batch A), `npm run build` clean. **Try to run them.** If your
  session denies the command, say so plainly in the report — do NOT claim they
  passed. The coordinator re-runs them regardless.
- If your session denies `git` commands, that is expected; the coordinator
  commits. Just leave the work in the tree and report it.

---

## ITEM 1 — Spanish becomes informal "tú". Cesar decided this; it is binding.
Your Batch A strings **mixed registers** — `/apply` confirmation and
`/apply/status` used **usted** ("Su solicitud está guardada", "cree su cuenta"),
while the vendor portal card used **tú** ("Tu solicitud", "puedes actualizarla").
That reads sloppy to a Spanish speaker.

**Cesar's ruling: informal "tú" is the register for ALL Spanish on this site.**

**Scope for THIS run — convert to tú:**
- every Spanish string you added or changed in Batch A (the 22 on your approval
  list), and
- every Spanish string on the pages Batch A touched: `/apply`, `/apply/login`,
  `/apply/status`, the vendor portal review card, and the landing FAQ answer.

Cesar has already approved these exact tú versions — use them verbatim:
- "Un último paso — crea tu cuenta o inicia sesión."
- "Tu solicitud ya está guardada. Usa el mismo correo y se vinculará a tu cuenta
  automáticamente — no perderás nada de lo que escribiste."
- "Guardada en tu cuenta. Puedes ver su estado o actualizarla cuando quieras."
- "Una persona de nuestro equipo está revisando tu solicitud — aún puedes
  actualizar cualquier dato abajo."
- "Estás aprobado — tu tienda puede salir en vivo. Nuestro equipo te contactará
  con los siguientes pasos."
- "Tu solicitud no fue aprobada esta vez. Puedes actualizarla abajo y nuestro
  equipo la revisará de nuevo."

**Do NOT convert the whole site in this run.** Instead: **inventory** every other
page still using usted, list it in the report with `path:line`, and stop there.
That becomes its own batch.

## ITEM 2 — "storefront" is ONE Spanish word: **tienda**
You used **"escaparate"** in the landing FAQ and **"tienda"** on the status page.
Cesar picked **"tienda"**. Standardize every occurrence on the pages in scope, and
inventory any others in the report.

## ITEM 3 — Add a "needs more info" application status
Cesar's decision: today he can only **approve or reject** an application. He wants
to send it back asking for a missing detail instead of rejecting a good vendor.

**Build:**
1. **Migration file** adding a `needs_info` value to `vendor_applications.status`
   (today: pending / approved / rejected — confirm against the real schema and the
   check constraint before writing). Additive and idempotent. **Do not apply it.**
2. **A vendor-visible message field.** ⚠️ **Do NOT reuse `admin_notes`** — you
   yourself flagged that it may hold internal comments, and leaking those to a
   vendor would be bad. Add a separate, clearly-named column that is written
   deliberately and only ever shown to that vendor.
3. **Admin action** on the application review screen: send back with a short
   message. Same auth/gating as the existing approve/reject actions — no new
   privilege path, fail closed.
4. **Vendor side:** `/apply/status` and the portal card show the state in plain
   language, show the message you were sent, and let the vendor update and
   resubmit. Resubmitting from `needs_info` returns it to review — it must NOT
   create a second application (Batch A's one-per-company rule still holds).
5. **Wording** for the new state, EN + ES in **tú**, on the approval list. Suggested
   direction, not final: "We need a bit more information before we can approve you."
   Keep it warm — this vendor is not being rejected.
6. **Email on send-back:** wire it through the existing mail path, but the copy goes
   on the NEEDS CESAR APPROVAL list. Cesar approves all vendor-facing email copy
   before it ships — that rule is absolute.

## ITEM 4 — Our own emails: NXT//LINK-branded, correct sender (Batch A item 8)
Sending goes through `src/lib/mail.ts` (Resend primary, Zoho fallback, `MAIL_FROM`).
- Every email **we** send must be NXT//LINK-branded and use the configured
  from-address — no hardcoded or stale sender anywhere. Report every place a
  sender or brand is hardcoded, with `path:line`.
- Cesar's real address is **contact@nxtlinktech.com**. Setting the env var and
  verifying the domain with the mail provider is the **coordinator's** job — you
  make sure the code reads it from config correctly and degrades sensibly if unset.
- **NOT yours:** the Supabase-sent account-verification email that still says
  "Supabase". That is a dashboard template, the coordinator handles it, and you
  have no connector access.

---

## STILL NOT IN SCOPE
Item 10 (the operator traffic/accounts dashboard) is a **separate later batch** —
do not start it.

## DEFINITION OF DONE
Report to `workplace/briefs/KIMI-BATCH-2026-08-04B-REPORT.md`: what changed, the
NEEDS CESAR APPROVAL strings (EN + ES, tú), the usted inventory, any migration
files written, honest gate status, and anything found but not fixed.
