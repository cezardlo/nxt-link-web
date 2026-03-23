'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageTopBar } from '@/components/PageTopBar';
import type { DiscoveredOpportunity } from '@/lib/engines/opportunity-engine';

// ── Types ────────────────────────────────────────────────────────────────────

type OpportunityCluster = {
  id: string;
  name: string;
  category: string;
  score: number;
  signals: {
    research: number;
    funding: number;
    patents: number;
    adoption: number;
    conferences: number;
  };
  trend: 'accelerating' | 'emerging' | 'stable' | 'cooling';
  description: string;
  keyPlayers: string[];
  relatedTechs: string[];
  elPasoRelevance: string;
  timeToMarket: string;
};

// ── Data ─────────────────────────────────────────────────────────────────────

const OPPORTUNITY_CLUSTERS: OpportunityCluster[] = [
  {
    id: 'autonomous-border',
    name: 'Autonomous Border Surveillance',
    category: 'Defense & Security',
    score: 92,
    signals: { research: 88, funding: 95, patents: 78, adoption: 85, conferences: 90 },
    trend: 'accelerating',
    description:
      'AI-driven autonomous surveillance systems combining drone fleets, computer vision, and sensor fusion for border monitoring. Federal funding surges and DHS procurement signals make this the highest-opportunity cluster for the El Paso corridor.',
    keyPlayers: ['Anduril Industries', 'Shield AI', 'Skydio', 'L3Harris', 'Elbit Systems'],
    relatedTechs: ['tech-computer-vision', 'tech-autonomous-systems', 'tech-edge-computing'],
    elPasoRelevance:
      'El Paso is the largest US-Mexico border metro. CBP regional HQ, Fort Bliss proximity, and existing sensor infrastructure create a natural testbed for autonomous border tech.',
    timeToMarket: '6-12 months',
  },
  {
    id: 'ai-water-management',
    name: 'AI-Powered Water Management',
    category: 'Infrastructure & Environment',
    score: 88,
    signals: { research: 92, funding: 80, patents: 70, adoption: 75, conferences: 85 },
    trend: 'accelerating',
    description:
      'Machine learning models for water distribution optimization, leak detection, and demand forecasting in arid regions. Climate pressure and federal infrastructure funding are converging to accelerate adoption.',
    keyPlayers: ['Xylem', 'Itron', 'SWAN Analytics', 'Fathom', 'Fracta'],
    relatedTechs: ['tech-ai-ml', 'tech-iot-sensors', 'tech-digital-twins'],
    elPasoRelevance:
      'Desert city with chronic water scarcity. El Paso Water Utilities is nationally recognized for water reuse innovation and actively seeking AI-driven optimization tools.',
    timeToMarket: '3-9 months',
  },
  {
    id: 'warehouse-robotics',
    name: 'Warehouse Robotics',
    category: 'Logistics & Supply Chain',
    score: 85,
    signals: { research: 70, funding: 90, patents: 82, adoption: 88, conferences: 75 },
    trend: 'accelerating',
    description:
      'Autonomous mobile robots (AMRs), robotic picking arms, and orchestration software for warehouse operations. E-commerce growth and labor shortages drive rapid deployment across logistics corridors.',
    keyPlayers: ['Locus Robotics', 'Berkshire Grey', '6 River Systems', 'Geek+', 'Fetch Robotics'],
    relatedTechs: ['tech-autonomous-systems', 'tech-computer-vision', 'tech-ai-ml'],
    elPasoRelevance:
      'Major US-Mexico trade gateway with expanding warehouse districts along I-10 corridor. Amazon, FedEx, and UPS distribution centers are prime deployment sites.',
    timeToMarket: '3-6 months',
  },
  {
    id: 'private-5g-manufacturing',
    name: 'Private 5G Manufacturing',
    category: 'Telecommunications',
    score: 82,
    signals: { research: 75, funding: 85, patents: 80, adoption: 72, conferences: 88 },
    trend: 'emerging',
    description:
      'Dedicated 5G networks for factory floors enabling real-time robotics control, AR-guided assembly, and massive IoT sensor networks. CBRS spectrum availability accelerates private deployments.',
    keyPlayers: ['Nokia', 'Ericsson', 'Celona', 'Betacom', 'Druid Software'],
    relatedTechs: ['tech-5g-networks', 'tech-iot-sensors', 'tech-edge-computing'],
    elPasoRelevance:
      'Growing manufacturing base with Foxconn, Schneider Electric, and automotive parts plants. Private 5G can modernize cross-border manufacturing operations.',
    timeToMarket: '6-12 months',
  },
  {
    id: 'digital-twin-infra',
    name: 'Digital Twin Infrastructure',
    category: 'Smart Cities',
    score: 79,
    signals: { research: 85, funding: 72, patents: 76, adoption: 65, conferences: 82 },
    trend: 'emerging',
    description:
      'Full-fidelity digital replicas of physical infrastructure for simulation, predictive maintenance, and urban planning. Combines LiDAR scanning, IoT telemetry, and physics-based modeling.',
    keyPlayers: ['Bentley Systems', 'Cityzenith', 'Willow', 'Nvidia Omniverse', 'Unity'],
    relatedTechs: ['tech-digital-twins', 'tech-ai-ml', 'tech-iot-sensors'],
    elPasoRelevance:
      'Rapid urban growth and aging infrastructure create demand for digital twins of water systems, power grids, and transportation networks.',
    timeToMarket: '9-18 months',
  },
  {
    id: 'quantum-safe-crypto',
    name: 'Quantum-Safe Cryptography',
    category: 'Cybersecurity',
    score: 76,
    signals: { research: 95, funding: 68, patents: 88, adoption: 45, conferences: 78 },
    trend: 'emerging',
    description:
      'Post-quantum cryptographic algorithms and migration tools to protect systems against quantum computer attacks. NIST standardization is driving enterprise adoption timelines.',
    keyPlayers: ['PQShield', 'SandboxAQ', 'Quantinuum', 'IBM Quantum', 'ISARA'],
    relatedTechs: ['tech-cybersecurity', 'tech-quantum-computing', 'tech-cryptography'],
    elPasoRelevance:
      'Military installations (Fort Bliss, White Sands) and defense contractors require quantum-safe communications. Federal mandate compliance creates procurement urgency.',
    timeToMarket: '12-24 months',
  },
  {
    id: 'green-hydrogen-logistics',
    name: 'Green Hydrogen Logistics',
    category: 'Energy & Environment',
    score: 73,
    signals: { research: 82, funding: 78, patents: 65, adoption: 50, conferences: 72 },
    trend: 'emerging',
    description:
      'Production, storage, and distribution infrastructure for green hydrogen as a transportation fuel. Electrolysis cost reductions and federal tax credits accelerate commercial viability.',
    keyPlayers: ['Plug Power', 'Bloom Energy', 'Air Liquide', 'Nel ASA', 'Nikola'],
    relatedTechs: ['tech-hydrogen-fuel', 'tech-renewable-energy', 'tech-energy-storage'],
    elPasoRelevance:
      'Abundant solar energy for electrolysis, I-10 trucking corridor for hydrogen fueling stations, and cross-border freight demand create a hydrogen logistics hub opportunity.',
    timeToMarket: '18-36 months',
  },
  {
    id: 'edge-ai-defense',
    name: 'Edge AI for Defense',
    category: 'Defense & Security',
    score: 71,
    signals: { research: 80, funding: 75, patents: 72, adoption: 60, conferences: 68 },
    trend: 'stable',
    description:
      'Deploying AI inference at the tactical edge for real-time threat detection, autonomous navigation, and sensor processing without cloud connectivity. Critical for contested environments.',
    keyPlayers: ['Palantir', 'Anduril', 'NVIDIA', 'Qualcomm', 'Latent AI'],
    relatedTechs: ['tech-edge-computing', 'tech-ai-ml', 'tech-autonomous-systems'],
    elPasoRelevance:
      'Fort Bliss is a major Army training center. White Sands Missile Range tests edge AI systems. Local defense contractors can integrate and deploy edge solutions.',
    timeToMarket: '6-18 months',
  },
  {
    id: 'autonomous-last-mile',
    name: 'Autonomous Last-Mile Delivery',
    category: 'Logistics & Supply Chain',
    score: 68,
    signals: { research: 65, funding: 72, patents: 70, adoption: 58, conferences: 62 },
    trend: 'stable',
    description:
      'Self-driving delivery robots and drones for final-mile package delivery. Regulatory frameworks are maturing and unit economics are approaching viability in select markets.',
    keyPlayers: ['Nuro', 'Starship Technologies', 'Serve Robotics', 'Zipline', 'Wing'],
    relatedTechs: ['tech-autonomous-systems', 'tech-computer-vision', 'tech-5g-networks'],
    elPasoRelevance:
      'Sprawling suburban layout with long last-mile distances increases delivery costs. Warm climate enables year-round outdoor robot operations.',
    timeToMarket: '12-24 months',
  },
  {
    id: 'smart-grid-cyber',
    name: 'Smart Grid Cybersecurity',
    category: 'Cybersecurity',
    score: 65,
    signals: { research: 72, funding: 60, patents: 68, adoption: 55, conferences: 70 },
    trend: 'stable',
    description:
      'Specialized cybersecurity solutions for operational technology (OT) networks in power grids, including anomaly detection, secure SCADA, and zero-trust architectures for utilities.',
    keyPlayers: ['Dragos', 'Claroty', 'Nozomi Networks', 'Fortinet', 'Cisco'],
    relatedTechs: ['tech-cybersecurity', 'tech-iot-sensors', 'tech-ai-ml'],
    elPasoRelevance:
      'El Paso Electric serves a binational grid. Cross-border power infrastructure faces unique cyber threats requiring specialized OT security solutions.',
    timeToMarket: '6-12 months',
  },
  {
    id: 'predictive-healthcare',
    name: 'Predictive Healthcare AI',
    category: 'Healthcare',
    score: 62,
    signals: { research: 88, funding: 65, patents: 60, adoption: 42, conferences: 58 },
    trend: 'stable',
    description:
      'AI models for early disease detection, patient risk stratification, and treatment optimization. Clinical validation pipelines are maturing but regulatory approval remains a bottleneck.',
    keyPlayers: ['Tempus', 'PathAI', 'Viz.ai', 'Aidoc', 'Butterfly Network'],
    relatedTechs: ['tech-ai-ml', 'tech-health-informatics', 'tech-genomics'],
    elPasoRelevance:
      'Underserved border population with high diabetes and chronic disease rates. UTEP biomedical research and regional hospitals need predictive tools for resource optimization.',
    timeToMarket: '12-24 months',
  },
  {
    id: 'solid-state-batteries',
    name: 'Solid-State Batteries',
    category: 'Energy & Environment',
    score: 59,
    signals: { research: 90, funding: 62, patents: 85, adoption: 25, conferences: 55 },
    trend: 'emerging',
    description:
      'Next-generation batteries replacing liquid electrolytes with solid materials for higher energy density, faster charging, and improved safety. Still in pre-commercial manufacturing scale-up.',
    keyPlayers: ['QuantumScape', 'Solid Power', 'Toyota', 'Samsung SDI', 'ProLogium'],
    relatedTechs: ['tech-energy-storage', 'tech-materials-science', 'tech-ev-technology'],
    elPasoRelevance:
      'Proximity to lithium deposits in New Mexico. Cross-border auto manufacturing supply chain could integrate solid-state battery production.',
    timeToMarket: '24-48 months',
  },
  {
    id: 'space-iot',
    name: 'Space-Based IoT',
    category: 'Telecommunications',
    score: 56,
    signals: { research: 68, funding: 58, patents: 55, adoption: 38, conferences: 60 },
    trend: 'emerging',
    description:
      'Low-earth orbit satellite constellations providing direct-to-device IoT connectivity for remote asset tracking, agricultural monitoring, and infrastructure telemetry beyond cellular coverage.',
    keyPlayers: ['Swarm (SpaceX)', 'Lacuna Space', 'Astrocast', 'Myriota', 'Sateliot'],
    relatedTechs: ['tech-satellite-comm', 'tech-iot-sensors', 'tech-5g-networks'],
    elPasoRelevance:
      'Vast rural areas around El Paso lack cellular coverage. Ranch operations, pipeline monitoring, and border sensor networks could leverage satellite IoT.',
    timeToMarket: '12-24 months',
  },
  {
    id: 'carbon-capture',
    name: 'Carbon Capture Tech',
    category: 'Energy & Environment',
    score: 53,
    signals: { research: 78, funding: 55, patents: 62, adoption: 30, conferences: 48 },
    trend: 'cooling',
    description:
      'Direct air capture (DAC) and point-source carbon capture technologies. High capital costs and energy requirements limit deployment, but 45Q tax credits and corporate net-zero pledges sustain investment.',
    keyPlayers: ['Climeworks', 'Carbon Engineering', 'Heirloom', '1PointFive', 'Global Thermostat'],
    relatedTechs: ['tech-carbon-capture', 'tech-renewable-energy', 'tech-materials-science'],
    elPasoRelevance:
      'Permian Basin proximity for CO2 sequestration geology. Solar energy abundance reduces DAC energy costs. Oil and gas industry transitioning to carbon management.',
    timeToMarket: '24-48 months',
  },
  {
    id: 'synbio-manufacturing',
    name: 'Synthetic Biology Manufacturing',
    category: 'Biotech & Manufacturing',
    score: 48,
    signals: { research: 85, funding: 50, patents: 58, adoption: 20, conferences: 42 },
    trend: 'cooling',
    description:
      'Engineered biological systems for producing materials, chemicals, and pharmaceuticals. Biofoundries and cell-free systems are advancing but commercial scale-up remains challenging.',
    keyPlayers: ['Ginkgo Bioworks', 'Zymergen', 'Twist Bioscience', 'Amyris', 'Solugen'],
    relatedTechs: ['tech-genomics', 'tech-ai-ml', 'tech-materials-science'],
    elPasoRelevance:
      'UTEP biotechnology programs and proximity to Mexican pharmaceutical manufacturing create a potential synbio corridor. Early-stage opportunity requiring university partnerships.',
    timeToMarket: '36-60 months',
  },
];

// ── Signal config ────────────────────────────────────────────────────────────

const SIGNAL_KEYS: Array<{ key: keyof OpportunityCluster['signals']; label: string; color: string }> = [
  { key: 'research', label: 'RESEARCH', color: '#a855f7' },
  { key: 'funding', label: 'FUNDING', color: '#00ff88' },
  { key: 'patents', label: 'PATENTS', color: '#ffd700' },
  { key: 'adoption', label: 'ADOPTION', color: '#00d4ff' },
  { key: 'conferences', label: 'CONFERENCES', color: '#f97316' },
];

const TREND_CONFIG: Record<
  OpportunityCluster['trend'],
  { label: string; color: string; pulse: boolean }
> = {
  accelerating: { label: 'ACCELERATING', color: '#00ff88', pulse: true },
  emerging: { label: 'EMERGING', color: '#00d4ff', pulse: false },
  stable: { label: 'STABLE', color: 'rgba(255,255,255,0.3)', pulse: false },
  cooling: { label: 'COOLING', color: '#ff3b30', pulse: false },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 80) return '#00ff88';
  if (score >= 60) return '#ffd700';
  return 'rgba(255,255,255,0.3)';
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'rgba(0,255,136,0.1)';
  if (score >= 60) return 'rgba(255,215,0,0.1)';
  return 'rgba(255,255,255,0.05)';
}

function getBarColor(score: number): string {
  if (score >= 80) return '#00ff88';
  if (score >= 60) return '#ffd700';
  return 'rgba(255,255,255,0.3)';
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  const [selected, setSelected] = useState<string>('autonomous-border');
  const [sortBy, setSortBy] = useState<'score' | 'trend'>('score');
  const [liveOpps, setLiveOpps] = useState<DiscoveredOpportunity[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/opportunities');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.ok) setLiveOpps(data.data.opportunities ?? []);
      } catch { /* degrade */ }
      finally { if (!cancelled) setLiveLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const trendOrder: Record<string, number> = {
    accelerating: 0,
    emerging: 1,
    stable: 2,
    cooling: 3,
  };

  const sorted = useMemo(() => {
    const list = [...OPPORTUNITY_CLUSTERS];
    if (sortBy === 'score') {
      list.sort((a, b) => b.score - a.score);
    } else {
      list.sort((a, b) => (trendOrder[a.trend] ?? 9) - (trendOrder[b.trend] ?? 9));
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  const selectedCluster = useMemo(
    () => OPPORTUNITY_CLUSTERS.find((c) => c.id === selected) ?? OPPORTUNITY_CLUSTERS[0],
    [selected],
  );

  return (
    <div className="bg-black min-h-screen font-mono animate-fade-up">
      {/* TOP BAR */}
      <PageTopBar
        backHref="/industries"
        backLabel="RADAR"
        breadcrumbs={[{ label: 'OPPORTUNITY RADAR' }]}
        rightSlot={
          <span className="font-mono text-[8px] tracking-[0.2em] text-white/30">
            {OPPORTUNITY_CLUSTERS.length} CLUSTERS
          </span>
        }
      />

      {/* HEADER */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="py-6 border-b border-white/[0.05]">
          <h1 className="text-[14px] tracking-[0.3em] text-white/60 uppercase leading-none">
            Opportunity Radar
          </h1>
          <p className="text-[10px] text-white/30 mt-1.5 tracking-wide max-w-2xl">
            Emerging technology markets with converging signals
          </p>
        </div>
      </div>

      {/* AI-DISCOVERED OPPORTUNITIES */}
      {(liveOpps.length > 0 || liveLoading) && (
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="border border-[#00ff88]/20 rounded-sm p-5 bg-[#00ff88]/[0.02]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" style={{ boxShadow: '0 0 6px #00ff88cc' }} />
                <span className="text-[9px] tracking-[0.2em] text-[#00ff88]/60 uppercase">AI-Discovered Opportunities</span>
              </div>
              <span className="text-[8px] text-white/20">{liveOpps.length} found</span>
            </div>
            {liveLoading ? (
              <div className="py-4 text-center">
                <span className="font-mono text-[9px] text-white/20 animate-pulse">Scanning signals...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {liveOpps.slice(0, 9).map((opp) => {
                  const typeColor =
                    opp.type === 'underserved_market' ? '#00ff88' :
                    opp.type === 'early_mover' ? '#00d4ff' :
                    opp.type === 'funding_surge' ? '#ffb800' :
                    opp.type === 'patent_gap' ? '#a855f7' :
                    opp.type === 'convergence_play' ? '#f97316' :
                    opp.type === 'policy_tailwind' ? '#00d4ff' :
                    opp.type === 'supply_chain_gap' ? '#ff3b30' :
                    opp.type === 'talent_arbitrage' ? '#ffd700' : '#ffffff';
                  return (
                    <div key={opp.id} className="border border-white/[0.06] rounded-sm p-3 bg-black/40 hover:border-white/[0.12] transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full" style={{ backgroundColor: typeColor }} />
                          <span className="font-mono text-[7px] tracking-[0.15em] uppercase" style={{ color: typeColor }}>{opp.type.replace(/_/g, ' ')}</span>
                        </div>
                        <span className="font-mono text-[11px] font-bold" style={{ color: typeColor }}>{opp.score}</span>
                      </div>
                      <p className="font-mono text-[9px] text-white/45 mb-1.5 line-clamp-2">{opp.title}</p>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[7px] text-white/20">{opp.timing.replace(/_/g, ' ')}</span>
                        <span className="font-mono text-[7px]" style={{ color: opp.risk_level === 'high' ? '#ff3b30' : opp.risk_level === 'medium' ? '#f97316' : '#00ff88' }}>{opp.risk_level}</span>
                        {opp.industries.length > 0 && (
                          <Link href={`/industry/${opp.industries[0]}`} className="font-mono text-[7px] text-[#00d4ff]/40 hover:text-[#00d4ff] transition-colors">
                            {opp.industries[0]}
                          </Link>
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

      {/* SIGNAL STRENGTH RADAR — horizontal bar chart */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="border border-white/[0.08] rounded-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[9px] tracking-[0.2em] text-white/30 uppercase">
              Signal Strength Radar
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortBy('score')}
                className="text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm border transition-colors"
                style={{
                  borderColor: sortBy === 'score' ? '#00d4ff40' : 'rgba(255,255,255,0.08)',
                  color: sortBy === 'score' ? '#00d4ff' : 'rgba(255,255,255,0.3)',
                  backgroundColor: sortBy === 'score' ? 'rgba(0,212,255,0.08)' : 'transparent',
                }}
              >
                BY SCORE
              </button>
              <button
                onClick={() => setSortBy('trend')}
                className="text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm border transition-colors"
                style={{
                  borderColor: sortBy === 'trend' ? '#00d4ff40' : 'rgba(255,255,255,0.08)',
                  color: sortBy === 'trend' ? '#00d4ff' : 'rgba(255,255,255,0.3)',
                  backgroundColor: sortBy === 'trend' ? 'rgba(0,212,255,0.08)' : 'transparent',
                }}
              >
                BY TREND
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {sorted.map((cluster) => {
              const barColor = getBarColor(cluster.score);
              const trendCfg = TREND_CONFIG[cluster.trend];
              const isSelected = selected === cluster.id;
              return (
                <button
                  key={cluster.id}
                  onClick={() => setSelected(cluster.id)}
                  className="w-full flex items-center gap-3 group transition-all"
                >
                  {/* Name */}
                  <span
                    className="text-[9px] tracking-wide text-right shrink-0 truncate transition-colors"
                    style={{
                      width: '180px',
                      color: isSelected ? '#00d4ff' : 'rgba(255,255,255,0.45)',
                    }}
                  >
                    {cluster.name}
                  </span>

                  {/* Bar */}
                  <div className="flex-1 h-[6px] bg-white/[0.04] rounded-sm overflow-hidden">
                    <div
                      className="h-full rounded-sm transition-all duration-500"
                      style={{
                        width: `${cluster.score}%`,
                        backgroundColor: barColor,
                        opacity: isSelected ? 1 : 0.6,
                        boxShadow: isSelected ? `0 0 8px ${barColor}60` : 'none',
                      }}
                    />
                  </div>

                  {/* Score */}
                  <span
                    className="text-[10px] tabular-nums shrink-0"
                    style={{ color: barColor, width: '24px', textAlign: 'right' }}
                  >
                    {cluster.score}
                  </span>

                  {/* Trend badge */}
                  <span
                    className={`text-[7px] tracking-[0.12em] uppercase shrink-0 px-1.5 py-0.5 rounded-sm border${trendCfg.pulse ? ' animate-pulse' : ''}`}
                    style={{
                      color: trendCfg.color,
                      borderColor: `${trendCfg.color}30`,
                      backgroundColor: `${trendCfg.color}10`,
                      width: '82px',
                      textAlign: 'center',
                    }}
                  >
                    {trendCfg.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MAIN GRID — 2 columns */}
      <div className="max-w-6xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT — OPPORTUNITY CARDS (3/5) */}
          <div className="lg:col-span-3 space-y-2 max-h-[800px] overflow-y-auto pr-1">
            <div className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-3">
              Opportunity Clusters
            </div>
            {sorted.map((cluster) => {
              const scoreColor = getScoreColor(cluster.score);
              const scoreBg = getScoreBg(cluster.score);
              const trendCfg = TREND_CONFIG[cluster.trend];
              const isSelected = selected === cluster.id;

              return (
                <button
                  key={cluster.id}
                  onClick={() => setSelected(cluster.id)}
                  className="w-full text-left border rounded-sm p-4 transition-all duration-200"
                  style={{
                    borderColor: isSelected ? '#00d4ff40' : 'rgba(255,255,255,0.08)',
                    backgroundColor: isSelected ? 'rgba(0,212,255,0.04)' : 'transparent',
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Score badge */}
                    <div
                      className="shrink-0 w-12 h-12 flex items-center justify-center rounded-sm"
                      style={{ backgroundColor: scoreBg }}
                    >
                      <span
                        className="text-[18px] font-bold tabular-nums"
                        style={{ color: scoreColor }}
                      >
                        {cluster.score}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Name + category */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[11px] tracking-wide uppercase truncate"
                            style={{ color: isSelected ? '#00d4ff' : 'rgba(255,255,255,0.7)' }}
                          >
                            {cluster.name}
                          </span>
                          <span
                            className={`text-[7px] tracking-[0.12em] uppercase shrink-0 px-1.5 py-0.5 rounded-sm border${trendCfg.pulse ? ' animate-pulse' : ''}`}
                            style={{
                              color: trendCfg.color,
                              borderColor: `${trendCfg.color}30`,
                              backgroundColor: `${trendCfg.color}10`,
                            }}
                          >
                            {trendCfg.label}
                          </span>
                        </div>
                        <div className="text-[8px] text-white/25 tracking-wide mt-0.5">
                          {cluster.category}
                        </div>
                      </div>

                      {/* 5 mini signal bars */}
                      <div className="space-y-1">
                        {SIGNAL_KEYS.map((sig) => (
                          <div key={sig.key} className="flex items-center gap-2">
                            <span className="text-[6px] tracking-[0.15em] text-white/20 uppercase w-16 shrink-0 text-right">
                              {sig.label}
                            </span>
                            <div className="flex-1 h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${cluster.signals[sig.key]}%`,
                                  backgroundColor: sig.color,
                                  opacity: 0.7,
                                }}
                              />
                            </div>
                            <span
                              className="text-[7px] tabular-nums shrink-0 w-6 text-right"
                              style={{ color: `${sig.color}99` }}
                            >
                              {cluster.signals[sig.key]}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Key players pills */}
                      <div className="flex flex-wrap gap-1">
                        {cluster.keyPlayers.slice(0, 3).map((p) => (
                          <span
                            key={p}
                            className="text-[7px] tracking-wide text-white/30 border border-white/[0.06] rounded-sm px-1.5 py-0.5"
                          >
                            {p}
                          </span>
                        ))}
                        {cluster.keyPlayers.length > 3 && (
                          <span className="text-[7px] text-white/15 px-1">
                            +{cluster.keyPlayers.length - 3}
                          </span>
                        )}
                      </div>

                      {/* El Paso relevance + TTM */}
                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-[7px] tracking-[0.12em] text-[#f97316]/60 uppercase">
                          EP RELEVANCE
                        </span>
                        <span className="text-[7px] text-white/20">|</span>
                        <span className="text-[7px] tracking-[0.12em] text-white/25 uppercase">
                          TTM: {cluster.timeToMarket}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* RIGHT — DETAIL PANEL (2/5, sticky) */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-14 space-y-4">
              <div className="text-[9px] tracking-[0.2em] text-white/30 uppercase">
                Cluster Detail
              </div>

              <div className="border border-white/[0.08] rounded-sm p-5 space-y-5">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div
                    className="shrink-0 w-14 h-14 flex items-center justify-center rounded-sm"
                    style={{ backgroundColor: getScoreBg(selectedCluster.score) }}
                  >
                    <span
                      className="text-[22px] font-bold tabular-nums"
                      style={{ color: getScoreColor(selectedCluster.score) }}
                    >
                      {selectedCluster.score}
                    </span>
                  </div>
                  <div>
                    <div
                      className="text-[13px] tracking-[0.2em] uppercase"
                      style={{ color: getScoreColor(selectedCluster.score) }}
                    >
                      {selectedCluster.name}
                    </div>
                    <div className="text-[9px] text-white/30 tracking-wide mt-0.5">
                      {selectedCluster.category}
                    </div>
                    <span
                      className={`inline-block mt-1 text-[7px] tracking-[0.12em] uppercase px-1.5 py-0.5 rounded-sm border${TREND_CONFIG[selectedCluster.trend].pulse ? ' animate-pulse' : ''}`}
                      style={{
                        color: TREND_CONFIG[selectedCluster.trend].color,
                        borderColor: `${TREND_CONFIG[selectedCluster.trend].color}30`,
                        backgroundColor: `${TREND_CONFIG[selectedCluster.trend].color}10`,
                      }}
                    >
                      {TREND_CONFIG[selectedCluster.trend].label}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[10px] text-white/40 leading-relaxed">
                  {selectedCluster.description}
                </p>

                {/* Signal breakdown */}
                <div className="space-y-2">
                  <div className="text-[8px] tracking-[0.2em] text-white/25 uppercase">
                    Signal Breakdown
                  </div>
                  {SIGNAL_KEYS.map((sig) => (
                    <div key={sig.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] tracking-[0.15em] text-white/35 uppercase">
                          {sig.label}
                        </span>
                        <span
                          className="text-[9px] tabular-nums"
                          style={{ color: sig.color }}
                        >
                          {selectedCluster.signals[sig.key]}%
                        </span>
                      </div>
                      <div className="h-[4px] bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${selectedCluster.signals[sig.key]}%`,
                            backgroundColor: sig.color,
                            boxShadow: `0 0 6px ${sig.color}40`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Related Technologies */}
                <div className="space-y-2 pt-2 border-t border-white/[0.05]">
                  <div className="text-[8px] tracking-[0.2em] text-white/25 uppercase">
                    Related Technologies
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCluster.relatedTechs.map((techId) => (
                      <Link
                        key={techId}
                        href={`/technology/${techId}`}
                        className="text-[8px] tracking-wide text-[#00d4ff]/60 border border-[#00d4ff]/20 rounded-sm px-2 py-1 hover:bg-[#00d4ff]/10 hover:text-[#00d4ff] transition-colors"
                      >
                        {techId.replace('tech-', '').replace(/-/g, ' ').toUpperCase()}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Key Players */}
                <div className="space-y-2 pt-2 border-t border-white/[0.05]">
                  <div className="text-[8px] tracking-[0.2em] text-white/25 uppercase">
                    Key Players
                  </div>
                  <div className="space-y-1">
                    {selectedCluster.keyPlayers.map((player) => (
                      <div
                        key={player}
                        className="flex items-center gap-2"
                      >
                        <span
                          className="w-1 h-1 rounded-full shrink-0"
                          style={{
                            backgroundColor: getScoreColor(selectedCluster.score),
                            boxShadow: `0 0 4px ${getScoreColor(selectedCluster.score)}88`,
                          }}
                        />
                        <span className="text-[9px] text-white/50 tracking-wide">
                          {player}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* El Paso Connection */}
                <div className="space-y-2 pt-2 border-t border-white/[0.05]">
                  <div className="text-[8px] tracking-[0.2em] text-[#f97316]/50 uppercase">
                    El Paso Connection
                  </div>
                  <p className="text-[9px] text-white/35 leading-relaxed">
                    {selectedCluster.elPasoRelevance}
                  </p>
                </div>

                {/* Time to Market */}
                <div className="flex items-center gap-3 pt-2 border-t border-white/[0.05]">
                  <span className="text-[8px] tracking-[0.2em] text-white/25 uppercase">
                    Time to Market
                  </span>
                  <span className="text-[10px] text-[#00d4ff] tabular-nums">
                    {selectedCluster.timeToMarket}
                  </span>
                </div>

                {/* CTA */}
                <Link
                  href={`/technology/${selectedCluster.relatedTechs[0] ?? ''}`}
                  className="block w-full text-center text-[9px] tracking-[0.2em] uppercase py-2.5 rounded-sm border border-[#00d4ff]/30 text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-colors"
                >
                  Explore Technologies
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
