# Build Spec · Vendor Onboarding & Listings (from web-Claude, pasted by Cesar 2026-07-28)

> STATUS: SAVED AS REFERENCE — not yet approved for build (feature freeze 7/27 still in effect unless Cesar says otherwise).
> ⚠️ CORRECTION vs live site: spec says fee cap "~$12.5k" — Cesar's ruling and the LIVE engine = **$20,000 cap** (launch-v3). The spec's number is stale.
> NOTE: "Step 0 code on GitHub" and "two environments demo/production" are ALREADY DONE (2026-07-28).

From "hi" to live listing in one sitting
The complete onboarding flow — screen by screen — built from what actually works (Shopify, eBay, Fiverr, Faire, Etsy, Stripe research). Style: modern · simple · minimalistic · fun. English & Spanish.

## The vibe — rules every screen follows
- 🧼 One decision per screen — big type, air, a single primary button.
- 🪄 AI starts, human edits — nobody ever faces a blank form.
- 📱 Phone-first — camera capture, thumb-reach, works on a loading dock.
- 💾 Never lose work — autosave everything, skip anything, resume anytime.
- 🎉 Celebrate wins — progress fills, confetti at "you're live."
- 🗣️ Human words, EN/ES — "What do you sell?" not "Configure catalog."

The one rule from the research that changes everything: do NOT ask for bank/ID (Stripe KYC) before the first listing. KYC-first flows are the #1 drop-off killer. Vendors list first, go live, and connect payouts when there's money waiting. (>20 steps cuts completion 30–50%; every extra minute ≈ −3%.)

## The flow — 7 screens, ~6 minutes
Target: first listing live in one sitting. World-class is same-session; <48h correlates with <10% abandonment.

1. **Welcome + one question** — "Welcome. What does your company bring to the market?" Tappable cards: Products · Services · Innovations · A mix. Personalizes everything after (Shopify/Etsy intake pattern). Professional, confident tone. Language toggle EN/ES top-right.
2. **Company basics — the minimum 2 fields** — "Let's meet your company." Company name + city (autocomplete El Paso/Juárez region). Logo upload optional — auto-generated monogram stands in. Everything else later (progressive profiling).
3. **The magic moment — feed the AI** — "Show us what you sell — we'll do the writing." Three ways in: 📸 Snap/upload photos · 📄 Drop a brochure/catalog (PDF) · ⌨️ Just describe it. AI drafts title, description, category, specs (eBay Magical Listing: >95% accept the AI draft). Multiple products in a brochure → multiple drafts. Bulk CSV/Shopify import tucked behind "I have a big catalog."
4. **Review the draft — edit, don't write** — "Here's your listing. Make it yours." Live preview beside fields. Category picked → only that category's spec fields (dynamic templates). Products: price/qty/lead time. Services: 3-tier packages (Basic/Standard/Premium) + "what we need from you to start." Photos: 1 required · shot-list prompts · auto-crop/enhance · good-vs-bad examples.
5. **Publish → celebration** — "You're live on NXT//LINK!" Confetti, real listing shown live, share link, one next step: "Add another" or "Finish your storefront."
6. **The checklist takes over (skippable)** — "Your storefront: 40% complete." Shopify-style persistent setup checklist: logo & about → more listings → video → case study → certifications. Nudges ("Profiles with photos get 2× more quote requests"). Reward, never block.
7. **Get paid — when it matters (deferred)** — "💰 You have interest! Connect your bank to get paid." Stripe Connect (embedded, prefilled, ~5 min, resume-able) prompted at first sale/quote-accept. Expectations set upfront: "you'll need ID + bank details."

## The listing questions — OfferUp mechanics, professional presentation
Camera first, one question per screen, tap instead of type, live in under 2 minutes — professional voice (B2B, not garage sale). Only 3 things typed: name, description (AI-drafted), price.

1. 📸 **Media first** — "Add photos of your product." (camera · gallery · brochure PDF). Camera launches immediately. Brochure drop = AI extracts multiple listings.
2. ⌨️ **Name it** — Title with AI suggestion pre-filled; clean description auto-drafted below.
3. 🏷️ **Category — auto-filled, tap to confirm** — "Looks like: Material Handling → Pallet Jacks ✓". Then 3–5 spec chips (capacity, power, voltage…) — tappable presets, optional.
4. ✨ **Condition — one tap** — New · Like new · Used — works great · Refurbished · For parts. (Services skip.)
5. 💵 **Price — one field, three modes** — [$ amount] · per unit? · "Get quotes instead". Toggles: "Price is firm", "Quote on request". Optional quantity pricing.
6. 📍 **Location → Post** — [📍 Use my location] · El Paso · Juárez → Post listing → live instantly → 🎉.

OfferUp rules adopted verbatim: camera first · category auto-filled from image · tap-don't-type except title/description/price · optional means optional · publish instantly, polish later. Target: listing live in under 2 minutes.

## The four publishable things — one wizard, four flavors
- 📦 **Product** — photos (1 min, 4–6 nudged) · auto category → spec chips · condition · price/firm/quote · qty/MOQ · lead time. Buyers see: Buy / Request quote.
- 🔧 **Service** — what you do (AI-drafted) · coverage area (El Paso · Juárez · both) · optional 3-tier packages · "what we need from you to start". Buyers see: Request a proposal.
- 💡 **Innovation** — problem → solution framing: "What problem does it solve?" · "How does it work?" (video slot) · maturity chip (Concept · Pilot-ready · In production) · "Available to pilot" toggle. Surfaces on "New & innovative" shelf. Buyers see: Request a demo / pilot.
- 🏆 **Case study** — proof, attaches to company profile. Three prompts: problem · what we did · result (numbers nudged) + photos. After a completed deal: one-tap "turn this deal into a case study."

Quality is a game, not a gate: completeness meter (Alibaba 0–5 model); publish allowed at minimum, 4+ earns "Complete profile" badge + better placement.

## Standardized everywhere — every listing is the same page
- 📐 **Universal listing page fixed slots**: top-left media gallery (video first) · top-right name/price/action/company card w/ verified badge · then: key specs table → description → 📄 Downloads (PDFs) → case studies → reviews → more from this company. Missing sections collapse cleanly.
- 🧩 **Universal card**: photo · name · price or "Quote" · company + ✓ · category chip. Innovations get one extra 💡 chip.
- 🎬 **Standard media kit**: photos ≤12 · 1 video slot (leads gallery) · PDFs in Downloads. Profile adds: facility photos, intro video, certifications vault. All uploads auto-processed.
- 📏 Why: buyers compare apples-to-apples · vendors can't build ugly pages · wizard questions map 1:1 to page slots.

## Pricing & quotes — 5 standard formats
| Format | They fill | Buyers see |
|---|---|---|
| 💲 Fixed price | one number | $4,800 |
| 📦 Per unit + volume tiers | unit price · optional 10+/50+ breaks | $120/unit · 10+ $105 · 50+ $92 |
| 🚀 Starting at | base price | From $12,500 · "final by configuration" |
| ↔️ Range | low–high | $8k–$15k · typical project |
| 💬 Quote on request | nothing (nudged to add typical range) | Quote on request · "typical: $10k–$30k" |

🧾 **Standard quote card** (in-thread): line items (item·qty·unit·total), lead time, valid-until, included/excluded chips (shipping·install·warranty·taxes). Vendor may attach own PDF — summary fields still required. Revisions = Quote v2 (history kept). Buyer's view ends in one button: Accept & Pay.
🔍 Transparency: any format allowed, pricing info nudged ("3× more inquiries") · no hidden fees structurally · price edits instant (accepted quotes never change) · same rendering everywhere.

## What we measure
- < 10 min signup → first listing live (same session = world-class)
- > 50% signup → published-listing rate (37% average)
- > 80% Stripe KYC completion once prompted (post-interest timing)
- 7-day vendor return rate

## Hand-off notes (web-Claude's)
1. Design the 7 screens + checklist + completeness meter (mobile-first, EN/ES, light/dark).
2. Wire the flow: intake branch → AI draft (extend existing extract engine) → dynamic category fields → live preview → publish → checklist state.
3. Service listings: package tiers + requirements form (new data model bits).
4. Deferred Stripe Connect embedded onboarding, triggered on first sale/quote-accept.
5. Browser-test whole flow on phone viewport; measure time-to-first-listing.

Existing assets to reuse: AI extract engine, mobile camera capture, auto-save — already built.

*Sources: Shopify setup-guide pattern, eBay Magical Listing, Fiverr gig wizard, Faire import, Etsy setup, Stripe Connect onboarding research.*
