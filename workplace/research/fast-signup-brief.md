# Vendor Onboarding Research Brief — "Conference to Active Account"
NXT//LINK UX-Research · 2026-07-20 · Input spec for design/engineering (task #3)

## 1. Pattern table

| Platform | Asked at FIRST signup | Deferred until later | Trigger / nudge mechanics |
|---|---|---|---|
| **Stripe Connect** (gold standard) | Email + country; platform pre-fills anything it already knows | Bank account, ID/KYC docs, tax info, business details | `currently_due` vs `eventually_due`: collect only what's needed *now*; new asks triggered by thresholds (volume, payout request). Webhook-driven "we need one more thing" prompts. Mobile-optimized hosted flow. |
| **Shopify** | Email only (or Google/Apple one-tap) | Store name, products, payments, domain — everything | Post-signup survey is skippable; answers personalize a 3-5 item setup checklist. "Launch" is the goal-gradient; setup resumable anytime. |
| **Thumbtack** | Service category + ZIP, then Google/Facebook/email account, phone confirm | Photos, targeting prefs, budget, background-check badge | First lead is the hook: "complete profiles get more leads." Category chosen *before* account = instant relevance. ~7 min to fully live, but account exists in <1. |
| **Faire** | Email + password + phone, short application (site, category, location) | Full brand story, shipping, banking/tax, catalog | Review gate before selling (like ours). Key conference play: **Faire Direct QR code** — brand shows QR at trade show, retailer scans, signs up on phone, gets incentive tied to the referrer. Invite link = warm lane. |
| **Upwork** | Name, email, country, password | Portfolio, video, history, certifications | Profile completeness %: required items = 50%, any mix of optional = rest. "4.5x more likely to be hired at 100%." Statuses gated on completeness. Profile reviewed before marketplace access. |
| **LinkedIn** | Name, email — nothing else | Everything | Profile Strength meter with named tiers (Beginner → All-Star); meter *disappears* when done (completion = reward). Textbook endowed-progress. |
| **Alibaba / Amazon Seller** (counter-examples) | Company name, email, phone, password — then full KYC wall before selling | Almost nothing deferred | Days-to-weeks to go live. Works only for already-committed sellers. This is what "just met at a conference" bounces off. |

## 2. Principles that repeat across winners

1. **Account first, everything else later.** Email (+ 1-2 context fields) creates a real, logged-in account. Cutting 11 fields to 4 lifts conversion ~120%; 86% abandon long forms.
2. **Collect data at the moment it's needed** (Stripe's currently_due model): listing data at first listing, logistics at first quote, banking at first payout.
3. **Passwordless wins B2B signup.** Magic-link-first cohorts: signup completion 41%→67% in one case study; 2-3x on warm channels. Bonus: the link hands off phone→desktop (conference→office flow).
4. **Ask "what do you sell" before or during signup**, not after (Thumbtack). One tap of category powers instant personalization and admin-review routing.
5. **Meter + short checklist, pre-credited.** Start the bar at ~25-30% for just signing up (endowed progress: +82% completion). 3-5 checklist items max.
6. **Tie completeness to outcomes, not virtue.** "Complete profiles win 4.5x more jobs" (Upwork). Every nudge names what it unlocks.
7. **Warm invites get a visibly better lane** (Faire Direct): QR/deep-link with a token, referrer attribution, a perk or skip-the-line signal.
8. **Review gates go before *publishing*, never before *account creation*.** Faire/Upwork let you build while pending. Pending must never be a dead end.

## 3. NXT//LINK recommendation

**Quick signup (both lanes, one screen, phone-first): 3 fields + magic link, no password.**
1. Company name
2. Work email
3. "What do you supply?" — single tap from ~8 big category chips (free-text fallback)
Tap "Create account" → magic link sent → tapping it lands them in a live vendor dashboard. Target: under 60 seconds standing in front of Cesar. Big tap targets, autofill enabled, no email-verification wall blocking the dashboard (the magic link *is* the verification).

**INVITED lane (conference):** Cesar shows a QR code from his phone → opens `/join?invite=TOKEN`. Token pre-fills referrer, stamps the account "Invited by NXT//LINK," pre-credits the meter to 30%, and fast-tracks/auto-passes admin review per current policy (decision #5). Copy: "You're invited — 3 fields, 60 seconds."

**ORGANIC lane:** identical 3-field signup. Account and dashboard open immediately; they can build listings and profile in draft. **Admin review gate stays exactly where it is: nothing goes public until approved.** Signup collects enough to *route* review, not to *pass* it.

**Deferred data → triggers (Stripe model):**
| Trigger | Ask then, inline |
|---|---|
| Creates first listing | Product details, photos, specs, lead time |
| Submits listing for publish (organic) | Business website/proof, phone, location — feeds admin review |
| Sends first quote on an RFQ | Ships-from location, typical lead time (2 fields, in the quote form) |
| First quote accepted / requests payout | Banking + tax (W-9/EIN) — the one hard gate |
| 7/30-day nudge emails | Logo, description, certifications — each deep-links one checklist item |

**Profile-strength meter + unlocks:** starts at 30% (signup + category, pre-credited). Checklist of 5: logo & one-line description → first listing → business details (review-ready) → verified badge (post-review) → payout setup. Each item states its unlock. Meter hits 100% and disappears, LinkedIn-style. While pending review: show status + "what you can do meanwhile" — never a dead end.

## 4. Anti-patterns (conversion killers)

- Password creation on mobile at a booth; any form over ~4 fields at step one.
- KYC/tax/bank before the vendor has seen value (the Alibaba/Amazon wall).
- Email-verification wall that locks the whole app instead of just publishing.
- Wizards with no skip/save-and-resume.
- Review gate before account creation for organic vendors; "pending review" screens with zero available actions.
- Asking for the same data twice (signup answers must pre-fill review forms).
- Generic "complete your profile!" nudges with no named unlock or benefit stat.
- Checklists longer than 5 items; meters that never reach 100%.

*(Full source links in the original research report — session 2026-07-20.)*
