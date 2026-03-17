'use client';
// src/app/command-center/components/MorningBrief.tsx
// Left panel top half — displays up to 5 prioritized brief items.
// Each item: priority badge · headline · 2-line context · source · El Paso score

import type { BriefItem, BriefPriority } from '../types/intel';

// ─── Constants ────────────────────────────────────────────────────────────────

const CYAN   = '#00D4FF';
const GREEN  = '#00FF88';
const GOLD   = '#FFD700';
const RED    = '#FF3B30';
const DIM    = 'rgba(0,212,255,0.10)';

const PRIORITY_META: Record<BriefPriority, { label: string; color: string; dot: string }> = {
  URGENT:      { label: '● URGENT',      color: RED,   dot: RED   },
  WATCH:       { label: '● WATCH',       color: GOLD,  dot: GOLD  },
  OPPORTUNITY: { label: '● OPPORTUNITY', color: GREEN, dot: GREEN },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function EPScore({ score }: { score: number }) {
  const color = score >= 60 ? GREEN : score >= 30 ? GOLD : 'rgba(0,212,255,0.3)';
  return (
    <span style={{
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: 7,
      color,
      background: `${color}14`,
      border: `1px solid ${color}30`,
      borderRadius: 2,
      padding: '1px 4px',
      letterSpacing: '0.06em',
      flexShrink: 0,
    }}>
      EP {score}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  items:            BriefItem[];
  executiveSummary: string;
  totalSignals:     number;
  generatedAt:      string | null;
  loading:          boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MorningBrief({
  items,
  executiveSummary,
  totalSignals,
  generatedAt,
  loading,
}: Props) {

  const genTime = generatedAt
    ? new Date(generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        borderBottom: `1px solid ${DIM}`,
        background: 'rgba(0,0,0,0.35)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10 }}>☀</span>
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 8,
          letterSpacing: '0.12em',
          color: GOLD,
          textTransform: 'uppercase',
        }}>
          Morning Brief
        </span>
        {totalSignals > 0 && (
          <span style={{
            marginLeft: 'auto',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 7,
            color: 'rgba(0,212,255,0.4)',
          }}>
            {totalSignals} signals
          </span>
        )}
        {genTime && (
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 7,
            color: 'rgba(0,212,255,0.3)',
          }}>
            {genTime}
          </span>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: 68,
                background: 'rgba(0,212,255,0.04)',
                border: `1px solid ${DIM}`,
                borderRadius: 2,
                animation: 'brief-shimmer 1.6s ease-in-out infinite',
                animationDelay: `${i * 0.15}s`,
              }} />
            ))}
            <style>{`
              @keyframes brief-shimmer {
                0%, 100% { opacity: 0.4; }
                50%       { opacity: 0.8; }
              }
            `}</style>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>◌</div>
            <span style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 9,
              color: 'rgba(0,212,255,0.3)',
            }}>
              No briefing data yet
            </span>
          </div>
        )}

        {!loading && executiveSummary && (
          <div style={{
            marginBottom: 10,
            padding: '7px 9px',
            background: 'rgba(255,215,0,0.04)',
            border: `1px solid rgba(255,215,0,0.12)`,
            borderRadius: 2,
          }}>
            <span style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 7,
              letterSpacing: '0.12em',
              color: 'rgba(255,215,0,0.5)',
              textTransform: 'uppercase',
            }}>
              Overview
            </span>
            <p style={{
              margin: '4px 0 0',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 9,
              color: 'rgba(255,255,255,0.65)',
              lineHeight: 1.6,
            }}>
              {executiveSummary}
            </p>
          </div>
        )}

        {!loading && items.map((item) => {
          const meta = PRIORITY_META[item.priority];
          return (
            <div
              key={item.id}
              style={{
                marginBottom: 8,
                padding: '8px 9px',
                background: `${meta.color}06`,
                border: `1px solid ${meta.color}20`,
                borderLeft: `3px solid ${meta.color}`,
                borderRadius: 2,
                cursor: item.sourceUrl ? 'pointer' : 'default',
              }}
              onClick={() => item.sourceUrl && window.open(item.sourceUrl, '_blank')}
            >
              {/* Priority badge + EP score */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 7,
                  letterSpacing: '0.1em',
                  color: meta.color,
                }}>
                  {meta.label}
                </span>
                <span style={{
                  marginLeft: 'auto',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 7,
                  color: 'rgba(0,212,255,0.3)',
                }}>
                  {item.industry.slice(0, 24)}
                </span>
                <EPScore score={item.elPasoRelevance} />
              </div>

              {/* Headline */}
              <p style={{
                margin: '0 0 4px',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 10,
                color: 'rgba(255,255,255,0.85)',
                lineHeight: 1.45,
                fontWeight: 500,
              }}>
                {item.headline}
              </p>

              {/* Context */}
              <p style={{
                margin: 0,
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 8,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.55,
              }}>
                {item.context}
              </p>

              {/* Source link */}
              {item.sourceUrl && (
                <div style={{ marginTop: 4 }}>
                  <span style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 7,
                    color: CYAN,
                    letterSpacing: '0.06em',
                  }}>
                    ↗ {item.sourceName}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
