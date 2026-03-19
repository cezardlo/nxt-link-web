'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brain } from '@/lib/brain';

// ─── Design tokens ────────────────────────────────────────────────────────────
const ORANGE = '#ff6600';
const CYAN   = '#00d4ff';
const FONT   = "'JetBrains Mono', 'Courier New', monospace";

// ─── Constants ────────────────────────────────────────────────────────────────
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

// ─── Bottom nav ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'TODAY',   href: '/' },
  { label: 'EXPLORE', href: '/explore' },
  { label: 'WORLD',   href: '/world' },
  { label: 'FOLLOW',  href: '/following' },
  { label: 'STORE',   href: '/store' },
  { label: 'DOSSIER', href: '/dossier', active: true },
];

// ─── Mobile hook ──────────────────────────────────────────────────────────────
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DossierHomePage() {
  const router  = useRouter();
  const isMobile = useIsMobile();
  const [query,    setQuery]    = useState('');
  const [recents,  setRecents]  = useState<Array<{ label: string; slug: string }>>([]);
  const [trending, setTrending] = useState<TrendSector[]>([]);

  // Load recent dossiers from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecents(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // Fetch live trending sectors
  useEffect(() => {
    Brain.industry('all')
      .then((data) => {
        const sectors = data.trending_sectors;
        setTrending(
          [...sectors]
            .filter((s) => s.momentum === 'accelerating' || s.signal_count > 3)
            .sort((a, b) => b.signal_count - a.signal_count)
            .slice(0, 5)
        );
      })
      .catch(() => {});
  }, []);

  const navigate = useCallback((slug: string, label: string) => {
    // Persist to recents
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
    <div
      style={{ fontFamily: FONT, background: '#000', minHeight: '100vh', color: '#fff', paddingBottom: 64 }}
    >
      {/* ── Header ── */}
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: ORANGE, fontSize: 13, letterSpacing: '0.15em', textDecoration: 'none', fontWeight: 700 }}>
          NXT//LINK
        </Link>
        <span style={{ color: '#444', fontSize: 10, letterSpacing: '0.2em' }}>DOSSIER SEARCH</span>
      </div>

      {/* ── Hero search ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: isMobile ? 40 : 80, paddingBottom: isMobile ? 28 : 48, paddingLeft: 20, paddingRight: 20 }}>
        <div style={{ color: '#333', fontSize: 9, letterSpacing: '0.3em', marginBottom: 12 }}>
          INTELLIGENCE DOSSIER
        </div>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#fff', margin: '0 0 8px', textAlign: 'center', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
          Search Any Industry or Vendor
        </h1>
        <p style={{ color: '#555', fontSize: 11, marginBottom: isMobile ? 24 : 36, textAlign: 'center', maxWidth: 420, lineHeight: 1.6 }}>
          Get a plain-English intelligence brief with signals, trajectory, and a clear YES / WAIT / KEEP WATCHING verdict.
        </p>

        {/* Search form */}
        <form
          onSubmit={handleSearch}
          style={{ width: '100%', maxWidth: 560, display: 'flex', gap: 8, flexWrap: isMobile ? 'wrap' : 'nowrap' }}
        >
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. Defense AI, Booz Allen…"
            style={{
              flex: 1,
              minWidth: 0,
              background: '#0a0a0a',
              border: `1px solid ${query ? ORANGE : '#222'}`,
              borderRadius: 4,
              color: '#fff',
              fontFamily: FONT,
              fontSize: isMobile ? 12 : 13,
              padding: '10px 14px',
              outline: 'none',
              transition: 'border-color 0.15s',
              width: isMobile ? '100%' : undefined,
            }}
          />
          <button
            type="submit"
            disabled={!query.trim()}
            style={{
              background: query.trim() ? ORANGE : '#111',
              border: `1px solid ${query.trim() ? ORANGE : '#222'}`,
              borderRadius: 4,
              color: query.trim() ? '#000' : '#444',
              fontFamily: FONT,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.15em',
              padding: '10px 20px',
              cursor: query.trim() ? 'pointer' : 'default',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
              width: isMobile ? '100%' : undefined,
            }}
          >
            OPEN DOSSIER
          </button>
        </form>
      </div>

      {/* ── Recent dossiers ── */}
      {recents.length > 0 && (
        <section style={{ maxWidth: 680, margin: '0 auto 40px', padding: '0 20px' }}>
          <div style={{ color: '#333', fontSize: 9, letterSpacing: '0.25em', marginBottom: 12 }}>
            RECENTLY VIEWED
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {recents.map(r => (
              <button
                key={r.slug}
                onClick={() => navigate(r.slug, r.label)}
                style={{
                  background: '#0d0d0d',
                  border: '1px solid #1e1e1e',
                  borderRadius: 3,
                  color: CYAN,
                  fontFamily: FONT,
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = CYAN)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
              >
                {r.label.toUpperCase()}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Trending Now (live) ── */}
      {trending.length > 0 && (
        <section style={{ maxWidth: 680, margin: '0 auto 32px', padding: '0 20px' }}>
          <div style={{ color: '#333', fontSize: 9, letterSpacing: '0.25em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            TRENDING NOW
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88', display: 'inline-block', boxShadow: '0 0 6px #00ff88' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {trending.map(s => {
              const isAccel = s.momentum === 'accelerating';
              const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              return (
                <button
                  key={s.name}
                  onClick={() => navigate(slug, s.name)}
                  style={{
                    background: isAccel ? 'rgba(0,255,136,0.05)' : '#0a0a0a',
                    border: `1px solid ${isAccel ? 'rgba(0,255,136,0.25)' : '#1a1a1a'}`,
                    borderRadius: 4, padding: '7px 12px', cursor: 'pointer',
                    fontFamily: FONT, fontSize: 10, letterSpacing: '0.1em',
                    color: isAccel ? '#00ff88' : CYAN,
                    display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = isAccel ? '#00ff88' : CYAN; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = isAccel ? 'rgba(0,255,136,0.25)' : '#1a1a1a'; }}
                >
                  <span>{isAccel ? '↑' : '→'}</span>
                  {s.name.toUpperCase()}
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>{s.signal_count}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Suggested dossiers ── */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ color: '#333', fontSize: 9, letterSpacing: '0.25em', marginBottom: 12 }}>
          SUGGESTED
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {SUGGESTED.map(s => (
            <button
              key={s.slug}
              onClick={() => navigate(s.slug, s.label)}
              style={{
                background: '#080808',
                border: '1px solid #1a1a1a',
                borderRadius: 4,
                color: '#fff',
                fontFamily: FONT,
                fontSize: 11,
                letterSpacing: '0.08em',
                padding: '12px 14px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#333';
                e.currentTarget.style.background = '#101010';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#1a1a1a';
                e.currentTarget.style.background = '#080808';
              }}
            >
              <span style={{ color: ORANGE, fontSize: 10 }}>▶</span>
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Bottom nav ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 48, background: '#050505',
        borderTop: '1px solid #1a1a1a',
        display: 'flex', alignItems: 'stretch',
        zIndex: 50,
      }}>
        {NAV_ITEMS.map(item => (
          <Link
            key={item.label}
            href={item.href}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT,
              fontSize: 9,
              letterSpacing: '0.15em',
              color: item.active ? ORANGE : '#444',
              textDecoration: 'none',
              borderTop: item.active ? `2px solid ${ORANGE}` : '2px solid transparent',
              transition: 'color 0.15s',
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
