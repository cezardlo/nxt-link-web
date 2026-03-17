'use client';
// src/app/command-center/components/IntelCard.tsx
// Right panel — 3 states: DEFAULT (trajectory) | SIGNAL (clicked dot) | SEARCH (query)
// Now with live sector scores from API, animated bars, improved signal detail.

import { useEffect, useState } from 'react';
import type { IntelSignal, SectorScore, TrajectoryReport } from '../types/intel';

const CYAN   = '#00D4FF';
const GREEN  = '#00FF88';
const GOLD   = '#FFD700';
const RED    = '#FF3B30';
const PURPLE = '#A855F7';
const DIM    = 'rgba(0,212,255,0.08)';

const SIGNAL_TYPE_COLOR: Record<string, string> = {
  research_paper: CYAN, patent_filing: GOLD, funding_round: PURPLE,
  contract_award: GOLD, merger_acquisition: GREEN, product_launch: GREEN,
  facility_expansion: GREEN, regulatory_action: RED, hiring_signal: CYAN, case_study: CYAN,
};

const STATUS_COLOR: Record<string, string> = { strong: GREEN, emerging: CYAN, early: GOLD, lagging: RED };
const WINDOW_COLOR: Record<string, string> = { NOW: GREEN, SOON: GOLD, WAIT: RED };

const EP_TRAJECTORY: TrajectoryReport = {
  location: 'El Paso, TX',
  now: {
    summary: 'Emerging border technology hub. Logistics automation and cross-border supply chain intelligence are the dominant growth sectors.',
    sectors: [
      { name: 'Logistics & Supply Chain', status: 'strong'   },
      { name: 'Border Automation',        status: 'emerging' },
      { name: 'Manufacturing Tech',       status: 'early'    },
      { name: 'Defense & Security',       status: 'strong'   },
      { name: 'Healthcare IT',            status: 'early'    },
    ],
  },
  coming: {
    sixMonths:        ['Warehouse robotics deployments accelerate', 'CBP tech contracts surge'],
    twelveMonths:     ['Border automation wave reaches SMB vendors', 'UTEP AI commercialization'],
    twentyFourMonths: ['El Paso top-5 border tech hub', 'Cross-border fintech market opens'],
  },
  opportunities: [
    'SAM.gov IDIQ vehicles closing Q2',
    'UTEP research partnerships (AI/robotics)',
    'CBP vendor pre-qualification open',
    'Workforce automation grants available',
  ],
  windowToAct: 'NOW',
};

type Props = {
  selectedSignal: IntelSignal | null;
  searchQuery:    string | null;
  sectors:        SectorScore[];
  signalsToday:   number;
  signalsWeek:    number;
  loading:        boolean;
  onClose:        () => void;
};

function Mono({ children, size = 10, color = CYAN }: { children: React.ReactNode; size?: number; color?: string }) {
  return <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: size, color }}>{children}</span>;
}

function Label({ children, color = 'rgba(0,212,255,0.45)' }: { children: React.ReactNode; color?: string }) {
  return <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.12em', color, textTransform: 'uppercase' }}>{children}</span>;
}

// ── Animated bar ────────────────────────────────────────────────────────────

function AnimatedBar({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setWidth(value), 100 + delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return (
    <div style={{ height: 3, background: 'rgba(0,212,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${width}%`, background: color,
        borderRadius: 2, transition: 'width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }} />
    </div>
  );
}

// ── Trajectory (default state) ──────────────────────────────────────────────

function TrajectoryView({ report, sectors, signalsToday, signalsWeek, loading }: {
  report: TrajectoryReport; sectors: SectorScore[];
  signalsToday: number; signalsWeek: number; loading: boolean;
}) {
  const winColor = WINDOW_COLOR[report.windowToAct] ?? GREEN;

  return (
    <div style={{ padding: 10 }}>
      {/* Location header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, boxShadow: `0 0 8px ${GREEN}` }} />
          <Mono size={12} color={GREEN}>{report.location}</Mono>
        </div>
        <p style={{ margin: 0, fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
          {report.now.summary}
        </p>
      </div>

      {/* Signal counts */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <div style={{ flex: 1, padding: '8px', background: 'rgba(0,255,136,0.05)', border: `1px solid rgba(0,255,136,0.12)`, borderRadius: 2, textAlign: 'center' }}>
          <Label color={GREEN}>Today</Label>
          <div><Mono size={22} color={GREEN}>{loading ? '—' : signalsToday}</Mono></div>
        </div>
        <div style={{ flex: 1, padding: '8px', background: 'rgba(255,215,0,0.05)', border: `1px solid rgba(255,215,0,0.12)`, borderRadius: 2, textAlign: 'center' }}>
          <Label color={GOLD}>This Week</Label>
          <div><Mono size={22} color={GOLD}>{loading ? '—' : signalsWeek}</Mono></div>
        </div>
      </div>

      {/* NOW — sector statuses */}
      <div style={{ marginBottom: 12 }}>
        <Label>Current Position</Label>
        <div style={{ marginTop: 6 }}>
          {report.now.sectors.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: `1px solid ${DIM}` }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.65)' }}>{s.name}</span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: STATUS_COLOR[s.status] ?? CYAN, textTransform: 'uppercase', fontWeight: 600 }}>{s.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Live sector scores from API */}
      {sectors.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Label>Live Sector Activity</Label>
          <div style={{ marginTop: 6 }}>
            {sectors.slice(0, 8).map((s, i) => {
              const barColor = s.score > 70 ? GREEN : s.score > 40 ? GOLD : 'rgba(0,212,255,0.5)';
              const trendIcon = s.trend === 'rising' ? '↑' : s.trend === 'falling' ? '↓' : '→';
              // Normalize: max score in data = 100%
              const maxScore = Math.max(...sectors.map(x => x.score), 1);
              const pct = Math.round((s.score / maxScore) * 100);

              return (
                <div key={i} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' }}>
                      {s.industry.replace(/[-_]/g, ' ')}
                    </span>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: barColor, fontWeight: 600 }}>
                      {s.score} {trendIcon}
                    </span>
                  </div>
                  <AnimatedBar value={pct} color={barColor} delay={i * 80} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* COMING */}
      <div style={{ marginBottom: 12 }}>
        <Label>Trajectory</Label>
        <div style={{ marginTop: 6 }}>
          {[
            { label: '6 months',  items: report.coming.sixMonths,        color: CYAN },
            { label: '12 months', items: report.coming.twelveMonths,     color: GOLD },
            { label: '24 months', items: report.coming.twentyFourMonths, color: PURPLE },
          ].map(group => (
            <div key={group.label} style={{ marginBottom: 6 }}>
              <Label color="rgba(0,212,255,0.3)">{group.label}</Label>
              {group.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 5, marginTop: 3 }}>
                  <span style={{ color: group.color, fontSize: 8, fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>›</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.55)', lineHeight: 1.45 }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Opportunities */}
      <div style={{ marginBottom: 12 }}>
        <Label>Open Opportunities</Label>
        <div style={{ marginTop: 6 }}>
          {report.opportunities.map((opp, i) => (
            <div key={i} style={{ display: 'flex', gap: 5, padding: '4px 0', borderBottom: `1px solid ${DIM}` }}>
              <span style={{ color: GREEN, fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>⚡</span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.65)' }}>{opp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Window */}
      <div style={{ padding: '8px 10px', background: `${winColor}08`, border: `1px solid ${winColor}25`, borderRadius: 2, textAlign: 'center' }}>
        <Label color={winColor}>Window to Act</Label>
        <div style={{ marginTop: 4 }}><Mono size={22} color={winColor}>{report.windowToAct}</Mono></div>
      </div>
    </div>
  );
}

// ── Signal detail (clicked dot) ─────────────────────────────────────────────

function SignalView({ signal, onClose }: { signal: IntelSignal; onClose: () => void }) {
  const typeColor = SIGNAL_TYPE_COLOR[signal.type] ?? CYAN;
  const impPct = Math.round(signal.importance * 100);

  return (
    <div style={{ padding: 10 }}>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px' }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(0,212,255,0.45)', letterSpacing: '0.08em' }}>← BACK</span>
      </button>

      {/* Type badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 8, padding: '3px 8px', background: `${typeColor}14`, border: `1px solid ${typeColor}35`, borderRadius: 2 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: typeColor, boxShadow: `0 0 6px ${typeColor}` }} />
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: typeColor, letterSpacing: '0.1em' }}>
          {signal.type.replace(/_/g, ' ').toUpperCase()}
        </span>
      </div>

      {/* Title */}
      <p style={{ margin: '0 0 12px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.92)', lineHeight: 1.55 }}>
        {signal.title}
      </p>

      {/* Importance gauge */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <Label>Importance</Label>
          <Mono size={10} color={impPct >= 80 ? RED : impPct >= 60 ? GOLD : CYAN}>{impPct}/100</Mono>
        </div>
        <AnimatedBar value={impPct} color={impPct >= 80 ? RED : impPct >= 60 ? GOLD : CYAN} />
      </div>

      {/* Properties */}
      {[
        { label: 'Industry', value: signal.industry, color: 'rgba(255,255,255,0.7)' },
        signal.company ? { label: 'Company', value: signal.company, color: GOLD } : null,
        { label: 'Priority', value: signal.priority.toUpperCase(), color: signal.priority === 'critical' ? RED : signal.priority === 'high' ? GOLD : CYAN },
        { label: 'EP Relevance', value: `${signal.elPasoRelevance}/100`, color: signal.elPasoRelevance >= 60 ? GREEN : 'rgba(255,255,255,0.5)' },
        { label: 'Discovered', value: new Date(signal.discoveredAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), color: 'rgba(255,255,255,0.5)' },
      ].filter(Boolean).map((row, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${DIM}` }}>
          <Label>{row!.label}</Label>
          <Mono size={9} color={row!.color}>{row!.value}</Mono>
        </div>
      ))}

      {/* Actions */}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {signal.url && (
          <a href={signal.url} target="_blank" rel="noreferrer" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px', background: 'rgba(0,212,255,0.06)', border: `1px solid rgba(0,212,255,0.2)`,
            borderRadius: 2, textDecoration: 'none',
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: CYAN, letterSpacing: '0.06em',
          }}>
            ↗ VIEW SOURCE
          </a>
        )}
        <a href={`/ask?q=${encodeURIComponent(signal.industry)}`} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '8px', background: 'rgba(0,212,255,0.03)', border: `1px solid rgba(0,212,255,0.1)`,
          borderRadius: 2, textDecoration: 'none',
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(0,212,255,0.6)',
        }}>
          ⌕ DEEP DIVE: {signal.industry}
        </a>
      </div>
    </div>
  );
}

// ── Search view ─────────────────────────────────────────────────────────────

function SearchView({ query, onClose }: { query: string; onClose: () => void }) {
  return (
    <div style={{ padding: 10 }}>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px' }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(0,212,255,0.45)', letterSpacing: '0.08em' }}>← BACK</span>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, color: CYAN }}>⌕</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>{query}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <a href={`/ask?q=${encodeURIComponent(query)}`} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '10px', background: 'rgba(0,212,255,0.08)', border: `1px solid rgba(0,212,255,0.3)`,
          borderRadius: 2, textDecoration: 'none',
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: CYAN, letterSpacing: '0.08em',
        }}>
          FULL INTELLIGENCE SEARCH →
        </a>
        <a href={`/industry/${query.toLowerCase().replace(/\s+/g, '-')}`} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '8px', background: 'rgba(0,212,255,0.03)', border: `1px solid rgba(0,212,255,0.12)`,
          borderRadius: 2, textDecoration: 'none',
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(0,212,255,0.6)',
        }}>
          INDUSTRY PAGE →
        </a>
      </div>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function IntelCard({ selectedSignal, searchQuery, sectors, signalsToday, signalsWeek, loading, onClose }: Props) {
  const title = selectedSignal ? 'Signal Intel'
              : searchQuery   ? 'Search'
              : 'El Paso Intelligence';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'rgba(7,7,15,0.95)', border: `1px solid ${DIM}`,
      borderRadius: 2, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', borderBottom: `1px solid ${DIM}`,
        background: 'rgba(0,0,0,0.4)', flexShrink: 0,
      }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: CYAN, boxShadow: `0 0 6px ${CYAN}` }} />
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.12em', color: CYAN }}>
          {title}
        </span>
        {(selectedSignal || searchQuery) && (
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(0,212,255,0.4)', padding: 0 }}>
            ✕
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {selectedSignal ? (
          <SignalView signal={selectedSignal} onClose={onClose} />
        ) : searchQuery ? (
          <SearchView query={searchQuery} onClose={onClose} />
        ) : (
          <TrajectoryView
            report={EP_TRAJECTORY}
            sectors={sectors}
            signalsToday={signalsToday}
            signalsWeek={signalsWeek}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
