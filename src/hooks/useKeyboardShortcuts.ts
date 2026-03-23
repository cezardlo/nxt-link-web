'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ─── Global Keyboard Shortcuts ───────────────────────────────────────────────
// Bloomberg-inspired: power users never touch the mouse.
//
// Navigation:
//   Ctrl+1..5  — Navigate to core pages (World, Industry, Solve, Store, Command)
//   Ctrl+K     — Open command palette / search (handled by CmdK component)
//   Escape     — Close modals, go back
//
// Signal actions:
//   J/K        — Navigate up/down in signal feeds
//   Enter      — Open selected signal
//   F          — Follow/unfollow selected item
//   M          — Mark as read
//
// View modes:
//   1-4        — Switch view filter modes (when on /world: STD/CRT/NVG/FLIR)

type ShortcutHandler = (e: KeyboardEvent) => void;

const NAV_ROUTES = ['/world', '/industry', '/solve', '/store', '/command'];

/**
 * Global keyboard shortcuts for navigation.
 * Mount once at the app level (in AppShell or layout).
 */
export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handler: ShortcutHandler = (e) => {
      // Skip when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.contentEditable === 'true'
      ) {
        return;
      }

      // Ctrl/Cmd + number → navigate to core page
      if (e.ctrlKey || e.metaKey) {
        const idx = parseInt(e.key, 10);
        if (idx >= 1 && idx <= NAV_ROUTES.length) {
          e.preventDefault();
          router.push(NAV_ROUTES[idx - 1]);
          return;
        }
      }

      // G then letter — "go to" shortcuts (vim-style)
      // Handled via two-key chord below

      // Escape — go back or close
      if (e.key === 'Escape') {
        // Let modals handle their own escape first
        // Only navigate back if no modal is open
        const hasOpenModal = document.querySelector('[role="dialog"]');
        if (!hasOpenModal) {
          router.back();
        }
      }

      // ? — show keyboard shortcut help (future)
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router]);
}

/**
 * Feed navigation shortcuts (J/K/Enter) for signal lists.
 * Mount inside components that render signal feeds.
 */
export function useFeedNavigation(options: {
  itemCount: number;
  onSelect: (index: number) => void;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
}) {
  const { itemCount, onSelect, selectedIndex, onSelectedIndexChange } = options;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case 'j': // Down
        case 'ArrowDown':
          e.preventDefault();
          onSelectedIndexChange(Math.min(selectedIndex + 1, itemCount - 1));
          break;
        case 'k': // Up
        case 'ArrowUp':
          e.preventDefault();
          onSelectedIndexChange(Math.max(selectedIndex - 1, 0));
          break;
        case 'Enter':
          if (selectedIndex >= 0) {
            e.preventDefault();
            onSelect(selectedIndex);
          }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [itemCount, onSelect, selectedIndex, onSelectedIndexChange]);
}
