'use client';

// THE shared quote-cart store (Wave 1 task #4). One localStorage key
// (`nxt_cart`) so an anonymous visitor's cart survives the magic-link auth
// round-trip; once signed in, the local cart merges with the account cart
// (`cart_items` via /api/buyer/cart) so nothing is ever lost. Every write
// broadcasts `nxt_cart_change`, keeping all mounted cart UIs (header badge,
// listing cards, /cart page) in sync — same event pattern as `nxt_lang`.

import { useCallback, useEffect, useState } from 'react';

export interface CartItem {
  id: string; // listing id
  kind: 'product' | 'service';
  name: string;
  vendor_id: string | null;
  vendor_name: string | null;
  qty: number;
  note?: string;
  added_at: number;
}

const KEY = 'nxt_cart';
const EVT = 'nxt_cart_change';
const MAX_ITEMS = 50;

function clampQty(n: unknown): number {
  const q = Math.round(Number(n));
  return Number.isFinite(q) ? Math.min(999, Math.max(1, q)) : 1;
}

/** Read + sanitize the local cart. Safe anywhere client-side. */
export function readCart(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const out: CartItem[] = [];
    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') continue;
      const it = entry as Partial<CartItem>;
      const id = String(it.id || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        kind: it.kind === 'service' ? 'service' : 'product',
        name: String(it.name || ''),
        vendor_id: it.vendor_id ? String(it.vendor_id) : null,
        vendor_name: it.vendor_name ? String(it.vendor_name) : null,
        qty: clampQty(it.qty),
        note: typeof it.note === 'string' ? it.note.slice(0, 300) : undefined,
        added_at: Number(it.added_at) || Date.now(),
      });
      if (out.length >= MAX_ITEMS) break;
    }
    return out;
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_ITEMS))); } catch { /* private mode */ }
  try { window.dispatchEvent(new Event(EVT)); } catch { /* non-browser */ }
}

/**
 * Sign-out hook: wipes the local cart so the next person on a shared device
 * never inherits the previous account's items. Call BEFORE redirecting away
 * from sign-out. Also resets the module-level account-sync state so a fresh
 * sign-in re-checks /api/buyer/cart instead of reusing a stale linked state.
 */
export function clearLocalCart() {
  try { localStorage.removeItem(KEY); } catch { /* private mode */ }
  accountLinked = false;
  syncPromise = null;
  try { window.dispatchEvent(new Event(EVT)); } catch { /* non-browser */ }
}

// ---- account sync (signed-in buyers only; anonymous stays localStorage) ----
// Module-level so 50 mounted hooks (one per listing card) share ONE fetch.
let accountLinked = false;
let syncPromise: Promise<boolean> | null = null;

interface ServerCartItem {
  listing_id: string; kind: string; qty: number; note: string | null;
  name: string | null; vendor_id: string | null; vendor_name: string | null;
}

function pushToAccount(items: CartItem[]) {
  if (!accountLinked) return;
  fetch('/api/buyer/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: items.map((i) => ({ listing_id: i.id, kind: i.kind, qty: i.qty, note: i.note || null })) }),
  }).catch(() => {});
}

/** Union of local + account carts — nothing is lost in either direction. */
function mergeCarts(local: CartItem[], server: ServerCartItem[]): CartItem[] {
  const byId = new Map<string, CartItem>(local.map((i) => [i.id, i]));
  for (const s of server) {
    const id = String(s.listing_id || '');
    if (!id) continue;
    const existing = byId.get(id);
    if (existing) {
      byId.set(id, {
        ...existing,
        qty: Math.max(existing.qty, clampQty(s.qty)),
        note: existing.note || (typeof s.note === 'string' ? s.note.slice(0, 300) : undefined) || undefined,
        name: existing.name || s.name || '',
        vendor_id: existing.vendor_id || s.vendor_id || null,
        vendor_name: existing.vendor_name || s.vendor_name || null,
      });
    } else {
      byId.set(id, {
        id,
        kind: s.kind === 'service' ? 'service' : 'product',
        name: s.name || '',
        vendor_id: s.vendor_id || null,
        vendor_name: s.vendor_name || null,
        qty: clampQty(s.qty),
        note: typeof s.note === 'string' && s.note ? s.note.slice(0, 300) : undefined,
        added_at: Date.now(),
      });
    }
  }
  return Array.from(byId.values()).slice(0, MAX_ITEMS);
}

function ensureAccountSync(): Promise<boolean> {
  if (!syncPromise) {
    syncPromise = (async () => {
      try {
        const d = await fetch('/api/buyer/cart').then((r) => r.json());
        if (!d?.signed_in) return false;
        accountLinked = true;
        const merged = mergeCarts(readCart(), (d.items || []) as ServerCartItem[]);
        writeCart(merged);
        pushToAccount(merged); // idempotent full write of the merged result
        return true;
      } catch {
        return false; // anonymous / offline — localStorage only
      }
    })();
  }
  return syncPromise;
}

/** Cart state + actions, synchronized across every mounted instance. */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [synced, setSynced] = useState(accountLinked);

  useEffect(() => {
    const refresh = () => setItems(readCart());
    refresh();
    window.addEventListener(EVT, refresh);
    window.addEventListener('storage', refresh);
    ensureAccountSync().then((linked) => { if (linked) setSynced(true); });
    return () => { window.removeEventListener(EVT, refresh); window.removeEventListener('storage', refresh); };
  }, []);

  const mutate = useCallback((fn: (prev: CartItem[]) => CartItem[]) => {
    const next = fn(readCart()).slice(0, MAX_ITEMS);
    writeCart(next);
    setItems(next);
    pushToAccount(next);
  }, []);

  const toggle = useCallback((item: Omit<CartItem, 'qty' | 'added_at'> & { qty?: number }) => {
    mutate((prev) => (prev.some((i) => i.id === item.id)
      ? prev.filter((i) => i.id !== item.id)
      : [...prev, { ...item, qty: clampQty(item.qty ?? 1), added_at: Date.now() }]));
  }, [mutate]);

  const remove = useCallback((id: string) => { mutate((prev) => prev.filter((i) => i.id !== id)); }, [mutate]);
  const setQty = useCallback((id: string, qty: number) => {
    mutate((prev) => prev.map((i) => (i.id === id ? { ...i, qty: clampQty(qty) } : i)));
  }, [mutate]);
  const setNote = useCallback((id: string, note: string) => {
    mutate((prev) => prev.map((i) => (i.id === id ? { ...i, note: note.slice(0, 300) || undefined } : i)));
  }, [mutate]);
  const clear = useCallback(() => { mutate(() => []); }, [mutate]);
  const has = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  return { items, count: items.length, has, toggle, remove, setQty, setNote, clear, synced };
}
