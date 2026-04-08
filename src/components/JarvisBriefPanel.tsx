'use client';
// @ts-nocheck

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface JarvisMove {
  action: string;
  why: string;
  who: string;
  urgency: 'immediate' | 'this_week' | 'this_month';
}

interface JarvisData {
  date: string;
  world_headline: string;
  situation: string;
  accelerating: Array<{ sector: string; headline: string; signal_count: number }>;
  emerging: Array<{ pattern: string; evidence: string }>;
  for_el_paso: {
    narrative: string;
    top_opportunity: string;
    watch_for: string[];
  };
  top_3_moves: JarvisMove[];
  signals_analyzed: number;
  generated_at: string;
}

const URGENCY_CONFIG = {
  immediate:  { label: 'NOW',        className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  this_week:  { label: 'THIS WEEK',  className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  this_month: { label: 'THIS MONTH', className: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
};

function SkeletonRow({ width = 'w-full' }: { width?: string }) {
  return <div className={`h-4 ${width} bg-white/5 rounded animate-pulse`} />;
}

export function JarvisBriefPanel() {
  const [brief, setBrief] = useState<JarvisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'ep' | 'moves'>('overview');

  useEffect(() => {
    fetch('/api/intelligence/morning-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then(r => r.json())
      .then(d => { if (d.ok && d.data) setBrief(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="border border-[#1A2332] bg-[#080C10] rounded-lg overflow-hidden mb-6">
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] tracking-[0.2em] text-[#0EA5E9] uppercase">
            ⬡ JARVIS INTEL BRIEF
          </span>
          {brief && (
            <span className="font-mono text-[10px] text-gray-600">
              {brief.signals_analyzed > 0 ? `${brief.signals_analyzed} signals analyzed` : brief.date}
            </span>
          )}
        </div>
        <span className="text-gray-600 text-xs">{collapsed ? '▼' : '▲'}</span>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[#1A2332]">
              {loading ? (
                <div className="px-4 py-4 space-y-3">
                  <SkeletonRow width="w-3/4" />
                  <SkeletonRow width="w-full" />
                  <SkeletonRow width="w-5/6" />
                  <div className="flex gap-2 pt-1">
                    <SkeletonRow width="w-24" />
                    <SkeletonRow width="w-28" />
                    <SkeletonRow width="w-20" />
                  </div>
                </div>
              ) : !brief ? (
                <div className="px-4 py-4">
                  <p className="font-mono text-[11px] text-gray-600 uppercase tracking-wide">
                    ◉ SIGNAL FEED ACTIVE — BRIEF GENERATING
                  </p>
                </div>
              ) : (
                <div>
                  {/* World Headline */}
                  <div className="px-4 pt-4 pb-3 border-b border-[#111820]">
                    <p className="text-white font-bold text-base leading-snug">{brief.world_headline}</p>
                  </div>

                  {/* Tab Nav */}
                  <div className="flex border-b border-[#111820]">
                    {(['overview', 'ep', 'moves'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveSection(tab)}
                        className={`flex-1 py-2 font-mono text-[10px] uppercase tracking-wide transition-colors ${
                          activeSection === tab
                            ? 'text-[#0EA5E9] border-b border-[#0EA5E9]'
                            : 'text-gray-600 hover:text-gray-400'
                        }`}
                      >
                        {tab === 'overview' ? 'OVERVIEW' : tab === 'ep' ? 'EL PASO' : 'MOVES'}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div className="px-4 py-4 space-y-4">
                    {activeSection === 'overview' && (
                      <>
                        {/* Situation */}
                        <p className="text-gray-400 text-sm leading-relaxed">{brief.situation}</p>

                        {/* Accelerating */}
                        {brief.accelerating?.length > 0 && (
                          <div>
                            <p className="font-mono text-[10px] text-gray-600 uppercase tracking-wide mb-2">ACCELERATING</p>
                            <div className="flex flex-wrap gap-2">
                              {brief.accelerating.map((item, i) => (
                                <span key={i} className="px-2 py-1 rounded text-[11px] bg-teal-500/10 border border-teal-500/20 text-teal-400">
                                  <span className="font-semibold">{item.sector}</span>
                                  {item.signal_count > 0 && <span className="text-teal-600 ml-1">·{item.signal_count}</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Emerging */}
                        {brief.emerging?.length > 0 && (
                          <div>
                            <p className="font-mono text-[10px] text-gray-600 uppercase tracking-wide mb-2">EMERGING PATTERNS</p>
                            <div className="space-y-2">
                              {brief.emerging.map((item, i) => (
                                <div key={i} className="flex gap-2">
                                  <span className="text-amber-500 mt-1 flex-shrink-0">◈</span>
                                  <div>
                                    <p className="text-gray-300 text-sm font-medium">{item.pattern}</p>
                                    <p className="text-gray-600 text-xs mt-0.5">{item.evidence}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {activeSection === 'ep' && brief.for_el_paso && (
                      <>
                        <div className="flex gap-2">
                          <span className="text-amber-400 mt-1 flex-shrink-0">🎯</span>
                          <p className="text-gray-300 text-sm leading-relaxed">{brief.for_el_paso.narrative}</p>
                        </div>

                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                          <p className="font-mono text-[10px] text-amber-500 uppercase tracking-wide mb-1">TOP OPPORTUNITY</p>
                          <p className="text-amber-300 text-sm">{brief.for_el_paso.top_opportunity}</p>
                        </div>

                        {brief.for_el_paso.watch_for?.length > 0 && (
                          <div>
                            <p className="font-mono text-[10px] text-gray-600 uppercase tracking-wide mb-2">WATCH FOR</p>
                            <div className="space-y-1.5">
                              {brief.for_el_paso.watch_for.map((w, i) => (
                                <div key={i} className="flex gap-2 text-sm text-gray-400">
                                  <span className="text-[#0EA5E9] flex-shrink-0">→</span>
                                  <span>{w}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {activeSection === 'moves' && brief.top_3_moves?.length > 0 && (
                      <div className="space-y-3">
                        {brief.top_3_moves.map((move, i) => {
                          const urg = URGENCY_CONFIG[move.urgency] ?? URGENCY_CONFIG['this_month'];
                          return (
                            <div key={i} className="flex gap-3">
                              <span className="font-mono text-[#0EA5E9] text-sm font-bold flex-shrink-0 mt-0.5">
                                {i + 1}.
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-gray-200 text-sm font-medium leading-snug">{move.action}</p>
                                  <span className={`flex-shrink-0 px-1.5 py-0.5 rounded font-mono text-[9px] uppercase border ${urg.className}`}>
                                    {urg.label}
                                  </span>
                                </div>
                                <p className="text-gray-500 text-xs mt-1">{move.why}</p>
                                {move.who && (
                                  <p className="text-gray-600 text-[11px] mt-0.5 font-mono">→ {move.who}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
