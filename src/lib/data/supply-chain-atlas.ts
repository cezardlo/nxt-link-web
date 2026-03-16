// Supply Chain Atlas — maps major technology products through their full supply chain
// stage order: raw_material → processing → manufacturing → assembly → distribution → market

export type SupplyChainStage =
  | 'raw_material'
  | 'processing'
  | 'manufacturing'
  | 'assembly'
  | 'distribution'
  | 'market';

export type BottleneckRisk = 'critical' | 'high' | 'medium' | 'low';

export type SupplyChainNode = {
  id: string;
  name: string;
  stage: SupplyChainStage;
  countries: string[]; // ISO-3166 alpha-2 codes
  companies: string[];
  bottleneck_risk: BottleneckRisk;
  alternatives: string[];
};

export type SupplyChain = {
  id: string;
  product: string;
  category: string;
  nodes: SupplyChainNode[];
  chokepoints: string[]; // node IDs that are single points of failure
  geopolitical_risks: string[];
};

export const SUPPLY_CHAINS: SupplyChain[] = [
  // ── Electric Vehicle Battery ─────────────────────────────────────────────────
  {
    id: 'ev-battery',
    product: 'Electric Vehicle Battery',
    category: 'Energy',
    nodes: [
      {
        id: 'lithium-mining',
        name: 'Lithium Mining',
        stage: 'raw_material',
        countries: ['AU', 'CL', 'AR', 'CN'],
        companies: ['Albemarle', 'SQM', 'Ganfeng'],
        bottleneck_risk: 'critical',
        alternatives: ['sodium-ion', 'solid-state'],
      },
      {
        id: 'cobalt-mining',
        name: 'Cobalt Mining',
        stage: 'raw_material',
        countries: ['CD', 'AU', 'RU'],
        companies: ['Glencore', 'Vale', 'China Molybdenum'],
        bottleneck_risk: 'critical',
        alternatives: ['cobalt-free LFP'],
      },
      {
        id: 'cathode-production',
        name: 'Cathode Material',
        stage: 'processing',
        countries: ['CN', 'JP', 'KR'],
        companies: ['Umicore', 'Sumitomo', 'CNGR'],
        bottleneck_risk: 'high',
        alternatives: ['vertical integration'],
      },
      {
        id: 'cell-manufacturing',
        name: 'Cell Manufacturing',
        stage: 'manufacturing',
        countries: ['CN', 'KR', 'JP', 'US'],
        companies: ['CATL', 'LG Energy', 'Panasonic', 'BYD'],
        bottleneck_risk: 'high',
        alternatives: ['domestic capacity'],
      },
      {
        id: 'pack-assembly',
        name: 'Battery Pack Assembly',
        stage: 'assembly',
        countries: ['US', 'DE', 'CN', 'KR'],
        companies: ['Tesla', 'VW', 'BYD', 'GM'],
        bottleneck_risk: 'medium',
        alternatives: [],
      },
      {
        id: 'ev-market',
        name: 'EV Manufacturers',
        stage: 'market',
        countries: ['US', 'CN', 'DE', 'JP', 'KR'],
        companies: ['Tesla', 'BYD', 'VW', 'Toyota', 'GM'],
        bottleneck_risk: 'low',
        alternatives: [],
      },
    ],
    chokepoints: ['cobalt-mining', 'cathode-production'],
    geopolitical_risks: [
      'Congo instability',
      'China dominance in processing',
      'US-China tech war',
    ],
  },

  // ── Advanced Semiconductor (<5nm) ────────────────────────────────────────────
  {
    id: 'advanced-chip',
    product: 'Advanced Semiconductor (<5nm)',
    category: 'AI Hardware',
    nodes: [
      {
        id: 'silicon-wafer',
        name: 'Silicon Wafer',
        stage: 'raw_material',
        countries: ['JP', 'DE', 'TW'],
        companies: ['Shin-Etsu', 'Sumco', 'GlobalWafers'],
        bottleneck_risk: 'high',
        alternatives: [],
      },
      {
        id: 'euv-lithography',
        name: 'EUV Lithography Equipment',
        stage: 'processing',
        countries: ['NL'],
        companies: ['ASML'],
        bottleneck_risk: 'critical',
        alternatives: ['none currently'],
      },
      {
        id: 'chip-design',
        name: 'Chip Architecture Design',
        stage: 'manufacturing',
        countries: ['US', 'GB'],
        companies: ['ARM', 'Intel', 'AMD', 'NVIDIA'],
        bottleneck_risk: 'high',
        alternatives: ['RISC-V open source'],
      },
      {
        id: 'chip-fab',
        name: 'Chip Fabrication',
        stage: 'manufacturing',
        countries: ['TW', 'KR', 'US'],
        companies: ['TSMC', 'Samsung', 'Intel Foundry'],
        bottleneck_risk: 'critical',
        alternatives: ['Intel 18A', 'Samsung GAA'],
      },
      {
        id: 'chip-testing',
        name: 'Testing & Packaging',
        stage: 'assembly',
        countries: ['TW', 'CN', 'MY'],
        companies: ['ASE', 'Amkor', 'JCET'],
        bottleneck_risk: 'medium',
        alternatives: [],
      },
      {
        id: 'chip-market',
        name: 'AI / Data Center Customers',
        stage: 'market',
        countries: ['US', 'CN', 'JP', 'EU'],
        companies: ['Google', 'Microsoft', 'Meta', 'Amazon', 'Alibaba'],
        bottleneck_risk: 'low',
        alternatives: [],
      },
    ],
    chokepoints: ['euv-lithography', 'chip-fab'],
    geopolitical_risks: [
      'Taiwan Strait tension',
      'US export controls on China',
      'ASML Dutch export rules',
    ],
  },

  // ── Military Drone System ────────────────────────────────────────────────────
  {
    id: 'military-drone',
    product: 'Military Drone System',
    category: 'Defense',
    nodes: [
      {
        id: 'drone-composites',
        name: 'Carbon Fiber / Composites',
        stage: 'raw_material',
        countries: ['JP', 'US', 'CN', 'DE'],
        companies: ['Toray', 'Hexcel', 'SGL'],
        bottleneck_risk: 'medium',
        alternatives: ['aluminum alloy'],
      },
      {
        id: 'drone-motors',
        name: 'Electric Motors',
        stage: 'processing',
        countries: ['CN', 'DE', 'US'],
        companies: ['T-Motor', 'Maxon', 'Allied Motion'],
        bottleneck_risk: 'high',
        alternatives: [],
      },
      {
        id: 'drone-compute',
        name: 'Edge AI Compute Module',
        stage: 'manufacturing',
        countries: ['US', 'TW'],
        companies: ['NVIDIA Jetson', 'Intel', 'Qualcomm'],
        bottleneck_risk: 'high',
        alternatives: [],
      },
      {
        id: 'drone-assembly',
        name: 'Airframe + Systems Integration',
        stage: 'assembly',
        countries: ['US', 'IL', 'CN', 'TR', 'UA'],
        companies: ['General Atomics', 'Elbit', 'DJI', 'Baykar', 'Shield AI'],
        bottleneck_risk: 'medium',
        alternatives: [],
      },
      {
        id: 'drone-market',
        name: 'Military / Government Buyers',
        stage: 'market',
        countries: ['US', 'IL', 'TR', 'UA', 'AE'],
        companies: ['US DoD', 'IDF', 'Turkish Armed Forces', 'NATO'],
        bottleneck_risk: 'low',
        alternatives: [],
      },
    ],
    chokepoints: ['drone-motors', 'drone-compute'],
    geopolitical_risks: [
      'Chinese motor dependency',
      'Export control on AI chips',
      'Ukraine conflict driving demand surge',
    ],
  },

  // ── mRNA Vaccine ─────────────────────────────────────────────────────────────
  {
    id: 'mrna-vaccine',
    product: 'mRNA Vaccine',
    category: 'Biotech / Pharma',
    nodes: [
      {
        id: 'mrna-lipids',
        name: 'Lipid Nanoparticle (LNP) Precursors',
        stage: 'raw_material',
        countries: ['DE', 'US', 'CA'],
        companies: ['Evonik', 'Merck KGaA', 'Precision NanoSystems'],
        bottleneck_risk: 'critical',
        alternatives: ['polymer nanoparticles', 'exosomes'],
      },
      {
        id: 'mrna-synthesis',
        name: 'mRNA Sequence Synthesis',
        stage: 'processing',
        countries: ['US', 'DE'],
        companies: ['Moderna', 'BioNTech', 'Thermo Fisher'],
        bottleneck_risk: 'high',
        alternatives: ['self-amplifying mRNA'],
      },
      {
        id: 'mrna-fill-finish',
        name: 'Fill-Finish Manufacturing',
        stage: 'manufacturing',
        countries: ['US', 'DE', 'BE', 'IN'],
        companies: ['Lonza', 'Catalent', 'Samsung Biologics'],
        bottleneck_risk: 'high',
        alternatives: ['distributed manufacturing'],
      },
      {
        id: 'mrna-cold-chain',
        name: 'Ultra-Cold Chain Logistics',
        stage: 'distribution',
        countries: ['US', 'DE', 'CH', 'IN'],
        companies: ['DHL', 'UPS Healthcare', 'World Courier'],
        bottleneck_risk: 'high',
        alternatives: ['thermostable formulations'],
      },
      {
        id: 'mrna-market',
        name: 'Healthcare Systems / Governments',
        stage: 'market',
        countries: ['US', 'EU', 'JP', 'IN', 'BR'],
        companies: ['WHO COVAX', 'CDC', 'NHS', 'GAVI'],
        bottleneck_risk: 'low',
        alternatives: [],
      },
    ],
    chokepoints: ['mrna-lipids', 'mrna-fill-finish'],
    geopolitical_risks: [
      'LNP ingredient concentration in few suppliers',
      'Cold chain infrastructure gaps in low-income countries',
      'IP disputes blocking generic production',
    ],
  },

  // ── LiDAR Sensor ────────────────────────────────────────────────────────────
  {
    id: 'lidar-sensor',
    product: 'LiDAR Sensor',
    category: 'Autonomous Systems',
    nodes: [
      {
        id: 'lidar-laser',
        name: 'Laser Diode / VCSEL',
        stage: 'raw_material',
        countries: ['DE', 'US', 'JP', 'CN'],
        companies: ['II-VI (Coherent)', 'Lumentum', 'Osram'],
        bottleneck_risk: 'high',
        alternatives: ['MEMS-based scanning'],
      },
      {
        id: 'lidar-detector',
        name: 'Photodetector (APD / SPAD)',
        stage: 'processing',
        countries: ['JP', 'DE', 'US'],
        companies: ['Hamamatsu', 'ams OSRAM', 'First Sensor'],
        bottleneck_risk: 'high',
        alternatives: [],
      },
      {
        id: 'lidar-asic',
        name: 'Signal Processing ASIC',
        stage: 'manufacturing',
        countries: ['US', 'TW'],
        companies: ['Texas Instruments', 'TSMC', 'Qualcomm'],
        bottleneck_risk: 'medium',
        alternatives: ['FPGA-based processing'],
      },
      {
        id: 'lidar-module',
        name: 'Sensor Module Assembly',
        stage: 'assembly',
        countries: ['US', 'CN', 'DE'],
        companies: ['Velodyne', 'Luminar', 'Hesai', 'Innoviz'],
        bottleneck_risk: 'medium',
        alternatives: [],
      },
      {
        id: 'lidar-market',
        name: 'AV / Robotics / Mapping Customers',
        stage: 'market',
        countries: ['US', 'CN', 'DE', 'JP'],
        companies: ['Waymo', 'Tesla', 'Bosch', 'Toyota Research'],
        bottleneck_risk: 'low',
        alternatives: [],
      },
    ],
    chokepoints: ['lidar-laser', 'lidar-detector'],
    geopolitical_risks: [
      'China dominance in low-cost LiDAR (Hesai / RoboSense)',
      'US export restrictions on photonic components',
      'Supply crunch on VCSELs shared with 3D face-ID market',
    ],
  },

  // ── Humanoid Robot ───────────────────────────────────────────────────────────
  {
    id: 'humanoid-robot',
    product: 'Humanoid Robot',
    category: 'Robotics / AI',
    nodes: [
      {
        id: 'robot-actuators',
        name: 'Harmonic Drive Actuators',
        stage: 'raw_material',
        countries: ['JP', 'DE', 'CN'],
        companies: ['Harmonic Drive Systems', 'KUKA', 'Maxon'],
        bottleneck_risk: 'critical',
        alternatives: ['cable-driven tendons', 'hydraulic actuators'],
      },
      {
        id: 'robot-sensors',
        name: 'Force / Tactile Sensors',
        stage: 'processing',
        countries: ['JP', 'US', 'DE'],
        companies: ['ATI Industrial', 'Weiss Robotics', 'BeSensing'],
        bottleneck_risk: 'high',
        alternatives: [],
      },
      {
        id: 'robot-ai-chip',
        name: 'On-Board AI Inference Chip',
        stage: 'manufacturing',
        countries: ['US', 'TW'],
        companies: ['NVIDIA Orin', 'Qualcomm', 'Google TPU'],
        bottleneck_risk: 'high',
        alternatives: ['custom neuromorphic chips'],
      },
      {
        id: 'robot-assembly',
        name: 'Full Robot Assembly & Integration',
        stage: 'assembly',
        countries: ['US', 'CN', 'JP'],
        companies: ['Boston Dynamics', 'Figure AI', 'Agility', '1X Technologies', 'Unitree'],
        bottleneck_risk: 'medium',
        alternatives: [],
      },
      {
        id: 'robot-market',
        name: 'Manufacturing / Logistics / Healthcare',
        stage: 'market',
        countries: ['US', 'CN', 'DE', 'JP', 'KR'],
        companies: ['BMW', 'Amazon', 'Tesla', 'GE HealthCare'],
        bottleneck_risk: 'low',
        alternatives: [],
      },
    ],
    chokepoints: ['robot-actuators', 'robot-ai-chip'],
    geopolitical_risks: [
      'Japan monopoly on precision actuators',
      'China building domestic humanoid supply chain (Unitree, UBTECH)',
      'AI chip export controls limiting Chinese assembly',
    ],
  },

  // ── Solar Panel ──────────────────────────────────────────────────────────────
  {
    id: 'solar-panel',
    product: 'Utility-Scale Solar Panel',
    category: 'Clean Energy',
    nodes: [
      {
        id: 'solar-polysilicon',
        name: 'Polysilicon Production',
        stage: 'raw_material',
        countries: ['CN', 'DE', 'US', 'MY'],
        companies: ['Daqo New Energy', 'GCL', 'Wacker Chemie', 'OCI'],
        bottleneck_risk: 'critical',
        alternatives: ['cadmium telluride thin film', 'perovskite'],
      },
      {
        id: 'solar-ingot-wafer',
        name: 'Ingot & Wafer Slicing',
        stage: 'processing',
        countries: ['CN', 'MY', 'VN'],
        companies: ['LONGi', 'Zhonghuan', 'Jinko Solar'],
        bottleneck_risk: 'high',
        alternatives: [],
      },
      {
        id: 'solar-cell',
        name: 'Photovoltaic Cell Fabrication',
        stage: 'manufacturing',
        countries: ['CN', 'TW', 'US', 'KR'],
        companies: ['LONGi', 'JA Solar', 'First Solar', 'Hanwha Q CELLS'],
        bottleneck_risk: 'high',
        alternatives: ['perovskite tandem cells'],
      },
      {
        id: 'solar-module',
        name: 'Module Assembly',
        stage: 'assembly',
        countries: ['CN', 'VN', 'MY', 'US', 'IN'],
        companies: ['Jinko Solar', 'Trina Solar', 'Canadian Solar'],
        bottleneck_risk: 'medium',
        alternatives: [],
      },
      {
        id: 'solar-market',
        name: 'Utility / Commercial Installers',
        stage: 'market',
        countries: ['US', 'CN', 'DE', 'IN', 'AU'],
        companies: ['NextEra Energy', 'Enel', 'Adani', 'SunPower'],
        bottleneck_risk: 'low',
        alternatives: [],
      },
    ],
    chokepoints: ['solar-polysilicon', 'solar-ingot-wafer'],
    geopolitical_risks: [
      'China controls ~80% of polysilicon and wafer production',
      'US tariffs on Chinese solar panels',
      'Xinjiang forced-labor supply chain scrutiny (UFLPA)',
    ],
  },

  // ── Satellite ────────────────────────────────────────────────────────────────
  {
    id: 'commercial-satellite',
    product: 'Commercial LEO Satellite',
    category: 'Space / Telecom',
    nodes: [
      {
        id: 'sat-materials',
        name: 'Aerospace-Grade Aluminum / Composites',
        stage: 'raw_material',
        countries: ['US', 'DE', 'JP', 'FR'],
        companies: ['Alcoa', 'Toray', 'Arconic'],
        bottleneck_risk: 'low',
        alternatives: [],
      },
      {
        id: 'sat-rf-components',
        name: 'RF / Phased-Array Components',
        stage: 'processing',
        countries: ['US', 'GB', 'JP'],
        companies: ['Raytheon', 'Ball Aerospace', 'L3Harris'],
        bottleneck_risk: 'high',
        alternatives: ['software-defined radio'],
      },
      {
        id: 'sat-bus',
        name: 'Satellite Bus Manufacturing',
        stage: 'manufacturing',
        countries: ['US', 'FR', 'GB', 'IL'],
        companies: ['Airbus Defence', 'Thales Alenia', 'MDA', 'Orbital Sciences'],
        bottleneck_risk: 'high',
        alternatives: ['small-sat COTS platforms'],
      },
      {
        id: 'sat-integration',
        name: 'Payload Integration & Testing',
        stage: 'assembly',
        countries: ['US', 'FR', 'GB', 'JP'],
        companies: ['SpaceX', 'Northrop Grumman', 'Boeing', 'JAXA'],
        bottleneck_risk: 'medium',
        alternatives: [],
      },
      {
        id: 'sat-launch',
        name: 'Launch Services',
        stage: 'distribution',
        countries: ['US', 'FR', 'RU', 'CN', 'IN'],
        companies: ['SpaceX Falcon 9', 'Arianespace', 'ULA', 'ISRO'],
        bottleneck_risk: 'high',
        alternatives: ['Rocket Lab Electron', 'New Glenn'],
      },
      {
        id: 'sat-market',
        name: 'Telecom / Earth Observation / Gov',
        stage: 'market',
        countries: ['US', 'EU', 'CN', 'IN', 'AE'],
        companies: ['Starlink', 'OneWeb', 'SES', 'Intelsat'],
        bottleneck_risk: 'low',
        alternatives: [],
      },
    ],
    chokepoints: ['sat-rf-components', 'sat-launch'],
    geopolitical_risks: [
      'Russia Soyuz unavailable post-Ukraine war',
      'ITAR restrictions on US satellite components',
      'China anti-satellite (ASAT) threat to LEO constellations',
    ],
  },

  // ── Cybersecurity Platform (software) ────────────────────────────────────────
  {
    id: 'cybersecurity-platform',
    product: 'Enterprise Cybersecurity Platform',
    category: 'Cybersecurity',
    nodes: [
      {
        id: 'cyber-threat-intel',
        name: 'Threat Intelligence Data',
        stage: 'raw_material',
        countries: ['US', 'IL', 'RU', 'CN'],
        companies: ['Recorded Future', 'Mandiant', 'CrowdStrike Intel', 'VirusTotal'],
        bottleneck_risk: 'medium',
        alternatives: ['open-source CTI (MISP, OpenCTI)'],
      },
      {
        id: 'cyber-ml-models',
        name: 'AI / ML Detection Models',
        stage: 'processing',
        countries: ['US', 'IL', 'GB'],
        companies: ['CrowdStrike', 'Darktrace', 'Vectra AI'],
        bottleneck_risk: 'medium',
        alternatives: ['rule-based SIEM', 'open-source YARA'],
      },
      {
        id: 'cyber-cloud-infra',
        name: 'Cloud Infrastructure (Compute + Storage)',
        stage: 'manufacturing',
        countries: ['US', 'IE', 'DE'],
        companies: ['AWS GovCloud', 'Azure', 'Google Cloud'],
        bottleneck_risk: 'high',
        alternatives: ['on-premise HSM clusters'],
      },
      {
        id: 'cyber-platform',
        name: 'Platform Development & Integration',
        stage: 'assembly',
        countries: ['US', 'IL', 'GB', 'AU'],
        companies: ['Palo Alto Networks', 'CrowdStrike', 'SentinelOne', 'Wiz'],
        bottleneck_risk: 'medium',
        alternatives: [],
      },
      {
        id: 'cyber-mssp',
        name: 'MSSP / Channel Distribution',
        stage: 'distribution',
        countries: ['US', 'GB', 'AU', 'SG'],
        companies: ['IBM Security', 'Deloitte Cyber', 'Accenture Security'],
        bottleneck_risk: 'low',
        alternatives: [],
      },
      {
        id: 'cyber-market',
        name: 'Enterprise / Government Buyers',
        stage: 'market',
        countries: ['US', 'EU', 'AU', 'SG', 'IL'],
        companies: ['Fortune 500 CISOs', 'DoD CMMC', 'NHS Digital', 'CISA'],
        bottleneck_risk: 'low',
        alternatives: [],
      },
    ],
    chokepoints: ['cyber-cloud-infra', 'cyber-threat-intel'],
    geopolitical_risks: [
      'Russian / North Korean state actors as persistent threat source',
      'Israeli cyber talent concentration (Unit 8200 alumni)',
      'US cloud hyperscaler dependency for gov-classified workloads',
    ],
  },

  // ── Hydrogen Electrolyzer ────────────────────────────────────────────────────
  {
    id: 'hydrogen-electrolyzer',
    product: 'Green Hydrogen Electrolyzer',
    category: 'Clean Energy',
    nodes: [
      {
        id: 'h2-iridium',
        name: 'Iridium / Platinum Group Metals',
        stage: 'raw_material',
        countries: ['ZA', 'RU', 'ZW'],
        companies: ['Anglo American Platinum', 'Norilsk Nickel', 'Zimplats'],
        bottleneck_risk: 'critical',
        alternatives: ['PGM-free catalysts (Fe-N-C)', 'AEM electrolyzers'],
      },
      {
        id: 'h2-membrane',
        name: 'PEM Membrane (Nafion)',
        stage: 'processing',
        countries: ['US', 'JP'],
        companies: ['Chemours (Nafion)', 'Solvay', 'Asahi Kasei'],
        bottleneck_risk: 'critical',
        alternatives: ['anion exchange membrane (AEM)', 'SOEC ceramic'],
      },
      {
        id: 'h2-stack',
        name: 'Electrolyzer Stack Manufacturing',
        stage: 'manufacturing',
        countries: ['DE', 'NO', 'CN', 'US'],
        companies: ['Nel Hydrogen', 'ITM Power', 'ThyssenKrupp nucera', '华熵能源'],
        bottleneck_risk: 'high',
        alternatives: ['alkaline electrolysis (lower cost)'],
      },
      {
        id: 'h2-bop',
        name: 'Balance of Plant Assembly',
        stage: 'assembly',
        countries: ['DE', 'US', 'CN', 'JP'],
        companies: ['Siemens Energy', 'Air Liquide', 'Air Products'],
        bottleneck_risk: 'medium',
        alternatives: [],
      },
      {
        id: 'h2-distribution',
        name: 'H₂ Storage & Pipeline Distribution',
        stage: 'distribution',
        countries: ['DE', 'NL', 'JP', 'SA'],
        companies: ['Linde', 'Air Products', 'JERA', 'Saudi Aramco'],
        bottleneck_risk: 'high',
        alternatives: ['ammonia carrier (NH₃)', 'liquid organic hydrogen'],
      },
      {
        id: 'h2-market',
        name: 'Industrial / Mobility / Power Buyers',
        stage: 'market',
        countries: ['DE', 'JP', 'KR', 'US', 'AU'],
        companies: ['Hyundai', 'Toyota', 'POSCO', 'Thyssenkrupp Steel'],
        bottleneck_risk: 'low',
        alternatives: [],
      },
    ],
    chokepoints: ['h2-iridium', 'h2-membrane'],
    geopolitical_risks: [
      'South Africa and Russia control >90% of iridium supply',
      'US Nafion membrane monopoly risk',
      'EU hydrogen import dependence on North Africa and Gulf states',
    ],
  },
];
