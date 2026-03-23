'use client';

import { useEffect, useState, useCallback } from 'react';

type Toast = { id: number; message: string };

let nextId = 0;

/** Fire from anywhere: window.dispatchEvent(new CustomEvent('nxtlink-error', { detail: 'msg' })) */
export function showError(message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nxtlink-error', { detail: message }));
  }
}

export default function ErrorToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    function handler(e: Event) {
      const msg = (e as CustomEvent<string>).detail;
      if (!msg) return;
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, message: msg }]);
      setTimeout(() => dismiss(id), 5000);
    }
    window.addEventListener('nxtlink-error', handler);
    return () => window.removeEventListener('nxtlink-error', handler);
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto animate-slide-in flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg max-w-[340px]"
          style={{
            background: '#1a1012',
            border: '1px solid rgba(255,59,48,0.25)',
            color: '#ff3b30',
            fontSize: '12px',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          <span className="shrink-0 mt-px">●</span>
          <span className="flex-1 leading-relaxed" style={{ color: '#f0f0f0' }}>
            {t.message}
          </span>
          <button
            onClick={() => dismiss(t.id)}
            className="shrink-0 text-[10px] opacity-40 hover:opacity-80 transition-opacity"
            style={{ color: '#f0f0f0' }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
