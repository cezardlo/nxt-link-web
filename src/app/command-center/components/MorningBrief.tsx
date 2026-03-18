'use client';
// src/app/command-center/components/MorningBrief.tsx
// Left panel — executive summary, priority items, cross-cutting themes.

import type { BriefItem, BriefPriority } from '../types/intel';

const CYAN  = '#00D4FF';
const GREEN = '#00FF88';
const GOLD  = '#FFD700';
const RED   = '#FF3B30';
const DIM   = 'rgba(0,212,255,0.09)';

const PRIORITY_META: Record<BriefPriority, { label: string; color: string }> = {
  URGENT:      { label: 'URGENT',      color: RED   },
  WATCH:       { label: 'WATCH',       color: GOLD  },
  OPPORTUNITY: { label: 'OPPORTUNITY', color: GREEN },
};

type Props = {
  items:              BriefItem[];
  executiveSummary:   string;
  crossCuttingThemes: string[];
  totalSignals:       number;
  generatedAt:        string | null;
  loading:            boolean;
  onItemClick:        (industry: string) => void;
};

export default function MorningBrief({
  items, executiveSummary, crossCuttingThemes,
  totalSignals, generatedAt, loading, onItemClick,
}: Props) {

  const genTime = generatedAt
    ? new Date(generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', borderBottom: `1px solid ${DIM}`,
        background: 'rgba(4,8,18,0.8)', flexShrink: 0,
      }}>
        <span style={{ position: 'relative', width: 7, height: 7, flexShrink: 0 }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: GOLD, boxShadow: `0 0 8px ${GOLD}88` }} />
        </span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.15em', color: GOLD, textTransform: 'uppercase' }}>
          Morning Brief
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: '#00d4ff', fontWeight: 600 }}>
          {totalSignals > 0 ? totalSignals : ''}
        </span>
        {totalSignals > 0 && (
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: 'rgba(0,212,255,0.35)', letterSpacing: '0.1em' }}>SIG</span>
        )}
        {genTime && (
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: 'rgba(0,212,255,0.28)', marginLeft: 4 }}>
            {genTime}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>

        {/* Loading shimmer */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: 72, background: 'rgba(0,212,255,0.04)', border: `1px solid ${DIM}`,
                borderRadius: 2, animation: 'shimmer 1.6s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }} />
            ))}
          </div>
        )}

        {/* Executive summary */}
        {!loading && executiveSummary && (
          <div style={{
            marginBottom: 10, padding: '8px 10px',
            background: 'rgba(255,215,0,0.04)', border: `1px solid rgba(255,215,0,0.12)`,
            borderRadius: 2,
          }}>
            <p style={{
              margin: 0, fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 10, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6,
            }}>
              {executiveSummary}
            </p>
          </div>
        )}

        {/* Cross-cutting themes */}
        {!loading && crossCuttingThemes.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            {crossCuttingThemes.map((theme, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, padding: '2px 0' }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: CYAN, flexShrink: 0 }}>◆</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(0,212,255,0.6)', lineHeight: 1.5 }}>
                  {theme}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && !executiveSummary && (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(0,212,255,0.3)' }}>
              No briefing data yet
            </span>
          </div>
        )}

        {/* Brief items */}
        {!loading && items.map((item) => {
          const meta = PRIORITY_META[item.priority];
          const epColor = item.elPasoRelevance >= 60 ? GREEN : item.elPasoRelevance >= 30 ? GOLD : 'rgba(0,212,255,0.3)';

          return (
            <div
              key={item.id}
              onClick={() => onItemClick(item.industry)}
              style={{
                marginBottom: 5, padding: '8px 10px',
                background: `${meta.color}05`,
                borderLeft: `2px solid ${meta.color}`,
                border: `1px solid ${meta.color}14`,
                borderLeftWidth: 2,
                borderRadius: 2, cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = `${meta.color}0e`;
                el.style.borderColor = `${meta.color}28`;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = `${meta.color}05`;
                el.style.borderColor = `${meta.color}14`;
              }}
            >
              {/* Priority badge + EP score */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 7,
                  letterSpacing: '0.12em', color: meta.color, fontWeight: 600,
                  background: `${meta.color}10`, border: `1px solid ${meta.color}28`,
                  borderRadius: 2, padding: '1px 5px',
                }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: meta.color, display: 'inline-block' }} />
                  {meta.label}
                </span>
                <span style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 7, color: 'rgba(0,212,255,0.28)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  flex: 1,
                }}>
                  {item.industry.slice(0, 22)}
                </span>
                <span style={{
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: epColor,
                  background: `${epColor}10`, border: `1px solid ${epColor}25`,
                  borderRadius: 2, padding: '1px 4px', flexShrink: 0,
                }}>
                  EP {item.elPasoRelevance}
                </span>
              </div>

              {/* Headline */}
              <p style={{
                margin: '0 0 4px', fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 10, color: 'rgba(255,255,255,0.90)', lineHeight: 1.45, fontWeight: 500,
              }}>
                {item.headline}
              </p>

              {/* Context */}
              <p style={{
                margin: 0, fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 9, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5,
              }}>
                {item.context}
              </p>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
