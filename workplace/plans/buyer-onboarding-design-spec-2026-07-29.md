# Buyer onboarding + Post-a-Need design spec (Cesar paste, 2026-07-29)

Pixel-level spec pasted by Cesar (full text in session transcript 2026-07-29; operative summary here). This is THE design reference for R2 (buyer request wizard) and the S1/S2 vendor-flow polish aesthetic.

## Design language (binding for R2 + onboarding polish)
- Pure white bg, near-black ink #0A0A0A, gray #6B7280 secondary, violet #7C3AED (hover #6D28D9), borders #E5E7EB, radius 8-16px, focus ring rgba(124,58,237,.2), soft shadows 0 4px 12px rgba(0,0,0,.03) → hover 0 8px 24px rgba(124,58,237,.06) + 2px lift, 150-200ms ease-out. CENTERED content, max-width containers (400px auth / 640px wizard), generous BALANCED whitespace, big centered headlines (40px hero / 24-28px steps). NOTE: palette values here ≈ Design System v1.0's — agents reconcile to existing tokens, not raw hex.
- Signup: floating centered form, no card, 48px inputs/button, spinner micro-interaction ≤500ms, no page reload. (Current single-step signup already matches structurally.)
- "What do you need today?": calm concierge home — 2 equal cards (Find specific / Post a Need), whole-card clickable, chevron on hover, "Just browsing? Explore categories" below. Hick's Law: two choices, no distraction. [= the front-door flip, now spec'd; still Cesar's call to make Post-a-Need primary]
- Post-a-Need wizard: 3 steps in centered card w/ progress dots, slide-in 200ms; Step 1 kind chips (Product/Service/Technology) + conditional textarea (min 10 chars); Step 2 dynamic fields per kind (qty, location autofill, timeline chips, blind budget dropdown "Not shown to suppliers", dashed attachment dropzone); Step 3 review card + Send. Mobile = full-screen bottom sheet, thumb buttons. [Maps 1:1 onto R1 fields already built ✓]
- Post-submission: button spinner → white screen w/ self-drawing purple checkmark 400ms → "Request sent! We'll notify you when quotes arrive." → dashboard slides up: hero card "Your request is live · Matching suppliers now · 0 quotes yet" + status-pill pipeline (RV work already provides the data ✓) + sidebar reveal. No dead-end thank-you page.
- Delayed profile enrichment card: NOT during signup — appears in dashboard after first quote or 24h; industry + company-size chips, "Maybe later", fades out on save. [Replaces any signup profiling — consistent w/ role-question removal]
- Team: Settings→Team invite (Owner picks Manager/Member), invitee joins with OWN login, avatar strip top-right, permission at ACTION level (Accept Quote greyed for Members w/ tooltip). [= team-accounts doc, consistent]

## 🔒 Corrections (locked rules override)
1. "You can expect the first quotes within 24 hours" reassurance line = BANNED invented SLA (zero volume). Honest replacement: "Verified suppliers in your area will be notified. We'll tell you the moment a quote arrives."
2. All new copy EN/ES + Cesar sign-off; emoji icons in chips (📦🔧💻) → lucide icons per emoji ban.
3. Real-time "updates" = simple refetch/poll, no websocket infra now.
4. Team section = build-on-demand trigger unchanged (first vendor/buyer team request).

## Status
- 2026-07-29: S1 shipped but flagged by Cesar as visually bad (confirmed: left-floating content in void, disconnected controls) → POLISH DISPATCHED applying this spec's language. "View as a buyer" dead-end for pending vendors → OWNER-PREVIEW fix dispatched.
