// ── Universe Graph Data ─────────────────────────────────────────────────────
// Powers the Universe visualization page — a force-directed graph of the
// NXT//LINK intelligence ecosystem: industries, technologies, companies,
// research institutions, and conferences interconnected.

export type UniverseNodeType = 'industry' | 'technology' | 'company' | 'research' | 'conference' | 'product';

export type UniverseNode = {
  id: string;
  label: string;
  type: UniverseNodeType;
  category?: string;
  importance: number; // 0-100, determines node size
  trend: 'rising' | 'stable' | 'declining';
  description: string;
  color: string;
  metadata?: Record<string, string | number>;
};

export type UniverseEdge = {
  source: string;
  target: string;
  relationship: string; // 'contains' | 'uses' | 'researches' | 'builds' | 'showcases' | 'funds' | 'impacts' | 'operates_in'
  strength: number; // 0-1
};

export type UniverseGraphData = {
  nodes: UniverseNode[];
  edges: UniverseEdge[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// NODES
// ═══════════════════════════════════════════════════════════════════════════════

// ── Industry Nodes (8) ──────────────────────────────────────────────────────

const INDUSTRY_NODES: UniverseNode[] = [
  {
    id: 'ind-defense',
    label: 'Defense',
    type: 'industry',
    importance: 95,
    trend: 'rising',
    description: 'Military systems, C4ISR, electronic warfare, and force modernization programs anchored by Fort Bliss.',
    color: '#ff3b30',
    metadata: { fy25BudgetB: 886, elPasoPresence: 'Fort Bliss + 15 contractors' },
  },
  {
    id: 'ind-cybersecurity',
    label: 'Cybersecurity',
    type: 'industry',
    importance: 92,
    trend: 'rising',
    description: 'Zero trust architectures, threat intelligence, endpoint protection, and critical infrastructure security.',
    color: '#a855f7',
    metadata: { globalMarketB: 298, growthRate: '12.4%' },
  },
  {
    id: 'ind-manufacturing',
    label: 'Manufacturing',
    type: 'industry',
    importance: 85,
    trend: 'stable',
    description: 'Advanced manufacturing, digital twins, industrial IoT, and cross-border maquiladora supply chains.',
    color: '#6366f1',
    metadata: { elPasoJobs: 25000, crossBorderFactor: 'high' },
  },
  {
    id: 'ind-logistics',
    label: 'Logistics',
    type: 'industry',
    importance: 88,
    trend: 'rising',
    description: 'Supply chain management, cross-border trade, warehouse automation, and last-mile delivery optimization.',
    color: '#14b8a6',
    metadata: { annualCrossingsTrucks: 780000, ports: 3 },
  },
  {
    id: 'ind-energy',
    label: 'Energy',
    type: 'industry',
    importance: 82,
    trend: 'rising',
    description: 'Solar, grid modernization, battery storage, and hydrogen economy in the Sun Belt corridor.',
    color: '#22c55e',
    metadata: { solarPotentialGWh: 5800, elPasoElectricCustomers: 450000 },
  },
  {
    id: 'ind-healthcare',
    label: 'Healthcare',
    type: 'industry',
    importance: 80,
    trend: 'stable',
    description: 'Biotech, medical devices, telehealth, and bilingual health IT serving the border population.',
    color: '#ec4899',
    metadata: { borderPopulation: 2700000, bilingualDemand: 'critical' },
  },
  {
    id: 'ind-ai-ml',
    label: 'AI / ML',
    type: 'industry',
    importance: 95,
    trend: 'rising',
    description: 'Artificial intelligence and machine learning spanning computer vision, NLP, generative AI, and edge inference.',
    color: '#00d4ff',
    metadata: { globalMarketB: 620, growthRate: '36.6%' },
  },
  {
    id: 'ind-border-gov',
    label: 'Border / Gov',
    type: 'industry',
    importance: 90,
    trend: 'rising',
    description: 'Border security technology, CBP systems, biometric processing, and government modernization.',
    color: '#f97316',
    metadata: { cbpBudgetB: 19.7, portsOfEntry: 3 },
  },
];

// ── Technology Nodes (20) ───────────────────────────────────────────────────

const TECHNOLOGY_NODES: UniverseNode[] = [
  {
    id: 'tech-computer-vision',
    label: 'Computer Vision',
    type: 'technology',
    category: 'AI/ML',
    importance: 88,
    trend: 'rising',
    description: 'Automated image/video analysis: object detection, facial recognition, anomaly identification.',
    color: '#00d4ff',
    metadata: { maturity: 'mature', govBudgetM: 2800 },
  },
  {
    id: 'tech-zero-trust',
    label: 'Zero Trust Architecture',
    type: 'technology',
    category: 'Cybersecurity',
    importance: 85,
    trend: 'rising',
    description: 'Never-trust-always-verify security model mandated by federal executive order.',
    color: '#00d4ff',
    metadata: { maturity: 'growing', govBudgetM: 2100 },
  },
  {
    id: 'tech-digital-twin',
    label: 'Digital Twin',
    type: 'technology',
    category: 'Manufacturing',
    importance: 72,
    trend: 'rising',
    description: 'Virtual replicas of physical assets for simulation, monitoring, and predictive maintenance.',
    color: '#00d4ff',
    metadata: { maturity: 'growing', govBudgetM: 450 },
  },
  {
    id: 'tech-edge-ai',
    label: 'Edge AI',
    type: 'technology',
    category: 'AI/ML',
    importance: 80,
    trend: 'rising',
    description: 'AI inference at the point of action for DDIL environments and real-time processing.',
    color: '#00d4ff',
    metadata: { maturity: 'growing', govBudgetM: 920 },
  },
  {
    id: 'tech-autonomous-drones',
    label: 'Autonomous Drones',
    type: 'technology',
    category: 'Defense',
    importance: 82,
    trend: 'rising',
    description: 'UAS with autonomous navigation, swarm coordination, and ISR payload integration.',
    color: '#00d4ff',
    metadata: { maturity: 'growing', govBudgetM: 3400 },
  },
  {
    id: 'tech-quantum-computing',
    label: 'Quantum Computing',
    type: 'technology',
    category: 'AI/ML',
    importance: 65,
    trend: 'rising',
    description: 'Qubit-based computation for cryptography, optimization, and molecular simulation.',
    color: '#00d4ff',
    metadata: { maturity: 'emerging', govBudgetM: 1800 },
  },
  {
    id: 'tech-generative-ai',
    label: 'Generative AI',
    type: 'technology',
    category: 'AI/ML',
    importance: 90,
    trend: 'rising',
    description: 'LLMs, diffusion models, and multimodal AI for text, image, and code generation.',
    color: '#00d4ff',
    metadata: { maturity: 'growing', govBudgetM: 3200 },
  },
  {
    id: 'tech-5g-private',
    label: '5G / Private Networks',
    type: 'technology',
    category: 'Defense',
    importance: 68,
    trend: 'stable',
    description: 'Ultra-low-latency wireless for tactical comms, smart bases, and industrial IoT.',
    color: '#00d4ff',
    metadata: { maturity: 'growing', govBudgetM: 1400 },
  },
  {
    id: 'tech-lidar',
    label: 'LiDAR / 3D Sensing',
    type: 'technology',
    category: 'Defense',
    importance: 70,
    trend: 'stable',
    description: 'Laser-based spatial mapping for autonomous vehicles, border terrain analysis, and infrastructure survey.',
    color: '#00d4ff',
    metadata: { maturity: 'mature', govBudgetM: 680 },
  },
  {
    id: 'tech-blockchain',
    label: 'Blockchain / DLT',
    type: 'technology',
    category: 'Logistics',
    importance: 50,
    trend: 'declining',
    description: 'Distributed ledger technology for supply chain provenance and cross-border trade documentation.',
    color: '#00d4ff',
    metadata: { maturity: 'mature', govBudgetM: 120 },
  },
  {
    id: 'tech-robotic-process',
    label: 'Robotic Process Automation',
    type: 'technology',
    category: 'Manufacturing',
    importance: 60,
    trend: 'stable',
    description: 'Software bots automating repetitive tasks in government workflows and manufacturing lines.',
    color: '#00d4ff',
    metadata: { maturity: 'mature', govBudgetM: 340 },
  },
  {
    id: 'tech-satellite-eo',
    label: 'Satellite / Earth Observation',
    type: 'technology',
    category: 'Defense',
    importance: 75,
    trend: 'rising',
    description: 'Orbital sensing for wide-area surveillance, environmental monitoring, and border intelligence.',
    color: '#00d4ff',
    metadata: { maturity: 'mature', govBudgetM: 4200 },
  },
  {
    id: 'tech-biometrics',
    label: 'Biometrics',
    type: 'technology',
    category: 'Border Tech',
    importance: 78,
    trend: 'rising',
    description: 'Fingerprint, iris, and facial recognition for identity verification at ports of entry.',
    color: '#00d4ff',
    metadata: { maturity: 'mature', govBudgetM: 1600 },
  },
  {
    id: 'tech-nlp',
    label: 'Natural Language Processing',
    type: 'technology',
    category: 'AI/ML',
    importance: 82,
    trend: 'rising',
    description: 'AI understanding and generating human language — critical for bilingual border services.',
    color: '#00d4ff',
    metadata: { maturity: 'mature', govBudgetM: 1950 },
  },
  {
    id: 'tech-warehouse-automation',
    label: 'Warehouse Automation',
    type: 'technology',
    category: 'Logistics',
    importance: 68,
    trend: 'rising',
    description: 'AMRs, pick-and-place robots, and sortation systems for distribution centers.',
    color: '#00d4ff',
    metadata: { maturity: 'growing', govBudgetM: 280 },
  },
  {
    id: 'tech-grid-modernization',
    label: 'Grid Modernization',
    type: 'technology',
    category: 'Energy',
    importance: 72,
    trend: 'rising',
    description: 'Smart grid, SCADA upgrades, distributed energy resources, and microgrid controllers.',
    color: '#00d4ff',
    metadata: { maturity: 'growing', govBudgetM: 2400 },
  },
  {
    id: 'tech-telehealth',
    label: 'Telehealth / Remote Care',
    type: 'technology',
    category: 'Healthcare',
    importance: 65,
    trend: 'stable',
    description: 'Virtual clinical visits, remote patient monitoring, and mobile health platforms.',
    color: '#00d4ff',
    metadata: { maturity: 'mature', govBudgetM: 860 },
  },
  {
    id: 'tech-directed-energy',
    label: 'Directed Energy Weapons',
    type: 'technology',
    category: 'Defense',
    importance: 70,
    trend: 'rising',
    description: 'High-energy lasers and HPM systems for counter-UAS and missile defense.',
    color: '#00d4ff',
    metadata: { maturity: 'emerging', govBudgetM: 1100 },
  },
  {
    id: 'tech-battery-storage',
    label: 'Battery / Energy Storage',
    type: 'technology',
    category: 'Energy',
    importance: 74,
    trend: 'rising',
    description: 'Utility-scale lithium-ion, solid-state, and flow batteries for grid resilience.',
    color: '#00d4ff',
    metadata: { maturity: 'growing', govBudgetM: 1800 },
  },
  {
    id: 'tech-c4isr',
    label: 'C4ISR Systems',
    type: 'technology',
    category: 'Defense',
    importance: 86,
    trend: 'stable',
    description: 'Command, control, communications, computers, intelligence, surveillance, and reconnaissance integration.',
    color: '#00d4ff',
    metadata: { maturity: 'mature', govBudgetM: 5200 },
  },
];

// ── Company Nodes (25) ──────────────────────────────────────────────────────

const COMPANY_NODES: UniverseNode[] = [
  // Global defense / tech primes
  {
    id: 'co-l3harris',
    label: 'L3Harris',
    type: 'company',
    category: 'Defense',
    importance: 85,
    trend: 'rising',
    description: 'Defense electronics and C4ISR integrator with $240M Fort Bliss contract.',
    color: '#00ff88',
    metadata: { hq: 'Melbourne, FL', elPasoPresence: 'yes', ikerScore: 92 },
  },
  {
    id: 'co-raytheon',
    label: 'Raytheon (RTX)',
    type: 'company',
    category: 'Defense',
    importance: 85,
    trend: 'stable',
    description: 'Patriot missile systems and radar platforms at Fort Bliss.',
    color: '#00ff88',
    metadata: { hq: 'Arlington, VA', elPasoPresence: 'yes', ikerScore: 90 },
  },
  {
    id: 'co-palantir',
    label: 'Palantir',
    type: 'company',
    category: 'AI/ML',
    importance: 82,
    trend: 'rising',
    description: 'Data analytics and AI platform for defense and intelligence with AIP deployment.',
    color: '#00ff88',
    metadata: { hq: 'Denver, CO', elPasoPresence: 'indirect', ikerScore: 88 },
  },
  {
    id: 'co-anduril',
    label: 'Anduril',
    type: 'company',
    category: 'Defense',
    importance: 78,
    trend: 'rising',
    description: 'Autonomous systems, Lattice platform, and counter-UAS towers for border and base defense.',
    color: '#00ff88',
    metadata: { hq: 'Costa Mesa, CA', elPasoPresence: 'indirect', ikerScore: 84 },
  },
  {
    id: 'co-crowdstrike',
    label: 'CrowdStrike',
    type: 'company',
    category: 'Cybersecurity',
    importance: 76,
    trend: 'rising',
    description: 'Endpoint detection and response platform securing federal and DoD networks.',
    color: '#00ff88',
    metadata: { hq: 'Austin, TX' },
  },
  {
    id: 'co-siemens',
    label: 'Siemens',
    type: 'company',
    category: 'Manufacturing',
    importance: 74,
    trend: 'stable',
    description: 'Industrial automation, digital twin platforms, and smart infrastructure.',
    color: '#00ff88',
    metadata: { hq: 'Munich, Germany' },
  },
  {
    id: 'co-amazon',
    label: 'Amazon',
    type: 'company',
    category: 'Logistics',
    importance: 80,
    trend: 'rising',
    description: 'AWS cloud, warehouse automation, and logistics network with El Paso distribution centers.',
    color: '#00ff88',
    metadata: { hq: 'Seattle, WA', elPasoPresence: 'yes' },
  },
  {
    id: 'co-dhl',
    label: 'DHL',
    type: 'company',
    category: 'Logistics',
    importance: 65,
    trend: 'stable',
    description: 'Global logistics and cross-border freight with major El Paso hub.',
    color: '#00ff88',
    metadata: { hq: 'Bonn, Germany', elPasoPresence: 'yes' },
  },
  {
    id: 'co-tesla',
    label: 'Tesla',
    type: 'company',
    category: 'Energy',
    importance: 78,
    trend: 'rising',
    description: 'Electric vehicles, Megapack battery storage, and solar energy systems.',
    color: '#00ff88',
    metadata: { hq: 'Austin, TX', elPasoPresence: 'indirect' },
  },
  {
    id: 'co-nvidia',
    label: 'NVIDIA',
    type: 'company',
    category: 'AI/ML',
    importance: 84,
    trend: 'rising',
    description: 'GPU computing, AI training/inference hardware, and autonomous vehicle platforms.',
    color: '#00ff88',
    metadata: { hq: 'Santa Clara, CA' },
  },
  // El Paso local entities
  {
    id: 'co-fort-bliss',
    label: 'Fort Bliss',
    type: 'company',
    category: 'Defense',
    importance: 82,
    trend: 'stable',
    description: 'Largest CONUS Army installation — 1st Armored Division, air defense, and network modernization.',
    color: '#00ff88',
    metadata: { hq: 'El Paso, TX', elPasoPresence: 'yes', soldiers: 30000 },
  },
  {
    id: 'co-cbp-elpaso',
    label: 'CBP El Paso',
    type: 'company',
    category: 'Border Tech',
    importance: 80,
    trend: 'rising',
    description: 'Customs and Border Protection El Paso sector — biometrics, surveillance tech, and AI at ports of entry.',
    color: '#00ff88',
    metadata: { hq: 'El Paso, TX', elPasoPresence: 'yes' },
  },
  {
    id: 'co-utep',
    label: 'UTEP',
    type: 'company',
    category: 'AI/ML',
    importance: 70,
    trend: 'rising',
    description: 'University of Texas at El Paso — R1 research university, cybersecurity center, and border studies.',
    color: '#00ff88',
    metadata: { hq: 'El Paso, TX', elPasoPresence: 'yes', students: 25000 },
  },
  {
    id: 'co-ep-electric',
    label: 'El Paso Electric',
    type: 'company',
    category: 'Energy',
    importance: 62,
    trend: 'stable',
    description: 'Regional electric utility serving 450K customers, investing in solar and grid modernization.',
    color: '#00ff88',
    metadata: { hq: 'El Paso, TX', elPasoPresence: 'yes' },
  },
  {
    id: 'co-ep-water',
    label: 'EP Water Utilities',
    type: 'company',
    category: 'Energy',
    importance: 55,
    trend: 'stable',
    description: 'Municipal water utility pursuing SCADA modernization and IoT-based leak detection.',
    color: '#00ff88',
    metadata: { hq: 'El Paso, TX', elPasoPresence: 'yes' },
  },
  {
    id: 'co-lockheed',
    label: 'Lockheed Martin',
    type: 'company',
    category: 'Defense',
    importance: 84,
    trend: 'stable',
    description: 'Largest defense contractor — F-35, space systems, and hypersonic weapons programs.',
    color: '#00ff88',
    metadata: { hq: 'Bethesda, MD', elPasoPresence: 'indirect' },
  },
  {
    id: 'co-northrop',
    label: 'Northrop Grumman',
    type: 'company',
    category: 'Defense',
    importance: 80,
    trend: 'stable',
    description: 'B-21 bomber, autonomous systems, and space-based missile warning platforms.',
    color: '#00ff88',
    metadata: { hq: 'Falls Church, VA', elPasoPresence: 'indirect' },
  },
  {
    id: 'co-palo-alto',
    label: 'Palo Alto Networks',
    type: 'company',
    category: 'Cybersecurity',
    importance: 74,
    trend: 'rising',
    description: 'Next-gen firewalls, SASE, and AI-driven security operations.',
    color: '#00ff88',
    metadata: { hq: 'Santa Clara, CA' },
  },
  {
    id: 'co-saic',
    label: 'SAIC',
    type: 'company',
    category: 'Defense',
    importance: 72,
    trend: 'stable',
    description: 'IT modernization and mission support for Fort Bliss and Army networks.',
    color: '#00ff88',
    metadata: { hq: 'Reston, VA', elPasoPresence: 'yes', ikerScore: 85 },
  },
  {
    id: 'co-ups',
    label: 'UPS',
    type: 'company',
    category: 'Logistics',
    importance: 68,
    trend: 'stable',
    description: 'Package logistics and cross-border trade with El Paso sorting facility.',
    color: '#00ff88',
    metadata: { hq: 'Atlanta, GA', elPasoPresence: 'yes' },
  },
  {
    id: 'co-foxconn',
    label: 'Foxconn',
    type: 'company',
    category: 'Manufacturing',
    importance: 70,
    trend: 'stable',
    description: 'Electronics manufacturing with large Ciudad Juarez operations across the border.',
    color: '#00ff88',
    metadata: { hq: 'Taipei, Taiwan', elPasoPresence: 'juarez' },
  },
  {
    id: 'co-booz-allen',
    label: 'Booz Allen Hamilton',
    type: 'company',
    category: 'Defense',
    importance: 72,
    trend: 'rising',
    description: 'Digital and AI transformation for defense and intelligence agencies.',
    color: '#00ff88',
    metadata: { hq: 'McLean, VA', elPasoPresence: 'indirect' },
  },
  {
    id: 'co-general-dynamics',
    label: 'General Dynamics IT',
    type: 'company',
    category: 'Defense',
    importance: 70,
    trend: 'stable',
    description: 'Army IT enterprise services, cloud migration, and network operations.',
    color: '#00ff88',
    metadata: { hq: 'Falls Church, VA', elPasoPresence: 'yes' },
  },
  {
    id: 'co-ep-childrens',
    label: "EP Children's Hospital",
    type: 'company',
    category: 'Healthcare',
    importance: 52,
    trend: 'stable',
    description: 'Regional pediatric hospital investing in telehealth and bilingual health IT.',
    color: '#00ff88',
    metadata: { hq: 'El Paso, TX', elPasoPresence: 'yes' },
  },
  {
    id: 'co-leidos',
    label: 'Leidos',
    type: 'company',
    category: 'Defense',
    importance: 74,
    trend: 'stable',
    description: 'Defense IT, border security systems integration, and biometric solutions for DHS.',
    color: '#00ff88',
    metadata: { hq: 'Reston, VA', elPasoPresence: 'yes', ikerScore: 83 },
  },
];

// ── Research Nodes (10) ─────────────────────────────────────────────────────

const RESEARCH_NODES: UniverseNode[] = [
  {
    id: 'res-mit',
    label: 'MIT',
    type: 'research',
    importance: 80,
    trend: 'rising',
    description: 'MIT CSAIL and Lincoln Lab — foundational AI, quantum computing, and defense research.',
    color: '#ffd700',
  },
  {
    id: 'res-stanford',
    label: 'Stanford',
    type: 'research',
    importance: 78,
    trend: 'rising',
    description: 'Stanford HAI, Vision Lab, and AI research powering Silicon Valley innovation.',
    color: '#ffd700',
  },
  {
    id: 'res-darpa',
    label: 'DARPA',
    type: 'research',
    importance: 80,
    trend: 'rising',
    description: 'Defense Advanced Research Projects Agency — breakthrough defense technology programs.',
    color: '#ffd700',
    metadata: { budgetB: 4.1 },
  },
  {
    id: 'res-sandia',
    label: 'Sandia National Labs',
    type: 'research',
    importance: 75,
    trend: 'stable',
    description: 'National security lab — directed energy, microsystems, and border security R&D in New Mexico.',
    color: '#ffd700',
    metadata: { proximity: '265 mi from El Paso' },
  },
  {
    id: 'res-utep',
    label: 'UTEP Research',
    type: 'research',
    importance: 68,
    trend: 'rising',
    description: 'UTEP cyber range, border studies, additive manufacturing lab, and water desalination research.',
    color: '#ffd700',
    metadata: { researchExpenditureM: 110, elPasoPresence: 'yes' },
  },
  {
    id: 'res-cmu',
    label: 'Carnegie Mellon',
    type: 'research',
    importance: 76,
    trend: 'stable',
    description: 'CMU Robotics Institute and SEI — autonomous systems and software engineering research.',
    color: '#ffd700',
  },
  {
    id: 'res-georgia-tech',
    label: 'Georgia Tech',
    type: 'research',
    importance: 72,
    trend: 'stable',
    description: 'GTRI defense research, cybersecurity, and advanced manufacturing.',
    color: '#ffd700',
  },
  {
    id: 'res-los-alamos',
    label: 'Los Alamos National Lab',
    type: 'research',
    importance: 74,
    trend: 'stable',
    description: 'National security science — quantum information, high-performance computing, and threat reduction.',
    color: '#ffd700',
    metadata: { proximity: '280 mi from El Paso' },
  },
  {
    id: 'res-caltech-jpl',
    label: 'Caltech / JPL',
    type: 'research',
    importance: 74,
    trend: 'stable',
    description: 'Jet Propulsion Laboratory — satellite systems, computer vision, and autonomous navigation.',
    color: '#ffd700',
  },
  {
    id: 'res-white-sands',
    label: 'White Sands Missile Range',
    type: 'research',
    importance: 70,
    trend: 'stable',
    description: 'Army test range 60 mi north of El Paso — directed energy, missile defense, and EW testing.',
    color: '#ffd700',
    metadata: { proximity: '60 mi from El Paso', elPasoPresence: 'adjacent' },
  },
];

// ── Conference Nodes (8) ────────────────────────────────────────────────────

const CONFERENCE_NODES: UniverseNode[] = [
  {
    id: 'conf-ausa',
    label: 'AUSA',
    type: 'conference',
    importance: 72,
    trend: 'stable',
    description: 'Association of the United States Army Annual Meeting — largest land warfare expo.',
    color: '#f97316',
    metadata: { location: 'Washington, DC', attendees: 30000, month: 'October' },
  },
  {
    id: 'conf-rsa',
    label: 'RSA Conference',
    type: 'conference',
    importance: 70,
    trend: 'stable',
    description: 'Premier cybersecurity conference — zero trust, threat intel, and security innovation.',
    color: '#f97316',
    metadata: { location: 'San Francisco, CA', attendees: 45000, month: 'April' },
  },
  {
    id: 'conf-ces',
    label: 'CES',
    type: 'conference',
    importance: 75,
    trend: 'stable',
    description: 'Consumer Electronics Show — AI, autonomous vehicles, and emerging tech showcase.',
    color: '#f97316',
    metadata: { location: 'Las Vegas, NV', attendees: 130000, month: 'January' },
  },
  {
    id: 'conf-modex',
    label: 'MODEX',
    type: 'conference',
    importance: 55,
    trend: 'stable',
    description: 'Supply chain and manufacturing expo — warehouse automation and logistics tech.',
    color: '#f97316',
    metadata: { location: 'Atlanta, GA', attendees: 37000, month: 'March' },
  },
  {
    id: 'conf-himss',
    label: 'HIMSS',
    type: 'conference',
    importance: 60,
    trend: 'stable',
    description: 'Healthcare Information and Management Systems Society — health IT and digital health.',
    color: '#f97316',
    metadata: { location: 'Orlando, FL', attendees: 40000, month: 'March' },
  },
  {
    id: 'conf-gtc',
    label: 'GTC (NVIDIA)',
    type: 'conference',
    importance: 70,
    trend: 'rising',
    description: 'GPU Technology Conference — AI, deep learning, and accelerated computing.',
    color: '#f97316',
    metadata: { location: 'San Jose, CA', attendees: 20000, month: 'March' },
  },
  {
    id: 'conf-reinvent',
    label: 'AWS re:Invent',
    type: 'conference',
    importance: 68,
    trend: 'stable',
    description: 'Amazon Web Services annual conference — cloud, AI/ML services, and serverless.',
    color: '#f97316',
    metadata: { location: 'Las Vegas, NV', attendees: 60000, month: 'November' },
  },
  {
    id: 'conf-border-expo',
    label: 'Border Security Expo',
    type: 'conference',
    importance: 65,
    trend: 'rising',
    description: 'Border security technology showcase — surveillance, biometrics, and port-of-entry systems.',
    color: '#f97316',
    metadata: { location: 'San Antonio, TX', attendees: 5000, month: 'February' },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EDGES (115)
// ═══════════════════════════════════════════════════════════════════════════════

const UNIVERSE_EDGES: UniverseEdge[] = [

  // ── Industry -> Technology (contains) ───────────────────────────────────
  { source: 'ind-defense',       target: 'tech-computer-vision',      relationship: 'contains', strength: 0.85 },
  { source: 'ind-defense',       target: 'tech-autonomous-drones',    relationship: 'contains', strength: 0.95 },
  { source: 'ind-defense',       target: 'tech-c4isr',               relationship: 'contains', strength: 0.98 },
  { source: 'ind-defense',       target: 'tech-directed-energy',      relationship: 'contains', strength: 0.80 },
  { source: 'ind-defense',       target: 'tech-satellite-eo',         relationship: 'contains', strength: 0.88 },
  { source: 'ind-defense',       target: 'tech-5g-private',           relationship: 'contains', strength: 0.65 },
  { source: 'ind-defense',       target: 'tech-lidar',               relationship: 'contains', strength: 0.70 },
  { source: 'ind-cybersecurity', target: 'tech-zero-trust',           relationship: 'contains', strength: 0.95 },
  { source: 'ind-cybersecurity', target: 'tech-generative-ai',        relationship: 'contains', strength: 0.60 },
  { source: 'ind-manufacturing', target: 'tech-digital-twin',         relationship: 'contains', strength: 0.90 },
  { source: 'ind-manufacturing', target: 'tech-robotic-process',      relationship: 'contains', strength: 0.85 },
  { source: 'ind-logistics',     target: 'tech-warehouse-automation', relationship: 'contains', strength: 0.92 },
  { source: 'ind-logistics',     target: 'tech-blockchain',           relationship: 'contains', strength: 0.45 },
  { source: 'ind-energy',        target: 'tech-grid-modernization',   relationship: 'contains', strength: 0.95 },
  { source: 'ind-energy',        target: 'tech-battery-storage',      relationship: 'contains', strength: 0.90 },
  { source: 'ind-healthcare',    target: 'tech-telehealth',           relationship: 'contains', strength: 0.88 },
  { source: 'ind-healthcare',    target: 'tech-nlp',                  relationship: 'contains', strength: 0.65 },
  { source: 'ind-ai-ml',         target: 'tech-generative-ai',        relationship: 'contains', strength: 0.98 },
  { source: 'ind-ai-ml',         target: 'tech-edge-ai',              relationship: 'contains', strength: 0.90 },
  { source: 'ind-ai-ml',         target: 'tech-computer-vision',      relationship: 'contains', strength: 0.92 },
  { source: 'ind-ai-ml',         target: 'tech-nlp',                  relationship: 'contains', strength: 0.90 },
  { source: 'ind-ai-ml',         target: 'tech-quantum-computing',    relationship: 'contains', strength: 0.55 },
  { source: 'ind-border-gov',    target: 'tech-biometrics',           relationship: 'contains', strength: 0.95 },
  { source: 'ind-border-gov',    target: 'tech-computer-vision',      relationship: 'contains', strength: 0.85 },
  { source: 'ind-border-gov',    target: 'tech-autonomous-drones',    relationship: 'contains', strength: 0.75 },

  // ── Company -> Technology (uses / builds) ───────────────────────────────
  { source: 'co-palantir',        target: 'tech-computer-vision',      relationship: 'builds',  strength: 0.85 },
  { source: 'co-palantir',        target: 'tech-generative-ai',        relationship: 'builds',  strength: 0.90 },
  { source: 'co-palantir',        target: 'tech-nlp',                  relationship: 'builds',  strength: 0.80 },
  { source: 'co-crowdstrike',     target: 'tech-zero-trust',           relationship: 'builds',  strength: 0.90 },
  { source: 'co-crowdstrike',     target: 'tech-edge-ai',              relationship: 'uses',    strength: 0.65 },
  { source: 'co-palo-alto',       target: 'tech-zero-trust',           relationship: 'builds',  strength: 0.88 },
  { source: 'co-anduril',         target: 'tech-autonomous-drones',    relationship: 'builds',  strength: 0.95 },
  { source: 'co-anduril',         target: 'tech-computer-vision',      relationship: 'builds',  strength: 0.85 },
  { source: 'co-anduril',         target: 'tech-edge-ai',              relationship: 'uses',    strength: 0.80 },
  { source: 'co-l3harris',        target: 'tech-c4isr',               relationship: 'builds',  strength: 0.95 },
  { source: 'co-l3harris',        target: 'tech-satellite-eo',         relationship: 'builds',  strength: 0.80 },
  { source: 'co-l3harris',        target: 'tech-5g-private',           relationship: 'uses',    strength: 0.60 },
  { source: 'co-raytheon',        target: 'tech-directed-energy',      relationship: 'builds',  strength: 0.85 },
  { source: 'co-raytheon',        target: 'tech-c4isr',               relationship: 'builds',  strength: 0.80 },
  { source: 'co-raytheon',        target: 'tech-autonomous-drones',    relationship: 'uses',    strength: 0.70 },
  { source: 'co-nvidia',          target: 'tech-generative-ai',        relationship: 'builds',  strength: 0.95 },
  { source: 'co-nvidia',          target: 'tech-edge-ai',              relationship: 'builds',  strength: 0.90 },
  { source: 'co-nvidia',          target: 'tech-computer-vision',      relationship: 'builds',  strength: 0.88 },
  { source: 'co-nvidia',          target: 'tech-quantum-computing',    relationship: 'uses',    strength: 0.45 },
  { source: 'co-siemens',         target: 'tech-digital-twin',         relationship: 'builds',  strength: 0.92 },
  { source: 'co-siemens',         target: 'tech-robotic-process',      relationship: 'builds',  strength: 0.75 },
  { source: 'co-siemens',         target: 'tech-grid-modernization',   relationship: 'uses',    strength: 0.70 },
  { source: 'co-amazon',          target: 'tech-warehouse-automation', relationship: 'builds',  strength: 0.92 },
  { source: 'co-amazon',          target: 'tech-generative-ai',        relationship: 'builds',  strength: 0.85 },
  { source: 'co-amazon',          target: 'tech-edge-ai',              relationship: 'uses',    strength: 0.70 },
  { source: 'co-tesla',           target: 'tech-battery-storage',      relationship: 'builds',  strength: 0.95 },
  { source: 'co-tesla',           target: 'tech-computer-vision',      relationship: 'uses',    strength: 0.85 },
  { source: 'co-tesla',           target: 'tech-edge-ai',              relationship: 'uses',    strength: 0.80 },
  { source: 'co-dhl',             target: 'tech-warehouse-automation', relationship: 'uses',    strength: 0.75 },
  { source: 'co-dhl',             target: 'tech-blockchain',           relationship: 'uses',    strength: 0.40 },
  { source: 'co-ups',             target: 'tech-warehouse-automation', relationship: 'uses',    strength: 0.72 },
  { source: 'co-lockheed',        target: 'tech-autonomous-drones',    relationship: 'builds',  strength: 0.88 },
  { source: 'co-lockheed',        target: 'tech-satellite-eo',         relationship: 'builds',  strength: 0.90 },
  { source: 'co-lockheed',        target: 'tech-directed-energy',      relationship: 'builds',  strength: 0.78 },
  { source: 'co-lockheed',        target: 'tech-c4isr',               relationship: 'builds',  strength: 0.85 },
  { source: 'co-northrop',        target: 'tech-autonomous-drones',    relationship: 'builds',  strength: 0.85 },
  { source: 'co-northrop',        target: 'tech-c4isr',               relationship: 'builds',  strength: 0.82 },
  { source: 'co-northrop',        target: 'tech-satellite-eo',         relationship: 'builds',  strength: 0.88 },
  { source: 'co-cbp-elpaso',      target: 'tech-biometrics',           relationship: 'uses',    strength: 0.95 },
  { source: 'co-cbp-elpaso',      target: 'tech-computer-vision',      relationship: 'uses',    strength: 0.80 },
  { source: 'co-cbp-elpaso',      target: 'tech-autonomous-drones',    relationship: 'uses',    strength: 0.65 },
  { source: 'co-ep-electric',     target: 'tech-grid-modernization',   relationship: 'uses',    strength: 0.90 },
  { source: 'co-ep-electric',     target: 'tech-battery-storage',      relationship: 'uses',    strength: 0.70 },
  { source: 'co-ep-water',        target: 'tech-robotic-process',      relationship: 'uses',    strength: 0.45 },
  { source: 'co-foxconn',         target: 'tech-robotic-process',      relationship: 'uses',    strength: 0.85 },
  { source: 'co-foxconn',         target: 'tech-digital-twin',         relationship: 'uses',    strength: 0.60 },
  { source: 'co-saic',            target: 'tech-c4isr',               relationship: 'uses',    strength: 0.80 },
  { source: 'co-saic',            target: 'tech-zero-trust',           relationship: 'uses',    strength: 0.65 },
  { source: 'co-booz-allen',      target: 'tech-generative-ai',        relationship: 'uses',    strength: 0.75 },
  { source: 'co-booz-allen',      target: 'tech-zero-trust',           relationship: 'uses',    strength: 0.70 },
  { source: 'co-general-dynamics', target: 'tech-c4isr',              relationship: 'builds',  strength: 0.78 },
  { source: 'co-general-dynamics', target: 'tech-5g-private',         relationship: 'uses',    strength: 0.55 },
  { source: 'co-leidos',          target: 'tech-biometrics',           relationship: 'builds',  strength: 0.82 },
  { source: 'co-leidos',          target: 'tech-c4isr',               relationship: 'uses',    strength: 0.75 },
  { source: 'co-ep-childrens',    target: 'tech-telehealth',           relationship: 'uses',    strength: 0.70 },

  // ── Research -> Technology (researches / funds) ─────────────────────────
  { source: 'res-mit',            target: 'tech-quantum-computing',    relationship: 'researches', strength: 0.92 },
  { source: 'res-mit',            target: 'tech-generative-ai',        relationship: 'researches', strength: 0.88 },
  { source: 'res-mit',            target: 'tech-computer-vision',      relationship: 'researches', strength: 0.85 },
  { source: 'res-stanford',       target: 'tech-generative-ai',        relationship: 'researches', strength: 0.95 },
  { source: 'res-stanford',       target: 'tech-computer-vision',      relationship: 'researches', strength: 0.90 },
  { source: 'res-stanford',       target: 'tech-nlp',                  relationship: 'researches', strength: 0.92 },
  { source: 'res-darpa',          target: 'tech-autonomous-drones',    relationship: 'funds',      strength: 0.90 },
  { source: 'res-darpa',          target: 'tech-directed-energy',      relationship: 'funds',      strength: 0.85 },
  { source: 'res-darpa',          target: 'tech-edge-ai',              relationship: 'funds',      strength: 0.80 },
  { source: 'res-darpa',          target: 'tech-quantum-computing',    relationship: 'funds',      strength: 0.78 },
  { source: 'res-sandia',         target: 'tech-directed-energy',      relationship: 'researches', strength: 0.88 },
  { source: 'res-sandia',         target: 'tech-quantum-computing',    relationship: 'researches', strength: 0.72 },
  { source: 'res-sandia',         target: 'tech-biometrics',           relationship: 'researches', strength: 0.55 },
  { source: 'res-utep',           target: 'tech-computer-vision',      relationship: 'researches', strength: 0.65 },
  { source: 'res-utep',           target: 'tech-zero-trust',           relationship: 'researches', strength: 0.70 },
  { source: 'res-utep',           target: 'tech-biometrics',           relationship: 'researches', strength: 0.50 },
  { source: 'res-cmu',            target: 'tech-autonomous-drones',    relationship: 'researches', strength: 0.88 },
  { source: 'res-cmu',            target: 'tech-computer-vision',      relationship: 'researches', strength: 0.85 },
  { source: 'res-cmu',            target: 'tech-edge-ai',              relationship: 'researches', strength: 0.72 },
  { source: 'res-georgia-tech',   target: 'tech-zero-trust',           relationship: 'researches', strength: 0.78 },
  { source: 'res-georgia-tech',   target: 'tech-robotic-process',      relationship: 'researches', strength: 0.65 },
  { source: 'res-los-alamos',     target: 'tech-quantum-computing',    relationship: 'researches', strength: 0.90 },
  { source: 'res-los-alamos',     target: 'tech-directed-energy',      relationship: 'researches', strength: 0.75 },
  { source: 'res-caltech-jpl',    target: 'tech-satellite-eo',         relationship: 'researches', strength: 0.95 },
  { source: 'res-caltech-jpl',    target: 'tech-autonomous-drones',    relationship: 'researches', strength: 0.72 },
  { source: 'res-white-sands',    target: 'tech-directed-energy',      relationship: 'researches', strength: 0.92 },
  { source: 'res-white-sands',    target: 'tech-c4isr',               relationship: 'researches', strength: 0.70 },
  { source: 'res-white-sands',    target: 'tech-autonomous-drones',    relationship: 'researches', strength: 0.75 },

  // ── Conference -> Technology (showcases) ────────────────────────────────
  { source: 'conf-ausa',          target: 'tech-autonomous-drones',    relationship: 'showcases', strength: 0.90 },
  { source: 'conf-ausa',          target: 'tech-c4isr',               relationship: 'showcases', strength: 0.95 },
  { source: 'conf-ausa',          target: 'tech-directed-energy',      relationship: 'showcases', strength: 0.80 },
  { source: 'conf-rsa',           target: 'tech-zero-trust',           relationship: 'showcases', strength: 0.95 },
  { source: 'conf-rsa',           target: 'tech-generative-ai',        relationship: 'showcases', strength: 0.70 },
  { source: 'conf-ces',           target: 'tech-generative-ai',        relationship: 'showcases', strength: 0.88 },
  { source: 'conf-ces',           target: 'tech-edge-ai',              relationship: 'showcases', strength: 0.75 },
  { source: 'conf-ces',           target: 'tech-lidar',               relationship: 'showcases', strength: 0.72 },
  { source: 'conf-modex',         target: 'tech-warehouse-automation', relationship: 'showcases', strength: 0.95 },
  { source: 'conf-modex',         target: 'tech-robotic-process',      relationship: 'showcases', strength: 0.80 },
  { source: 'conf-himss',         target: 'tech-telehealth',           relationship: 'showcases', strength: 0.92 },
  { source: 'conf-himss',         target: 'tech-nlp',                  relationship: 'showcases', strength: 0.68 },
  { source: 'conf-gtc',           target: 'tech-generative-ai',        relationship: 'showcases', strength: 0.95 },
  { source: 'conf-gtc',           target: 'tech-computer-vision',      relationship: 'showcases', strength: 0.90 },
  { source: 'conf-gtc',           target: 'tech-edge-ai',              relationship: 'showcases', strength: 0.85 },
  { source: 'conf-gtc',           target: 'tech-quantum-computing',    relationship: 'showcases', strength: 0.60 },
  { source: 'conf-reinvent',      target: 'tech-generative-ai',        relationship: 'showcases', strength: 0.88 },
  { source: 'conf-reinvent',      target: 'tech-edge-ai',              relationship: 'showcases', strength: 0.72 },
  { source: 'conf-border-expo',   target: 'tech-biometrics',           relationship: 'showcases', strength: 0.95 },
  { source: 'conf-border-expo',   target: 'tech-autonomous-drones',    relationship: 'showcases', strength: 0.82 },
  { source: 'conf-border-expo',   target: 'tech-computer-vision',      relationship: 'showcases', strength: 0.78 },

  // ── Company -> Industry (operates_in) ──────────────────────────────────
  { source: 'co-l3harris',        target: 'ind-defense',       relationship: 'operates_in', strength: 0.95 },
  { source: 'co-raytheon',        target: 'ind-defense',       relationship: 'operates_in', strength: 0.95 },
  { source: 'co-palantir',        target: 'ind-defense',       relationship: 'operates_in', strength: 0.80 },
  { source: 'co-palantir',        target: 'ind-ai-ml',         relationship: 'operates_in', strength: 0.90 },
  { source: 'co-anduril',         target: 'ind-defense',       relationship: 'operates_in', strength: 0.92 },
  { source: 'co-anduril',         target: 'ind-border-gov',    relationship: 'operates_in', strength: 0.75 },
  { source: 'co-crowdstrike',     target: 'ind-cybersecurity', relationship: 'operates_in', strength: 0.95 },
  { source: 'co-palo-alto',       target: 'ind-cybersecurity', relationship: 'operates_in', strength: 0.95 },
  { source: 'co-siemens',         target: 'ind-manufacturing', relationship: 'operates_in', strength: 0.90 },
  { source: 'co-siemens',         target: 'ind-energy',        relationship: 'operates_in', strength: 0.70 },
  { source: 'co-amazon',          target: 'ind-logistics',     relationship: 'operates_in', strength: 0.90 },
  { source: 'co-amazon',          target: 'ind-ai-ml',         relationship: 'operates_in', strength: 0.80 },
  { source: 'co-dhl',             target: 'ind-logistics',     relationship: 'operates_in', strength: 0.95 },
  { source: 'co-ups',             target: 'ind-logistics',     relationship: 'operates_in', strength: 0.92 },
  { source: 'co-tesla',           target: 'ind-energy',        relationship: 'operates_in', strength: 0.85 },
  { source: 'co-tesla',           target: 'ind-manufacturing', relationship: 'operates_in', strength: 0.75 },
  { source: 'co-nvidia',          target: 'ind-ai-ml',         relationship: 'operates_in', strength: 0.95 },
  { source: 'co-fort-bliss',      target: 'ind-defense',       relationship: 'operates_in', strength: 0.98 },
  { source: 'co-cbp-elpaso',      target: 'ind-border-gov',    relationship: 'operates_in', strength: 0.98 },
  { source: 'co-utep',            target: 'ind-ai-ml',         relationship: 'operates_in', strength: 0.60 },
  { source: 'co-ep-electric',     target: 'ind-energy',        relationship: 'operates_in', strength: 0.95 },
  { source: 'co-ep-water',        target: 'ind-energy',        relationship: 'operates_in', strength: 0.60 },
  { source: 'co-lockheed',        target: 'ind-defense',       relationship: 'operates_in', strength: 0.95 },
  { source: 'co-northrop',        target: 'ind-defense',       relationship: 'operates_in', strength: 0.95 },
  { source: 'co-foxconn',         target: 'ind-manufacturing', relationship: 'operates_in', strength: 0.92 },
  { source: 'co-saic',            target: 'ind-defense',       relationship: 'operates_in', strength: 0.88 },
  { source: 'co-booz-allen',      target: 'ind-defense',       relationship: 'operates_in', strength: 0.85 },
  { source: 'co-booz-allen',      target: 'ind-cybersecurity', relationship: 'operates_in', strength: 0.70 },
  { source: 'co-general-dynamics', target: 'ind-defense',      relationship: 'operates_in', strength: 0.90 },
  { source: 'co-leidos',          target: 'ind-defense',       relationship: 'operates_in', strength: 0.85 },
  { source: 'co-leidos',          target: 'ind-border-gov',    relationship: 'operates_in', strength: 0.78 },
  { source: 'co-ep-childrens',    target: 'ind-healthcare',    relationship: 'operates_in', strength: 0.90 },

  // ── Cross-domain technology impacts ────────────────────────────────────
  { source: 'tech-generative-ai',     target: 'tech-nlp',                relationship: 'impacts', strength: 0.90 },
  { source: 'tech-edge-ai',           target: 'tech-autonomous-drones',  relationship: 'impacts', strength: 0.85 },
  { source: 'tech-computer-vision',   target: 'tech-biometrics',         relationship: 'impacts', strength: 0.78 },
  { source: 'tech-quantum-computing', target: 'tech-zero-trust',         relationship: 'impacts', strength: 0.70 },
  { source: 'tech-battery-storage',   target: 'tech-grid-modernization', relationship: 'impacts', strength: 0.82 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ASSEMBLED GRAPH
// ═══════════════════════════════════════════════════════════════════════════════

const ALL_NODES: UniverseNode[] = [
  ...INDUSTRY_NODES,
  ...TECHNOLOGY_NODES,
  ...COMPANY_NODES,
  ...RESEARCH_NODES,
  ...CONFERENCE_NODES,
];

export const UNIVERSE_GRAPH: UniverseGraphData = {
  nodes: ALL_NODES,
  edges: UNIVERSE_EDGES,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** Index for O(1) node lookups */
const nodeIndex = new Map<string, UniverseNode>();
for (const n of ALL_NODES) nodeIndex.set(n.id, n);

/** Return all nodes of a given type */
export function getNodesByType(type: UniverseNodeType): UniverseNode[] {
  return ALL_NODES.filter((n) => n.type === type);
}

/** Return nodes connected to a given node (one hop) with their relationship */
export function getConnectedNodes(nodeId: string): { node: UniverseNode; relationship: string }[] {
  const results: { node: UniverseNode; relationship: string }[] = [];
  for (const e of UNIVERSE_EDGES) {
    if (e.source === nodeId) {
      const n = nodeIndex.get(e.target);
      if (n) results.push({ node: n, relationship: e.relationship });
    } else if (e.target === nodeId) {
      const n = nodeIndex.get(e.source);
      if (n) results.push({ node: n, relationship: e.relationship });
    }
  }
  return results;
}

/** Extract a sub-graph centered on a node up to `depth` hops (default 1) */
export function getSubgraph(centerNodeId: string, depth = 1): UniverseGraphData {
  const visited = new Set<string>();
  const frontier = [centerNodeId];
  visited.add(centerNodeId);

  for (let d = 0; d < depth; d++) {
    const nextFrontier: string[] = [];
    for (const nid of frontier) {
      for (const e of UNIVERSE_EDGES) {
        const neighbor = e.source === nid ? e.target : e.target === nid ? e.source : null;
        if (neighbor && !visited.has(neighbor)) {
          visited.add(neighbor);
          nextFrontier.push(neighbor);
        }
      }
    }
    frontier.length = 0;
    frontier.push(...nextFrontier);
  }

  const subNodes = ALL_NODES.filter((n) => visited.has(n.id));
  const subEdges = UNIVERSE_EDGES.filter((e) => visited.has(e.source) && visited.has(e.target));
  return { nodes: subNodes, edges: subEdges };
}

/** Fuzzy search nodes by label or description (case-insensitive substring) */
export function searchNodes(query: string): UniverseNode[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return ALL_NODES.filter(
    (n) => n.label.toLowerCase().includes(q) || n.description.toLowerCase().includes(q),
  );
}
