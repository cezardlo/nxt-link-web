'use client';

import { useState, useCallback } from 'react';
import type {
  AskResponse,
  ExpertBrief,
  KeyPlayer,
  DirectionSection,
  LiveSearchMeta,
} from '@/lib/engines/ask-engine';
import type { PredictionReport, TrajectoryForecast } from '@/lib/engines/prediction-engine';

// ─── Lookup tables ───────────────────────────────────────────────────────────

const EMERGING_PRODUCTS: Record<string, { name: string; company: string; year: number }[]> = {
  'humanoid robot': [
    { name: 'Figure 02', company: 'Figure AI', year: 2025 },
    { name: 'Optimus Gen 3', company: 'Tesla', year: 2026 },
    { name: 'Agility Digit 2', company: 'Agility Robotics', year: 2025 },
    { name: '1X NEO', company: '1X Technologies', year: 2026 },
  ],
  'battery storage': [
    { name: '100hr Iron-Air Battery', company: 'Form Energy', year: 2026 },
    { name: 'Blue Carbon Sodium Battery', company: 'Natron Energy', year: 2025 },
    { name: 'Solid-State EV Cell', company: 'QuantumScape', year: 2027 },
    { name: 'LFP Grid Pack Gen 4', company: 'CATL', year: 2025 },
  ],
  'autonomous vehicle': [
    { name: 'Waymo 6th Gen', company: 'Waymo', year: 2025 },
    { name: 'Aurora Horizon', company: 'Aurora Innovation', year: 2025 },
    { name: 'Kodiak R', company: 'Kodiak Robotics', year: 2026 },
    { name: 'Thor Platform', company: 'Nvidia', year: 2026 },
  ],
  'ai chip': [
    { name: 'B200 Ultra', company: 'NVIDIA', year: 2025 },
    { name: 'MI400X', company: 'AMD', year: 2026 },
    { name: 'LPU Gen 2', company: 'Groq', year: 2026 },
    { name: 'Falcon Shores', company: 'Intel', year: 2025 },
  ],
  'quantum computing': [
    { name: 'Condor 1121-qubit', company: 'IBM', year: 2025 },
    { name: 'Willow Chip', company: 'Google', year: 2025 },
    { name: 'Forte Enterprise', company: 'IonQ', year: 2026 },
    { name: 'Eagle 2', company: 'Quantinuum', year: 2026 },
  ],
  'drone delivery': [
    { name: 'Platform 2', company: 'Zipline', year: 2025 },
    { name: 'Wing Gen 3', company: 'Wing (Alphabet)', year: 2026 },
    { name: 'Air Taxi S4', company: 'Joby Aviation', year: 2026 },
    { name: 'Prime Air MK30', company: 'Amazon', year: 2025 },
  ],
  'gene editing': [
    { name: 'Prime Editing 2.0', company: 'Prime Medicine', year: 2026 },
    { name: 'Base Editing Platform', company: 'Beam Therapeutics', year: 2025 },
    { name: 'CRISPR Cas12 Kit', company: 'Integrated DNA', year: 2025 },
    { name: 'Epigenetic Silencer', company: 'Epic Bio', year: 2027 },
  ],
  'fusion energy': [
    { name: 'SPARC Reactor', company: 'Commonwealth Fusion', year: 2027 },
    { name: 'Polaris Machine', company: 'Helion Energy', year: 2028 },
    { name: 'ARC Device', company: 'TAE Technologies', year: 2028 },
    { name: 'FRC Pilot Plant', company: 'Realta Fusion', year: 2027 },
  ],
};

const CONVERGENCE_MAP: Record<string, { tech: string; signal: string }[]> = {
  'humanoid robot': [
    { tech: 'Foundation AI Models', signal: 'enabling natural language task planning' },
    { tech: 'Tactile Sensors', signal: 'dexterous hand manipulation milestone' },
    { tech: 'Edge Inference Chips', signal: 'real-time onboard decision making' },
  ],
  'battery storage': [
    { tech: 'Solar PV', signal: 'co-located storage becoming standard' },
    { tech: 'Smart Grid AI', signal: 'demand-response optimization' },
    { tech: 'EV Fleet Networks', signal: 'vehicle-to-grid bidirectional power' },
  ],
  'autonomous vehicle': [
    { tech: 'LiDAR / 4D Radar', signal: 'sensor fusion reducing cost 60%' },
    { tech: 'V2X 5G', signal: 'infrastructure-assisted perception' },
    { tech: 'Large Vision Models', signal: 'end-to-end learning replacing rules' },
  ],
  'ai chip': [
    { tech: 'Photonic Computing', signal: 'optical interconnects at wafer scale' },
    { tech: 'In-Memory Processing', signal: 'eliminating memory wall bottleneck' },
    { tech: 'Chiplet Architectures', signal: '3D stacking density surge' },
  ],
  'quantum computing': [
    { tech: 'Classical HPC', signal: 'hybrid quantum-classical workloads' },
    { tech: 'Cryptography', signal: 'post-quantum migration underway' },
    { tech: 'Drug Discovery AI', signal: 'molecular simulation acceleration' },
  ],
  'drone delivery': [
    { tech: 'AI Vision Systems', signal: 'obstacle avoidance at scale' },
    { tech: '5G mmWave', signal: 'beyond-visual-line-of-sight corridors' },
    { tech: 'Urban Air Mobility', signal: 'shared airspace frameworks emerging' },
  ],
  'gene editing': [
    { tech: 'AI Protein Folding', signal: 'AlphaFold-guided target selection' },
    { tech: 'mRNA Delivery', signal: 'lipid nanoparticle precision improved' },
    { tech: 'Single-Cell Sequencing', signal: 'off-target effect mapping' },
  ],
  'fusion energy': [
    { tech: 'High-Temp Superconductors', signal: 'REBCO tape enabling compact reactors' },
    { tech: 'Plasma AI Control', signal: 'ML stabilizing turbulence in real time' },
    { tech: 'Tritium Breeding', signal: 'lithium blanket designs advancing' },
  ],
};

// ─── S-curve helpers ─────────────────────────────────────────────────────────

const STAGE_PERCENT: Record<string, number> = {
  nascent: 8,
  research: 5,
  emerging: 22,
  early_adoption: 42,
  growth: 65,
  mainstream: 85,
  mature: 95,
  declining: 98,
};

const STAGE_LABELS: { label: string; pct: number }[] = [
  { label: 'RESEARCH', pct: 5 },
  { label: 'EMERGING', pct: 22 },
  { label: 'EARLY ADOPTION', pct: 42 },
  { label: 'GROWTH', pct: 65 },
  { label: 'MAINSTREAM', pct: 85 },
];

const TIME_TO_MAINSTREAM: Record<string, string> = {
  nascent: '10–15 yr',
  research: '8–12 yr',
  emerging: '5–8 yr',
  early_adoption: '3–5 yr',
  growth: '1–3 yr',
  mainstream: 'Already there',
  mature: 'N/A',
  declining: 'Past peak',
};

// ─── SVG S-curve ─────────────────────────────────────────────────────────────

function SCurveChart({ stage }: { stage: string }) {
  const W = 600;
  const H = 200;
  const PAD = { l: 44, r: 20, t: 28, b: 30 };
  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;

  const toX = (pct: number) => PAD.l + (pct / 100) * cw;
  const toY = (adop: number) => PAD.t + ch - (adop / 100) * ch;

  // Logistic S-curve
  function logistic(x: number): number {
    return 1 / (1 + Math.exp(-10 * (x - 0.5)));
  }
  const lo = logistic(0);
  const hi = logistic(1);
  const norm = (v: number) => ((v - lo) / (hi - lo)) * 100;

  // Build path by dense sampling
  const pts: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const x = toX(i);
    const y = toY(norm(logistic(t)));
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const fullPath = pts.join(' ');

  const stagePct = STAGE_PERCENT[stage] ?? 50;

  // Active (cyan) portion
  const activePts: string[] = [];
  for (let i = 0; i <= Math.round(stagePct); i++) {
    const t = i / 100;
    const x = toX(i);
    const y = toY(norm(logistic(t)));
    activePts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const activePath = activePts.join(' ');

  // Dot position
  const dotX = toX(stagePct);
  const dotY = toY(norm(logistic(stagePct / 100)));

  const labelOffsets = [22, -26, 22, -26, 22];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ maxHeight: 200 }}
      aria-label="S-curve adoption chart"
    >
      <defs>
        <linearGradient id="trajFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="trajDotGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Y-axis label */}
      <text
        x={10}
        y={PAD.t + ch / 2}
        fill="#ffffff25"
        fontSize="7"
        fontFamily="monospace"
        textAnchor="middle"
        transform={`rotate(-90, 10, ${PAD.t + ch / 2})`}
      >
        ADOPTION %
      </text>

      {/* Gridlines + Y labels */}
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line
            x1={PAD.l} y1={toY(v)}
            x2={PAD.l + cw} y2={toY(v)}
            stroke="#ffffff07" strokeWidth="1"
          />
          <text
            x={PAD.l - 4} y={toY(v) + 3}
            fill="#ffffff28" fontSize="7" fontFamily="monospace" textAnchor="end"
          >
            {v}%
          </text>
        </g>
      ))}

      {/* Fill under active path */}
      <path
        d={`${activePath} L${dotX},${toY(0)} L${toX(0)},${toY(0)} Z`}
        fill="url(#trajFill)"
      />

      {/* Full curve — gray */}
      <path d={fullPath} fill="none" stroke="#ffffff18" strokeWidth="2" strokeLinecap="round" />

      {/* Active curve — cyan */}
      <path d={activePath} fill="none" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" />

      {/* Stage tick labels */}
      {STAGE_LABELS.map((sl, idx) => {
        const lx = toX(sl.pct);
        const ly = toY(norm(logistic(sl.pct / 100)));
        const off = labelOffsets[idx] ?? 22;
        const active = stagePct >= sl.pct;
        return (
          <g key={sl.label}>
            <line
              x1={lx} y1={ly} x2={lx} y2={ly + off}
              stroke={active ? '#00d4ff33' : '#ffffff12'}
              strokeWidth="1" strokeDasharray="2 2"
            />
            <text
              x={lx} y={ly + off + (off > 0 ? 9 : -3)}
              fill={active ? '#00d4ff88' : '#ffffff28'}
              fontSize="7" fontFamily="monospace" textAnchor="middle"
            >
              {sl.label}
            </text>
          </g>
        );
      })}

      {/* Vertical drop to x-axis */}
      <line
        x1={dotX} y1={dotY} x2={dotX} y2={toY(0)}
        stroke="#ffd70033" strokeWidth="1" strokeDasharray="3 3"
      />

      {/* Glow halo */}
      <circle cx={dotX} cy={dotY} r="12" fill="url(#trajDotGlow)" opacity="0.6" />

      {/* Current position dot */}
      <circle
        cx={dotX} cy={dotY} r="5"
        fill="#00d4ff"
        style={{ filter: 'drop-shadow(0 0 6px #00d4ffcc)' }}
      />

      {/* Gold stage callout */}
      <text
        x={dotX} y={dotY - 13}
        fill="#ffd700" fontSize="8" fontFamily="monospace" fontWeight="bold" textAnchor="middle"
        style={{ filter: 'drop-shadow(0 0 4px #ffd700aa)' }}
      >
        {stage.replace(/_/g, ' ').toUpperCase()}
      </text>

      {/* X-axis label */}
      <text
        x={PAD.l + cw / 2} y={H - 4}
        fill="#ffffff20" fontSize="7" fontFamily="monospace" textAnchor="middle"
      >
        TIME →
      </text>
    </svg>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color,
}: {
  label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div
      className="rounded-sm border border-white/[0.06] bg-black/60 p-4 flex flex-col gap-1"
      style={{ borderLeft: `2px solid ${color}` }}
    >
      <span className="font-mono text-[9px] tracking-widest text-white/40 uppercase">{label}</span>
      <span
        className="font-mono text-sm font-bold leading-tight"
        style={{ color, textShadow: `0 0 8px ${color}88` }}
      >
        {value}
      </span>
      {sub && <span className="font-mono text-[9px] text-white/30">{sub}</span>}
    </div>
  );
}

// ─── Loading panel ────────────────────────────────────────────────────────────

const LOAD_STEPS = [
  'Scanning signal data',
  'Plotting S-curve position',
  'Forecasting adoption',
  'Identifying emerging products',
];

function LoadingPanel() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-24">
      <div className="relative flex items-center justify-center w-20 h-20">
        <div
          className="absolute inset-0 rounded-full border border-cyan-400/30 animate-ping"
          style={{ animationDuration: '1.5s' }}
        />
        <div
          className="absolute inset-2 rounded-full border border-cyan-400/50 animate-ping"
          style={{ animationDuration: '1.5s', animationDelay: '0.4s' }}
        />
        <div
          className="w-3 h-3 rounded-full bg-[#00d4ff]"
          style={{ boxShadow: '0 0 12px #00d4ffcc' }}
        />
      </div>
      <p className="font-mono text-[11px] tracking-[0.2em] text-[#00d4ff] uppercase">
        Mapping technology trajectory...
      </p>
      <div className="flex flex-col gap-2 items-start w-56">
        {LOAD_STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
            <span className="font-mono text-[10px] text-white/40">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Lookup fuzzy match ───────────────────────────────────────────────────────

function matchLookup<T>(query: string, table: Record<string, T>): T | null {
  const q = query.toLowerCase();
  for (const key of Object.keys(table)) {
    if (q.includes(key) || key.split(' ').some((w) => q.includes(w) && w.length > 3)) {
      return table[key];
    }
  }
  return null;
}

// ─── Quick chip list ──────────────────────────────────────────────────────────

const QUICK_CHIPS = [
  { label: 'AI Chips', query: 'ai chip' },
  { label: 'Humanoid Robots', query: 'humanoid robot' },
  { label: 'Battery Storage', query: 'battery storage' },
  { label: 'Autonomous Vehicles', query: 'autonomous vehicle' },
  { label: 'Quantum Computing', query: 'quantum computing' },
  { label: 'Gene Editing', query: 'gene editing' },
  { label: 'Fusion Energy', query: 'fusion energy' },
  { label: 'Drone Delivery', query: 'drone delivery' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrajectoryPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [askResult, setAskResult] = useState<AskResponse | null>(null);
  const [predictions, setPredictions] = useState<PredictionReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(
    async (chipQuery?: string) => {
      const finalQuery = (chipQuery ?? query).trim();
      if (!finalQuery) return;
      if (chipQuery) setQuery(chipQuery);

      setLoading(true);
      setAskResult(null);
      setPredictions(null);
      setError(null);

      try {
        const [askRes, predRes] = await Promise.all([
          fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: finalQuery }),
          }),
          fetch('/api/predictions'),
        ]);

        const [askJson, predJson] = await Promise.all([
          askRes.json() as Promise<unknown>,
          predRes.json() as Promise<unknown>,
        ]);

        const ask = askJson as AskResponse & { ok: boolean };
        if (ask.ok) setAskResult(ask);
        else setError('Intelligence engine returned an error. Try a different query.');

        const pred = predJson as { ok: boolean; data?: PredictionReport };
        if (pred.ok && pred.data) setPredictions(pred.data);
      } catch {
        setError('Failed to fetch trajectory data. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  // ── Derived values ────────────────────────────────────────────────────────

  const brief: ExpertBrief | undefined = askResult?.sections?.expert_brief;
  const direction: DirectionSection | undefined = askResult?.sections?.direction;
  const keyPlayers: KeyPlayer[] = askResult?.sections?.key_players ?? [];
  const liveSearch: LiveSearchMeta | undefined = askResult?.live_search;

  const rawStage =
    direction?.adoption_stage ??
    (brief?.maturity === 'nascent'
      ? 'emerging'
      : brief?.maturity === 'declining'
        ? 'mature'
        : brief?.maturity ?? 'emerging');
  // Normalise: engine sometimes returns 'early adoption' with space
  const stage = rawStage.replace(' ', '_').toLowerCase();

  const momentum = direction?.momentum ?? brief?.market_momentum ?? 'growing';
  const patentCount = liveSearch?.patents_found ?? 0;
  const ttm = TIME_TO_MAINSTREAM[stage] ?? '3–5 yr';

  // Prediction cards
  const relevantForecasts: TrajectoryForecast[] = predictions?.trajectories
    ? [...predictions.trajectories].sort((a, b) => b.confidence - a.confidence).slice(0, 3)
    : [];

  const OUTLOOK_COLORS = ['#00d4ff', '#ffd700', '#a855f7'];
  const OUTLOOK_FRAMES = ['6 months', '1–2 years', '3–5 years'];

  const syntheticOutlook = [
    {
      text: `${brief?.headline ?? 'Continued momentum'} with early mover advantage windows opening.`,
      confidence: 72,
    },
    {
      text: `${momentum === 'surging' ? 'Rapid scaling' : momentum === 'growing' ? 'Steady expansion' : 'Consolidation'} phase. Key players racing to capture market share.`,
      confidence: 58,
    },
    {
      text: `Convergence with adjacent technologies likely. ${brief?.bullet_points?.[0] ?? 'Infrastructure buildout accelerating.'}`,
      confidence: 44,
    },
  ];

  const emergingProducts = matchLookup(query.toLowerCase(), EMERGING_PRODUCTS) ?? [];
  const convergences = matchLookup(query.toLowerCase(), CONVERGENCE_MAP) ?? [
    { tech: 'AI/ML Systems', signal: 'automation integration deepening' },
    { tech: 'Cloud Infrastructure', signal: 'platform-as-a-service adoption expanding' },
    { tech: 'IoT Sensor Networks', signal: 'real-time data collection at scale' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black text-white font-mono">

      {/* Nav bar */}
      <div className="border-b border-white/[0.06] h-11 flex items-center px-6 gap-4">
        <a
          href="/"
          className="text-[9px] tracking-widest text-white/30 hover:text-white/60 transition-colors uppercase"
        >
          NXT//LINK
        </a>
        <span className="text-white/10">/</span>
        <span className="text-[9px] tracking-widest text-[#00d4ff]/60 uppercase">Tech Trajectory</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
          <span className="text-[9px] text-white/30 tracking-widest">LIVE</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-10">

        {/* ── Header ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div
              className="w-px h-6 bg-[#00d4ff]"
              style={{ boxShadow: '0 0 8px #00d4ffcc' }}
            />
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              TECHNOLOGY TRAJECTORY
            </h1>
          </div>
          <p className="font-mono text-[11px] text-white/40 pl-5">
            Where is this technology heading? S-curve position, adoption forecast, and emerging products.
          </p>
        </div>

        {/* ── Search ── */}
        <div className="flex flex-col gap-4 rounded-sm border border-white/[0.06] bg-black/40 p-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              placeholder="Enter any technology or industry..."
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-sm px-4 py-2.5 font-mono text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#00d4ff]/40 focus:bg-[#00d4ff]/[0.04] transition-all"
            />
            <button
              onClick={() => handleAnalyze()}
              disabled={loading || !query.trim()}
              className="px-5 py-2.5 text-[10px] font-mono tracking-widest uppercase rounded-sm border border-[#00d4ff]/30 bg-[#00d4ff]/10 text-[#00d4ff] hover:bg-[#00d4ff]/20 hover:border-[#00d4ff]/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
            >
              {loading ? 'ANALYZING...' : 'ANALYZE TRAJECTORY →'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => handleAnalyze(chip.query)}
                className="px-3 py-1 text-[9px] font-mono tracking-wider uppercase rounded-sm border border-white/[0.08] text-white/40 hover:border-[#00d4ff]/30 hover:text-[#00d4ff]/70 hover:bg-[#00d4ff]/[0.04] transition-all"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && <LoadingPanel />}

        {/* ── Error ── */}
        {error && !loading && (
          <div className="rounded-sm border border-[#ff3b30]/20 bg-[#ff3b30]/5 px-5 py-4">
            <span className="font-mono text-[10px] text-[#ff3b30]">{error}</span>
          </div>
        )}

        {/* ════════ RESULTS ════════════════════════════════════════════════════ */}
        {askResult && !loading && (
          <div className="flex flex-col gap-8">

            {/* Expert brief callout */}
            {brief?.key_insight && (
              <div className="rounded-sm border border-[#00d4ff]/15 bg-[#00d4ff]/[0.04] px-5 py-4 flex gap-3">
                <div
                  className="w-px shrink-0 bg-[#00d4ff]"
                  style={{ boxShadow: '0 0 6px #00d4ffcc' }}
                />
                <p className="font-mono text-[11px] text-white/60 leading-relaxed">
                  {brief.key_insight}
                </p>
              </div>
            )}

            {/* ── Section 1: S-Curve ── */}
            <section className="rounded-sm border border-white/[0.06] bg-black/40 p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[9px] tracking-widest text-[#00d4ff] uppercase"
                    style={{ textShadow: '0 0 6px #00d4ff88' }}
                  >
                    S-CURVE POSITION
                  </span>
                  <span className="text-[9px] text-white/20">—</span>
                  <span className="text-[9px] text-white/35 capitalize">{query}</span>
                </div>
                <span
                  className="text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-sm border"
                  style={{
                    color: '#ffd700',
                    borderColor: '#ffd70030',
                    backgroundColor: '#ffd70010',
                    textShadow: '0 0 6px #ffd70088',
                  }}
                >
                  {stage.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>
              <div className="rounded-sm bg-white/[0.02] border border-white/[0.04] p-3">
                <SCurveChart stage={stage} />
              </div>
              <p className="font-mono text-[10px] text-white/30 leading-relaxed">
                Glowing dot = current position on the adoption lifecycle. Cyan segment = completed journey.
                Gold label = current stage.
              </p>
            </section>

            {/* ── Section 2: Stats ── */}
            <section className="flex flex-col gap-3">
              <span className="font-mono text-[9px] tracking-widest text-white/25 uppercase">
                Trajectory Metrics
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  label="Current Stage"
                  value={stage.replace(/_/g, ' ').toUpperCase()}
                  sub={direction?.adoption_label ?? 'Lifecycle position'}
                  color="#00d4ff"
                />
                <StatCard
                  label="Momentum"
                  value={momentum.toUpperCase()}
                  sub="Market signal direction"
                  color={
                    momentum === 'surging' || momentum === 'growing'
                      ? '#00ff88'
                      : momentum === 'declining'
                        ? '#ff3b30'
                        : '#ffb800'
                  }
                />
                <StatCard
                  label="Patent Velocity"
                  value={patentCount > 0 ? `${patentCount} patents` : 'Active'}
                  sub="Recent filing activity"
                  color="#ffd700"
                />
                <StatCard
                  label="Time to Mainstream"
                  value={ttm}
                  sub="Estimated from stage"
                  color="#a855f7"
                />
              </div>
            </section>

            {/* ── Section 3: 5-Year Outlook ── */}
            <section className="flex flex-col gap-3">
              <span className="font-mono text-[9px] tracking-widest text-white/25 uppercase">
                5-Year Outlook
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(relevantForecasts.length > 0 ? relevantForecasts : syntheticOutlook).map(
                  (item, i) => {
                    const c = OUTLOOK_COLORS[i] ?? '#00d4ff';
                    const frame = OUTLOOK_FRAMES[i] ?? 'Forecast';
                    const isRealForecast = (item as TrajectoryForecast).industry !== undefined;
                    const fc = isRealForecast ? (item as TrajectoryForecast) : null;
                    const synth = !isRealForecast
                      ? (item as (typeof syntheticOutlook)[number])
                      : null;
                    const confPct = fc
                      ? Math.round(fc.confidence * 100)
                      : synth?.confidence ?? 50;
                    const text = fc
                      ? fc.direction === 'accelerating'
                        ? `Accelerating growth. ${fc.catalysts[0] ?? 'Strong momentum signals.'}`
                        : fc.direction === 'growing'
                          ? `Sustained expansion. Next stage: ${fc.adoption_next_stage ?? 'growth'}.`
                          : fc.direction === 'plateauing'
                            ? 'Plateauing signals. Market consolidation beginning.'
                            : `Trajectory: ${fc.direction}.`
                      : synth?.text ?? '';
                    return (
                      <div
                        key={i}
                        className="rounded-sm border border-white/[0.06] bg-black/50 p-4 flex flex-col gap-2"
                        style={{ borderLeft: `2px solid ${c}` }}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="font-mono text-[9px] tracking-widest uppercase"
                            style={{ color: c }}
                          >
                            {frame}
                          </span>
                          <span
                            className="font-mono text-[9px] px-1.5 py-0.5 rounded-sm"
                            style={{
                              color: c,
                              backgroundColor: `${c}15`,
                              border: `1px solid ${c}25`,
                            }}
                          >
                            {confPct}% conf
                          </span>
                        </div>
                        <p className="font-mono text-[10px] text-white/55 leading-relaxed">{text}</p>
                        {fc && (
                          <span className="font-mono text-[8px] text-white/20 capitalize">
                            {fc.industry}
                          </span>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            </section>

            {/* ── Section 4: Emerging Products ── */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[9px] tracking-widest text-white/25 uppercase">
                  Products &amp; Machines Emerging in This Space
                </span>
                {emergingProducts.length > 0 && (
                  <span className="font-mono text-[9px] text-[#ffd700]/50">
                    {emergingProducts.length} tracked
                  </span>
                )}
              </div>
              {emergingProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {emergingProducts.map((p) => (
                    <div
                      key={p.name}
                      className="rounded-sm border border-white/[0.06] bg-black/50 p-4 flex flex-col gap-2 hover:border-[#ffd700]/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold text-white/80 leading-tight">
                          {p.name}
                        </span>
                        <span
                          className="shrink-0 font-mono text-[8px] tracking-wider px-1.5 py-0.5 rounded-sm"
                          style={{
                            color: '#ffd700',
                            backgroundColor: '#ffd70015',
                            border: '1px solid #ffd70030',
                          }}
                        >
                          PROJECTED
                        </span>
                      </div>
                      <span className="font-mono text-[9px] text-white/35">{p.company}</span>
                      <span
                        className="font-mono text-[9px] mt-auto"
                        style={{ color: '#00d4ff', textShadow: '0 0 4px #00d4ff44' }}
                      >
                        ~{p.year}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-sm border border-white/[0.04] bg-white/[0.02] p-5">
                  <p className="font-mono text-[10px] text-white/30">
                    No curated product roadmap for this query. Try a quick chip above for tracked emerging products.
                  </p>
                </div>
              )}
            </section>

            {/* ── Section 5: Race visualization ── */}
            {keyPlayers.length > 0 && (
              <section className="flex flex-col gap-3">
                <span className="font-mono text-[9px] tracking-widest text-white/25 uppercase">
                  Who&apos;s Winning the Race
                </span>
                <div className="rounded-sm border border-white/[0.06] bg-black/40 p-5 flex flex-col gap-3">
                  {keyPlayers.slice(0, 8).map((player, idx) => {
                    const maxMentions = Math.max(...keyPlayers.map((p) => p.mentions), 1);
                    const barPct = Math.round((player.mentions / maxMentions) * 100);
                    const sentimentColor =
                      player.sentiment === 'positive'
                        ? '#00ff88'
                        : player.sentiment === 'negative'
                          ? '#ff3b30'
                          : '#ffffff35';
                    const roleColor =
                      player.role === 'leader'
                        ? '#ffd700'
                        : player.role === 'challenger'
                          ? '#00d4ff'
                          : player.role === 'emerging'
                            ? '#00ff88'
                            : '#ffffff35';
                    return (
                      <div key={player.name} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] text-white/20 w-4 text-right">
                              {idx + 1}
                            </span>
                            <span className="font-mono text-[10px] text-white/70">{player.name}</span>
                            <span
                              className="font-mono text-[8px] px-1.5 py-0.5 rounded-sm uppercase tracking-wide"
                              style={{
                                color: roleColor,
                                backgroundColor: `${roleColor}15`,
                                border: `1px solid ${roleColor}25`,
                              }}
                            >
                              {player.role}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] text-white/25">
                              {player.mentions} signals
                            </span>
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: sentimentColor,
                                boxShadow: `0 0 4px ${sentimentColor}88`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="ml-6 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${barPct}%`,
                              backgroundColor:
                                idx === 0 ? '#ffd700' : idx === 1 ? '#00d4ff' : '#ffffff25',
                              boxShadow:
                                idx === 0
                                  ? '0 0 6px #ffd70066'
                                  : idx === 1
                                    ? '0 0 6px #00d4ff66'
                                    : 'none',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Section 6: Convergence Signals ── */}
            <section className="flex flex-col gap-3">
              <span className="font-mono text-[9px] tracking-widest text-white/25 uppercase">
                Convergence Signals
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {convergences.map((c) => (
                  <div
                    key={c.tech}
                    className="rounded-sm border border-white/[0.06] bg-black/40 p-4 flex flex-col gap-2 hover:border-[#00ff88]/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full bg-[#00ff88]"
                        style={{ boxShadow: '0 0 4px #00ff8888' }}
                      />
                      <span className="font-mono text-[10px] font-bold text-white/65">{c.tech}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="font-mono text-[8px] text-[#00ff88]/55 mt-0.5 shrink-0">
                        ◉ CONV
                      </span>
                      <p className="font-mono text-[9px] text-white/38 leading-relaxed">{c.signal}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Meta footer */}
            <div className="flex items-center justify-between border-t border-white/[0.04] pt-4">
              <span className="font-mono text-[9px] text-white/18">
                Query:{' '}
                <span className="text-white/35">{askResult.query}</span>
              </span>
              <span className="font-mono text-[9px] text-white/18">
                {liveSearch?.duration_ms
                  ? `${(liveSearch.duration_ms / 1000).toFixed(1)}s · ${liveSearch.sources_checked} sources`
                  : 'NXT//LINK TRAJECTORY ENGINE'}
              </span>
            </div>

          </div>
        )}

        {/* ── Empty state ── */}
        {!askResult && !loading && !error && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="w-16 h-16 rounded-full border border-white/[0.06] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path
                  d="M2 24 C6 24 8 4 14 4 C20 4 22 24 26 24"
                  stroke="#00d4ff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                <circle cx="14" cy="14" r="2.5" fill="#00d4ff" opacity="0.8" />
              </svg>
            </div>
            <p className="font-mono text-[11px] text-white/22 max-w-xs leading-relaxed">
              Enter any technology or industry above to map its S-curve position, forecast adoption, and surface emerging products.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
