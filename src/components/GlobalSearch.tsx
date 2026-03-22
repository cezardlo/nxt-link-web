'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { INDUSTRIES, TECHNOLOGY_CATALOG } from '@/lib/data/technology-catalog';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';
import { PRODUCT_CATALOG } from '@/lib/data/product-catalog';

type SearchResult = {
  label: string;
  href: string;
  type: 'industry' | 'vendor' | 'technology' | 'product' | 'page' | 'explore';
  color: string;
};

const PAGES: SearchResult[] = [
  { label: 'Industries', href: '/explore', type: 'page', color: '#00d4ff' },
  { label: 'Companies', href: '/companies', type: 'page', color: '#00ff88' },
  { label: 'Products', href: '/products', type: 'page', color: '#a855f7' },
  { label: 'Problems', href: '/problems', type: 'page', color: '#f97316' },
  { label: 'Technologies', href: '/technologies', type: 'page', color: '#00d4ff' },
  { label: 'Radar', href: '/radar', type: 'page', color: '#ffb800' },
  { label: 'Timeline', href: '/timeline', type: 'page', color: '#00d4ff' },
  { label: 'Map', href: '/map', type: 'page', color: '#00d4ff' },
  { label: 'Opportunities', href: '/opportunities', type: 'page', color: '#00ff88' },
  { label: 'Signals', href: '/signals', type: 'page', color: '#f97316' },
];

function buildIndex(): SearchResult[] {
  const results: SearchResult[] = [...PAGES];

  // Industries
  for (const ind of INDUSTRIES) {
    results.push({ label: ind.label, href: `/industry/${ind.slug}`, type: 'industry', color: ind.color });
  }

  // Vendors
  for (const v of Object.values(EL_PASO_VENDORS)) {
    results.push({ label: v.name, href: `/vendor/${v.id}`, type: 'vendor', color: '#ffb800' });
  }

  // Technologies
  for (const t of TECHNOLOGY_CATALOG) {
    results.push({ label: t.name, href: `/technology/${t.id}`, type: 'technology', color: '#00d4ff' });
  }

  // Products
  for (const p of PRODUCT_CATALOG) {
    results.push({ label: p.name, href: `/product/${p.id}`, type: 'product', color: '#a855f7' });
  }

  return results;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const indexRef = useRef<SearchResult[]>([]);

  // Build index once
  useEffect(() => {
    indexRef.current = buildIndex();
  }, []);

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = query.length > 0
    ? (() => {
        const filtered = indexRef.current.filter(r => r.label.toLowerCase().includes(query.toLowerCase())).slice(0, 12);
        const exploreSlug = query.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
        filtered.push({ type: 'explore', label: `Explore "${query}" as industry`, href: `/industry/${exploreSlug}`, color: '#00d4ff' });
        return filtered;
      })()
    : [];

  const navigate = useCallback((href: string) => {
    setOpen(false);
    router.push(href);
  }, [router]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) { navigate(results[selected].href); }
  }

  if (!open) return null;

  const TYPE_LABEL: Record<string, string> = {
    industry: 'INDUSTRY', vendor: 'VENDOR', technology: 'TECH', product: 'PRODUCT', page: 'PAGE', explore: 'EXPLORE',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg mx-4 bg-black border border-white/[0.10] rounded-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center border-b border-white/[0.06] px-4">
          <svg className="w-4 h-4 text-white/20 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search industries, vendors, technologies, products..."
            className="flex-1 bg-transparent font-mono text-[13px] text-white/70 placeholder-white/20
                       py-4 px-3 outline-none"
          />
          <span className="font-mono text-[8px] text-white/15 border border-white/[0.06] px-1.5 py-0.5 rounded-sm">ESC</span>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-[300px] overflow-y-auto py-2">
            {results.map((r, i) => (
              <button
                key={`${r.type}-${r.href}`}
                onClick={() => navigate(r.href)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selected ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: r.color, boxShadow: `0 0 4px ${r.color}60` }}
                />
                <span className="font-mono text-[12px] text-white/60 flex-1 truncate">{r.label}</span>
                <span
                  className="font-mono text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm border shrink-0"
                  style={{ color: `${r.color}80`, borderColor: `${r.color}20` }}
                >
                  {TYPE_LABEL[r.type] || r.type.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Hint */}
        {query.length === 0 && (
          <div className="px-4 py-4">
            <p className="font-mono text-[9px] text-white/15 text-center">
              Type to search across all industries, vendors, technologies, and products
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
