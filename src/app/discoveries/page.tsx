'use client';

// src/app/discoveries/page.tsx
// Innovation Radar — browse 973+ tracked research breakthroughs worldwide

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ExternalLink, Zap, FlaskConical, Rocket, RefreshCw, ChevronDown } from 'lucide-react';
import { COLORS, FONT, FONT_MONO } from '@/lib/tokens';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Discovery {
  id: string;
  title: string;
  summary: string | null;
  discovery_type: string;
  source_url: string | null;
  source_name: string | null;
  research_institution: string | null;
  country_id: string | null;
  trl_level: number | null;
  published_at: string | null;
  iker_impact_score: number | null;
  created_at: string;
}

interface DiscoveriesResponse {
  discoveries: Discovery[];
  total: number;
  by_field: Record<string, number>;
  by_type: Record<string, number>;
  page: number;
  page_size: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const FIELD_TABS = [
  { key: 'all', label: 'All' },
  { key: 'ai-ml', label: 'AI/ML' },
  { key: 'quantum', label: 'Quantum' },
  { key: 'fusion', label: 'Fusion' },
  { key: 'biotech', label: 'Biotech' },
  { key: 'materials', label: 'Materials' },
  { key: 'energy', label: 'Energy' },
  { key: 'space', label: 'Space' },
  { key: 'robotics', label: 'Robotics' },
];

const TYPE_TABS = [
  { key: 'all', label: 'All Types' },
  { key: 'breakthrough', label: 'Breakthrough' },
  { key: 'paper', label: 'Research Paper' },
  { key: 'spinout', label: 'Spinout' },
  { key: 'grant', label: 'Grant' },
  { key: 'clinical_trial', label: 'Clinical Trial' },
  { key: 'collaboration', label: 'Collaboration' },
];

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  breakthrough: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', label: 'BREAKTHROUGH' },
  paper: { bg: 'rgba(6,182,212,0.10)', text: '#06b6d4', label: 'PAPER' },
  spinout: { bg: 'rgba(168,85,247,0.10)', text: '#a855f7', label: 'SPINOUT' },
  grant: { bg: 'rgba(245,158,11,0.10)', text: '#f59e0b', label: 'GRANT' },
  clinical_trial: { bg: 'rgba(16,185,129,0.10)', text: '#10b981', label: 'CLINICAL TRIAL' },
  collaboration: { bg: 'rgba(59,130,246,0.10)', text: '#3b82f6', label: 'COLLABORATION' },
};

const PAGE_SIZE = 24;

// ── Helper functions ───────────────────────────────────────────────────────────

function impactColor(score: number | null): string {
  if (!score) return COLORS.muted;
  if (score >= 85) return COLORS.green;
  if (score >= 65) return COLORS.amber;
  return COLORS.muted;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = Date.now();
    const diff = now - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function typeStyle(type: string) {
  return TYPE_STYLES[type] ?? { bg: 'rgba(107,107,118,0.15)', text: COLORS.muted, label: type.toUpperCase() };
}

// ── Skeleton Card ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ width: '52px', height: '20px', borderRadius: '6px', background: COLORS.elevated, animation: 'pulse 1.6s ease-in-out infinite' }} />
        <div style={{ width: '80px', height: '20px', borderRadius: '6px', background: COLORS.elevated, animation: 'pulse 1.6s ease-in-out infinite' }} />
      </div>
      <div style={{ height: '40px', borderRadius: '8px', background: COLORS.elevated, animation: 'pulse 1.6s ease-in-out infinite' }} />
      <div style={{ height: '14px', width: '60%', borderRadius: '6px', background: COLORS.elevated, animation: 'pulse 1.6s ease-in-out infinite' }} />
      <div style={{ height: '48px', borderRadius: '8px', background: COLORS.elevated, animation: 'pulse 1.6s ease-in-out infinite' }} />
    </div>
  );
}

// ── Discovery Card ─────────────────────────────────────────────────────────────

function DiscoveryCard({ discovery: d, index }: { discovery: Discovery; index: number }) {
  const ts = typeStyle(d.discovery_type);
  const score = d.iker_impact_score ?? 0;
  const scoreColor = impactColor(d.iker_impact_score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.5), ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        transition: 'border-color 0.2s, background 0.2s',
        cursor: 'default',
      }}
      whileHover={{
        borderColor: COLORS.borderSubtle,
        backgroundColor: COLORS.elevated,
      }}
    >
      {/* Top row: impact badge + type badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {score > 0 && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: `${scoreColor}18`,
              border: `1px solid ${scoreColor}30`,
              borderRadius: '6px', padding: '3px 8px',
            }}
          >
            <Zap size={10} color={scoreColor} />
            <span style={{ fontFamily: FONT_MONO, fontSize: '11px', fontWeight: 700, color: scoreColor, letterSpacing: '0.02em' }}>
              {score}
            </span>
          </div>
        )}
        <div
          style={{
            background: ts.bg,
            borderRadius: '6px',
            padding: '3px 8px',
            fontFamily: FONT,
            fontSize: '10px',
            fontWeight: 600,
            color: ts.text,
            letterSpacing: '0.07em',
          }}
        >
          {ts.label}
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: COLORS.text,
          lineHeight: '1.45',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
        }}
      >
        {d.title}
      </div>

      {/* Institution badge */}
      {d.research_institution && (
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: `${COLORS.accent}10`,
            border: `1px solid ${COLORS.accent}25`,
            borderRadius: '6px', padding: '2px 8px',
            fontFamily: FONT, fontSize: '11px', color: COLORS.accentLight,
            letterSpacing: '0.04em', width: 'fit-content',
          }}
        >
          <FlaskConical size={9} color={COLORS.accentLight} />
          {d.research_institution}
        </div>
      )}

      {/* Source + date row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {d.source_name && (
          <span style={{ fontFamily: FONT, fontSize: '11px', color: COLORS.muted }}>
            {d.source_name}
          </span>
        )}
        {d.source_name && d.published_at && (
          <span style={{ color: COLORS.dim, fontSize: '10px' }}>·</span>
        )}
        {d.published_at && (
          <span style={{ fontFamily: FONT_MONO, fontSize: '10px', color: COLORS.dim }}>
            {formatDate(d.published_at)}
          </span>
        )}
      </div>

      {/* Summary */}
      {d.summary && (
        <div
          style={{
            fontSize: '12px',
            color: COLORS.secondary,
            lineHeight: '1.55',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as const,
          }}
        >
          {d.summary}
        </div>
      )}

      {/* Source link */}
      {d.source_url && (
        <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
          <a
            href={d.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              fontFamily: FONT, fontSize: '11px', color: COLORS.cyan,
              textDecoration: 'none', letterSpacing: '0.04em',
              opacity: 0.85,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.opacity = '1')}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.opacity = '0.85')}
          >
            <ExternalLink size={10} />
            View source
          </a>
        </div>
      )}
    </motion.div>
  );
}

// ── Filter chip ────────────────────────────────────────────────────────────────

function Chip({
  label,
  active,
  color,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  count?: number;
  onClick: () => void;
}) {
  const accentColor = color ?? COLORS.cyan;
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: FONT,
        fontSize: '12px',
        fontWeight: active ? 600 : 400,
        padding: '6px 14px',
        borderRadius: '20px',
        border: active ? `1px solid ${accentColor}50` : `1px solid ${COLORS.border}`,
        background: active ? `${accentColor}18` : COLORS.surface,
        color: active ? accentColor : COLORS.muted,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        letterSpacing: '0.03em',
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', gap: '5px',
      }}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span style={{ fontFamily: FONT_MONO, fontSize: '10px', opacity: 0.6 }}>{count}</span>
      )}
    </button>
  );
}

// ── Main Page Component ────────────────────────────────────────────────────────

export default function DiscoveriesPage() {
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [total, setTotal] = useState(0);
  const [byType, setByType] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [field, setField] = useState('all');
  const [type, setType] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const lastUpdatedAt = useRef<Date>(new Date());

  const fetchDiscoveries = useCallback(
    async (opts: { reset?: boolean; pg?: number } = {}) => {
      const { reset = false, pg = 0 } = opts;
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const params = new URLSearchParams({
          page: String(pg),
          page_size: String(PAGE_SIZE),
        });
        if (field !== 'all') params.set('field', field);
        if (type !== 'all') params.set('type', type);
        if (appliedSearch.trim()) params.set('q', appliedSearch.trim());

        const res = await fetch(`/api/discoveries?${params.toString()}`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data: DiscoveriesResponse = await res.json();

        const newDiscoveries = data.discoveries ?? [];

        if (reset || pg === 0) {
          setDiscoveries(newDiscoveries);
        } else {
          setDiscoveries(prev => [...prev, ...newDiscoveries]);
        }

        setTotal(data.total ?? 0);
        setByType(data.by_type ?? {});
        setHasMore((pg + 1) * PAGE_SIZE < (data.total ?? 0));
        setPage(pg);
        lastUpdatedAt.current = new Date();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load discoveries');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [field, type, appliedSearch],
  );

  // Reload when filters change
  useEffect(() => {
    fetchDiscoveries({ reset: true, pg: 0 });
  }, [fetchDiscoveries]);

  const handleSearch = () => {
    setAppliedSearch(searchInput);
    setPage(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleLoadMore = () => {
    fetchDiscoveries({ pg: page + 1 });
  };

  const handleFieldChange = (f: string) => {
    setField(f);
    setPage(0);
  };

  const handleTypeChange = (t: string) => {
    setType(t);
    setPage(0);
  };

  const hoursAgo = Math.floor((Date.now() - lastUpdatedAt.current.getTime()) / 3600000);
  const uniqueFields = FIELD_TABS.filter(f => f.key !== 'all').length;

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '56px', zIndex: 100,
        background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingLeft: '24px', paddingRight: '24px', fontFamily: FONT,
      }}>
        <a href="/briefing" style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.05em', color: COLORS.text, textDecoration: 'none' }}>
          NXT//LINK
        </a>
        <div style={{ fontSize: '11px', letterSpacing: '0.1em', color: COLORS.cyan, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Rocket size={12} />
          INNOVATION RADAR
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="/briefing" style={{ fontSize: '11px', color: COLORS.muted, textDecoration: 'none', letterSpacing: '0.05em' }}>BRIEFING</a>
          <a href="/map" style={{ fontSize: '11px', color: COLORS.muted, textDecoration: 'none', letterSpacing: '0.05em' }}>MAP</a>
          <a href="/conferences" style={{ fontSize: '11px', color: COLORS.muted, textDecoration: 'none', letterSpacing: '0.05em' }}>EVENTS</a>
          <a href="/discoveries" style={{ fontSize: '11px', color: COLORS.cyan, textDecoration: 'none', letterSpacing: '0.05em' }}>DISCOVERIES</a>
          <a href="/vendors" style={{ fontSize: '11px', color: COLORS.muted, textDecoration: 'none', letterSpacing: '0.05em' }}>VENDORS</a>
        </div>
      </div>

      <div style={{ paddingTop: '56px', maxWidth: '1280px', margin: '0 auto', paddingLeft: '32px', paddingRight: '32px', paddingBottom: '80px' }}>

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ paddingTop: '48px', paddingBottom: '32px' }}
        >
          <h1 style={{
            fontFamily: FONT,
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 700,
            color: COLORS.text,
            margin: 0,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
          }}>
            Innovation Radar
          </h1>
          <p style={{
            fontFamily: FONT,
            fontSize: '15px',
            color: COLORS.secondary,
            marginTop: '10px',
            marginBottom: '24px',
            letterSpacing: '0.01em',
          }}>
            Breakthroughs, research, and discoveries happening worldwide.
          </p>

          {/* Stats strip */}
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <StatBadge value="973" label="tracked" color={COLORS.cyan} />
            <StatBadge value={String(uniqueFields)} label="fields" color={COLORS.green} />
            <StatBadge value={hoursAgo === 0 ? '<1h' : `${hoursAgo}h`} label="last updated" color={COLORS.amber} />
            {total > 0 && !loading && (
              <StatBadge value={String(total)} label="matching" color={COLORS.purple} />
            )}
          </div>
        </motion.div>

        {/* ── Filters ─────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          {/* Field chips */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
            {FIELD_TABS.map(f => (
              <Chip
                key={f.key}
                label={f.label}
                active={field === f.key}
                color={COLORS.cyan}
                onClick={() => handleFieldChange(f.key)}
              />
            ))}
          </div>

          {/* Type chips + search */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', flex: '1', minWidth: 0 }}>
              {TYPE_TABS.map(t => (
                <Chip
                  key={t.key}
                  label={t.label}
                  active={type === t.key}
                  color={t.key !== 'all' ? (TYPE_STYLES[t.key]?.text ?? COLORS.cyan) : COLORS.cyan}
                  count={t.key !== 'all' ? byType[t.key] : undefined}
                  onClick={() => handleTypeChange(t.key)}
                />
              ))}
            </div>

            {/* Search */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search
                  size={13}
                  color={COLORS.muted}
                  style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }}
                />
                <input
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search discoveries..."
                  style={{
                    fontFamily: FONT,
                    fontSize: '12px',
                    paddingLeft: '30px',
                    paddingRight: '12px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    background: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '20px',
                    color: COLORS.text,
                    outline: 'none',
                    width: '200px',
                    transition: 'border-color 0.2s, width 0.3s',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = `${COLORS.cyan}50`;
                    e.target.style.width = '260px';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = COLORS.border;
                    e.target.style.width = '200px';
                  }}
                />
              </div>
              <button
                onClick={handleSearch}
                style={{
                  fontFamily: FONT,
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: `1px solid ${COLORS.cyan}40`,
                  background: `${COLORS.cyan}15`,
                  color: COLORS.cyan,
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                SEARCH
              </button>
              {(appliedSearch || field !== 'all' || type !== 'all') && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    setAppliedSearch('');
                    setField('all');
                    setType('all');
                  }}
                  style={{
                    fontFamily: FONT,
                    fontSize: '11px',
                    padding: '7px 12px',
                    borderRadius: '20px',
                    border: `1px solid ${COLORS.border}`,
                    background: 'transparent',
                    color: COLORS.muted,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  <RefreshCw size={10} />
                  Clear
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Loading State ─────────────────────────────────────────────────── */}
        {loading && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '16px',
          }}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Error State ────────────────────────────────────────────────────── */}
        {!loading && error && (
          <div style={{
            textAlign: 'center',
            padding: '80px 24px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
          }}>
            <div style={{ fontFamily: FONT, fontSize: '14px', color: COLORS.red }}>
              Failed to load discoveries
            </div>
            <div style={{ fontFamily: FONT, fontSize: '12px', color: COLORS.muted }}>{error}</div>
            <button
              onClick={() => fetchDiscoveries({ reset: true, pg: 0 })}
              style={{
                fontFamily: FONT, fontSize: '11px', letterSpacing: '0.08em',
                padding: '9px 24px', borderRadius: '8px',
                border: `1px solid ${COLORS.cyan}40`, background: `${COLORS.cyan}12`,
                color: COLORS.cyan, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <RefreshCw size={12} />
              RETRY
            </button>
          </div>
        )}

        {/* ── Empty State ────────────────────────────────────────────────────── */}
        {!loading && !error && discoveries.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '80px 24px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
          }}>
            <div style={{ fontSize: '32px' }}>🔬</div>
            <div style={{ fontFamily: FONT, fontSize: '15px', fontWeight: 600, color: COLORS.text }}>
              No discoveries found
            </div>
            <div style={{ fontFamily: FONT, fontSize: '13px', color: COLORS.muted }}>
              Try adjusting your filters or clearing your search.
            </div>
            <button
              onClick={() => {
                setSearchInput('');
                setAppliedSearch('');
                setField('all');
                setType('all');
              }}
              style={{
                fontFamily: FONT, fontSize: '11px', letterSpacing: '0.08em',
                padding: '9px 24px', borderRadius: '8px',
                border: `1px solid ${COLORS.border}`, background: COLORS.surface,
                color: COLORS.muted, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <RefreshCw size={12} />
              RESET FILTERS
            </button>
          </div>
        )}

        {/* ── Discovery Grid ─────────────────────────────────────────────────── */}
        {!loading && !error && discoveries.length > 0 && (
          <>
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontFamily: FONT, fontSize: '11px', color: COLORS.muted, letterSpacing: '0.06em' }}>
                {total > 0 ? `${total} DISCOVERIES` : `${discoveries.length} SHOWN`}
              </span>
              {appliedSearch && (
                <span style={{ fontFamily: FONT, fontSize: '11px', color: COLORS.cyan }}>
                  matching "{appliedSearch}"
                </span>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
            }}
            className="discoveries-grid"
            >
              <AnimatePresence mode="popLayout">
                {discoveries.map((d, i) => (
                  <DiscoveryCard key={d.id} discovery={d} index={i} />
                ))}
              </AnimatePresence>
            </div>

            {/* Responsive grid styles */}
            <style>{`
              @media (max-width: 1024px) {
                .discoveries-grid {
                  grid-template-columns: repeat(2, 1fr) !important;
                }
              }
              @media (max-width: 640px) {
                .discoveries-grid {
                  grid-template-columns: 1fr !important;
                }
              }
            `}</style>

            {/* Load more */}
            {hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={{
                    fontFamily: FONT,
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.07em',
                    padding: '12px 36px',
                    borderRadius: '10px',
                    border: `1px solid ${COLORS.border}`,
                    background: COLORS.surface,
                    color: loadingMore ? COLORS.muted : COLORS.text,
                    cursor: loadingMore ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    opacity: loadingMore ? 0.6 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!loadingMore) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = `${COLORS.cyan}40`;
                      (e.currentTarget as HTMLButtonElement).style.color = COLORS.cyan;
                    }
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = COLORS.border;
                    (e.currentTarget as HTMLButtonElement).style.color = COLORS.text;
                  }}
                >
                  {loadingMore ? (
                    <>
                      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ChevronDown size={13} />
                      LOAD MORE ({total - discoveries.length} remaining)
                    </>
                  )}
                </button>
              </div>
            )}

            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </>
        )}
      </div>
    </div>
  );
}

// ── Stat Badge ─────────────────────────────────────────────────────────────────

function StatBadge({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      background: `${color}10`,
      border: `1px solid ${color}25`,
      borderRadius: '8px', padding: '6px 12px',
    }}>
      <span style={{ fontFamily: FONT_MONO, fontSize: '14px', fontWeight: 700, color }}>{value}</span>
      <span style={{ fontFamily: FONT, fontSize: '11px', color: COLORS.muted, letterSpacing: '0.05em' }}>{label}</span>
    </div>
  );
}
