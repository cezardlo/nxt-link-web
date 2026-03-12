'use client';

import { useState, useMemo } from 'react';
import { PageTopBar } from '@/components/PageTopBar';
import { INDUSTRIES, type IndustryMeta } from '@/lib/data/technology-catalog';

// ── Types ────────────────────────────────────────────────────────────────────

type Severity = 'critical' | 'high' | 'moderate';
type TimeHorizon = 'immediate' | 'weeks' | 'months' | 'years';

interface RippleEffect {
  order: number;
  effect: string;
  industriesImpacted: string[];
  technologiesImpacted: string[];
  severity: number;
  timeHorizon: TimeHorizon;
}

interface Scenario {
  id: string;
  name: string;
  category: string;
  severity: Severity;
  description: string;
  trigger: string;
  ripples: RippleEffect[];
}

// ── Color Maps ───────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#ff3b30',
  high: '#f97316',
  moderate: '#ffd700',
};

const ORDER_COLORS: Record<number, string> = {
  1: '#ff3b30',
  2: '#f97316',
  3: '#ffd700',
};

const HORIZON_COLORS: Record<TimeHorizon, string> = {
  immediate: '#ff3b30',
  weeks: '#f97316',
  months: '#ffd700',
  years: 'rgba(255,255,255,0.3)',
};

// ── Scenarios ────────────────────────────────────────────────────────────────

const SCENARIOS: Scenario[] = [
  {
    id: 'rare-earth',
    name: 'Rare Earth Supply Disruption',
    category: 'SUPPLY CHAIN',
    severity: 'critical',
    description:
      'China restricts rare earth element exports, cutting global supply of neodymium, dysprosium, and other critical minerals by 60%.',
    trigger: 'China announces export ban on 17 rare earth elements effective immediately.',
    ripples: [
      {
        order: 1,
        effect:
          'EV battery and motor production halted across North America. Defense electronics face component shortages within 30 days.',
        industriesImpacted: ['Defense', 'Manufacturing', 'Energy'],
        technologiesImpacted: ['Battery Storage', 'Electric Vehicles', 'Directed Energy'],
        severity: 92,
        timeHorizon: 'immediate',
      },
      {
        order: 2,
        effect:
          'Consumer electronics prices surge 40%. Military procurement timelines extend 12-18 months. Renewable energy installations stall.',
        industriesImpacted: ['Defense', 'Energy', 'Manufacturing'],
        technologiesImpacted: ['Smart Grid', 'Utility Solar', 'Predictive Maintenance'],
        severity: 78,
        timeHorizon: 'weeks',
      },
      {
        order: 3,
        effect:
          'Domestic rare earth mining projects fast-tracked. El Paso becomes strategic logistics hub for alternative supply chains from Latin America.',
        industriesImpacted: ['Logistics', 'Manufacturing', 'Border Tech'],
        technologiesImpacted: ['Supply Chain Visibility', 'Cargo Scanning', 'Route Optimization'],
        severity: 55,
        timeHorizon: 'months',
      },
    ],
  },
  {
    id: 'semiconductor',
    name: 'Major Semiconductor Shortage',
    category: 'MANUFACTURING',
    severity: 'critical',
    description:
      'TSMC production halt due to geopolitical crisis in Taiwan. Global chip supply drops 55% overnight.',
    trigger: 'TSMC halts all fab operations. Lead times for advanced chips jump to 52+ weeks.',
    ripples: [
      {
        order: 1,
        effect:
          'Automotive, defense, and consumer electronics production stops. AI training hardware unavailable for new deployments.',
        industriesImpacted: ['AI/ML', 'Defense', 'Manufacturing'],
        technologiesImpacted: ['Generative AI', 'Edge Computing', 'Computer Vision'],
        severity: 98,
        timeHorizon: 'immediate',
      },
      {
        order: 2,
        effect:
          'Chip prices increase 300%. Legacy node chips hoarded. Black market emerges for military-grade semiconductors.',
        industriesImpacted: ['Cybersecurity', 'Healthcare', 'Energy'],
        technologiesImpacted: ['Medical Imaging AI', 'Smart Grid', 'Zero Trust'],
        severity: 85,
        timeHorizon: 'weeks',
      },
      {
        order: 3,
        effect:
          'CHIPS Act funding accelerated. Intel, Samsung fabs expanded. Chiplet architecture adoption surges as alternative.',
        industriesImpacted: ['Manufacturing', 'AI/ML', 'Defense'],
        technologiesImpacted: ['Digital Twins', 'Additive Manufacturing', 'Reinforcement Learning'],
        severity: 60,
        timeHorizon: 'months',
      },
      {
        order: 3,
        effect:
          'New domestic semiconductor ecosystem emerges. US chip independence timeline moves up 5 years.',
        industriesImpacted: ['Manufacturing', 'Defense'],
        technologiesImpacted: ['Predictive Maintenance', 'Autonomous Systems'],
        severity: 40,
        timeHorizon: 'years',
      },
    ],
  },
  {
    id: 'agi-breakthrough',
    name: 'AI Breakthrough — AGI-Level',
    category: 'AI / ML',
    severity: 'critical',
    description:
      'A major AI lab announces AGI-level capabilities. Costs for cognitive tasks drop 90% within months.',
    trigger:
      'AGI system demonstrated passing all professional exams, coding benchmarks, and scientific reasoning tests.',
    ripples: [
      {
        order: 1,
        effect:
          'Knowledge worker automation accelerates. Legal, accounting, and analyst roles see immediate displacement pressure.',
        industriesImpacted: ['AI/ML', 'Cybersecurity'],
        technologiesImpacted: ['Generative AI', 'Natural Language Processing (NLP)', 'Computer Vision'],
        severity: 95,
        timeHorizon: 'immediate',
      },
      {
        order: 2,
        effect:
          'Defense and intelligence agencies scramble to integrate AGI. Cybersecurity attack surface expands as AI-generated exploits proliferate.',
        industriesImpacted: ['Defense', 'Cybersecurity', 'Healthcare'],
        technologiesImpacted: ['Autonomous Systems', 'Zero Trust', 'Threat Intelligence'],
        severity: 88,
        timeHorizon: 'weeks',
      },
      {
        order: 3,
        effect:
          'Workforce retraining programs launched. El Paso bilingual AI services market explodes. New regulatory frameworks drafted.',
        industriesImpacted: ['Healthcare', 'Logistics', 'Border Tech'],
        technologiesImpacted: ['Telemedicine', 'Route Optimization', 'Biometrics'],
        severity: 65,
        timeHorizon: 'months',
      },
    ],
  },
  {
    id: 'red-sea-blockade',
    name: 'Red Sea Shipping Blockade',
    category: 'LOGISTICS',
    severity: 'high',
    description:
      'Prolonged military conflict blocks Red Sea shipping lanes. 30% of global container traffic rerouted around Africa.',
    trigger: 'All major shipping lines suspend Red Sea transits indefinitely.',
    ripples: [
      {
        order: 1,
        effect:
          'Shipping times Europe-Asia increase 10-14 days. Container rates surge 400%. Retail inventory gaps appear within weeks.',
        industriesImpacted: ['Logistics', 'Manufacturing'],
        technologiesImpacted: ['Supply Chain Visibility', 'Route Optimization', 'Fleet Management'],
        severity: 80,
        timeHorizon: 'immediate',
      },
      {
        order: 2,
        effect:
          'Nearshoring to Mexico accelerates. El Paso border crossings see 25% volume increase. Warehouse capacity in region maxed out.',
        industriesImpacted: ['Border Tech', 'Logistics', 'Manufacturing'],
        technologiesImpacted: ['Cargo Scanning', 'Warehouse Automation', 'RFID Tracking'],
        severity: 72,
        timeHorizon: 'weeks',
      },
      {
        order: 3,
        effect:
          'Permanent supply chain restructuring toward Western Hemisphere. New trade corridors established through US-Mexico border.',
        industriesImpacted: ['Border Tech', 'Logistics', 'Energy'],
        technologiesImpacted: ['Trade Compliance', 'Smart Grid', 'Digital Twins'],
        severity: 50,
        timeHorizon: 'months',
      },
    ],
  },
  {
    id: 'grid-attack',
    name: 'Cybersecurity Grid Attack',
    category: 'CYBERSECURITY',
    severity: 'critical',
    description:
      'Nation-state actor compromises SCADA systems across the US power grid. Rolling blackouts affect 15 states.',
    trigger: 'Coordinated cyberattack takes down 3 regional grid operators simultaneously.',
    ripples: [
      {
        order: 1,
        effect:
          'Hospitals, military bases, and data centers switch to backup power. Manufacturing plants shut down. Communication networks degraded.',
        industriesImpacted: ['Energy', 'Healthcare', 'Defense'],
        technologiesImpacted: ['Smart Grid', 'OT/ICS Security', 'Zero Trust'],
        severity: 96,
        timeHorizon: 'immediate',
      },
      {
        order: 2,
        effect:
          'Emergency OT security contracts issued. Fort Bliss activates cyber defense protocols. El Paso microgrid proposals fast-tracked.',
        industriesImpacted: ['Cybersecurity', 'Energy', 'Defense'],
        technologiesImpacted: ['Endpoint Detection', 'Microgrids', 'Threat Intelligence'],
        severity: 82,
        timeHorizon: 'weeks',
      },
      {
        order: 3,
        effect:
          'Federal mandate for zero-trust grid architecture. $50B infrastructure hardening program. Distributed energy systems surge.',
        industriesImpacted: ['Energy', 'Cybersecurity', 'Manufacturing'],
        technologiesImpacted: ['Battery Storage', 'Zero Trust', 'Predictive Maintenance'],
        severity: 58,
        timeHorizon: 'months',
      },
    ],
  },
  {
    id: 'border-shutdown',
    name: 'Border Trade Shutdown',
    category: 'BORDER TECH',
    severity: 'high',
    description:
      'US-Mexico border closed to all commercial traffic for 30 days. $1.7B daily trade flow halted.',
    trigger: 'Executive order suspends all commercial border crossings citing national security.',
    ripples: [
      {
        order: 1,
        effect:
          'El Paso maquiladora supply chains collapse. Auto parts, electronics, and food imports cease. 50,000+ jobs at risk locally.',
        industriesImpacted: ['Manufacturing', 'Logistics', 'Border Tech'],
        technologiesImpacted: ['Supply Chain Visibility', 'Cargo Scanning', 'RFID Tracking'],
        severity: 90,
        timeHorizon: 'immediate',
      },
      {
        order: 2,
        effect:
          'Alternative routing through Laredo and Nogales overwhelmed. Perishable goods spoil. Diplomatic tensions escalate.',
        industriesImpacted: ['Logistics', 'Healthcare', 'Energy'],
        technologiesImpacted: ['Route Optimization', 'Fleet Management', 'Telemedicine'],
        severity: 75,
        timeHorizon: 'weeks',
      },
      {
        order: 3,
        effect:
          'Automated trusted-trader systems proposed. Biometric cargo clearance programs funded. Cross-border digital infrastructure investment.',
        industriesImpacted: ['Border Tech', 'Cybersecurity', 'AI/ML'],
        technologiesImpacted: ['Biometrics', 'Computer Vision', 'Zero Trust'],
        severity: 45,
        timeHorizon: 'months',
      },
    ],
  },
  {
    id: 'quantum-breakthrough',
    name: 'Quantum Computing Breakthrough',
    category: 'CYBERSECURITY',
    severity: 'high',
    description:
      'Cryptographically relevant quantum computer demonstrated. RSA-2048 broken in under 4 hours.',
    trigger: 'Research lab publishes verified RSA-2048 factoring result using 4,000 logical qubits.',
    ripples: [
      {
        order: 1,
        effect:
          'Global financial systems at risk. Military communications vulnerable. Emergency migration to post-quantum cryptography begins.',
        industriesImpacted: ['Cybersecurity', 'Defense'],
        technologiesImpacted: ['Zero Trust', 'Threat Intelligence', 'Endpoint Detection'],
        severity: 94,
        timeHorizon: 'immediate',
      },
      {
        order: 2,
        effect:
          'Banks halt online transactions temporarily. Government classified networks go offline for crypto upgrades. VPN infrastructure obsolete.',
        industriesImpacted: ['Cybersecurity', 'Healthcare', 'Energy'],
        technologiesImpacted: ['OT/ICS Security', 'EHR Systems', 'Smart Grid'],
        severity: 80,
        timeHorizon: 'weeks',
      },
      {
        order: 3,
        effect:
          'Post-quantum cryptography industry booms. Quantum-safe hardware mandated for all federal systems. New attack/defense equilibrium forms.',
        industriesImpacted: ['Cybersecurity', 'Defense', 'AI/ML'],
        technologiesImpacted: ['Generative AI', 'Autonomous Systems', 'Zero Trust'],
        severity: 55,
        timeHorizon: 'months',
      },
      {
        order: 3,
        effect:
          'Quantum computing enables breakthroughs in drug discovery, materials science, and logistics optimization.',
        industriesImpacted: ['Healthcare', 'Manufacturing', 'Logistics'],
        technologiesImpacted: ['Medical Imaging AI', 'Digital Twins', 'Route Optimization'],
        severity: 35,
        timeHorizon: 'years',
      },
    ],
  },
  {
    id: 'energy-spike',
    name: 'Energy Price Spike',
    category: 'ENERGY',
    severity: 'moderate',
    description:
      'Oil hits $200/barrel due to OPEC+ supply cuts and Middle East conflict escalation. Natural gas prices triple.',
    trigger: 'Brent crude surpasses $200/barrel for the first time. US Strategic Petroleum Reserve at historic lows.',
    ripples: [
      {
        order: 1,
        effect:
          'Manufacturing and logistics costs explode. Airlines cut routes. Data center operating costs surge — AI training budgets slashed.',
        industriesImpacted: ['Manufacturing', 'Logistics', 'AI/ML'],
        technologiesImpacted: ['Predictive Maintenance', 'Route Optimization', 'Generative AI'],
        severity: 74,
        timeHorizon: 'immediate',
      },
      {
        order: 2,
        effect:
          'Renewable energy investment spikes. El Paso solar installations accelerate. Electric fleet adoption fast-tracked by logistics firms.',
        industriesImpacted: ['Energy', 'Logistics', 'Manufacturing'],
        technologiesImpacted: ['Utility Solar', 'Battery Storage', 'Smart Grid'],
        severity: 62,
        timeHorizon: 'weeks',
      },
      {
        order: 3,
        effect:
          'Energy independence becomes national priority. Microgrid deployments surge. El Paso positioned as solar energy export hub.',
        industriesImpacted: ['Energy', 'Border Tech', 'Defense'],
        technologiesImpacted: ['Microgrids', 'Smart Grid', 'Directed Energy'],
        severity: 45,
        timeHorizon: 'months',
      },
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getIndustryColor(label: string): string {
  const ind = INDUSTRIES.find(
    (i: IndustryMeta) =>
      i.label === label || i.category === label,
  );
  return ind?.color ?? '#6b7280';
}

function computeExposure(scenario: Scenario): Array<{ label: string; score: number }> {
  const map = new Map<string, number>();
  for (const ripple of scenario.ripples) {
    for (const ind of ripple.industriesImpacted) {
      const prev = map.get(ind) ?? 0;
      map.set(ind, prev + ripple.severity);
    }
  }
  return Array.from(map.entries() as Iterable<[string, number]>)
    .map(([label, total]) => ({ label, score: Math.min(100, Math.round(total / scenario.ripples.length)) }))
    .sort((a, b) => b.score - a.score);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SimulatePage() {
  const [selectedScenario, setSelectedScenario] = useState<string>('rare-earth');

  const scenario = useMemo(
    () => SCENARIOS.find((s) => s.id === selectedScenario) ?? SCENARIOS[0],
    [selectedScenario],
  );

  const exposure = useMemo(() => computeExposure(scenario), [scenario]);

  const maxExposure = useMemo(
    () => Math.max(...exposure.map((e) => e.score), 1),
    [exposure],
  );

  return (
    <div className="bg-black min-h-screen font-mono">
      {/* TOP BAR */}
      <PageTopBar
        backHref="/radar"
        backLabel="RADAR"
        breadcrumbs={[{ label: 'IMPACT SIMULATOR' }]}
        rightSlot={
          <span className="font-mono text-[8px] tracking-[0.2em] text-white/30">
            {SCENARIOS.length} SCENARIOS
          </span>
        }
      />

      {/* HEADER */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="py-6 border-b border-white/[0.05]">
          <h1 className="text-[14px] tracking-[0.3em] text-white/60 uppercase leading-none">
            Impact Simulator
          </h1>
          <p className="text-[10px] text-white/30 mt-1.5 tracking-wide max-w-2xl">
            Explore how disruptions cascade through industries and technologies
          </p>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── LEFT: SCENARIO SELECTOR (2/5 = 40%) ─────────────────────── */}
          <div className="lg:col-span-2 space-y-3">
            <div className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-2">
              SELECT SCENARIO
            </div>

            {SCENARIOS.map((s) => {
              const isActive = s.id === selectedScenario;
              const color = SEVERITY_COLORS[s.severity];
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedScenario(s.id)}
                  className="w-full text-left p-3 rounded-sm border transition-all duration-200"
                  style={{
                    borderColor: isActive ? `${color}60` : 'rgba(255,255,255,0.08)',
                    backgroundColor: isActive ? `${color}08` : 'transparent',
                    boxShadow: isActive ? `0 0 12px ${color}15` : 'none',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className="text-[10px] tracking-wide"
                      style={{ color: isActive ? color : 'rgba(255,255,255,0.55)' }}
                    >
                      {s.name}
                    </span>
                    <span
                      className="text-[7px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border shrink-0"
                      style={{
                        color,
                        borderColor: `${color}40`,
                        backgroundColor: `${color}10`,
                      }}
                    >
                      {s.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[8px] text-white/25 tracking-wide">
                    {s.category}
                  </div>
                  {isActive && (
                    <p className="text-[9px] text-white/35 leading-relaxed mt-2">
                      {s.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── RIGHT: RIPPLE VISUALIZATION (3/5 = 60%) ─────────────────── */}
          <div className="lg:col-span-3 space-y-6">

            {/* TRIGGER CARD */}
            <div
              className="border rounded-sm p-5 space-y-3"
              style={{
                borderColor: `${SEVERITY_COLORS[scenario.severity]}30`,
                backgroundColor: `${SEVERITY_COLORS[scenario.severity]}06`,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: SEVERITY_COLORS[scenario.severity],
                    boxShadow: `0 0 8px ${SEVERITY_COLORS[scenario.severity]}cc`,
                  }}
                />
                <span className="text-[9px] tracking-[0.2em] text-white/30 uppercase">
                  TRIGGER EVENT
                </span>
                <span
                  className="text-[7px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border ml-auto"
                  style={{
                    color: SEVERITY_COLORS[scenario.severity],
                    borderColor: `${SEVERITY_COLORS[scenario.severity]}40`,
                    backgroundColor: `${SEVERITY_COLORS[scenario.severity]}10`,
                  }}
                >
                  {scenario.severity.toUpperCase()}
                </span>
              </div>
              <div
                className="text-[12px] tracking-wider uppercase"
                style={{ color: SEVERITY_COLORS[scenario.severity] }}
              >
                {scenario.name}
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed">
                {scenario.trigger}
              </p>
            </div>

            {/* CASCADE CHAIN */}
            <div className="space-y-0">
              <div className="text-[9px] tracking-[0.2em] text-white/30 uppercase mb-4">
                CASCADE CHAIN
              </div>

              {scenario.ripples.map((ripple, idx) => {
                const orderColor = ORDER_COLORS[ripple.order] ?? '#ffd700';
                const horizonColor = HORIZON_COLORS[ripple.timeHorizon];
                const severityBarColor =
                  ripple.severity >= 80
                    ? '#ff3b30'
                    : ripple.severity >= 50
                      ? '#f97316'
                      : '#ffd700';

                return (
                  <div key={idx} className="flex gap-4">
                    {/* Vertical line connector */}
                    <div className="flex flex-col items-center w-6 shrink-0">
                      <div
                        className="w-3 h-3 rounded-full border-2 shrink-0"
                        style={{
                          borderColor: orderColor,
                          backgroundColor: `${orderColor}20`,
                          boxShadow: `0 0 6px ${orderColor}66`,
                        }}
                      />
                      {idx < scenario.ripples.length - 1 && (
                        <div
                          className="w-0 flex-1 border-l-2"
                          style={{ borderColor: `${orderColor}30` }}
                        />
                      )}
                    </div>

                    {/* Effect card */}
                    <div className="flex-1 border border-white/[0.08] rounded-sm p-4 mb-4 space-y-3">
                      {/* Order + time horizon */}
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[8px] tracking-[0.2em] uppercase font-bold"
                          style={{ color: orderColor }}
                        >
                          {ripple.order === 1
                            ? '1ST ORDER'
                            : ripple.order === 2
                              ? '2ND ORDER'
                              : '3RD ORDER'}
                        </span>
                        <span
                          className="text-[7px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border"
                          style={{
                            color: horizonColor,
                            borderColor: `${horizonColor}40`,
                            backgroundColor:
                              ripple.timeHorizon === 'years'
                                ? 'rgba(255,255,255,0.03)'
                                : `${horizonColor}10`,
                          }}
                        >
                          {ripple.timeHorizon.toUpperCase()}
                        </span>
                      </div>

                      {/* Effect description */}
                      <p className="text-[10px] text-white/50 leading-relaxed">
                        {ripple.effect}
                      </p>

                      {/* Industries */}
                      <div className="space-y-1.5">
                        <div className="text-[7px] tracking-[0.2em] text-white/20 uppercase">
                          INDUSTRIES IMPACTED
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {ripple.industriesImpacted.map((ind) => (
                            <span
                              key={ind}
                              className="text-[8px] px-1.5 py-0.5 rounded-sm border"
                              style={{
                                color: getIndustryColor(ind),
                                borderColor: 'rgba(255,255,255,0.1)',
                                backgroundColor: 'rgba(255,255,255,0.03)',
                              }}
                            >
                              {ind}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Technologies */}
                      <div className="space-y-1.5">
                        <div className="text-[7px] tracking-[0.2em] text-white/20 uppercase">
                          TECHNOLOGIES IMPACTED
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {ripple.technologiesImpacted.map((tech) => (
                            <span
                              key={tech}
                              className="text-[8px] px-1.5 py-0.5 rounded-sm bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff]"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Severity bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[7px] tracking-[0.2em] text-white/20 uppercase">
                            SEVERITY
                          </span>
                          <span
                            className="text-[9px] tabular-nums"
                            style={{ color: severityBarColor }}
                          >
                            {ripple.severity}
                          </span>
                        </div>
                        <div className="h-[3px] w-full bg-white/[0.05] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${ripple.severity}%`,
                              backgroundColor: severityBarColor,
                              boxShadow: `0 0 6px ${severityBarColor}60`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* EXPOSURE SUMMARY */}
            <div className="border border-white/[0.08] rounded-sm p-5 space-y-4">
              <div className="text-[9px] tracking-[0.2em] text-white/30 uppercase">
                EXPOSURE SUMMARY
              </div>
              <div className="space-y-2.5">
                {exposure.map((entry) => {
                  const color = getIndustryColor(entry.label);
                  return (
                    <div key={entry.label} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] tracking-wide" style={{ color }}>
                          {entry.label}
                        </span>
                        <span className="text-[9px] tabular-nums text-white/40">
                          {entry.score}
                        </span>
                      </div>
                      <div className="h-[3px] w-full bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(entry.score / maxExposure) * 100}%`,
                            backgroundColor: color,
                            boxShadow: `0 0 4px ${color}60`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
