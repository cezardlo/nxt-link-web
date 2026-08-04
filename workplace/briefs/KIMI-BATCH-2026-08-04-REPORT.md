# KIMI BATCH REPORT — Vendor application flow, end to end (2026-08-04)

Branch intended: `wt/vendor-application-2026-08-04` off `master @ d9fa61a`.
Scope executed: items **1, 2, 3, 4, 5, 6, 7, 9**. Items 8 and 10 NOT touched
(separate second batch, per instructions).

---

## ⚠️ TWO THINGS THE COORDINATOR MUST DO — READ FIRST

**1. APPLY THE TWO MIGRATION FILES BEFORE (OR WITH) MERGING THIS CODE.**
The code selects two NEW columns (`vendor_applications.regions`,
`vendor_applications.target_customers`). PostgREST errors on selecting a
column that doesn't exist yet — if this code deploys before the migration,
`/apply`, `/apply/status`, and the admin applications screen break.
Files (written, NOT applied — I have no Supabase access):

- `supabase/migrations/20260804_vendor_applications_multi_values.sql` —
  adds `regions jsonb` + `target_customers jsonb` (with backfill from the
  legacy single-value columns, which are KEPT and stay in sync).
- `supabase/migrations/20260804_vendor_applications_one_per_company.sql` —
  unique indexes: one application per `auth_id`, and one per `lower(email)`
  among unclaimed rows. Includes the de-dup SQL in comments. The live table
  is empty (0 rows per the 2026-07-30 audit), so both build cleanly.

**2. CREATE THE BRANCH + RUN THE GATES + COMMIT — I COULD NOT.**
Every state-changing command in this session was denied by the permission
system (no approver present): `git switch -c`, `git checkout -b`,
`git branch`, `npm run typecheck`, `npm test`, `npm run build`, even
`node -e` and direct `node node_modules/typescript/bin/tsc --noEmit`.
All work is in the **working tree on `master`, uncommitted**. Exact commands
to finish:

```bash
git switch -c wt/vendor-application-2026-08-04
git add src/ supabase/migrations/20260804_*.sql tests/vendor-application-batch.test.ts workplace/briefs/KIMI-BATCH-2026-08-04-REPORT.md
npm run typecheck   # must be 0 errors
npm test            # baseline 521 + 12 new = 533 expected, must not go down
npm run build       # must be clean
git -c user.email=delaocesar65@gmail.com -c user.name=cezardlo commit -m "feat(vendor): one resumable vendor application, saved to profile, multi-select locations"
# DO NOT PUSH (Cesar pushes)
```

NOTE: `git status` shows `M KIMI-START-HERE.md` — that modification
**predates this batch** (it was dirty when I started; I did not touch it).
Do not include it in this commit unless you know what it is.

**Gates honesty statement:** because the commands were denied, I could NOT
run typecheck/test/build. Instead I did a full manual self-review of every
diff (G3), traced every new/changed type by hand, and wrote 12 unit tests
against the in-memory fake DB (same harness as `tests/vendor-invite-lane.test.ts`).
**Do not treat the gates as passed until you run them and see the numbers.**

---

## WHAT THE FLOW ACTUALLY DID BEFORE (path:line evidence)

The repo has TWO parallel vendor systems:

**System A — `vendor_applications` (the real application):**
`/apply` (public form) → `POST /api/apply/submit` → `/apply/login` →
`/apply/status`. Admin review at `/admin/vendor-applications`; approval
creates the live `vendor_profiles` row.

**System B — `vendor_profiles` (account + portal):**
`/vendor-signup` (60-second magic-link account creation) → `/vendor/portal`
(dashboard) → `/vendor/onboarding` (guided profile builder) → listings/leads.
`src/app/apply/login/page.tsx:3-6` and `src/app/apply/status/page.tsx:3-7`
carry an explicit "do not merge with that flow" comment.

Item-by-item BEFORE truth:

1. **"Become a Vendor" detoured.** `src/components/PublicHeader.tsx:204,240`
   and the landing CTA/footer (`src/app/page.tsx:640,678`) all pointed to
   `/vendor-signup` — an **account-creation screen**, not an application
   (`src/app/vendor-signup/page.tsx:1-24` header comment: "the ORGANIC quick
   signup"). The path was: create account → magic link email → land on
   `/vendor/portal` dashboard → notice a review card → click
   `/apply?from=portal` (`src/app/vendor/portal/page.tsx:514`) → *then* see
   the application. Exactly the detour Cesar described. The two
   "New company" rows in prod are `vendor_profiles` placeholders minted by
   `src/lib/vendor/auth.ts:93` on first authed touch — people who did the
   account step and never reached the application.

2. **Duplicates were possible.** `src/app/api/apply/submit/route.ts:113` (old)
   did an unconditional `insert` — no lookup at all. Re-entering `/apply`
   always created a second row. The form also always rendered blank for a
   returning applicant (only a partial prefill from the *profile* existed,
   `src/app/apply/page.tsx:138-164` old).

3. **Read-back existed** at `/apply/status` (editable view of your own
   application) — but was undiscoverable from the main flow (only linked from
   the post-submit upsell and `/apply/login`), and was English-only.

4. **Submit → account was weak but present.** Submit worked signed out
   (`auth_id: null`). The confirmation card said account creation was
   "completely optional" (old `src/app/apply/page.tsx:671-677`). The linking
   mechanism already existed and is solid:
   `src/lib/apply/auth.ts:56-78` (`getOwnApplication`) claims an anonymous
   application onto the account by email match on first sign-in. Work was
   only lost if the vendor created the account with a DIFFERENT email — and
   nothing told them to use the same one.

5. **Nothing flowed back to the vendor profile.** The application and the
   profile never synced; a vendor could have a full application and a profile
   still showing the placeholder "New company".

6. **Locations were single-choice.** `vendor_applications.region` is one
   `text` column (`supabase/migrations/20260704_vendor_applications_size_region.sql:10-12`),
   rendered as a `<select>` (old `src/app/apply/page.tsx:414-432`). Approval
   mapped it to `service_areas: [app.region]` (one element).
   "Who do you serve best" (`target_customer`) was also single-choice.
   The profile-side fields (`service_areas`, `industries`, `categories`,
   `client_types`) were already multi-select chip groups — only the
   application form forced single answers.

7. **Status existed but raw/English.** `vendor_applications.status` is
   `pending | approved | rejected` (check constraint,
   `supabase/migrations/20260702_vendor_applications_private_intake.sql:32-33`).
   `/apply/status` showed an English badge; the portal showed the raw string
   `{vendor.status}` (old `src/app/vendor/portal/page.tsx:474`).
   **The existing statuses cannot express "needs more info"** — that stage
   does not exist in either status system. I did not invent one (per the
   brief). `admin_notes` is never returned to the vendor and I did not
   expose it (it may contain internal comments).

9. **FAQ promised AI.** `src/app/page.tsx:226` (EN) and `:303` (ES).

---

## WHAT I CHANGED

### Item 1 — one obvious path into the application
- `src/components/PublicHeader.tsx:204,240` — "Become a Vendor" → `/apply`
  (desktop + mobile).
- `src/app/page.tsx:640` — landing "Create a vendor account" CTA → `/apply`.
- `src/app/page.tsx:678` — footer "List your company" → `/apply`.
- Clicking any of these now lands a person directly IN the application form.
  `/vendor-signup` still exists (the conference QR `?src=qr`, invite emails,
  `/vendor-login`'s "quick signup" link) — it is just no longer the front
  door. Deliberately NOT changed: marketplace "For vendors" pills (they point
  to `/vendor-login`, a sign-in page — reasonable).

### Item 2 — one application per company, enforced server-side
- `src/lib/apply/auth.ts` — `getOwnApplication` refactored into db-injectable
  `findOwnApplication` (same logic) + NEW `findAnonymousApplication(db, email)`
  which returns the latest **unclaimed** row for an email and NEVER a row
  already claimed by an account.
- `src/app/api/apply/submit/route.ts` — before writing, the route now looks
  up the resume target: signed-in → their own application (claiming a prior
  anonymous one by email first); signed-out → the latest unclaimed row with
  the same email. If found, it **UPDATEs that row** (keeping `public_ref`
  and status) instead of inserting. A `23505` unique-violation race falls
  back to resume-update. Resumed submissions don't re-email the admins.
- `src/app/apply/page.tsx` — a signed-in vendor with an existing application
  now gets the form **pre-filled from that application** (all fields), so
  re-entering visibly resumes instead of showing a blank form.
- Migration file `20260804_vendor_applications_one_per_company.sql` (above) —
  the DB backstop. De-dup strategy if duplicates ever exist: keep the NEWEST
  row per account/email (the app treats the newest as live); SQL in the
  migration comments. Live table is empty, so no de-dup needed today.

### Item 3 + 7 — the vendor can SEE their application and its status, EN + ES
- `src/app/apply/status/page.tsx` — **rewritten fully bilingual** (shared
  `LanguageToggle`/`useLang` + page dictionary, same pattern as `/buyer`).
  Status is now plain language with a one-line "what happens next":
  - pending → "Submitted — in review" / "Enviada — en revisión"
  - approved → "Approved" / "Aprobada"
  - rejected → "Not approved this time" / "No aprobada esta vez"
  using the real `vendor_applications.status` values — no parallel system.
- `src/app/vendor/portal/page.tsx` — the review card now fetches
  `/api/apply/my`; if the vendor has an application it shows
  "Your review application is submitted — Status: …" with a
  "View your application →" link to `/apply/status` (instead of asking them
  to apply again). The raw `{vendor.status}` nav badge is now plain language
  ("in review"/"en revisión", "approved"/"aprobado").
- `/apply/status` also remains the full read-back + edit view of everything
  they submitted (now including logo/images and the new multi-select fields).

### Item 4 — submit → create account/sign in, nothing lost
- `src/app/apply/page.tsx` confirmation card: the account step is now the
  primary CTA, worded "One last step — create your account or sign in", with
  an explicit "Your application is already saved … nothing you entered is
  lost" message naming the email they used. The CTA carries
  `?email=<their email>` to `/apply/login`. Signed-in submitters instead get
  "Saved to your account → View your application" linking `/apply/status`.
- `src/app/apply/login/page.tsx` — reads `?email=`, pre-fills it, switches to
  create-account mode, and shows a bilingual notice explaining to use the
  SAME email so the saved application links automatically.
- The actual attach happens via the pre-existing email-claim in
  `findOwnApplication` (first `/api/apply/my` call after sign-in) — verified
  in code and pinned by a new test. Auth callback already routes vendors
  with an application to `/apply/status` (`src/app/auth/callback/route.ts:339`).

### Item 5 — everything they enter saves to their profile
- NEW `src/lib/apply/profile-sync.ts` — mirrors application facts onto the
  vendor's `vendor_profiles` row **fill-empty only** (never overwrites
  portal/onboarding data): company_name (fixes "New company" placeholders),
  contact_name, phone, description (from problem_solved), city + service_areas
  (from locations). Best-effort, never fails the submit.
- Wired into: `POST /api/apply/submit` (signed-in submissions),
  `GET /api/apply/my` (covers the claim-by-email moment), `PATCH /api/apply/my`.
- The portal/onboarding auto-save was already solid and is untouched.
- Deliberately NOT synced: `categories` — the application's category
  vocabulary (TMS/WMS/Forklifts…) doesn't match the marketplace category
  taxonomy used for lead matching; forcing it in would pollute matching.
  Flagged for a future mapping decision.

### Item 6 — multi-select where one answer is wrong
Changed fields (both in the application system):
- **Locations** (`region` single-select → `regions` multi-chips + free-text
  "add your own") — Cesar's explicit case (El Paso AND Las Cruces).
- **Who do you serve best** (`target_customer` → `target_customers` multi) —
  same judgement: a vendor serving manufacturers AND 3PLs.
- NOT changed: `category` (single primary category, has a DB check constraint
  and drives admin filtering — "what do you supply" is already multi at
  `/vendor-signup` and in onboarding `categories`); `company_size`,
  `price_range` (naturally single). Profile-side industries/categories/
  service areas were already multi.
- New columns `regions` / `target_customers` (jsonb) via migration file;
  legacy `region` / `target_customer` columns are KEPT and written with the
  first value, so old readers never break. Old form posts still work
  (single value expands into the array — `resolveMultiValue`).
- Round-trip: `/apply` form → submit → `/apply/status` read-back/edit →
  admin review screen (shows both joined) → approval maps arrays to
  `service_areas` / `client_types` on the live profile.

### Item 9 — FAQ AI wording removed (wording only)
- `src/app/page.tsx:226` EN and `:303` ES — the AI claim is out; the answer
  still explains how a vendor gets started. Feature untouched.

### Tests (new — `tests/vendor-application-batch.test.ts`, 12 tests)
Field parsing (trim/dedup/cap/absent-vs-empty/legacy fallback), one-per-company
(own-row-first, claim-by-email, latest-unclaimed, never-return-claimed), and
profile sync (fills placeholders, never overwrites, mints pending profile).

---

## NEW USER-FACING STRINGS — NEEDS CESAR APPROVAL (EN + ES)

**Landing FAQ (item 9 rewrite):**
1. EN: "Create a vendor account, upload a brochure, and publish your storefront. Once your profile is complete and verified, you start receiving qualified leads from local buyers."
   ES: "Crea una cuenta de proveedor, sube un folleto y publica tu escaparate. Cuando tu perfil esté completo y verificado, empiezas a recibir prospectos calificados de compradores locales."

**/apply form:**
2. "Which locations do you serve?" / hint "Select all that apply · Elige todas las que apliquen" (ES label inline: same hint covers both)
3. "Other location — add your own / Otra ubicación" (placeholder)
4. "Select all that apply · Elige todas las que apliquen" (target-customer hint)
5. "Other customer type — add your own / Otro tipo de cliente" (placeholder)

**/apply confirmation card:**
6. EN: "One last step — create your account or sign in." ES: "Un último paso — cree su cuenta o inicie sesión."
7. EN: "Your application is already saved. Use the same email (…) and it links to your account automatically — nothing you entered is lost."
   ES: "Su solicitud ya está guardada. Use el mismo correo y se vinculará a su cuenta automáticamente — no perderá nada de lo que escribió."
8. EN: "Saved to your account." / "You can check its status or update it anytime." / "View your application →"
   ES: "Guardada en su cuenta." / "Puede ver su estado o actualizarla cuando quiera."
9. EN: "Una persona del equipo de NXT//LINK revisará su solicitud y le contactará pronto." (ES line added under the existing EN review sentence)

**/apply/login notice:**
10. EN: "Your application is saved. Create your account / Sign in with this same email and it links automatically — nothing you entered is lost."
    ES: "Su solicitud está guardada. Cree su cuenta / Inicie sesión con este mismo correo y se vinculará automáticamente — no perderá nada de lo que escribió."

**/apply/status page (full new bilingual dictionary — key strings):**
11. "Submitted — in review" / "Enviada — en revisión"
12. "Not approved this time" / "No aprobada esta vez" ("Approved"/"Aprobada" is existing vocabulary)
13. EN: "A person on our team is reviewing your application — you can still update anything below."
    ES: "Una persona de nuestro equipo está revisando su solicitud — aún puede actualizar cualquier dato abajo."
14. EN: "You're approved — your storefront can go live. Our team will reach out with next steps."
    ES: "Está aprobado — su tienda puede salir en vivo. Nuestro equipo le contactará con los siguientes pasos."
15. EN: "Your application wasn't approved this time. You can update it below and our team will take another look."
    ES: "Su solicitud no fue aprobada esta vez. Puede actualizarla abajo y nuestro equipo la revisará de nuevo."
16. Plus the routine form labels translated to match existing site vocabulary
    (Company details/Datos de la empresa, Save changes/Guardar cambios, etc.) —
    all reuse wording already present elsewhere on the site where it existed.

**Vendor portal (review card + badge):**
17. "Your review application is submitted" / "Tu solicitud de revisión está enviada"
18. "Status: submitted — in review by our team." / "Estado: enviada — en revisión por nuestro equipo."
19. "Status: approved." / "Estado: aprobada."
20. "Status: not approved this time — you can update it and we'll take another look." / "Estado: no aprobada esta vez — puedes actualizarla y la revisaremos de nuevo."
21. "View your application →" / "Ver tu solicitud →"
22. Nav badge: "in review"/"en revisión", "approved"/"aprobado"

---

## FOUND BUT DELIBERATELY NOT FIXED

1. **"Needs more info" status doesn't exist** in `vendor_applications.status`
   (pending/approved/rejected) or `vendor_profiles.status` (pending/approved).
   Adding one is a schema + admin-workflow decision for Cesar/coordinator —
   reported per the brief instead of invented.
2. **`/apply` and `/apply/login` remain mostly English** (pre-existing;
   bilingual inline on the new/changed strings only). Full translation of
   both pages is a wording batch of its own — `/apply/status`, the page
   items 3+7 are about, is now fully bilingual.
3. **Two "New company" rows in prod** — the sync fixes the cause going
   forward, but I did not write to prod. The coordinator can repair the two
   rows by hand (or they self-repair when those vendors next submit/sign in).
4. **`admin_notes` not surfaced to vendors** — could back a future "needs
   more info" message, but it may contain internal comments today.
5. **Money-adjacent pre-existing gaps** (vendor quote revision after accept,
   uncapped vendor purchase amount — audit H2/C1) — untouched, per the
   standing money rule. Not in scope.
6. **`category` kept single-select** on the application (see item 6 above) —
   judgement call, flagged for Cesar.
7. **KIMI-START-HERE.md was already modified in the working tree before I
   started** — not mine, left alone.
8. **Application `categories` → profile `categories` not synced** (taxonomy
   mismatch, see item 5).

## GATES

| Gate | Status |
|---|---|
| `npm run typecheck` | **NOT RUN — command denied by session permissions.** Coordinator must run. |
| `npm test` | **NOT RUN — same.** Expected 521 baseline + 12 new = 533. |
| `npm run build` | **NOT RUN — same.** |
| Branch/commit | **NOT DONE — `git switch/checkout/branch` all denied.** Work is uncommitted on master; commands at the top of this report. |
| Migration files | Written, NOT applied (per rule). MUST be applied before/with merge. |
