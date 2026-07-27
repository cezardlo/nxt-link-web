# Decisions — already made (don't re-litigate)

Newest at top. One line each: what + why.

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
- **Fee engine = 4%/2%/$20k cap (launch-v3), first deal 50% off** — Cesar's
  ruling 2026-07-27, supersedes the 5%/3%/$20k launch-v2 model and the old
  first-deal credit ($250/$1,250). One resolver both sides. (Cesar ruling
  2026-07-27: cap corrected to $20k before first release — web-Claude brief said
  $12.5k, overridden.) See [[Fees]].
- **NXT AI features use `aiDraft()` with deterministic fallbacks** so they work
  even without an LLM key.

## Open / user's call
- (none currently — palette resolved above)
