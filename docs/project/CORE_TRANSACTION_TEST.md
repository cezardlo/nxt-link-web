# Core Transaction — Written Test Script

The MVP is done when this script passes in staging with three personas and no
manual database edits. Status column verified 2026-07-08.

Personas: BUYER buyer-test@…, VENDOR vendor-test@…, OPERATOR (admin role
granted via platform_users).

| # | Step | Expected | Status today |
|---|---|---|---|
| 1 | BUYER creates account at `/signup`, confirms email, signs in | Lands on buyer surface; email shows verified | PASS (pending Supabase redirect-URL config) |
| 2 | BUYER describes a need at `/intake` | Request saved with status "new"; visible to operator | PASS (intake persists; operator sees it in `/admin/requests`) |
| 3 | BUYER opens their dashboard | Sees their request(s) + status | BUILT — `/buyer` lists the signed-in buyer's intake requests + marketplace quote requests (matched by verified email) and saved listings; login routes `client` role here. Pending live buyer-persona verification (needs a verified buyer with existing requests). |
| 4 | OPERATOR reviews the request, drafts an anonymized RFQ packet | Packet stored; buyer identity stripped | FAIL — no RFQ packet persistence/UI |
| 5 | BUYER reviews and approves the exact packet + vendor shortlist | Approval recorded with timestamp | FAIL — not built |
| 6 | OPERATOR sends the RFQ to the selected vendors only | Assignments created; non-selected vendors see nothing | FAIL — no tables (unapplied 20260705 migration) |
| 7 | VENDOR sees only assigned opportunities; submits a structured quote | Quote stored; buyer identity still hidden | FAIL — `/vendor/quotes` UI exists but has no tables under it |
| 8 | BUYER compares quotes side by side; requests revision or meeting | Comparison renders; revision request logged | FAIL — not built |
| 9 | Consent + NDA/MNDA/NCA gates satisfied -> identity reveal | Reveal blocked until gates pass; every reveal logged | FAIL — no tables (unapplied 20260707 migration) |
| 10 | Both parties acknowledge the disclosed success fee (before intro and before acceptance) | Acknowledgments recorded against the versioned fee policy | FAIL — no tables |
| 11 | OPERATOR advances the deal (demo → pilot → selection → implementation / closed-lost) | Stage changes logged with actor + timestamp | FAIL — not built |
| 12 | Isolation check: VENDOR B cannot read VENDOR A's quotes/leads/documents; BUYER cannot see vendor-private data | All cross-tenant reads denied (API + RLS) | PARTIAL — marketplace/leads scoped; quote/deal tables don't exist yet |

## Implementation order (fix where the script first fails)
1. **Step 3:** buyer dashboard (`/buyer` — list my requests + statuses). DONE
   (code); matches by verified buyer email since there is no `buyer_id` FK yet —
   a proper account link is a P3 follow-up (needs migration + approval).
2. **Steps 6/7/9/10 prerequisite:** rename-collision fix in
   `20260705_quotes_deals_private_comparison.sql`, audit
   `20260707_agreements_consent_fees.sql`, apply both to staging (P0 staging
   decision first).
3. Steps 4-5 (RFQ packet + approvals), then 6-8, then 9-11, then the
   authorization/RLS tests and Playwright run for all 12 rows.
