// Minimal in-memory fake of the Supabase query builder — just enough surface
// (select/eq/ilike/is/in/contains/order/limit/insert/update + maybeSingle/
// single/await-as-thenable) to exercise src/lib/vendor/profile.ts and
// src/lib/requests/dispatch.ts without a live database. Not a general-purpose
// Supabase mock — only implements what those two call.

import type { SupabaseClient } from '@supabase/supabase-js';

type Row = Record<string, unknown>;
type Table = Row[];

function likeToRegex(pattern: string): RegExp {
  // Callers already escape their own %/_ via escLike before building the
  // pattern, so a straight %→.* swap (case-insensitive) is enough here.
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, (c) => (c === '%' ? c : `\\${c}`));
  return new RegExp(`^${escaped.replace(/%/g, '.*')}$`, 'i');
}

export function makeFakeDb(seed: Record<string, Table> = {}) {
  const store: Record<string, Table> = seed;
  let autoId = 1;

  function from(table: string) {
    if (!store[table]) store[table] = [];
    const rows = store[table];
    const filters: Array<(r: Row) => boolean> = [];
    let mode: 'select' | 'insert' | 'update' = 'select';
    let payload: Row | null = null;
    let orderKey: string | null = null;
    let orderAsc = true;
    let limitN: number | null = null;

    function exec(): Row[] {
      if (mode === 'insert') {
        const row: Row = { id: `row-${autoId++}`, ...payload };
        rows.push(row);
        return [row];
      }
      if (mode === 'update') {
        const matched: Row[] = [];
        for (const r of rows) {
          if (filters.every((f) => f(r))) { Object.assign(r, payload); matched.push(r); }
        }
        return matched;
      }
      let out = rows.filter((r) => filters.every((f) => f(r)));
      if (orderKey) {
        const key = orderKey;
        out = out.slice().sort((a, b) => {
          const av = a[key] as unknown, bv = b[key] as unknown;
          if (av === bv) return 0;
          return (av! > bv! ? 1 : -1) * (orderAsc ? 1 : -1);
        });
      }
      if (limitN != null) out = out.slice(0, limitN);
      return out;
    }

    const api = {
      select() { return api; },
      eq(col: string, val: unknown) { filters.push((r) => r[col] === val); return api; },
      ilike(col: string, val: string) { const re = likeToRegex(val); filters.push((r) => re.test(String(r[col] ?? ''))); return api; },
      is(col: string, val: null) { filters.push((r) => (r[col] ?? null) === val); return api; },
      in(col: string, vals: unknown[]) { filters.push((r) => vals.includes(r[col])); return api; },
      contains() { return api; },
      order(col: string, opts?: { ascending?: boolean }) { orderKey = col; orderAsc = opts?.ascending !== false; return api; },
      limit(n: number) { limitN = n; return api; },
      insert(p: Row) { mode = 'insert'; payload = p; return api; },
      update(p: Row) { mode = 'update'; payload = p; return api; },
      async maybeSingle() { const r = exec(); return { data: r[0] ?? null, error: null }; },
      async single() { const r = exec(); return r[0] ? { data: r[0], error: null } : { data: null, error: { message: 'no rows' } }; },
      // Lets callers `await db.from(...).eq(...).limit(...)` directly (no
      // .maybeSingle()/.single()), same as dispatch.ts's vendor query.
      then(resolve: (v: { data: Row[]; error: null }) => unknown, reject?: (e: unknown) => unknown) {
        return Promise.resolve({ data: exec(), error: null }).then(resolve, reject);
      },
    };
    return api;
  }

  return { from, _store: store } as unknown as SupabaseClient & { _store: Record<string, Table> };
}
