# Map — where things live

**Stack:** Next.js 14 (App Router) + TypeScript + Supabase (Postgres, Auth,
Storage, RLS) + `@supabase/ssr`. Live Supabase project: `yvykselwehxjwsqercjg`.

## Live marketplace surfaces (the real product)
- `/marketplace` — public browse + search + autocomplete + faceted filters
- `/marketplace/vendor/[id]` — vendor storefront (compare table + fill bars,
  owner "View as a buyer" banner)
- `/vendor/portal` — vendor self-service: profile, Profile Strength meter,
  auto-save, AI "write my description", NXT AI onboarding concierge, EN/ES
- `/vendor/listings`, `/vendor/quotes`, `/vendor/leads` — vendor tools
- `/projects/[id]` — buyer project workspace (quote compare table + fill bars)
- `/intake` — "Post a request" RFQ page
- `/admin/vendors` — vendor moderation (Active / Suspended / Banned)
- `/admin/deals` — deal log + NXT AI Commission Co-pilot
- `/admin/applications` — vendor application review (auto welcome email)

## Key backend files
- `src/lib/fees/engine.ts` — commission math. See [[Fees]].
- `src/lib/vendor/moderation.ts` — suspend/ban/reactivate logic + audit.
- `src/lib/assistant/llm.ts` — `aiDraft()` used by NXT AI features.
- `src/app/api/vendors/manage/route.ts` — vendor admin actions + audit log.
- `src/app/api/admin/deals/assist/route.ts` — Commission Co-pilot parse+compute.
- `src/app/api/vendor/onboard/concierge/route.ts` — onboarding drafts.
- `src/app/api/marketplace/suggest/route.ts` — search autocomplete.
- `src/app/api/demo/login/route.ts` — demo vendor/buyer bypass logins.
- `src/app/api/cron/profile-nudges/route.ts` — 24h/72h profile emails.

## Dead / legacy (do NOT treat as active)
- `src/lib/intelligence/*` (Obsidian import, el-paso-brain, orchestrator).
- Many old `src/app/api/*` routes: `agents`, `brain`, `intel*`, `signals`,
  `observer`, `knowledge-graph`, `world`, `conferences`, etc.
- Old pages: `/briefing`, `/intel`, `/map`, `/command`, `/signals`, `/explore`…
- `archive/` — old Python systems. Reference only.

## Demo logins
Vendor: `demo-services@nxtlink-demo.example` · Buyer:
`demo-buyer@nxtlink-demo.example` · Password: `NxtDemo2026!`
