# Project — what NXT//LINK is

**NXT//LINK** is a bilingual (EN/ES) **B2B industrial marketplace** for the
**El Paso–Juárez Borderplex**.

- **Buyers** = warehouses / manufacturers looking for equipment, products,
  technology, or services.
- **Vendors** = companies that sell those things.
- **NXT//LINK** connects them and earns a **commission** on closed deals.
- It also helps buyers/vendors make contact and get help operating in the
  border region.

## Positioning (Cesar, 2026-07-20 — the north star)
- **Amazon**: search, compare, and purchase products.
- **Fiverr**: find and communicate with service providers.
- **Alibaba**: connect buyers with suppliers, request quotes, handle larger
  business deals.
- **NXT//LINK = all three combined**, then adds **contracts, alerts,
  documents, communication, and long-term relationship tracking**.

The last five are the moat: a buyer whose contracts, files, message history,
and reorder habits live here doesn't leave. Every feature decision should
strengthen at least one of them.

## Core user flows
- Vendor: sign up → build storefront/profile → get leads → send quotes.
- Buyer: search / post a request (RFQ) → compare vendor quotes → accept.
- Admin: review vendor applications, moderate vendors, log deals, track fees.

## Design rules
- **No dark patterns.** No countdown timers / fake scarcity. Static dates only.
- Bilingual everywhere (EN/ES toggle).
- Make comparing easy: compare tables with **fill bars** (price / timeline).
- Vendors can preview "View as a buyer" (like LinkedIn's view-as).

## Not part of the product anymore
The old "intelligence / signals / brain" system (`/briefing`, `/intel`,
`/map`, `/command`, Obsidian import) is **removed from the product**. Leftover
dead code may still exist in the repo but nothing live uses it. See [[Map]].
