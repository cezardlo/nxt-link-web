# NXT//LINK performance audit — five founder concerns

**Date:** 2026-07-22

**Scope:** read-only code audit; no runtime/product code changed

**Stack inspected:** Next.js 14.2.35 App Router, React 18, Supabase, Vercel

## G1 mini-spec

1. Test the five founder concerns against code instead of treating them as facts.
2. Separate verified defects, partial truths, and non-findings.
3. Do not touch the fee engine or money rules.
4. Do not add compression middleware without deployed-header evidence.
5. Find database work performed serially inside bounded/unbounded loops.
6. Find independent client requests that form avoidable waterfalls.
7. Identify where optimistic UI exists and where safe rollback is missing.
8. Distinguish dynamic HTML rendering from client hydration/data-fetch delay.
9. Treat authenticated caching as a correctness/security boundary, not only speed.
10. Produce an ordered backlog that can be implemented and measured in small gates.

## Bottom line

The concerns point in the right direction, but the literal claims are not all
true. NXT//LINK already batches several reads/writes, parallelizes many API
queries, and uses optimistic state for cart and some decisions. Compression is
provided by the framework/deployment layer. The verified problems are narrower:
two N+1 RFQ fan-out paths, dashboard fetch waterfalls, almost no business-route
latency instrumentation, inconsistent optimistic behavior, excessive client-side
rendering, broad dynamic API declarations, and a dangerous blanket public-cache
header over every API route.

## 1. “JSON goes over the wire uncompressed” — not established

- `next.config.mjs` does not disable `compress`; Next.js compression is on by
  default. Vercel also performs platform transfer optimization.
- JSON source size is not the same as transferred size. The deployed response
  headers (`Content-Encoding`, `Content-Length`, cache status) are the evidence.
- **Action:** verify representative public and authenticated endpoints after the
  next preview deploy. Do not add custom gzip/Brotli middleware now.

## 2. “Rows are inserted one at a time” — confirmed in two hot fan-out paths

Already good:
- Buyer cart replacement sends one array to `.insert(...)`.
- Legal acceptances build an array and insert once.
- Many independent reads use `Promise.all`.

Needs work:
- `src/app/api/marketplace/request/route.ts::handleBundle` loops by vendor and
  awaits one `quote_requests` insert plus one notification insert per vendor.
- `src/lib/requests/dispatch.ts::dispatchRequestToVendors` loops through up to
  eight vendors. For each it awaits a duplicate query, lead insert, and
  notification insert before moving to the next vendor.

Recommended shape:
1. Read all existing `(request, vendor)` links once.
2. Build missing lead rows in memory.
3. Insert all leads in one statement (with a DB uniqueness constraint/upsert for
   idempotency, rather than application-only duplicate checks).
4. Insert notification rows in one batch or bounded parallel work.
5. Send emails after persistence using bounded concurrency; never make an email
   provider the transaction's critical path.

## 3. “One dependency is 90% of latency” — measurement gap, not a finding yet

- `src/lib/llm/parallel-router.ts` records provider latency.
- Core marketplace, project, auth, Supabase, mail, and document flows do not
  expose comparable per-stage timing.
- Without production p50/p95/p99 and a request breakdown, naming Supabase,
  Resend, Zoho, an LLM, or Vercel as the bottleneck would be guesswork.

Add a small timing standard:
- One request ID from browser → route → logs.
- Structured durations for auth, DB reads, DB writes, external providers, and
  total route time.
- `Server-Timing` on non-sensitive preview/admin diagnostics.
- Vercel Web Analytics is present; add real-user performance monitoring/Speed
  Insights only after confirming the data-retention/privacy choice.
- Optimize the stage dominating p95, then remeasure.

## 4. “Every action waits for the backend” — partially true

Already optimistic:
- `src/components/cart/useCart.ts` mutates local cart state immediately.
- Buyer quote accept/decline updates local state before the request.
- Vendor lead status updates locally before the request.

Blocking or reload-heavy examples:
- Buyer/vendor message bubbles appear only after POST returns.
- `src/app/projects/[id]/page.tsx` waits for a mutation, then reloads the entire
  project payload (a second network round trip).
- Demo/pilot creation and updates wait before local state changes.
- Several forms disable the whole action until persistence finishes.

Use optimistic UI when the operation is reversible and can show a pending/failed
state: messages, task additions, saves, shortlist changes, harmless status moves.
Do not optimistically declare payment, legal acceptance, commission settlement,
vendor approval, deletion, or other high-consequence actions successful.

## 5. “The server rebuilds HTML for every visitor” — wrong mechanism, real issue

- Only 2 of 41 `page.tsx` files are server components; 39 declare `'use client'`.
- No app page/layout explicitly exports `force-dynamic`; the 82 occurrences are
  primarily route handlers.
- The common experience is therefore a static/client shell followed by browser
  hydration and API calls—not necessarily per-visitor HTML reconstruction.
- Public marketplace GET APIs (`listings`, `listing detail`, `categories`,
  `suggest`, vendor storefront) explicitly force dynamic behavior even though
  much of this data could tolerate short revalidation.

Recommended split:
- Public stable content: server-rendered/ISR with explicit short revalidation and
  invalidation after listing/vendor changes.
- Personalized buyer/vendor/admin workspaces: dynamic and private.
- Interactive controls: small client islands rather than entire 700–1,500-line
  pages becoming client components.
- Parallelize independent dashboard reads immediately; consider composed
  endpoints where one screen always needs the same data.

## P0 cache-safety finding discovered during this audit

`vercel.json` currently applies this header to **every** `/api/(.*)` route:

```text
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
```

That pattern includes authenticated buyer, vendor, and admin endpoints. Even if
the current platform overrides some handler headers, the configuration is too
broad to be safe or understandable. Remove the blanket rule. Authenticated and
user-specific responses must be private/no-store. Add caching only to an explicit
allowlist of public catalog GET routes, after verifying their responses never
vary by session.

## Implementation order and success checks

1. **Cache safety:** remove blanket `/api` public caching; verify private headers
   on buyer/vendor/admin endpoints and public headers only on allowlisted catalog.
2. **Instrument:** capture route/provider/DB timings in preview; establish p50,
   p95, and p99 for browse, project load, message send, RFQ submit, and dispatch.
3. **Remove waterfalls:** parallelize buyer/vendor dashboard resources; project
   mutations update only the changed collection instead of full reload.
4. **Batch fan-out:** one duplicate read + one lead insert for matched vendors;
   bounded asynchronous notifications. Load-test 1, 8, and 50-item RFQs.
5. **Optimistic UX:** pending/failed bubbles and project items with rollback.
6. **Public rendering:** migrate one public marketplace screen to server/ISR as
   a measured pilot; compare TTFB, LCP, transferred JS, and API call count.
7. **Compression verification:** inspect deployed `Content-Encoding`; act only if
   representative JSON remains uncompressed at meaningful payload sizes.

Definition of success: no private response is publicly cacheable; the measured
p95 improves; one RFQ's database round trips do not scale linearly with matched
vendor count; safe actions feel immediate and visibly recover on failure.
