'use client';

import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { COLORS, Z } from '@/lib/tokens';

// ─── Props ──────────────────────────────────────────────────────────────────

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  accentColor: string;
  children: React.ReactNode;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Drawer({ open, onClose, title, accentColor, children }: DrawerProps) {
  // ── Lock body scroll ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ── Escape to close ──────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  // ── SSR guard ────────────────────────────────────────────────────────────
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* ── Overlay ────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: Z.modal,
          background: `${COLORS.bg}66`,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 300ms ease-out',
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Drawer panel ───────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed"
        style={{
          zIndex: Z.modal + 1,
          background: COLORS.surface,
          borderLeft: `2px solid ${accentColor}33`,
          transition: 'transform 300ms ease-out',
          /* Desktop: right slide, 480px wide */
          /* Mobile: bottom sheet, full width */
          ...desktopStyles(open),
        }}
      >
        {/* Mobile override via media query injected as inline style workaround */}
        <style>{`
          @media (max-width: 767px) {
            [data-nxtlink-drawer] {
              top: auto !important;
              bottom: 0 !important;
              left: 0 !important;
              right: 0 !important;
              width: 100% !important;
              max-height: 85vh !important;
              border-left: none !important;
              border-top: 2px solid ${accentColor}33 !important;
              border-radius: 16px 16px 0 0 !important;
              transform: ${open ? 'translateY(0)' : 'translateY(100%)'} !important;
            }
          }
        `}</style>

        <div
          data-nxtlink-drawer=""
          className="flex flex-col h-full"
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: 480,
            maxWidth: '100vw',
            background: COLORS.surface,
            borderLeft: `2px solid ${accentColor}33`,
            transform: open ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 300ms ease-out',
            zIndex: Z.modal + 1,
          }}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div
            className="flex items-center justify-between px-5 py-4 shrink-0"
            style={{ borderBottom: `1px solid ${COLORS.border}` }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="block w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: accentColor }}
              />
              <span
                className="font-mono text-[13px] truncate"
                style={{ color: `${COLORS.text}cc` }}
              >
                {title}
              </span>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md transition-colors"
              style={{ color: COLORS.muted }}
              aria-label="Close drawer"
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = `${COLORS.text}0d`)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M2 2l10 10M12 2L2 12" />
              </svg>
            </button>
          </div>

          {/* ── Scrollable content ──────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

// ─── Desktop styles helper ──────────────────────────────────────────────────

function desktopStyles(open: boolean): React.CSSProperties {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    width: 480,
    maxWidth: '100vw',
    transform: open ? 'translateX(0)' : 'translateX(100%)',
    pointerEvents: open ? 'auto' : 'none',
  };
}
