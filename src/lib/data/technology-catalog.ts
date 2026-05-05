// Technology catalog — 50+ technologies tracked by NXT//LINK
// Used for capability tagging, procurement signal matching, and vendor alignment

export type TechMaturity = 'emerging' | 'growing' | 'mature';

export type TechCategory =
  | 'AI/ML'
  | 'Cybersecurity'
  | 'Defense'
  | 'Border Tech'
  | 'Manufacturing'
  | 'Energy'
  | 'Healthcare'
  | 'Logistics';

export type Technology = {
  id: string;
  name: string;
  category: TechCategory;
  description: string;
  maturityLevel: TechMaturity;
  relatedVendorCount: number;
  // NXT//LINK intelligence metadata
  procurementSignalKeywords: string[];   // Keywords that signal a procurement opportunity
  elPasoRelevance: 'high' | 'medium' | 'low';
  governmentBudgetFY25M?: number;        // Approximate US government FY25 spending (USD millions)
};

export const TECHNOLOGY_CATALOG: Technology[] = [

  // ── AI / ML ──────────────────────────────────────────────────────────────

  {
    id: 'tech-computer-vision',
    name: 'Computer Vision',
    category: 'AI/ML',
    description: 'Automated image and video analysis enabling object detection, facial recognition, license plate reading, and anomaly identification. Core technology for border surveillance, UAS payload processing, and manufacturing quality inspection.',
    maturityLevel: 'mature',
    relatedVendorCount: 48,
    procurementSignalKeywords: ['computer vision contract', 'video analytics', 'automated surveillance', 'image recognition award', 'CV system deployment'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 2800,
  },

  {
    id: 'tech-nlp',
    name: 'Natural Language Processing (NLP)',
    category: 'AI/ML',
    description: 'AI systems that understand, process, and generate human language. Critical for bilingual government services in El Paso, CBP document processing, intelligence report summarization, and health record analysis in Spanish-English clinical settings.',
    maturityLevel: 'mature',
    relatedVendorCount: 62,
    procurementSignalKeywords: ['nlp contract', 'language ai', 'text analytics award', 'conversational ai', 'document intelligence'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 1950,
  },

  {
    id: 'tech-reinforcement-learning',
    name: 'Reinforcement Learning',
    category: 'AI/ML',
    description: 'Training AI agents through reward-based feedback loops. Powers autonomous weapons guidance, robotic manipulation in unstructured environments, and adaptive logistics routing under dynamic conditions.',
    maturityLevel: 'growing',
    relatedVendorCount: 22,
    procurementSignalKeywords: ['autonomous agent ai', 'rl system contract', 'adaptive ai platform', 'reinforcement learning defense'],
    elPasoRelevance: 'medium',
    governmentBudgetFY25M: 620,
  },

  {
    id: 'tech-generative-ai',
    name: 'Generative AI',
    category: 'AI/ML',
    description: 'Large language models, diffusion models, and multimodal AI generating text, images, code, and synthetic data. Rapidly being integrated into defense decision support (Palantir AIP), intelligence analysis, and government service delivery.',
    maturityLevel: 'growing',
    relatedVendorCount: 85,
    procurementSignalKeywords: ['generative ai contract', 'llm deployment', 'gpt government', 'foundation model award', 'ai copilot'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 3200,
  },

  {
    id: 'tech-mlops',
    name: 'MLOps / AI Platform',
    category: 'AI/ML',
    description: 'Infrastructure and tooling for deploying, monitoring, and maintaining machine learning models in production. DoD CDAO and Army AI mandates require MLOps platforms for responsible AI governance, model versioning, and performance drift detection.',
    maturityLevel: 'growing',
    relatedVendorCount: 34,
    procurementSignalKeywords: ['mlops platform', 'ai governance contract', 'model lifecycle management', 'cdao program'],
    elPasoRelevance: 'medium',
    governmentBudgetFY25M: 840,
  },

  {
    id: 'tech-edge-ai',
    name: 'Edge AI / Tactical AI',
    category: 'AI/ML',
    description: 'AI inference running on hardware at the point of action rather than in the cloud. Critical for denied, degraded, intermittent, and limited (DDIL) communications environments at Fort Bliss and forward deployed units.',
    maturityLevel: 'growing',
    relatedVendorCount: 28,
    procurementSignalKeywords: ['edge computing defense', 'tactical ai', 'ddil ai', 'battlefield edge', 'inference hardware military'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 1100,
  },

  {
    id: 'tech-anomaly-detection',
    name: 'AI Anomaly Detection',
    category: 'AI/ML',
    description: 'Unsupervised and semi-supervised learning to identify unusual patterns in network traffic, cargo manifests, financial transactions, and sensor data. Core to CBP fraud detection and Army cyber operations.',
    maturityLevel: 'mature',
    relatedVendorCount: 41,
    procurementSignalKeywords: ['anomaly detection award', 'fraud detection ai', 'behavioral analytics contract', 'insider threat detection'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 720,
  },

  // ── Cybersecurity ─────────────────────────────────────────────────────────

  {
    id: 'tech-zero-trust',
    name: 'Zero Trust Architecture (ZTA)',
    category: 'Cybersecurity',
    description: 'Security model requiring continuous verification of every user and device, eliminating implicit network trust. DoD ZTA mandate requires full implementation by FY27. Fort Bliss network modernization programs are primary implementation vehicles.',
    maturityLevel: 'growing',
    relatedVendorCount: 52,
    procurementSignalKeywords: ['zero trust contract', 'zta implementation', 'identity verification dod', 'microsegmentation award', 'nist zta'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 2400,
  },

  {
    id: 'tech-siem',
    name: 'SIEM / Security Analytics',
    category: 'Cybersecurity',
    description: 'Security Information and Event Management platforms aggregating and correlating security events across enterprise networks. Army ARCYBER mandates SIEM coverage for all NIPR and SIPR networks, including Fort Bliss garrison systems.',
    maturityLevel: 'mature',
    relatedVendorCount: 38,
    procurementSignalKeywords: ['siem deployment', 'security operations center', 'soc contract', 'event correlation platform', 'splunk army'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 1650,
  },

  {
    id: 'tech-edr',
    name: 'Endpoint Detection & Response (EDR)',
    category: 'Cybersecurity',
    description: 'Continuous monitoring and automated response on endpoint devices — laptops, servers, mobile devices — for malware, ransomware, and advanced persistent threats. DISA HBSS successor programs are deploying EDR across DoD including Fort Bliss.',
    maturityLevel: 'mature',
    relatedVendorCount: 22,
    procurementSignalKeywords: ['edr contract', 'endpoint security award', 'hbss replacement', 'disa endpoint', 'falcon deployment'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 1900,
  },

  {
    id: 'tech-threat-intel',
    name: 'Cyber Threat Intelligence',
    category: 'Cybersecurity',
    description: 'Structured intelligence feeds, indicators of compromise (IOCs), and adversary TTPs shared across government and commercial networks. Army ARCYBER and CBP both consume commercial threat intelligence to protect El Paso-area critical infrastructure.',
    maturityLevel: 'mature',
    relatedVendorCount: 45,
    procurementSignalKeywords: ['threat intelligence contract', 'cti platform', 'ioc feed award', 'threat feed government', 'isac integration'],
    elPasoRelevance: 'medium',
    governmentBudgetFY25M: 880,
  },

  {
    id: 'tech-ics-ot-security',
    name: 'ICS / OT Cybersecurity',
    category: 'Cybersecurity',
    description: 'Security monitoring and protection for industrial control systems, SCADA, and operational technology networks. Critical for El Paso Electric grid infrastructure, water utility SCADA, and Fort Bliss installation control systems.',
    maturityLevel: 'growing',
    relatedVendorCount: 18,
    procurementSignalKeywords: ['ics security contract', 'scada security award', 'ot monitoring', 'cisa critical infrastructure', 'purdue model security'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 540,
  },

  {
    id: 'tech-devsecops',
    name: 'DevSecOps',
    category: 'Cybersecurity',
    description: 'Integration of security practices into DevOps software development pipelines. DoD Instruction 5000.87 mandates DevSecOps for all software acquisition programs, creating large demand for toolchains and training across Army programs at Fort Bliss.',
    maturityLevel: 'growing',
    relatedVendorCount: 31,
    procurementSignalKeywords: ['devsecops contract', 'software factory', 'dod platform one', 'il4 il5 environment', 'secure sdlc award'],
    elPasoRelevance: 'medium',
    governmentBudgetFY25M: 1200,
  },

  // ── Defense ───────────────────────────────────────────────────────────────

  {
    id: 'tech-isr',
    name: 'Intelligence, Surveillance & Reconnaissance (ISR)',
    category: 'Defense',
    description: 'Collection, processing, and exploitation of intelligence from sensor platforms including satellites, manned aircraft, UAS, and ground-based systems. L3Harris, Leidos, and Northrop Grumman are primary ISR system integrators at Fort Bliss.',
    maturityLevel: 'mature',
    relatedVendorCount: 38,
    procurementSignalKeywords: ['isr contract', 'surveillance aircraft award', 'ew isr', 'sigint program', 'manned unmanned teaming'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 8400,
  },

  {
    id: 'tech-electronic-warfare',
    name: 'Electronic Warfare (EW)',
    category: 'Defense',
    description: 'Capabilities for electromagnetic spectrum dominance including jamming, spoofing, and direction finding. Fort Bliss hosts the 915th Cyber Warfare Battalion and EW exercises. L3Harris and BAE Systems are key EW suppliers in the El Paso corridor.',
    maturityLevel: 'mature',
    relatedVendorCount: 24,
    procurementSignalKeywords: ['electronic warfare contract', 'ew system award', 'jammer program', 'ew pod', 'electromagnetic spectrum'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 5200,
  },

  {
    id: 'tech-autonomous-systems',
    name: 'Autonomous Systems / Robotics',
    category: 'Defense',
    description: 'Unmanned ground vehicles (UGVs), autonomous aerial systems, and robotic logistics platforms for contested environments. Army Robotic Combat Vehicle program and autonomous resupply tests are conducted at Fort Bliss ranges.',
    maturityLevel: 'growing',
    relatedVendorCount: 42,
    procurementSignalKeywords: ['autonomous systems contract', 'ugv program', 'rcv award', 'uncrewed vehicle', 'robotic combat vehicle'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 3800,
  },

  {
    id: 'tech-c4isr',
    name: 'C4ISR Systems',
    category: 'Defense',
    description: 'Command, Control, Communications, Computers, Intelligence, Surveillance, and Reconnaissance — the integrated backbone of Army digital warfare. IBCS at Fort Bliss is the Army\'s most ambitious C4ISR modernization program, integrating air and missile defense under Northrop Grumman.',
    maturityLevel: 'mature',
    relatedVendorCount: 55,
    procurementSignalKeywords: ['c4isr contract', 'ibcs program', 'command system award', 'battle management system', 'tactical network'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 12500,
  },

  {
    id: 'tech-hypersonics',
    name: 'Hypersonic Weapons & Defense',
    category: 'Defense',
    description: 'Weapons and interceptor systems operating at Mach 5+. Raytheon and Northrop Grumman are developing hypersonic interceptor technologies tested at White Sands Missile Range, which borders El Paso. Major growth area in Army AHW and Dark Eagle programs.',
    maturityLevel: 'growing',
    relatedVendorCount: 12,
    procurementSignalKeywords: ['hypersonic contract', 'ahw program', 'dark eagle', 'glide phase interceptor', 'mach 5 weapon'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 6800,
  },

  {
    id: 'tech-directed-energy',
    name: 'Directed Energy Weapons',
    category: 'Defense',
    description: 'Laser and high-power microwave systems for counter-UAS, cruise missile defense, and force protection. White Sands Missile Range is a primary US directed energy test facility; Army programs include the SHORAD Laser system.',
    maturityLevel: 'growing',
    relatedVendorCount: 15,
    procurementSignalKeywords: ['directed energy award', 'high energy laser', 'hel system', 'counter uas laser', 'de weapons program'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 2100,
  },

  // ── Border Tech ───────────────────────────────────────────────────────────

  {
    id: 'tech-biometrics',
    name: 'Biometric Identity Systems',
    category: 'Border Tech',
    description: 'Facial recognition, fingerprint, iris, and gait-based identification systems for border processing, trusted traveler programs, and access control. CBP is deploying biometrics at all El Paso ports of entry under the Biometric Entry-Exit program.',
    maturityLevel: 'mature',
    relatedVendorCount: 28,
    procurementSignalKeywords: ['biometrics contract', 'facial recognition cbp', 'biometric entry exit', 'identity verification award', 'sentri enrollment'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 890,
  },

  {
    id: 'tech-rfid-tracking',
    name: 'RFID / IoT Asset Tracking',
    category: 'Border Tech',
    description: 'Radio-frequency identification and IoT sensor networks for real-time cargo and vehicle tracking through ports of entry. C-TPAT trusted shipper programs require RFID-enabled supply chain visibility from Juárez factories to US distribution centers.',
    maturityLevel: 'mature',
    relatedVendorCount: 35,
    procurementSignalKeywords: ['rfid deployment', 'asset tracking contract', 'cargo visibility award', 'c-tpat rfid', 'supply chain tracking'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 320,
  },

  {
    id: 'tech-cargo-scanning',
    name: 'Non-Intrusive Inspection (NII) / Cargo Scanning',
    category: 'Border Tech',
    description: 'X-ray, gamma-ray, and neutron-based scanning systems for detecting contraband, weapons, and undeclared goods in commercial cargo. CBP operates large-scale NII systems at all El Paso commercial ports handling $100B+ in annual USMCA trade.',
    maturityLevel: 'mature',
    relatedVendorCount: 14,
    procurementSignalKeywords: ['nii system award', 'cargo scanner contract', 'x-ray inspection border', 'automated targeting system', 'cbp scanning'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 780,
  },

  {
    id: 'tech-surveillance-systems',
    name: 'Border Surveillance Systems',
    category: 'Border Tech',
    description: 'Integrated fixed tower, mobile surveillance, and persistent ground sensor systems for border situational awareness. CBP\'s Integrated Fixed Towers (IFT) program — supplied by Elbit Systems of America — covers the El Paso sector.',
    maturityLevel: 'mature',
    relatedVendorCount: 18,
    procurementSignalKeywords: ['border surveillance contract', 'ift tower award', 'cbp tower program', 'persistent surveillance', 'ground sensor deployment'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 1400,
  },

  {
    id: 'tech-trade-compliance-software',
    name: 'Trade Compliance & Customs Software',
    category: 'Border Tech',
    description: 'Automated Export System (AES), Automated Commercial Environment (ACE), and USMCA certificate-of-origin platforms. Over 500 El Paso customs brokers and maquiladora operators require ACE-certified software for US-Mexico cross-border trade.',
    maturityLevel: 'mature',
    relatedVendorCount: 22,
    procurementSignalKeywords: ['ace integration award', 'customs software contract', 'usmca compliance platform', 'atf export license', 'pedimento software'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 240,
  },

  // ── Manufacturing ─────────────────────────────────────────────────────────

  {
    id: 'tech-industry40',
    name: 'Industry 4.0 / Smart Manufacturing',
    category: 'Manufacturing',
    description: 'Integration of cyber-physical systems, IoT sensors, and data analytics into factory operations. El Paso-Juárez maquiladoras are aggressively adopting Industry 4.0 to compete with Asian manufacturing cost structures and satisfy nearshoring customer requirements.',
    maturityLevel: 'growing',
    relatedVendorCount: 68,
    procurementSignalKeywords: ['smart factory deployment', 'industry 4.0 contract', 'digital factory award', 'connected manufacturing', 'oee improvement program'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 380,
  },

  {
    id: 'tech-additive-manufacturing',
    name: 'Additive Manufacturing (3D Printing)',
    category: 'Manufacturing',
    description: 'Metal and polymer 3D printing for on-demand spare parts, tooling, and structural components. Army Organic Industrial Base (OIB) is investing in additive manufacturing depots; UTEP Advanced Manufacturing Center is a certified Army research partner.',
    maturityLevel: 'growing',
    relatedVendorCount: 32,
    procurementSignalKeywords: ['additive manufacturing contract', '3d printing award', 'metal am program', 'army oib additive', 'rapid prototyping dod'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 480,
  },

  {
    id: 'tech-digital-twin',
    name: 'Digital Twin',
    category: 'Manufacturing',
    description: 'Virtual replicas of physical assets, processes, and systems updated in real time from sensor data. Applied to aircraft maintenance at Fort Bliss, maquiladora process optimization, and El Paso Water infrastructure modeling.',
    maturityLevel: 'growing',
    relatedVendorCount: 29,
    procurementSignalKeywords: ['digital twin contract', 'virtual model award', 'simulation platform deployment', 'predictive maintenance twin', 'asset twin program'],
    elPasoRelevance: 'medium',
    governmentBudgetFY25M: 650,
  },

  {
    id: 'tech-predictive-maintenance',
    name: 'Predictive Maintenance (PdM)',
    category: 'Manufacturing',
    description: 'AI and sensor-based forecasting of equipment failure before it occurs. Army\'s organic industrial base and Fort Bliss vehicle fleet use PdM to reduce unscheduled maintenance. Maquiladora operators apply PdM to maximize uptime on high-value CNC and injection molding assets.',
    maturityLevel: 'mature',
    relatedVendorCount: 44,
    procurementSignalKeywords: ['predictive maintenance contract', 'pdm program award', 'condition based maintenance', 'cbm+ army', 'equipment health monitoring'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 520,
  },

  {
    id: 'tech-cobotics',
    name: 'Collaborative Robotics (Cobots)',
    category: 'Manufacturing',
    description: 'Lightweight robot arms designed to work alongside human operators without safety cages. Rapidly adopted in Juárez maquiladora assembly lines to address labor cost pressures and improve ergonomics in wiring harness and electronics production.',
    maturityLevel: 'growing',
    relatedVendorCount: 38,
    procurementSignalKeywords: ['cobot deployment', 'collaborative robot award', 'ur5 integration', 'human robot collaboration', 'assembly automation'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 180,
  },

  // ── Energy ────────────────────────────────────────────────────────────────

  {
    id: 'tech-smart-grid',
    name: 'Smart Grid / Grid Modernization',
    category: 'Energy',
    description: 'Advanced metering, distribution automation, and demand response technology enabling bidirectional power flow and real-time grid management. El Paso Electric\'s $1.8B capex plan is one of the most ambitious smart grid programs of any Texas utility.',
    maturityLevel: 'growing',
    relatedVendorCount: 42,
    procurementSignalKeywords: ['smart grid contract', 'grid modernization award', 'ami deployment', 'distribution automation', 'derms program'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 2800,
  },

  {
    id: 'tech-utility-scale-solar',
    name: 'Utility-Scale Solar',
    category: 'Energy',
    description: 'Photovoltaic and concentrating solar power installations of 10 MW+. El Paso averages 297 sunny days/year, making it one of the best US solar resource areas. NextEra, Abengoa, and First Solar have or are developing major utility-scale projects in the EPE service territory.',
    maturityLevel: 'mature',
    relatedVendorCount: 28,
    procurementSignalKeywords: ['utility solar contract', 'ppa award solar', 'solar farm development', 'photovoltaic installation', 'solar epc contract'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 1200,
  },

  {
    id: 'tech-battery-storage',
    name: 'Battery Energy Storage Systems (BESS)',
    category: 'Energy',
    description: 'Lithium-ion and emerging battery chemistries providing grid-scale energy storage to firm renewable generation, support ancillary services, and enable microgrid islanding. Fort Bliss installation energy resilience program includes BESS for critical facility backup.',
    maturityLevel: 'growing',
    relatedVendorCount: 24,
    procurementSignalKeywords: ['battery storage contract', 'bess deployment', 'grid storage award', 'microgrid storage', 'resilience energy storage'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 1800,
  },

  {
    id: 'tech-microgrid',
    name: 'Military / Resilient Microgrids',
    category: 'Energy',
    description: 'Islanded electrical networks combining solar, storage, and backup generation to maintain power during grid outages. Army Installation Energy Resilience program is funding microgrids at Fort Bliss critical facilities including WBAMC and C2 nodes.',
    maturityLevel: 'growing',
    relatedVendorCount: 19,
    procurementSignalKeywords: ['microgrid contract', 'installation energy resilience', 'army microgrid award', 'islanding capability', 'cep energy program'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 680,
  },

  {
    id: 'tech-grid-ai',
    name: 'AI for Grid Operations',
    category: 'Energy',
    description: 'Machine learning models for demand forecasting, fault detection, load balancing, and automated switching in electrical grids. El Paso Electric and ERCOT are piloting AI-driven operational tools to manage rapid growth in solar intermittency.',
    maturityLevel: 'growing',
    relatedVendorCount: 22,
    procurementSignalKeywords: ['grid ai contract', 'demand forecasting award', 'grid intelligence platform', 'automated grid management', 'utility ai program'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 340,
  },

  // ── Healthcare ────────────────────────────────────────────────────────────

  {
    id: 'tech-telemedicine',
    name: 'Telemedicine / Virtual Care',
    category: 'Healthcare',
    description: 'Remote patient consultation, monitoring, and care delivery platforms. High strategic value in El Paso as a bi-national city with large rural West Texas catchment area and military health system needs at WBAMC and Fort Bliss clinics.',
    maturityLevel: 'mature',
    relatedVendorCount: 36,
    procurementSignalKeywords: ['telemedicine contract', 'virtual care award', 'telehealth platform', 'remote patient monitoring', 'mhs telehealth'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 1400,
  },

  {
    id: 'tech-ehr',
    name: 'Electronic Health Records (EHR)',
    category: 'Healthcare',
    description: 'Digital patient record systems integrating clinical data, billing, and population health management. MHS Genesis (DoD Cerner-based EHR) is deployed at WBAMC. UMC operates Epic. TTUHSC and El Paso Children\'s drive regional health data interoperability.',
    maturityLevel: 'mature',
    relatedVendorCount: 18,
    procurementSignalKeywords: ['ehr deployment contract', 'epic implementation', 'mhs genesis award', 'cerner contract', 'hl7 fhir integration'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 2200,
  },

  {
    id: 'tech-medical-imaging-ai',
    name: 'Medical Imaging AI',
    category: 'Healthcare',
    description: 'Deep learning algorithms for automated detection and characterization in radiology (CT, MRI, X-ray), pathology, and ophthalmology. Tenet Health Sierra and UMC are actively evaluating AI radiology platforms to address radiologist shortages in the El Paso market.',
    maturityLevel: 'growing',
    relatedVendorCount: 28,
    procurementSignalKeywords: ['ai radiology contract', 'medical imaging ai award', 'cad detection system', 'diagnostic ai deployment', 'radiology ai platform'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 680,
  },

  {
    id: 'tech-remote-patient-monitoring',
    name: 'Remote Patient Monitoring (RPM)',
    category: 'Healthcare',
    description: 'Wearable and connected device platforms transmitting physiologic data from patients at home to clinical teams. High relevance for WBAMC soldier readiness monitoring, CareMore Medicare Advantage members, and TTUHSC rural health programs.',
    maturityLevel: 'growing',
    relatedVendorCount: 32,
    procurementSignalKeywords: ['remote monitoring contract', 'rpm platform award', 'wearable health deployment', 'physiologic monitoring', 'connected health program'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 920,
  },

  {
    id: 'tech-clinical-trials-ai',
    name: 'Clinical Trials Technology',
    category: 'Healthcare',
    description: 'Digital tools for patient recruitment, protocol management, ePRO data collection, and biostatistical analysis in clinical research. TTUHSC Paul Foster School of Medicine and UTEP conduct NIH-funded trials requiring digital clinical operations platforms.',
    maturityLevel: 'growing',
    relatedVendorCount: 24,
    procurementSignalKeywords: ['clinical trial platform', 'edc contract', 'ctms award', 'nih research platform', 'clinical data management'],
    elPasoRelevance: 'medium',
    governmentBudgetFY25M: 440,
  },

  // ── Logistics ─────────────────────────────────────────────────────────────

  {
    id: 'tech-route-optimization',
    name: 'Route Optimization / Dynamic Routing',
    category: 'Logistics',
    description: 'AI-powered algorithms computing optimal delivery routes in real time, accounting for traffic, weather, border crossing wait times, and vehicle constraints. Critical for El Paso cross-border carriers navigating CBP processing delays and I-10 congestion.',
    maturityLevel: 'mature',
    relatedVendorCount: 38,
    procurementSignalKeywords: ['route optimization contract', 'dynamic routing award', 'delivery optimization platform', 'tms routing', 'fleet routing software'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 180,
  },

  {
    id: 'tech-warehouse-automation',
    name: 'Warehouse Automation (ASRS / Goods-to-Person)',
    category: 'Logistics',
    description: 'Automated storage and retrieval systems, conveyor networks, and goods-to-person robotic systems for distribution centers. Amazon ELP1 in Horizon City uses Kiva/Amazon Robotics GTP systems; DoD DLA depots serving Fort Bliss are modernizing with ASRS.',
    maturityLevel: 'mature',
    relatedVendorCount: 52,
    procurementSignalKeywords: ['warehouse automation contract', 'asrs deployment', 'goods to person award', 'distribution center automation', 'dla depot modernization'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 1600,
  },

  {
    id: 'tech-fleet-management',
    name: 'Fleet Management & Telematics',
    category: 'Logistics',
    description: 'GPS tracking, ELD compliance, driver scoring, and predictive maintenance platforms for commercial and government vehicle fleets. CBP, Army, and cross-border carrier fleets in El Paso represent a large captive market for telematics platforms.',
    maturityLevel: 'mature',
    relatedVendorCount: 44,
    procurementSignalKeywords: ['fleet management contract', 'telematics deployment', 'gps tracking award', 'eld compliance program', 'vehicle tracking system'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 420,
  },

  {
    id: 'tech-last-mile',
    name: 'Last-Mile Delivery Technology',
    category: 'Logistics',
    description: 'Route planning, driver app, proof-of-delivery, and returns management platforms for the final leg of parcel delivery. El Paso\'s geographic position and cross-border Prime customer demand make last-mile optimization particularly high-value.',
    maturityLevel: 'mature',
    relatedVendorCount: 28,
    procurementSignalKeywords: ['last mile contract', 'delivery platform award', 'parcel routing', 'driver app deployment', 'delivery operations platform'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 120,
  },

  {
    id: 'tech-supply-chain-visibility',
    name: 'End-to-End Supply Chain Visibility',
    category: 'Logistics',
    description: 'Multi-enterprise platforms providing real-time tracking of goods from supplier to end customer. Critical for maquiladora supply chains where visibility across US-Mexico border is complicated by customs holds, carrier changes, and duty drawback documentation.',
    maturityLevel: 'growing',
    relatedVendorCount: 34,
    procurementSignalKeywords: ['supply chain visibility contract', 'freight tracking award', 'supply chain platform', 'e2e visibility program', 'multimodal tracking'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 280,
  },

  {
    id: 'tech-digital-freight',
    name: 'Digital Freight Forwarding',
    category: 'Logistics',
    description: 'Tech-enabled freight forwarder platforms replacing manual brokerage with online quoting, booking, customs filing, and document management. Nuvocargo and similar platforms are digitalizing US-Mexico freight for cross-border shippers in the El Paso corridor.',
    maturityLevel: 'growing',
    relatedVendorCount: 18,
    procurementSignalKeywords: ['digital freight platform', 'customs brokerage software', 'freight forwarder award', 'border freight technology', 'pedimento automation'],
    elPasoRelevance: 'high',
    governmentBudgetFY25M: 95,
  },

];

// Helper: Get technologies by category
export function getTechByCategory(category: TechCategory): Technology[] {
  return TECHNOLOGY_CATALOG.filter((t) => t.category === category);
}

// Helper: Get technologies by El Paso relevance
export function getHighRelevanceTech(): Technology[] {
  return TECHNOLOGY_CATALOG.filter((t) => t.elPasoRelevance === 'high');
}

// Helper: Get technologies by maturity level
export function getTechByMaturity(maturity: TechMaturity): Technology[] {
  return TECHNOLOGY_CATALOG.filter((t) => t.maturityLevel === maturity);
}

// ── Industry slug ↔ category mapping ──────────────────────────────────────────

export type IndustrySlug =
  | 'ai-ml'
  | 'cybersecurity'
  | 'defense'
  | 'border-tech'
  | 'manufacturing'
  | 'energy'
  | 'healthcare'
  | 'logistics'
  | 'fintech'
  | 'consumer'
  | 'real-estate'
  | 'education'
  | 'media';

export type IndustryMeta = {
  slug: IndustrySlug;
  label: string;
  category: TechCategory;
  color: string;
  description: string;
};

export const INDUSTRIES: IndustryMeta[] = [
  { slug: 'ai-ml',          label: 'AI / ML',          category: 'AI/ML',          color: '#60a5fa', description: 'Artificial intelligence, machine learning, generative AI, and edge inference systems.' },
  { slug: 'cybersecurity',  label: 'Cybersecurity',    category: 'Cybersecurity',  color: '#00d4ff', description: 'Zero trust, endpoint detection, threat intelligence, and OT/ICS security.' },
  { slug: 'defense',        label: 'Defense',          category: 'Defense',        color: '#ff6400', description: 'ISR, electronic warfare, autonomous systems, C4ISR, hypersonics, and directed energy.' },
  { slug: 'border-tech',    label: 'Border Tech',      category: 'Border Tech',    color: '#f97316', description: 'Biometrics, RFID tracking, cargo scanning, surveillance, and trade compliance.' },
  { slug: 'manufacturing',  label: 'Manufacturing',    category: 'Manufacturing',  color: '#00d4ff', description: 'Industry 4.0, additive manufacturing, digital twins, predictive maintenance, cobots.' },
  { slug: 'energy',         label: 'Energy',           category: 'Energy',         color: '#ffd700', description: 'Smart grid, utility solar, battery storage, microgrids, and AI grid operations.' },
  { slug: 'healthcare',     label: 'Healthcare',       category: 'Healthcare',     color: '#00ff88', description: 'Telemedicine, EHR systems, medical imaging AI, remote patient monitoring.' },
  { slug: 'logistics',      label: 'Logistics',        category: 'Logistics',      color: '#ffb800', description: 'Route optimization, warehouse automation, fleet management, supply chain visibility.' },
  { slug: 'fintech',        label: 'Fintech',          category: 'AI/ML',          color: '#10b981', description: 'Payments, banking, lending, crypto, insurance, and financial infrastructure.' },
  { slug: 'consumer',       label: 'Consumer',         category: 'AI/ML',          color: '#ec4899', description: 'Marketplaces, e-commerce, social, food delivery, and consumer SaaS.' },
  { slug: 'real-estate',    label: 'Real Estate',      category: 'Manufacturing',  color: '#a855f7', description: 'Proptech, construction tech, property management, and real-estate marketplaces.' },
  { slug: 'education',      label: 'Education',        category: 'AI/ML',          color: '#0ea5e9', description: 'EdTech, online learning, training platforms, and education tooling.' },
  { slug: 'media',          label: 'Media',            category: 'AI/ML',          color: '#fb7185', description: 'Content creation, publishing, streaming, video tooling, and creator platforms.' },
];

export function getIndustryBySlug(slug: string): IndustryMeta | undefined {
  return INDUSTRIES.find((i) => i.slug === slug);
}

export function getIndustryByCategory(category: TechCategory): IndustryMeta | undefined {
  return INDUSTRIES.find((i) => i.category === category);
}

// Summary stats for the catalog
export const CATALOG_SUMMARY = {
  total: TECHNOLOGY_CATALOG.length,
  byCategory: {
    'AI/ML': getTechByCategory('AI/ML').length,
    'Cybersecurity': getTechByCategory('Cybersecurity').length,
    'Defense': getTechByCategory('Defense').length,
    'Border Tech': getTechByCategory('Border Tech').length,
    'Manufacturing': getTechByCategory('Manufacturing').length,
    'Energy': getTechByCategory('Energy').length,
    'Healthcare': getTechByCategory('Healthcare').length,
    'Logistics': getTechByCategory('Logistics').length,
  },
  highElPasoRelevance: TECHNOLOGY_CATALOG.filter((t) => t.elPasoRelevance === 'high').length,
} as const;
