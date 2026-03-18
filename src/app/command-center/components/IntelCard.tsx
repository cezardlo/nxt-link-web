'use client';
import { useEffect, useState } from 'react';
import type { IntelSignal, SectorScore, TrajectoryReport } from '../types/intel';

const C = '#00D4FF'; const G = '#00FF88'; const GOLD = '#FFD700';
const R = '#FF3B30'; const P = '#A855F7'; const DIM = 'rgba(0,212,255,0.06)';

const TYPE_COLOR: Record<string, string> = {
  research_paper: C, patent_filing: GOLD, funding_round: P,
  contract_award: GOLD, merger_acquisition: G, product_launch: G,
  facility_expansion: G, regulatory_action: R, hiring_signal: C, case_study: C,
};
const STATUS_COLOR: Record<string, string> = { strong: G, emerging: C, early: GOLD, lagging: R };

const EP: TrajectoryReport = {
  location: 'El Paso, TX',
  now: {
    summary: 'Emerging border technology hub. Logistics automation and cross-border supply chain intelligence are dominant growth sectors.',
    sectors: [
      { name: 'Logistics & Supply Chain', status: 'strong' },
      { name: 'Border Automation', status: 'emerging' },
      { name: 'Manufacturing Tech', status: 'early' },
      { name: 'Defense & Security', status: 'strong' },
      { name: 'Healthcare IT', status: 'early' },
    ],
  },
  coming: {
    sixMonths: ['Warehouse robotics accelerate', 'CBP tech contracts surge'],
    twelveMonths: ['Border automation reaches SMBs', 'UTEP AI commercialization'],
    twentyFourMonths: ['Top-5 border tech hub', 'Cross-border fintech opens'],
  },
  opportunities: ['SAM.gov IDIQ vehicles Q2', 'UTEP AI/robotics partnerships', 'CBP vendor pre-qual open', 'Automation grants available'],
  windowToAct: 'NOW',
};

type Props = {
  selectedSignal: IntelSignal | null;
  searchQuery: string | null;
  sectors: SectorScore[];
  signalsToday: number;
  signalsWeek: number;
  signals: IntelSignal[];
  loading: boolean;
  onClose: () => void;
};

function Bar({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(value), 80 + delay); return () => clearTimeout(t); }, [value, delay]);
  return (
    <div style={{ height: 3, background: 'rgba(0,212,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${w}%`, background: color, borderRadius: 2, transition: 'width 0.8s cubic-bezier(.25,.46,.45,.94)' }} />
    </div>
  );
}

function TrajectoryView({ sectors, signalsToday, signalsWeek, signals, loading }: {
  sectors: SectorScore[]; signalsToday: number; signalsWeek: number;
  signals: IntelSignal[]; loading: boolean;
}) {
  // Recent signals for activity feed
  const recent = signals.slice(0, 5);

  return (
    <div style={{ padding: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: G, boxShadow: `0 0 8px ${G}` }} />
        <span style={{ fontSize: 12, color: G, fontWeight: 600 }}>{EP.location}</span>
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 9, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{EP.now.summary}</p>

      {/* Counts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 12 }}>
        <div style={{ padding: 8, background: 'rgba(0,255,136,0.04)', border: `1px solid rgba(0,255,136,0.1)`, borderRadius: 2, textAlign: 'center' }}>
          <div style={{ fontSize: 7, color: `${G}88`, letterSpacing: '0.12em' }}>TODAY</div>
          <div style={{ fontSize: 24, color: G, fontWeight: 700, lineHeight: 1.2 }}>{loading ? '—' : signalsToday}</div>
        </div>
        <div style={{ padding: 8, background: 'rgba(255,215,0,0.04)', border: `1px solid rgba(255,215,0,0.1)`, borderRadius: 2, textAlign: 'center' }}>
          <div style={{ fontSize: 7, color: `${GOLD}88`, letterSpacing: '0.12em' }}>THIS WEEK</div>
          <div style={{ fontSize: 24, color: GOLD, fontWeight: 700, lineHeight: 1.2 }}>{loading ? '—' : signalsWeek}</div>
        </div>
      </div>

      {/* Sector status */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 7, color: 'rgba(0,212,255,0.4)', letterSpacing: '0.12em', marginBottom: 6 }}>CURRENT POSITION</div>
        {EP.now.sectors.map((s, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${DIM}` }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>{s.name}</span>
            <span style={{ fontSize: 8, color: STATUS_COLOR[s.status], fontWeight: 600, textTransform: 'uppercase' }}>{s.status}</span>
          </div>
        ))}
      </div>

      {/* Live scores */}
      {sectors.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 7, color: 'rgba(0,212,255,0.4)', letterSpacing: '0.12em', marginBottom: 6 }}>SECTOR ACTIVITY</div>
          {sectors.slice(0, 8).map((s, i) => {
            const bc = s.score > 70 ? G : s.score > 40 ? GOLD : C;
            const max = Math.max(...sectors.map(x => x.score), 1);
            return (
              <div key={i} style={{ marginBottom: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.55)', textTransform: 'capitalize' }}>{s.industry.replace(/[-_]/g, ' ')}</span>
                  <span style={{ fontSize: 8, color: bc, fontWeight: 600 }}>{s.score} {s.trend === 'rising' ? '↑' : s.trend === 'falling' ? '↓' : '→'}</span>
                </div>
                <Bar value={Math.round((s.score / max) * 100)} color={bc} delay={i * 60} />
              </div>
            );
          })}
        </div>
      )}

      {/* Recent activity */}
      {recent.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 7, color: 'rgba(0,212,255,0.4)', letterSpacing: '0.12em', marginBottom: 6 }}>RECENT ACTIVITY</div>
          {recent.map(sig => {
            const tc = TYPE_COLOR[sig.type] ?? C;
            return (
              <div key={sig.id} style={{ display: 'flex', gap: 6, padding: '4px 0', borderBottom: `1px solid ${DIM}` }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: tc, marginTop: 4, flexShrink: 0, boxShadow: `0 0 4px ${tc}` }} />
                <div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>{sig.title.slice(0, 70)}{sig.title.length > 70 ? '…' : ''}</div>
                  <div style={{ fontSize: 7, color: 'rgba(0,212,255,0.3)', marginTop: 1 }}>{sig.industry} · {sig.company ?? 'N/A'}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Trajectory */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 7, color: 'rgba(0,212,255,0.4)', letterSpacing: '0.12em', marginBottom: 6 }}>TRAJECTORY</div>
        {[
          { label: '6 MO', items: EP.coming.sixMonths, c: C },
          { label: '12 MO', items: EP.coming.twelveMonths, c: GOLD },
          { label: '24 MO', items: EP.coming.twentyFourMonths, c: P },
        ].map(g => (
          <div key={g.label} style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 7, color: 'rgba(0,212,255,0.25)', letterSpacing: '0.1em' }}>{g.label}</span>
            {g.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                <span style={{ color: g.c, fontSize: 7, flexShrink: 0 }}>›</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{item}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Window */}
      <div style={{ padding: '8px', background: `${G}06`, border: `1px solid ${G}18`, borderRadius: 2, textAlign: 'center' }}>
        <div style={{ fontSize: 7, color: `${G}88`, letterSpacing: '0.12em' }}>WINDOW TO ACT</div>
        <div style={{ fontSize: 24, color: G, fontWeight: 700, lineHeight: 1.3 }}>NOW</div>
      </div>
    </div>
  );
}

function SignalView({ signal, onClose }: { signal: IntelSignal; onClose: () => void }) {
  const tc = TYPE_COLOR[signal.type] ?? C;
  const imp = Math.round(signal.importance * 100);

  return (
    <div style={{ padding: 10 }}>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px' }}>
        <span style={{ fontSize: 9, color: 'rgba(0,212,255,0.4)', letterSpacing: '0.08em' }}>← BACK</span>
      </button>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 8, padding: '3px 8px', background: `${tc}12`, border: `1px solid ${tc}30`, borderRadius: 2 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: tc, boxShadow: `0 0 6px ${tc}` }} />
        <span style={{ fontSize: 8, color: tc, letterSpacing: '0.1em' }}>{signal.type.replace(/_/g, ' ').toUpperCase()}</span>
      </div>

      <p style={{ margin: '0 0 12px', fontSize: 11, color: 'rgba(255,255,255,0.92)', lineHeight: 1.55 }}>{signal.title}</p>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 7, color: 'rgba(0,212,255,0.4)', letterSpacing: '0.1em' }}>IMPORTANCE</span>
          <span style={{ fontSize: 10, color: imp >= 80 ? R : imp >= 60 ? GOLD : C, fontWeight: 600 }}>{imp}/100</span>
        </div>
        <Bar value={imp} color={imp >= 80 ? R : imp >= 60 ? GOLD : C} />
      </div>

      {[
        ['INDUSTRY', signal.industry, 'rgba(255,255,255,0.7)'],
        signal.company ? ['COMPANY', signal.company, GOLD] : null,
        ['PRIORITY', signal.priority.toUpperCase(), signal.priority === 'critical' ? R : signal.priority === 'high' ? GOLD : C],
        ['EP RELEVANCE', `${signal.elPasoRelevance}/100`, signal.elPasoRelevance >= 60 ? G : 'rgba(255,255,255,0.5)'],
        ['DISCOVERED', new Date(signal.discoveredAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), 'rgba(255,255,255,0.5)'],
      ].filter(Boolean).map((row, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${DIM}` }}>
          <span style={{ fontSize: 7, color: 'rgba(0,212,255,0.4)', letterSpacing: '0.1em' }}>{row![0]}</span>
          <span style={{ fontSize: 9, color: row![2] as string }}>{row![1]}</span>
        </div>
      ))}

      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {signal.url && (
          <a href={signal.url} target="_blank" rel="noreferrer" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: 8, background: `${C}06`, border: `1px solid ${C}18`,
            borderRadius: 2, textDecoration: 'none', fontSize: 9, color: C, letterSpacing: '0.06em',
          }}>↗ VIEW SOURCE</a>
        )}
        <a href={`/ask?q=${encodeURIComponent(signal.industry)}`} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 8, background: `${C}03`, border: `1px solid ${C}0a`,
          borderRadius: 2, textDecoration: 'none', fontSize: 9, color: `${C}88`,
        }}>⌕ DEEP DIVE: {signal.industry}</a>
      </div>
    </div>
  );
}

function SearchView({ query, onClose }: { query: string; onClose: () => void }) {
  return (
    <div style={{ padding: 10 }}>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px' }}>
        <span style={{ fontSize: 9, color: 'rgba(0,212,255,0.4)' }}>← BACK</span>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 14, color: C }}>⌕</span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>{query}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <a href={`/ask?q=${encodeURIComponent(query)}`} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: 10, background: `${C}08`, border: `1px solid ${C}28`,
          borderRadius: 2, textDecoration: 'none', fontSize: 10, color: C, letterSpacing: '0.08em',
        }}>FULL INTELLIGENCE SEARCH →</a>
        <a href={`/industry/${query.toLowerCase().replace(/\s+/g, '-')}`} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 8, background: `${C}03`, border: `1px solid ${C}0a`,
          borderRadius: 2, textDecoration: 'none', fontSize: 9, color: `${C}88`,
        }}>INDUSTRY PAGE →</a>
      </div>
    </div>
  );
}

export default function IntelCard({ selectedSignal, searchQuery, sectors, signalsToday, signalsWeek, signals, loading, onClose }: Props) {
  const title = selectedSignal ? 'SIGNAL INTEL' : searchQuery ? 'SEARCH' : 'EL PASO INTELLIGENCE';

  return (
    <div className="cc-panel" style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', borderBottom: `1px solid ${DIM}`,
        background: 'rgba(0,0,0,0.3)', flexShrink: 0,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: C, boxShadow: `0 0 6px ${C}` }} />
        <span style={{ fontSize: 8, letterSpacing: '0.12em', color: C }}>{title}</span>
        {(selectedSignal || searchQuery) && (
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, color: 'rgba(0,212,255,0.35)', padding: 0 }}>✕</button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {selectedSignal ? <SignalView signal={selectedSignal} onClose={onClose} />
         : searchQuery ? <SearchView query={searchQuery} onClose={onClose} />
         : <TrajectoryView sectors={sectors} signalsToday={signalsToday} signalsWeek={signalsWeek} signals={signals} loading={loading} />}
      </div>
    </div>
  );
}
