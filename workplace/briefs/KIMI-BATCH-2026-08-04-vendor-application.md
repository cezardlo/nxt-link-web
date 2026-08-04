# KIMI BATCH — Vendor application flow, end to end (2026-08-04)

Source: Cesar, verbatim intent, 2026-08-04. Coordinator: real Claude (has the
Supabase/Vercel connectors Kimi does not). Base commit: local `master` @ `d9fa61a`.

## READ FIRST (binding, in this order)
1. `KIMI-START-HERE.md` (repo root) — current live URL + DB. The repo's `AGENTS.md`
   is STALE; KIMI-START-HERE overrides it.
2. `workplace/process/ENGINEERING-PROCESS.md` — the six gates and the DoD
   checklist. Binding on this batch, no exceptions.
3. `workplace/audit/flow-readiness-2026-07-30.md` — the most recent end-to-end
   read of this exact pipeline. Re-verify its claims against current code before
   relying on them; a lot shipped after it was written.

## CONTEXT THAT SHOULD FRAME EVERY DECISION
The real production site (nxtlinktech.com, DB `dwotpviynxkbvyxambdy`) has
**4 accounts, 2 approved vendors, and ZERO listings, ZERO requests, ZERO quotes.**
Two vendor rows are still named the placeholder "New company" — people started
the vendor flow and never finished it. **The vendor-application path has a 0%
real-world completion rate.** That is the problem this batch exists to fix.
Judge every change by: does this get a real vendor from "I clicked Become a
Vendor" to "my application is submitted and I can see its status"?

## HARD RULES — violating any of these fails the batch
- **DO NOT PUSH. DO NOT DEPLOY.** `origin/master` auto-deploys to the real
  production site. Work on a new branch off current master:
  `wt/vendor-application-2026-08-04`. Commit there. Stop. The coordinator
  verifies and merges; Cesar ships.
- **DO NOT apply database migrations.** You have no Supabase access. If you need
  a schema change, WRITE the migration file under `supabase/migrations/` and say
  so loudly in your report — the coordinator applies it.
- **DO NOT change fee numbers, commission math, or the fee engine.** Not in this
  batch. If something looks wrong there, report it, don't touch it.
- **DO NOT invent customer-facing wording as final.** Any NEW user-facing string
  (EN and ES) goes in a list at the end of your report marked NEEDS CESAR
  APPROVAL. Existing approved wording is reused verbatim wherever possible.
- **EN/ES parity is required.** Every string you add exists in both languages.
- **No new dependencies.**
- Follow the installed design/taste skills for any UI you build, and stay inside
  Design System v1.0 (light theme, violet, scoped CSS). Do not restyle pages
  outside this batch's scope.

## THE WORK — Cesar's items

### 1. "Become a Vendor" must lead straight into the application
Today the landing header links to `/vendor-signup`
(`src/components/PublicHeader.tsx:204,240`). Cesar's complaint: clicking it does
**not** take a person straight into creating their vendor application — it
detours through options / lands them somewhere dashboard-ish.
**Required:** one obvious path. Click "Become a Vendor" → you are filling in your
vendor application. No menu of choices first, no dashboard, no dead end.
Trace the real current behaviour across `/vendor-signup`, `/vendor/start`,
`/vendor/onboarding`, `/vendor/portal` and report what it actually does today
before you change it.

### 2. One application per company — not several
Cesar: from the vendor dashboard you can move around and it still submits as
another application, so there end up being multiple applications for the same
vendor. **Required:** a vendor has exactly ONE application. Re-entering the flow
RESUMES the existing one; it never silently creates a second. Enforce it on the
server, not just by hiding a button. If duplicates already exist in the data
model, say how you would de-duplicate — do not write to prod.

### 3. The vendor can SEE their application
**Required:** a read-back view of what they submitted. Nothing about the vendor's
own application should be invisible to them.

### 4. Submit → "create an account or sign in", without losing the work
Cesar: when they submit the application it should tell them to create an account
or sign in — "check that, make sure that's fixed."
**Required:** verify this path end to end. If someone fills the application while
signed out, submitting prompts account creation / sign-in, and **everything they
typed survives that round trip** and attaches to the account they land in. Losing
their input here is the single most likely reason those two "New company" rows
exist.

### 5. Everything they enter saves to their profile
**Required:** company name and every application field persist to the vendor
profile. Coming back to the same application later shows what they already
entered — not an empty form, not a placeholder "New company". This includes
larger companies filling in more detail; nothing they enter is throwaway.

### 6. Multi-select where more than one answer is true
Cesar, explicitly: **locations** — a vendor serving El Paso *and* Las Cruces must
be able to pick both, not one. Today it forces a single choice.
**Required:** locations become multi-select. Apply the same judgement to other
fields where one answer is obviously wrong (industries / categories / services
covered) — list which fields you changed and why in your report. Persist and read
back the multiple values correctly; check the DB column type supports it and
write a migration file if it does not.

### 7. Application status — they can see where it is in the process
**Required:** the vendor can check what stage their application is at (e.g.
submitted → in review → approved / needs more info), in plain language, EN + ES.
Use the real `vendor_profiles.status` values that already exist; do not invent a
parallel status system. If the existing statuses cannot express this, say so.

### 8. Our own emails: NXT//LINK branded, from contact@nxtlinktech.com
Scope for YOU (code only): sending goes through `src/lib/mail.ts` (Resend primary,
Zoho fallback, `MAIL_FROM`). Make sure every email **we** send is NXT//LINK-branded
and uses the configured from-address rather than anything hardcoded or stale.
Report any place a sender/brand is hardcoded.
**NOT yours:** the Supabase-sent account-verification email still says Supabase —
that is a dashboard/template setting and the coordinator is handling it. Don't
try; you have no connector access.

### 9. Remove the AI mention in the landing FAQ (wording only)
Cesar, 2026-08-04, decided via direct question: remove **just the FAQ mention** —
`src/app/page.tsx:226` (`faq5a`) currently reads "...upload a brochure, and our AI
drafts your listing for you...". Take the AI claim out of that answer, EN **and**
the matching ES string. **The feature itself stays** — this is a wording change
only. Rewrite the answer so it still explains how a vendor gets started without
promising AI. New wording goes on the NEEDS CESAR APPROVAL list.

### 10. Operator dashboard: traffic + accounts ("what every startup has")
Cesar, 2026-08-04: he wants a dashboard showing how many people are on the site —
traffic, accounts, the usual startup numbers.

**Where it lives:** extend the EXISTING admin surface (`src/app/admin/` +
`src/app/api/admin/overview/`). Do **not** create a fourth admin app — a prior
audit already flagged "admin = 3 different apps" as a problem. Reuse the existing
admin auth/gating exactly; this data is operator-only, never public.

**Numbers you CAN build for real, from Supabase (do these):**
- accounts total, and new signups over time (last 7 / 30 days, with a trend)
- vendors broken out by status (pending vs approved vs restricted) — pending is
  the one Cesar has to act on, so make it prominent
- buyers, listings published, requests posted, quotes sent, deals
- funnel-shaped where it makes sense: signed up -> completed application ->
  approved -> published a listing. That funnel is the whole point; right now it
  is 4 -> ? -> 2 -> 0 and Cesar needs to SEE where people fall out.

**Traffic (visitors / pageviews) — READ THIS CAREFULLY:**
`@vercel/analytics` is in `package.json`, **but Vercel Web Analytics is NOT
ENABLED on the production project** — coordinator verified 2026-08-04, the
Vercel analytics API returns `not_found`. **There is no traffic data in existence
yet.** Therefore:
- **Do NOT fabricate, mock, estimate, or placeholder any traffic number.** The
  design charter rule "real-computed stats are never faked" is binding here.
- Build the traffic panel with an honest empty state ("traffic tracking not
  connected yet") and, if you wire a real read, put it behind an env var and
  document exactly which env var and what it needs.
- Enabling Web Analytics is a Vercel dashboard action the coordinator is handling
  with Cesar. Your job is that the panel lights up correctly once it is on.

Standard rules still apply: Design System v1.0, EN/ES parity, a11y, no new deps.

## DEFINITION OF DONE
- All six gates per ENGINEERING-PROCESS.md.
- `npm run typecheck` → 0 errors. `npm test` → all pass (baseline is **521/521**;
  it must not go down). `npm run build` → clean.
- Committed on `wt/vendor-application-2026-08-04`. NOT pushed.
- A report containing: what the flow actually did before, what you changed, the
  NEEDS CESAR APPROVAL string list (EN+ES), any migration files you wrote, and
  anything you found but deliberately did not fix.
- If you disagree with an instruction here because the code says otherwise, say
  so in the report with the `path:line` evidence rather than silently deviating.
