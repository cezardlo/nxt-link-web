// @ts-nocheck
// src/lib/intelligence/sectors.ts
// NXT//LINK Complete Sector Taxonomy
// Covers all humanity-changing and operationally relevant sectors.

export interface Sector {
  id: string;
  label: string;
  emoji: string;
  color: string;
  description: string;
  humanity_impact: 'existential' | 'transformative' | 'significant';
  ep_relevance: number; // 0-100 El Paso relevance score
  ep_why: string;
  subsectors: string[];
}

export const SECTORS: Sector[] = [
  // ── Core Operational Sectors ───────────────────────────────────────────────
  {
    id: 'ai-ml',
    label: 'AI / ML',
    emoji: '🤖',
    color: '#0EA5E9',
    description: 'Artificial intelligence, machine learning, large language models, and autonomous systems reshaping every industry.',
    humanity_impact: 'transformative',
    ep_relevance: 75,
    ep_why: 'Fort Bliss AI/ML integration in ISR and logistics. UTEP CS research. Cross-border supply chain AI optimization.',
    subsectors: ['Large Language Models', 'Computer Vision', 'Autonomous Systems', 'AI Chips', 'Edge AI', 'AI Governance'],
  },
  {
    id: 'defense',
    label: 'Defense',
    emoji: '🛡️',
    color: '#EF4444',
    description: 'Military technology, defense contractors, national security systems, and dual-use technologies.',
    humanity_impact: 'significant',
    ep_relevance: 90,
    ep_why: 'Fort Bliss is the anchor. El Paso\'s largest employer. Billions in defense contracts awarded annually in the region.',
    subsectors: ['Electronic Warfare', 'Unmanned Systems', 'C4ISR', 'Directed Energy', 'Space Domain', 'Cyber Warfare'],
  },
  {
    id: 'cybersecurity',
    label: 'Cybersecurity',
    emoji: '🔐',
    color: '#8B5CF6',
    description: 'Network defense, zero-trust architecture, threat intelligence, and critical infrastructure protection.',
    humanity_impact: 'significant',
    ep_relevance: 60,
    ep_why: 'Fort Bliss cyber ops. Cross-border data flows. Port of Entry digital infrastructure critical to regional economy.',
    subsectors: ['Zero Trust', 'Threat Intelligence', 'OT/ICS Security', 'Cloud Security', 'Identity', 'Quantum-Safe Crypto'],
  },
  {
    id: 'logistics',
    label: 'Logistics',
    emoji: '🚚',
    color: '#F59E0B',
    description: 'Supply chain, freight, last-mile delivery, port operations, and connected transportation networks.',
    humanity_impact: 'significant',
    ep_relevance: 85,
    ep_why: 'El Paso–Juárez is a top US–Mexico trade corridor. BNSF, Union Pacific, and major 3PLs operate at scale here.',
    subsectors: ['Supply Chain Visibility', 'Autonomous Freight', 'Port Tech', 'Cold Chain', 'Drone Delivery', 'Customs Tech'],
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing',
    emoji: '🏭',
    color: '#6B7280',
    description: 'Advanced manufacturing, nearshoring, Industry 4.0, robotics, and additive manufacturing.',
    humanity_impact: 'significant',
    ep_relevance: 70,
    ep_why: 'Juárez is one of the largest manufacturing hubs in North America. Nearshoring wave creates massive opportunity.',
    subsectors: ['Robotics & Automation', 'Additive Manufacturing', 'Smart Factory', 'Semiconductor Fab', 'Nearshoring'],
  },
  {
    id: 'border-tech',
    label: 'Border Tech',
    emoji: '🌉',
    color: '#10B981',
    description: 'Port of entry technology, customs automation, immigration processing, and cross-border trade facilitation.',
    humanity_impact: 'significant',
    ep_relevance: 95,
    ep_why: 'El Paso–Juárez has the most active land port in the Western Hemisphere. CBP, ICE, and DHS are key stakeholders.',
    subsectors: ['Biometrics', 'Cargo Scanning', 'Trade Compliance', 'Traveler Processing', 'Surveillance', 'C-TPAT Tech'],
  },

  // ── Humanity-Changing Sectors ──────────────────────────────────────────────
  {
    id: 'renewable-energy',
    label: 'Renewable Energy',
    emoji: '☀️',
    color: '#F97316',
    description: 'Solar, wind, fusion, battery storage, green hydrogen, and the full-stack energy transition away from fossil fuels.',
    humanity_impact: 'transformative',
    ep_relevance: 55,
    ep_why: 'El Paso Electric is modernizing its grid. Fort Bliss has major energy resilience requirements. Massive desert solar potential and proximity to Permian Basin.',
    subsectors: ['Solar PV', 'Fusion Energy', 'Battery Storage', 'Green Hydrogen', 'Wind Energy', 'Geothermal', 'Grid Tech'],
  },
  {
    id: 'agriculture',
    label: 'Agriculture & Food',
    emoji: '🌾',
    color: '#84CC16',
    description: 'Precision agriculture, alternative proteins, vertical farming, water technology, and global food security systems.',
    humanity_impact: 'existential',
    ep_relevance: 60,
    ep_why: 'Border region faces acute water scarcity. Juárez and Chihuahua are major agricultural export zones. UTEP conducts desert agriculture research.',
    subsectors: ['Precision Ag', 'Vertical Farming', 'Alternative Protein', 'Water Tech', 'AgRobotics', 'CRISPR Crops'],
  },
  {
    id: 'life-sciences',
    label: 'Life Sciences',
    emoji: '🧬',
    color: '#EC4899',
    description: 'Gene editing, longevity research, mRNA platforms, immunotherapy, and the convergence of biology and computing.',
    humanity_impact: 'transformative',
    ep_relevance: 45,
    ep_why: 'UTEP biomedical research center. Texas Tech medical school in El Paso. Cross-border health services create unique research context.',
    subsectors: ['CRISPR Gene Editing', 'Longevity / Aging', 'mRNA Therapeutics', 'Immunotherapy', 'Microbiome', 'Protein Folding'],
  },
  {
    id: 'climate-tech',
    label: 'Climate Tech',
    emoji: '🌍',
    color: '#14B8A6',
    description: 'Carbon capture, ocean restoration, geoengineering, clean water technology, and climate adaptation systems.',
    humanity_impact: 'existential',
    ep_relevance: 50,
    ep_why: 'Chihuahuan Desert is a climate stress test environment. Rio Grande water rights are a growing crisis. UTEP has carbon capture research.',
    subsectors: ['Direct Air Capture', 'Ocean Tech', 'Geoengineering', 'Clean Water', 'Climate Adaptation', 'Blue Carbon'],
  },
  {
    id: 'quantum',
    label: 'Quantum',
    emoji: '⚛️',
    color: '#A78BFA',
    description: 'Quantum computing, quantum cryptography, quantum sensing, and the post-classical computation era.',
    humanity_impact: 'transformative',
    ep_relevance: 35,
    ep_why: 'Fort Bliss quantum-safe communications mandate. UTEP quantum computing research emerging. National security implications of post-quantum crypto.',
    subsectors: ['Quantum Computing', 'Post-Quantum Crypto', 'Quantum Sensing', 'Quantum Networks', 'Topological Qubits'],
  },
  {
    id: 'neural-tech',
    label: 'Neural Tech',
    emoji: '🧠',
    color: '#F472B6',
    description: 'Brain-computer interfaces, neural implants, cognitive enhancement, prosthetics, and human augmentation.',
    humanity_impact: 'transformative',
    ep_relevance: 30,
    ep_why: 'Fort Bliss soldier augmentation research. UTEP neuroscience programs. VA medical center with veteran neuro-rehabilitation needs.',
    subsectors: ['Brain-Computer Interface', 'Neural Implants', 'Cognitive Enhancement', 'Advanced Prosthetics', 'Neurostimulation'],
  },
  {
    id: 'synthetic-bio',
    label: 'Synthetic Biology',
    emoji: '🔬',
    color: '#34D399',
    description: 'Programmed organisms, biofoundries, DNA data storage, and the engineering of life itself.',
    humanity_impact: 'transformative',
    ep_relevance: 25,
    ep_why: 'Biomanufacturing nearshoring opportunity in Juárez corridor. UTEP biology research capabilities. Defense biotech applications at Fort Bliss.',
    subsectors: ['Programmed Cells', 'DNA Data Storage', 'Biofoundry', 'Synthetic Organisms', 'Carbon-Eating Microbes'],
  },
  {
    id: 'space',
    label: 'Space',
    emoji: '🚀',
    color: '#60A5FA',
    description: 'Commercial launch, lunar and Mars missions, satellite constellations, space manufacturing, and asteroid mining.',
    humanity_impact: 'transformative',
    ep_relevance: 65,
    ep_why: 'SpaceX Starbase is 45 minutes away. Fort Bliss manages Space Domain Awareness. El Paso is positioning itself in the emerging Space Valley corridor.',
    subsectors: ['Commercial Launch', 'Lunar / Mars', 'Space Manufacturing', 'Satellite Constellations', 'Space Mining', 'Space Tourism'],
  },
];

// ─── Derived exports ──────────────────────────────────────────────────────────

export const SECTOR_MAP: Record<string, Sector> = Object.fromEntries(
  SECTORS.map((s) => [s.id, s])
);

export const HUMANITY_CHANGING_SECTORS: string[] = SECTORS
  .filter((s) => s.humanity_impact === 'transformative' || s.humanity_impact === 'existential')
  .map((s) => s.id);

export const EXISTENTIAL_SECTORS: string[] = SECTORS
  .filter((s) => s.humanity_impact === 'existential')
  .map((s) => s.id);

export const HIGH_EP_RELEVANCE_SECTORS: string[] = SECTORS
  .filter((s) => s.ep_relevance >= 70)
  .sort((a, b) => b.ep_relevance - a.ep_relevance)
  .map((s) => s.id);

// New humanity-changing sectors only (not legacy core sectors)
export const NEW_EARTH_SECTORS = SECTORS.filter((s) =>
  ['renewable-energy', 'agriculture', 'life-sciences', 'climate-tech', 'quantum', 'neural-tech', 'synthetic-bio', 'space'].includes(s.id)
);
