'use client';
// src/app/command-center/components/IntelCard.tsx
// Right panel — 3 states:
//   DEFAULT    → El Paso trajectory report
//   SIGNAL     → Detail card for a clicked map dot
//   SEARCH     → Deep dive on a search query

import type { IntelSignal, SectorScore, TrajectoryReport } from '../types/intel';

// ─── Constants ────────────────────────────────────────────────────────────────

const CYAN   = '#00D4FF';
const GREEN  = '#00FF88';
const GOLD   = '#FFD700';
const RED    = '#FF3B30';
const PURPLE = '#A855F7';
const DIM    = 'rgba(0,212,255,0.10)';

const SIGNAL_TYPE_COLOR: Record<string, string> = {
  vendor_mention:  CYAN,
  contract_alert:  GOLD,
  velocity_spike:  GREEN,
  convergence:     PURPLE,
  sector_spike:    RED,
  security_impact: RED,
};

const STATUS_COLOR: Record<string, string> = {
  strong:   GREEN,
  emerging: CYAN,
  early:    GOLD,
  lagging:  RED,
};

const WINDOW_COLOR: Record<string, string> = {
  NOW:  GREEN,
  SOON: GOLD,
  WAIT: RED,
};

// ─── Static El Paso trajectory ────────────────────────────────────────────────
// Shown in default state. Will eventually come from /api/predictions.

const EP_TRAJECTORY: TrajectoryReport = {
  location: 'El Paso, TX',
  now: {
    summary: 'El Paso is emerging as a border technology hub. Logistics automation and cross-border supply chain intelligence are the dominant growth sectors.',
    sectors: [
      { name: 'Logistics & Supply Chain', status: 'strong'   },
      { name: 'Border Automation',        status: 'emerging' },
      { name: 'Manufacturing Tech',       status: 'early'    },
      { name: 'Defense & Security',       status: 'strong'   },
      { name: 'Healthcare IT',            status: 'early'    },
    ],
  },
  coming: {
    sixMonths:         ['Warehouse robotics deployments accelerate', 'CBP tech contracts surge post-fiscal year'],
    twelveMonths:      ['Border automation wave reaches SMB vendors', 'UTEP research commercialization picks up'],
    twentyFourMonths:  ['El Paso positioned as top-5 border tech hub', 'Cross-border fintech market opens'],
  },
  opportunities: [
    'SAM.gov IDIQ vehicles closing Q2',
    'UTEP research partnerships in AI/robotics',
    'CBP vendor pre-qualification open',
    'Workforce automation grants available',
  ],
  windowToAct: 'NOW',
};

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  selectedSignal: IntelSignal | null;
  searchQuery:    string | null;
  sectors:        SectorScore[];
  signalsToday:   number;
  signalsWeek:    number;
  onClose:        () => void;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Mono({ children, size = 10, color = CYAN }: { children: React.ReactNode; size?: number; color?: string }) {
  return (
    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: size, color }}>
      {children}
    </span>
  );
}

function Label({ children, color = 'rgba(0,212,255,0.45)' }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.12em', color, textTransform: 'uppercase' }}>
      {children}
    </span>
  );
}

function Row({ label, value, color = 'rgba(255,255,255,0.7)' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: `1px solid ${DIM}` }}>
      <Label>{label}</Label>
      <Mono size={9} color={color}>{value}</Mono>
    </div>
  );
}

// ─── DEFAULT — Trajectory report ─────────────────────────────────────────────

function TrajectoryView({ report, sectors, signalsToday, signalsWeek }: {
  report: TrajectoryReport;
  sectors: SectorScore[];
  signalsToday: number;
  signalsWeek: number;
}) {
  const winColor = WINDOW_COLOR[report.windowToAct] ?? GREEN;

  return (
    <div style={{ padding: '10px' }}>
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, boxShadow: `0 0 8px ${GREEN}` }} />
          <Mono size={11} color={GREEN}>{report.location}</Mono>
        </div>
        <p style={{ margin: 0, fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
          {report.now.summary}
        </p>
      </div>

      {/* Signal counts */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, padding: '6px 8px', background: 'rgba(0,255,136,0.06)', border: `1px solid rgba(0,255,136,0.15)`, borderRadius: 2, textAlign: 'center' }}>
          <Label color={GREEN}>Today</Label>
          <div><Mono size={20} color={GREEN}>{signalsToday}</Mono></div>
        </div>
        <div style={{ flex: 1, padding: '6px 8px', background: 'rgba(255,215,0,0.06)', border: `1px solid rgba(255,215,0,0.15)`, borderRadius: 2, textAlign: 'center' }}>
          <Label color={GOLD}>Week</Label>
          <div><Mono size={20} color={GOLD}>{signalsWeek}</Mono></div>
        </div>
      </div>

      {/* NOW — sector statuses */}
      <div style={{ marginBottom: 12 }}>
        <Label>Now</Label>
        <div style={{ marginTop: 6 }}>
          {report.now.sectors.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: `1px solid ${DIM}` }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.65)' }}>{s.name}</span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: STATUS_COLOR[s.status] ?? CYAN, textTransform: 'uppercase' }}>{s.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* COMING */}
      <div style={{ marginBottom: 12 }}>
        <Label>Coming</Label>
        <div style={{ marginTop: 6 }}>
          <div style={{ marginBottom: 6 }}>
            <Label color="rgba(0,212,255,0.3)">6 months</Label>
            {report.coming.sixMonths.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 5, marginTop: 3 }}>
                <span style={{ color: CYAN, fontSize: 8, fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>›</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.55)', lineHeight: 1.45 }}>{item}</span>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 6 }}>
            <Label color="rgba(0,212,255,0.3)">12 months</Label>
            {report.coming.twelveMonths.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 5, marginTop: 3 }}>
                <span style={{ color: GOLD, fontSize: 8, fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>›</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.55)', lineHeight: 1.45 }}>{item}</span>
              </div>
            ))}
          </div>
          <div>
            <Label color="rgba(0,212,255,0.3)">24 months</Label>
            {report.coming.twentyFourMonths.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 5, marginTop: 3 }}>
                <span style={{ color: PURPLE, fontSize: 8, fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>›</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.55)', lineHeight: 1.45 }}>{item}</span>
              </div>
            ))}
          </div>
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

      {/* Window to act */}
      <div style={{ padding: '8px 10px', background: `${winColor}08`, border: `1px solid ${winColor}25`, borderRadius: 2, textAlign: 'center' }}>
        <Label color={winColor}>Window to Act</Label>
        <div style={{ marginTop: 4 }}>
          <Mono size={22} color={winColor}>{report.windowToAct}</Mono>
        </div>
      </div>

      {/* Live sector scores */}
      {sectors.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Label>Live Sector Scores</Label>
          <div style={{ marginTop: 6 }}>
            {sectors.slice(0, 6).map((s, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' }}>{s.industry}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: s.score > 70 ? GREEN : s.score > 40 ? GOLD : RED }}>
                    {s.score} {s.trend === 'rising' ? '↑' : s.trend === 'falling' ? '↓' : '→'}
                  </span>
                </div>
                <div style={{ height: 2, background: 'rgba(0,212,255,0.08)', borderRadius: 1, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.score}%`, background: s.score > 70 ? GREEN : s.score > 40 ? GOLD : RED, transition: 'width 0.8s ease', borderRadius: 1 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SIGNAL — clicked dot detail ─────────────────────────────────────────────

function SignalView({ signal, onClose }: { signal: IntelSignal; onClose: () => void }) {
  const typeColor = SIGNAL_TYPE_COLOR[signal.type] ?? CYAN;

  return (
    <div style={{ padding: '10px' }}>
      {/* Back button */}
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: 'rgba(0,212,255,0.45)', letterSpacing: '0.08em' }}>← BACK</span>
      </button>

      {/* Type badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 8, padding: '3px 8px', background: `${typeColor}14`, border: `1px solid ${typeColor}35`, borderRadius: 2 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: typeColor, boxShadow: `0 0 6px ${typeColor}` }} />
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: typeColor, letterSpacing: '0.1em' }}>
          {signal.type.replace(/_/g, ' ').toUpperCase()}
        </span>
      </div>

      {/* Title */}
      <p style={{ margin: '0 0 12px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
        {signal.title}
      </p>

      {/* Properties */}
      <Row label="Industry"    value={signal.industry} />
      {signal.company && <Row label="Company" value={signal.company} color={GOLD} />}
      <Row label="Priority"    value={signal.priority.toUpperCase()} color={signal.priority === 'critical' ? RED : signal.priority === 'high' ? GOLD : CYAN} />
      <Row label="Importance"  value={`${(signal.importance * 100).toFixed(0)} / 100`} />
      <Row label="EP Relevance" value={`${signal.elPasoRelevance} / 100`} color={signal.elPasoRelevance >= 60 ? GREEN : 'rgba(255,255,255,0.5)'} />
      <Row label="Discovered"  value={new Date(signal.discoveredAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} />

      {/* Source link */}
      {signal.url && (
        <div style={{ marginTop: 12 }}>
          <a href={signal.url} target="_blank" rel="noreferrer" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 9px',
            background: 'rgba(0,212,255,0.06)',
            border: `1px solid rgba(0,212,255,0.18)`,
            borderRadius: 2,
            textDecoration: 'none',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 9,
            color: CYAN,
          }}>
            ↗ View source
          </a>
        </div>
      )}

      {/* Deep dive link */}
      <div style={{ marginTop: 8 }}>
        <a href={`/ask?q=${encodeURIComponent(signal.industry)}`} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 9px',
          background: 'rgba(0,212,255,0.04)',
          border: `1px solid rgba(0,212,255,0.12)`,
          borderRadius: 2,
          textDecoration: 'none',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 9,
          color: 'rgba(0,212,255,0.6)',
        }}>
          ⌕ Deep dive: {signal.industry}
        </a>
      </div>
    </div>
  );
}

// ─── SEARCH — query deep dive ─────────────────────────────────────────────────

function SearchView({ query, onClose }: { query: string; onClose: () => void }) {
  return (
    <div style={{ padding: '10px' }}>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: 'rgba(0,212,255,0.45)', letterSpacing: '0.08em' }}>← BACK</span>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: CYAN }}>⌕</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{query}</span>
      </div>

      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: '0 0 12px' }}>
        Opening full intelligence search for this topic.
      </p>

      <a
        href={`/ask?q=${encodeURIComponent(query)}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '10px',
          background: 'rgba(0,212,255,0.08)',
          border: `1px solid rgba(0,212,255,0.3)`,
          borderRadius: 2,
          textDecoration: 'none',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 10,
          color: CYAN,
          letterSpacing: '0.08em',
        }}
      >
        FULL INTELLIGENCE SEARCH →
      </a>

      <div style={{ marginTop: 8 }}>
        <a
          href={`/industry/${query.toLowerCase().replace(/\s+/g, '-')}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '8px',
            background: 'rgba(0,212,255,0.04)',
            border: `1px solid rgba(0,212,255,0.14)`,
            borderRadius: 2,
            textDecoration: 'none',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 9,
            color: 'rgba(0,212,255,0.6)',
          }}
        >
          INDUSTRY PAGE →
        </a>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function IntelCard({ selectedSignal, searchQuery, sectors, signalsToday, signalsWeek, onClose }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(7,7,15,0.92)', border: `1px solid ${DIM}`, borderRadius: 2, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderBottom: `1px solid ${DIM}`, background: 'rgba(0,0,0,0.35)', flexShrink: 0 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: CYAN, boxShadow: `0 0 6px ${CYAN}` }} />
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.12em', color: CYAN, textTransform: 'uppercase' }}>
          {selectedSignal ? 'Signal Intel' : searchQuery ? 'Search' : 'El Paso Intelligence'}
        </span>
        {(selectedSignal || searchQuery) && (
          <button
            onClick={onClose}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: 'rgba(0,212,255,0.4)', padding: 0 }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Body */}
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
          />
        )}
      </div>
    </div>
  );
}
