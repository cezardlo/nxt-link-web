# Market Research: Vendor-First Landing Page & Flow Redesign

**Prepared by:** Marketing department (research brief)
**Date:** 2026-07-21
**Status:** Read-only research. No code changed. No copy or statistics invented — every claim below is sourced.

---

## Executive Summary (bottom line first)

**Bottom line: put the vendor pitch where buyers can't miss it, but don't turn the homepage into a vendor-only page.** Every marketplace we checked that cares about vendor supply keeps the buyer-facing homepage as the default (search/browse first) and adds a **loud, permanent "sell/list your company" link in the main navigation bar** — not buried in a footer, not requiring a second click through a menu. Thomasnet is the cleanest real-world proof: its whole top nav is split "For Buyers / For Suppliers" plus a bold "Claim Your Company" button next to Login/Register, while the hero still sells buyers on search. Fiverr does the same trick with one link ("Become a Seller") sitting right next to "Sign in" / "Join." Amazon goes further and gives sellers their own separate site entirely (sell.amazon.com) with one giant CTA and no buyer content at all.

We checked NXT//LINK's current live homepage as part of this research (read-only). Today the vendor pitch ("Are you a supplier?") sits near the very bottom of the page, after the hero, "how it works," category tiles, demo listings, and a full features section — buried well past where a cold-start marketplace can afford to put its #1 growth lever. The nav also exposes 6 categories up top and 14 more further down ("Shop by department") — more than every competitor we measured.

**Recommendation in one line:** keep the buyer-facing search hero (buyers "are going to find things"), but add a persistent, high-contrast "Become a Vendor" link in the top nav (Thomasnet/Fiverr pattern), pull the supplier pitch section up to right after the hero (not the bottom of the page), and cut the homepage category count from 14 down to 6–8.

Three open questions for Cesar are at the end.

---

## Part 1 — Cold-Start Playbooks (evidence)

### The core theory: supply is the hard side

- **Andrew Chen's "Cold Start Problem"** (a16z partner, ex-Uber): the supply side of a marketplace (Uber drivers, Airbnb hosts, eBay sellers) is "the hard side" — it requires people to invest time, inventory, or effort for uncertain income, so it resists growth more than demand does. His stated order of operations for consumer marketplaces is **"supply, demand, supply, supply, supply."** Source: [andrewchen.com — Solve a Hard Problem](https://andrewchen.com/solve-a-hard-problem-cold-start-problem/); [Stripe Atlas guide summarizing Chen's marketplace framework](https://stripe.com/guides/atlas/andrew-chen-marketplaces); [a16z, The Cold Start Problem](https://a16z.com/books/the-cold-start-problem/).
- **Lenny Rachitsky** (ex-Airbnb, led supply growth), **"28 Ways to Grow Supply in a Marketplace"**: found that supply mattered above all else at Airbnb and documented concrete tactics — nail the value proposition before anything else ("enhances every other tactic"), direct/manual sales outreach to early hosts, referral programs (became Airbnb's single most efficient supply lever), piggybacking on existing networks (Airbnb famously cross-posted to Craigslist), converting happy demand-side users into supply, and "bootstrapping trust" for new suppliers (free professional photography, guarantees, reviews) before organic trust exists. Source: [andrewchen.com — 28 Ways to Grow Supply in a Marketplace](https://andrewchen.com/grow-marketplace-supply/); also indexed at [Lenny's Newsletter — How to Kickstart and Scale a Marketplace](https://www.lennysnewsletter.com/p/how-to-kickstart-and-scale-a-marketplace-9ee).
- **a16z's curated essay collection** for marketplace founders (compiled by Andrew Chen) is the standard reading list the industry points to for cold-start/liquidity tactics. Source: [a16z — Required Reading for Marketplace Entrepreneurs](https://a16z.com/required-reading-for-marketplace-entrepreneurs/).

### Case histories

| Company | Cold-start tactic | Source |
|---|---|---|
| **Alibaba** (1999) | Launched as a **free listing directory** for Chinese SME manufacturers to reach global buyers — no cost was the on-ramp; scaled to 1M+ registered users by Dec 2001 before ever charging. | [Britannica — Alibaba](https://www.britannica.com/money/Alibaba); [EcomCrew — Alibaba History](https://www.ecomcrew.com/alibaba-history/) |
| **Fiverr** (2010) | Bootstrapped, self-funded; removed complexity from the seller side with a flat $5 "Gig" price instead of bidding — lowered the psychological and operational bar to listing a service. Grew via word-of-mouth/shareability. | [businessmodelcanvastemplate.com — Fiverr Brief History](https://businessmodelcanvastemplate.com/blogs/brief-history/fiverr-brief-history) |
| **Thumbtack** (2008–2013) | Explicitly supply-first. Built a tool that let pros **repost their Thumbtack profile to Craigslist** with better photos and imported reviews — i.e., made suppliers successful on *other* channels first ("network-independent value") rather than waiting for Thumbtack's own demand to exist. Reached liquidity gradually 2009–2013, then scaled hard 2013–2017. | [NFX — How Billion-Dollar Marketplaces Are Built (Zappacosta transcript)](https://podcast.nfx.com/episodes/how-billion-dollar-marketplaces-are-built-w-marco-zappacosta-founder-ceo/transcript); [The Marketplace Guide — How Thumbtack Bootstrapped a $1.7B Marketplace](https://themarketplaceguide.com/articles/how-thumbtack-bootstrapped-a-17b-marketplace-the-network-independent-value-playbook/) |
| **Faire** (2017) | Removed the buyer's *financial* risk instead of paying for supply: **net-60 payment terms + free returns on opening orders** for retailers, funded initially by the founders before a $3.4M seed. This created a viral loop — brands invited retailers (to get net-60 reach), retailers invited brands (to get net-60 terms) — each side recruiting the other. | [Contrary Research — Faire Business Breakdown](https://research.contrary.com/company/faire) |

**Read on early vs. today's landing pages:** We were not able to load Wayback Machine snapshots directly (tool restriction in this environment blocked web.archive.org fetches), so we rely on secondary write-ups and the Web Design Museum's archived galleries rather than pulling the pages ourselves — flagged as a gap. What the secondary sources agree on: early Airbnb (2008–2009) was pure inventory-first — a search box plus host photos/maps, nothing resembling today's polished brand marketing — and Airbnb only invested in professional photography for hosts *after* discovering listings with pro photos got ~40% more bookings, which became a supply-trust lever, not a demand lever. Source: [Web Design Museum — AirBed & Breakfast in 2008](https://www.webdesignmuseum.org/gallery/airbnb-2008); [Web Design Museum — Airbnb in 2009](https://www.webdesignmuseum.org/gallery/airbnb-2009); [The Hustle — Proof That Your Favorite Startup Started Out Awful](https://thehustle.co/proof-that-your-favorite-startup-started-out-awful). Early Alibaba (2000) and early eBay (1997–99) galleries exist at the same source ([Alibaba in 2000](https://www.webdesignmuseum.org/gallery/alibaba-2000), [eBay 1996 as AuctionWeb](https://www.webdesignmuseum.org/gallery/ebay-1996)) but we did not independently verify their category counts — treat as illustrative, not counted evidence.

---

## Part 2 — Vendor-Side Flows Today (live-browsed, not just described)

We navigated each site directly (read-only) rather than relying only on secondary write-ups, so the structural claims below are first-hand observations with the page and date implicit in the URL fetched (2026-07-21).

### Fiverr — "Become a Seller"
- The link **`/start_selling`** is a permanent item in the primary top nav, positioned directly next to "Sign in" and "Join" — not in a dropdown, not in the footer.
- Fiverr's homepage nav is otherwise a single flat row of category links (see Part 4).
- Source: live fetch of fiverr.com, 2026-07-21.

### Alibaba — "Sell on Alibaba.com"
- Present, but demoted to a **small-text secondary utility row** above the main search/nav (alongside "About Alibaba.com," "Tax exemption," "Help Center") — visually much lower-weight than the orange "Create account" button, which is for *buyers*.
- The primary bold nav row is buyer-only: **AI Mode | Products | Manufacturers | Worldwide**.
- Signup flow (from secondary sources, consistent across multiple guides): register with company details/email → email verification → submit business documentation (business license, tax registration, bank info) → apply for free posting → Alibaba approves a **30-day free trial** allowing up to ~50 free product listings before a paid membership is needed. Source: [Alibaba Seller Registration Guide (MarcaBien)](https://marcabien.com/en/alibaba-seller-registration-guide); [Alibaba Seller Central — How to start selling](https://seller.alibaba.com/how-to-sell); [How Business Owners Can Benefit From Alibaba Free Membership](https://seller.alibaba.com/businessblogs/px001yy2n-how-smes-can-benefit-from-alibabacom-free-membership).
- Source: live fetch of alibaba.com, 2026-07-21.

### Thomasnet — "Claim Your Company" / free supplier listing
- **This is the single strongest structural precedent for a buyer-first, vendor-loud pattern.** Live nav bar reads: **"For Buyers" (dropdown) | "For Suppliers" (dropdown) | "Claim Your Company" | "Start Advertising [New badge]" | Login | Register**.
- The hero headline is 100% buyer-facing: *"Start with the search made for industry"* with a search box and pre-filled example queries — vendors are not mentioned in the hero at all, yet the vendor CTA sits one row above it, permanently visible, styled as a distinct nav item (not a button-colored CTA, just a clear text link with equal prominence to "For Buyers").
- Getting listed is framed as **free and near-frictionless**: "Find Your Business on Thomas" / "Claim your company to attract qualified leads" — the page explicitly states no verification gate blocks the profile from going live ("create a free Thomasnet.com profile" with immediate access), though a Thomas content team reviews submissions to confirm legitimacy per the free-listing terms. Source: [business.thomasnet.com/get-listed-on-thomasnet](https://business.thomasnet.com/get-listed-on-thomasnet); live fetch, 2026-07-21.

### Faire — brand application ("Sell on Faire")
- Faire's public, logged-out homepage is **entirely buyer-facing** (retailer shopping experience) — search bar, "shop by values" carousel, curated product carousels. There is **no product-category tab in the header at all**; browsing is search/curation-driven, not nav-driven.
- The vendor path appears twice, both **secondary and quiet**: a dual-button footer block ("Sign up to buy" / "Sign up to sell") and a repeated "Sign up to sell" link under "Explore." Source: live fetch of faire.com, 2026-07-21.
- The dedicated brand pitch lives on a separate page, **faire.com/brands**, which is a full recruitment page: headline "Sell on Faire," proof of scale ("$750,000+ per month" earning example with footnoted average order value/order count, discovery by "10M+ retailers across 70K cities"), founder testimonials, and category logos across 9 verticals. Source: live fetch of faire.com/brands, 2026-07-21.
- Friction before going live: Faire evaluates category supply/demand balance, brand location, SKU count, existing wholesale presence/social proof; requires a registered business entity and tax ID (EIN); a website is not mandatory but improves approval odds. Source: [Fit Small Business — How to Sell on Faire](https://fitsmallbusiness.com/how-to-sell-on-faire/); [Faire Help Center](https://www.faire.com/support/brands).

### Amazon Business / Sell on Amazon
- Amazon takes the **most extreme separation approach**: seller recruitment lives on an entirely separate domain, **sell.amazon.com**, with zero buyer-facing content. Headline: **"Sell more with Amazon"** in giant type, one high-contrast CTA ("Start selling"), a second lighter CTA ("Sign up*"), one testimonial ("We grew 10x within five months..."), and one hard stat ("More than 75,000 independent sellers surpassed $1 million in sales in 2025"). Source: live fetch of sell.amazon.com, 2026-07-21.
- Friction: requires a Professional selling account ($39.99/mo + fees), legal business name/address matching registration documents, tax ID (SSN or EIN), and identity verification (photo ID + either a selfie-match or a live video call with an Amazon associate); typically completes in hours, with identity verification taking up to ~3 business days. Selling specifically on **Amazon Business** (the B2B storefront) additionally requires toggling on a B2B registration from an existing Professional seller account — it is not a separate signup. Source: [sell.amazon.com/sell/registration-guide](https://sell.amazon.com/sell/registration-guide); [Amazon Business program page](https://sell.amazon.com/programs/amazon-business).

### Cross-cutting takeaway on "showcase your technology"
Across Faire (brand storefront w/ photos + testimonials + category tagging), Alibaba (verified manufacturer badges, product galleries), and Thomasnet (profile with logo/images/video/certifications, explicitly: *"upload logos, images, videos, certifications anytime"*), the pattern is identical: **a media-rich profile page is the product**, and the *landing page's* job is only to get the vendor to start filling it in. None of these invented new storefront features to win vendors — they sold the existing profile capability harder. Source: [business.thomasnet.com/get-listed-on-thomasnet](https://business.thomasnet.com/get-listed-on-thomasnet).

---

## Part 3 — CTA Hierarchy on Dual-Audience Homepages

Three distinct real-world patterns, all observed live:

1. **Split nav, single hero (Thomasnet).** Buyer and vendor each get an equally-weighted nav item/dropdown ("For Buyers" / "For Suppliers") plus one extra bold vendor CTA ("Claim Your Company"), but the hero itself commits fully to ONE audience (buyers/search). This lets the page still have "one primary CTA per screen" in the hero while keeping the vendor path one click away at all times.
2. **Persistent top-bar link, no split (Fiverr).** No nav split at all — just one additional link ("Become a Seller") sitting beside the account actions (Sign in / Join). The homepage otherwise stays 100% buyer/category-browsing focused.
3. **Fully separate site (Amazon).** Buyer site (amazon.com) and vendor recruitment site (sell.amazon.com) are different properties entirely, each with its own single-minded hero and CTA. Zero compromise on "one primary CTA per screen," at the cost of an extra domain/page to maintain.

**Where "one primary CTA per screen" comes from:** general conversion-rate-optimization literature converges on this — pages with multiple competing calls-to-action underperform a page with one clearly prioritized action, because each additional choice adds decision friction. We were not able to pull a direct, quotable Nielsen Norman Group article naming this exact rule (search results pointed at general landing-page best-practice roundups rather than an NN/g original with a specific URL), so we are flagging this as **directionally well-supported industry consensus rather than a single verified NN/g citation** — treat with slightly less certainty than the live-browsed structural evidence above. What IS directly verifiable is that **all three real examples above still land on one dominant CTA per screen** even when serving two audiences — they solve it with navigation/page-splitting, not by giving one screen two equally loud primary buttons.

**Applied to NXT//LINK:** the current homepage already does something close to pattern 1 (footer has "FOR BUYERS" / "FOR VENDORS" columns) but the *visible-without-scrolling* experience is 100% buyer (hero + "Post a Request" in the nav), and the vendor pitch section is pushed to the very bottom of a long page — closer to "vendor path exists but is hard to find" than Thomasnet's "vendor path is one click away from anywhere."

---

## Part 4 — Navigation Category Counts (counted directly)

| Site | Top-level nav items (counted from live page) | Notes |
|---|---|---|
| **Thomasnet** | **4**: For Buyers, For Suppliers, Claim Your Company, Start Advertising | Zero product-category tabs in primary nav — categories live inside "For Buyers" dropdown/search. |
| **Alibaba** | **4** bold tabs: AI Mode, Products, Manufacturers, Worldwide | A secondary lower-weight utility row adds "All categories," "Verified manufacturers," "Dropshipping" but these are not styled as primary nav. |
| **Faire** (logged out) | **0** category tabs in header | Pure search/curation; category browsing happens after a click into search, not in the header nav. |
| **Fiverr** | **10** category links (Graphics & Design, Programming & Tech, Digital Marketing, Video & Animation, Writing & Translation, Music & Audio, Business, Finance, AI Services, Personal Growth), plus a "Trending" shortcut = 11 visible items total | Confirms the "~10 max" ceiling even for the most category-dense of the group. |
| **NXT//LINK (current, live)** | **6** in the top category strip (Material Handling, Safety & PPE, Warehouse Technology, Automation & Robotics, Maintenance & Repair, Supply Chain Services) — but then a **second, 14-item "Shop by department" list** further down the same homepage | Highest raw count of any site checked; also the only site presenting two different category lists of different lengths on one page. |

**Evidence-backed guidance:** every competitor we could count caps primary navigation at 10 or fewer, and the two B2B-specific ones (Thomasnet, Alibaba) cap it at 4 by pushing detailed categories into search/dropdowns entirely. NXT//LINK's homepage currently exposes 14 in "Shop by department" — outside the range of every comparator.

---

## Part 5 — Bilingual / Cross-Border B2B Patterns

- **Mercado Libre Global Selling:** listings are **auto-translated into Spanish and Portuguese**; buyers pay in local currency, Mercado Libre converts and settles to the seller in USD (seller bears no manual currency-conversion work). Source: [Pattern — Selling on MercadoLibre: The Ultimate Guide](https://www.pattern.com/blog/why-sell-on-mercado-libre); [Mercado Libre Global Selling — About](https://global-selling.mercadolibre.com/landing/about).
- **Alibaba International:** combines two techniques — a **language selector** on the main site (internationalization) plus fully separate localized sites for major regions (localization). Guidance from Alibaba's own seller-education content stresses that effective localization is "beyond translation" — tone, compliance messaging, and buyer-journey expectations must adapt per region (Southeast Asia vs. Middle East vs. North America). Source: [seller.alibaba.com — International B2B Audiences localization guide](https://smartbuy.alibaba.com/b2b/how-to-localize-content-for-international-b2b-audiences); [VEQTA — Alibaba vs Amazon localization choices](https://veqta.com/why-alibabas-english-website-doesnt-read-like-amazon-and-why-thats-a-localization-choice/).
- **Faire's own language switcher** (live-observed): lists languages **by name, not flag** — "English (US)," "English (UK)," "English (AU)," "Français," "Deutsch," "Italiano," "Español," "Nederlands," "Português," "Svenska," "Dansk" (11 options). This matches published UX guidance.
- **Nielsen Norman Group, International B2B guidance** (direct quote-level findings): avoid flags for language pickers because "many languages span multiple regions with varying dialects" — use text language names instead; don't machine-translate word-for-word, adapt tone/formality per region; show local trust signals (local office/contact info, years present in region, local trade-event participation); keep structural/informational parity between the English and localized site (no missing pricing, no forcing a user to hop sites for basic info); and **budget ~50% extra layout space** for non-English text, since translations often run longer. Source: [NN/g — Top 5 Ways to Improve Your Site for International B2B Audiences](https://www.nngroup.com/articles/international-b2b/).

**Applied to NXT//LINK:** the EN/ES toggle already visible in the current live nav is directionally correct and matches the "name the language, don't just use a flag" pattern IF it currently reads "EN / ES" as text (confirmed from the live homepage fetch: nav shows "EN" and "ES" as text toggles, not flag icons) — that's already best practice, no change needed there.

---

## Recommendation Skeleton (for the design department to turn into a blueprint)

### A. Landing hero — three structural options, one pick

1. **Option 1 — Thomasnet pattern (recommended): buyer-facing hero + loud, permanent top-bar vendor path.**
   Keep the hero buyer-facing (search/RFQ), since Cesar's own instruction is buyers "are going to find things" and the existing hero copy ("Find industrial suppliers. Get competitive quotes. Close deals safely.") is not being thrown away. Add a **persistent, high-contrast nav item** — e.g. "Become a Vendor" — styled with the same visual weight as "Sign in"/"Join" (Fiverr's exact approach), not tucked into a hamburger or footer. Move the existing bottom-of-page "Are you a supplier?" section up to **immediately after the hero**, before "How it works," so a vendor never has to scroll past buyer content to find their pitch.
   *Trade-off:* less "wow" than a dedicated vendor mega-hero, but zero risk of diluting the buyer-search experience, and it is the closest match to what a cold-start B2B directory (Thomasnet) actually ships today.

2. **Option 2 — Split dual-audience hero (two panels, one screen).**
   Literally divide the hero into a buyer half and a vendor half (e.g. left: search bar + "Post a Request"; right: "Showcase your technology to Borderplex buyers" + "Join free"). Faire's footer dual-button ("Sign up to buy" / "Sign up to sell") is a light version of this idea, but no site we checked does a full 50/50 *hero* split — it's a pattern from general CRO writing, not something we found a live marketplace shipping. *Trade-off:* immediately visible to 100% of visitors, but it violates the "one primary CTA per screen" convention every real example we checked actually follows, and risks looking like neither audience is the priority.

3. **Option 3 — Separate dedicated vendor landing page (Amazon pattern).**
   Keep the marketplace homepage exactly as-is for buyers, and build a completely separate page (e.g. `/sell` or `/vendors`) that is 100% vendor-pitch, linked prominently from the main nav — mirroring sell.amazon.com. *Trade-off:* gives vendors the cleanest, most persuasive experience (no buyer content competing for attention) and is the easiest to A/B test or iterate independently, but requires an extra page to build/maintain and a visitor must click through rather than seeing the pitch on arrival — likely a smaller reach than Option 1 for a cold-start company that needs every visitor to see the vendor ask.

**Pick: Option 1.** It matches the clearest same-category precedent (Thomasnet, a B2B industrial directory solving the identical problem), requires the least net-new page-building work (NXT//LINK already has a vendor section and a footer vendor column — this is a promote/reorder job, not a rebuild), and doesn't fight the instruction that buyers should still be able to search/browse without a vendor-only site getting in the way.

### B. Where buyer search + RFQ should live
Keep search and "Post a Request" in the hero as today — that's already correct and matches every site checked (nobody buries buyer search). "Post a Request" can stay a secondary button next to the search bar (not the single primary CTA) so it doesn't compete with the vendor nav-bar link for "the one thing everyone sees first."

### C. Vendor pitch structure (proof/benefit bullets, using only already-true claims)
Modeled on the strongest live examples (Thomasnet's "For Suppliers," Faire's `/brands`, Amazon's `sell.amazon.com`), a vendor pitch section should have, in order:
1. **Headline** naming the audience directly (Amazon: "Sell more with Amazon"; Thomasnet: "For Suppliers") — e.g. something like "Showcase your technology to Borderplex buyers."
2. **One-line proof/frictionless-signup claim** — the true, already-built fact: 60-second, 3-field magic-link signup (mirrors Amazon's single-CTA hero simplicity, without inventing a stat).
3. **3–5 value bullets**, each mapping to a real, already-true feature:
   - Free to join (matches Alibaba's original free-listing hook and Thomasnet's free-tier hook)
   - 60-second signup, no long form (contrast with Amazon Business's multi-day identity verification — NXT//LINK's actual edge)
   - QR-code conference onboarding (unique differentiator — no competitor checked has this)
   - 12-month protected introductions (matches the "trust bootstrapping" idea Lenny Rachitsky documents — new, unproven suppliers need reasons to feel safe joining first)
   - Bilingual storefront out of the box (EN/ES) — ties to the Borderplex-specific angle no competitor addresses
   - *(First-deal credit: hold this bullet until copy is legally approved, per Cesar's note that the claim exists but wording is pending.)*
4. **CTA** — a single button, matching the "one CTA per screen" pattern every live example follows (avoid stacking "Apply," "Learn more," and "Sign up" all with equal weight).

Do **not** promise escrow, payment-holding, or funds-handling language anywhere in this section (legal constraint) — "protected introductions" describes the matching/intro safeguard already in place, not a financial escrow.

### D. Category count recommendation
Cut the homepage from 14 ("Shop by department") to **6–8 top-level categories**, matching the range every competitor actually ships (Thomasnet/Alibaba: ~4; Fiverr: 10 as the observed ceiling). The existing 6-item top strip (Material Handling, Safety & PPE, Warehouse Technology, Automation & Robotics, Maintenance & Repair, Supply Chain Services) is already close to right-sized — the 14-item "Shop by department" list further down duplicates and fragments it and should either be merged into the same 6–8 or moved off the homepage into a dedicated `/browse` page (Thomasnet's model: categories live behind a "For Buyers" click, not stacked twice on the homepage).

### E. What "showcase their technology" should mean concretely
No new features — reframe emphasis on what the vendor portal already has, mirroring exactly what Thomasnet/Faire/Alibaba sell vendors on:
- Product photo galleries (Faire: brand photo-led storefronts drive the "$750K+/month" proof story)
- Case studies / project references (Faire's founder-testimonial pattern, adapted to B2B industrial: "who installed this, what problem it solved")
- Certifications badges (Thomasnet: "upload... certifications anytime" is called out as a named feature, not incidental)
- Brochures/spec sheets (industrial-buyer equivalent of Thomasnet's "images, videos" upload capability)
- Video (same Thomasnet line item; Amazon Business B2B buyers similarly expect spec/demo video per program materials)

All five already exist in the vendor portal per the task brief — the work here is emphasis in vendor-facing marketing copy, not new engineering.

---

## Open Questions for Cesar

1. **Nav wording:** Do you want the new top-bar vendor link to say "Become a Vendor," "List Your Company" (Thomasnet's exact wording), or something Borderplex-specific like "Showcase Your Technology"? This affects both English and Spanish copy.
2. **Homepage restructure order:** Confirm you want the existing "Are you a supplier?" section physically moved up to right after the hero (Option 1), rather than left at the bottom — this is a layout change the design department will need explicit sign-off on before wireframing.
3. **Category consolidation:** Do you want the 14-item "Shop by department" list retired entirely (folded into the 6-item top strip) or kept alive on a separate `/browse` page? This affects how much of the current homepage content gets removed vs. relocated.

---

## Sources index (all URLs cited above)

- https://andrewchen.com/solve-a-hard-problem-cold-start-problem/
- https://stripe.com/guides/atlas/andrew-chen-marketplaces
- https://a16z.com/books/the-cold-start-problem/
- https://andrewchen.com/grow-marketplace-supply/
- https://www.lennysnewsletter.com/p/how-to-kickstart-and-scale-a-marketplace-9ee
- https://a16z.com/required-reading-for-marketplace-entrepreneurs/
- https://www.britannica.com/money/Alibaba
- https://www.ecomcrew.com/alibaba-history/
- https://businessmodelcanvastemplate.com/blogs/brief-history/fiverr-brief-history
- https://podcast.nfx.com/episodes/how-billion-dollar-marketplaces-are-built-w-marco-zappacosta-founder-ceo/transcript
- https://themarketplaceguide.com/articles/how-thumbtack-bootstrapped-a-17b-marketplace-the-network-independent-value-playbook/
- https://research.contrary.com/company/faire
- https://www.webdesignmuseum.org/gallery/airbnb-2008
- https://www.webdesignmuseum.org/gallery/airbnb-2009
- https://thehustle.co/proof-that-your-favorite-startup-started-out-awful
- https://www.webdesignmuseum.org/gallery/alibaba-2000
- https://www.webdesignmuseum.org/gallery/ebay-1996
- https://marcabien.com/en/alibaba-seller-registration-guide
- https://seller.alibaba.com/how-to-sell
- https://seller.alibaba.com/businessblogs/px001yy2n-how-smes-can-benefit-from-alibabacom-free-membership
- https://business.thomasnet.com/get-listed-on-thomasnet
- https://fitsmallbusiness.com/how-to-sell-on-faire/
- https://www.faire.com/support/brands
- https://sell.amazon.com/sell/registration-guide
- https://sell.amazon.com/programs/amazon-business
- https://www.pattern.com/blog/why-sell-on-mercado-libre
- https://global-selling.mercadolibre.com/landing/about
- https://smartbuy.alibaba.com/b2b/how-to-localize-content-for-international-b2b-audiences
- https://veqta.com/why-alibabas-english-website-doesnt-read-like-amazon-and-why-thats-a-localization-choice/
- https://www.nngroup.com/articles/international-b2b/
- Live browser fetches (2026-07-21, read-only): fiverr.com, alibaba.com, faire.com, faire.com/brands, faire.com/apply, thomasnet.com, sell.amazon.com, and NXT//LINK's own current live homepage (nxt-link-web-git-claude-v2-merged-baseline-cezardlos-projects.vercel.app)

**Gaps flagged:** Wayback Machine (web.archive.org) could not be fetched directly in this environment — early-homepage claims for Airbnb/Alibaba/eBay rely on secondary write-ups and the Web Design Museum's archived galleries, not a first-hand snapshot read. The "one primary CTA per screen" rule is well-supported by general CRO consensus and by every live structural example we found, but we could not locate one specific, directly quotable Nielsen Norman Group article stating that exact rule — flagged as directional, not a hard citation.
