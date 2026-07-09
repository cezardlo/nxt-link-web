# NXT//LINK — What's still missing before real users (launch gap checklist)

Date: 2026-07-08. Plain-terms audit of everything the web app still needs to
work like a real product. ✅ = exists today, 🟡 = partial, ❌ = missing.

## A. Accounts, login & security (the "authenticator" stuff)

1. ❌ Forgot password / password reset (locked-out users have no way back in)
2. ❌ Change password / change email from a settings page
3. ❌ Account settings page at all (buyers and vendors)
4. ❌ Sign in with Google / Microsoft (one-click login)
5. ❌ Two-factor authentication (2FA) option
6. ❌ Server-side route protection (pages check login in the browser only;
   direct API knowledge could probe routes — add middleware redirects)
7. ❌ Session expiry handling (stale sessions can look "logged in" but fail)
8. ❌ Account deletion / data export (privacy law basics)
9. 🟡 Email verification works, but the confirmation email uses Supabase's
   default sender — low hourly cap, lands in spam; needs real SMTP + branding
10. ❌ Production redirect URL allowlist (confirmation links break on the
    deployed site until the domain is allowlisted in Supabase)
11. ❌ CAPTCHA / abuse protection on signup and quote forms (honeypot exists)
12. ❌ Remove/gate the demo login button before real launch
13. ❌ Operator/admin role management UI (roles are granted by hand in the DB)

## B. Buyer side

14. ❌ Buyer company profile (name, company, role, location)
15. ❌ Saved listings tied to the account (currently saved only in the
    browser — lost if they switch devices)
16. ❌ Notifications: in-app + email when a quote arrives, a message arrives,
    a pilot is scheduled (buyer must re-open the dashboard to notice)
17. ❌ "Post a need" open RFQ (Alibaba-style: describe need → matched vendors
    quote; /intake exists but doesn't route to vendors)
18. ❌ Compare tray persistence + compare page URL you can share
19. ❌ Buyer-side file attachments (drawings, spec sheets) on requests/chat

## C. Vendor side

20. 🟡 Category-specific listing templates (blueprint §7/§8 fields exist in
    data but the editor doesn't require/expose them all)
21. ❌ Listing completeness meter + publish validator ("your listing is 60%
    complete — add warranty info to rank higher")
22. ❌ Vendor analytics (views, saves, quote requests per listing)
23. ❌ Real-time lead alerts (email exists; no in-app badge/unread counts)
24. ❌ Team members (multiple logins per vendor company)
25. ❌ Vendor onboarding wizard (guided: logo → profile → first listing →
    terms → publish; today it's scattered across pages)
26. ❌ Storefront extras (banner image, featured listings order)
27. 🟡 Credential verification workflow (insurance/cert docs with expiry
    dates, reviewer, badge automation — blueprint §5 tokens)

## D. Deal flow (quotes, chat, pilots, commissions)

28. 🟡 Chat: works, but no live updates (must reopen), no attachments, no
    unread indicators, no email notification on new message
29. ❌ Quote revisions / counter-offers (versioned quote history)
30. ❌ Purchase record after acceptance (PO number, invoice reference,
    delivery/implementation status — deal "won" is the current end)
31. ❌ Commission invoicing/collection (commissions are recorded, but there's
    no flow to actually bill the vendor and mark it paid)
32. ❌ Off-platform deal reporting (vendor agreement requires reporting closed
    deals; no form/flow for it)
33. ❌ Dispute flow (buyer says the delivery didn't match the quote → ?)
34. ❌ Advisor path wired in ("Ask an NXT//LINK advisor" on listings/compare
    connecting to the operator queue)

## E. Operator/admin

35. ❌ Deal pipeline dashboard (all opportunities, quotes, commissions,
    protected periods in one view)
36. ❌ Commission ledger + exports (what NXT//LINK is owed, by whom, status)
37. ❌ Review moderation queue (hide abusive reviews; reviews table supports
    'hidden' but no UI)
38. 🟡 Report-a-listing triage exists; needs status workflow + notifications
39. ❌ Vendor credential review queue (approve insurance/certs, expiry alerts)

## F. Payments (intentionally later — needs legal first)

40. ❌ Legal/accounting decisions (seller of record, taxes, refunds)
41. ❌ Payment provider integration (ACH/invoice for industrial; escrow-style
    buyer protection like Alibaba Trade Assurance)
42. ❌ Milestone payments, refunds, chargebacks, payouts

## G. Legal & policies

43. 🟡 Vendor terms exist as plain-language draft — needs attorney review
44. ❌ Buyer terms, Privacy policy, Cookie policy pages (public, versioned)
45. ❌ Terms acceptance records for buyers (vendors have it; buyers see only a
    disclosure line)

## H. Technical / production readiness

46. ❌ Production environment variables on Vercel (the local .env.local keys
    must be added to the hosting dashboard or the deployed site is dead)
47. ❌ Repo-wide lint fails + build ignores TypeScript/ESLint errors
    (next.config.mjs flags) — hides future breakage
48. ❌ End-to-end tests (Playwright buyer/vendor/operator journey) and route
    authorization tests
49. ❌ Error monitoring (Sentry) + uptime alerts; currently failures are silent
50. ❌ SEO: listing/storefront meta tags, sitemap, OG images (today's pages are
    client-rendered with no per-listing SEO)
51. 🟡 Bilingual: intake is EN/ES; marketplace, dashboards, emails are EN-only
52. ❌ Server-side search pagination (loads max 60 listings, filters in the
    browser — fine now, breaks at scale)
53. ❌ Image optimization (next/image), loading performance pass
54. ❌ Database backups/staging strategy (one shared live DB, demo rows mixed
    in; delete (DEMO) rows before pilot)
55. ❌ Branded transactional email templates (current emails are plain text)

## The 10 that matter first (recommended order)

1. Forgot password + account settings (A1-A3) — users WILL get locked out
2. Real SMTP + branded emails + prod redirect allowlist (A9, A10, H55)
3. Notifications for quote/message/pilot events (B16, D28)
4. Purchase record + commission invoicing (D30, D31) — closes the money loop
5. Saved listings on the account (B15)
6. Listing completeness meter + category templates (C20, C21)
7. Operator deal pipeline + commission ledger (E35, E36)
8. Server-side route protection middleware (A6)
9. Vercel production env vars + remove demo login at launch (H46, A12)
10. Buyer terms/privacy pages + attorney review of vendor terms (G43-G45)
