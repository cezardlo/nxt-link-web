'use client';

// Debounced autosave with an honest status line ("Saving… / Saved just now").
// touch() marks the form dirty and schedules a save; flush() saves immediately
// (used before stage transitions so no keystroke is ever lost). Concurrent
// saves coalesce: if a save is running when another is requested, one more
// save runs right after it finishes.

import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export function useAutosave(save: () => Promise<boolean>, delay = 1200) {
  const [state, setState] = useState<SaveState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  const running = useRef(false);
  const queued = useRef(false);
  const alive = useRef(true);

  const flush = useCallback(async (): Promise<void> => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (running.current) { queued.current = true; return; }
    running.current = true;
    if (alive.current) setState('saving');
    const ok = await saveRef.current().catch(() => false);
    running.current = false;
    if (queued.current) { queued.current = false; return flush(); }
    if (alive.current) setState(ok ? 'saved' : 'error');
  }, []);

  const touch = useCallback(() => {
    setState('dirty');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, delay);
  }, [delay, flush]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { state, touch, flush };
}

export const SAVE_LABEL: Record<SaveState, string> = {
  idle: '',
  dirty: 'Unsaved changes…',
  saving: 'Saving…',
  saved: 'Saved just now',
  error: 'Could not save — retrying on your next change',
};
