// Shared time-of-day greeting + name helpers — dashboard warm pass
// (2026-07-30: /buyer, /vendor/leads). Pure, no I/O; ONE definition so
// neither dashboard forks its own "what hour is it" logic.
//
// Client-clock only: callers must only read getGreetingPeriod() from code
// that runs after mount (an effect, or a render triggered by state a prior
// effect set) — never during the very first render — so the server-rendered
// markup and the first client render stay identical and React never hits a
// hydration mismatch. Both dashboards satisfy this by keeping the greeting's
// name in state that starts `null` and is only set from inside a `load()`
// effect; the greeting renders the "Welcome back" fallback (no clock lookup
// at all) until then, then upgrades in place once a real name resolves.

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

/** 5:00–11:59 morning, 12:00–17:59 afternoon, else evening (covers night
 * through early morning too — there's no "good midnight"). */
export function getGreetingPeriod(date: Date = new Date()): GreetingPeriod {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'evening';
}

/** First token of a full/contact name, trimmed. Null for empty/whitespace
 * input so callers can fall back to a plain "Welcome back" instead of
 * greeting someone by a blank or garbled name. */
export function firstNameOf(fullName: string | null | undefined): string | null {
  const trimmed = (fullName || '').trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] || null;
}
