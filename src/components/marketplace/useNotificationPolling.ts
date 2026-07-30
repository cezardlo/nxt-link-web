'use client';

import { useEffect, useRef } from 'react';

// Keeps the notification bell's unread count fresh WITHOUT page-wide
// aggressive polling (Slice R5). Same discipline as useChatPolling.ts:
//   - Pauses while the tab is hidden (document.visibilityState) — resumes on
//     the next tick once the tab is visible again.
//   - Exactly one interval at a time: cleared on `active` going false and on
//     unmount.
//   - Only runs while `active` is true (the dashboard is mounted and the
//     buyer/vendor is signed in) — never runs for a signed-out visitor.
// Deliberately lighter than chat polling (30s vs. 4s) — a notification list
// is a background badge, not a live conversation.
export function useNotificationPolling(active: boolean, endpoint: string, onData: (data: { notifications: unknown[]; unread: number }) => void, intervalMs = 30000) {
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  useEffect(() => {
    if (!active) return;

    async function tick() {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const res = await fetch(endpoint);
        const data = await res.json();
        if (data?.ok) onDataRef.current({ notifications: data.notifications || [], unread: data.unread || 0 });
      } catch {
        // Transient network hiccup — the next tick retries.
      }
    }
    const timer = setInterval(tick, intervalMs);
    return () => clearInterval(timer);
  }, [active, endpoint, intervalMs]);
}
