# Deploy NXT//LINK live (for terminal Claude / Cesar)

The web session that built this is **blocked by security policy from pushing**,
so the final "go live" step has to run from your own machine. This folder is
the **complete, current app** (all features + the shared `vault/`). It builds
clean (`npm run build`, Next 14).

You already have a Vercel project **`nxt-link-web`** (team *cezardlo's
projects*) connected to GitHub `cezardlo/nxt-link-web`, and it holds your
Supabase env vars. So either path below puts the real app live with your keys.

## Easiest: deploy straight to Vercel (no GitHub needed)
```bash
cd <this-folder>
npm install
npx vercel link        # pick the existing "nxt-link-web" project
npx vercel --prod      # builds with the project's existing env vars → live URL
```
Live at: https://nxt-link-web.vercel.app

## Or: push to GitHub and let Vercel auto-build
```bash
cd <this-folder>
git init 2>/dev/null; git add -A
git commit -m "NXT//LINK marketplace: features + vault"
git remote add origin https://github.com/cezardlo/nxt-link-web.git 2>/dev/null
git push -u origin HEAD:claude/website-functionality-trd0mu
```
Vercel builds a preview at
`https://nxt-link-web-git-<branch>-cezardlos-projects.vercel.app`.

## Make it FULLY functional — set these once (terminal Claude: do this)

Do this on the existing Vercel project **nxt-link-web** (team: cezardlo's
projects). Known public values are filled in below; the ones marked **ASK** are
secret — ask Cesar for them (don't guess, don't commit them).

### A) Environment variables (Vercel → Settings → Environment Variables,
or `vercel env add <NAME> production`)

REQUIRED
- `NEXT_PUBLIC_SUPABASE_URL` = `https://yvykselwehxjwsqercjg.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2eWtzZWx3ZWh4andzcWVyY2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTg3MzMsImV4cCI6MjA4NzQzNDczM30.e7NeSgWXlGkVgIOrRxivYwc9BaczCJ0QaA0XoNh0HqQ`  (public/safe)
- `SUPABASE_SERVICE_ROLE_KEY` = **ASK** — Supabase dashboard → Project Settings →
  API → `service_role` secret. Powers admin panel, demo logins, moderation.
- `ADMIN_ACCESS_CODE` = **ASK** — Cesar picks a strong code; unlocks `/admin`.

OPTIONAL (each feature falls back gracefully if absent)
- AI writing helpers: set ONE provider, e.g.
  `OPENAI_API_KEY` = **ASK** and `NXT_LINK_LLM_PROVIDER` = `openai`
  (or `GEMINI_API_KEY` = **ASK** and `NXT_LINK_LLM_PROVIDER` = `gemini`)
- `CRON_SECRET` = **ASK** — protects the daily profile-nudge email job.
- Zoho email (vendor outreach + welcome emails): `ZOHO_CLIENT_ID`,
  `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_MAIL_ACCOUNT_ID`,
  `ZOHO_FROM_ADDRESS` = **ASK**.

After setting variables, redeploy so they take effect: `vercel --prod`.

### B) Supabase Auth — fixes sign-up / login emails
Supabase dashboard → Authentication → URL Configuration:
- **Site URL** = `https://nxt-link-web.vercel.app`  (or the custom domain)
- **Redirect URLs** → add `https://nxt-link-web.vercel.app/**`
- (Recommended) Authentication → Emails → set up **custom SMTP** so confirmation
  emails actually arrive instead of being rate-limited.

After A + B and one `vercel --prod`, the site is fully functional.

## What's inside (highlights)
- Fee engine: 5% first $50k + 3% above, capped $20k (`src/lib/fees/engine.ts`)
- NXT AI: onboarding concierge + admin commission co-pilot
- Homepage search + "Post a request" RFQ + how-it-works
- Search autocomplete (product / service / category)
- Compare tables with price + timeline **fill bars**
- Vendor portal: profile-strength meter, auto-save, AI "write my description",
  EN/ES toggle, "view as a buyer"
- Admin vendor moderation (suspend / ban / reactivate + audit log)
- Demo logins: vendor `demo-services@nxtlink-demo.example`, buyer
  `demo-buyer@nxtlink-demo.example`, password `NxtDemo2026!`

## Fastest way to just LOOK at it (local, no deploy)
```bash
cd <this-folder>
npm install
npm run dev      # open the http://localhost:3000 link it prints
```
A `.env.local` with the PUBLIC Supabase settings is already included, so the
marketplace, search, and vendor storefronts load real data immediately.

## Environment keys (what's where)
- **Included in this folder** (`.env.local`): `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public, safe, enough to browse.
- **NOT included (secret, by design):** `SUPABASE_SERVICE_ROLE_KEY` powers the
  admin panel, demo logins, and vendor moderation. It already lives in the
  Vercel project `nxt-link-web`, so the **deployed** site has full power
  automatically. For full power **locally**, add your own service-role key
  (Supabase dashboard → Project Settings → API) to `.env.local`.
- Optional LLM keys (NVIDIA/Gemini/OpenAI) enable the AI writing helpers;
  without them those helpers fall back to built-in templates — nothing breaks.

## Notes
- When deploying with `vercel --prod`, Vercel uses the **project's** stored env
  vars (which include the secret key) — not this `.env.local`. So the live site
  is fully powered. If any var is missing on Vercel, set it in the Vercel
  dashboard → nxt-link-web → Settings → Environment Variables.
- Optional tidy-up not yet applied here: deleting the dead `src/lib/intelligence`
  legacy code. It doesn't affect what users see. See `vault/Backlog.md`.
