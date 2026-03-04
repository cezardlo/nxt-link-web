// El Paso vendor intelligence — authoritative data for dossier + map layers
// Keyed by entity_id (matches MapCanvas EL_PASO_STUBS entity_id values)

export type VendorRecord = {
  id: string;
  name: string;
  description: string;
  website: string;
  tags: string[];
  evidence: string[];
  category: string;
  ikerScore: number;
  // Map display data
  lat: number;
  lon: number;
  layer: 'vendors' | 'momentum' | 'funding';
  weight: number;
  confidence: number;
};

export const EL_PASO_VENDORS: Record<string, VendorRecord> = {

  // ── Fort Bliss Defense Cluster ────────────────────────────────────────────

  'ep-l3harris': {
    id: 'ep-l3harris',
    name: 'L3Harris Technologies',
    description: 'Defense electronics and C4ISR systems integrator with a major support contract at Fort Bliss. Provides ISR platforms, communication systems, and electronic warfare capabilities to the 1st Armored Division.',
    website: 'https://l3harris.com',
    tags: ['Defense', 'C4ISR', 'ISR', 'Electronic Warfare', 'Fort Bliss'],
    evidence: ['Fort Bliss C4ISR contract 2023 ($240M)', 'IVAS headset integration support', '1st Armored Division ISR aircraft maintenance'],
    category: 'Defense',
    ikerScore: 92,
    lat: 31.8082, lon: -106.4175, layer: 'vendors', weight: 0.92, confidence: 0.95,
  },

  'ep-raytheon': {
    id: 'ep-raytheon',
    name: 'Raytheon Technologies (RTX)',
    description: 'Prime defense contractor delivering Patriot missile systems, radar platforms, and precision munitions to Fort Bliss installations. Primary systems integrator for the Patriot Advanced Capability-3 (PAC-3) test programs.',
    website: 'https://rtx.com',
    tags: ['Defense', 'Missiles', 'Patriot', 'Radar', 'Fort Bliss'],
    evidence: ['Patriot PAC-3 MSE production contract ($1.2B, 2024)', 'Fort Bliss Air Defense Artillery sustainment', 'LTAMDS radar testing program'],
    category: 'Defense',
    ikerScore: 90,
    lat: 31.8125, lon: -106.4092, layer: 'vendors', weight: 0.90, confidence: 0.94,
  },

  'ep-saic': {
    id: 'ep-saic',
    name: 'SAIC',
    description: 'Science Applications International Corporation providing IT modernization, logistics information systems, and digital transformation services to Fort Bliss Army commands.',
    website: 'https://saic.com',
    tags: ['Defense IT', 'Logistics Systems', 'Digital Transformation', 'Fort Bliss'],
    evidence: ['Army ATIS program support contract', 'Fort Bliss network modernization ($85M)', 'GCSS-Army logistics platform deployment'],
    category: 'Defense IT',
    ikerScore: 88,
    lat: 31.8095, lon: -106.4135, layer: 'vendors', weight: 0.88, confidence: 0.91,
  },

  'ep-leidos': {
    id: 'ep-leidos',
    name: 'Leidos',
    description: 'Defense and intelligence solutions provider supporting Army intelligence operations at Fort Bliss with data analytics, command and control systems, and health IT for the William Beaumont Army Medical Center.',
    website: 'https://leidos.com',
    tags: ['Defense IT', 'Health IT', 'Intelligence Systems', 'Analytics'],
    evidence: ['WBAMC Health IT contract renewal 2024', 'Army intelligence support program', 'IDIQ task order award ($43M, 2023)'],
    category: 'Defense IT',
    ikerScore: 85,
    lat: 31.8065, lon: -106.4155, layer: 'vendors', weight: 0.85, confidence: 0.90,
  },

  'ep-boozallen': {
    id: 'ep-boozallen',
    name: 'Booz Allen Hamilton',
    description: 'Management consulting and technology firm providing strategy, analytics, and cyber capabilities to DoD clients at Fort Bliss and White Sands Missile Range. Growing AI/ML practice in the El Paso corridor.',
    website: 'https://boozallen.com',
    tags: ['Consulting', 'Cybersecurity', 'AI/ML', 'DoD', 'Strategy'],
    evidence: ['WSMR cyber defense task order', 'Army AI/ML pilot program lead', 'El Paso office expansion (2024, +120 cleared personnel)'],
    category: 'Consulting',
    ikerScore: 87,
    lat: 31.8088, lon: -106.4120, layer: 'vendors', weight: 0.87, confidence: 0.89,
  },

  'ep-boeing': {
    id: 'ep-boeing',
    name: 'Boeing Defense, Space & Security',
    description: 'Supports Army Aviation and rotary-wing fleet sustainment at Fort Bliss. Provides Chinook helicopter depot-level maintenance and AH-64 Apache simulator training systems.',
    website: 'https://boeing.com/defense',
    tags: ['Defense', 'Aviation', 'Rotary Wing', 'Sustainment', 'Fort Bliss'],
    evidence: ['CH-47 Chinook fleet sustainment contract ($190M)', 'AH-64 Apache training simulator support', 'Fort Bliss Army Aviation support'],
    category: 'Defense',
    ikerScore: 91,
    lat: 31.8135, lon: -106.4052, layer: 'vendors', weight: 0.91, confidence: 0.93,
  },

  'ep-mantech': {
    id: 'ep-mantech',
    name: 'ManTech International',
    description: 'Provides IT and cyber support services to Fort Bliss, including network operations, help desk, and cyber readiness assessments. Awarded multiple OCONUS LOGCAP-adjacent contracts.',
    website: 'https://mantech.com',
    tags: ['Defense IT', 'Cybersecurity', 'Network Ops', 'IT Services'],
    evidence: ['Fort Bliss IT support contract (5-year IDIQ)', 'Cyber readiness assessment program', 'ITES-3H Army IT task order'],
    category: 'Defense IT',
    ikerScore: 80,
    lat: 31.8072, lon: -106.4195, layer: 'momentum', weight: 0.80, confidence: 0.85,
  },

  'ep-gdit': {
    id: 'ep-gdit',
    name: 'General Dynamics IT',
    description: 'Enterprise IT solutions and digital transformation for Army commands at Fort Bliss. Manages large-scale helpdesk and infrastructure modernization under DEOS cloud migration program.',
    website: 'https://gdit.com',
    tags: ['Defense IT', 'Cloud', 'DEOS', 'Enterprise IT', 'Helpdesk'],
    evidence: ['DEOS Office 365 migration Fort Bliss', 'Army helpdesk ITES-3H task order ($67M)', 'Data center consolidation program'],
    category: 'Defense IT',
    ikerScore: 83,
    lat: 31.8108, lon: -106.4065, layer: 'vendors', weight: 0.83, confidence: 0.87,
  },

  // ── Logistics / Airport Industrial Zone ──────────────────────────────────

  'ep-fedex': {
    id: 'ep-fedex',
    name: 'FedEx Ground Hub (ELP)',
    description: 'Major FedEx Ground sortation and distribution hub adjacent to El Paso International Airport. Processes cross-border shipments between the US and Mexico and serves as a regional distribution center for West Texas and New Mexico.',
    website: 'https://fedex.com',
    tags: ['Logistics', 'Distribution', 'Cross-Border', 'Freight'],
    evidence: ['ELP hub expansion completed 2023 (+200k sq ft)', 'Cross-border pilot program with CBSA', '3,400+ employees, 24/7 operations'],
    category: 'Logistics',
    ikerScore: 78,
    lat: 31.7965, lon: -106.3780, layer: 'vendors', weight: 0.78, confidence: 0.92,
  },

  'ep-cardinal': {
    id: 'ep-cardinal',
    name: 'Cardinal Health El Paso',
    description: 'Medical supply distribution and pharmaceutical logistics hub serving hospitals and clinics across the El Paso-Ciudad Juárez bi-national region. Key supplier to WBAMC and UMC.',
    website: 'https://cardinalhealth.com',
    tags: ['Healthcare Logistics', 'Pharma', 'Medical Supply', 'Distribution'],
    evidence: ['WBAMC pharmaceutical supply contract', 'UMC supply chain partnership', 'Regional distribution for 200+ facilities'],
    category: 'Logistics',
    ikerScore: 76,
    lat: 31.7930, lon: -106.3825, layer: 'vendors', weight: 0.76, confidence: 0.88,
  },

  'ep-xpo': {
    id: 'ep-xpo',
    name: 'XPO Logistics El Paso',
    description: 'LTL freight and supply chain solutions with a dedicated El Paso terminal serving maquiladora cross-border freight flows. Technology-driven track-and-trace platform integrated with Mexican customs systems.',
    website: 'https://xpo.com',
    tags: ['LTL Freight', 'Cross-Border', 'Maquiladora', 'Supply Chain'],
    evidence: ['Maquiladora corridor LTL growth +34% YoY', 'Cross-border digital customs integration', 'Partnership with Grupo TMM'],
    category: 'Logistics',
    ikerScore: 74,
    lat: 31.7900, lon: -106.3860, layer: 'vendors', weight: 0.74, confidence: 0.85,
  },

  'ep-ryder': {
    id: 'ep-ryder',
    name: 'Ryder Supply Chain Solutions',
    description: 'Dedicated contract carriage and supply chain management for manufacturing clients in the Juárez-El Paso maquiladora corridor. Provides fleet management, warehouse logistics, and cross-border coordination.',
    website: 'https://ryder.com',
    tags: ['Supply Chain', 'Fleet Management', 'Maquiladora', 'Warehousing'],
    evidence: ['Foxconn EP supply chain contract', 'Maquiladora dedicated contract carriage fleet', 'West Texas 3PL expansion (2023)'],
    category: 'Logistics',
    ikerScore: 72,
    lat: 31.7878, lon: -106.3895, layer: 'vendors', weight: 0.72, confidence: 0.84,
  },

  'ep-amazon': {
    id: 'ep-amazon',
    name: 'Amazon Fulfillment Center ELP1',
    description: 'Amazon robotics-enabled fulfillment center in Horizon City serving El Paso, Las Cruces, and Ciudad Juárez Prime customers. One of the largest employers in the East El Paso corridor.',
    website: 'https://amazon.com',
    tags: ['E-Commerce', 'Fulfillment', 'Robotics', 'Logistics', 'Horizon City'],
    evidence: ['ELP1 opening 2022 (1.1M sq ft)', '1,500+ full-time employees', 'Amazon Robotics drive unit deployment'],
    category: 'Logistics',
    ikerScore: 80,
    lat: 31.6952, lon: -106.1740, layer: 'vendors', weight: 0.80, confidence: 0.90,
  },

  // ── Border Technology / Port of Entry ─────────────────────────────────────

  'ep-crossingiq': {
    id: 'ep-crossingiq',
    name: 'CrossingIQ',
    description: 'El Paso-based border intelligence startup providing AI-driven wait-time prediction and lane optimization for the Paso del Norte and Bridge of the Americas ports of entry. Used by CBP and commercial carriers.',
    website: 'https://crossingiq.com',
    tags: ['Border Tech', 'AI', 'CBP', 'Wait Times', 'Port of Entry'],
    evidence: ['CBP pilot program at Paso del Norte POE', 'Series A funding ($4.2M, 2023)', 'Integration with US Customs ACE platform'],
    category: 'Border Tech',
    ikerScore: 72,
    lat: 31.7508, lon: -106.4845, layer: 'vendors', weight: 0.72, confidence: 0.82,
  },

  'ep-bordertech': {
    id: 'ep-bordertech',
    name: 'BorderTech Solutions',
    description: 'Develops RFID and sensor-based cargo scanning systems for rapid clearance at US-Mexico border crossings. Technology accelerates commercial lane throughput by integrating with C-TPAT and FAST program requirements.',
    website: 'https://bordertechsolutions.com',
    tags: ['Border Tech', 'RFID', 'Cargo Scanning', 'C-TPAT', 'FAST'],
    evidence: ['Ysleta POE RFID deployment', 'C-TPAT certified technology partner', 'DHS S&T pilot award ($1.8M)'],
    category: 'Border Tech',
    ikerScore: 68,
    lat: 31.7525, lon: -106.4882, layer: 'vendors', weight: 0.68, confidence: 0.78,
  },

  'ep-portlogic': {
    id: 'ep-portlogic',
    name: 'PortLogic Systems',
    description: 'Provides electronic manifest and pre-clearance automation software for trucking companies crossing at El Paso-Juárez ports of entry. Platform reduces dwell time by pre-filing paperwork with CBP ACE.',
    website: 'https://portlogicsystems.com',
    tags: ['Logistics Tech', 'Electronic Manifest', 'CBP ACE', 'Pre-Clearance'],
    evidence: ['300+ carrier customers on platform', 'ACE certified electronic manifest filer', 'Average dwell time reduction 42%'],
    category: 'Logistics',
    ikerScore: 65,
    lat: 31.7490, lon: -106.4752, layer: 'momentum', weight: 0.65, confidence: 0.75,
  },

  'ep-tradesync': {
    id: 'ep-tradesync',
    name: 'TradeSync Border',
    description: 'Cross-border trade compliance and customs brokerage platform purpose-built for the Juárez-El Paso manufacturing corridor. Automates IMMEX program compliance, Maquiladora duty drawback, and USMCA certificate of origin generation.',
    website: 'https://tradesynclp.com',
    tags: ['Trade Compliance', 'IMMEX', 'Maquiladora', 'USMCA', 'Customs Brokerage'],
    evidence: ['IMMEX program certified software', '500+ active maquiladora customers', 'Integration with SAT (Mexico customs) and CBP'],
    category: 'Border Tech',
    ikerScore: 70,
    lat: 31.7515, lon: -106.4792, layer: 'momentum', weight: 0.70, confidence: 0.80,
  },

  'ep-cbpass': {
    id: 'ep-cbpass',
    name: 'CBPASS Systems',
    description: 'Biometric identity verification and trusted traveler enrollment system for pedestrian border crossings. Partnering with GSA and CBP to pilot facial recognition lane at El Paso ports of entry.',
    website: 'https://cbpass.io',
    tags: ['Biometrics', 'Identity Verification', 'CBP', 'Trusted Traveler', 'Facial Recognition'],
    evidence: ['GSA Schedule 70 contract award', 'CBP facial recognition pilot (SENTRI lanes)', 'Series Seed $2.1M (2024)'],
    category: 'Border Tech',
    ikerScore: 60,
    lat: 31.7535, lon: -106.4822, layer: 'funding', weight: 0.60, confidence: 0.72,
  },

  // ── UTEP Research Ecosystem ───────────────────────────────────────────────

  'ep-utep-ai': {
    id: 'ep-utep-ai',
    name: 'UTEP AI Research Lab',
    description: 'University of Texas at El Paso Computational Intelligence laboratory focusing on NLP for Spanish-English bilingual contexts, computer vision for border infrastructure, and adversarial machine learning for DoD applications.',
    website: 'https://utep.edu/cs/ai',
    tags: ['AI/ML', 'NLP', 'Computer Vision', 'Research', 'UTEP', 'DoD'],
    evidence: ['NSF CISE grant $1.4M (2024)', 'DARPA SubT challenge participant', 'US Army Research Lab partnership MOU'],
    category: 'AI / ML',
    ikerScore: 65,
    lat: 31.7712, lon: -106.5062, layer: 'vendors', weight: 0.65, confidence: 0.78,
  },

  'ep-utep-cyber': {
    id: 'ep-utep-cyber',
    name: 'UTEP Cybersecurity Center',
    description: 'NSA-designated Center of Academic Excellence in Cyber Operations. Provides workforce development, vulnerability research, and ICS/SCADA security assessments for critical infrastructure in the El Paso-Juárez region.',
    website: 'https://utep.edu/cybersecurity',
    tags: ['Cybersecurity', 'ICS/SCADA', 'NSA CAE', 'Workforce Development', 'UTEP'],
    evidence: ['NSA CAE-CO designation (renewed 2024)', 'DHS CISA critical infrastructure assessment program', 'El Paso Electric SCADA security audit'],
    category: 'Cybersecurity',
    ikerScore: 62,
    lat: 31.7695, lon: -106.5025, layer: 'vendors', weight: 0.62, confidence: 0.75,
  },

  'ep-utep-mfg': {
    id: 'ep-utep-mfg',
    name: 'UTEP Advanced Manufacturing Center',
    description: 'Research center specializing in metal additive manufacturing (3D printing), composite materials, and rapid prototyping for defense and aerospace applications. Partners with Army Research Lab for next-gen materials research.',
    website: 'https://utep.edu/manufacturing',
    tags: ['Advanced Manufacturing', 'Additive Manufacturing', '3D Printing', 'Materials Research'],
    evidence: ['Army Research Lab cooperative agreement $3M', 'Metal AM parts for Army aviation depot', 'Boeing materials research partnership'],
    category: 'Manufacturing',
    ikerScore: 60,
    lat: 31.7675, lon: -106.5082, layer: 'vendors', weight: 0.60, confidence: 0.73,
  },

  // ── Healthcare / Medical Center District ──────────────────────────────────

  'ep-umc': {
    id: 'ep-umc',
    name: 'University Medical Center of El Paso',
    description: 'The only Level I Trauma Center in the El Paso-Juárez-Las Cruces region. Operates the Thomason Hospital campus and leads healthcare technology procurement for the bi-national region including EHR modernization and telemedicine expansion.',
    website: 'https://umcelpaso.org',
    tags: ['Health Tech', 'EHR', 'Telemedicine', 'Level I Trauma', 'Healthcare IT'],
    evidence: ['Epic EHR system deployment ($28M)', 'Telehealth expansion to 8 rural Texas counties', 'HIMSS Stage 7 designation (2024)'],
    category: 'Health Tech',
    ikerScore: 75,
    lat: 31.7632, lon: -106.4992, layer: 'vendors', weight: 0.75, confidence: 0.88,
  },

  'ep-tenet': {
    id: 'ep-tenet',
    name: 'Tenet Health / Sierra Providence',
    description: 'Operates Sierra Medical Center and Providence Memorial Hospital in El Paso. Implementing AI-assisted diagnostics and predictive analytics for patient flow optimization across the Tenet West Texas network.',
    website: 'https://tenethealth.com',
    tags: ['Health Tech', 'AI Diagnostics', 'Hospital Operations', 'Patient Flow'],
    evidence: ['AI radiology platform deployment (2024)', 'Patient flow optimization contract with Numerics', 'Epic-to-Oracle health cloud migration'],
    category: 'Health Tech',
    ikerScore: 70,
    lat: 31.7678, lon: -106.4922, layer: 'vendors', weight: 0.70, confidence: 0.85,
  },

  'ep-ttuhsc': {
    id: 'ep-ttuhsc',
    name: 'TTUHSC Informatics',
    description: 'Texas Tech University Health Sciences Center El Paso — clinical informatics and biomedical research data platform. Developing cross-border health data exchange systems connecting El Paso and Ciudad Juárez providers.',
    website: 'https://ttuhsc.edu/elpaso',
    tags: ['Health Informatics', 'Biomedical Research', 'Cross-Border Health', 'Data Exchange'],
    evidence: ['NIH R01 grant for bi-national health data exchange', 'PCORI patient outcomes research program', 'EPIC integrated clinical research platform'],
    category: 'Health Tech',
    ikerScore: 68,
    lat: 31.7655, lon: -106.5045, layer: 'vendors', weight: 0.68, confidence: 0.82,
  },

  // ── Water Technology ──────────────────────────────────────────────────────

  'ep-epwater': {
    id: 'ep-epwater',
    name: 'El Paso Water Utilities',
    description: 'World leader in water reuse and scarcity management serving 850,000+ residents in one of the most arid cities in the US. Operates the nation\'s first inland desalination plant and an advanced water reclamation system achieving near 100% water reuse.',
    website: 'https://epwater.org',
    tags: ['Water Tech', 'Desalination', 'Water Reuse', 'Smart Water', 'Scarcity Management'],
    evidence: ['Kay Bailey Hutchison Desalination Plant (27.5 MGD)', 'World Water Prize 2024 finalist', 'Smart meter deployment 100% coverage (2023)'],
    category: 'Water Tech',
    ikerScore: 82,
    lat: 31.7730, lon: -106.4912, layer: 'vendors', weight: 0.82, confidence: 0.90,
  },

  'ep-desal': {
    id: 'ep-desal',
    name: 'Kay Bailey Hutchison Desalination Plant',
    description: 'The largest inland brackish water desalination plant in the US, operated by El Paso Water. Processes brackish groundwater from the Hueco Bolson aquifer, producing 27.5 million gallons per day of treated drinking water.',
    website: 'https://epwater.org/about/desalination',
    tags: ['Desalination', 'Brackish Water', 'Water Infrastructure', 'Hueco Bolson'],
    evidence: ['27.5 MGD production capacity', 'Hueco Bolson aquifer preservation program', 'TWDB innovation award 2023'],
    category: 'Water Tech',
    ikerScore: 75,
    lat: 31.7582, lon: -106.4542, layer: 'vendors', weight: 0.75, confidence: 0.85,
  },

  'ep-aridtech': {
    id: 'ep-aridtech',
    name: 'AridTech Water Solutions',
    description: 'El Paso startup developing atmospheric water generation (AWG) technology for arid and semi-arid environments. Targeting military, remote community, and disaster relief applications with solar-powered units producing 500+ liters/day.',
    website: 'https://aridtech.io',
    tags: ['Water Tech', 'Atmospheric Water', 'AWG', 'Solar', 'Military', 'Startup'],
    evidence: ['SBIR Phase II award DoD ($1.2M)', 'Fort Bliss field trial deployment (20 units)', 'Y Combinator W24 cohort'],
    category: 'Water Tech',
    ikerScore: 58,
    lat: 31.7612, lon: -106.4875, layer: 'funding', weight: 0.58, confidence: 0.70,
  },

  // ── Energy ────────────────────────────────────────────────────────────────

  'ep-epe': {
    id: 'ep-epe',
    name: 'El Paso Electric (EPE)',
    description: 'Investor-owned electric utility serving 460,000 customers in West Texas and New Mexico. Operates a mixed generation portfolio including Palo Verde Nuclear (shared), natural gas peakers, and rapidly expanding solar/storage. Leading smart grid modernization initiative.',
    website: 'https://epelectric.com',
    tags: ['Energy', 'Electric Utility', 'Smart Grid', 'Solar', 'Nuclear', 'Grid Modernization'],
    evidence: ['Grid modernization plan $1.8B (2023-2030)', 'Sun Metro EV transit fleet charging contract', 'Palo Verde Nuclear Station 15.8% ownership stake'],
    category: 'Energy',
    ikerScore: 80,
    lat: 31.7602, lon: -106.4622, layer: 'vendors', weight: 0.80, confidence: 0.90,
  },

  'ep-nextera': {
    id: 'ep-nextera',
    name: 'NextEra Energy — West Texas',
    description: 'Owns and operates large-scale wind and solar farms in the Permian Basin and Trans-Pecos region near El Paso. Expanding battery storage capacity to support ERCOT and SPP grid stability. Largest renewable energy developer in the state.',
    website: 'https://nexteraenergy.com',
    tags: ['Renewable Energy', 'Wind', 'Solar', 'Battery Storage', 'ERCOT', 'Permian Basin'],
    evidence: ['Sierra Diablo Wind Farm (200 MW)', 'West Texas battery storage addition 400 MWh', 'PPA with city of El Paso (100MW solar)'],
    category: 'Energy',
    ikerScore: 85,
    lat: 31.7215, lon: -106.2485, layer: 'vendors', weight: 0.85, confidence: 0.88,
  },

  'ep-sunpower': {
    id: 'ep-sunpower',
    name: 'SunPower West Texas',
    description: 'Commercial and industrial solar installation firm with a strong presence in the El Paso market. Specializes in large rooftop arrays for maquiladora facilities, military housing, and commercial properties with on-bill financing.',
    website: 'https://sunpower.com',
    tags: ['Solar Energy', 'Commercial Solar', 'Maquiladora', 'On-Bill Financing'],
    evidence: ['Foxconn EP plant 2.4 MW rooftop installation', 'Fort Bliss family housing solar program', 'El Paso PACE program participant'],
    category: 'Energy',
    ikerScore: 70,
    lat: 31.7178, lon: -106.2542, layer: 'momentum', weight: 0.70, confidence: 0.82,
  },

  // ── Manufacturing / Maquiladora Zone ──────────────────────────────────────

  'ep-benchmark': {
    id: 'ep-benchmark',
    name: 'Benchmark Electronics',
    description: 'Contract electronics manufacturer with a major Juárez-El Paso campus producing printed circuit board assemblies, subsystems, and complex electronic devices for aerospace, defense, and medical device OEMs.',
    website: 'https://bench.com',
    tags: ['Electronics Manufacturing', 'PCB Assembly', 'Aerospace', 'Defense', 'Medical Devices'],
    evidence: ['Juárez-EP campus 800k sq ft', 'Raytheon subcontract for avionics assemblies', 'ISO 9001:2015 / AS9100D certified'],
    category: 'Manufacturing',
    ikerScore: 72,
    lat: 31.7402, lon: -106.5122, layer: 'vendors', weight: 0.72, confidence: 0.82,
  },

  'ep-aptiv': {
    id: 'ep-aptiv',
    name: 'Aptiv (formerly Delphi) El Paso',
    description: 'Global electrical architecture and autonomous driving technology company with a large manufacturing presence in the Juárez-El Paso corridor. Produces wiring harnesses, connectors, and electrical distribution systems for major automotive OEMs.',
    website: 'https://aptiv.com',
    tags: ['Automotive Tech', 'Wiring Harnesses', 'Connectors', 'Maquiladora', 'EV Components'],
    evidence: ['Juárez wiring harness plants 5,000+ employees', 'EV component production ramp 2024', 'GM, Ford, Stellantis OEM supplier'],
    category: 'Manufacturing',
    ikerScore: 68,
    lat: 31.7355, lon: -106.5165, layer: 'vendors', weight: 0.68, confidence: 0.78,
  },

  'ep-honeywell': {
    id: 'ep-honeywell',
    name: 'Honeywell El Paso Plant',
    description: 'Advanced manufacturing facility producing defense electronics, process controls, and building automation equipment. The El Paso plant supports Honeywell\'s Federal Manufacturing & Technologies division with classified defense component production.',
    website: 'https://honeywell.com',
    tags: ['Defense Electronics', 'Process Controls', 'Building Automation', 'Advanced Manufacturing'],
    evidence: ['NNSA/DoE classified component contract', 'ISO 14001 environmental certification', 'El Paso plant $120M equipment upgrade (2023)'],
    category: 'Manufacturing',
    ikerScore: 74,
    lat: 31.7425, lon: -106.5082, layer: 'vendors', weight: 0.74, confidence: 0.83,
  },

  'ep-foxconn': {
    id: 'ep-foxconn',
    name: 'Foxconn El Paso Office',
    description: 'Global electronics contract manufacturer maintaining a sales, logistics coordination, and regional operations office in El Paso to manage their extensive Juárez manufacturing campus. Exploring nearshoring expansion to serve US tech clients.',
    website: 'https://foxconn.com',
    tags: ['Electronics Manufacturing', 'Nearshoring', 'Maquiladora', 'Contract Manufacturing'],
    evidence: ['Juárez campus 30k+ employees', 'Apple iPhone subcomponent production', 'Nearshoring feasibility study for US clients (2024)'],
    category: 'Manufacturing',
    ikerScore: 69,
    lat: 31.7382, lon: -106.5142, layer: 'vendors', weight: 0.69, confidence: 0.76,
  },

  // ── Downtown / Tech Ecosystem ─────────────────────────────────────────────

  'ep-mesaai': {
    id: 'ep-mesaai',
    name: 'MesaAI',
    description: 'El Paso-founded AI startup building bilingual (English-Spanish) conversational AI for government services, healthcare intake, and border crossing assistance. Targeting CBP, USCIS, and Texas state agencies as primary customers.',
    website: 'https://mesaai.com',
    tags: ['AI/ML', 'NLP', 'Bilingual AI', 'Government Tech', 'Border'],
    evidence: ['Texas HHS conversational AI pilot', 'Pre-Seed $1.5M (2024)', 'SBIR Phase I DHS award ($150k)'],
    category: 'AI / ML',
    ikerScore: 58,
    lat: 31.7582, lon: -106.4852, layer: 'vendors', weight: 0.58, confidence: 0.72,
  },

  'ep-rioiot': {
    id: 'ep-rioiot',
    name: 'Rio IoT',
    description: 'Industrial IoT platform company providing sensor networks, asset tracking, and environmental monitoring for manufacturing facilities and critical infrastructure in the El Paso-Juárez industrial corridor.',
    website: 'https://rioiot.com',
    tags: ['IoT', 'Industrial IoT', 'Asset Tracking', 'Environmental Monitoring', 'Sensors'],
    evidence: ['Benchmark Electronics factory floor IoT deployment', 'EPE smart meter data integration', 'AWS IoT Greengrass certified partner'],
    category: 'IoT',
    ikerScore: 55,
    lat: 31.7622, lon: -106.4792, layer: 'vendors', weight: 0.55, confidence: 0.68,
  },

  'ep-sunpath': {
    id: 'ep-sunpath',
    name: 'SunPath Analytics',
    description: 'Geospatial analytics and predictive modeling firm serving economic development agencies, real estate developers, and transportation planners in the Southwest US. Specializes in cross-border trade flow analysis and site selection modeling.',
    website: 'https://sunpathanalytics.com',
    tags: ['Analytics', 'Geospatial', 'Predictive Modeling', 'Cross-Border Trade', 'Economic Development'],
    evidence: ['City of El Paso economic development contract', 'BNSF Railway trade flow analysis', 'TX-DOT I-10 corridor study'],
    category: 'Analytics',
    ikerScore: 62,
    lat: 31.7562, lon: -106.4912, layer: 'momentum', weight: 0.62, confidence: 0.74,
  },

  'ep-alorica': {
    id: 'ep-alorica',
    name: 'Alorica Technology Services',
    description: 'BPO and technology-enabled customer experience company with a large El Paso operations center. Provides bilingual customer support, technical help desk, and AI-assisted agent tools for Fortune 500 clients across telecom, healthcare, and government sectors.',
    website: 'https://alorica.com',
    tags: ['Enterprise IT', 'BPO', 'Customer Experience', 'Bilingual', 'AI-Assisted'],
    evidence: ['El Paso center 2,000+ seats', 'AI agent assist platform deployment', 'Veterans hiring program (100+ vets/year)'],
    category: 'Enterprise IT',
    ikerScore: 65,
    lat: 31.7548, lon: -106.4822, layer: 'vendors', weight: 0.65, confidence: 0.76,
  },

  'ep-weststar': {
    id: 'ep-weststar',
    name: 'WestStar Bank',
    description: 'El Paso-headquartered community bank and one of the largest locally owned financial institutions in West Texas. Active in cross-border trade financing, SBA lending to maquiladora-linked businesses, and fintech partnerships for international wire transfers.',
    website: 'https://weststarbank.com',
    tags: ['FinTech', 'Banking', 'Cross-Border Finance', 'SBA Lending', 'Trade Finance'],
    evidence: ['#1 SBA lender in El Paso MSA (2023)', 'Cross-border wire transfer app launch', '$6.2B assets under management'],
    category: 'FinTech',
    ikerScore: 65,
    lat: 31.7558, lon: -106.4782, layer: 'funding', weight: 0.65, confidence: 0.78,
  },

  'ep-hunt': {
    id: 'ep-hunt',
    name: 'Hunt Companies',
    description: 'El Paso-based real estate developer and infrastructure company managing military housing privatization, affordable housing, and commercial development across the US. Manages 50,000+ military housing units under the MHPI program.',
    website: 'https://huntcompanies.com',
    tags: ['PropTech', 'Military Housing', 'Real Estate', 'MHPI', 'Infrastructure'],
    evidence: ['Fort Bliss military housing privatization ($1.1B portfolio)', 'MHPI program 50k+ housing units nationwide', 'El Paso affordable housing pipeline 800 units'],
    category: 'PropTech',
    ikerScore: 70,
    lat: 31.7578, lon: -106.4832, layer: 'funding', weight: 0.70, confidence: 0.80,
  },

};

// Convert vendor records to map point format (for API layers route)
export type MapLayerPoint = {
  id: string;
  lat: number;
  lon: number;
  label: string;
  category: string;
  layer: string;
  weight: number;
  confidence: number;
  entity_id: string;
};

export function vendorsToMapPoints(
  vendors: Record<string, VendorRecord>,
  filterLayers?: Set<string>,
): MapLayerPoint[] {
  return Object.values(vendors)
    .filter((v) => !filterLayers || filterLayers.has(v.layer))
    .map((v) => ({
      id: v.id,
      lat: v.lat,
      lon: v.lon,
      label: v.name,
      category: v.category,
      layer: v.layer,
      weight: v.weight,
      confidence: v.confidence,
      entity_id: v.id,
    }));
}
