'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { COLORS } from '@/lib/tokens';
import { BottomNav, TopBar } from '@/components/ui';
import { Brain } from '@/lib/brain';

// ─── Static industry directory ───────────────────────────────────────────────

const INDUSTRIES = [
  { id: 'defense', name: 'Defense', desc: 'Military, government, Fort Bliss' },
  { id: 'ai-ml', name: 'AI / ML', desc: 'Artificial intelligence, machine learning' },
  { id: 'cybersecurity', name: 'Cybersecurity', desc: 'Network security, compliance' },
  { id: 'manufacturing', name: 'Manufacturing', desc: 'Production, automation, robotics' },
  { id: 'border-tech', name: 'Border Tech', desc: 'Cross-border, customs, CBP' },
  { id: 'logistics', name: 'Logistics', desc: 'Supply chain, freight, transport' },
  { id: 'energy', name: 'Energy', desc: 'Solar, grid, EV, utilities' },
  { id: 'healthcare', name: 'Healthcare', desc: 'Medical devices, biotech, pharma' },
];

type Filter = 'all' | 'rising' | 'stable' | 'emerging';
type Movement = { sector: string; momentum: string; signal_count: number };

// ─── Page ────────────────────────────────────────────────────────────────────

export default function IndustriesPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<Movement[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await Brain.morning();
        if (!cancelled) setMovements(data.industry_movement ?? []);
      } catch { /* degrade gracefully */ }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const momentumMap: Record<string, string> = {};
  for (const m of movements) {
    momentumMap[m.sector.toLowerCase().replace(/\s+/g, '-')] = m.momentum;
  }

  function getMomentum(id: string): string {
    return momentumMap[id] ?? 'stable';
  }

  const filtered = INDUSTRIES.filter((ind) => {
    if (filter === 'all') return true;
    const m = getMomentum(ind.id);
    if (filter === 'rising') return m === 'rising' || m === 'accelerating';
    if (filter === 'stable') return m === 'stable' || m === 'steady';
    if (filter === 'emerging') return m === 'emerging' || m === 'new';
    return true;
  });

  function dotColor(momentum: string): string {
    if (momentum === 'rising' || momentum === 'accelerating') return COLORS.green;
    if (momentum === 'emerging' || momentum === 'new') return COLORS.cyan;
    if (momentum === 'declining') return COLORS.red;
    return COLORS.gold;
  }

  function trendLabel(momentum: string): string {
    if (momentum === 'rising' || momentum === 'accelerating') return 'Rising';
    if (momentum === 'emerging' || momentum === 'new') return 'Emerging';
    if (momentum === 'declining') return 'Cooling';
    return 'Stable';
  }

  function signalCount(id: string): number {
    const m = movements.find(mv => mv.sector.toLowerCase().replace(/\s+/g, '-') === id);
    return m?.signal_count ?? 0;
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'rising', label: 'Rising' },
    { key: 'stable', label: 'Stable' },
    { key: 'emerging', label: 'Emerging' },
  ];

  return (
    <div className="min-h-screen pb-16 overflow-y-auto" style={{ background: COLORS.bg }}>
      <TopBar />

      <div className="max-w-[600px] mx-auto px-6 sm:px-10">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="pt-10 sm:pt-14 pb-2">
          <h1 className="font-grotesk text-[24px] sm:text-[30px] font-semibold tracking-tight mb-2" style={{ color: COLORS.text }}>
            Industries
          </h1>
          <p className="font-grotesk text-[14px] font-light" style={{ color: `${COLORS.text}40` }}>
            Explore sectors by momentum
          </p>
        </div>

        {/* ── Filter strip ───────────────────────────────────────── */}
        <div className="flex items-center gap-2 py-5">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="min-h-[40px] px-4 py-2 font-mono text-[10px] tracking-[0.12em] uppercase transition-all duration-200 cursor-pointer"
                style={{
                  background: active ? COLORS.card : 'transparent',
                  color: active ? COLORS.text : COLORS.muted,
                  border: `1px solid ${active ? COLORS.border : 'transparent'}`,
                  borderRadius: '9999px',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* ── Card grid ──────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[140px] rounded-nxt-xl shimmer" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((ind, i) => {
              const momentum = getMomentum(ind.id);
              const color = dotColor(momentum);
              const count = signalCount(ind.id);

              return (
                <button
                  key={ind.id}
                  onClick={() => router.push(`/industry/${ind.id}`)}
                  className="text-left p-6 transition-all duration-300 cursor-pointer group animate-fade-up hover:translate-y-[-2px]"
                  style={{
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '24px',
                    animationDelay: `${i * 60}ms`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${color}30`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}
                >
                  {/* Name + momentum dot */}
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="font-grotesk text-[14px] font-semibold" style={{ color: COLORS.text }}>
                      {ind.name}
                    </span>
                    <span
                      className="shrink-0 w-[7px] h-[7px] rounded-full"
                      style={{ background: color, boxShadow: `0 0 8px ${color}60` }}
                    />
                  </div>

                  {/* Trend label */}
                  <p className="font-mono text-[10px] tracking-[0.1em] mb-1" style={{ color }}>
                    {trendLabel(momentum)}
                  </p>

                  {/* Signal count */}
                  {count > 0 && (
                    <p className="font-mono text-[9px] tracking-[0.08em]" style={{ color: `${COLORS.text}20` }}>
                      {count} signal{count !== 1 ? 's' : ''}
                    </p>
                  )}

                  {/* Description — shown on hover */}
                  <p className="font-grotesk text-[11px] leading-relaxed mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 max-h-0 group-hover:max-h-10 overflow-hidden"
                    style={{ color: `${COLORS.text}30` }}
                  >
                    {ind.desc}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="font-grotesk text-[14px] font-light" style={{ color: COLORS.muted }}>
              No industries match this filter.
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
