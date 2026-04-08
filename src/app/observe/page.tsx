'use client';
// @ts-nocheck

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ObserverAnalysis {
  industry: string;
  signals_used: number;
  observation_timestamp: string;
  signal_summary: {
    dominant_signal: string;
    signal_count: number;
    signals: Array<{ title: string; type: string; weight: number }>;
    noise_ratio: string;
    acceleration: string;
  };
  visual_map: {
    center: string;
    clusters: Array<{
      id: string; label: string; type: string; size: number;
      momentum: string; nodes: string[];
    }>;
    connections: Array<{ from: string; to: string; label: string; strength: number }>;
    tension_zones: string[];
  };
  story: {
    headline: string;
    act_1: string;
    act_2: string;
    act_3: string;
    el_paso_chapter: string;
    tension: string;
  };
  emerging_discoveries: Array<{
    id: string; name: string; category: string;
    maturity: string; why_it_matters: string; el_paso_angle: string;
  }>;
  direction: {
    trajectory: string;
    primary_vector: string;
    secondary_vector: string;
    timeline: string;
    confidence: number;
    futures: Array<{ label: string; probability: string; description: string }>;
  };
  what_to_watch: Array<{
    signal: string; why: string; timeframe: string; trigger: string;
  }>;
  uncertainty: {
    blind_spots: string[];
    what_could_change_everything: string;
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  { id: 'defense', label: 'Defense', emoji: '🛡️' },
  { id: 'ai-ml', label: 'AI / ML', emoji: '🤖' },
  { id: 'border-tech', label: 'Border Tech', emoji: '🌉' },
  { id: 'cybersecurity', label: 'Cyber', emoji: '🔐' },
  { id: 'logistics', label: 'Logistics', emoji: '🚚' },
  { id: 'space', label: 'Space', emoji: '🚀' },
  { id: 'energy', label: 'Energy', emoji: '⚡' },
  { id: 'manufacturing', label: 'Manufacturing', emoji: '🏭' },
  { id: 'semiconductor', label: 'Semiconductors', emoji: '💾' },
  { id: 'quantum', label: 'Quantum', emoji: '⚛️' },
  { id: 'life-sciences', label: 'Life Sciences', emoji: '🧬' },
  { id: 'climate-tech', label: 'Climate Tech', emoji: '🌍' },
];

const MOMENTUM_COLOR: Record<string, string> = {
  growing: '#0EA5E9',
  emerging: '#F59E0B',
  converging: '#A855F7',
  declining: '#EF4444',
  stable: '#6B7280',
  spiking: '#10B981',
};

const TRAJECTORY_CONFIG: Record<string, { color: string; label: string }> = {
  growing:    { color: '#0EA5E9', label: '↑ GROWING' },
  accelerating: { color: '#10B981', label: '↑↑ ACCELERATING' },
  stable:     { color: '#6B7280', label: '→ STABLE' },
  declining:  { color: '#EF4444', label: '↓ DECLINING' },
  converging: { color: '#A855F7', label: '⊕ CONVERGING' },
  disrupted:  { color: '#F59E0B', label: '⚡ DISRUPTED' },
  bifurcating:{ color: '#F97316', label: '⑂ BIFURCATING' },
};

const MATURITY_CONFIG: Record<string, { color: string }> = {
  idea:          { color: '#6B7280' },
  prototype:     { color: '#A855F7' },
  early_product: { color: '#F59E0B' },
  scaling:       { color: '#0EA5E9' },
  mainstream:    { color: '#10B981' },
};

// ── Visual Map Component ──────────────────────────────────────────────────────

function VisualMap({ map }: { map: ObserverAnalysis['visual_map'] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    const H = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    ctx.fillStyle = '#07090A';
    ctx.fillRect(0, 0, w, h);

    const clusters = map.clusters ?? [];
    const cx = w / 2;
    const cy = h / 2;

    // Place clusters in a circle around center
    const radius = Math.min(w, h) * 0.32;
    const placed: Record<string, { x: number; y: number; r: number; label: string }> = {};

    clusters.forEach((cluster, i) => {
      const angle = (i / clusters.length) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const r = (cluster.size ?? 2) * 14 + 12;
      placed[cluster.id] = { x, y, r, label: cluster.label };

      // Draw cluster circle
      const color = MOMENTUM_COLOR[cluster.momentum] ?? '#4B5563';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color + '22';
      ctx.fill();
      ctx.strokeStyle = color + '80';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pulse ring for emerging/spiking
      if (cluster.momentum === 'emerging' || cluster.momentum === 'converging') {
        ctx.beginPath();
        ctx.arc(x, y, r + 8, 0, Math.PI * 2);
        ctx.strokeStyle = color + '30';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Label
      ctx.font = `bold ${Math.max(9, r * 0.32)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(210,210,220,0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const words = cluster.label.split(' ');
      if (words.length > 1 && r > 30) {
        ctx.fillText(words[0], x, y - 6);
        ctx.fillText(words.slice(1).join(' '), x, y + 8);
      } else {
        ctx.fillText(cluster.label.length > 12 ? cluster.label.slice(0, 10) + '…' : cluster.label, x, y);
      }
    });

    // Draw connections
    (map.connections ?? []).forEach(conn => {
      const from = placed[conn.from];
      const to = placed[conn.to];
      if (!from || !to) return;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = `rgba(14,165,233,${0.1 + conn.strength * 0.12})`;
      ctx.lineWidth = conn.strength;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Draw center node
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28);
    grad.addColorStop(0, 'rgba(14,165,233,0.4)');
    grad.addColorStop(1, 'rgba(14,165,233,0.08)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(14,165,233,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center label
    const centerText = map.center ?? '';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#0EA5E9';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cWords = centerText.split(' ').slice(0, 2);
    ctx.fillText(cWords[0] ?? '', cx, cWords[1] ? cy - 5 : cy);
    if (cWords[1]) ctx.fillText(cWords[1], cx, cy + 7);

    // Draw lines from center to each cluster
    Object.values(placed).forEach(p => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = 'rgba(14,165,233,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [map]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg"
      style={{ height: 320, display: 'block' }}
    />
  );
}

// ── Acceleration Badge ────────────────────────────────────────────────────────

function AccelBadge({ value }: { value: string }) {
  const cfg: Record<string, { text: string; className: string }> = {
    spiking:      { text: '⚡ SPIKING',       className: 'bg-green-500/15 text-green-400 border-green-500/30' },
    accelerating: { text: '↑ ACCELERATING',  className: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
    stable:       { text: '→ STABLE',         className: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
    decelerating: { text: '↓ SLOWING',        className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  };
  const c = cfg[value] ?? cfg['stable'];
  return (
    <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${c.className}`}>
      {c.text}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ObservePage() {
  const [selected, setSelected] = useState('defense');
  const [customInput, setCustomInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ObserverAnalysis | null>(null);
  const [signalsMeta, setSignalsMeta] = useState<{ signals_used: number; generated_at: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'story' | 'map' | 'discover' | 'direction' | 'watch'>('story');

  const runObserver = async (industry: string) => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const res = await fetch('/api/observer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry }),
      });
      const data = await res.json();
      if (data.ok && data.analysis) {
        setAnalysis(data.analysis);
        setSignalsMeta({ signals_used: data.signals_used, generated_at: data.generated_at });
      } else {
        setError(data.error ?? 'Analysis failed');
      }
    } catch (e) {
      setError('Connection error');
    }
    setLoading(false);
  };

  const handleRun = () => {
    const target = customInput.trim() || selected;
    runObserver(target);
  };

  return (
    <div className="min-h-screen bg-[#07090A]">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-4 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#0EA5E9]">◈ NXT LINK</span>
                <span className="text-gray-700">·</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">OBSERVER SYSTEM</span>
              </div>
              <h1 className="text-2xl font-bold text-white font-mono">
                Alien Intelligence<span className="text-[#0EA5E9]">.</span>
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Pattern detection across human industries — no bias, no assumptions.
              </p>
            </div>
            <Link href="/" className="text-xs text-gray-600 hover:text-gray-400 mt-1">← Back</Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Industry selector */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map(ind => (
              <button
                key={ind.id}
                onClick={() => setSelected(ind.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  selected === ind.id
                    ? 'bg-[#0EA5E9]/15 border-[#0EA5E9]/40 text-[#0EA5E9]'
                    : 'bg-white/[0.03] border-white/[0.06] text-gray-500 hover:text-gray-300 hover:border-white/[0.12]'
                }`}
              >
                {ind.emoji} {ind.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRun()}
              placeholder="Or type any industry, company, or event..."
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#0EA5E9]/40 font-mono"
            />
            <button
              onClick={handleRun}
              disabled={loading}
              className="px-5 py-2.5 bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                  Scanning
                </span>
              ) : 'OBSERVE →'}
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-[#0EA5E9]/20 bg-[#0EA5E9]/5 rounded-xl p-8 text-center"
          >
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#0EA5E9] mb-3">
              ◉ SCANNING INDUSTRY SIGNALS
            </div>
            <div className="space-y-1.5 max-w-sm mx-auto">
              {['Loading signal database...', 'Detecting patterns...', 'Building visual map...', 'Writing the story...'].map((step, i) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.4 }}
                  className="text-xs text-gray-600 font-mono"
                >
                  {step}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-4 text-sm text-red-400 font-mono">
            ⚠ {error}
          </div>
        )}

        {/* Analysis output */}
        <AnimatePresence>
          {analysis && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Top bar: dominant signal + acceleration */}
              <div className="border border-white/[0.08] bg-white/[0.02] rounded-xl p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1">
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600 mb-1">DOMINANT SIGNAL</div>
                    <p className="text-white font-bold text-base leading-snug">{analysis.signal_summary?.dominant_signal}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <AccelBadge value={analysis.signal_summary?.acceleration ?? 'stable'} />
                    <span className="font-mono text-[10px] text-gray-600">
                      {signalsMeta?.signals_used ?? 0} signals scanned
                    </span>
                  </div>
                </div>

                {/* Signal pills */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(analysis.signal_summary?.signals ?? []).slice(0, 6).map((sig, i) => (
                    <span
                      key={i}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        sig.type === 'anomaly' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        sig.type === 'subtle' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}
                    >
                      {sig.type === 'anomaly' ? '⚡' : sig.type === 'subtle' ? '◦' : '·'} {sig.title?.slice(0, 45)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tension zones */}
              {(analysis.visual_map?.tension_zones ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="font-mono text-[10px] uppercase text-red-500/70">⚡ TENSION:</span>
                  {analysis.visual_map.tension_zones.map((z, i) => (
                    <span key={i} className="text-[11px] font-mono text-red-400/70 bg-red-500/5 border border-red-500/15 px-2 py-0.5 rounded">
                      {z}
                    </span>
                  ))}
                </div>
              )}

              {/* Tab navigation */}
              <div className="flex gap-1 border-b border-white/[0.06] pb-0">
                {([
                  { id: 'story', label: 'THE STORY' },
                  { id: 'map', label: 'VISUAL MAP' },
                  { id: 'discover', label: 'DISCOVERIES' },
                  { id: 'direction', label: 'DIRECTION' },
                  { id: 'watch', label: 'WATCH FOR' },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-[#0EA5E9] text-[#0EA5E9]'
                        : 'border-transparent text-gray-600 hover:text-gray-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab: Story */}
              {activeTab === 'story' && analysis.story && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="border border-white/[0.08] bg-white/[0.02] rounded-xl p-5">
                    <p className="text-white text-lg font-bold leading-snug mb-4">{analysis.story.headline}</p>
                    <div className="space-y-4">
                      {[
                        { label: 'ACT I — WAS', text: analysis.story.act_1, color: 'text-gray-500' },
                        { label: 'ACT II — CHANGED', text: analysis.story.act_2, color: 'text-gray-300' },
                        { label: 'ACT III — BECOMING', text: analysis.story.act_3, color: 'text-white' },
                      ].map(act => (
                        <div key={act.label} className="flex gap-3">
                          <span className="font-mono text-[9px] uppercase text-gray-700 w-24 shrink-0 pt-0.5 leading-loose">{act.label}</span>
                          <p className={`text-sm leading-relaxed ${act.color}`}>{act.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* El Paso chapter */}
                  <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-500 mb-2">🎯 EL PASO CHAPTER</div>
                    <p className="text-amber-200/80 text-sm leading-relaxed">{analysis.story.el_paso_chapter}</p>
                  </div>

                  {/* Tension */}
                  {analysis.story.tension && (
                    <div className="border border-red-500/15 bg-red-500/5 rounded-xl p-4">
                      <div className="font-mono text-[10px] uppercase text-red-500/70 mb-1">CENTRAL TENSION</div>
                      <p className="text-red-300/80 text-sm italic">"{analysis.story.tension}"</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Tab: Visual Map */}
              {activeTab === 'map' && analysis.visual_map && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="border border-white/[0.08] bg-[#07090A] rounded-xl overflow-hidden">
                    <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase text-gray-600">GRAVITY CENTER: <span className="text-[#0EA5E9]">{analysis.visual_map.center}</span></span>
                      <span className="font-mono text-[10px] text-gray-700">{analysis.visual_map.clusters?.length ?? 0} clusters · {analysis.visual_map.connections?.length ?? 0} connections</span>
                    </div>
                    <VisualMap map={analysis.visual_map} />
                  </div>

                  {/* Cluster legend */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(analysis.visual_map.clusters ?? []).map(cluster => (
                      <div key={cluster.id} className="flex items-start gap-2 p-2.5 rounded-lg border border-white/[0.05] bg-white/[0.02]">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                          style={{ background: MOMENTUM_COLOR[cluster.momentum] ?? '#4B5563' }}
                        />
                        <div>
                          <p className="text-xs font-medium text-gray-300">{cluster.label}</p>
                          <p className="text-[10px] font-mono text-gray-600 mt-0.5">
                            {cluster.momentum} · size {cluster.size}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Tab: Discoveries */}
              {activeTab === 'discover' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  {(analysis.emerging_discoveries ?? []).map((d, i) => {
                    const mc = MATURITY_CONFIG[d.maturity] ?? { color: '#6B7280' };
                    return (
                      <div key={d.id ?? i} className="border border-white/[0.08] bg-white/[0.02] rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <h3 className="text-white font-bold text-sm">{d.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono text-[9px] uppercase text-gray-600">{d.category}</span>
                              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border" style={{ color: mc.color, borderColor: mc.color + '40', background: mc.color + '10' }}>
                                {d.maturity.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>
                          <span className="font-mono text-2xl shrink-0">{i + 1 <= 3 ? ['🔬', '⚡', '◈'][i] : '→'}</span>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">{d.why_it_matters}</p>
                        {d.el_paso_angle && (
                          <p className="text-amber-400/70 text-xs mt-2 font-mono">🎯 {d.el_paso_angle}</p>
                        )}
                      </div>
                    );
                  })}
                  {!analysis.emerging_discoveries?.length && (
                    <div className="text-center py-8 text-gray-600 text-sm">No discoveries detected for this scan.</div>
                  )}
                </motion.div>
              )}

              {/* Tab: Direction */}
              {activeTab === 'direction' && analysis.direction && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {/* Trajectory */}
                  <div className="border border-white/[0.08] bg-white/[0.02] rounded-xl p-5">
                    {(() => {
                      const t = TRAJECTORY_CONFIG[analysis.direction.trajectory] ?? TRAJECTORY_CONFIG.stable;
                      return (
                        <div className="flex items-center gap-3 mb-4">
                          <span className="font-mono text-xl font-bold" style={{ color: t.color }}>{t.label}</span>
                          <span className="font-mono text-[10px] text-gray-600 ml-auto">
                            {analysis.direction.confidence}% confidence · {analysis.direction.timeline}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Confidence bar */}
                    <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden mb-5">
                      <div
                        className="h-full rounded-full bg-[#0EA5E9]"
                        style={{ width: `${analysis.direction.confidence ?? 0}%` }}
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <div className="font-mono text-[10px] uppercase text-gray-600 mb-1">PRIMARY VECTOR</div>
                        <p className="text-gray-200 text-sm leading-relaxed">{analysis.direction.primary_vector}</p>
                      </div>
                      <div>
                        <div className="font-mono text-[10px] uppercase text-gray-600 mb-1">HIDDEN VECTOR</div>
                        <p className="text-amber-300/80 text-sm leading-relaxed">{analysis.direction.secondary_vector}</p>
                      </div>
                    </div>
                  </div>

                  {/* Possible futures */}
                  <div className="space-y-2">
                    <div className="font-mono text-[10px] uppercase text-gray-600">POSSIBLE FUTURES</div>
                    {(analysis.direction.futures ?? []).map((f, i) => (
                      <div key={i} className={`border rounded-xl p-3.5 ${
                        f.probability === 'high' ? 'border-[#0EA5E9]/20 bg-[#0EA5E9]/5' :
                        f.probability === 'medium' ? 'border-amber-500/20 bg-amber-500/5' :
                        'border-white/[0.05] bg-white/[0.02]'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded ${
                            f.probability === 'high' ? 'bg-[#0EA5E9]/20 text-[#0EA5E9]' :
                            f.probability === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-gray-500/20 text-gray-500'
                          }`}>{f.probability}</span>
                          <span className="text-sm font-bold text-white">{f.label}</span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{f.description}</p>
                      </div>
                    ))}
                  </div>

                  {/* Uncertainty */}
                  {analysis.uncertainty && (
                    <div className="border border-white/[0.05] bg-white/[0.01] rounded-xl p-4">
                      <div className="font-mono text-[10px] uppercase text-gray-700 mb-2">OBSERVER UNCERTAINTY</div>
                      <p className="text-gray-600 text-xs italic mb-3">"{analysis.uncertainty.what_could_change_everything}"</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(analysis.uncertainty.blind_spots ?? []).map((b, i) => (
                          <span key={i} className="text-[10px] font-mono text-gray-700 bg-white/[0.02] border border-white/[0.04] px-2 py-0.5 rounded">
                            ? {b}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Tab: Watch For */}
              {activeTab === 'watch' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  {(analysis.what_to_watch ?? []).map((w, i) => (
                    <div key={i} className="border border-white/[0.08] bg-white/[0.02] rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-mono text-[10px] text-[#0EA5E9] uppercase mb-1">
                            WATCH #{i + 1} · {w.timeframe?.toUpperCase()}
                          </div>
                          <h3 className="text-white text-sm font-bold leading-snug">{w.signal}</h3>
                          <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">{w.why}</p>
                        </div>
                      </div>
                      {w.trigger && (
                        <div className="mt-3 border-t border-white/[0.04] pt-3">
                          <span className="font-mono text-[9px] uppercase text-gray-700">TRIGGER: </span>
                          <span className="text-xs text-amber-400/70">{w.trigger}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {!analysis.what_to_watch?.length && (
                    <div className="text-center py-8 text-gray-600 text-sm">Run observation to generate watch list.</div>
                  )}
                </motion.div>
              )}

              {/* Footer */}
              <div className="text-center pt-2 pb-4">
                <span className="font-mono text-[10px] text-gray-700">
                  OBSERVER · {signalsMeta?.generated_at ? new Date(signalsMeta.generated_at).toLocaleTimeString() : ''} · {analysis.industry?.toUpperCase()}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!loading && !analysis && !error && (
          <div className="border border-white/[0.05] bg-white/[0.01] rounded-xl p-10 text-center">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-gray-700 mb-3">SELECT AN INDUSTRY</div>
            <p className="text-gray-600 text-sm">
              Choose an industry above and hit OBSERVE.<br/>
              The system will scan live signals and generate a full intelligence report.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
