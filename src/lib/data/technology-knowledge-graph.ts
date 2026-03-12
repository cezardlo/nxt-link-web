// Technology knowledge graph data — innovation ecosystem nodes for each tracked technology
// Used by KnowledgeGraph.tsx to render force-directed entity maps

export type KnowledgeEntityType =
  | 'university'
  | 'lab'
  | 'company'
  | 'research-institute'
  | 'government-lab'
  | 'startup'
  | 'enterprise'
  | 'defense-contractor'
  | 'military';

/** Layer keys used by KnowledgeGraph.tsx to iterate node arrays */
export type KnowledgeLayerKey = 'discoveredBy' | 'studiedBy' | 'builtBy' | 'usedBy';

export type KnowledgeEntity = {
  name: string;
  type: KnowledgeEntityType;
  country?: string;
};

export type TechKnowledgeNode = {
  techId: string;
  discoveredBy: KnowledgeEntity[];
  studiedBy: KnowledgeEntity[];
  builtBy: KnowledgeEntity[];
  usedBy: KnowledgeEntity[];
  applications: string[];
  relatedTechIds: string[];
};

// ═════════════════════════════════════════════════════════════════════════════
// Complete Knowledge Graph — all 46 technologies from the technology catalog
// ═════════════════════════════════════════════════════════════════════════════

export const TECH_KNOWLEDGE_GRAPH: Record<string, TechKnowledgeNode> = {

  // ── AI / ML (7) ────────────────────────────────────────────────────────────

  'tech-computer-vision': {
    techId: 'tech-computer-vision',
    discoveredBy: [
      { name: 'MIT CSAIL', type: 'university', country: 'US' },
      { name: 'Stanford Vision Lab', type: 'university', country: 'US' },
      { name: 'Bell Labs (Yann LeCun)', type: 'lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'UC Berkeley BAIR', type: 'university', country: 'US' },
      { name: 'UTEP Computer Science', type: 'university', country: 'US' },
      { name: 'Carnegie Mellon Robotics Institute', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'NVIDIA', type: 'enterprise', country: 'US' },
      { name: 'Palantir', type: 'enterprise', country: 'US' },
      { name: 'Axon Enterprise', type: 'enterprise', country: 'US' },
      { name: 'Motorola Solutions', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'U.S. CBP El Paso Sector', type: 'military', country: 'US' },
      { name: 'Fort Bliss', type: 'military', country: 'US' },
      { name: 'El Paso Police Department', type: 'military', country: 'US' },
    ],
    applications: [
      'Border surveillance and intrusion detection',
      'License plate recognition at ports of entry',
      'Manufacturing quality inspection in maquiladoras',
      'Fort Bliss perimeter security monitoring',
      'El Paso ISD campus safety systems',
    ],
    relatedTechIds: ['tech-nlp', 'tech-edge-ai', 'tech-isr', 'tech-surveillance-systems'],
  },

  'tech-nlp': {
    techId: 'tech-nlp',
    discoveredBy: [
      { name: 'OpenAI', type: 'lab', country: 'US' },
      { name: 'Google Brain', type: 'lab', country: 'US' },
      { name: 'University of Montreal (Yoshua Bengio)', type: 'university', country: 'CA' },
    ],
    studiedBy: [
      { name: 'Stanford NLP Group', type: 'university', country: 'US' },
      { name: 'Allen Institute for AI', type: 'research-institute', country: 'US' },
      { name: 'UTEP Computational Linguistics', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'OpenAI', type: 'enterprise', country: 'US' },
      { name: 'Anthropic', type: 'enterprise', country: 'US' },
      { name: 'Microsoft Research', type: 'enterprise', country: 'US' },
      { name: 'IBM Research', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'U.S. CBP', type: 'military', country: 'US' },
      { name: 'City of El Paso', type: 'enterprise', country: 'US' },
      { name: 'El Paso ISD', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'Bilingual government service chatbots (English/Spanish)',
      'CBP document processing and translation',
      'Intelligence report summarization',
      'Clinical NLP for Spanish-English health records at WBAMC',
      'Court transcript analysis for El Paso County',
    ],
    relatedTechIds: ['tech-generative-ai', 'tech-computer-vision', 'tech-anomaly-detection'],
  },

  'tech-reinforcement-learning': {
    techId: 'tech-reinforcement-learning',
    discoveredBy: [
      { name: 'University of Alberta (Richard Sutton)', type: 'university', country: 'CA' },
      { name: 'UMass Amherst (Andrew Barto)', type: 'university', country: 'US' },
      { name: 'DARPA', type: 'government-lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'Google DeepMind', type: 'lab', country: 'UK' },
      { name: 'Berkeley RL Lab', type: 'university', country: 'US' },
      { name: 'MIT CSAIL', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'Google DeepMind', type: 'enterprise', country: 'UK' },
      { name: 'Shield AI', type: 'defense-contractor', country: 'US' },
      { name: 'AeroVironment', type: 'defense-contractor', country: 'US' },
    ],
    usedBy: [
      { name: 'U.S. DoD', type: 'military', country: 'US' },
      { name: 'Fort Bliss', type: 'military', country: 'US' },
      { name: 'Army Futures Command', type: 'military', country: 'US' },
    ],
    applications: [
      'Autonomous drone navigation in GPS-denied border terrain',
      'Adaptive logistics routing for Fort Bliss supply convoys',
      'Robotic manipulation in UTEP engineering labs',
      'Counter-UAS autonomous intercept planning',
    ],
    relatedTechIds: ['tech-autonomous-systems', 'tech-edge-ai', 'tech-generative-ai'],
  },

  'tech-generative-ai': {
    techId: 'tech-generative-ai',
    discoveredBy: [
      { name: 'OpenAI', type: 'lab', country: 'US' },
      { name: 'Google Brain', type: 'lab', country: 'US' },
      { name: 'Anthropic', type: 'lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'Stanford HAI', type: 'university', country: 'US' },
      { name: 'MIT CSAIL', type: 'university', country: 'US' },
      { name: 'UTEP Data Science', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'OpenAI', type: 'enterprise', country: 'US' },
      { name: 'Anthropic', type: 'enterprise', country: 'US' },
      { name: 'Palantir (AIP)', type: 'enterprise', country: 'US' },
      { name: 'Scale AI', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'U.S. DoD CDAO', type: 'military', country: 'US' },
      { name: 'Fort Bliss G2 Intelligence', type: 'military', country: 'US' },
      { name: 'City of El Paso IT', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'Defense decision support via Palantir AIP at Fort Bliss',
      'Automated intelligence report generation',
      'Synthetic training data for border surveillance models',
      'Government service delivery chatbots for El Paso residents',
      'Code generation for Army software modernization',
    ],
    relatedTechIds: ['tech-nlp', 'tech-mlops', 'tech-edge-ai', 'tech-anomaly-detection'],
  },

  'tech-mlops': {
    techId: 'tech-mlops',
    discoveredBy: [
      { name: 'Google (TFX Team)', type: 'enterprise', country: 'US' },
      { name: 'Stanford MLSys', type: 'university', country: 'US' },
      { name: 'Uber (Michelangelo Team)', type: 'enterprise', country: 'US' },
    ],
    studiedBy: [
      { name: 'Carnegie Mellon SE Institute', type: 'university', country: 'US' },
      { name: 'MIT CSAIL', type: 'university', country: 'US' },
      { name: 'UTEP Computer Science', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'Databricks', type: 'enterprise', country: 'US' },
      { name: 'Weights & Biases', type: 'startup', country: 'US' },
      { name: 'MLflow / Linux Foundation', type: 'enterprise', country: 'US' },
      { name: 'Palantir Foundry', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'U.S. DoD CDAO', type: 'military', country: 'US' },
      { name: 'Army AI Integration Center', type: 'military', country: 'US' },
      { name: 'DHS S&T', type: 'military', country: 'US' },
    ],
    applications: [
      'Responsible AI governance for Army ML models',
      'Model versioning and drift detection for CBP analytics',
      'CI/CD pipelines for defense AI applications',
      'Fort Bliss AI model lifecycle management',
    ],
    relatedTechIds: ['tech-generative-ai', 'tech-devsecops', 'tech-edge-ai'],
  },

  'tech-edge-ai': {
    techId: 'tech-edge-ai',
    discoveredBy: [
      { name: 'DARPA', type: 'government-lab', country: 'US' },
      { name: 'MIT Lincoln Laboratory', type: 'government-lab', country: 'US' },
      { name: 'NVIDIA Research', type: 'lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'Georgia Tech', type: 'university', country: 'US' },
      { name: 'UTEP ECE Department', type: 'university', country: 'US' },
      { name: 'Army Research Laboratory', type: 'government-lab', country: 'US' },
    ],
    builtBy: [
      { name: 'NVIDIA (Jetson)', type: 'enterprise', country: 'US' },
      { name: 'Qualcomm', type: 'enterprise', country: 'US' },
      { name: 'Anduril Industries', type: 'defense-contractor', country: 'US' },
      { name: 'L3Harris', type: 'defense-contractor', country: 'US' },
    ],
    usedBy: [
      { name: 'Fort Bliss DDIL Operations', type: 'military', country: 'US' },
      { name: 'U.S. CBP Remote Stations', type: 'military', country: 'US' },
      { name: 'Army Tactical Units', type: 'military', country: 'US' },
    ],
    applications: [
      'Tactical AI inference in DDIL environments at Fort Bliss',
      'Real-time threat detection at remote border checkpoints',
      'On-device NLP for field intelligence reports',
      'Edge-processed drone video for border patrol',
      'Vehicle-mounted AI for convoy protection',
    ],
    relatedTechIds: ['tech-computer-vision', 'tech-autonomous-systems', 'tech-c4isr', 'tech-edge-computing'],
  },

  'tech-anomaly-detection': {
    techId: 'tech-anomaly-detection',
    discoveredBy: [
      { name: 'MIT Lincoln Laboratory', type: 'government-lab', country: 'US' },
      { name: 'Carnegie Mellon CyLab', type: 'university', country: 'US' },
      { name: 'Stanford AI Lab', type: 'university', country: 'US' },
    ],
    studiedBy: [
      { name: 'MITRE Corporation', type: 'research-institute', country: 'US' },
      { name: 'Sandia National Laboratories', type: 'government-lab', country: 'US' },
      { name: 'UTEP Data Science', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'Splunk', type: 'enterprise', country: 'US' },
      { name: 'Darktrace', type: 'enterprise', country: 'UK' },
      { name: 'Palantir', type: 'enterprise', country: 'US' },
      { name: 'Recorded Future', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'U.S. CBP Fraud Detection', type: 'military', country: 'US' },
      { name: 'Fort Bliss Cyber Operations', type: 'military', country: 'US' },
      { name: 'El Paso Electric', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'Cargo manifest fraud detection at El Paso ports of entry',
      'Insider threat detection on Army networks',
      'Grid anomaly detection for El Paso Electric',
      'Financial transaction monitoring for cross-border trade',
      'Network intrusion detection at Fort Bliss',
    ],
    relatedTechIds: ['tech-siem', 'tech-threat-intel', 'tech-nlp', 'tech-zero-trust'],
  },

  // ── Cybersecurity (6) ──────────────────────────────────────────────────────

  'tech-zero-trust': {
    techId: 'tech-zero-trust',
    discoveredBy: [
      { name: 'Forrester Research (John Kindervag)', type: 'research-institute', country: 'US' },
      { name: 'NIST', type: 'government-lab', country: 'US' },
      { name: 'Google BeyondCorp Team', type: 'enterprise', country: 'US' },
    ],
    studiedBy: [
      { name: 'SANS Institute', type: 'research-institute', country: 'US' },
      { name: 'CISA', type: 'government-lab', country: 'US' },
      { name: 'MITRE Corporation', type: 'research-institute', country: 'US' },
    ],
    builtBy: [
      { name: 'Zscaler', type: 'enterprise', country: 'US' },
      { name: 'Palo Alto Networks', type: 'enterprise', country: 'US' },
      { name: 'CrowdStrike', type: 'enterprise', country: 'US' },
      { name: 'Okta', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'U.S. DoD', type: 'military', country: 'US' },
      { name: 'Fort Bliss G6', type: 'military', country: 'US' },
      { name: 'El Paso Electric', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'DoD FY27 zero trust mandate implementation at Fort Bliss',
      'CBP network microsegmentation at El Paso ports',
      'Identity-based access for El Paso city systems',
      'Secure remote access for Fort Bliss teleworkers',
    ],
    relatedTechIds: ['tech-siem', 'tech-edr', 'tech-devsecops', 'tech-ics-ot-security'],
  },

  'tech-siem': {
    techId: 'tech-siem',
    discoveredBy: [
      { name: 'Gartner (coined SIEM term)', type: 'research-institute', country: 'US' },
      { name: 'ArcSight founders', type: 'startup', country: 'US' },
      { name: 'MITRE Corporation', type: 'research-institute', country: 'US' },
    ],
    studiedBy: [
      { name: 'SANS Institute', type: 'research-institute', country: 'US' },
      { name: 'Carnegie Mellon SEI', type: 'university', country: 'US' },
      { name: 'UTEP Cybersecurity Program', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'Splunk', type: 'enterprise', country: 'US' },
      { name: 'Microsoft (Sentinel)', type: 'enterprise', country: 'US' },
      { name: 'IBM (QRadar)', type: 'enterprise', country: 'US' },
      { name: 'Elastic Security', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'Fort Bliss Network Operations', type: 'military', country: 'US' },
      { name: 'ARCYBER', type: 'military', country: 'US' },
      { name: 'El Paso County IT', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'Security event correlation across Fort Bliss NIPR/SIPR',
      'SOC monitoring for CBP El Paso Sector networks',
      'Compliance logging for El Paso city infrastructure',
      'Threat hunting across Army garrison systems',
    ],
    relatedTechIds: ['tech-zero-trust', 'tech-edr', 'tech-threat-intel', 'tech-anomaly-detection'],
  },

  'tech-edr': {
    techId: 'tech-edr',
    discoveredBy: [
      { name: 'Gartner (coined EDR term)', type: 'research-institute', country: 'US' },
      { name: 'Carbon Black founders', type: 'startup', country: 'US' },
      { name: 'CrowdStrike founders', type: 'startup', country: 'US' },
    ],
    studiedBy: [
      { name: 'MITRE ATT&CK Team', type: 'research-institute', country: 'US' },
      { name: 'SANS Institute', type: 'research-institute', country: 'US' },
      { name: 'CISA', type: 'government-lab', country: 'US' },
    ],
    builtBy: [
      { name: 'CrowdStrike', type: 'enterprise', country: 'US' },
      { name: 'SentinelOne', type: 'enterprise', country: 'US' },
      { name: 'Microsoft Defender', type: 'enterprise', country: 'US' },
      { name: 'Tanium', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'DISA (HBSS replacement)', type: 'military', country: 'US' },
      { name: 'Fort Bliss IT', type: 'military', country: 'US' },
      { name: 'El Paso Electric', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'Endpoint protection across Fort Bliss workstations',
      'Ransomware prevention for El Paso city government',
      'Malware detection on CBP field devices',
      'Advanced persistent threat hunting on Army networks',
    ],
    relatedTechIds: ['tech-siem', 'tech-zero-trust', 'tech-threat-intel'],
  },

  'tech-threat-intel': {
    techId: 'tech-threat-intel',
    discoveredBy: [
      { name: 'Mandiant (Kevin Mandia)', type: 'startup', country: 'US' },
      { name: 'MITRE Corporation', type: 'research-institute', country: 'US' },
      { name: 'NSA Threat Operations Center', type: 'government-lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'Carnegie Mellon CERT/CC', type: 'university', country: 'US' },
      { name: 'SANS ISC', type: 'research-institute', country: 'US' },
      { name: 'UTEP Cybersecurity Center', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'Recorded Future', type: 'enterprise', country: 'US' },
      { name: 'CrowdStrike', type: 'enterprise', country: 'US' },
      { name: 'Mandiant (Google)', type: 'enterprise', country: 'US' },
      { name: 'Anomali', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'ARCYBER', type: 'military', country: 'US' },
      { name: 'CBP Cyber Division', type: 'military', country: 'US' },
      { name: 'El Paso Electric SOC', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'Threat feed integration for Fort Bliss network defense',
      'IOC sharing across DHS El Paso-area critical infrastructure',
      'Adversary TTP tracking for CBP cyber operations',
      'Critical infrastructure threat monitoring for El Paso utilities',
    ],
    relatedTechIds: ['tech-siem', 'tech-edr', 'tech-anomaly-detection', 'tech-zero-trust'],
  },

  'tech-ics-ot-security': {
    techId: 'tech-ics-ot-security',
    discoveredBy: [
      { name: 'Idaho National Laboratory', type: 'government-lab', country: 'US' },
      { name: 'Sandia National Laboratories', type: 'government-lab', country: 'US' },
      { name: 'CISA ICS-CERT', type: 'government-lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'Purdue University (Purdue Model)', type: 'university', country: 'US' },
      { name: 'SANS ICS', type: 'research-institute', country: 'US' },
      { name: 'UTEP Electrical Engineering', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'Dragos', type: 'enterprise', country: 'US' },
      { name: 'Claroty', type: 'enterprise', country: 'US' },
      { name: 'Nozomi Networks', type: 'enterprise', country: 'US' },
      { name: 'Fortinet', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'El Paso Electric', type: 'enterprise', country: 'US' },
      { name: 'El Paso Water Utilities', type: 'enterprise', country: 'US' },
      { name: 'Fort Bliss Installation Control Systems', type: 'military', country: 'US' },
    ],
    applications: [
      'SCADA security for El Paso Electric grid',
      'Water treatment plant OT monitoring',
      'Fort Bliss facility control system hardening',
      'El Paso natural gas pipeline security',
    ],
    relatedTechIds: ['tech-smart-grid', 'tech-zero-trust', 'tech-siem', 'tech-grid-ai'],
  },

  'tech-devsecops': {
    techId: 'tech-devsecops',
    discoveredBy: [
      { name: 'U.S. Air Force Kessel Run', type: 'military', country: 'US' },
      { name: 'DoD Platform One', type: 'military', country: 'US' },
      { name: 'NIST (SP 800-218)', type: 'government-lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'Carnegie Mellon SEI', type: 'university', country: 'US' },
      { name: 'MITRE Corporation', type: 'research-institute', country: 'US' },
      { name: 'UTEP Software Engineering', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'GitLab', type: 'enterprise', country: 'US' },
      { name: 'Anchore', type: 'enterprise', country: 'US' },
      { name: 'Sonatype', type: 'enterprise', country: 'US' },
      { name: 'Synopsys', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'Army Software Factory', type: 'military', country: 'US' },
      { name: 'Fort Bliss IT Programs', type: 'military', country: 'US' },
      { name: 'DHS USCIS', type: 'military', country: 'US' },
    ],
    applications: [
      'IL4/IL5 secure development environments for Army programs',
      'Automated container scanning for DoD software',
      'SBOM generation for Fort Bliss procurement',
      'Secure CI/CD pipelines for CBP applications',
    ],
    relatedTechIds: ['tech-zero-trust', 'tech-mlops', 'tech-siem'],
  },

  // ── Defense (6) ────────────────────────────────────────────────────────────

  'tech-isr': {
    techId: 'tech-isr',
    discoveredBy: [
      { name: 'DARPA', type: 'government-lab', country: 'US' },
      { name: 'NRO (National Reconnaissance Office)', type: 'government-lab', country: 'US' },
      { name: 'MIT Lincoln Laboratory', type: 'government-lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'RAND Corporation', type: 'research-institute', country: 'US' },
      { name: 'Johns Hopkins APL', type: 'research-institute', country: 'US' },
      { name: 'NMSU Physical Science Lab', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'L3Harris', type: 'defense-contractor', country: 'US' },
      { name: 'Northrop Grumman', type: 'defense-contractor', country: 'US' },
      { name: 'Leidos', type: 'defense-contractor', country: 'US' },
      { name: 'General Atomics', type: 'defense-contractor', country: 'US' },
    ],
    usedBy: [
      { name: 'Fort Bliss 1AD', type: 'military', country: 'US' },
      { name: 'U.S. CBP Air and Marine', type: 'military', country: 'US' },
      { name: 'U.S. SOCOM', type: 'military', country: 'US' },
    ],
    applications: [
      'Predator/Reaper ISR operations from Fort Bliss',
      'CBP Air and Marine border surveillance flights',
      'Multi-INT fusion for border threat assessment',
      'Training range ISR exercises at McGregor Range',
      'SIGINT collection along the US-Mexico border',
    ],
    relatedTechIds: ['tech-computer-vision', 'tech-electronic-warfare', 'tech-c4isr', 'tech-autonomous-systems'],
  },

  'tech-electronic-warfare': {
    techId: 'tech-electronic-warfare',
    discoveredBy: [
      { name: 'Naval Research Laboratory', type: 'government-lab', country: 'US' },
      { name: 'Army Research Laboratory', type: 'government-lab', country: 'US' },
      { name: 'DARPA', type: 'government-lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'Georgia Tech Research Institute', type: 'university', country: 'US' },
      { name: 'MITRE Corporation', type: 'research-institute', country: 'US' },
      { name: 'NMSU Klipsch School of EE', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'L3Harris', type: 'defense-contractor', country: 'US' },
      { name: 'BAE Systems', type: 'defense-contractor', country: 'UK' },
      { name: 'Northrop Grumman', type: 'defense-contractor', country: 'US' },
      { name: 'Raytheon', type: 'defense-contractor', country: 'US' },
    ],
    usedBy: [
      { name: 'Fort Bliss 915th Cyber Warfare Bn', type: 'military', country: 'US' },
      { name: 'U.S. Army CEMA', type: 'military', country: 'US' },
      { name: 'White Sands Missile Range', type: 'military', country: 'US' },
    ],
    applications: [
      'EW training exercises at Fort Bliss/McGregor Range',
      'Counter-drone jamming for border security',
      'Spectrum management for El Paso military operations',
      'Direction-finding operations along the border corridor',
    ],
    relatedTechIds: ['tech-isr', 'tech-c4isr', 'tech-directed-energy', 'tech-autonomous-systems'],
  },

  'tech-autonomous-systems': {
    techId: 'tech-autonomous-systems',
    discoveredBy: [
      { name: 'DARPA (Grand Challenge)', type: 'government-lab', country: 'US' },
      { name: 'Carnegie Mellon Robotics', type: 'university', country: 'US' },
      { name: 'MIT AeroAstro', type: 'university', country: 'US' },
    ],
    studiedBy: [
      { name: 'Army Research Laboratory', type: 'government-lab', country: 'US' },
      { name: 'UTEP Mechanical Engineering', type: 'university', country: 'US' },
      { name: 'NMSU Engineering', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'Shield AI', type: 'defense-contractor', country: 'US' },
      { name: 'Anduril Industries', type: 'defense-contractor', country: 'US' },
      { name: 'Skydio', type: 'defense-contractor', country: 'US' },
      { name: 'AeroVironment', type: 'defense-contractor', country: 'US' },
    ],
    usedBy: [
      { name: 'Fort Bliss RCV Program', type: 'military', country: 'US' },
      { name: 'U.S. CBP UAS Operations', type: 'military', country: 'US' },
      { name: 'Army Futures Command', type: 'military', country: 'US' },
    ],
    applications: [
      'Robotic Combat Vehicle testing at Fort Bliss ranges',
      'Autonomous resupply convoy operations',
      'CBP drone-based border surveillance',
      'Counter-UAS autonomous intercept systems',
      'UGV perimeter patrol at Fort Bliss',
    ],
    relatedTechIds: ['tech-reinforcement-learning', 'tech-edge-ai', 'tech-c4isr', 'tech-isr'],
  },

  'tech-c4isr': {
    techId: 'tech-c4isr',
    discoveredBy: [
      { name: 'DARPA', type: 'government-lab', country: 'US' },
      { name: 'Army DEVCOM C5ISR Center', type: 'government-lab', country: 'US' },
      { name: 'MIT Lincoln Laboratory', type: 'government-lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'Johns Hopkins APL', type: 'research-institute', country: 'US' },
      { name: 'RAND Corporation', type: 'research-institute', country: 'US' },
      { name: 'MITRE Corporation', type: 'research-institute', country: 'US' },
    ],
    builtBy: [
      { name: 'Northrop Grumman (IBCS)', type: 'defense-contractor', country: 'US' },
      { name: 'L3Harris', type: 'defense-contractor', country: 'US' },
      { name: 'Raytheon', type: 'defense-contractor', country: 'US' },
      { name: 'Palantir', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'Fort Bliss IBCS Program', type: 'military', country: 'US' },
      { name: 'U.S. Army 1st Armored Division', type: 'military', country: 'US' },
      { name: 'White Sands Missile Range', type: 'military', country: 'US' },
    ],
    applications: [
      'IBCS air and missile defense integration at Fort Bliss',
      'Tactical network modernization for 1AD',
      'Multi-domain operations command and control',
      'Joint fires integration across Fort Bliss ranges',
      'Battle management system testing at WSMR',
    ],
    relatedTechIds: ['tech-isr', 'tech-electronic-warfare', 'tech-autonomous-systems', 'tech-edge-ai'],
  },

  'tech-hypersonics': {
    techId: 'tech-hypersonics',
    discoveredBy: [
      { name: 'DARPA (TBG Program)', type: 'government-lab', country: 'US' },
      { name: 'Sandia National Laboratories', type: 'government-lab', country: 'US' },
      { name: 'NASA Langley Research Center', type: 'government-lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'Johns Hopkins APL', type: 'research-institute', country: 'US' },
      { name: 'University of Arizona', type: 'university', country: 'US' },
      { name: 'Texas A&M Aerospace', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'Raytheon', type: 'defense-contractor', country: 'US' },
      { name: 'Lockheed Martin', type: 'defense-contractor', country: 'US' },
      { name: 'Northrop Grumman', type: 'defense-contractor', country: 'US' },
    ],
    usedBy: [
      { name: 'White Sands Missile Range', type: 'military', country: 'US' },
      { name: 'Army Rapid Capabilities Office', type: 'military', country: 'US' },
      { name: 'MDA (Missile Defense Agency)', type: 'military', country: 'US' },
    ],
    applications: [
      'Dark Eagle (LRHW) testing at White Sands',
      'Glide phase interceptor development near El Paso',
      'Hypersonic flight corridor testing over WSMR',
      'Army AHW program support from Fort Bliss',
    ],
    relatedTechIds: ['tech-directed-energy', 'tech-c4isr', 'tech-isr'],
  },

  'tech-directed-energy': {
    techId: 'tech-directed-energy',
    discoveredBy: [
      { name: 'DARPA', type: 'government-lab', country: 'US' },
      { name: 'Air Force Research Laboratory', type: 'government-lab', country: 'US' },
      { name: 'Sandia National Laboratories', type: 'government-lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'Army Research Laboratory', type: 'government-lab', country: 'US' },
      { name: 'University of New Mexico', type: 'university', country: 'US' },
      { name: 'NMSU Physics', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'Raytheon', type: 'defense-contractor', country: 'US' },
      { name: 'Lockheed Martin', type: 'defense-contractor', country: 'US' },
      { name: 'Boeing', type: 'defense-contractor', country: 'US' },
      { name: 'Northrop Grumman', type: 'defense-contractor', country: 'US' },
    ],
    usedBy: [
      { name: 'White Sands Missile Range', type: 'military', country: 'US' },
      { name: 'Fort Bliss Air Defense', type: 'military', country: 'US' },
      { name: 'Army RCCTO', type: 'military', country: 'US' },
    ],
    applications: [
      'High Energy Laser counter-UAS testing at WSMR',
      'SHORAD laser system integration at Fort Bliss',
      'Force protection directed energy for base defense',
      'High-power microwave testing in the El Paso corridor',
    ],
    relatedTechIds: ['tech-hypersonics', 'tech-c4isr', 'tech-electronic-warfare'],
  },

  // ── Border Tech (5) ───────────────────────────────────────────────────────

  'tech-biometrics': {
    techId: 'tech-biometrics',
    discoveredBy: [
      { name: 'NEC Research', type: 'lab', country: 'JP' },
      { name: 'NIST Biometrics Group', type: 'government-lab', country: 'US' },
      { name: 'DHS S&T', type: 'government-lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'West Virginia University', type: 'university', country: 'US' },
      { name: 'UTEP Biometric Research', type: 'university', country: 'US' },
      { name: 'Michigan State University', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'IDEMIA', type: 'enterprise', country: 'FR' },
      { name: 'NEC Corporation', type: 'enterprise', country: 'JP' },
      { name: 'Thales DIS', type: 'enterprise', country: 'FR' },
      { name: 'Aware Inc.', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'U.S. CBP El Paso Ports of Entry', type: 'military', country: 'US' },
      { name: 'TSA at El Paso International Airport', type: 'military', country: 'US' },
      { name: 'DHS OBIM', type: 'military', country: 'US' },
    ],
    applications: [
      'Facial recognition at El Paso BOTA and Ysleta POEs',
      'Biometric Entry-Exit program at El Paso International Airport',
      'SENTRI trusted traveler enrollment',
      'Fort Bliss installation access control',
      'CBP mobile biometric collection in the field',
    ],
    relatedTechIds: ['tech-computer-vision', 'tech-surveillance-systems', 'tech-cargo-scanning'],
  },

  'tech-rfid-tracking': {
    techId: 'tech-rfid-tracking',
    discoveredBy: [
      { name: 'MIT Auto-ID Lab', type: 'university', country: 'US' },
      { name: 'Texas Instruments (RFID pioneers)', type: 'enterprise', country: 'US' },
      { name: 'EPCglobal / GS1', type: 'research-institute', country: 'US' },
    ],
    studiedBy: [
      { name: 'Auburn University RFID Lab', type: 'university', country: 'US' },
      { name: 'UTEP Industrial Engineering', type: 'university', country: 'US' },
      { name: 'University of Arkansas RFID Center', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'Zebra Technologies', type: 'enterprise', country: 'US' },
      { name: 'Impinj', type: 'enterprise', country: 'US' },
      { name: 'Honeywell', type: 'enterprise', country: 'US' },
      { name: 'SATO Holdings', type: 'enterprise', country: 'JP' },
    ],
    usedBy: [
      { name: 'U.S. CBP C-TPAT', type: 'military', country: 'US' },
      { name: 'Foxconn El Paso', type: 'enterprise', country: 'US' },
      { name: 'Helen of Troy', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'C-TPAT cargo tracking from Juarez to US distribution',
      'RFID-enabled customs processing at El Paso ports',
      'Military asset tracking at Fort Bliss depots',
      'Maquiladora work-in-progress tracking',
      'BNSF rail car identification at El Paso yards',
    ],
    relatedTechIds: ['tech-supply-chain-visibility', 'tech-cargo-scanning', 'tech-fleet-management'],
  },

  'tech-cargo-scanning': {
    techId: 'tech-cargo-scanning',
    discoveredBy: [
      { name: 'Los Alamos National Laboratory', type: 'government-lab', country: 'US' },
      { name: 'Pacific Northwest National Lab', type: 'government-lab', country: 'US' },
      { name: 'DHS DNDO', type: 'government-lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'Sandia National Laboratories', type: 'government-lab', country: 'US' },
      { name: 'UTEP Physics', type: 'university', country: 'US' },
      { name: 'Oak Ridge National Laboratory', type: 'government-lab', country: 'US' },
    ],
    builtBy: [
      { name: 'Leidos (VACIS)', type: 'defense-contractor', country: 'US' },
      { name: 'Rapiscan Systems', type: 'enterprise', country: 'US' },
      { name: 'Smiths Detection', type: 'enterprise', country: 'UK' },
      { name: 'OSI Systems', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'U.S. CBP El Paso Commercial Ports', type: 'military', country: 'US' },
      { name: 'CBP Ysleta POE', type: 'military', country: 'US' },
      { name: 'DHS CWMD', type: 'military', country: 'US' },
    ],
    applications: [
      'X-ray scanning of commercial trucks at BOTA',
      'Gamma-ray imaging at El Paso rail crossings',
      'Automated anomaly detection in cargo manifests',
      'Radiation portal monitoring at all El Paso POEs',
    ],
    relatedTechIds: ['tech-biometrics', 'tech-surveillance-systems', 'tech-anomaly-detection'],
  },

  'tech-surveillance-systems': {
    techId: 'tech-surveillance-systems',
    discoveredBy: [
      { name: 'DARPA', type: 'government-lab', country: 'US' },
      { name: 'DHS S&T', type: 'government-lab', country: 'US' },
      { name: 'Army Night Vision Lab', type: 'government-lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'MITRE Corporation', type: 'research-institute', country: 'US' },
      { name: 'RAND Corporation', type: 'research-institute', country: 'US' },
      { name: 'UTEP Border Security Research', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'Elbit Systems of America', type: 'defense-contractor', country: 'IL' },
      { name: 'Anduril Industries', type: 'defense-contractor', country: 'US' },
      { name: 'General Dynamics', type: 'defense-contractor', country: 'US' },
      { name: 'FLIR Systems (Teledyne)', type: 'defense-contractor', country: 'US' },
    ],
    usedBy: [
      { name: 'U.S. CBP El Paso Sector', type: 'military', country: 'US' },
      { name: 'U.S. Border Patrol', type: 'military', country: 'US' },
      { name: 'Fort Bliss Force Protection', type: 'military', country: 'US' },
    ],
    applications: [
      'Integrated Fixed Towers (IFT) along El Paso border',
      'Mobile surveillance systems for remote border areas',
      'Persistent ground sensor networks in the El Paso sector',
      'Night vision and thermal imaging for border patrol',
      'Autonomous surveillance towers (Anduril Sentry)',
    ],
    relatedTechIds: ['tech-computer-vision', 'tech-biometrics', 'tech-isr', 'tech-autonomous-systems'],
  },

  'tech-trade-compliance-software': {
    techId: 'tech-trade-compliance-software',
    discoveredBy: [
      { name: 'U.S. Customs (ACE development)', type: 'government-lab', country: 'US' },
      { name: 'World Customs Organization', type: 'research-institute', country: 'BE' },
      { name: 'WTO Trade Facilitation Committee', type: 'research-institute', country: 'CH' },
    ],
    studiedBy: [
      { name: 'UTEP Cross-Border Institute', type: 'university', country: 'US' },
      { name: 'Texas A&M International', type: 'university', country: 'US' },
      { name: 'Georgetown Trade Law', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'Descartes Systems', type: 'enterprise', country: 'CA' },
      { name: 'Amber Road (E2open)', type: 'enterprise', country: 'US' },
      { name: 'SAP GTS', type: 'enterprise', country: 'DE' },
      { name: 'Nuvocargo', type: 'startup', country: 'US' },
    ],
    usedBy: [
      { name: 'El Paso Customs Brokers (500+)', type: 'enterprise', country: 'US' },
      { name: 'Foxconn El Paso', type: 'enterprise', country: 'US' },
      { name: 'Helen of Troy', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'ACE-certified customs filing for cross-border trade',
      'USMCA certificate-of-origin automation',
      'Duty drawback management for maquiladora operators',
      'Export license compliance for defense manufacturers',
      'Pedimento processing for Juarez operations',
    ],
    relatedTechIds: ['tech-supply-chain-visibility', 'tech-digital-freight', 'tech-rfid-tracking'],
  },

  // ── Manufacturing (5) ──────────────────────────────────────────────────────

  'tech-industry40': {
    techId: 'tech-industry40',
    discoveredBy: [
      { name: 'Fraunhofer Institute', type: 'research-institute', country: 'DE' },
      { name: 'German Federal Ministry (coined Industry 4.0)', type: 'government-lab', country: 'DE' },
      { name: 'MIT Media Lab', type: 'university', country: 'US' },
    ],
    studiedBy: [
      { name: 'Georgia Tech Manufacturing Institute', type: 'university', country: 'US' },
      { name: 'UTEP W.M. Keck Center', type: 'university', country: 'US' },
      { name: 'NMSU Manufacturing Technology', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'Siemens', type: 'enterprise', country: 'DE' },
      { name: 'Rockwell Automation', type: 'enterprise', country: 'US' },
      { name: 'PTC', type: 'enterprise', country: 'US' },
      { name: 'Honeywell', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'Juarez Maquiladoras', type: 'enterprise', country: 'MX' },
      { name: 'Foxconn El Paso', type: 'enterprise', country: 'US' },
      { name: 'Delphi Technologies Juarez', type: 'enterprise', country: 'MX' },
    ],
    applications: [
      'Smart factory adoption in El Paso-Juarez maquiladoras',
      'IoT sensor deployment for OEE improvement',
      'Digital factory platforms for nearshoring operations',
      'Predictive quality control in electronics assembly',
      'Connected worker platforms in wiring harness plants',
    ],
    relatedTechIds: ['tech-digital-twin', 'tech-predictive-maintenance', 'tech-cobotics', 'tech-edge-ai'],
  },

  'tech-additive-manufacturing': {
    techId: 'tech-additive-manufacturing',
    discoveredBy: [
      { name: 'MIT (3D printing pioneers)', type: 'university', country: 'US' },
      { name: 'University of Texas Austin (SLS inventors)', type: 'university', country: 'US' },
      { name: 'Oak Ridge National Laboratory', type: 'government-lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'UTEP W.M. Keck Center for 3D Innovation', type: 'university', country: 'US' },
      { name: 'Army Research Laboratory', type: 'government-lab', country: 'US' },
      { name: 'Penn State CIMP-3D', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'Stratasys', type: 'enterprise', country: 'US' },
      { name: '3D Systems', type: 'enterprise', country: 'US' },
      { name: 'EOS', type: 'enterprise', country: 'DE' },
      { name: 'Desktop Metal', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'UTEP College of Engineering', type: 'university', country: 'US' },
      { name: 'Fort Bliss Maintenance Depot', type: 'military', country: 'US' },
      { name: 'Army OIB', type: 'military', country: 'US' },
    ],
    applications: [
      'On-demand spare parts at Fort Bliss maintenance depot',
      'UTEP advanced manufacturing research and certification',
      'Metal AM for Army vehicle component repair',
      'Rapid tooling for maquiladora production lines',
      'Medical device prototyping at TTUHSC',
    ],
    relatedTechIds: ['tech-industry40', 'tech-digital-twin', 'tech-predictive-maintenance'],
  },

  'tech-digital-twin': {
    techId: 'tech-digital-twin',
    discoveredBy: [
      { name: 'University of Michigan (Michael Grieves)', type: 'university', country: 'US' },
      { name: 'NASA', type: 'government-lab', country: 'US' },
      { name: 'DARPA', type: 'government-lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'Fraunhofer Institute', type: 'research-institute', country: 'DE' },
      { name: 'UTEP Engineering', type: 'university', country: 'US' },
      { name: 'Texas A&M Engineering', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'Siemens', type: 'enterprise', country: 'DE' },
      { name: 'PTC (ThingWorx)', type: 'enterprise', country: 'US' },
      { name: 'NVIDIA (Omniverse)', type: 'enterprise', country: 'US' },
      { name: 'Ansys', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'Fort Bliss Training Center', type: 'military', country: 'US' },
      { name: 'UTEP College of Engineering', type: 'university', country: 'US' },
      { name: 'Hunt Companies', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'Virtual replica of Fort Bliss training ranges',
      'Maquiladora process optimization models',
      'El Paso Water infrastructure simulation',
      'Aircraft maintenance digital twins at Fort Bliss',
      'Building energy modeling for Hunt military housing',
    ],
    relatedTechIds: ['tech-industry40', 'tech-predictive-maintenance', 'tech-additive-manufacturing'],
  },

  'tech-predictive-maintenance': {
    techId: 'tech-predictive-maintenance',
    discoveredBy: [
      { name: 'University of Cincinnati (IMS Center)', type: 'university', country: 'US' },
      { name: 'NASA (prognostics research)', type: 'government-lab', country: 'US' },
      { name: 'Army Research Laboratory', type: 'government-lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'Georgia Tech ML for Manufacturing', type: 'university', country: 'US' },
      { name: 'UTEP Mechanical Engineering', type: 'university', country: 'US' },
      { name: 'Sandia National Laboratories', type: 'government-lab', country: 'US' },
    ],
    builtBy: [
      { name: 'Uptake Technologies', type: 'enterprise', country: 'US' },
      { name: 'SparkCognition', type: 'enterprise', country: 'US' },
      { name: 'Siemens (MindSphere)', type: 'enterprise', country: 'DE' },
      { name: 'PTC (ThingWorx)', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'Fort Bliss Vehicle Fleet', type: 'military', country: 'US' },
      { name: 'Juarez Maquiladoras', type: 'enterprise', country: 'MX' },
      { name: 'El Paso Electric', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'Army CBM+ for Fort Bliss Stryker and Bradley fleet',
      'CNC and injection molding uptime in maquiladoras',
      'El Paso Electric transformer health monitoring',
      'WBAMC medical equipment failure prediction',
      'BNSF locomotive predictive maintenance',
    ],
    relatedTechIds: ['tech-digital-twin', 'tech-industry40', 'tech-anomaly-detection'],
  },

  'tech-cobotics': {
    techId: 'tech-cobotics',
    discoveredBy: [
      { name: 'Northwestern University (coined cobots)', type: 'university', country: 'US' },
      { name: 'Universal Robots (Esben Ostergaard)', type: 'startup', country: 'DK' },
      { name: 'DARPA ARM Program', type: 'government-lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'MIT CSAIL', type: 'university', country: 'US' },
      { name: 'UTEP Industrial Engineering', type: 'university', country: 'US' },
      { name: 'Georgia Tech IRIM', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'Universal Robots', type: 'enterprise', country: 'DK' },
      { name: 'FANUC', type: 'enterprise', country: 'JP' },
      { name: 'ABB Robotics', type: 'enterprise', country: 'CH' },
      { name: 'Rethink Robotics', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'Juarez Wiring Harness Plants', type: 'enterprise', country: 'MX' },
      { name: 'Foxconn El Paso', type: 'enterprise', country: 'US' },
      { name: 'Delphi Technologies Juarez', type: 'enterprise', country: 'MX' },
    ],
    applications: [
      'Assembly line automation in Juarez electronics plants',
      'Ergonomic assist for wiring harness production',
      'Quality inspection cobots in maquiladora lines',
      'Palletizing and packaging automation',
      'Machine tending in CNC machining operations',
    ],
    relatedTechIds: ['tech-industry40', 'tech-autonomous-systems', 'tech-additive-manufacturing'],
  },

  // ── Energy (5) ─────────────────────────────────────────────────────────────

  'tech-smart-grid': {
    techId: 'tech-smart-grid',
    discoveredBy: [
      { name: 'DOE National Energy Technology Lab', type: 'government-lab', country: 'US' },
      { name: 'EPRI (Electric Power Research Institute)', type: 'research-institute', country: 'US' },
      { name: 'MIT Energy Initiative', type: 'university', country: 'US' },
    ],
    studiedBy: [
      { name: 'Sandia National Laboratories', type: 'government-lab', country: 'US' },
      { name: 'UTEP Electrical Engineering', type: 'university', country: 'US' },
      { name: 'NREL', type: 'government-lab', country: 'US' },
    ],
    builtBy: [
      { name: 'Itron', type: 'enterprise', country: 'US' },
      { name: 'Landis+Gyr', type: 'enterprise', country: 'CH' },
      { name: 'Schneider Electric', type: 'enterprise', country: 'FR' },
      { name: 'GE Grid Solutions', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'El Paso Electric', type: 'enterprise', country: 'US' },
      { name: 'Fort Bliss Installation Energy', type: 'military', country: 'US' },
      { name: 'ERCOT', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'El Paso Electric $1.8B grid modernization program',
      'AMI smart meter deployment across El Paso',
      'Distribution automation for grid reliability',
      'Demand response programs for peak desert heat',
      'DERMS integration for distributed solar',
    ],
    relatedTechIds: ['tech-utility-scale-solar', 'tech-battery-storage', 'tech-grid-ai', 'tech-ics-ot-security'],
  },

  'tech-utility-scale-solar': {
    techId: 'tech-utility-scale-solar',
    discoveredBy: [
      { name: 'Bell Labs (photovoltaic cell inventors)', type: 'lab', country: 'US' },
      { name: 'NREL', type: 'government-lab', country: 'US' },
      { name: 'Sandia National Laboratories', type: 'government-lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'UTEP Engineering', type: 'university', country: 'US' },
      { name: 'Arizona State University PV Lab', type: 'university', country: 'US' },
      { name: 'NREL', type: 'government-lab', country: 'US' },
    ],
    builtBy: [
      { name: 'NextEra Energy', type: 'enterprise', country: 'US' },
      { name: 'First Solar', type: 'enterprise', country: 'US' },
      { name: 'AES Corporation', type: 'enterprise', country: 'US' },
      { name: 'Invenergy', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'El Paso Electric', type: 'enterprise', country: 'US' },
      { name: 'Fort Bliss Solar Installation', type: 'military', country: 'US' },
      { name: 'City of El Paso', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'Utility-scale solar farms in El Paso Electric service territory',
      'Fort Bliss 20MW+ solar installation',
      'Community solar programs for El Paso residents',
      '297 sunny days/year resource optimization',
    ],
    relatedTechIds: ['tech-battery-storage', 'tech-smart-grid', 'tech-microgrid', 'tech-grid-ai'],
  },

  'tech-battery-storage': {
    techId: 'tech-battery-storage',
    discoveredBy: [
      { name: 'MIT (lithium-ion research)', type: 'university', country: 'US' },
      { name: 'Argonne National Laboratory', type: 'government-lab', country: 'US' },
      { name: 'Stanford GCEP', type: 'university', country: 'US' },
    ],
    studiedBy: [
      { name: 'NREL', type: 'government-lab', country: 'US' },
      { name: 'Sandia National Laboratories', type: 'government-lab', country: 'US' },
      { name: 'UTEP Materials Science', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'Tesla (Megapack)', type: 'enterprise', country: 'US' },
      { name: 'Fluence Energy', type: 'enterprise', country: 'US' },
      { name: 'BYD', type: 'enterprise', country: 'CN' },
      { name: 'Samsung SDI', type: 'enterprise', country: 'KR' },
    ],
    usedBy: [
      { name: 'El Paso Electric', type: 'enterprise', country: 'US' },
      { name: 'Fort Bliss Energy Resilience', type: 'military', country: 'US' },
      { name: 'Army Installation Energy', type: 'military', country: 'US' },
    ],
    applications: [
      'Grid-scale BESS for El Paso solar firming',
      'Fort Bliss critical facility backup power',
      'Peak demand management in desert heat',
      'Microgrid energy storage for Army installations',
    ],
    relatedTechIds: ['tech-utility-scale-solar', 'tech-microgrid', 'tech-smart-grid'],
  },

  'tech-microgrid': {
    techId: 'tech-microgrid',
    discoveredBy: [
      { name: 'DOE Office of Electricity', type: 'government-lab', country: 'US' },
      { name: 'Sandia National Laboratories', type: 'government-lab', country: 'US' },
      { name: 'UC San Diego (campus microgrid pioneer)', type: 'university', country: 'US' },
    ],
    studiedBy: [
      { name: 'NREL', type: 'government-lab', country: 'US' },
      { name: 'UTEP Electrical Engineering', type: 'university', country: 'US' },
      { name: 'Army Corps of Engineers ERDC', type: 'government-lab', country: 'US' },
    ],
    builtBy: [
      { name: 'Schneider Electric', type: 'enterprise', country: 'FR' },
      { name: 'Siemens', type: 'enterprise', country: 'DE' },
      { name: 'Honeywell', type: 'enterprise', country: 'US' },
      { name: 'Lockheed Martin Energy', type: 'defense-contractor', country: 'US' },
    ],
    usedBy: [
      { name: 'Fort Bliss (WBAMC, C2 nodes)', type: 'military', country: 'US' },
      { name: 'Army Installation Energy Resilience', type: 'military', country: 'US' },
      { name: 'El Paso Electric', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'Fort Bliss WBAMC hospital microgrid',
      'Army command and control facility islanding capability',
      'Critical infrastructure backup for El Paso utilities',
      'Remote border station energy independence',
    ],
    relatedTechIds: ['tech-battery-storage', 'tech-utility-scale-solar', 'tech-smart-grid'],
  },

  'tech-grid-ai': {
    techId: 'tech-grid-ai',
    discoveredBy: [
      { name: 'Google DeepMind (data center cooling AI)', type: 'lab', country: 'UK' },
      { name: 'EPRI', type: 'research-institute', country: 'US' },
      { name: 'DOE National Labs', type: 'government-lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'Stanford Bits & Watts', type: 'university', country: 'US' },
      { name: 'UTEP ECE Department', type: 'university', country: 'US' },
      { name: 'NREL', type: 'government-lab', country: 'US' },
    ],
    builtBy: [
      { name: 'AutoGrid', type: 'enterprise', country: 'US' },
      { name: 'Utilidata', type: 'startup', country: 'US' },
      { name: 'SparkCognition', type: 'enterprise', country: 'US' },
      { name: 'C3 AI', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'El Paso Electric', type: 'enterprise', country: 'US' },
      { name: 'ERCOT', type: 'enterprise', country: 'US' },
      { name: 'Fort Bliss Energy Management', type: 'military', country: 'US' },
    ],
    applications: [
      'AI demand forecasting for El Paso summer peaks',
      'Fault detection in El Paso Electric distribution',
      'Solar intermittency management and load balancing',
      'Automated switching for grid self-healing',
      'ERCOT pilot programs for West Texas grid operations',
    ],
    relatedTechIds: ['tech-smart-grid', 'tech-utility-scale-solar', 'tech-anomaly-detection', 'tech-ics-ot-security'],
  },

  // ── Healthcare (5) ─────────────────────────────────────────────────────────

  'tech-telemedicine': {
    techId: 'tech-telemedicine',
    discoveredBy: [
      { name: 'NASA (telemedicine for astronauts)', type: 'government-lab', country: 'US' },
      { name: 'VA Health System (early adoption)', type: 'government-lab', country: 'US' },
      { name: 'University of Nebraska Medical Center', type: 'university', country: 'US' },
    ],
    studiedBy: [
      { name: 'TTUHSC Paul Foster School of Medicine', type: 'university', country: 'US' },
      { name: 'UTEP School of Nursing', type: 'university', country: 'US' },
      { name: 'ATA (American Telemedicine Association)', type: 'research-institute', country: 'US' },
    ],
    builtBy: [
      { name: 'Teladoc Health', type: 'enterprise', country: 'US' },
      { name: 'Amwell', type: 'enterprise', country: 'US' },
      { name: 'Doxy.me', type: 'startup', country: 'US' },
      { name: 'Oracle Health (Cerner)', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'WBAMC (William Beaumont Army Medical Center)', type: 'military', country: 'US' },
      { name: 'TTUHSC El Paso Clinics', type: 'enterprise', country: 'US' },
      { name: 'UMC of El Paso', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'Virtual care for Fort Bliss soldier readiness',
      'TTUHSC rural health outreach to West Texas',
      'Bilingual telehealth for El Paso underserved populations',
      'WBAMC specialist consultations for remote Army families',
      'Mental health virtual visits for veterans',
    ],
    relatedTechIds: ['tech-ehr', 'tech-remote-patient-monitoring', 'tech-medical-imaging-ai'],
  },

  'tech-ehr': {
    techId: 'tech-ehr',
    discoveredBy: [
      { name: 'VA VISTA System (early EHR pioneer)', type: 'government-lab', country: 'US' },
      { name: 'Harvard Medical School (informatics)', type: 'university', country: 'US' },
      { name: 'Regenstrief Institute', type: 'research-institute', country: 'US' },
    ],
    studiedBy: [
      { name: 'AMIA (medical informatics)', type: 'research-institute', country: 'US' },
      { name: 'TTUHSC Health Informatics', type: 'university', country: 'US' },
      { name: 'ONC (Office of National Coordinator)', type: 'government-lab', country: 'US' },
    ],
    builtBy: [
      { name: 'Epic Systems', type: 'enterprise', country: 'US' },
      { name: 'Oracle Health (Cerner)', type: 'enterprise', country: 'US' },
      { name: 'MEDITECH', type: 'enterprise', country: 'US' },
      { name: 'athenahealth', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'WBAMC (MHS Genesis / Cerner)', type: 'military', country: 'US' },
      { name: 'UMC of El Paso (Epic)', type: 'enterprise', country: 'US' },
      { name: 'Hospitals of Providence', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'MHS Genesis deployment at WBAMC',
      'Epic system at UMC for regional health data',
      'HL7 FHIR interoperability across El Paso providers',
      'Bilingual clinical documentation',
      'Population health management for El Paso County',
    ],
    relatedTechIds: ['tech-telemedicine', 'tech-medical-imaging-ai', 'tech-clinical-trials-ai', 'tech-nlp'],
  },

  'tech-medical-imaging-ai': {
    techId: 'tech-medical-imaging-ai',
    discoveredBy: [
      { name: 'Stanford AIMI Center', type: 'university', country: 'US' },
      { name: 'MIT CSAIL (medical imaging)', type: 'university', country: 'US' },
      { name: 'NIH Clinical Center', type: 'government-lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'TTUHSC Radiology', type: 'university', country: 'US' },
      { name: 'Mayo Clinic AI Lab', type: 'research-institute', country: 'US' },
      { name: 'ACR Data Science Institute', type: 'research-institute', country: 'US' },
    ],
    builtBy: [
      { name: 'Aidoc', type: 'startup', country: 'IL' },
      { name: 'Viz.ai', type: 'startup', country: 'US' },
      { name: 'GE HealthCare', type: 'enterprise', country: 'US' },
      { name: 'Siemens Healthineers', type: 'enterprise', country: 'DE' },
    ],
    usedBy: [
      { name: 'UMC of El Paso Radiology', type: 'enterprise', country: 'US' },
      { name: 'Tenet Health Sierra', type: 'enterprise', country: 'US' },
      { name: 'WBAMC Radiology', type: 'military', country: 'US' },
    ],
    applications: [
      'AI-assisted radiology for El Paso radiologist shortage',
      'Stroke detection AI at UMC emergency department',
      'Mammography screening AI at Sierra Medical Center',
      'WBAMC trauma imaging triage',
      'Pathology AI for TTUHSC research',
    ],
    relatedTechIds: ['tech-computer-vision', 'tech-ehr', 'tech-telemedicine', 'tech-generative-ai'],
  },

  'tech-remote-patient-monitoring': {
    techId: 'tech-remote-patient-monitoring',
    discoveredBy: [
      { name: 'NASA (astronaut health monitoring)', type: 'government-lab', country: 'US' },
      { name: 'MIT Media Lab (wearable sensors)', type: 'university', country: 'US' },
      { name: 'VA Home Telehealth Program', type: 'government-lab', country: 'US' },
    ],
    studiedBy: [
      { name: 'TTUHSC Center for Telehealth', type: 'university', country: 'US' },
      { name: 'UTEP Biomedical Engineering', type: 'university', country: 'US' },
      { name: 'Army Medical Research', type: 'government-lab', country: 'US' },
    ],
    builtBy: [
      { name: 'BioTelemetry (Philips)', type: 'enterprise', country: 'US' },
      { name: 'Masimo', type: 'enterprise', country: 'US' },
      { name: 'Dexcom', type: 'enterprise', country: 'US' },
      { name: 'Biobeat', type: 'startup', country: 'IL' },
    ],
    usedBy: [
      { name: 'WBAMC Soldier Readiness', type: 'military', country: 'US' },
      { name: 'TTUHSC Rural Health', type: 'enterprise', country: 'US' },
      { name: 'CareMore Medicare Advantage (El Paso)', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'Soldier physiologic readiness monitoring at Fort Bliss',
      'Chronic disease RPM for El Paso Medicare patients',
      'Post-surgical monitoring for WBAMC discharges',
      'Diabetes management for El Paso border community',
      'TTUHSC rural patient monitoring in West Texas',
    ],
    relatedTechIds: ['tech-telemedicine', 'tech-ehr', 'tech-edge-ai'],
  },

  'tech-clinical-trials-ai': {
    techId: 'tech-clinical-trials-ai',
    discoveredBy: [
      { name: 'NIH (clinical research informatics)', type: 'government-lab', country: 'US' },
      { name: 'FDA (adaptive trial design)', type: 'government-lab', country: 'US' },
      { name: 'Duke Clinical Research Institute', type: 'university', country: 'US' },
    ],
    studiedBy: [
      { name: 'TTUHSC Paul Foster School of Medicine', type: 'university', country: 'US' },
      { name: 'UTEP School of Pharmacy', type: 'university', country: 'US' },
      { name: 'Harvard Catalyst', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'Medidata Solutions', type: 'enterprise', country: 'US' },
      { name: 'Veeva Systems', type: 'enterprise', country: 'US' },
      { name: 'Oracle Health Sciences', type: 'enterprise', country: 'US' },
      { name: 'Unlearn.AI', type: 'startup', country: 'US' },
    ],
    usedBy: [
      { name: 'TTUHSC Clinical Trials', type: 'university', country: 'US' },
      { name: 'UTEP NIH-Funded Research', type: 'university', country: 'US' },
      { name: 'WBAMC Clinical Research', type: 'military', country: 'US' },
    ],
    applications: [
      'NIH-funded clinical trial management at TTUHSC',
      'Patient recruitment in El Paso Hispanic population',
      'ePRO data collection for bilingual studies',
      'Biostatistical analysis for border health research',
    ],
    relatedTechIds: ['tech-ehr', 'tech-nlp', 'tech-generative-ai'],
  },

  // ── Logistics (6) ──────────────────────────────────────────────────────────

  'tech-route-optimization': {
    techId: 'tech-route-optimization',
    discoveredBy: [
      { name: 'MIT Operations Research Center', type: 'university', country: 'US' },
      { name: 'Georgia Tech Supply Chain Lab', type: 'university', country: 'US' },
      { name: 'INFORMS (operations research)', type: 'research-institute', country: 'US' },
    ],
    studiedBy: [
      { name: 'UTEP Industrial Engineering', type: 'university', country: 'US' },
      { name: 'Texas A&M Transportation Institute', type: 'university', country: 'US' },
      { name: 'University of Michigan TSDL', type: 'university', country: 'US' },
    ],
    builtBy: [
      { name: 'Descartes Systems', type: 'enterprise', country: 'CA' },
      { name: 'ORTEC', type: 'enterprise', country: 'NL' },
      { name: 'Optym', type: 'enterprise', country: 'US' },
      { name: 'Google (OR-Tools)', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'El Paso Cross-Border Carriers', type: 'enterprise', country: 'US' },
      { name: 'Amazon ELP1', type: 'enterprise', country: 'US' },
      { name: 'Fort Bliss Logistics', type: 'military', country: 'US' },
    ],
    applications: [
      'Cross-border route planning with CBP wait time integration',
      'I-10 congestion-aware delivery scheduling',
      'Military convoy routing through El Paso corridor',
      'Last-mile optimization for desert geography',
      'Multi-stop delivery planning for maquiladora supply chains',
    ],
    relatedTechIds: ['tech-fleet-management', 'tech-last-mile', 'tech-supply-chain-visibility'],
  },

  'tech-warehouse-automation': {
    techId: 'tech-warehouse-automation',
    discoveredBy: [
      { name: 'MIT (Kiva Systems founders)', type: 'university', country: 'US' },
      { name: 'Fraunhofer IML', type: 'research-institute', country: 'DE' },
      { name: 'Georgia Tech Supply Chain Lab', type: 'university', country: 'US' },
    ],
    studiedBy: [
      { name: 'UTEP Industrial Engineering', type: 'university', country: 'US' },
      { name: 'Auburn University Supply Chain', type: 'university', country: 'US' },
      { name: 'Army Logistics University', type: 'military', country: 'US' },
    ],
    builtBy: [
      { name: 'Amazon Robotics', type: 'enterprise', country: 'US' },
      { name: 'Dematic (KION)', type: 'enterprise', country: 'US' },
      { name: 'Locus Robotics', type: 'startup', country: 'US' },
      { name: 'AutoStore', type: 'enterprise', country: 'NO' },
    ],
    usedBy: [
      { name: 'Amazon ELP1 Horizon City', type: 'enterprise', country: 'US' },
      { name: 'DLA Fort Bliss Depot', type: 'military', country: 'US' },
      { name: 'Helen of Troy Distribution', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'Kiva/Amazon Robotics GTP at ELP1 fulfillment center',
      'ASRS modernization at DLA depots serving Fort Bliss',
      'E-commerce order fulfillment for El Paso distribution',
      'Cross-border consolidated shipment staging',
      'Army spare parts picking automation',
    ],
    relatedTechIds: ['tech-cobotics', 'tech-fleet-management', 'tech-supply-chain-visibility'],
  },

  'tech-fleet-management': {
    techId: 'tech-fleet-management',
    discoveredBy: [
      { name: 'Qualcomm (OmniTRACS pioneer)', type: 'enterprise', country: 'US' },
      { name: 'DOT (ELD mandate development)', type: 'government-lab', country: 'US' },
      { name: 'University of Michigan UMTRI', type: 'university', country: 'US' },
    ],
    studiedBy: [
      { name: 'Texas A&M Transportation Institute', type: 'university', country: 'US' },
      { name: 'UTEP Civil Engineering', type: 'university', country: 'US' },
      { name: 'ATRI (American Trucking Research)', type: 'research-institute', country: 'US' },
    ],
    builtBy: [
      { name: 'Samsara', type: 'enterprise', country: 'US' },
      { name: 'Geotab', type: 'enterprise', country: 'CA' },
      { name: 'Omnitracs', type: 'enterprise', country: 'US' },
      { name: 'Verizon Connect', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'U.S. CBP Vehicle Fleet', type: 'military', country: 'US' },
      { name: 'Fort Bliss Army Fleet', type: 'military', country: 'US' },
      { name: 'El Paso Cross-Border Carriers', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'CBP patrol vehicle GPS tracking and dispatch',
      'Army fleet telematics at Fort Bliss motor pool',
      'ELD compliance for cross-border trucking fleets',
      'Driver safety scoring for El Paso carriers',
      'Predictive maintenance for commercial vehicle fleets',
    ],
    relatedTechIds: ['tech-route-optimization', 'tech-supply-chain-visibility', 'tech-last-mile'],
  },

  'tech-last-mile': {
    techId: 'tech-last-mile',
    discoveredBy: [
      { name: 'MIT Center for Transportation & Logistics', type: 'university', country: 'US' },
      { name: 'Amazon (last-mile innovation)', type: 'enterprise', country: 'US' },
      { name: 'Georgia Tech Logistics Lab', type: 'university', country: 'US' },
    ],
    studiedBy: [
      { name: 'UTEP Supply Chain Management', type: 'university', country: 'US' },
      { name: 'University of Arkansas Supply Chain', type: 'university', country: 'US' },
      { name: 'Kearney (logistics consulting)', type: 'research-institute', country: 'US' },
    ],
    builtBy: [
      { name: 'FarEye', type: 'startup', country: 'US' },
      { name: 'Bringg', type: 'startup', country: 'IL' },
      { name: 'DispatchTrack', type: 'startup', country: 'US' },
      { name: 'Onfleet', type: 'startup', country: 'US' },
    ],
    usedBy: [
      { name: 'Amazon El Paso (DSP Network)', type: 'enterprise', country: 'US' },
      { name: 'FedEx El Paso', type: 'enterprise', country: 'US' },
      { name: 'UPS El Paso', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'Delivery route optimization for El Paso desert sprawl',
      'Cross-border Prime delivery from ELP1',
      'Proof-of-delivery and returns management',
      'Driver app deployment for local carriers',
      'Parcel locker integration for El Paso apartments',
    ],
    relatedTechIds: ['tech-route-optimization', 'tech-fleet-management', 'tech-supply-chain-visibility'],
  },

  'tech-supply-chain-visibility': {
    techId: 'tech-supply-chain-visibility',
    discoveredBy: [
      { name: 'MIT Center for Transportation & Logistics', type: 'university', country: 'US' },
      { name: 'Stanford Global Supply Chain Forum', type: 'university', country: 'US' },
      { name: 'GS1 (supply chain standards)', type: 'research-institute', country: 'US' },
    ],
    studiedBy: [
      { name: 'UTEP Cross-Border Institute', type: 'university', country: 'US' },
      { name: 'Georgia Tech Supply Chain Lab', type: 'university', country: 'US' },
      { name: 'World Economic Forum Supply Chain', type: 'research-institute', country: 'CH' },
    ],
    builtBy: [
      { name: 'FourKites', type: 'enterprise', country: 'US' },
      { name: 'project44', type: 'enterprise', country: 'US' },
      { name: 'Overhaul', type: 'enterprise', country: 'US' },
      { name: 'E2open', type: 'enterprise', country: 'US' },
    ],
    usedBy: [
      { name: 'Foxconn El Paso', type: 'enterprise', country: 'US' },
      { name: 'Juarez Maquiladora Operators', type: 'enterprise', country: 'MX' },
      { name: 'BNSF Railway El Paso', type: 'enterprise', country: 'US' },
    ],
    applications: [
      'Real-time cargo tracking across US-Mexico border',
      'Customs hold visibility for maquiladora supply chains',
      'Multi-carrier tracking for cross-border freight',
      'Duty drawback documentation automation',
      'Nearshoring supply chain monitoring for El Paso corridor',
    ],
    relatedTechIds: ['tech-rfid-tracking', 'tech-digital-freight', 'tech-trade-compliance-software', 'tech-fleet-management'],
  },

  'tech-digital-freight': {
    techId: 'tech-digital-freight',
    discoveredBy: [
      { name: 'Flexport (digital forwarding pioneer)', type: 'startup', country: 'US' },
      { name: 'MIT Transportation Lab', type: 'university', country: 'US' },
      { name: 'WTO Trade Facilitation', type: 'research-institute', country: 'CH' },
    ],
    studiedBy: [
      { name: 'UTEP Cross-Border Institute', type: 'university', country: 'US' },
      { name: 'Texas A&M International University', type: 'university', country: 'US' },
      { name: 'Brookings Institution', type: 'research-institute', country: 'US' },
    ],
    builtBy: [
      { name: 'Nuvocargo', type: 'startup', country: 'US' },
      { name: 'Flexport', type: 'enterprise', country: 'US' },
      { name: 'Forto (FreightHub)', type: 'startup', country: 'DE' },
      { name: 'Nowports', type: 'startup', country: 'MX' },
    ],
    usedBy: [
      { name: 'El Paso Customs Brokers', type: 'enterprise', country: 'US' },
      { name: 'Cross-Border Shippers (El Paso corridor)', type: 'enterprise', country: 'US' },
      { name: 'Juarez Maquiladora Exporters', type: 'enterprise', country: 'MX' },
    ],
    applications: [
      'Digital customs brokerage for US-Mexico freight',
      'Online quoting and booking for cross-border shipments',
      'Pedimento automation for maquiladora exports',
      'Document management for USMCA compliance',
      'Real-time border crossing status integration',
    ],
    relatedTechIds: ['tech-trade-compliance-software', 'tech-supply-chain-visibility', 'tech-rfid-tracking'],
  },

};

// ── Backward compatibility ──────────────────────────────────────────────────

/** @deprecated Use TECH_KNOWLEDGE_GRAPH record instead */
export const KNOWLEDGE_GRAPH_DATA: TechKnowledgeNode[] = Object.values(TECH_KNOWLEDGE_GRAPH);

// ── Helper Functions ────────────────────────────────────────────────────────

/**
 * Look up the knowledge graph node for a given technology ID.
 */
export function getKnowledgeNode(techId: string): TechKnowledgeNode | undefined {
  return TECH_KNOWLEDGE_GRAPH[techId];
}

/**
 * Get all knowledge nodes as an array.
 */
export function getAllKnowledgeNodes(): TechKnowledgeNode[] {
  return Object.values(TECH_KNOWLEDGE_GRAPH);
}
