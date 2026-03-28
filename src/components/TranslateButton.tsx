'use client';

import { useEffect, useRef, useState } from 'react';
import { COLORS } from '@/lib/tokens';

declare global {
  interface Window {
    google: { translate: { TranslateElement: new (opts: Record<string, unknown>, id: string) => void } };
    googleTranslateElementInit: () => void;
  }
}

export function TranslateButton() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: 'en,es,zh-CN,ja,ko,de,fr,pt,ar,hi',
          layout: 0, // SIMPLE
          autoDisplay: false,
        },
        'google_translate_element'
      );
    };

    const script = document.createElement('script');
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex flex-col items-center gap-[3px] px-3.5 py-[7px] rounded-[10px] transition-all duration-150"
        style={{
          color: open ? COLORS.accent : COLORS.dim,
          background: open ? `${COLORS.accent}0f` : 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
        aria-label="Translate page"
      >
        <span className="w-[18px] h-[18px]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 8l6 0" />
            <path d="M4 5h8" />
            <path d="M8 5v1a4 4 0 0 0 4 4 3.9 3.9 0 0 1-2 1" />
            <path d="M6 15l-2 5" />
            <path d="M18 15l2 5" />
            <path d="M7 18h10" />
            <path d="M12 12l4 8" />
            <path d="M12 12l-4 8" />
          </svg>
        </span>
        <span
          className="font-mono uppercase"
          style={{ fontSize: 8, letterSpacing: '0.08em' }}
        >
          Lang
        </span>
      </button>

      {/* Google Translate dropdown */}
      {open && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2"
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '12px',
            padding: '12px',
            minWidth: '180px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontFamily: "'IBM Plex Mono', monospace",
              color: COLORS.muted,
              letterSpacing: '0.08em',
              marginBottom: '8px',
              textTransform: 'uppercase',
            }}
          >
            Translate Page
          </div>
          <div id="google_translate_element" />
        </div>
      )}
    </div>
  );
}
