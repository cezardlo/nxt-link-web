// ── Innovation Cycle Data ─────────────────────────────────────────────────────
// Lifecycle stages for technologies tracked by NXT//LINK

import { BATCH1_CYCLES } from './innovation-cycle-batch1';
import { BATCH2_CYCLES } from './innovation-cycle-batch2';
import { BATCH3_CYCLES } from './innovation-cycle-batch3';

export type InnovationStage =
  | 'discovery'
  | 'research'
  | 'development'
  | 'productization'
  | 'adoption'
  | 'impact';

export type StageDetail = {
  entities: string[];
  metrics?: Array<{ label: string; value: string; progress?: number }>;
  notes?: string;
};

export type TechInnovationCycle = {
  id: string;
  name: string;
  category: string;
  description: string;
  currentStage: InnovationStage;
  trend?: 'increasing' | 'stable' | 'decreasing';
  stages: Partial<Record<InnovationStage, StageDetail>>;
};

// ── Stage colors & labels ─────────────────────────────────────────────────────

const STAGE_COLORS: Record<InnovationStage, string> = {
  discovery: '#00d4ff',
  research: '#ffd700',
  development: '#f97316',
  productization: '#00ff88',
  adoption: '#a855f7',
  impact: '#ff3b30',
};

const STAGE_LABELS: Record<InnovationStage, string> = {
  discovery: 'Discovery',
  research: 'Research',
  development: 'Development',
  productization: 'Productization',
  adoption: 'Adoption',
  impact: 'Impact',
};

export function getStageColor(stage: InnovationStage): string {
  return STAGE_COLORS[stage] ?? '#6b7280';
}

export function getStageLabel(stage: InnovationStage): string {
  return STAGE_LABELS[stage] ?? stage;
}

// ── Technology Data ───────────────────────────────────────────────────────────

const CORE_INNOVATION_CYCLES: TechInnovationCycle[] = [
  {
    id: 'tech-computer-vision',
    name: 'Computer Vision',
    category: 'AI / ML',
    description:
      'Visual recognition and analysis systems for security, manufacturing QA, and border monitoring applications in El Paso.',
    currentStage: 'adoption',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['MIT CSAIL', 'Stanford Vision Lab', 'DARPA'],
        metrics: [
          { label: 'PAPERS PUBLISHED', value: '12,400+', progress: 92 },
          { label: 'INITIAL PATENTS', value: '340', progress: 68 },
        ],
        notes: 'Originated from neural network research in the 1980s; accelerated with deep learning breakthroughs post-2012.',
      },
      research: {
        entities: ['UTEP', 'Texas A&M', 'Sandia National Labs', 'Army Research Lab'],
        metrics: [
          { label: 'RESEARCH PROGRAMS', value: '28', progress: 74 },
          { label: 'COLLABORATIVE GRANTS', value: '$42M', progress: 56 },
        ],
        notes: 'Active research at UTEP on border surveillance CV applications.',
      },
      development: {
        entities: ['Cognizant', 'Palantir', 'Anduril Industries', 'Shield AI'],
        metrics: [
          { label: 'PROTOTYPES', value: '15', progress: 60 },
          { label: 'SEED FUNDING', value: '$180M', progress: 78 },
          { label: 'ENG TEAM SIZE', value: '2,400+', progress: 85 },
        ],
      },
      productization: {
        entities: ['Verkada', 'Flock Safety', 'Motorola Solutions'],
        metrics: [
          { label: 'PRODUCTS', value: '8', progress: 65 },
          { label: 'VENDORS', value: '12', progress: 55 },
        ],
      },
      adoption: {
        entities: ['CBP El Paso Sector', 'City of El Paso PD', 'Fort Bliss', 'EPISD'],
        metrics: [
          { label: 'DEPLOYMENTS', value: '14', progress: 48 },
          { label: 'PROCUREMENT SIGNALS', value: '23', progress: 72 },
        ],
        notes: 'Active CBP deployments along El Paso border sector.',
      },
      impact: {
        entities: ['DHS', 'El Paso County'],
        metrics: [
          { label: 'EFFICIENCY GAIN', value: '+34%', progress: 34 },
          { label: 'COST REDUCTION', value: '-18%', progress: 18 },
        ],
      },
    },
  },
  {
    id: 'tech-lidar',
    name: 'LiDAR Sensing',
    category: 'Defense / Border Tech',
    description:
      'Light detection and ranging technology for autonomous vehicles, surveying, and perimeter security.',
    currentStage: 'development',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['Hughes Aircraft', 'NASA', 'MIT Lincoln Lab'],
        metrics: [
          { label: 'FOUNDATIONAL PATENTS', value: '85', progress: 90 },
        ],
      },
      research: {
        entities: ['UTEP Mechanical Eng', 'Sandia Labs', 'NIST'],
        metrics: [
          { label: 'ACTIVE STUDIES', value: '12', progress: 45 },
        ],
      },
      development: {
        entities: ['Velodyne', 'Luminar', 'Ouster', 'Hesai'],
        metrics: [
          { label: 'PROTOTYPES', value: '9', progress: 55 },
          { label: 'SERIES A-C', value: '$620M', progress: 82 },
        ],
        notes: 'Rapid cost reduction making border deployment feasible.',
      },
    },
  },
  {
    id: 'tech-quantum-computing',
    name: 'Quantum Computing',
    category: 'AI / ML',
    description:
      'Quantum processors for cryptography, optimization, and simulation tasks relevant to defense and logistics.',
    currentStage: 'research',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['IBM Research', 'Google Quantum AI', 'DARPA'],
        metrics: [
          { label: 'QUBITS ACHIEVED', value: '1,121', progress: 45 },
        ],
      },
      research: {
        entities: ['Sandia National Labs', 'Los Alamos National Lab', 'UTEP Physics'],
        metrics: [
          { label: 'ACTIVE PROGRAMS', value: '6', progress: 35 },
          { label: 'PAPERS', value: '3,200+', progress: 62 },
        ],
        notes: 'Sandia exploring post-quantum cryptography for border comms.',
      },
    },
  },
  {
    id: 'tech-digital-twin',
    name: 'Digital Twin',
    category: 'Manufacturing',
    description:
      'Virtual replicas of physical systems for simulation, monitoring, and predictive maintenance.',
    currentStage: 'productization',
    trend: 'stable',
    stages: {
      discovery: {
        entities: ['NASA', 'GE Research', 'Siemens'],
        metrics: [
          { label: 'CONCEPT PAPERS', value: '450', progress: 78 },
        ],
      },
      development: {
        entities: ['Siemens', 'PTC', 'Dassault Systemes'],
        metrics: [
          { label: 'PLATFORMS', value: '5', progress: 70 },
        ],
      },
      productization: {
        entities: ['Siemens Xcelerator', 'Azure Digital Twins', 'AWS IoT TwinMaker'],
        metrics: [
          { label: 'PRODUCTS', value: '6', progress: 60 },
          { label: 'VENDORS', value: '8', progress: 50 },
        ],
        notes: 'Emerging use in El Paso manufacturing and water infrastructure.',
      },
    },
  },
  {
    id: 'tech-edge-ai',
    name: 'Edge AI',
    category: 'AI / ML',
    description:
      'On-device machine learning inference for low-latency applications at border checkpoints and remote sites.',
    currentStage: 'adoption',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['Google Brain', 'NVIDIA Research', 'Qualcomm AI'],
        metrics: [
          { label: 'INITIAL CHIPS', value: '4', progress: 80 },
        ],
      },
      development: {
        entities: ['NVIDIA', 'Intel', 'Qualcomm', 'Google'],
        metrics: [
          { label: 'EDGE DEVICES', value: '22', progress: 72 },
          { label: 'FUNDING', value: '$1.2B', progress: 88 },
        ],
      },
      adoption: {
        entities: ['CBP', 'Fort Bliss', 'El Paso Water Utilities'],
        metrics: [
          { label: 'DEPLOYMENTS', value: '7', progress: 35 },
          { label: 'PILOTS ACTIVE', value: '4', progress: 55 },
        ],
        notes: 'CBP deploying edge inference at Bridge of the Americas.',
      },
    },
  },
  {
    id: 'tech-autonomous-drones',
    name: 'Autonomous Drones',
    category: 'Defense / Border Tech',
    description:
      'Unmanned aerial systems with autonomous navigation for surveillance, delivery, and inspection.',
    currentStage: 'development',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['DARPA', 'MIT', 'Georgia Tech'],
        metrics: [
          { label: 'PATENTS', value: '520', progress: 75 },
        ],
      },
      development: {
        entities: ['Shield AI', 'Skydio', 'Anduril', 'AeroVironment'],
        metrics: [
          { label: 'PROTOTYPES', value: '18', progress: 65 },
          { label: 'DOD CONTRACTS', value: '$890M', progress: 78 },
        ],
        notes: 'Active testing at Fort Bliss and White Sands.',
      },
    },
  },
  {
    id: 'tech-5g-private',
    name: '5G Private Networks',
    category: 'Enterprise',
    description:
      'Dedicated 5G infrastructure for military bases, manufacturing, and smart city applications.',
    currentStage: 'productization',
    trend: 'stable',
    stages: {
      research: {
        entities: ['Ericsson Research', 'Nokia Bell Labs', 'Qualcomm'],
        metrics: [
          { label: 'STANDARDS', value: '3GPP R17', progress: 85 },
        ],
      },
      productization: {
        entities: ['Ericsson', 'Nokia', 'Celona', 'Druid Software'],
        metrics: [
          { label: 'PRODUCTS', value: '10', progress: 70 },
          { label: 'VENDORS', value: '6', progress: 55 },
        ],
        notes: 'Fort Bliss evaluating private 5G for base connectivity.',
      },
    },
  },
  {
    id: 'tech-blockchain-supply',
    name: 'Blockchain Supply Chain',
    category: 'Logistics',
    description:
      'Distributed ledger for cross-border trade verification, customs, and supply chain transparency.',
    currentStage: 'discovery',
    trend: 'stable',
    stages: {
      discovery: {
        entities: ['IBM Research', 'Maersk', 'Walmart Labs'],
        metrics: [
          { label: 'PILOT PROGRAMS', value: '3', progress: 25 },
          { label: 'WHITEPAPERS', value: '45', progress: 40 },
        ],
        notes: 'Early exploration for US-Mexico trade corridor applications.',
      },
    },
  },
  {
    id: 'tech-water-ai',
    name: 'AI Water Management',
    category: 'Energy / Utilities',
    description:
      'Machine learning for water distribution optimization, leak detection, and demand forecasting in arid regions.',
    currentStage: 'research',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['UTEP CEES', 'Sandia Hydrology', 'EPA'],
        metrics: [
          { label: 'PUBLICATIONS', value: '120', progress: 48 },
        ],
      },
      research: {
        entities: ['UTEP', 'El Paso Water Utilities', 'Texas Water Development Board'],
        metrics: [
          { label: 'ACTIVE GRANTS', value: '4', progress: 40 },
          { label: 'DATA SETS', value: '12', progress: 55 },
        ],
        notes: 'UTEP + EPWU collaborative study on desalination optimization.',
      },
    },
  },
  {
    id: 'tech-cybersecurity-mesh',
    name: 'Cybersecurity Mesh',
    category: 'Cybersecurity',
    description:
      'Distributed security architecture for protecting multi-cloud, edge, and hybrid environments.',
    currentStage: 'adoption',
    trend: 'increasing',
    stages: {
      development: {
        entities: ['Palo Alto Networks', 'CrowdStrike', 'Zscaler'],
        metrics: [
          { label: 'SOLUTIONS', value: '14', progress: 72 },
        ],
      },
      adoption: {
        entities: ['Fort Bliss IT', 'City of El Paso', 'UTEP'],
        metrics: [
          { label: 'DEPLOYMENTS', value: '5', progress: 42 },
          { label: 'BUDGET ALLOCATED', value: '$8.2M', progress: 60 },
        ],
        notes: 'Growing adoption across El Paso government and military.',
      },
    },
  },
  {
    id: 'tech-robotic-process',
    name: 'Robotic Process Automation',
    category: 'Enterprise',
    description:
      'Software bots automating repetitive tasks in government, logistics, and manufacturing workflows.',
    currentStage: 'impact',
    trend: 'stable',
    stages: {
      productization: {
        entities: ['UiPath', 'Automation Anywhere', 'Blue Prism'],
        metrics: [
          { label: 'PRODUCTS', value: '12', progress: 85 },
        ],
      },
      adoption: {
        entities: ['El Paso County', 'Fort Bliss Admin', 'YISD'],
        metrics: [
          { label: 'IMPLEMENTATIONS', value: '9', progress: 68 },
        ],
      },
      impact: {
        entities: ['El Paso County Gov', 'CBP Processing'],
        metrics: [
          { label: 'HOURS SAVED / MO', value: '2,400', progress: 72 },
          { label: 'COST SAVINGS', value: '$1.8M/yr', progress: 58 },
          { label: 'ERROR REDUCTION', value: '-62%', progress: 62 },
        ],
        notes: 'Mature technology delivering measurable ROI across El Paso organizations.',
      },
    },
  },
  {
    id: 'tech-satellite-iot',
    name: 'Satellite IoT',
    category: 'Defense / Border Tech',
    description:
      'Low-earth orbit satellite networks for remote sensor connectivity in border and desert environments.',
    currentStage: 'development',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['SpaceX', 'Amazon Kuiper', 'ESA'],
        metrics: [
          { label: 'CONSTELLATIONS', value: '4', progress: 50 },
        ],
      },
      development: {
        entities: ['Swarm (SpaceX)', 'Lacuna Space', 'Myriota'],
        metrics: [
          { label: 'DEVICES TESTED', value: '340', progress: 45 },
          { label: 'COVERAGE AREA', value: '78%', progress: 78 },
        ],
        notes: 'Potential for remote border sensor connectivity in West Texas.',
      },
    },
  },
];

// ── Merge all batches into single export ─────────────────────────────────────

export const INNOVATION_CYCLES: TechInnovationCycle[] = [
  ...CORE_INNOVATION_CYCLES,
  ...BATCH1_CYCLES,
  ...BATCH2_CYCLES,
  ...BATCH3_CYCLES,
];

// ── Lookup helpers ────────────────────────────────────────────────────────────

export function getInnovationCycle(
  id: string,
): TechInnovationCycle | undefined {
  return INNOVATION_CYCLES.find((c) => c.id === id);
}

export function getTechsByStage(
  stage: InnovationStage,
): TechInnovationCycle[] {
  return INNOVATION_CYCLES.filter((c) => c.currentStage === stage);
}

export function getAllInnovationCycles(): TechInnovationCycle[] {
  return INNOVATION_CYCLES;
}
