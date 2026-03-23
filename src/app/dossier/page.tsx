'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Brain } from '@/lib/brain';
import { BottomNav, TopBar } from '@/components/ui';
import { COLORS } from '@/lib/tokens';

const SUGGESTED = [
  { label: 'Defense AI',          slug: 'defense-ai' },
  { label: 'Booz Allen Hamilton', slug: 'booz-allen-hamilton' },
  { label: 'Cybersecurity',       slug: 'cybersecurity' },
  { label: 'Border Tech',         slug: 'border-tech' },
  { label: 'AI / ML',             slug: 'ai-ml' },
  { label: 'Energy Storage',      slug: 'energy-storage' },
  { label: 'Logistics',           slug: 'logistics' },
  { label: 'Healthcare Tech',     slug: 'healthcare' },
];

const RECENT_KEY = 'nxt_recent_dossiers';
const MAX_RECENT = 8;

type TrendSector = { name: string; momentum: string; signal_count: number };

export default function DossierHomePage() {
  const router  = useRouter();
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<Array<{ label: string; slug: string }>>([]);
  const [trending, setTrending] = useState<TrendSector[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecents(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    Brain.industry('all')
      .then((data) => {
        setTrending(
          [...data.trending_sectors]
            .filter((s) => s.momentum === 'accelerating' || s.signal_count > 3)
            .sort((a, b) => b.signal_count - a.signal_count)
            .slice(0, 5)
        );
      })
      .catch(() => {});
  }, []);

  const navigate = useCallback((slug: string, label: string) => {
    try {
      const raw   = localStorage.getItem(RECENT_KEY);
      const prev: Array<{ label: string; slug: string }> = raw ? JSON.parse(raw) : [];
      const next  = [{ label, slug }, ...prev.filter(r => r.slug !== slug)].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch { /* ignore */ }
    router.push(`/dossier/${slug}`);
  }, [router]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    const slug = trimmed.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    navigate(slug, trimmed);
  }, [query, navigate]);

  return (
    <div className="min-h-screen pb-20 overflow-y-auto" style={{ background: COLORS.bg, color: COLORS.text }}>
      <TopBar />

      {/* Hero search */}
      <div className="flex flex-col items-center pt-14 sm:pt-24 pb-10 sm:pb-14 px-6 animate-fade-up">
        <span className="font-mono text-[9px] tracking-[0.3em] uppercase mb-4" style={{ color: COLORS.dim }}>
          INTELLIGENCE DOSSIER
        </span>
        <h1 className="font-grotesk text-[24px] sm:text-[32px] font-semibold text-center tracking-tight leading-snug mb-3">
          Search Any Industry or Vendor
        </h1>
        <p className="font-grotesk text-[13px] text-center max-w-[440px] leading-relaxed font-light mb-8 sm:mb-10" style={{ color: COLORS.muted }}>
          Get a plain-English intelligence brief with signals, trajectory, and a clear verdict.
        </p>

        <form onSubmit={handleSearch} className="w-full max-w-[560px] flex flex-col sm:flex-row gap-3">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. Defense AI, Booz Allen..."
            className="flex-1 min-w-0 font-grotesk text-[14px] font-light px-6 py-3.5 outline-none transition-all duration-200 placeholder:opacity-25"
            style={{
              background: COLORS.card,
              border: `1px solid ${query ? COLORS.accent + '40' : COLORS.border}`,
              borderRadius: '24px',
              color: COLORS.text,
            }}
          />
          <button
            type="submit"
            disabled={!query.trim()}
            className="font-mono text-[11px] tracking-[0.15em] font-semibold px-6 py-3.5 cursor-pointer transition-all duration-200 hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: query.trim() ? COLORS.accent : COLORS.card,
              color: query.trim() ? COLORS.bg : COLORS.muted,
              borderRadius: '24px',
              border: query.trim() ? 'none' : `1px solid ${COLORS.border}`,
            }}
          >
            OPEN DOSSIER
          </button>
        </form>
      </div>

      {/* Recent dossiers */}
      {recents.length > 0 && (
        <section className="max-w-[680px] mx-auto mb-10 px-6">
          <span className="font-mono text-[9px] tracking-[0.3em] uppercase block mb-4" style={{ color: `${COLORS.text}22` }}>
            RECENTLY VIEWED
          </span>
          <div className="flex flex-wrap gap-2.5">
            {recents.map(r => (
              <button
                key={r.slug}
                onClick={() => navigate(r.slug, r.label)}
                className="rounded-full font-mono text-[10px] tracking-[0.12em] px-4 py-2 cursor-pointer transition-all duration-200 hover:translate-y-[-1px] min-h-[36px]"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.accent }}
              >
                {r.label.toUpperCase()}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="divider-glow max-w-[680px] mx-auto" />

      {/* Trending Now */}
      {trending.length > 0 && (
        <section className="max-w-[680px] mx-auto mb-10 px-6 pt-2">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="font-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: `${COLORS.text}22` }}>TRENDING NOW</span>
            <span className="w-1.5 h-1.5 rounded-full live-pulse" style={{ background: COLORS.green, boxShadow: `0 0 6px ${COLORS.green}` }} />
          </div>
          <div className="flex gap-2.5 flex-wrap">
            {trending.map(s => {
              const isAccel = s.momentum === 'accelerating';
              const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              return (
                <button
                  key={s.name}
                  onClick={() => navigate(slug, s.name)}
                  className="flex items-center gap-2 rounded-full px-4 py-2.5 font-mono text-[10px] tracking-[0.1em] cursor-pointer transition-all duration-200 hover:translate-y-[-1px] min-h-[38px]"
                  style={{
                    background: isAccel ? `${COLORS.green}06` : COLORS.card,
                    border: `1px solid ${isAccel ? `${COLORS.green}18` : COLORS.border}`,
                    color: isAccel ? COLORS.green : COLORS.accent,
                  }}
                >
                  <span>{isAccel ? '↑' : '→'}</span>
                  {s.name.toUpperCase()}
                  <span className="text-[8px]" style={{ color: `${COLORS.text}20` }}>{s.signal_count}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="divider-glow max-w-[680px] mx-auto" />

      {/* Suggested */}
      <section className="max-w-[680px] mx-auto px-6 pt-2">
        <span className="font-mono text-[9px] tracking-[0.3em] uppercase block mb-4" style={{ color: `${COLORS.text}22` }}>
          SUGGESTED
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SUGGESTED.map(s => (
            <button
              key={s.slug}
              onClick={() => navigate(s.slug, s.label)}
              className="font-grotesk text-[12px] font-medium px-4 py-4 text-left flex items-center gap-2.5 cursor-pointer transition-all duration-200 hover:translate-y-[-1px] min-h-[48px]"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '20px', color: COLORS.text }}
            >
              <span style={{ color: COLORS.accent }} className="text-[10px]">▶</span>
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  );
}
