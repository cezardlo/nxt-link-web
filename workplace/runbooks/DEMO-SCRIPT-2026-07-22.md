# NXT//LINK Live Demo Script — 2026-07-22

Demo from **https://nxt-link-web.vercel.app** (production, AFTER the promote).
Do NOT demo from the preview URL — vendor names render as placeholders there.

## Pre-demo prep (~10 min, in this order)

1. **Go live** (terminal):
   `cd C:\Users\Cesar\Desktop\nxtlink-LIVE-ready-v2` then `npx vercel --prod --yes`
   (No database steps needed — everything is already applied.)
2. **Glance the homepage + marketplace on the laptop** once it's live
   (~2 min after the command finishes).
3. **Phone check (2 min):** open the site on your phone — homepage,
   marketplace, and a vendor page. Hamburger menu should open/close, nothing
   spilling off-screen. (I could not emulate phone widths from here today.)
4. **Sign in as admin on the laptop and STAY signed in** (/admin needs a live
   session).
5. **Create the stage QR:** /admin/invites → new invite (any name like
   "Conference guest") → the QR appears on the page. Keep the tab open, or
   screenshot the QR into your slides.
6. Open tabs left→right: Home · /marketplace · /admin/invites ·
   /admin/vendor-applications.

## Act 1 — Buyer story (3 min)

1. Homepage: headline, search, categories. **Flip EN→ES live** — the whole
   site follows and stays in Spanish across pages. Flip back.
2. Type a need in the "describe what you need" card ("necesito mantenimiento
   para 6 montacargas" works too) → lands in the assistant, same clean look.
3. /marketplace → open a listing → point at photos, specs, Request-a-Quote
   panel. Add it to the quote list; add a second listing; show the cart —
   "one bundled request, one quote back, one deal."
4. ⚠️ Only click **Send request/Submit** if you're using your own email —
   submitting fires real vendor-matching emails.

## Act 2 — Vendor story, the closer (4 min)

1. "Any supplier at a conference joins in 60 seconds." Show the QR.
2. Volunteer (or your phone) scans → tap **Continue with Google** — ANY
   Google account works, or plain email. Three fields. Done.
3. Their phone shows the vendor portal: "in review" banner + profile
   strength meter at 30%.
4. The line that lands: **"They're in — but they can't publish, can't get
   leads, and don't show as verified until WE approve the business. Easy
   door, guarded house."**

## Act 3 — Operator story (2 min)

1. Laptop: /admin/vendor-applications → the new vendor is sitting in the
   queue → **Approve** live.
2. Refresh the phone → vendor is active. "Verification was one click because
   I invited them personally. Cold signups wait for a real review."
3. Optional money slide: /admin/deals — one ledger, mismatch warnings,
   reconcile health check.

## Narrative points to weave in (from today's risk list — no code needed)

- **Focused wedge:** "We're deliberately Borderplex-first, warehouse &
  logistics first — density beats breadth at this stage." (#9)
- **Human curation:** "Our first suppliers are personally vetted — that IS
  the verification flow you just watched." (#12)
- **Honest matching:** "We never blast irrelevant vendors to fill a screen —
  verified matches or we keep looking." (#13)

## Safe to show / avoid

**Safe:** homepage, marketplace, listing detail, vendor storefront, intake,
cart, /join signup, vendor portal + all 5 vendor screens (one shared menu
now), /admin/invites, /admin/vendor-applications, /admin/deals.
**Keep brief:** /buyer dashboard (older look; works fine).
**Avoid:** archiving/removing anything live (confirms will catch you, but
still), any talk of escrow/holding funds (we never hold funds), the old
"first two deals free" line (retired — it's $250 credit on the first deal).

## If asked…

- "Why purple?" — modern system, WCAG-checked; conservative documents
  (contracts/invoices) will stay black & white.
- "What's the fee?" — 5% on the first $50k of a deal, 3% above, capped at
  $20k, vendor-side, only on closed deals. First-deal credit up to $250
  (founding vendors: up to $1,250, hand-approved).
- "Is my data safe?" — contact details are masked until a quote is accepted;
  independent security review passed today.
