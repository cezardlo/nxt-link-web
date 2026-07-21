# Contact-flow reconnaissance (read-only scout, 2026-07-21)

Input brief for Wave 1 task #5 (contact-flow verify/polish). Produced by a read-only exploration pass; no code was changed. File:line refs verified against the tree as of commit `80af48f`.

Two parallel deal-start paths exist, converging on `quote_requests` (= the vendor leads inbox):
**A. Self-service** — buyer picks a listing → sidebar form on `src/app/marketplace/[kind]/[id]/page.tsx` (`#quote`, 5 request types) → `POST /api/marketplace/request` → one `quote_requests` row (vendor_id taken from the listing row, never from the client) → vendor notified in-app AND by email.
**B. Assisted RFQ** — `/intake` conversational form → `POST /api/platform/requests` → `client_requests` row → `dispatchRequestToVendors` (`src/lib/requests/dispatch.ts` + `src/lib/matching.ts`: approved vendors, category weight 62 + service-area 28, score ≥ 20, top 8) → idempotent `quote_requests` per match → **in-app notification only**.

Verified CORRECT (do not regress):
- Buyer contact hidden pre-acceptance: `api/vendor/leads/route.ts:66-74` nulls email/phone + `contact_hidden:true` until `buyer_decision === 'accepted'`; buyer-profile card attached only for accepted deals; amber unlock notice at `vendor/leads/page.tsx:280-282`; chat + quote messages masked via `src/lib/guard.ts`.
- Accept is buyer-side (`api/buyer/quote-decision`): sets won, flips commission, notifies vendor (in-app + email), drafts `manual_deals` row.
- No off-platform contact button anywhere (by design). No dead forms; no TODO/stub markers in the flow.

## Gaps / risks (candidate scope for task #5)

1. **Assisted-RFQ dispatch sends NO vendor email** — `dispatch.ts:103-109` is in-app only; the single-listing path does email. Matched vendors who aren't watching /vendor/leads never learn about the lead.
2. **EN-only across the whole contact flow** — only `/intake` is bilingual. Listing detail, vendor storefront, buyer dashboard, vendor leads inbox are hardcoded English; `LanguageToggle` exists but is unused on these pages. Big deal for the El Paso/MX border demo.
3. **Vendor storefront "Request a quote" dead-ends** when the vendor has no listings (falls back to `/marketplace`, buyer intent lost) — `marketplace/vendor/[id]/page.tsx:193,305`.
4. **Dispatch gates on `vendor_profiles.status === 'approved'`** (`dispatch.ts:52`) while other code uses `moderation_status` — if live/seeded vendors don't literally have `status='approved'`, RFQ fan-out silently matches zero vendors. Verify before demo.
5. **All email is fire-and-forget** — every `sendMail` is `.catch(() => {})` and `mail.ts` swallows internally (Resend → Zoho fallback). Unconfigured keys = every notification vanishes with zero logging. At minimum add server-side logging on failure (policy: no silently swallowed errors).
6. **Anonymous listing-request senders can't track replies** (no auth on `/api/marketplace/request`; buyer dashboard needs verified email). Demo-flow trap, not a bug.
7. **Phone-mask false positives** — `guard.ts` masks any 7+ digit run; long part numbers / PO numbers in pre-acceptance chat get replaced with the "[hidden until accepted]" text. Cosmetic but confusing.

Notifications inventory: unified sender `src/lib/mail.ts` (Resend, Zoho fallback); in-app via `src/lib/notify.ts` → `notifications` table + bell UIs; crons only cover invite reminders + profile nudges (nothing in the lead/quote flow — dispatch is synchronous).
