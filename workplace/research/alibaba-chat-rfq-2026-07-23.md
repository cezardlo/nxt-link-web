# Alibaba Chat / RFQ / Pilot / Supplier-Page Benchmark (from Cesar, 2026-07-23)

**Dept: ENGINEERING + DESIGN.** Source: Cesar's Alibaba research (Chat Now, RFQ
templates, pilots/samples, supplier pages). Customer-facing copy + any trust
claim = marketing-drafted + Cesar-approved per [[approval-and-marketing-emails]].

## ✅ ALREADY BUILT / DESIGNED in NXT//LINK (don't rebuild — verify/polish)
- **Buyer↔vendor chat** — EXISTS + just upgraded to live-polling (commit 1c9dc12,
  pending promote). `messages` table, buyer/vendor message APIs, chat UI in
  /vendor/leads + /buyer.
- **Contact-masking / keep-it-on-platform** — EXISTS (src/lib/guard.ts), masks
  email/phone/URLs until quote accepted. This IS Alibaba's "no contact info
  until deal" pattern.
- **RFQ / quote flow + structured comparison** — EXISTS (/intake questionnaire →
  /api/platform/requests → dispatch to vendors; QuoteCompare comparison).
- **Pilot concept** — EXISTS in the data model (`pilot` block on listings).
- **Verified badges, certifications, gallery, case studies, team photos** —
  EXIST on vendor storefront (/api/marketplace/vendor/[id]).

## 🟢 GENUINELY NEW & worth adopting (ranked)
1. **Persistent "Message vendor" entry point ON listing + storefront pages** —
   today chat lives in the dashboards; add a clear "Chat with this vendor"
   button on the product/service detail + vendor storefront that opens the
   existing thread. High value, moderate effort.
2. **EN↔ES auto-translation in chat** — Borderplex is bilingual; auto-translate
   buyer/vendor messages. Genuinely differentiating, real Borderplex fit.
3. **Structured cards in the chat thread** — vendor sends a "Quote" / "Request
   Demo" / "Request Pilot" card inside chat (ties chat → existing quote/RFQ).
4. **File/image attachments in chat** (spec sheets, CAD, site photos) — must run
   through the same masking/anti-bypass rules; storage + RLS scoping needed.
5. **Response-time / online status** — ONLY once there's real data (no fake %).
6. **Native "Request Demo" (calendar) + richer "Request Pilot" form** — reduces
   off-platform leakage vs Alibaba's chat-to-WhatsApp problem.

## 🔴 CONFLICTS — do NOT ship (same standing rules)
1. **ESCROW / "Trade Assurance" / "escrow with milestones" / "transact securely"
   — BANNED.** We don't hold funds. Substitute real protections (verified,
   protected intros 12mo, on-platform messaging, human vetting).
2. **Fabricated transaction/performance stats** — "$1.5M in transactions",
   "94.7% response rate", "transaction history counter", "On-time delivery %",
   "Projects completed" — we have ~0 real closed deals. Show REAL numbers or
   omit; never fabricate. (Alibaba's counters are their real data + partly paid
   badges — not a model to copy with invented figures.)

## Note on where this overlaps the landing benchmark
See [[landing-benchmark-2026-07-23]] — same escrow + invented-stats conflicts.
The FEATURE ideas (chat widget, translation, cards) are safe; the TRUST-NUMBER
and ESCROW framing is not.
