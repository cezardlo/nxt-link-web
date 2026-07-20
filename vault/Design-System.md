# Design System & App Spec v1.0 (source of truth for UI)

From the user's "NXT // LINK — Design System & App Specification" (v1.0, 2026).
Stack-agnostic. Bilingual EN/ES. **Feed this to build/customize the UI.**
When building or reskinning any screen, match these tokens exactly.

> The current codebase ships a dark "command-center" theme. The spec is a
> **light content area + dark sidebar** in violet. Reskinning toward this is
> tracked in [[Backlog]]. This note is the target.

> **Rendered originals now in-repo (2026-07-20):** Cesar's claude.ai design
> project exported the live-rendered spec + full brand kit — saved in
> `workplace/design/` (nxtlink-app-spec.dc.html, nxtlink-brand-kit.dc.html,
> nxtlink-marketplace.dc.html + 2 brand-kit PDFs). Tokens there match this
> note exactly — use those files as the pixel reference when reskinning.

## Brand kit additions (from the brand guidelines, 2026-07-20)
- **The "//" device is the owned mark** — carries the brand alone (app icon,
  avatar, favicon "NXT//"). Logo lockups: primary/light, reversed/dark,
  lockup + "Industrial marketplace" descriptor, mark + wordmark; **N/L
  monogram** on violet for compact placements. Slash is ALWAYS violet
  `#6C5CE0` (or its reversed tint). Never stretch/outline/shadow the logo;
  clearspace = cap-height of "N"; min width 96px digital.
- **Extra semantic colors** (beyond the token table): Info `#3E6FD0`,
  Verified `#6C5CE0`, Active `#0E9C8A`.
- **Taglines:** "Industrial solutions, connected." · "Discover · Compare ·
  Connect." Positioning: "A bridge, not a directory."
- **Domain used throughout brand assets: `nxtlink.co`** (app screens use
  `app.nxtlink.co`) — not purchased/confirmed yet; Cesar decision.
- 20-icon system (1.75px stroke, rounded, 24px grid): equipment, products,
  technology, services, vendors, search, matching, quotes, projects,
  messages, documents, verification, location, delivery, installation,
  warranty, support, payment, analytics, settings.
- Applications ready in the kit: business card, email signature, LinkedIn
  banner (1584×396), IG story (1080×1920), presentation cover, document
  header (for quotes/RFQs/proposals/vendor agreements).

## 1 — Foundations

### Color tokens
| Token | Hex | Use |
|-------|-----|-----|
| Violet / Primary | `#6C5CE0` | primary brand, CTAs |
| Violet Deep | `#4A3DB0` | hover/pressed, dark accents |
| Lilac / Accent | `#A99DF2` | soft accents, highlights |
| Slate / 2nd | `#3B3A4A` | secondary surfaces |
| Ink | `#141320` | primary text, dark sidebar bg |
| Text 2nd | `#615F72` | secondary text |
| Surface | `#EFEDF5` | app surface (light) |
| Border | `#E2DFEC` | hairlines, dividers |
| Warm White | `#F8F7FB` | page background |
| Success | `#2F9E6A` | success states |
| Warning | `#C68A28` | warnings |
| Error | `#CE4B43` | errors |

### Type
- **Space Grotesk** — Display 56, H1 40, H2 30 (confident headings).
- **IBM Plex Sans** — Body 16 / 14 (UI, tables, forms, descriptions).
- **IBM Plex Mono** — Data: `$12,450 · RFQ-2048 · 4–6 wks`.

### Spacing — 8-pt scale
`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`

### Radius & elevation
Radii `8 / 12 / 16`. Buttons radius `10`.

## 2 — Icons
1.75px stroke icon system.

## 3 — Components (widget library)
- **Buttons** h 32/40/48, r10 — variants: Primary, Dark, Secondary, Ghost, Small.
- **Inputs** h 44 (search h 48) — default, focused, select, "field required".
- **Checkbox · Radio · Toggle · Segmented** (e.g. Products/Services segmented).
- **Status & trust badges**: Verified identity, Insurance reviewed, Certified,
  Pending, Active, Expired, Draft.
- **Price display + match reason**: `From $480 /mo · quote to confirm` plus a
  plain-language "Matches because…" line.
- **Progress / stepper** 1–4.
- **Alerts & toasts**: success ("Quote submitted"), info/expiry ("expires in
  2 days"), error ("Upload failed — file exceeds 25MB").
- **Project stage tracker**: Vendor selected → Deposit paid → In progress →
  Buyer acceptance.

## 4 — Marketplace cards (domain components)
- **Vendor card** — logo, name, "Forklift service · El Paso, TX", rating `4.9★`,
  response `4h`.
- **Offering/Service card** — title, vendor, `From $480 /mo`, Request Quote.
- **Opportunity card** — `OPP-3041 · 92% match`, scope, location/budget/timeline,
  Interested / Not a fit.
- **Quote card** — `QT-2048 · v2 · Received`, vendor, amount `$5,760/yr`, expiry,
  warranty.
- **Project card** — title, `Comparing`, location, "5 invited · 3 quotes", next step.
- **Metric card** — big number + label (e.g. "9 Quotes to review").
- **Notification** — actor + action + time ("Axiom asked a question · 2h ago").

## 5 — Screens (each = one route)
Persistent chrome: **248px dark sidebar + 66px top bar**. Content **max-width
1120–1200px**, **32px page padding**, **16–24px card gaps**.

1. **Marketplace Home** — sidebar (Home/Search/Projects/Quotes/Messages),
   "Describe a problem…" search, category chips (Equipment/Products/Technology/
   Services/Logistics/Staffing), Create Project.
2. **Search Results** — segmented All/Equipment/Services, vendor+offering cards
   with match reasons.
3. **Vendor Profile** — header (logo, name, Verified/Insured), tabs
   **Overview · Offerings · Proof · About**.
4. **Buyer Dashboard** — metric cards (Active projects, Quotes to review,
   Vendors matched) + project list with stage.
5. **Quote Comparison** — table across vendors (Total, Warranty, …) — best value
   highlighted (see soft-blue rule in [[Decisions]]) + fill bars.
6. **Vendor Dashboard** — metrics (Opportunities, Quotes to send, Profile %),
   opportunity list.
7. **NXT//LINK Operator** (admin) — Awaiting review, No matches, Quotes overdue,
   Disputes; vendor-stage pipeline.
8. **Create-Project Wizard** — 8 steps ("Step 2 of 8: What problem are you
   solving?"), Back / Save & continue.
9. **Project Deal Room + Messaging** — tabs **Messages · Tasks · Quote ·
   Payments**; system messages attach quotes.

## 6 — Design states (every state has ONE clear next action)
- **No results** → "Try broader terms or let us find it." → *Create a project*.
- **Empty** → "No quotes yet — invite vendors." → *Invite vendors*.
- **Expired quote** → "QT-2044 expired. Request a revision." → *Request revision*.
- **Offline** → "Connection lost. Draft saved locally." → *Retry*.

## Code hooks
- Tokens mirrored in `tailwind.config.ts` (`spec` color namespace) and
  `src/app/globals.css` (`--spec-*` CSS variables) so components can adopt them.
- Fonts: Space Grotesk + IBM Plex Sans + IBM Plex Mono.
