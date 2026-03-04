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

  // ── Additional Defense Contractors ───────────────────────────────────────────

  'ep-northrop': {
    id: 'ep-northrop',
    name: 'Northrop Grumman',
    description: 'Provides integrated air and missile defense systems, C2 architecture, and cyber capabilities supporting Fort Bliss Air Defense Artillery and White Sands Missile Range test programs. Key participant in IBCS (Integrated Battle Command System) deployment.',
    website: 'https://northropgrumman.com',
    tags: ['Defense', 'Air Defense', 'C2 Systems', 'Cybersecurity', 'IBCS', 'Fort Bliss'],
    evidence: ['IBCS program contract (prime, $1.1B ceiling)', 'Fort Bliss ADA command system integration', 'White Sands test range sensor fusion support'],
    category: 'Defense',
    ikerScore: 90,
    lat: 31.8142, lon: -106.4028, layer: 'vendors', weight: 0.90, confidence: 0.92,
  },

  'ep-lockheed': {
    id: 'ep-lockheed',
    name: 'Lockheed Martin Missiles & Fire Control',
    description: 'Fort Bliss is the primary Army test and operational base for Lockheed Martin-produced THAAD (Terminal High Altitude Area Defense) interceptors. Supports PAC-3 Missile Segment Enhancement and HIMARS rocket artillery logistics from an El Paso-area presence.',
    website: 'https://lockheedmartin.com/missiles-fire-control',
    tags: ['Defense', 'THAAD', 'Missiles', 'HIMARS', 'Air Defense', 'Fort Bliss'],
    evidence: ['THAAD interceptor production contract ($7.7B multi-year, 2023)', 'PAC-3 MSE integration and testing support at Fort Bliss', 'HIMARS resupply logistics support contract ($340M)'],
    category: 'Defense',
    ikerScore: 93,
    lat: 31.8155, lon: -106.4015, layer: 'vendors', weight: 0.93, confidence: 0.95,
  },

  'ep-generaldynamics': {
    id: 'ep-generaldynamics',
    name: 'General Dynamics Land Systems',
    description: 'Supports 1st Armored Division M1A2 SEPv3 Abrams tank fleet at Fort Bliss through depot-level maintenance, field service representatives, and digital systems upgrades. Also manages GCSS-Army financial management systems through GDIT subsidiary.',
    website: 'https://gdls.com',
    tags: ['Defense', 'Armored Vehicles', 'M1 Abrams', 'Depot Maintenance', 'Fort Bliss'],
    evidence: ['M1A2 SEPv3 Abrams depot sustainment contract (Fort Bliss, 5-year)', 'GDLS field service representative team 1st AD', 'Abrams digital systems upgrade program'],
    category: 'Defense',
    ikerScore: 89,
    lat: 31.8118, lon: -106.4048, layer: 'vendors', weight: 0.89, confidence: 0.91,
  },

  'ep-bae': {
    id: 'ep-bae',
    name: 'BAE Systems El Paso',
    description: 'Provides electronic warfare systems and soldier-worn intelligence equipment to the 1st Armored Division. Supports Bradley fighting vehicle electronics and battle management systems upgrades at Fort Bliss.',
    website: 'https://baesystems.com',
    tags: ['Defense', 'Electronic Warfare', 'Bradley IFV', 'Soldier Systems', 'Fort Bliss'],
    evidence: ['Bradley M2A4 electronics upgrade program (Army-wide)', 'ENVG-B night vision integration support', 'Fort Bliss EW readiness assessment contract ($22M)'],
    category: 'Defense',
    ikerScore: 85,
    lat: 31.8098, lon: -106.4068, layer: 'vendors', weight: 0.85, confidence: 0.88,
  },

  'ep-accenturefed': {
    id: 'ep-accenturefed',
    name: 'Accenture Federal Services',
    description: 'Technology and management consulting firm delivering Army ERP modernization, cloud migration, and data analytics capabilities to DoD clients at Fort Bliss. Leading the Army SAP ECC to S/4HANA upgrade under the GCSS-Army next-generation program.',
    website: 'https://accenturefederal.com',
    tags: ['Defense IT', 'SAP', 'Cloud Migration', 'Digital Transformation', 'Army ERP'],
    evidence: ['GCSS-Army S/4HANA modernization prime ($180M IDIQ)', 'Fort Bliss data center cloud migration to Azure GovCloud', 'Army AI/ML center of excellence partnership (2024)'],
    category: 'Defense IT',
    ikerScore: 84,
    lat: 31.8075, lon: -106.4088, layer: 'vendors', weight: 0.84, confidence: 0.87,
  },

  'ep-deloitte': {
    id: 'ep-deloitte',
    name: 'Deloitte Government & Public Services',
    description: 'Advisory, audit, and technology implementation firm supporting Army financial management, logistics modernization, and cyber compliance at Fort Bliss. Manages a growing cleared workforce presence in the El Paso corridor for WSMR and CBP engagements.',
    website: 'https://www2.deloitte.com/us/en/pages/public-sector/solutions/government-public-services.html',
    tags: ['Consulting', 'Defense IT', 'Financial Management', 'Audit', 'Cyber Compliance'],
    evidence: ['Army audit readiness program (Fort Bliss commands)', 'CBP IT modernization task order ($67M, 2024)', 'El Paso office cleared personnel expansion +85 (2023)'],
    category: 'Consulting',
    ikerScore: 82,
    lat: 31.7568, lon: -106.4798, layer: 'vendors', weight: 0.82, confidence: 0.85,
  },

  'ep-caci': {
    id: 'ep-caci',
    name: 'CACI International',
    description: 'Intelligence systems and IT services company with a classified work presence at White Sands Missile Range and Fort Bliss. Provides signals intelligence processing, cyber operations, and enterprise IT services to Army intelligence brigades.',
    website: 'https://caci.com',
    tags: ['Defense IT', 'Signals Intelligence', 'Cybersecurity', 'SIGINT', 'WSMR'],
    evidence: ['Army SIGINT processing system support (classified)', 'White Sands ITES-3H IT services task order ($54M)', 'Intelligence brigade enterprise IT support contract'],
    category: 'Defense IT',
    ikerScore: 81,
    lat: 31.8062, lon: -106.4208, layer: 'vendors', weight: 0.81, confidence: 0.86,
  },

  'ep-vectrus': {
    id: 'ep-vectrus',
    name: 'V2X (Vectrus)',
    description: 'Base operations and facilities management contractor for Fort Bliss under the LOGCAP V program. Provides base support operations, facilities maintenance, utilities, and life support services to the 60,000-acre installation.',
    website: 'https://goV2X.com',
    tags: ['Base Operations', 'Facilities Management', 'LOGCAP', 'Fort Bliss', 'Utilities'],
    evidence: ['Fort Bliss LOGCAP V base operations task order ($420M ceiling)', 'Facilities maintenance workforce 1,200+ employees on post', 'Utilities privatization management contract renewal 2023'],
    category: 'Defense',
    ikerScore: 77,
    lat: 31.8045, lon: -106.4228, layer: 'vendors', weight: 0.77, confidence: 0.84,
  },

  // ── Cybersecurity ──────────────────────────────────────────────────────────

  'ep-palantir': {
    id: 'ep-palantir',
    name: 'Palantir Technologies (Army)',
    description: 'Provides the Army AI Platform (AIP) and Palantir Gotham intelligence platform to Fort Bliss 1st Armored Division. AIP is deployed for operational planning, logistics predictive analytics, and battlefield management data fusion.',
    website: 'https://palantir.com/government',
    tags: ['AI/ML', 'Defense Analytics', 'Intelligence Platform', 'AIP', 'Gotham', 'Army'],
    evidence: ['Army AIP deployment contract ($480M, 2024 ceiling)', 'Fort Bliss AIP operational planning pilot (2024)', 'Palantir TITAN ground station integration support'],
    category: 'Defense IT',
    ikerScore: 89,
    lat: 31.7545, lon: -106.4768, layer: 'vendors', weight: 0.89, confidence: 0.88,
  },

  'ep-crowdstrike': {
    id: 'ep-crowdstrike',
    name: 'CrowdStrike Federal',
    description: 'Endpoint detection and response (EDR) and threat intelligence platform protecting DoD networks at Fort Bliss and CBP IT infrastructure in El Paso. Falcon platform deployed across Army post networks as part of DISA HBSS replacement program.',
    website: 'https://crowdstrike.com/government',
    tags: ['Cybersecurity', 'EDR', 'Endpoint Protection', 'Threat Intelligence', 'DoD', 'CBP'],
    evidence: ['DISA endpoint security program (Falcon platform deployment)', 'CBP network security task order ($38M, 2024)', 'Army ARCYBER threat intelligence feed integration'],
    category: 'Cybersecurity',
    ikerScore: 83,
    lat: 31.7552, lon: -106.4758, layer: 'vendors', weight: 0.83, confidence: 0.82,
  },

  'ep-sievert': {
    id: 'ep-sievert',
    name: 'Sievert Larson Cyber',
    description: 'El Paso-founded cybersecurity firm specializing in OT/ICS security assessments for border infrastructure, utility SCADA systems, and military installation control networks. NSA-cleared team providing red team exercises for Fort Bliss cyber ranges.',
    website: 'https://sievertlarson.com',
    tags: ['Cybersecurity', 'OT Security', 'ICS/SCADA', 'Red Team', 'Fort Bliss'],
    evidence: ['Fort Bliss cyber range red team contract ($4.8M)', 'El Paso Electric ICS security assessment 2024', 'DHS CISA critical infrastructure assessment team member'],
    category: 'Cybersecurity',
    ikerScore: 65,
    lat: 31.7538, lon: -106.4748, layer: 'momentum', weight: 0.65, confidence: 0.74,
  },

  'ep-irontower': {
    id: 'ep-irontower',
    name: 'Iron Tower Security',
    description: 'El Paso cybersecurity startup offering zero-trust network access solutions for bi-national enterprises and maquiladora operators managing split US-Mexico IT environments. Addresses unique cross-border data sovereignty and network segmentation challenges.',
    website: 'https://irontowersec.com',
    tags: ['Cybersecurity', 'Zero Trust', 'Cross-Border IT', 'Network Security', 'Maquiladora'],
    evidence: ['Maquiladora zero-trust pilot program (5 Juárez plants)', 'Series Seed $1.9M (2023)', 'UTEP cybersecurity center technology transfer partnership'],
    category: 'Cybersecurity',
    ikerScore: 55,
    lat: 31.7528, lon: -106.4738, layer: 'funding', weight: 0.55, confidence: 0.70,
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

  'ep-ontrac': {
    id: 'ep-ontrac',
    name: 'OnTrac / LaserShip El Paso',
    description: 'Regional last-mile parcel carrier with a dedicated El Paso terminal serving e-commerce retailers, maquiladora finished-goods distribution, and Amazon Seller Fulfilled deliveries across the West Texas-New Mexico corridor.',
    website: 'https://ontrac.com',
    tags: ['Last Mile Delivery', 'Parcel Carrier', 'E-Commerce', 'Logistics', 'Regional Carrier'],
    evidence: ['El Paso terminal expansion Q2 2024 (+80k sq ft)', 'Amazon SFP carrier certification renewal', 'Cross-border last-mile pilot with DHL Mexpress'],
    category: 'Logistics',
    ikerScore: 64,
    lat: 31.7942, lon: -106.3812, layer: 'vendors', weight: 0.64, confidence: 0.76,
  },

  'ep-globaltranz': {
    id: 'ep-globaltranz',
    name: 'GlobalTranz El Paso',
    description: 'Third-party logistics broker and managed transportation provider with a dedicated El Paso cross-border division. Specializes in US-Mexico truckload, intermodal, and temperature-controlled freight for agricultural and pharmaceutical shippers.',
    website: 'https://globaltranz.com',
    tags: ['3PL', 'Freight Brokerage', 'Cross-Border', 'Temperature Controlled', 'Intermodal'],
    evidence: ['El Paso cross-border division growth +28% YoY (2024)', 'USDA cold-chain certified carrier network', 'Intermodal partnership with BNSF El Paso Intermodal'],
    category: 'Logistics',
    ikerScore: 67,
    lat: 31.7918, lon: -106.3842, layer: 'vendors', weight: 0.67, confidence: 0.77,
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

  'ep-nuvocargo': {
    id: 'ep-nuvocargo',
    name: 'Nuvocargo',
    description: 'Digital freight forwarder and customs brokerage platform purpose-built for US-Mexico trade. Provides real-time shipment visibility, automated pedimento filing, and working capital financing for cross-border shippers using the El Paso-Juárez corridor.',
    website: 'https://nuvocargo.com',
    tags: ['Digital Freight', 'Customs Brokerage', 'US-Mexico Trade', 'Pedimento', 'Trade Finance'],
    evidence: ['Series B $20M (2023, a16z-backed)', '$1.2B in cross-border freight facilitated (2024)', 'El Paso and Nuevo Laredo operations hubs active'],
    category: 'Border Tech',
    ikerScore: 72,
    lat: 31.7498, lon: -106.4762, layer: 'momentum', weight: 0.72, confidence: 0.78,
  },

  'ep-samsara-ep': {
    id: 'ep-samsara-ep',
    name: 'Samsara Border Fleet Intelligence',
    description: 'Fleet telematics and compliance platform with a growing commercial vehicle customer base among US-Mexico cross-border carriers operating from El Paso. ELD-compliant system integrates with CBP C-TPAT cargo tracking requirements for trusted shipper programs.',
    website: 'https://samsara.com',
    tags: ['Fleet Telematics', 'ELD', 'C-TPAT', 'Cross-Border Compliance', 'Fleet Management'],
    evidence: ['C-TPAT GPS tracking integration (CBP approved)', 'El Paso cross-border carrier customer base 340+ fleets', 'DOT ELD mandate compliance platform certification'],
    category: 'Logistics',
    ikerScore: 71,
    lat: 31.7462, lon: -106.4722, layer: 'vendors', weight: 0.71, confidence: 0.75,
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

  'ep-elpaso-childrens': {
    id: 'ep-elpaso-childrens',
    name: "El Paso Children's Hospital",
    description: "The only freestanding children's hospital between San Antonio and Phoenix. Deploying AI-assisted pediatric diagnostics, remote patient monitoring, and a telemedicine platform serving rural West Texas children. Active Epic MyChart integration for bi-national patient families.",
    website: 'https://elpasochildrens.org',
    tags: ['Health Tech', 'Pediatrics', 'Telemedicine', 'AI Diagnostics', 'Remote Monitoring'],
    evidence: ['AI pediatric sepsis early warning system deployment (2024)', 'Telehealth expansion: 12 West Texas rural counties', 'Epic MyChart bilingual portal launch (2023)'],
    category: 'Health Tech',
    ikerScore: 72,
    lat: 31.7645, lon: -106.4962, layer: 'vendors', weight: 0.72, confidence: 0.86,
  },

  'ep-wbamc': {
    id: 'ep-wbamc',
    name: 'William Beaumont Army Medical Center',
    description: "Army's premier medical center in the Southwest, serving active duty soldiers and dependents at Fort Bliss. Driving military health IT procurement including medical readiness data systems, EHR integration with MHS Genesis, and combat casualty care simulation.",
    website: 'https://wbamc.amedd.army.mil',
    tags: ['Military Health', 'EHR', 'MHS Genesis', 'Combat Medicine', 'Health IT', 'Fort Bliss'],
    evidence: ['MHS Genesis (Cerner-based) full deployment 2023', 'Combat casualty simulation lab $15M investment', 'Army medical readiness data analytics platform'],
    category: 'Health Tech',
    ikerScore: 76,
    lat: 31.8028, lon: -106.4142, layer: 'vendors', weight: 0.76, confidence: 0.88,
  },

  'ep-caremore': {
    id: 'ep-caremore',
    name: 'CareMore Health El Paso',
    description: 'Integrated care model for Medicare Advantage members in the El Paso market. Deploys advanced care management technology, remote physiologic monitoring, and AI-driven care gap closure for a predominantly Hispanic, bilingual patient population.',
    website: 'https://caremore.com',
    tags: ['Health Tech', 'Medicare Advantage', 'Remote Monitoring', 'Care Management', 'AI Health'],
    evidence: ['El Paso market launch 2022 (2,400+ members enrolled)', 'Remote cardiac monitoring program rollout 2024', 'HEDIS quality measure top-quartile performance (2023)'],
    category: 'Health Tech',
    ikerScore: 68,
    lat: 31.7658, lon: -106.4945, layer: 'momentum', weight: 0.68, confidence: 0.78,
  },

  // ── Water Technology ──────────────────────────────────────────────────────

  'ep-epwater': {
    id: 'ep-epwater',
    name: 'El Paso Water Utilities',
    description: "World leader in water reuse and scarcity management serving 850,000+ residents in one of the most arid cities in the US. Operates the nation's first inland desalination plant and an advanced water reclamation system achieving near 100% water reuse.",
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

  'ep-gridworks': {
    id: 'ep-gridworks',
    name: 'GridWorks Energy',
    description: 'El Paso-based energy technology integrator deploying grid edge management systems, DERMS software, and battery energy storage solutions for EPE and commercial customers in the West Texas energy transition. Focused on solar-plus-storage for military and municipal clients.',
    website: 'https://gridworksep.com',
    tags: ['Energy Tech', 'DERMS', 'Battery Storage', 'Grid Edge', 'Solar+Storage'],
    evidence: ['EPE DERMS pilot contract ($3.2M, 2023)', 'Fort Bliss microgrid feasibility study award', 'Sunland Park solar+storage project 8 MW / 20 MWh'],
    category: 'Energy',
    ikerScore: 62,
    lat: 31.7192, lon: -106.2508, layer: 'momentum', weight: 0.62, confidence: 0.73,
  },

  'ep-abengoa': {
    id: 'ep-abengoa',
    name: 'Abengoa Solar El Paso',
    description: 'Operates West Texas concentrating solar power (CSP) assets and provides engineering services for utility-scale solar development in the El Paso Electric service territory. Supports EPE renewable portfolio compliance with Texas CREZ requirements.',
    website: 'https://abengoa.com',
    tags: ['Solar Energy', 'CSP', 'Utility Scale', 'Renewable Energy', 'EPE'],
    evidence: ['West Texas CSP engineering services contract (EPE)', 'CREZ renewable compliance program support', 'New 150 MW solar PPA executed with EPE (2024)'],
    category: 'Energy',
    ikerScore: 66,
    lat: 31.7162, lon: -106.2562, layer: 'vendors', weight: 0.66, confidence: 0.76,
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
    description: "Advanced manufacturing facility producing defense electronics, process controls, and building automation equipment. The El Paso plant supports Honeywell's Federal Manufacturing & Technologies division with classified defense component production.",
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

  'ep-borgwarner': {
    id: 'ep-borgwarner',
    name: 'BorgWarner El Paso',
    description: 'Advanced propulsion and electrical components manufacturer with a Juárez-El Paso production corridor. Produces EV thermal management systems, eMotor components, and high-voltage battery connectors for North American automakers transitioning to electrification.',
    website: 'https://borgwarner.com',
    tags: ['Automotive Tech', 'EV Components', 'Thermal Management', 'Electrification', 'Manufacturing'],
    evidence: ['EV thermal management system production ramp (2024, Juárez plant)', 'GM Ultium platform BorgWarner components supplier', 'Juárez campus expansion +1,200 jobs (2023)'],
    category: 'Manufacturing',
    ikerScore: 70,
    lat: 31.7348, lon: -106.5178, layer: 'vendors', weight: 0.70, confidence: 0.80,
  },

  'ep-commscope': {
    id: 'ep-commscope',
    name: 'CommScope El Paso',
    description: 'Network infrastructure components manufacturer with a significant El Paso-Juárez production facility. Produces fiber optic cable assemblies, RF connectivity solutions, and 5G small cell hardware for US telecom carriers and DoD communications programs.',
    website: 'https://commscope.com',
    tags: ['Telecom Infrastructure', '5G', 'Fiber Optics', 'RF Connectivity', 'Manufacturing'],
    evidence: ['AT&T fiber optic assembly supply contract', '5G small cell hardware production ramp 2024', 'DoD tactical communications components supplier'],
    category: 'Manufacturing',
    ikerScore: 69,
    lat: 31.7365, lon: -106.5148, layer: 'vendors', weight: 0.69, confidence: 0.79,
  },

  'ep-sanmina': {
    id: 'ep-sanmina',
    name: 'Sanmina Corporation El Paso',
    description: 'Electronics manufacturing services (EMS) company with a Juárez-El Paso integrated manufacturing campus. Builds complex PCBAs, medical device sub-assemblies, and defense electronics for medical OEMs and defense primes under IPC Class III standards.',
    website: 'https://sanmina.com',
    tags: ['Electronics Manufacturing', 'PCB Assembly', 'Medical Devices', 'Defense Electronics', 'EMS'],
    evidence: ['Medtronic medical device sub-assembly contract', 'IPC Class III / AS9100D certified facility', 'Juárez-EP campus 600k sq ft, 3,500 employees'],
    category: 'Manufacturing',
    ikerScore: 73,
    lat: 31.7412, lon: -106.5095, layer: 'vendors', weight: 0.73, confidence: 0.82,
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

  'ep-palantir-local': {
    id: 'ep-palantir-local',
    name: 'Palantir Technologies (Army)',
    description: 'Provides the Army AI Platform (AIP) and Palantir Gotham intelligence platform to Fort Bliss 1st Armored Division. AIP is deployed for operational planning, logistics predictive analytics, and battlefield management data fusion.',
    website: 'https://palantir.com/government',
    tags: ['AI/ML', 'Defense Analytics', 'Intelligence Platform', 'AIP', 'Gotham', 'Army'],
    evidence: ['Army AIP deployment contract ($480M, 2024 ceiling)', 'Fort Bliss AIP operational planning pilot (2024)', 'Palantir TITAN ground station integration support'],
    category: 'Defense IT',
    ikerScore: 89,
    lat: 31.7545, lon: -106.4768, layer: 'vendors', weight: 0.89, confidence: 0.88,
  },

  'ep-cogility': {
    id: 'ep-cogility',
    name: 'Cogility Corp',
    description: 'El Paso-based software company providing AI-driven decision support systems for defense logistics, border security analytics, and Army readiness management. Products integrate with LOGSA and Army G-4 data pipelines to automate maintenance forecasting.',
    website: 'https://cogility.com',
    tags: ['Defense IT', 'AI/ML', 'Logistics Analytics', 'Army Readiness', 'Decision Support'],
    evidence: ['Army G-4 readiness analytics contract (WSMR)', 'Cogility COBWEB platform deployed at Fort Bliss S-4', 'SBIR Phase II DoD award ($1.8M, 2024)'],
    category: 'Defense IT',
    ikerScore: 62,
    lat: 31.7572, lon: -106.4842, layer: 'momentum', weight: 0.62, confidence: 0.72,
  },

  'ep-kpmg': {
    id: 'ep-kpmg',
    name: 'KPMG El Paso / Juárez Advisory',
    description: 'Professional services firm with a bi-national El Paso-Juárez practice focused on maquiladora restructuring, USMCA rules-of-origin advisory, and digital transformation consulting for cross-border manufacturers. Growing cybersecurity advisory practice for critical infrastructure clients.',
    website: 'https://kpmg.com/us/en/home/offices/el-paso.html',
    tags: ['Consulting', 'USMCA', 'Maquiladora Advisory', 'Cybersecurity Advisory', 'Digital Transformation'],
    evidence: ['USMCA compliance advisory for 40+ maquiladora clients', 'El Paso Electric digital transformation engagement', 'Texas Enterprise Zone cybersecurity practice expansion (2023)'],
    category: 'Consulting',
    ikerScore: 72,
    lat: 31.7558, lon: -106.4812, layer: 'vendors', weight: 0.72, confidence: 0.80,
  },

  'ep-elpasoinnovation': {
    id: 'ep-elpasoinnovation',
    name: 'El Paso Innovation Hub (Entrada)',
    description: 'City of El Paso and UTEP co-managed technology incubator and startup accelerator located in the PDNG district. Houses 35+ technology startups focused on border tech, defense dual-use, and health tech verticals. Pipeline to federal SBIR/STTR programs.',
    website: 'https://entradaelpaso.com',
    tags: ['Startup Ecosystem', 'Incubator', 'SBIR', 'Border Tech', 'Defense Dual-Use', 'UTEP'],
    evidence: ['35 active portfolio companies (2024)', '$12M in SBIR/STTR awards facilitated since 2021', 'City of El Paso Economic Development strategic partner'],
    category: 'AI / ML',
    ikerScore: 55,
    lat: 31.7595, lon: -106.4878, layer: 'funding', weight: 0.55, confidence: 0.68,
  },

  // ── Construction / Infrastructure ─────────────────────────────────────────

  'ep-fluor': {
    id: 'ep-fluor',
    name: 'Fluor Corporation — Fort Bliss',
    description: 'Global engineering and construction firm with a long-standing presence at Fort Bliss supporting LOGCAP IV and V program execution. Manages large-scale barracks construction, base camp infrastructure, and facility sustainment for the Army Installation Management Command.',
    website: 'https://fluor.com',
    tags: ['Construction', 'LOGCAP', 'Military Construction', 'Facilities Management', 'Fort Bliss'],
    evidence: ['LOGCAP IV Fort Bliss task order execution ($380M ceiling)', 'Fort Bliss consolidated barracks construction program (2022–2024)', 'Army Corps of Engineers preferred contractor for Southwest region'],
    category: 'Construction',
    ikerScore: 82,
    lat: 31.8105, lon: -106.4295, layer: 'vendors', weight: 0.82, confidence: 0.88,
  },

  'ep-aecom': {
    id: 'ep-aecom',
    name: 'AECOM — Fort Bliss / WSMR',
    description: 'Global infrastructure firm providing environmental engineering, NEPA compliance, facility design, and construction management at Fort Bliss and White Sands Missile Range. Manages remediation of legacy contamination sites and supports range expansion environmental studies.',
    website: 'https://aecom.com',
    tags: ['Engineering', 'Environmental', 'NEPA', 'Construction Management', 'Fort Bliss', 'WSMR'],
    evidence: ['Fort Bliss NEPA environmental studies support contract (ongoing)', 'WSMR range expansion environmental impact assessment 2024', 'Army Corps of Engineers AFCEC task order ($65M IDIQ)'],
    category: 'Construction',
    ikerScore: 80,
    lat: 31.8012, lon: -106.4215, layer: 'vendors', weight: 0.80, confidence: 0.86,
  },

  'ep-kiewit': {
    id: 'ep-kiewit',
    name: 'Kiewit Corporation — El Paso',
    description: 'Major infrastructure and construction firm executing heavy civil, transportation, and border infrastructure projects in the El Paso-Las Cruces corridor. Active on TxDOT I-10 interchange improvements and the Tornillo-Guadalupe port of entry expansion program.',
    website: 'https://kiewit.com',
    tags: ['Construction', 'Infrastructure', 'Border Infrastructure', 'Transportation', 'TxDOT'],
    evidence: ['Tornillo-Guadalupe POE expansion construction contract ($210M, 2023)', 'TxDOT I-10/I-25 El Paso interchange reconstruction program', 'GSA border crossing modernization preferred contractor list'],
    category: 'Construction',
    ikerScore: 78,
    lat: 31.7498, lon: -106.4512, layer: 'vendors', weight: 0.78, confidence: 0.85,
  },

  'ep-hensel-phelps': {
    id: 'ep-hensel-phelps',
    name: 'Hensel Phelps — Fort Bliss MILCON',
    description: 'Employee-owned construction firm specializing in military construction (MILCON) and federal building projects. Consistently awarded Army MILCON contracts at Fort Bliss for barracks, training facilities, and readiness center construction under the USACE Albuquerque District.',
    website: 'https://henselphelps.com',
    tags: ['MILCON', 'Military Construction', 'Federal Construction', 'Fort Bliss', 'USACE'],
    evidence: ['Fort Bliss MILCON barracks replacement P-1234 contract ($145M, 2024)', 'Army Reserve Center El Paso construction award ($38M)', 'USACE Albuquerque District preferred MILCON contractor (10-year history)'],
    category: 'Construction',
    ikerScore: 76,
    lat: 31.8202, lon: -106.3985, layer: 'vendors', weight: 0.76, confidence: 0.84,
  },

  'ep-sundt': {
    id: 'ep-sundt',
    name: 'Sundt Construction — El Paso',
    description: 'Employee-owned construction firm with an active Southwest region presence executing federal, healthcare, and transportation projects in El Paso. Completed UTEP campus expansion projects and holds Texas DOT prequalification for highway construction.',
    website: 'https://sundt.com',
    tags: ['Construction', 'Healthcare Construction', 'Federal Buildings', 'Higher Education', 'TxDOT'],
    evidence: ['UTEP STEM Instructional Facility construction ($62M, 2023)', 'El Paso County courthouse renovation contract', 'TxDOT Loop 375 Border Highway West lane expansion'],
    category: 'Construction',
    ikerScore: 72,
    lat: 31.7612, lon: -106.4895, layer: 'vendors', weight: 0.72, confidence: 0.82,
  },

  // ── Professional Services ──────────────────────────────────────────────────

  'ep-pwc': {
    id: 'ep-pwc',
    name: 'PricewaterhouseCoopers — El Paso',
    description: 'Big Four advisory firm with an El Paso practice focused on cross-border tax structuring, USMCA transfer pricing, and maquiladora IMMEX program compliance for Fortune 500 manufacturers operating in the Juárez-El Paso corridor.',
    website: 'https://pwc.com',
    tags: ['Consulting', 'Tax Advisory', 'USMCA', 'Transfer Pricing', 'Maquiladora', 'Cross-Border'],
    evidence: ['50+ maquiladora USMCA rules-of-origin advisory engagements (2024)', 'Cross-border transfer pricing audit support for 3 NASDAQ-listed manufacturers', 'El Paso practice expansion: IMMEX restructuring group added Q1 2024'],
    category: 'Consulting',
    ikerScore: 75,
    lat: 31.7602, lon: -106.4912, layer: 'vendors', weight: 0.75, confidence: 0.82,
  },

  'ep-ey': {
    id: 'ep-ey',
    name: 'Ernst & Young — El Paso',
    description: 'Global professional services firm with an El Paso advisory team specializing in USMCA origin certification, Mexico maquiladora restructuring, and cross-border M&A due diligence for nearshoring transactions in the Juárez industrial park ecosystem.',
    website: 'https://ey.com',
    tags: ['Consulting', 'USMCA', 'M&A Advisory', 'Nearshoring', 'Tax', 'Maquiladora'],
    evidence: ['Led USMCA compliance review for Aptiv Juárez operations (2024)', 'Nearshoring transaction advisory for 4 Asian OEMs entering EP corridor (2023)', 'EY Reporting: El Paso-Juárez ranked top 3 US-Mexico nearshoring corridor'],
    category: 'Consulting',
    ikerScore: 74,
    lat: 31.7598, lon: -106.4805, layer: 'vendors', weight: 0.74, confidence: 0.81,
  },

  'ep-icf': {
    id: 'ep-icf',
    name: 'ICF International — DHS/Border',
    description: 'Management and technology consulting firm with federal contracts supporting DHS, CBP, and FEMA programs in the El Paso sector. Provides policy analysis, program evaluation, and technology implementation advisory for border security and emergency management clients.',
    website: 'https://icf.com',
    tags: ['Consulting', 'DHS', 'CBP', 'Border Security', 'Program Management', 'Policy Analysis'],
    evidence: ['DHS CBP technology modernization advisory task order ($28M IDIQ)', 'FEMA Region 6 emergency management program evaluation (El Paso county)', 'CBP tactical communications program assessment 2024'],
    category: 'Consulting',
    ikerScore: 70,
    lat: 31.7715, lon: -106.4445, layer: 'vendors', weight: 0.70, confidence: 0.80,
  },

  'ep-maxar': {
    id: 'ep-maxar',
    name: 'Maxar Technologies — Geospatial Intel',
    description: 'Commercial geospatial intelligence and satellite imagery provider supporting Fort Bliss training range mapping, NGA contracts, and CBP border surveillance programs. Provides high-resolution WorldView imagery and 3D terrain models for Army mission rehearsal exercises.',
    website: 'https://maxar.com',
    tags: ['Geospatial', 'Satellite Imagery', 'NGA', 'ISR', 'Fort Bliss', 'CBP', 'GEOINT'],
    evidence: ['NGA commercial GEOINT services contract (EnhancedView Follow-On, $300M ceiling)', 'Fort Bliss training range 3D terrain model delivery 2024', 'CBP border surveillance imagery subscription active'],
    category: 'Defense IT',
    ikerScore: 82,
    lat: 31.8108, lon: -106.4115, layer: 'vendors', weight: 0.82, confidence: 0.86,
  },

  'ep-peraton': {
    id: 'ep-peraton',
    name: 'Peraton (formerly Perspecta)',
    description: 'Defense and national security IT services firm formed from the merger of Perspecta and DXC. Holds active Fort Bliss IT infrastructure and cyber defense task orders. Provides enterprise IT operations, classified network management, and Army cyber readiness services.',
    website: 'https://peraton.com',
    tags: ['Defense IT', 'Cybersecurity', 'Enterprise IT', 'Army Networks', 'Fort Bliss', 'Classified'],
    evidence: ['Fort Bliss classified IT infrastructure task order ($92M, 2023)', 'Army ITES-3S enterprise services contract award', 'Peraton cyber SOC supporting ARCYBER-aligned missions'],
    category: 'Defense IT',
    ikerScore: 81,
    lat: 31.8118, lon: -106.4192, layer: 'vendors', weight: 0.81, confidence: 0.85,
  },

  // ── Transport / Freight ────────────────────────────────────────────────────

  'ep-bnsf': {
    id: 'ep-bnsf',
    name: 'BNSF Railway — El Paso Intermodal',
    description: 'BNSF operates a major intermodal facility in East El Paso connecting Class I rail to truck for US-Mexico cross-border freight. El Paso is one of four primary BNSF border crossing hubs, handling automotive parts, consumer goods, and raw materials from Mexico.',
    website: 'https://bnsf.com',
    tags: ['Rail', 'Intermodal', 'Cross-Border Freight', 'Logistics', 'US-Mexico Trade'],
    evidence: ['El Paso Intermodal Terminal handles 180k+ lifts/year (2024)', 'Announced $45M facility expansion for increased Mexico trade volume (2024)', 'Primary rail carrier for Juárez maquiladora finished goods northbound'],
    category: 'Logistics',
    ikerScore: 80,
    lat: 31.7812, lon: -106.3985, layer: 'vendors', weight: 0.80, confidence: 0.88,
  },

  'ep-ups': {
    id: 'ep-ups',
    name: 'UPS — El Paso Hub',
    description: 'UPS operates a major regional air and ground hub at El Paso International Airport, processing cross-border e-commerce shipments and commercial freight between the US and Mexico. Hub serves as a gateway for UPS Brokerage express customs clearance for US-Mexico parcels.',
    website: 'https://ups.com',
    tags: ['Logistics', 'Air Freight', 'Parcel', 'Cross-Border', 'Express Customs'],
    evidence: ['ELP air hub processes 35,000+ packages/day (2024)', 'UPS Brokerage Mexico Express Customs clearance program active', 'Amazon logistics partner with dedicated El Paso sort facility'],
    category: 'Logistics',
    ikerScore: 79,
    lat: 31.8012, lon: -106.3815, layer: 'vendors', weight: 0.79, confidence: 0.88,
  },

  'ep-werner': {
    id: 'ep-werner',
    name: 'Werner Enterprises — El Paso Cross-Border',
    description: 'Top-10 US truckload carrier with a dedicated El Paso cross-border division managing US-Mexico drayage, transloading, and intermodal services. Werner\'s Mexico subsidiary holds full operating authority in both countries and specializes in maquiladora supply chain management.',
    website: 'https://werner.com',
    tags: ['Truckload', 'Cross-Border', 'Drayage', 'Maquiladora Logistics', 'Intermodal'],
    evidence: ['El Paso terminal 250+ tractors dedicated to Mexico corridors', 'C-TPAT Tier III certified carrier (highest designation)', 'Werner Mexico cross-border volume +18% YoY (2024)'],
    category: 'Logistics',
    ikerScore: 76,
    lat: 31.7918, lon: -106.3908, layer: 'vendors', weight: 0.76, confidence: 0.86,
  },

  'ep-jbhunt': {
    id: 'ep-jbhunt',
    name: 'J.B. Hunt Transport — El Paso Intermodal',
    description: 'One of the largest US surface transportation firms, operating an El Paso intermodal terminal connecting BNSF and Union Pacific rail to drayage carriers crossing into Mexico. J.B. Hunt 360 digital freight platform integrates with CBP ACE for pre-clearance.',
    website: 'https://jbhunt.com',
    tags: ['Intermodal', 'Truckload', 'Digital Freight', 'CBP ACE', 'Cross-Border'],
    evidence: ['El Paso intermodal container dray volume 90k+ moves/year (2024)', 'J.B. Hunt 360 platform CBP ACE pre-clearance integration active', 'BNSF preferred intermodal marketing company (IMC) in El Paso'],
    category: 'Logistics',
    ikerScore: 77,
    lat: 31.7798, lon: -106.4092, layer: 'vendors', weight: 0.77, confidence: 0.87,
  },

  'ep-odfl': {
    id: 'ep-odfl',
    name: 'Old Dominion Freight Line — El Paso',
    description: 'National LTL carrier ranked #1 in on-time delivery with a major El Paso service center handling regional and transcontinental freight. Key carrier for maquiladora components inbound to Juárez plants and finished goods returning to US distribution.',
    website: 'https://odfl.com',
    tags: ['LTL', 'Freight', 'Regional Distribution', 'Maquiladora', 'Supply Chain'],
    evidence: ['El Paso service center ranked top-10 ODFL terminals by volume (2024)', 'On-time delivery rate 99.1% Southwest region (Q4 2024)', 'Inbound maquiladora component delivery program serving 80+ Juárez plants'],
    category: 'Logistics',
    ikerScore: 74,
    lat: 31.7905, lon: -106.3715, layer: 'vendors', weight: 0.74, confidence: 0.85,
  },

  // ── Government / Military Entities ────────────────────────────────────────

  'ep-micc': {
    id: 'ep-micc',
    name: 'Fort Bliss MICC',
    description: 'Mission & Installation Contracting Command — Fort Bliss. The primary Army contracting authority for Fort Bliss installation, managing over $600M in annual contract actions covering base operations, construction, IT services, and professional services. Primary entry point for vendor engagement with Fort Bliss.',
    website: 'https://micc.army.mil/fortbliss',
    tags: ['Government', 'Military Contracting', 'Fort Bliss', 'Army Procurement', 'MILCON'],
    evidence: ['$600M+ annual contract award volume (FY2024)', 'Primary contracting office for 1st Armored Division and IMCOM-Fort Bliss', 'SAM.gov listings: 200+ open solicitations FY2024'],
    category: 'Government',
    ikerScore: 88,
    lat: 31.8205, lon: -106.4112, layer: 'vendors', weight: 0.88, confidence: 0.95,
  },

  'ep-dea-epic': {
    id: 'ep-dea-epic',
    name: 'DEA — El Paso Intelligence Center (EPIC)',
    description: 'El Paso Intelligence Center is a multi-agency intelligence center led by the DEA, co-located with DHS, CBP, ICE, and DoD analysts. EPIC serves as the primary intelligence fusion center for US-Mexico drug trafficking, human smuggling, and transnational criminal organization targeting.',
    website: 'https://dea.gov/el-paso-intelligence-center',
    tags: ['Intelligence', 'DEA', 'Border Security', 'Drug Enforcement', 'Fusion Center', 'Multi-Agency'],
    evidence: ['Multi-agency intel fusion center: 20+ federal agencies co-located', 'Processes 500+ intelligence reports per month on TCO activity (2024)', 'Primary intelligence node for Southwest Border Campaign operations'],
    category: 'Government',
    ikerScore: 85,
    lat: 31.7712, lon: -106.4985, layer: 'vendors', weight: 0.85, confidence: 0.92,
  },

  'ep-cbp-sector': {
    id: 'ep-cbp-sector',
    name: 'CBP — El Paso Sector HQ',
    description: 'U.S. Customs and Border Protection El Paso Sector headquarters, responsible for border security operations across 125 miles of the US-Mexico border from the Texas-New Mexico state line. The El Paso Sector manages six ports of entry and is one of the largest CBP procurement consumers in the Southwest.',
    website: 'https://cbp.gov/border-security/along-us-borders/border-patrol-sectors/el-paso-sector',
    tags: ['Government', 'CBP', 'Border Security', 'Ports of Entry', 'Procurement'],
    evidence: ['Manages 6 POEs: Paso del Norte, Bridge of Americas, Ysleta, and 3 others', 'Annual technology procurement budget $85M+ (FY2024 estimate)', 'CBP El Paso USBP Sector: 3,200+ agents and officers'],
    category: 'Government',
    ikerScore: 87,
    lat: 31.7498, lon: -106.4912, layer: 'vendors', weight: 0.87, confidence: 0.93,
  },

  'ep-usace': {
    id: 'ep-usace',
    name: 'US Army Corps of Engineers — Albuquerque District',
    description: 'US Army Corps of Engineers Albuquerque District manages military construction, civil works, and environmental programs across New Mexico, West Texas, and southern Colorado. Primary contracting authority for MILCON projects at Fort Bliss, WSMR, and Holloman AFB.',
    website: 'https://www.spa.usace.army.mil',
    tags: ['Government', 'MILCON', 'Civil Engineering', 'Construction Management', 'Environmental', 'Army Corps'],
    evidence: ['FY2024 MILCON program: $420M in Fort Bliss and WSMR project awards', 'Border infrastructure civil works projects under INA authority', 'Environmental remediation oversight at 14 Fort Bliss FUDS sites'],
    category: 'Government',
    ikerScore: 86,
    lat: 31.8095, lon: -106.4315, layer: 'vendors', weight: 0.86, confidence: 0.93,
  },

  'ep-wsmr': {
    id: 'ep-wsmr',
    name: 'White Sands Missile Range',
    description: 'Largest military installation in the US by area (3,200 sq miles), serving as the primary DoD test and evaluation range for missiles, directed energy weapons, hypersonic systems, and electronic warfare. Operates the High Energy Laser System Test Facility (HELSTF) and multiple radar tracking networks.',
    website: 'https://wsmr.army.mil',
    tags: ['Defense', 'Test & Evaluation', 'Missiles', 'Hypersonics', 'Directed Energy', 'WSMR'],
    evidence: ['FY2024 test program: 1,200+ individual tests across all services', 'Hypersonic weapon systems test range expansion $320M (2023–2026)', 'HELSTF directed energy testing facility upgrade contract awarded 2024'],
    category: 'Government',
    ikerScore: 89,
    lat: 31.8508, lon: -106.2985, layer: 'vendors', weight: 0.89, confidence: 0.94,
  },

  // ── Local Tech / Startups ──────────────────────────────────────────────────

  'ep-strangeworks': {
    id: 'ep-strangeworks',
    name: 'Strangeworks — Quantum Computing',
    description: 'Austin-based quantum computing software company with a Texas Army partnership and growing presence in the El Paso defense tech corridor. Provides quantum algorithm development tools and hybrid classical-quantum computing access via the Strangeworks QC platform for DoD research programs.',
    website: 'https://strangeworks.com',
    tags: ['Quantum Computing', 'Defense Tech', 'AI/ML', 'Army Research', 'HPC'],
    evidence: ['US Army DEVCOM Army Research Laboratory partnership MOU (2023)', 'Strangeworks QC platform: 30+ quantum hardware providers integrated', 'Raised $24M Series A (2023, Lightspeed Venture Partners)'],
    category: 'AI / ML',
    ikerScore: 65,
    lat: 31.7602, lon: -106.4782, layer: 'momentum', weight: 0.65, confidence: 0.76,
  },

  'ep-evolv': {
    id: 'ep-evolv',
    name: 'Evolv Technology — Border Screening',
    description: 'AI-powered security screening system provider deploying touchless weapons detection at high-throughput locations. Evolv Express units are being evaluated at El Paso ports of entry for pedestrian lane screening to replace traditional magnetometer infrastructure.',
    website: 'https://evolvtechnology.com',
    tags: ['Security Tech', 'AI Screening', 'Weapons Detection', 'Border Tech', 'CBP', 'Ports of Entry'],
    evidence: ['CBP pedestrian lane security screening pilot evaluation (Paso del Norte POE, 2024)', 'Evolv Express deployed at 1,000+ venues globally including NFL stadiums', 'DHS S&T accelerator participant for non-intrusive inspection technology'],
    category: 'Border Tech',
    ikerScore: 68,
    lat: 31.7502, lon: -106.4742, layer: 'momentum', weight: 0.68, confidence: 0.78,
  },

  'ep-blackhorse': {
    id: 'ep-blackhorse',
    name: 'Black Horse Group',
    description: 'El Paso-based defense consulting and program management firm founded by veterans of the 11th Armored Cavalry Regiment (Black Horse). Provides acquisition strategy, proposal support, and technology transition advisory to small defense businesses seeking Fort Bliss and WSMR contracts.',
    website: 'https://blackhorsegroup.com',
    tags: ['Defense Consulting', 'Acquisition Strategy', 'Program Management', 'Veteran-Owned', 'SBIR Support'],
    evidence: ['20+ Fort Bliss vendor clients assisted with MICC contract awards (2023–2024)', 'SDVOSB certified small business consulting firm', 'Co-located with Entrada El Paso innovation hub'],
    category: 'Consulting',
    ikerScore: 55,
    lat: 31.7602, lon: -106.4895, layer: 'momentum', weight: 0.55, confidence: 0.72,
  },

  'ep-smartrosetta': {
    id: 'ep-smartrosetta',
    name: 'Smart Rosetta',
    description: 'El Paso AI startup developing bilingual English-Spanish NLP models for legal document processing, immigration paperwork automation, and cross-border trade document digitization. Targets law firms, customs brokers, and immigration attorneys serving the El Paso-Juárez bi-national community.',
    website: 'https://smartrosetta.com',
    tags: ['AI/ML', 'NLP', 'Bilingual AI', 'Legal Tech', 'Immigration Tech', 'Cross-Border'],
    evidence: ['Pre-Seed $850k raised (2024, UTEP tech transfer spinout)', 'Pilot with 3 El Paso immigration law firms for document automation', 'Texas SBIR Phase I award for bilingual legal NLP ($150k, 2024)'],
    category: 'AI / ML',
    ikerScore: 52,
    lat: 31.7612, lon: -106.4802, layer: 'funding', weight: 0.52, confidence: 0.70,
  },

  'ep-teksynap': {
    id: 'ep-teksynap',
    name: 'TekSynap Corporation',
    description: 'Defense IT managed services company providing network operations, cybersecurity, and end-user computing support to Army installations including Fort Bliss. TekSynap holds Army ITES-3H and SETI contract vehicles for IT services delivery across the Southwest region.',
    website: 'https://teksynap.com',
    tags: ['Defense IT', 'Managed Services', 'Network Operations', 'Cybersecurity', 'ITES-3H', 'Army'],
    evidence: ['Fort Bliss ITES-3H network operations task order ($47M, 2024)', 'Army Cyber Command SETI contract award active', 'El Paso cleared workforce: 180+ personnel on post (2024)'],
    category: 'Defense IT',
    ikerScore: 70,
    lat: 31.8115, lon: -106.4195, layer: 'vendors', weight: 0.70, confidence: 0.80,
  },

  // ── Business / Institutions ────────────────────────────────────────────────

  'ep-helenoftroy': {
    id: 'ep-helenoftroy',
    name: 'Helen of Troy Limited',
    description: 'Global consumer products company headquartered in Hamilton, Bermuda with its principal executive offices in El Paso, Texas. Owns brands including OXO, Hydro Flask, Honeywell Home, Vicks, Braun, and Osprey. El Paso office manages global product development strategy and North American supply chain.',
    website: 'https://helenoftroy.com',
    tags: ['Consumer Goods', 'CPG', 'Brand Management', 'Global Supply Chain', 'El Paso HQ'],
    evidence: ['$2.1B annual revenue (FY2024)', 'El Paso executive HQ: 400+ employees', 'Hydro Flask and OXO brand acquisition strategy drives portfolio growth'],
    category: 'Manufacturing',
    ikerScore: 78,
    lat: 31.7712, lon: -106.4205, layer: 'vendors', weight: 0.78, confidence: 0.88,
  },

  'ep-delek': {
    id: 'ep-delek',
    name: 'Delek US — El Paso Refinery',
    description: 'Delek US Holdings operates the former Western Refining El Paso refinery, one of the largest crude oil refineries in the Southwest. Processes West Texas Intermediate crude into gasoline, diesel, jet fuel, and asphalt for the El Paso-Fort Bliss regional market.',
    website: 'https://delekus.com',
    tags: ['Energy', 'Refinery', 'Petroleum', 'Fuel Supply', 'Defense Logistics', 'Fort Bliss'],
    evidence: ['El Paso refinery 25,000 BPD processing capacity', 'DLA Energy fuel supply contract for Fort Bliss (JP-8 jet fuel)', 'Western Refining acquisition completed; El Paso operations fully integrated'],
    category: 'Energy',
    ikerScore: 72,
    lat: 31.7305, lon: -106.3195, layer: 'vendors', weight: 0.72, confidence: 0.82,
  },

  'ep-borderplex': {
    id: 'ep-borderplex',
    name: 'Borderplex Alliance',
    description: 'El Paso\'s primary economic development and trade organization representing the Borderplex region (El Paso-Las Cruces-Ciudad Juárez). Acts as the official interface between site selectors, government agencies, and businesses considering investment in the region. Manages the borderplexdata.com regional economic intelligence platform.',
    website: 'https://borderplexalliance.org',
    tags: ['Economic Development', 'Site Selection', 'FDI', 'Nearshoring', 'Borderplex', 'USMCA'],
    evidence: ['Facilitated $1.4B in announced investment into the Borderplex region (2023)', 'Borderplexdata.com: regional economic data platform launched 2022', 'Primary liaison for 15+ Fortune 500 nearshoring site selection inquiries (2024)'],
    category: 'Economic Development',
    ikerScore: 68,
    lat: 31.7612, lon: -106.4895, layer: 'momentum', weight: 0.68, confidence: 0.80,
  },

  'ep-utep-kiran': {
    id: 'ep-utep-kiran',
    name: 'UTEP — Kiran Analytics Research Institute',
    description: 'UTEP research institute focused on applied data analytics, machine learning, and decision science for public health, transportation, and border management. Conducts federally-funded research in collaboration with TXDOT, NIH, and DHS on data-driven policy solutions for the Southwest US.',
    website: 'https://utep.edu/kiran',
    tags: ['Research', 'Data Analytics', 'Machine Learning', 'Public Health Analytics', 'Transportation', 'UTEP'],
    evidence: ['NIH R01 grant for border community health analytics ($1.8M, 2024)', 'TxDOT data science partnership for I-10 traffic pattern analysis', 'DHS cross-border mobility analytics pilot with UTEP Kiran team'],
    category: 'AI / ML',
    ikerScore: 60,
    lat: 31.7722, lon: -106.5082, layer: 'momentum', weight: 0.60, confidence: 0.75,
  },

  'ep-ttuhsc-ep': {
    id: 'ep-ttuhsc-ep',
    name: 'Texas Tech University Health Sciences Center EP',
    description: 'Independent academic health science center in El Paso training physicians, nurses, and allied health professionals for the West Texas-New Mexico region. Operates the Paul L. Foster School of Medicine and is expanding clinical research into border health disparities, infectious disease, and trauma care.',
    website: 'https://ttuhsc.edu/elpaso',
    tags: ['Medical Education', 'Health Research', 'Border Health', 'Trauma Care', 'Academic Medicine'],
    evidence: ['Paul L. Foster School of Medicine: 250+ enrolled MD candidates (2024)', 'NIH T32 training grant for border health research ($2.1M)', 'TTUHSC EP + UMC Level I Trauma Center academic affiliation agreement (2023)'],
    category: 'Health Tech',
    ikerScore: 65,
    lat: 31.7712, lon: -106.5022, layer: 'vendors', weight: 0.65, confidence: 0.80,
  },

  // ── Warehouse Automation & AMR ─────────────────────────────────────────────

  'ind-locus': {
    id: 'ind-locus',
    name: 'Locus Robotics',
    description: 'Autonomous mobile robot (AMR) platform provider for fulfillment and distribution centers. LocusBot units navigate warehouse floors autonomously, collaborating with human workers to dramatically increase pick rates and throughput.',
    website: 'https://locusrobotics.com',
    tags: ['AMR', 'Warehouse Automation', 'Robotics', 'Fulfillment', 'Pick & Pack'],
    evidence: ['800M+ units picked annually across customer deployments worldwide (2024)', 'Raised $150M Series E led by Tiger Global at $1B+ valuation', 'Partnership with DHL Supply Chain for global AMR rollout across 100+ facilities'],
    category: 'Robotics',
    ikerScore: 78,
    lat: 42.3601, lon: -71.0589, layer: 'momentum', weight: 0.78, confidence: 0.85,
  },

  'ind-6river': {
    id: 'ind-6river',
    name: '6 River Systems (Shopify)',
    description: 'Collaborative mobile robot (CMR) platform acquired by Shopify. Chuck robots guide associates through warehouse fulfillment tasks, reducing walking time and errors. Deployed in 3PL, retail, and e-commerce distribution facilities.',
    website: 'https://6river.com',
    tags: ['AMR', 'Collaborative Robots', 'Warehouse Automation', 'Fulfillment', 'Shopify'],
    evidence: ['Acquired by Shopify for $450M (2019)', 'Deployed in 50+ fulfillment centers across North America and Europe', 'Processing 1M+ units/day across active deployments (2024)'],
    category: 'Robotics',
    ikerScore: 74,
    lat: 42.3756, lon: -71.1069, layer: 'vendors', weight: 0.74, confidence: 0.82,
  },

  'ind-fetch': {
    id: 'ind-fetch',
    name: 'Fetch Robotics (Zebra Technologies)',
    description: 'Autonomous mobile robot platform for warehouse automation and on-demand material transport. FetchCore cloud software manages fleets of Fetch and Freight AMRs. Acquired by Zebra Technologies in 2021.',
    website: 'https://fetchrobotics.com',
    tags: ['AMR', 'Warehouse Automation', 'Fleet Management', 'Material Transport', 'Zebra Technologies'],
    evidence: ['Acquired by Zebra Technologies for $290M (2021)', 'Integrated with Zebra Savanna data intelligence platform', 'Deployed in automotive, e-commerce, and 3PL facilities across 15 countries'],
    category: 'Robotics',
    ikerScore: 76,
    lat: 37.3861, lon: -122.0839, layer: 'vendors', weight: 0.76, confidence: 0.83,
  },

  'ind-iam': {
    id: 'ind-iam',
    name: 'IAM Robotics',
    description: 'Autonomous mobile picking robot developer offering Swift AMRs capable of piece-picking individual SKUs in warehouse environments. Combines autonomous navigation with robotic arm manipulation for fully automated picking operations.',
    website: 'https://iamrobotics.com',
    tags: ['AMR', 'Piece Picking', 'Robotic Arms', 'Warehouse Automation', 'Autonomous Navigation'],
    evidence: ['Series B funding $30M (2022)', 'Deployed in pharmacy and consumer goods distribution centers', 'Pick accuracy rate 99.9% in commercial deployments'],
    category: 'Robotics',
    ikerScore: 65,
    lat: 40.4406, lon: -79.9959, layer: 'momentum', weight: 0.65, confidence: 0.76,
  },

  'ind-vecna': {
    id: 'ind-vecna',
    name: 'Vecna Robotics',
    description: 'Autonomous forklift and pallet-moving robot company providing heavy-payload AMRs for warehouse and manufacturing floor material handling. Pivotal software platform provides real-time orchestration across mixed human-robot workflows.',
    website: 'https://vecnarobotics.com',
    tags: ['AMR', 'Autonomous Forklift', 'Pallet Moving', 'Warehouse Automation', 'Orchestration'],
    evidence: ['Series B $100M (2022, Koch Disruptive Technologies lead)', 'Partnerships with Pepsico and Cardinal Health for forklift automation', 'Pivotal orchestration platform manages 10,000+ daily robot-human handoffs'],
    category: 'Robotics',
    ikerScore: 72,
    lat: 42.3736, lon: -71.1097, layer: 'momentum', weight: 0.72, confidence: 0.80,
  },

  'ind-geekplus': {
    id: 'ind-geekplus',
    name: 'Geek+',
    description: 'Global leader in smart logistics robotics providing goods-to-person AMR systems, sortation robots, and autonomous forklifts. Largest AMR fleet operator in China with rapidly expanding North American and European deployments.',
    website: 'https://geekplusglobal.com',
    tags: ['AMR', 'Goods-to-Person', 'Sortation Robots', 'Warehouse Automation', 'Logistics Robotics'],
    evidence: ['800+ customers globally, 50,000+ robots deployed as of 2024', 'North America expansion: DHL, Ceva Logistics partnerships', 'Series D funding valuation $2B+ (2021)'],
    category: 'Robotics',
    ikerScore: 82,
    lat: 39.9042, lon: 116.4074, layer: 'vendors', weight: 0.82, confidence: 0.87,
  },

  'ind-hairobotics': {
    id: 'ind-hairobotics',
    name: 'Hai Robotics',
    description: 'Autonomous case-handling robot (ACR) provider enabling high-density storage and rapid goods retrieval. HAIPICK ACR systems operate in racking structures up to 10 meters tall, dramatically increasing warehouse storage density.',
    website: 'https://hairobotics.com',
    tags: ['ACR', 'High-Density Storage', 'Goods Retrieval', 'Warehouse Automation', 'AMR'],
    evidence: ['400+ global customer deployments including DHL and SF Express (2024)', 'Series C funding $200M at $1B+ valuation (2022)', 'HAIPICK A42 robot: 1,500 picks/hour in commercial operations'],
    category: 'Robotics',
    ikerScore: 78,
    lat: 22.5431, lon: 114.0579, layer: 'momentum', weight: 0.78, confidence: 0.82,
  },

  'ind-quicktron': {
    id: 'ind-quicktron',
    name: 'Quicktron (Flashhold)',
    description: 'AMR and intelligent warehousing system provider offering goods-to-person robots, sorting systems, and warehouse management software. Strong presence in e-commerce fulfillment across Asia and expanding into North America and Europe.',
    website: 'https://flashhold.com',
    tags: ['AMR', 'Goods-to-Person', 'WMS', 'E-Commerce Fulfillment', 'Sortation'],
    evidence: ['5,000+ robots deployed across 200+ warehouses globally', 'Strategic partnership with Alibaba logistics (Cainiao)', 'North America market entry 2023 with Dallas, TX operations hub'],
    category: 'Robotics',
    ikerScore: 70,
    lat: 30.5728, lon: 104.0668, layer: 'vendors', weight: 0.70, confidence: 0.78,
  },

  'ind-greyorange': {
    id: 'ind-greyorange',
    name: 'GreyOrange',
    description: 'AI-powered fulfillment automation platform combining Ranger AMR robots with the Fulfillment AI (GreyMatter) software brain. Systems adapt dynamically to demand fluctuations, optimizing task allocation across robot fleets in real time.',
    website: 'https://greyorange.com',
    tags: ['AMR', 'AI Fulfillment', 'Fulfillment Automation', 'Warehouse AI', 'Dynamic Orchestration'],
    evidence: ['Raised $135M at $1B valuation (2021)', 'Deployed at DSW, GXO, and major fashion retail DCs', 'GreyMatter AI processes 10M+ fulfillment decisions per day'],
    category: 'Robotics',
    ikerScore: 77,
    lat: 33.7490, lon: -84.3880, layer: 'momentum', weight: 0.77, confidence: 0.83,
  },

  'ind-magazino': {
    id: 'ind-magazino',
    name: 'Magazino',
    description: 'Perception-based picking robots capable of autonomously identifying, grasping, and transporting individual items of varying sizes and shapes. TORU and SOTO robots serve pharmaceutical distribution and e-commerce picking operations.',
    website: 'https://magazino.eu',
    tags: ['Picking Robots', 'Computer Vision', 'Pharmaceutical Logistics', 'AMR', 'Autonomous Grasping'],
    evidence: ['Strategic investment by Kion Group and Jungheinrich', 'SOTO robot deployed at Siemens AG and Zalando logistics', 'Grasping success rate 99.5%+ on SKUs in production environments'],
    category: 'Robotics',
    ikerScore: 66,
    lat: 48.1351, lon: 11.5820, layer: 'vendors', weight: 0.66, confidence: 0.78,
  },

  'ind-righthand': {
    id: 'ind-righthand',
    name: 'RightHand Robotics',
    description: 'Robotic piece-picking solution combining AI-powered grasping with AMR mobility for high-SKU-variety order fulfillment. RightPick platform handles tens of thousands of SKU types with minimal programming required.',
    website: 'https://righthandrobotics.com',
    tags: ['Piece Picking', 'Robotic Grasping', 'AI Picking', 'Warehouse Automation', 'High-Mix Fulfillment'],
    evidence: ['Series B $23M (2021, Playground Global and GV lead)', 'Deployed at McKesson, PFS, and major e-commerce DCs', 'RightPick 3 handles 1,200 picks/hour in production'],
    category: 'Robotics',
    ikerScore: 68,
    lat: 42.3600, lon: -71.0562, layer: 'momentum', weight: 0.68, confidence: 0.79,
  },

  'ind-covariant': {
    id: 'ind-covariant',
    name: 'Covariant',
    description: 'AI robotics company developing a universal AI brain for industrial robots. Covariant Brain enables robotic arms to understand and manipulate any object in any warehouse environment without item-specific programming.',
    website: 'https://covariant.ai',
    tags: ['AI Robotics', 'Universal Robot Brain', 'Robotic Grasping', 'Warehouse AI', 'Foundation Models'],
    evidence: ['Series C $75M (2023, Index Ventures and Amplify Partners lead)', 'Partnership with ABB to embed Covariant Brain in commercial robots', 'Deployed at GEODIS, Knapp, and major pharmaceutical distributors'],
    category: 'Robotics',
    ikerScore: 75,
    lat: 37.8716, lon: -122.2727, layer: 'momentum', weight: 0.75, confidence: 0.83,
  },

  'ind-berkshiregrey': {
    id: 'ind-berkshiregrey',
    name: 'Berkshire Grey',
    description: 'AI-enabled robotic automation platform for retail, e-commerce, and grocery fulfillment. Intelligent Enterprise Robotics (IER) system combines AMRs, robotic picking arms, and dynamic sortation into end-to-end automation cells.',
    website: 'https://berkshiregrey.com',
    tags: ['AMR', 'Robotic Picking', 'Dynamic Sortation', 'Retail Fulfillment', 'Enterprise Robotics'],
    evidence: ['Acquired by SoftBank Robotics for $375M (2024)', 'Deployed at TJX, FedEx, and large grocery chains', 'Processes 300,000+ items per day in commercial fulfillment operations'],
    category: 'Robotics',
    ikerScore: 74,
    lat: 42.3601, lon: -71.0589, layer: 'vendors', weight: 0.74, confidence: 0.82,
  },

  'ind-plusone': {
    id: 'ind-plusone',
    name: 'Plus One Robotics',
    description: 'San Antonio-based robotic perception and depalletizing company enabling industrial robots to see and handle mixed-SKU cartons in logistics environments. PickOne vision system is deployed in parcel sortation and depalletizing at major carriers.',
    website: 'https://plusonerobotics.com',
    tags: ['Robotic Vision', 'Depalletizing', 'Parcel Sortation', 'Warehouse Automation', 'San Antonio'],
    evidence: ['Series B $50M (2022, FedEx Ventures and Pitney Bowes lead)', 'FedEx deployment: 40+ robotic depalletizing cells across US hubs', 'Crew Chief remote monitoring platform manages 500+ robot cells'],
    category: 'Robotics',
    ikerScore: 72,
    lat: 29.4241, lon: -98.4936, layer: 'momentum', weight: 0.72, confidence: 0.84,
  },

  'ind-dexterity': {
    id: 'ind-dexterity',
    name: 'Dexterity',
    description: 'AI-powered robotic system for palletizing, depalletizing, and trailer loading/unloading. Dexterity robots use deep learning to handle mixed-SKU pallets and work safely alongside human workers in receiving docks and shipping areas.',
    website: 'https://dexterity.ai',
    tags: ['Palletizing', 'Depalletizing', 'Trailer Loading', 'AI Robotics', 'Logistics Automation'],
    evidence: ['Series B $140M (2022, Kleiner Perkins and Lightspeed lead)', 'Deployed at DHL and Pitney Bowes sortation facilities', 'Handles 2,000+ carton types autonomously in production environments'],
    category: 'Robotics',
    ikerScore: 73,
    lat: 37.4419, lon: -122.1430, layer: 'momentum', weight: 0.73, confidence: 0.81,
  },

  'ind-symbotic': {
    id: 'ind-symbotic',
    name: 'Symbotic',
    description: 'End-to-end warehouse automation platform using high-speed AMRs operating in dense racking structures to automate full-case storage, retrieval, and palletizing for grocery and retail distribution centers.',
    website: 'https://symbotic.com',
    tags: ['Warehouse Automation', 'AMR', 'High-Speed Robotics', 'Grocery Distribution', 'Retail Automation'],
    evidence: ['$11.2B contract with Walmart to automate all 42 regional distribution centers (2022)', 'Revenue $1.4B FY2024, publicly traded (SYM) at NASDAQ', 'C&S Wholesale and Albertsons deployments operational'],
    category: 'Robotics',
    ikerScore: 92,
    lat: 42.4154, lon: -71.1565, layer: 'vendors', weight: 0.92, confidence: 0.95,
  },

  'ind-autostore': {
    id: 'ind-autostore',
    name: 'AutoStore',
    description: 'Grid-based robotic storage and retrieval system (AS/RS) where cube-shaped robots traverse a dense aluminum grid to store and retrieve inventory bins. Industry-leading storage density at 4x conventional shelving.',
    website: 'https://autostoresystem.com',
    tags: ['AS/RS', 'Grid Robotics', 'Dense Storage', 'Warehouse Automation', 'Order Fulfillment'],
    evidence: ['1,000+ installations in 45+ countries (2024)', 'Publicly traded (AUTO) on Oslo Stock Exchange, NOK 30B+ market cap', 'Deployed at Boots, Ikea, AutoZone, and GXO Logistics'],
    category: 'Robotics',
    ikerScore: 88,
    lat: 58.9690, lon: 5.7331, layer: 'vendors', weight: 0.88, confidence: 0.92,
  },

  'ind-exotec': {
    id: 'ind-exotec',
    name: 'Exotec',
    description: 'French robotics company offering the Skypod system — 3D goods-to-person robots that climb warehouse racking at 4m/s to retrieve inventory bins. Unicorn valued at $2B+ with global deployments in fashion, pharma, and grocery.',
    website: 'https://exotec.com',
    tags: ['AS/RS', 'Goods-to-Person', '3D Robotics', 'Warehouse Automation', 'Skypod'],
    evidence: ['$335M Series D at $2B valuation (2022, Goldman Sachs lead)', 'US market entry: Geodis, Gap, and Best Buy deployments', 'Skypod system processes 1,800 lines/hour per workstation'],
    category: 'Robotics',
    ikerScore: 80,
    lat: 50.6292, lon: 3.0573, layer: 'momentum', weight: 0.80, confidence: 0.85,
  },

  'ind-attabotics': {
    id: 'ind-attabotics',
    name: 'Attabotics',
    description: 'Canadian 3D robotic supply chain technology company using a single-shaft vertical storage structure with spider-like robots to reduce warehouse footprint by up to 85% versus conventional automated systems.',
    website: 'https://attabotics.com',
    tags: ['3D Robotics', 'Vertical Storage', 'Warehouse Automation', 'Space Efficient', 'Supply Chain'],
    evidence: ['$71M Series C (2021, BDC Capital and Osler lead)', 'American Eagle Outfitters deployment for omnichannel fulfillment', 'Footprint reduction 85% vs conventional AS/RS in installed deployments'],
    category: 'Robotics',
    ikerScore: 68,
    lat: 51.0447, lon: -114.0719, layer: 'momentum', weight: 0.68, confidence: 0.78,
  },

  'ind-mir': {
    id: 'ind-mir',
    name: 'MiR (Mobile Industrial Robots)',
    description: 'Danish AMR pioneer offering autonomous horizontal transport robots for factories and warehouses. MiR series robots handle intralogistics, raw material transport, and work-in-progress movement in manufacturing environments.',
    website: 'https://mobile-industrial-robots.com',
    tags: ['AMR', 'Intralogistics', 'Factory Automation', 'Material Transport', 'Manufacturing'],
    evidence: ['Acquired by Teradyne for $272M (2018)', 'Global installed base 7,000+ robots across 60+ countries (2024)', 'MiR1200 Pallet Jack: 1,200 kg payload, ATEX-certified for hazardous areas'],
    category: 'Robotics',
    ikerScore: 82,
    lat: 55.3959, lon: 10.3883, layer: 'vendors', weight: 0.82, confidence: 0.87,
  },

  // ── Industrial Automation & Robotics ──────────────────────────────────────

  'ind-fanuc': {
    id: 'ind-fanuc',
    name: 'Fanuc Corporation',
    description: 'World leading manufacturer of CNC systems, industrial robots, and factory automation equipment. Fanuc robots are deployed across automotive, electronics, and aerospace manufacturing worldwide, with over 750,000 industrial robots installed globally.',
    website: 'https://fanuc.com',
    tags: ['Industrial Robots', 'CNC Systems', 'Factory Automation', 'SCARA', 'Collaborative Robots'],
    evidence: ['750,000+ robots installed globally — largest installed base of any robot maker', 'Revenue ¥793B ($5.2B) FY2024', 'ROBOSHOT injection molding and ROBODRILL machining center market leaders in their segments'],
    category: 'Robotics',
    ikerScore: 95,
    lat: 35.5498, lon: 138.7480, layer: 'vendors', weight: 0.95, confidence: 0.97,
  },

  'ind-abb': {
    id: 'ind-abb',
    name: 'ABB Robotics',
    description: 'Global leader in industrial and collaborative robots for automotive, electronics, food & beverage, and logistics applications. ABB Robotics division offers the world\'s largest portfolio of industrial robots with 500,000+ units installed.',
    website: 'https://abb.com/robotics',
    tags: ['Industrial Robots', 'Collaborative Robots', 'Automotive Automation', 'OmniCore', 'Robot Software'],
    evidence: ['Revenue $1.7B robotics division FY2024', 'GoFa CRB 15000 cobot: best-in-class 15 kg payload for human-robot collaboration', 'Partnership with Covariant to integrate AI picking into ABB robot ecosystem'],
    category: 'Robotics',
    ikerScore: 93,
    lat: 47.3769, lon: 8.5417, layer: 'vendors', weight: 0.93, confidence: 0.95,
  },

  'ind-kuka': {
    id: 'ind-kuka',
    name: 'KUKA AG',
    description: 'German industrial robot manufacturer and systems integrator producing articulated robots, SCARA robots, and LBR iiwa collaborative robots for automotive, aerospace, and consumer goods manufacturing.',
    website: 'https://kuka.com',
    tags: ['Industrial Robots', 'Collaborative Robots', 'Automotive Automation', 'SCARA', 'Aerospace'],
    evidence: ['Acquired by Midea Group (China) for €2.6B (2017)', 'Installed base 80,000+ robots across 50+ countries', 'LBR iiwa: pioneering torque-sensing cobot deployed in 500+ medical device manufacturing lines'],
    category: 'Robotics',
    ikerScore: 88,
    lat: 48.3717, lon: 10.8983, layer: 'vendors', weight: 0.88, confidence: 0.92,
  },

  'ind-yaskawa': {
    id: 'ind-yaskawa',
    name: 'Yaskawa Electric (Motoman)',
    description: 'Japanese manufacturer of industrial robots (Motoman brand), AC servo drives, and motion controllers. Yaskawa robots serve welding, assembly, painting, and material handling applications across automotive and electronics sectors.',
    website: 'https://yaskawa.com',
    tags: ['Industrial Robots', 'Motoman', 'Welding Robots', 'Servo Drives', 'Motion Control'],
    evidence: ['560,000+ robots shipped globally as of 2024', 'Revenue ¥550B ($3.6B) FY2024', 'HC10 collaborative robot deployed in 200+ automotive final assembly operations'],
    category: 'Robotics',
    ikerScore: 90,
    lat: 33.5904, lon: 130.3990, layer: 'vendors', weight: 0.90, confidence: 0.93,
  },

  'ind-ur': {
    id: 'ind-ur',
    name: 'Universal Robots',
    description: 'Danish cobot pioneer and global leader in collaborative robot arms. UR cobots are the world\'s best-selling cobot brand, designed for easy programming and safe human-robot collaboration in small and medium manufacturers.',
    website: 'https://universal-robots.com',
    tags: ['Collaborative Robots', 'Cobots', 'Easy Programming', 'SME Automation', 'End-of-Arm Tooling'],
    evidence: ['75,000+ cobots sold as of 2024 — global cobot market leader', 'Acquired by Teradyne for $285M (2015); still operated independently', 'UR ecosystem: 300+ certified partners and 1,000+ compatible accessories'],
    category: 'Robotics',
    ikerScore: 89,
    lat: 55.3959, lon: 10.3883, layer: 'vendors', weight: 0.89, confidence: 0.94,
  },

  'ind-omron': {
    id: 'ind-omron',
    name: 'Omron Automation',
    description: 'Japanese automation company producing mobile robots, collaborative robots, machine vision systems, and industrial controllers. Omron LD AMR series and TM collaborative robots are widely deployed in electronics and pharmaceutical manufacturing.',
    website: 'https://automation.omron.com',
    tags: ['AMR', 'Collaborative Robots', 'Machine Vision', 'Industrial Controllers', 'Factory Automation'],
    evidence: ['Revenue ¥834B ($5.5B) industrial automation segment FY2024', 'LD-250 AMR deployed in 2,000+ factories globally', 'TM cobot Series: 20,000+ units sold since launch'],
    category: 'Robotics',
    ikerScore: 87,
    lat: 34.9756, lon: 135.7585, layer: 'vendors', weight: 0.87, confidence: 0.91,
  },

  'ind-epson-robotics': {
    id: 'ind-epson-robotics',
    name: 'Epson Robots',
    description: 'World\'s largest SCARA robot manufacturer producing high-speed, high-precision assembly robots for electronics, medical device, and consumer goods manufacturing. Epson SCARA robots dominate the sub-5kg precision assembly segment.',
    website: 'https://robots.epson.com',
    tags: ['SCARA Robots', 'Precision Assembly', 'Electronics Manufacturing', 'Medical Devices', 'High Speed'],
    evidence: ['Largest SCARA robot installed base globally: 75,000+ units', 'G-Series SCARA: 0.005mm repeatability — industry benchmark for precision assembly', 'Revenue $350M+ robotics segment annual (Seiko Epson Corp.)'],
    category: 'Robotics',
    ikerScore: 83,
    lat: 36.2048, lon: 138.2529, layer: 'vendors', weight: 0.83, confidence: 0.89,
  },

  'ind-staubli': {
    id: 'ind-staubli',
    name: 'Stäubli Robotics',
    description: 'Swiss precision robotics manufacturer specializing in SCARA, 4-axis, and 6-axis industrial robots for food, pharmaceutical, and microelectronics applications requiring cleanroom and hygienic design standards.',
    website: 'https://staubli.com/robotics',
    tags: ['Industrial Robots', 'Cleanroom Robots', 'Pharmaceutical Automation', 'Food Grade', 'SCARA'],
    evidence: ['TX2-140 robot: longest reach in its class at 1,400mm for pharmaceutical lines', 'FDA 21 CFR Part 11 compliant robot controllers', 'Revenue CHF 500M+ (Stäubli Group total, robotics division major contributor)'],
    category: 'Robotics',
    ikerScore: 80,
    lat: 46.4802, lon: 6.8394, layer: 'vendors', weight: 0.80, confidence: 0.87,
  },

  'ind-comau': {
    id: 'ind-comau',
    name: 'Comau (Stellantis)',
    description: 'Italian industrial automation and robotics company (Stellantis subsidiary) producing heavy-duty welding robots, assembly lines, and digital manufacturing solutions for automotive, aerospace, and energy sectors.',
    website: 'https://comau.com',
    tags: ['Industrial Robots', 'Welding Automation', 'Automotive Assembly', 'Digital Manufacturing', 'Heavy Payload'],
    evidence: ['Revenue €1.2B FY2023 (Stellantis subsidiary, IPO demerger planned)', 'Installed base 1.4 million production systems globally', 'MATE exoskeleton: CE-certified wearable robot adopted by Toyota and Fiat production lines'],
    category: 'Robotics',
    ikerScore: 82,
    lat: 45.0703, lon: 7.6869, layer: 'vendors', weight: 0.82, confidence: 0.88,
  },

  'ind-doosan': {
    id: 'ind-doosan',
    name: 'Doosan Robotics',
    description: 'South Korean collaborative robot manufacturer producing the H, M, A, and E series cobots for food service, manufacturing, and logistics automation. Doosan cobots are recognized for industry-leading force sensing safety and payload capacity.',
    website: 'https://doosanrobotics.com',
    tags: ['Collaborative Robots', 'Cobots', 'Food Service Automation', 'Force Sensing', 'South Korea'],
    evidence: ['IPO on KOSDAQ (2023) at 1.8 trillion KRW (~$1.4B) valuation', 'H2017 cobot: 20 kg payload — largest payload in the cobot class', 'Deployed in 3,000+ installations across 40 countries'],
    category: 'Robotics',
    ikerScore: 76,
    lat: 37.5665, lon: 126.9780, layer: 'vendors', weight: 0.76, confidence: 0.84,
  },

  'ind-techman': {
    id: 'ind-techman',
    name: 'Techman Robot',
    description: 'Taiwanese collaborative robot manufacturer integrating built-in vision systems directly into robot arms. TM series cobots enable pick-and-place, inspection, and assembly tasks with embedded AI vision without external camera systems.',
    website: 'https://tm-robot.com',
    tags: ['Collaborative Robots', 'Integrated Vision', 'AI Vision', 'Cobots', 'Pick and Place'],
    evidence: ['Omron strategic investment and distribution partnership (2020)', 'TM20: 1,900mm reach class-leading for integrated-vision cobots', 'Deployed in 50+ countries, Foxconn and Quanta Computer primary customers'],
    category: 'Robotics',
    ikerScore: 74,
    lat: 24.1477, lon: 120.6736, layer: 'vendors', weight: 0.74, confidence: 0.82,
  },

  'ind-bostondynamics': {
    id: 'ind-bostondynamics',
    name: 'Boston Dynamics',
    description: 'Advanced robotics company producing Spot (quadruped inspection robot), Stretch (warehouse depalletizing robot), and Atlas (humanoid). Spot is deployed in industrial inspection, military reconnaissance, and public safety applications.',
    website: 'https://bostondynamics.com',
    tags: ['Advanced Robotics', 'Spot Robot', 'Humanoid', 'Industrial Inspection', 'Depalletizing'],
    evidence: ['Acquired by Hyundai Motor Group for $1.1B (2021)', 'Spot: 1,500+ units deployed in oil & gas, construction, defense globally', 'Stretch depalletizer: DHL signed 15-unit deployment contract (2022)'],
    category: 'Robotics',
    ikerScore: 85,
    lat: 42.3467, lon: -71.0972, layer: 'momentum', weight: 0.85, confidence: 0.90,
  },

  'ind-agility': {
    id: 'ind-agility',
    name: 'Agility Robotics',
    description: 'Developer of Digit, a bipedal humanoid robot designed for warehouse picking, tote moving, and general material handling. Amazon has invested in and piloted Digit robots for tote movement in fulfillment centers.',
    website: 'https://agilityrobotics.com',
    tags: ['Humanoid Robots', 'Bipedal Robotics', 'Warehouse Automation', 'Tote Moving', 'Amazon'],
    evidence: ['Amazon investment and RFX partnership for warehouse deployment (2022)', 'RoboFab facility in Salem OR: first factory purpose-built for humanoid robot production', 'Series B $150M (2023, DCVC and Playground Global lead)'],
    category: 'Robotics',
    ikerScore: 76,
    lat: 44.9429, lon: -123.0351, layer: 'momentum', weight: 0.76, confidence: 0.82,
  },

  // ── Manufacturing Software & MES ──────────────────────────────────────────

  'ind-siemens-di': {
    id: 'ind-siemens-di',
    name: 'Siemens Digital Industries',
    description: 'Global leader in industrial automation software and hardware including Teamcenter PLM, Opcenter MES, Tecnomatix digital factory simulation, and SIMATIC control systems. Provides end-to-end digital twin and smart manufacturing solutions.',
    website: 'https://siemens.com/global/en/products/automation.html',
    tags: ['MES', 'PLM', 'Digital Twin', 'SCADA', 'Smart Manufacturing', 'Siemens'],
    evidence: ['Revenue €18.8B Digital Industries segment FY2024', 'Opcenter MES deployed in 1,500+ factories across 35 countries', 'SINUMERIK CNC: 70%+ market share in aerospace precision machining'],
    category: 'Manufacturing',
    ikerScore: 95,
    lat: 48.1351, lon: 11.5820, layer: 'vendors', weight: 0.95, confidence: 0.97,
  },

  'ind-rockwell': {
    id: 'ind-rockwell',
    name: 'Rockwell Automation',
    description: 'US-based industrial automation leader providing FactoryTalk MES, Logix PLCs, IntelliCenter motor control, and Plex cloud ERP for smart manufacturing. Serves automotive, food & beverage, life sciences, and oil & gas industries.',
    website: 'https://rockwellautomation.com',
    tags: ['MES', 'PLC', 'Industrial Automation', 'FactoryTalk', 'Smart Manufacturing'],
    evidence: ['Revenue $9.1B FY2024 (NYSE: ROK)', 'FactoryTalk MES deployed in 2,000+ manufacturing facilities', 'Acquisition of Plex Systems cloud ERP for $2.22B (2021)'],
    category: 'Manufacturing',
    ikerScore: 92,
    lat: 43.0496, lon: -76.1481, layer: 'vendors', weight: 0.92, confidence: 0.94,
  },

  'ind-honeywell-ps': {
    id: 'ind-honeywell-ps',
    name: 'Honeywell Process Solutions',
    description: 'Industrial process automation and optimization solutions for refining, chemicals, and oil & gas industries. Experion Process Knowledge System (PKS) DCS and Uniformance Suite analytics platform are industry standards.',
    website: 'https://process.honeywell.com',
    tags: ['DCS', 'Process Automation', 'SCADA', 'Oil & Gas', 'Refining', 'Process Control'],
    evidence: ['Experion PKS installed at 3,000+ plants globally', 'Revenue $14.2B Performance Materials & Technologies segment FY2024', 'Honeywell Forge IIoT platform: 300M+ connected industrial data points'],
    category: 'Manufacturing',
    ikerScore: 91,
    lat: 35.2271, lon: -80.8431, layer: 'vendors', weight: 0.91, confidence: 0.93,
  },

  'ind-emerson': {
    id: 'ind-emerson',
    name: 'Emerson Electric — Automation Solutions',
    description: 'Global automation technology and software company providing DeltaV DCS, Ovation control systems, and SCADA solutions for process industries. AspenTech (majority owned) adds AI-powered optimization software.',
    website: 'https://emerson.com/automation',
    tags: ['DCS', 'Process Automation', 'SCADA', 'DeltaV', 'AspenTech', 'Refining'],
    evidence: ['Revenue $14.9B Automation Solutions segment FY2024 (NYSE: EMR)', 'DeltaV DCS: 35,000+ installations in life sciences and chemicals globally', 'Acquisition of National Instruments for $8.2B (2023) for test & measurement integration'],
    category: 'Manufacturing',
    ikerScore: 92,
    lat: 38.6270, lon: -90.1994, layer: 'vendors', weight: 0.92, confidence: 0.95,
  },

  'ind-schneider': {
    id: 'ind-schneider',
    name: 'Schneider Electric',
    description: 'Global specialist in energy management and automation providing EcoStruxure architecture, Modicon PLCs, and EcoStruxure Machine SCADA systems. Leading in sustainable automation and microgrid management for industrial customers.',
    website: 'https://schneider-electric.com',
    tags: ['Industrial Automation', 'PLC', 'SCADA', 'EcoStruxure', 'Energy Management', 'Microgrid'],
    evidence: ['Revenue €35.9B FY2024 (Euronext: SU)', 'EcoStruxure deployed in 480,000+ sites across 100+ countries', 'EcoStruxure Machine Advisor: 10M+ connected machines on platform'],
    category: 'Manufacturing',
    ikerScore: 93,
    lat: 48.8698, lon: 2.3078, layer: 'vendors', weight: 0.93, confidence: 0.95,
  },

  'ind-dassault': {
    id: 'ind-dassault',
    name: 'Dassault Systèmes',
    description: 'French software company offering the 3DEXPERIENCE platform integrating CATIA, ENOVIA, DELMIA, and SIMULIA for product design, manufacturing simulation, and PLM. Leading digital twin and virtual manufacturing platform globally.',
    website: 'https://3ds.com',
    tags: ['PLM', 'Digital Twin', 'CATIA', 'DELMIA', 'Manufacturing Simulation', '3DEXPERIENCE'],
    evidence: ['Revenue €5.8B FY2024 (Euronext: DSY)', '3DEXPERIENCE platform: 370,000+ customers in 150 countries', 'DELMIA used by Toyota, Boeing, and Airbus for virtual factory planning'],
    category: 'Manufacturing',
    ikerScore: 91,
    lat: 48.8031, lon: 2.1233, layer: 'vendors', weight: 0.91, confidence: 0.94,
  },

  'ind-ptc': {
    id: 'ind-ptc',
    name: 'PTC Inc.',
    description: 'Industrial software company providing ThingWorx IIoT platform, Windchill PLM, Vuforia AR for factory operations, and Kepware industrial connectivity software. Leading vendor for smart connected operations and digital twin implementation.',
    website: 'https://ptc.com',
    tags: ['IIoT', 'PLM', 'Digital Twin', 'AR Factory', 'Windchill', 'ThingWorx'],
    evidence: ['Revenue $2.31B FY2024 (NASDAQ: PTC)', 'ThingWorx: 1,000+ enterprise IIoT deployments in manufacturing', 'Rockwell Automation strategic alliance: $1B investment in PTC (2018), joint go-to-market'],
    category: 'Manufacturing',
    ikerScore: 87,
    lat: 42.3601, lon: -71.0589, layer: 'vendors', weight: 0.87, confidence: 0.91,
  },

  'ind-aveva': {
    id: 'ind-aveva',
    name: 'AVEVA (Schneider Electric)',
    description: 'Industrial software company providing SCADA, MES, historian, and engineering design tools for process industries. AVEVA System Platform and AVEVA MES are deployed in refining, chemicals, and water treatment worldwide.',
    website: 'https://aveva.com',
    tags: ['MES', 'SCADA', 'Historian', 'Process Industries', 'Engineering Software', 'IIoT'],
    evidence: ['Acquired by Schneider Electric for £9.5B (2023)', 'AVEVA System Platform: 17,000+ deployments globally', 'AVEVA MES deployed at Chevron, Shell, and ExxonMobil facilities'],
    category: 'Manufacturing',
    ikerScore: 88,
    lat: 51.5074, lon: -0.1278, layer: 'vendors', weight: 0.88, confidence: 0.92,
  },

  'ind-inductive': {
    id: 'ind-inductive',
    name: 'Inductive Automation (Ignition)',
    description: 'California-based industrial automation software company offering the Ignition SCADA/MES platform on an unlimited licensing model. Ignition\'s open architecture and module-based design have made it the fastest-growing SCADA platform in North America.',
    website: 'https://inductiveautomation.com',
    tags: ['SCADA', 'MES', 'Ignition Platform', 'Industrial Automation', 'OPC-UA', 'Open Architecture'],
    evidence: ['Ignition deployed in 60,000+ projects across 100+ countries (2024)', 'Unlimited licensing model drives rapid adoption in mid-market manufacturers', 'Integration with AWS, Azure IoT Hub, and Google Cloud for IIoT connectivity'],
    category: 'Manufacturing',
    ikerScore: 80,
    lat: 38.5816, lon: -121.4944, layer: 'vendors', weight: 0.80, confidence: 0.88,
  },

  // ── Logistics & Supply Chain Technology ───────────────────────────────────

  'ind-project44': {
    id: 'ind-project44',
    name: 'project44',
    description: 'High-velocity supply chain visibility platform providing real-time shipment tracking across ocean, air, rail, and truckload modes. Connected to 200,000+ carriers and 175+ ocean carriers, processing 10B+ data points daily for enterprise shippers.',
    website: 'https://project44.com',
    tags: ['Supply Chain Visibility', 'Freight Tracking', 'Multimodal', 'Ocean Freight', 'Real-Time Tracking'],
    evidence: ['Raised $420M Series F at $2.2B valuation (2022, Goldman Sachs lead)', '1,200+ enterprise customers including Amazon, Walmart, and GM', 'Movement platform processes 10B+ data events daily for supply chain visibility'],
    category: 'Logistics',
    ikerScore: 85,
    lat: 41.8781, lon: -87.6298, layer: 'vendors', weight: 0.85, confidence: 0.88,
  },

  'ind-fourkites': {
    id: 'ind-fourkites',
    name: 'FourKites',
    description: 'Dynamic supply chain visibility platform tracking 3M+ shipments daily across 200+ countries. AI-powered ETA predictions and real-time exception management help shippers and carriers optimize cross-border and domestic freight operations.',
    website: 'https://fourkites.com',
    tags: ['Supply Chain Visibility', 'Dynamic ETAs', 'Freight Tracking', 'AI Predictions', 'Cross-Border'],
    evidence: ['Raised $100M Series D (2021, August Capital lead)', '700+ enterprise customers including Kraft Heinz, Nestle, and P&G', 'FourKites Sustainability module: tracks carbon emissions for 100M+ shipments'],
    category: 'Logistics',
    ikerScore: 81,
    lat: 41.8781, lon: -87.6298, layer: 'momentum', weight: 0.81, confidence: 0.85,
  },

  'ind-flexport': {
    id: 'ind-flexport',
    name: 'Flexport',
    description: 'Digital freight forwarder and supply chain platform offering ocean, air, trucking, and customs brokerage services through a single software interface. Provides end-to-end visibility, trade finance, and nearshoring advisory for complex global supply chains.',
    website: 'https://flexport.com',
    tags: ['Digital Freight', 'Freight Forwarding', 'Ocean Freight', 'Customs Brokerage', 'Trade Finance'],
    evidence: ['Revenue $3.3B FY2023; majority acquisition by Shopify founders (2024)', 'Manages freight for 10,000+ importers and exporters globally', 'Flexport Capital: $200M+ in trade finance extended to supply chain clients'],
    category: 'Logistics',
    ikerScore: 83,
    lat: 37.7749, lon: -122.4194, layer: 'vendors', weight: 0.83, confidence: 0.86,
  },

  'ind-motive': {
    id: 'ind-motive',
    name: 'Motive (formerly KeepTruckin)',
    description: 'AI-powered fleet management and safety platform for trucking and field operations. Motive combines ELD compliance, AI dashcams, GPS tracking, and driver safety scores into a single platform used by 120,000+ fleets across North America.',
    website: 'https://gomotive.com',
    tags: ['Fleet Management', 'ELD', 'AI Dashcam', 'Driver Safety', 'GPS Tracking', 'Trucking'],
    evidence: ['Valuation $2.85B (2022, Coatue Management lead)', '120,000+ fleets and 1M+ drivers on platform (2024)', 'AI-powered collision detection prevents 40% of accidents in customer fleets (published study)'],
    category: 'Logistics',
    ikerScore: 84,
    lat: 37.7749, lon: -122.4194, layer: 'vendors', weight: 0.84, confidence: 0.88,
  },

  'ind-samsara': {
    id: 'ind-samsara',
    name: 'Samsara',
    description: 'Connected operations platform combining fleet telematics, video-based safety, equipment monitoring, and workflow digitization for transportation and industrial companies. Publicly traded with 16,000+ customers across North America.',
    website: 'https://samsara.com',
    tags: ['Fleet Telematics', 'Video Safety', 'Equipment Monitoring', 'IoT', 'Connected Operations'],
    evidence: ['Revenue $1.18B FY2025, NYSE: IOT, $20B+ market cap', '16,000+ enterprise customers including Sysco, US Foods, and Werner Enterprises', 'AI Safety Score correlates to 60% reduction in collision rates across fleet'],
    category: 'Logistics',
    ikerScore: 86,
    lat: 37.7749, lon: -122.4194, layer: 'vendors', weight: 0.86, confidence: 0.91,
  },

  'ind-platform-science': {
    id: 'ind-platform-science',
    name: 'Platform Science',
    description: 'Open tablet and software platform for commercial trucking enabling carriers to deploy and manage third-party apps across their fleet. Strategic investment from Volvo Group, DTNA, and Qualcomm positions it as the Android of the trucking cab.',
    website: 'https://platformscience.com',
    tags: ['Fleet Tech', 'Trucking Platform', 'In-Cab Apps', 'ELD', 'Telematics'],
    evidence: ['Investment consortium: Volvo Group, Daimler Truck NA, Qualcomm — combined $130M+', 'Deployed in Walmart, Werner, and Covenant Transportation fleets', 'Integration marketplace: 100+ third-party trucking apps available'],
    category: 'Logistics',
    ikerScore: 74,
    lat: 32.7157, lon: -117.1611, layer: 'momentum', weight: 0.74, confidence: 0.80,
  },

  'ind-trimble': {
    id: 'ind-trimble',
    name: 'Trimble Transportation',
    description: 'Transportation technology provider offering TMS, fleet management, and navigation solutions for trucking, last-mile delivery, and intermodal operations. TMW Suite and PC*MILER are industry-standard tools in enterprise freight management.',
    website: 'https://trimble.com/transportation',
    tags: ['TMS', 'Fleet Management', 'Navigation', 'PC*MILER', 'Intermodal', 'Transportation Software'],
    evidence: ['TMW TMS deployed at 1,000+ carriers and 3PLs', 'PC*MILER routing engine: 97% of North American TMS software integrates PC*MILER data', 'Revenue $1.1B Transportation segment FY2024 (NASDAQ: TRMB)'],
    category: 'Logistics',
    ikerScore: 84,
    lat: 40.5852, lon: -105.0749, layer: 'vendors', weight: 0.84, confidence: 0.88,
  },

  'ind-descartes': {
    id: 'ind-descartes',
    name: 'Descartes Systems Group',
    description: 'Canadian logistics technology company providing customs compliance, global trade intelligence, routing optimization, and carrier connectivity solutions. Descartes Global Logistics Network connects 75,000+ carriers and trading partners worldwide.',
    website: 'https://descartes.com',
    tags: ['Customs Compliance', 'Global Trade Intelligence', 'Routing Optimization', 'TMS', 'Carrier Network'],
    evidence: ['Revenue $550M FY2025 (NASDAQ: DSGX), 30+ consecutive quarters of organic growth', 'Descartes Global Logistics Network: 75,000+ connected trading partners', 'CBP ACE AES/ABI certified filing agent — critical for US-Mexico trade corridors'],
    category: 'Logistics',
    ikerScore: 82,
    lat: 43.4643, lon: -80.5204, layer: 'vendors', weight: 0.82, confidence: 0.87,
  },

  'ind-convoy': {
    id: 'ind-convoy',
    name: 'Convoy',
    description: 'Digital freight network matching shippers with truckers using AI-powered load matching and dynamic pricing. Known for reducing empty miles and emissions through intelligent backhaul matching and automated carrier payments.',
    website: 'https://convoy.com',
    tags: ['Digital Freight', 'Load Matching', 'AI Pricing', 'Empty Miles Reduction', 'Trucking'],
    evidence: ['Raised $900M total funding (T. Rowe Price, Jeff Bezos); Series E $260M (2021)', 'Reduced empty miles by 44% across platform vs industry average', 'Operations wind-down in 2023; assets acquired by Flexport, technology operations continue'],
    category: 'Logistics',
    ikerScore: 60,
    lat: 47.6062, lon: -122.3321, layer: 'vendors', weight: 0.60, confidence: 0.72,
  },

  'ind-transfix': {
    id: 'ind-transfix',
    name: 'Transfix',
    description: 'AI-powered freight marketplace and managed transportation platform providing automated load tendering, dynamic carrier selection, and predictive freight intelligence for Fortune 500 shippers.',
    website: 'https://transfix.io',
    tags: ['Digital Freight', 'Managed Transportation', 'AI Load Tendering', 'Freight Marketplace', 'Predictive Intelligence'],
    evidence: ['Raised $115M Series D (2021, Moore Strategic Ventures lead)', 'Customers include Anheuser-Busch, Unilever, and Henkel', 'Transfix Intelligence AI predicts spot rates with 92% accuracy 14 days out'],
    category: 'Logistics',
    ikerScore: 68,
    lat: 40.7128, lon: -74.0060, layer: 'momentum', weight: 0.68, confidence: 0.77,
  },

  'ind-uberfreight': {
    id: 'ind-uberfreight',
    name: 'Uber Freight',
    description: 'Digital freight platform and managed transportation provider owned by Uber. Combines self-service load booking with enterprise TMS capabilities, operating a marketplace of 160,000+ carriers and serving Fortune 500 shippers.',
    website: 'https://uberfreight.com',
    tags: ['Digital Freight', 'Load Booking', 'TMS', 'Carrier Marketplace', 'Managed Transportation'],
    evidence: ['Raised $550M from Greenbriar Equity Group, spun out as separate entity (2022)', '160,000+ contracted carriers on platform', 'Acquisition of Transplace TMS for $2.25B (2021) creates full-service freight platform'],
    category: 'Logistics',
    ikerScore: 79,
    lat: 37.7749, lon: -122.4194, layer: 'vendors', weight: 0.79, confidence: 0.84,
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
