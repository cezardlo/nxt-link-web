# Account-management verification report — 2026-07-21

**Method:** read the route/page source for every item below, then ran `npm run dev` locally (Next.js 14.2.35, ready on `http://localhost:3000`) and probed it with read-only checks: page loads, unauthenticated API calls, and POST requests carrying data that fails validation *before* any database write (bad email, `terms_accepted:false`, missing required field, no session). **No signup/login/invite form was completed for real, no magic-link or password-reset email was actually requested, and no admin/vendor/buyer record was created or changed.** This was a deliberate limit, not an oversight — `.env.local` only holds `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, which point at the **live** Supabase project (`yvykselwehxjwsqercjg`); there is no local database. `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_ACCESS_CODE`, and both mail providers' keys are **not** set locally (they live in Vercel only), which also genuinely limits what can be exercised end-to-end from this machine — noted per item below.

Report-only. No code was changed to produce this — see the companion runbook (`workplace/runbooks/DEAL-RUNBOOK.md`) for how these pieces fit into the operator's day, and §7 there for the operator-facing version of the two BROKEN items found here.

---

## Verdict table

| # | Item | Verdict | One-line reason |
|---|---|---|---|
| 1 | Vendor signup — invited lane reaches `approved` | WORKS (code) | `ensureVendorProfile(lane:'invite')` forces `status:'approved', moderation_status:'active'` — see evidence |
| 2 | Vendor signup — organic lane reaches `pending` | WORKS (code) | Both organic entry points (`/vendor-signup` quick, legacy `/vendor-login` signup tab) end in `ensureVendorProfile(lane:'organic'/'portal')` → `status:'pending'`, never `approved` |
| 3 | Login routes exist and render | WORKS | `/login`, `/forgot-password`, `/reset-password`, `/vendor-login`, `/apply/login` all return 200 with the right on-page copy; `/sign-in` is a **deliberate 307 alias to `/login`** (config redirect), not a bug |
| 4 | Magic-link route | WORKS (code) + CANNOT VERIFY LOCALLY (send) | `/login` "email me a link" and `/vendor-signup`/`/join` both call real Supabase Auth OTP methods correctly; actually **sending** one would hit the live project and (if a mail provider were configured) send a real email — not attempted |
| 5 | Password-reset routes | WORKS | `/forgot-password` → `resetPasswordForEmail`, `/auth/callback?next=/reset-password` → `/reset-password` checks for a recovery session before allowing `updateUser({password})`; correct shape, not fired for real |
| 6 | Buyer signup / verification path | WORKS (code) | `/signup` → `POST /api/auth/signup` (role `client`) → Supabase confirmation email → `getBuyerSession()` gates every buyer-identity route on `email_confirmed_at`; verified the gate fires (see evidence) |
| 7 | Account page — change password | WORKS (code) | `/account` "Change password" calls `supabase.auth.updateUser({password})` directly — standard, correct pattern |
| 8 | Account page — change email | WORKS (code) | Calls `supabase.auth.updateUser({email}, {emailRedirectTo:.../auth/callback?next=/account})` — correct pattern, confirmation-gated |
| 9 | Sign out clears the cart (commit `d567711`) | **WORKS — confirmed at all 3 call sites** | `/account`, `/vendor/portal`, `/apply/status` sign-out handlers all call `clearLocalCart()` before redirecting; verified in `src/components/cart/useCart.ts` |
| 10 | Admin access gating — API-level (`isAdminRequest`) | WORKS | Fails closed with no credentials on every `/api/admin/*` and `/api/vendors/manage` route tested (401 `{"ok":false,"message":"Admin only"}`); also fails closed with a **wrong** access-code header, and `POST /api/auth/access-code` correctly refuses to mint a session when `ADMIN_ACCESS_CODE` is unset (501, not silent success) |
| 11 | Admin access gating — page-level (`/admin` and children) | **BROKEN** | Edge `middleware.ts` requires a real Supabase session cookie to reach `/admin` at all — the access-code entry screen (`AccessGate`) becomes unreachable for an operator who has no Supabase login. Exact repro below. |
| 12 | Suspended/banned vendor — session | WORKS (code) | Session is **not** revoked (by design — vendor can still sign in to dispute); `/vendor/portal` swaps the editor for a fixed "under review" screen instead |
| 13 | Suspended/banned vendor — storefront visibility | WORKS (code) | `/api/marketplace/vendor/[id]` returns 404 for a suspended/banned vendor (auto-reactivates an expired suspension first, then re-checks) |
| 14 | Suspended/banned vendor — listing visibility everywhere else | **BROKEN** | General marketplace search/browse (`/api/marketplace/listings`), the single listing detail page (`/api/marketplace/listings/[id]`), and the buyer request form (`/api/marketplace/request`) **do not check vendor moderation status** — only the storefront route and RFQ dispatch matching do. Exact repro below. |
| 15 | `/api/vendors/signup` (a third, unused signup route) | INFORMATIONAL | Not called by any current page (grep confirms) — orphaned/dead code, not a functional bug, but a maintenance trap (see note) |

---

## Detailed evidence

### 1–2. Vendor signup — both lanes reach the right status

Read `src/lib/vendor/profile.ts`, the **one** shared profile creator every lane goes through:

```
APPROVED_LANES = ['invite', 'admin_approval']
...
insert.status = approvedLane ? 'approved' : 'pending';
if (approvedLane) insert.moderation_status = 'active';
```

Traced both real entry points into it:
- **Invited**: `/join/<token>` → magic link → `src/app/auth/callback/route.ts` lines 79–124 → `ensureVendorProfile({ lane: 'invite', ... })` → `approved`.
- **Organic**: `/vendor-signup` (3-field quick signup, `mode:'magic'`) → magic link → same callback, lines 138–156 (`meta.signup_lane === 'quick'`) → `ensureVendorProfile({ lane: 'organic', ... })` → `pending`. Also confirmed the **legacy** password-based organic door, `/vendor-login`'s "Create account" tab → `POST /api/auth/signup` (no `mode:'magic'`) → same callback's non-quick branch (lines 157–176) routes to `/apply` if no profile exists yet — still never grants `approved`.

Could not complete an actual signup locally (would create a real row in the live database and, if reached, send a real email) — status quo verified by tracing the code path, not by an end-to-end run. `POST /api/auth/signup` was exercised with failing inputs to confirm it's wired and validating correctly without touching the DB:
```
$ curl -d '{"email":"test@example.com","password":"password123","role":"client","terms_accepted":false}' /api/auth/signup
{"ok":false,"message":"Please accept the Terms of Service and Privacy Policy..."}
$ curl -d '{"mode":"magic","email":"vendor@example.com","terms_accepted":true}' /api/auth/signup
{"ok":false,"message":"Your company name is required. / El nombre de tu empresa es requerido."}
```

### 3. Login-family routes exist and render

```
/            200      /forgot-password  200      /reset-password  200
/login       200      /vendor-login     200      /apply/login     200
/sign-in     307 -> /login   (next.config.mjs: deliberate "legacy sign-in alias")
```
`/sign-in`'s own page file (`src/app/sign-in/page.tsx`) is actually **dead code** — a decorative demo template whose `handleSubmit` only does `console.log(...)` and never calls Supabase. It is unreachable in practice because `next.config.mjs` redirects `/sign-in` to `/login` before Next.js ever renders that file. Not a bug (nobody can hit it), just worth knowing if someone "fixes" `/sign-in` later and wonders why it doesn't seem to be live — it isn't, by design.

Rendered-content spot checks (curl with a normal browser `User-Agent`/`Accept-Language` — see the bot-middleware note under §11):
```
/vendor-signup  → "Company name", "Work email", "What do you supply", "Create my free account"
/login          → "Sign in", "Google", "magic" (link copy)
/forgot-password→ "Reset your password", "Send reset link"
/reset-password → "Checking your reset link…" (client-only state; correct initial render)
```

### 4–5. Magic link / password reset

Both are thin, correct wrappers around real Supabase Auth SDK calls (`signInWithOtp`, `resetPasswordForEmail`, `updateUser`) — no custom/home-grown token logic to distrust. `/auth/callback/route.ts` is the single landing point for every kind of email link (`exchangeCodeForSession`) and correctly branches by `next` param / role / lane. **Not fireable locally without either (a) a configured mail provider, which isn't set in `.env.local`, or (b) writing a real magic-link request against the live Supabase project** — both were avoided per the task's "no real emails" instruction. This is marked CANNOT VERIFY LOCALLY for the actual send/round-trip, WORKS for the code shape.

### 6. Buyer signup / verification

`/signup` (role picker → email+password) posts to the same `POST /api/auth/signup` used everywhere else — one signup system confirmed for buyers too. Verification is Supabase's own `email_confirmed_at`, and it's actually enforced: `src/lib/buyer/auth.ts`'s `getBuyerSession()` returns `emailConfirmed`, and `POST /api/buyer/quote-decision` refuses to run for an unverified buyer:
```
$ curl -d '{"quote_request_id":"x","decision":"accepted"}' /api/buyer/quote-decision
{"ok":false,"message":"Sign in required"}
```
(401, confirmed correct fail-closed behavior for a signed-out caller; the email-confirmed check sits right behind it in the same function for a signed-in-but-unverified caller.)

### 7–9. Account page

`src/app/account/page.tsx` — all three actions read cleanly:
- Change password → `supabase.auth.updateUser({ password })`.
- Change email → `supabase.auth.updateUser({ email }, { emailRedirectTo: '.../auth/callback?next=/account' })` — correctly gated behind clicking the confirmation link, not applied instantly.
- **Sign out clears the cart** — confirmed at all three places the app signs a user out, not just `/account`:

| File | Line(s) |
|---|---|
| `src/app/account/page.tsx` | `signOut()` → `sb.auth.signOut(); clearLocalCart(); window.location.href='/login';` |
| `src/app/vendor/portal/page.tsx` | `signOut()` → same pattern → `/vendor-login` |
| `src/app/apply/status/page.tsx` | `handleSignOut()` → same pattern (in a `finally` block, so it runs even if `signOut()` throws) → `/apply/login` |

`clearLocalCart()` (`src/components/cart/useCart.ts` lines 74–79) removes the `nxt_cart` localStorage key **and** resets the module-level `accountLinked`/`syncPromise` state, so the next person on a shared device doesn't inherit either the cart contents or a stale "linked to a signed-in account" flag. This matches the commit `d567711` description exactly and is consistent across every sign-out path — no gap found here.

### 10–11. Admin access gating — the split finding

Two different gates exist and they **don't agree with each other**:

**API-level gate (`isAdminRequest`, `src/lib/assistant/auth.ts`) — WORKS, fails closed correctly.** Tested unauthenticated against six different admin-only routes:
```
GET /api/admin/deals              -> 401 {"ok":false,"message":"Admin only"}
GET /api/admin/invites            -> 401 {"ok":false,"message":"Admin only"}
GET /api/vendors/manage           -> 401 {"ok":false,"message":"Unauthorized"}
GET /api/admin/vendor-applications-> 401 {"ok":false,"message":"Admin only"}
GET /api/admin/applications       -> 401 {"ok":false,"message":"Admin only"}
GET /api/admin/commissions        -> 401 {"ok":false,"message":"Unauthorized"}
```
Also confirmed a **wrong** `x-access-code` header still gets 401, and — because `ADMIN_ACCESS_CODE` genuinely isn't set in this local environment — `POST /api/auth/access-code` correctly returns `501 {"ok":false,"message":"Access-code sign-in is not configured on this deployment."}` rather than silently accepting anything. That's the right fail-closed behavior when the code is unset.

**Page-level gate (`/admin` and every `/admin/*` page) — BROKEN.** `src/middleware.ts` lines 114–125:
```js
const AUTH_PAGES = ['/buyer', '/account', '/admin', '/vendor/leads', '/vendor/listings',
                     '/vendor/portal', '/vendor/start', '/vendor/quotes'];
if (AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
  const hasSession = req.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));
  if (!hasSession) { redirect to /login }
}
```
This only recognizes a **real Supabase session cookie** (`sb-*-auth-token`). The access-code flow (`src/components/AccessGate.tsx` → `src/lib/privateAccess.ts` → `POST /api/auth/access-code`) mints a **different** cookie, `nxt_admin_session` (`src/lib/server/admin-session.ts`). The middleware never looks for that cookie name.

**Exact repro (local, no credentials of any kind):**
```
$ curl -o /dev/null -w "%{http_code} %{redirect_url}" http://localhost:3000/admin
307 http://localhost:3000/login?next=%2Fadmin
```
The AccessGate component — the "type the operator code" screen — never gets a chance to render, because the request is bounced to `/login` before Next.js reaches the page at all. This affects `/admin` and every `/admin/*` subpage (deals, invites, commissions, vendors, applications, directory, match, requests, marketplace).

**Practical read:** if the operator is signed in to a real Supabase account whose `platform_users.role` is `admin`/`super_admin`, none of this matters — they never see `/login` in the first place. But an operator who intends to use *only* the access code (the mechanism the STATE doc and `ADMIN_ACCESS_CODE` env var strongly imply is meant to work standalone) currently cannot reach the code-entry screen at all on a fresh, signed-out browser. This is not a new regression from anything built in this session — `git log --follow -- src/middleware.ts` shows the `AUTH_PAGES` block has been present since the repo's baseline merge commit (`eaa2592`) — but it is live in this codebase today and worth a deliberate decision (either the middleware should also accept `nxt_admin_session`, or the access-code path should be considered retired in favor of always requiring a Supabase admin account).

### 12–13. Suspended/banned vendor — session and storefront

`src/app/vendor/portal/page.tsx` lines 436–458: on `moderation_status ∈ {suspended, banned}`, the portal deliberately does **not** sign the vendor out or block login — comment: *"don't lock them out (they may need to dispute it)"* — instead it swaps the whole editor for a fixed screen ("Your account is currently under review" / "has been closed"), shows the reason if one was logged, shows the `suspended_until` date if timed, and gives a support-email dispute path. Sign-out button still works normally from that screen.

`src/app/api/marketplace/vendor/[id]/route.ts` lines 22–27: the public storefront route calls `autoReactivateIfExpired()` then returns a flat `404 {"message":"This vendor is not currently available."}` for anything not `active` — a suspended/banned vendor's storefront is genuinely unreachable, not just hidden by the UI.

### 14. The gap: suspended vendor's *listings* survive everywhere except the storefront

Checked every public marketplace read path for a moderation-status check:
```
$ grep -rl "isRestricted\|effectiveModeration\|moderation_status" src
  src/lib/requests/dispatch.ts            ✓ excludes restricted vendors
  src/app/api/marketplace/vendor/[id]/route.ts   ✓ 404s restricted vendors
  ... (5 more, all in admin/vendor-portal code)
```
`src/app/api/marketplace/listings/route.ts` (general `/marketplace` search/browse) and `src/app/api/marketplace/listings/[id]/route.ts` (a single listing's detail page) both query only `.eq('status', 'published')` on `marketplace_products`/`marketplace_services` — **no join or filter against the owning vendor's `moderation_status` at all.** `src/app/api/marketplace/request/route.ts` (both the single-listing form and the quote-cart bundle path) looks up the listing the same way and inserts a `quote_requests` row + fires the vendor notification/email without checking whether that vendor is suspended or banned.

**Net effect:** a suspended vendor's individually-viewed storefront (`/api/marketplace/vendor/[id]`) is properly hidden, and they're properly excluded from *new* RFQ auto-matching (`dispatchRequestToVendors`) — but their already-published products/services still show up in ordinary marketplace search and category browsing, and a buyer who finds one and requests it directly still successfully creates a lead and notifies/emails the (suspended) vendor. This is a real, reproducible gap between the three code paths that are supposed to enforce the same rule.

### 15. `/api/vendors/signup` — orphaned route

`grep -r "api/vendors/signup" src` only matches the route file itself and a comment in `src/lib/vendor/profile.ts`; no page or component calls it. It's a correctly-written organic-signup endpoint (click-wrap gated, uses the shared profile creator) that simply isn't wired to any current UI — the live organic vendor doors are `/vendor-signup` (via `/api/auth/signup`) and legacy `/vendor-login`. Purely informational: not broken, but a future maintainer could reasonably assume it's live and be wrong, or duplicate its logic elsewhere by mistake.

---

## Issues ranked by demo-embarrassment risk

1. **`/admin` is unreachable on a fresh, signed-out browser (§11).** If Cesar ever demos the operator console starting from a clean browser/incognito window and tries to use the access code the way the product is documented to work, he gets bounced to `/login` with no way to enter the code — the single most visible thing that could go wrong live in front of someone. Trivial to avoid *in a demo* (stay signed in to an admin Supabase account beforehand), but it will look broken if triggered.
2. **Two welcome-email templates still promise the old "$1,250 × 2 deals" credit** (found while cross-checking §1's approval emails against `DECISIONS-2026-07-21.md` §5 — not this report's primary scope, but adjacent and worth flagging here too since it's an account-lifecycle email). If a vendor is approved live during a demo and reads the email over Cesar's shoulder, it contradicts the policy he'd state verbally. Full detail and the exact files are in the runbook, §4.4 and §7.
3. **A suspended vendor's listings are still buyable through general search (§14).** Lower visibility risk day-to-day (requires deliberately suspending someone mid-demo and then searching for their old listing), but it's the kind of thing that looks bad if a suspended vendor emails a buyer "hey, I'm still getting your quote requests" after being told they were cut off.

All three are documented for engineering with exact files/lines above and in the runbook's Appendix; no code was changed to produce this report.
