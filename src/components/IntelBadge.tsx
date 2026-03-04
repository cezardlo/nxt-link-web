'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { SignalFinding, SectorScore } from '@/lib/intelligence/signal-engine';

type ApiResponse = {
  ok: boolean;
  signals: SignalFinding[];
  sectorScores: SectorScore[];
  activeVendorIds: string[];
  detectedAt: string;
};

type Props = {
  onSignalsLoaded?: (signals: SignalFinding[], sectorScores: SectorScore[], activeVendorIds: string[]) => void;
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#ff3b30',
  high:     '#ff6400',
  elevated: '#ffb800',
  normal:   '#00ff88',
};

const SIGNAL_ICON: Record<string, string> = {
  vendor_mention:  '◉',
  contract_alert:  '$',
  velocity_spike:  '↑',
  convergence:     '△',
  sector_spike:    '⊞',
  security_impact: '⚠',
};

const SIGNAL_LABEL: Record<string, string> = {
  vendor_mention:  'VENDOR',
  contract_alert:  'CONTRACT',
  velocity_spike:  'VELOCITY',
  convergence:     'CONVERGENCE',
  sector_spike:    'SECTOR',
  security_impact: 'SECURITY→ECON',
};

export function IntelBadge({ onSignalsLoaded }: Props) {
  const [signals, setSignals] = useState<SignalFinding[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detectedAt, setDetectedAt] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/intel-signals');
      const data = await res.json() as ApiResponse;
      if (data.ok) {
        setSignals(data.signals);
        setDetectedAt(data.detectedAt);
        onSignalsLoaded?.(data.signals, data.sectorScores, data.activeVendorIds);
      }
    } catch {
      // silently fail — badge just shows 0
    } finally {
      setLoading(false);
    }
  }, [onSignalsLoaded]);

  useEffect(() => {
    fetchSignals();
    intervalRef.current = setInterval(fetchSignals, 5 * 60 * 1000); // every 5 min
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchSignals]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const criticalCount = signals.filter((s) => s.priority === 'critical').length;
  const highCount     = signals.filter((s) => s.priority === 'high').length;
  const badgeColor    = criticalCount > 0 ? '#ff3b30' : highCount > 0 ? '#ff6400' : signals.length > 0 ? '#ffb800' : '#ffffff22';

  const timeAgo = detectedAt
    ? Math.round((Date.now() - new Date(detectedAt).getTime()) / 60_000)
    : null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Badge button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-sm font-mono text-[10px] tracking-wider transition-all"
        style={{
          background: signals.length > 0 ? `${badgeColor}15` : 'transparent',
          border: `1px solid ${signals.length > 0 ? badgeColor : 'rgba(255,255,255,0.1)'}`,
          color: signals.length > 0 ? badgeColor : 'rgba(255,255,255,0.3)',
        }}
        title="Intelligence Findings"
      >
        <span style={{ fontSize: 11 }}>⚡</span>
        {loading ? (
          <span className="loading-dots" />
        ) : (
          <span>{signals.length > 0 ? `${signals.length} INTEL` : 'INTEL'}</span>
        )}
        {criticalCount > 0 && (
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#ff3b30' }}
          />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 w-[380px] max-h-[70vh] overflow-y-auto rounded-sm flex flex-col"
          style={{ background: 'rgba(0,0,0,0.96)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] tracking-[0.3em] text-white/40">INTEL FINDINGS</span>
              {timeAgo !== null && (
                <span className="font-mono text-[8px] text-white/20">{timeAgo}m ago</span>
              )}
            </div>
            <button
              onClick={fetchSignals}
              className="font-mono text-[8px] text-white/30 hover:text-white/60 transition-colors"
            >
              ↻ REFRESH
            </button>
          </div>

          {/* Signal list */}
          {signals.length === 0 ? (
            <div className="px-3 py-6 text-center font-mono text-[9px] text-white/20">
              {loading ? 'Scanning feeds…' : 'No signals detected. Feeds may still be loading.'}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-white/[0.05]">
              {signals.map((signal) => {
                const color = PRIORITY_COLOR[signal.priority] ?? '#ffffff';
                const icon  = SIGNAL_ICON[signal.type] ?? '·';
                const label = SIGNAL_LABEL[signal.type] ?? signal.type.toUpperCase();
                return (
                  <div key={signal.id} className="px-3 py-2.5 flex flex-col gap-1">
                    {/* Row 1: type badge + title */}
                    <div className="flex items-start gap-2">
                      <span
                        className="shrink-0 font-mono text-[8px] tracking-wider px-1 py-0.5 rounded-sm leading-none mt-0.5"
                        style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}
                      >
                        {icon} {label}
                      </span>
                      <span className="font-mono text-[10px] text-white/80 leading-tight">
                        {signal.title}
                      </span>
                    </div>

                    {/* Row 2: description */}
                    <p className="font-mono text-[9px] text-white/40 leading-relaxed pl-0 line-clamp-2">
                      {signal.description}
                    </p>

                    {/* Row 3: why it matters */}
                    <p className="font-mono text-[8px] leading-relaxed pl-0" style={{ color: `${color}99` }}>
                      {signal.whyItMatters}
                    </p>

                    {/* Row 4: metadata */}
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="font-mono text-[8px] text-white/20">
                        {signal.articleCount} article{signal.articleCount !== 1 ? 's' : ''}
                      </span>
                      {signal.contractAmountM && (
                        <span className="font-mono text-[8px]" style={{ color: '#ffb800' }}>
                          {signal.contractAmountM >= 1000
                            ? `$${(signal.contractAmountM / 1000).toFixed(1)}B`
                            : `$${Math.round(signal.contractAmountM)}M`}
                        </span>
                      )}
                      {signal.entityName && (
                        <span className="font-mono text-[8px]" style={{ color }}>
                          {signal.entityName}
                        </span>
                      )}
                      <span
                        className="ml-auto font-mono text-[8px] px-1 rounded-sm"
                        style={{ background: `${color}12`, color: `${color}99` }}
                      >
                        {Math.round(signal.confidence * 100)}% conf
                      </span>
                    </div>

                    {/* Actionable insight */}
                    <div
                      className="mt-1 px-2 py-1.5 rounded-sm font-mono text-[8px] leading-relaxed"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <span className="text-white/25">ACTION → </span>
                      <span className="text-white/50">{signal.actionableInsight}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="px-3 py-1.5 border-t border-white/[0.06] flex items-center justify-between">
            <span className="font-mono text-[8px] text-white/15">
              NXT LINK SIGNAL ENGINE v1.0
            </span>
            <span className="font-mono text-[8px]" style={{ color: badgeColor }}>
              {criticalCount > 0 ? `${criticalCount} CRITICAL` : highCount > 0 ? `${highCount} HIGH` : 'NOMINAL'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
