'use client';

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { MessageAttachment } from '@/lib/messages/attachments';

// Shared buyer<->vendor chat polling helper (used by /vendor/leads and
// /buyer). Keeps the existing on-site chat feeling live WITHOUT adding
// Supabase browser-realtime — that would need new RLS policies letting a
// client read `messages` directly, which is a bigger, separate decision.
// Tracked as a future enhancement; for now we just poll the GET messages
// endpoint that already exists and already enforces ownership + masking.

export interface ChatMessage {
  id: string;
  sender: string;
  body: string;
  created_at: string;
  // Local-only: true for an optimistic bubble the server hasn't confirmed
  // yet. Never sent to/from the API.
  pending?: boolean;
  // File attachments on this message (specs, drawings, POs). Empty/absent
  // for plain text messages. Each `url` is a freshly-minted short-lived
  // signed URL from the GET route — the Storage bucket is private.
  attachments?: MessageAttachment[];
}

// Merge a freshly-polled thread (authoritative, from GET .../messages) into
// the current list. Dedupe by message id — the GET route always returns
// real ids, so id equality is enough (no created_at+sender+body fallback
// needed). Any optimistic message still marked `pending` and not yet echoed
// back by the server is kept so an in-flight send never flickers away.
export function mergeChatThread(prev: ChatMessage[], fresh: ChatMessage[]): ChatMessage[] {
  const freshIds = new Set(fresh.map((m) => m.id));
  const stillPending = prev.filter((m) => m.pending && !freshIds.has(m.id));
  return [...fresh, ...stillPending].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// Replace one optimistic (pending) bubble with the server-confirmed row.
// Also guards the race where a poll tick already delivered the confirmed
// row before the POST response came back — the confirmed id is deduped.
export function resolvePendingMessage(list: ChatMessage[], tempId: string, confirmed: ChatMessage): ChatMessage[] {
  const withoutTemp = list.filter((m) => m.id !== tempId && m.id !== confirmed.id);
  return [...withoutTemp, confirmed].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// Drop an optimistic bubble that failed to send.
export function dropPendingMessage(list: ChatMessage[], tempId: string): ChatMessage[] {
  return list.filter((m) => m.id !== tempId);
}

/**
 * Polls `${endpoint}?quote_request_id=${threadId}` on an interval while a
 * chat thread is open, merging any new messages in via `setMessages`.
 *
 * - Only runs while `threadId` is truthy (chat panel open) — never polls a
 *   closed or background thread.
 * - Pauses while the tab is hidden (document.visibilityState) — resumes on
 *   the next tick once the tab is visible again.
 * - Exactly one interval at a time: tracked in a ref, cleared on thread
 *   change, close (threadId -> null), and unmount.
 *
 * `onData` (R4, optional) fires with the full parsed response on every
 * successful tick — lets a caller keep OTHER thread-scoped state fresh (e.g.
 * the offer-in-chat proposal history / DealTracker milestone) off the SAME
 * poll, instead of running a second interval.
 */
export function useChatPolling(
  threadId: string | null,
  endpoint: string,
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>,
  intervalMs = 4000,
  onData?: (data: Record<string, unknown>) => void,
) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  useEffect(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (!threadId) return;

    async function tick() {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const res = await fetch(`${endpoint}?quote_request_id=${threadId}`);
        const data = await res.json();
        if (data?.ok) {
          setMessages((prev) => mergeChatThread(prev, data.messages || []));
          onDataRef.current?.(data);
        }
      } catch {
        // Transient network hiccup — the next tick retries; no need to surface an error for a background refresh.
      }
    }
    timerRef.current = setInterval(tick, intervalMs);
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
    // setMessages (a useState setter) is stable across renders, so this effect
    // correctly restarts only when the open thread or endpoint changes.
    // onData is read via a ref so passing a fresh inline closure each render
    // never restarts the interval.
  }, [threadId, endpoint, setMessages, intervalMs]);
}
