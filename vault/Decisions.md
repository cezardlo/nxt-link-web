# Decisions — already made (don't re-litigate)

Newest at top. One line each: what + why.

- **The Project is the product system of record** — buyer/vendor messages,
  questions, NDAs, documents, demos, pilots, quotes, purchase, delivery or
  implementation, and relationship history stay together instead of becoming
  separate feature silos.
- **NXT//LINK is an end-to-end purchasing workspace, not only discovery/RFQ** —
  north star: "Find it · Evaluate it · Purchase it · Track everything in one
  place."
- **One account can buy, sell, or do both** — progressive onboarding captures
  role and industry quickly; companies switch buyer/vendor modes without
  duplicate identities.
- **Listing actions are one CTA taxonomy over one deal model** — Buy now,
  Request quote, Ask a question, Contact sales, Demo, and Pilot are different
  starting contexts that converge into a persistent project and transaction.
- **Commission follows completed business, not conversation** — free discovery
  and evaluation actions create the path; direct purchases and converted deals
  enter the single commission ledger.
- **Palette RESOLVED → violet spec system** (`#6C5CE0` primary, light content +
  dark sidebar), per the user's Design System & App Spec v1.0. The earlier
  blue-on-light option is dropped. See [[Design-System]].
- **Use an in-repo Obsidian vault (`vault/`) as shared AI memory** — to cut
  token use; both web + terminal Claude read it first.
- **Remove the old intel/signals/brain system from the product** — it's not the
  marketplace; leftover code is dead. (Full deletion of `src/lib/intelligence`
  offered, pending user OK — see [[Backlog]].)
- **No countdown timers / dark patterns** — user dislikes them; use static
  dates only.
- **Best-value cells use soft blue (`#3B6EA5`), not red/green** — per user's
  display spec.
- **Compare tables use fill bars** (price + timeline) so buyers compare at a
  glance.
- **Vendors can "View as a buyer"** (LinkedIn-style preview).
- **Fee engine = 5%/3%/$20k cap (launch-v2)** — the app's real math, NOT the
  7/5/3%/$25k proposal. See [[Fees]].
- **NXT AI features use `aiDraft()` with deterministic fallbacks** so they work
  even without an LLM key.

## Open / user's call
- (none currently — palette resolved above)
