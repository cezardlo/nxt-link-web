import type { TechInnovationCycle } from './innovation-cycle';

export const BATCH2_CYCLES: TechInnovationCycle[] = [

  // ── Defense ───────────────────────────────────────────────────────────────

  {
    id: 'tech-isr',
    name: 'Intelligence, Surveillance & Reconnaissance (ISR)',
    category: 'Defense',
    description:
      'Integrated sensor-to-shooter ISR platforms combining satellite, airborne, and ground-based collection for real-time battlefield awareness.',
    currentStage: 'impact',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['DARPA', 'NRO', 'MIT Lincoln Lab', 'Air Force Research Lab'],
        metrics: [
          { label: 'FOUNDATIONAL PROGRAMS', value: '18', progress: 95 },
          { label: 'INITIAL PATENTS', value: '1,240', progress: 88 },
        ],
        notes: 'Modern ISR concepts originated from Cold War satellite reconnaissance programs and DARPA ARPA-E sensor fusion research in the 1960s–70s.',
      },
      research: {
        entities: ['Sandia National Labs', 'Army Research Lab', 'UTEP ECE', 'Georgia Tech GTRI'],
        metrics: [
          { label: 'ACTIVE STUDIES', value: '64', progress: 82 },
          { label: 'RESEARCH PAPERS', value: '8,400+', progress: 90 },
          { label: 'COLLABORATIVE GRANTS', value: '$320M', progress: 75 },
        ],
        notes: 'ARL and Sandia focusing on multi-domain ISR fusion and AI-enabled target recognition.',
      },
      development: {
        entities: ['L3Harris', 'Northrop Grumman', 'Raytheon', 'Leidos'],
        metrics: [
          { label: 'PROTOTYPES', value: '32', progress: 78 },
          { label: 'DOD CONTRACTS', value: '$4.2B', progress: 92 },
          { label: 'ENG TEAM SIZE', value: '18,000+', progress: 95 },
        ],
        notes: 'L3Harris WESCAM turrets and Northrop Grumman Global Hawk platforms dominate ISR development.',
      },
      productization: {
        entities: ['L3Harris WESCAM', 'Northrop Grumman Global Hawk', 'General Atomics MQ-9'],
        metrics: [
          { label: 'PRODUCTS', value: '24', progress: 85 },
          { label: 'VENDORS', value: '38', progress: 80 },
        ],
      },
      adoption: {
        entities: ['Fort Bliss 1AD', 'CBP Air & Marine', 'US Army INSCOM', 'SOUTHCOM'],
        metrics: [
          { label: 'DEPLOYMENTS', value: '48', progress: 88 },
          { label: 'PROCUREMENT SIGNALS', value: '67', progress: 92 },
        ],
        notes: 'Fort Bliss 1st Armored Division operates extensive ISR assets; CBP Air & Marine flies MQ-9 Reapers over El Paso Sector.',
      },
      impact: {
        entities: ['DHS', 'US Army', 'CBP El Paso Sector'],
        metrics: [
          { label: 'DETECTION RATE', value: '+72%', progress: 72 },
          { label: 'RESPONSE TIME', value: '-45%', progress: 45 },
          { label: 'COVERAGE AREA', value: '+340%', progress: 85 },
        ],
        notes: 'ISR integration has dramatically expanded border and battlefield situational awareness across El Paso corridor.',
      },
    },
  },

  {
    id: 'tech-electronic-warfare',
    name: 'Electronic Warfare (EW)',
    category: 'Defense',
    description:
      'Electromagnetic spectrum dominance capabilities including jamming, spoofing, signals intelligence, and electronic protection for contested environments.',
    currentStage: 'adoption',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['Naval Research Lab', 'DARPA', 'MIT Lincoln Lab', 'Air Force Research Lab'],
        metrics: [
          { label: 'FOUNDATIONAL PATENTS', value: '680', progress: 92 },
          { label: 'CONCEPT PAPERS', value: '2,100+', progress: 85 },
        ],
        notes: 'EW concepts trace to WWII radar countermeasures; modern digital EW emerged from DARPA behavioral learning programs in the 2000s.',
      },
      research: {
        entities: ['Army Research Lab', 'Sandia National Labs', 'Johns Hopkins APL', 'UTEP ECE'],
        metrics: [
          { label: 'ACTIVE PROGRAMS', value: '22', progress: 72 },
          { label: 'RESEARCH PAPERS', value: '4,800+', progress: 78 },
          { label: 'GRANT FUNDING', value: '$185M', progress: 68 },
        ],
        notes: 'ARL advancing cognitive EW using machine learning for adaptive jamming at Fort Bliss test ranges.',
      },
      development: {
        entities: ['L3Harris', 'BAE Systems', 'Raytheon', 'Northrop Grumman'],
        metrics: [
          { label: 'PROTOTYPES', value: '14', progress: 65 },
          { label: 'DOD CONTRACTS', value: '$2.8B', progress: 85 },
          { label: 'ENG TEAM SIZE', value: '8,200+', progress: 80 },
        ],
        notes: 'L3Harris and BAE Systems are primary EW system integrators for Army ground vehicle and aviation platforms.',
      },
      productization: {
        entities: ['L3Harris Viper Shield', 'BAE Systems DEWS', 'Raytheon NGJ-MB'],
        metrics: [
          { label: 'PRODUCTS', value: '16', progress: 72 },
          { label: 'VENDORS', value: '24', progress: 68 },
        ],
      },
      adoption: {
        entities: ['Fort Bliss 915th CW Bn', 'US Army ARCYBER', 'White Sands Missile Range', 'NETCOM'],
        metrics: [
          { label: 'DEPLOYMENTS', value: '28', progress: 72 },
          { label: 'PROCUREMENT SIGNALS', value: '42', progress: 80 },
        ],
        notes: 'Fort Bliss 915th Cyber Warfare Battalion conducts EW exercises; White Sands provides open-air EW testing.',
      },
      impact: {
        entities: ['US Army', 'DHS', 'Fort Bliss'],
        metrics: [
          { label: 'SPECTRUM DENIAL', value: '+58%', progress: 58 },
          { label: 'THREAT DETECTION', value: '+44%', progress: 44 },
          { label: 'COST PER ENGAGEMENT', value: '-32%', progress: 32 },
        ],
        notes: 'EW capabilities have reduced adversary communications effectiveness and improved force protection at Fort Bliss.',
      },
    },
  },

  {
    id: 'tech-autonomous-systems',
    name: 'Autonomous Systems / Robotics',
    category: 'Defense',
    description:
      'Unmanned ground vehicles, robotic combat vehicles, and autonomous logistics platforms for contested environments.',
    currentStage: 'development',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['DARPA', 'Carnegie Mellon Robotics', 'MIT CSAIL', 'Army Research Lab'],
        metrics: [
          { label: 'FOUNDATIONAL PATENTS', value: '920', progress: 85 },
          { label: 'DARPA CHALLENGES', value: '6', progress: 90 },
        ],
        notes: 'DARPA Grand Challenge (2004–2007) catalyzed autonomous vehicle research; Army Robotics Requirements generated from 2015 onward.',
      },
      research: {
        entities: ['Army Research Lab', 'UTEP CS', 'Georgia Tech', 'Texas A&M'],
        metrics: [
          { label: 'ACTIVE PROGRAMS', value: '34', progress: 68 },
          { label: 'RESEARCH PAPERS', value: '6,200+', progress: 82 },
          { label: 'GRANT FUNDING', value: '$480M', progress: 78 },
        ],
        notes: 'ARL autonomous systems research includes human-robot teaming and contested environment navigation.',
      },
      development: {
        entities: ['Textron Systems', 'QinetiQ', 'Oshkosh Defense', 'L3Harris'],
        metrics: [
          { label: 'PROTOTYPES', value: '22', progress: 62 },
          { label: 'DOD CONTRACTS', value: '$1.9B', progress: 75 },
          { label: 'ENG TEAM SIZE', value: '6,400+', progress: 72 },
        ],
        notes: 'Army RCV Light and Medium programs testing at Fort Bliss and White Sands ranges. Textron Ripsaw and QinetiQ RoBattle leading candidates.',
      },
      productization: {
        entities: ['Textron Ripsaw M5', 'QinetiQ TITAN', 'Oshkosh TerraMax'],
        metrics: [
          { label: 'PRODUCTS', value: '12', progress: 55 },
          { label: 'VENDORS', value: '42', progress: 65 },
        ],
      },
      adoption: {
        entities: ['Fort Bliss', 'US Army Futures Command', 'White Sands Missile Range', 'TRADOC'],
        metrics: [
          { label: 'DEPLOYMENTS', value: '8', progress: 35 },
          { label: 'PILOTS ACTIVE', value: '12', progress: 52 },
        ],
        notes: 'Fort Bliss serves as primary testing ground for Army RCV program; limited operational deployments beginning.',
      },
      impact: {
        entities: ['US Army', 'Fort Bliss'],
        metrics: [
          { label: 'CASUALTY REDUCTION', value: '-28%', progress: 28 },
          { label: 'LOGISTICS EFFICIENCY', value: '+22%', progress: 22 },
          { label: 'OPERATIONAL TEMPO', value: '+15%', progress: 15 },
        ],
        notes: 'Early impact data from field exercises shows reduction in soldier exposure to hazardous tasks.',
      },
    },
  },

  {
    id: 'tech-c4isr',
    name: 'C4ISR Systems',
    category: 'Defense',
    description:
      'Integrated Command, Control, Communications, Computers, Intelligence, Surveillance, and Reconnaissance backbone for Army digital warfare.',
    currentStage: 'adoption',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['DARPA', 'Army Research Lab', 'MITRE Corporation', 'Rand Corporation'],
        metrics: [
          { label: 'ARCHITECTURE STUDIES', value: '42', progress: 95 },
          { label: 'FOUNDATIONAL PAPERS', value: '3,400+', progress: 92 },
        ],
        notes: 'C4ISR concept evolved from Army Force XXI digitization experiments in the 1990s and DARPA network-centric warfare research.',
      },
      research: {
        entities: ['Army DEVCOM C5ISR', 'Johns Hopkins APL', 'MIT Lincoln Lab', 'Sandia National Labs'],
        metrics: [
          { label: 'ACTIVE PROGRAMS', value: '48', progress: 85 },
          { label: 'RESEARCH PAPERS', value: '5,600+', progress: 88 },
          { label: 'GRANT FUNDING', value: '$720M', progress: 82 },
        ],
        notes: 'C5ISR Center leading research on Joint All-Domain Command and Control (JADC2) integration.',
      },
      development: {
        entities: ['Northrop Grumman', 'L3Harris', 'Raytheon', 'Palantir'],
        metrics: [
          { label: 'PROTOTYPES', value: '18', progress: 72 },
          { label: 'DOD CONTRACTS', value: '$8.4B', progress: 95 },
          { label: 'ENG TEAM SIZE', value: '22,000+', progress: 90 },
        ],
        notes: 'Northrop Grumman IBCS is the Army\'s primary integrated air and missile defense C4ISR platform, headquartered in Huntsville with Fort Bliss test infrastructure.',
      },
      productization: {
        entities: ['Northrop Grumman IBCS', 'L3Harris FALCON', 'Palantir Gotham'],
        metrics: [
          { label: 'PRODUCTS', value: '14', progress: 75 },
          { label: 'VENDORS', value: '55', progress: 82 },
        ],
      },
      adoption: {
        entities: ['Fort Bliss 1AD', 'Fort Bliss 32nd AAMDC', 'US Army PEO MS', 'White Sands'],
        metrics: [
          { label: 'DEPLOYMENTS', value: '22', progress: 68 },
          { label: 'PROCUREMENT SIGNALS', value: '84', progress: 90 },
        ],
        notes: 'IBCS operational testing at Fort Bliss and White Sands; 32nd AAMDC first unit equipped. Fort Bliss is the Army\'s primary IBCS integration site.',
      },
      impact: {
        entities: ['US Army', 'MDA', 'Fort Bliss'],
        metrics: [
          { label: 'ENGAGEMENT TIME', value: '-62%', progress: 62 },
          { label: 'SENSOR INTEGRATION', value: '+280%', progress: 78 },
          { label: 'INTEROPERABILITY', value: '+145%', progress: 68 },
        ],
        notes: 'IBCS demonstrated 3x increase in sensor-to-shooter integration during Fort Bliss live-fire exercises.',
      },
    },
  },

  {
    id: 'tech-hypersonics',
    name: 'Hypersonic Weapons & Defense',
    category: 'Defense',
    description:
      'Mach 5+ weapons systems and interceptor technologies for strategic strike and missile defense applications.',
    currentStage: 'development',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['DARPA', 'Sandia National Labs', 'Los Alamos National Lab', 'NASA'],
        metrics: [
          { label: 'FOUNDATIONAL PATENTS', value: '340', progress: 78 },
          { label: 'CONCEPT STUDIES', value: '28', progress: 85 },
        ],
        notes: 'Hypersonic research dates to X-15 program (1959); modern boost-glide concepts emerged from DARPA Falcon HTV-2 program in 2010.',
      },
      research: {
        entities: ['Sandia National Labs', 'Los Alamos National Lab', 'University of Arizona', 'Texas A&M'],
        metrics: [
          { label: 'ACTIVE PROGRAMS', value: '18', progress: 72 },
          { label: 'RESEARCH PAPERS', value: '2,800+', progress: 68 },
          { label: 'GRANT FUNDING', value: '$1.2B', progress: 88 },
        ],
        notes: 'Sandia leads thermal protection system research; LANL focuses on warhead and materials science for hypersonic environments.',
      },
      development: {
        entities: ['Raytheon', 'Lockheed Martin', 'Northrop Grumman', 'Dynetics'],
        metrics: [
          { label: 'PROTOTYPES', value: '8', progress: 48 },
          { label: 'DOD CONTRACTS', value: '$6.2B', progress: 90 },
          { label: 'ENG TEAM SIZE', value: '12,000+', progress: 82 },
        ],
        notes: 'Lockheed Martin Dark Eagle (LRHW) and Raytheon GPI programs tested at White Sands Missile Range adjacent to El Paso.',
      },
      productization: {
        entities: ['Lockheed Martin Dark Eagle', 'Raytheon GPI', 'Northrop Grumman GBI Upgrade'],
        metrics: [
          { label: 'PRODUCTS', value: '4', progress: 32 },
          { label: 'VENDORS', value: '12', progress: 45 },
        ],
      },
      adoption: {
        entities: ['White Sands Missile Range', 'MDA', 'US Army 5-3 FA (Fort Bliss)', 'STRATCOM'],
        metrics: [
          { label: 'DEPLOYMENTS', value: '3', progress: 18 },
          { label: 'TEST LAUNCHES', value: '12', progress: 42 },
        ],
        notes: 'Dark Eagle initial operational capability targeting Fort Bliss 5th Battalion, 3rd Field Artillery. White Sands is primary US hypersonic test range.',
      },
      impact: {
        entities: ['US Army', 'MDA', 'STRATCOM'],
        metrics: [
          { label: 'STRIKE RANGE', value: '+1,725 mi', progress: 65 },
          { label: 'TIME TO TARGET', value: '-78%', progress: 78 },
          { label: 'DETERRENCE INDEX', value: '+42%', progress: 42 },
        ],
        notes: 'Hypersonic capabilities provide strategic deterrence and rapid long-range precision strike not achievable with conventional missiles.',
      },
    },
  },

  {
    id: 'tech-directed-energy',
    name: 'Directed Energy Weapons',
    category: 'Defense',
    description:
      'High-energy laser and high-power microwave systems for counter-UAS, short-range air defense, and force protection.',
    currentStage: 'development',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['DARPA', 'Air Force Research Lab', 'Lawrence Livermore National Lab', 'Army Research Lab'],
        metrics: [
          { label: 'FOUNDATIONAL PATENTS', value: '480', progress: 82 },
          { label: 'CONCEPT PAPERS', value: '1,600+', progress: 78 },
        ],
        notes: 'Directed energy weapon concepts evolved from Cold War SDI "Star Wars" research; modern solid-state laser programs began early 2000s.',
      },
      research: {
        entities: ['Army Research Lab', 'Sandia National Labs', 'UTEP Physics', 'Air Force Research Lab Kirtland'],
        metrics: [
          { label: 'ACTIVE PROGRAMS', value: '14', progress: 65 },
          { label: 'RESEARCH PAPERS', value: '3,200+', progress: 72 },
          { label: 'GRANT FUNDING', value: '$680M', progress: 78 },
        ],
        notes: 'Kirtland AFB Directed Energy Directorate (near El Paso) leads DoD laser weapon science; UTEP contributes optics research.',
      },
      development: {
        entities: ['Raytheon', 'Lockheed Martin', 'Northrop Grumman', 'Boeing'],
        metrics: [
          { label: 'PROTOTYPES', value: '10', progress: 52 },
          { label: 'DOD CONTRACTS', value: '$2.4B', progress: 82 },
          { label: 'ENG TEAM SIZE', value: '5,800+', progress: 70 },
        ],
        notes: 'Raytheon DE-SHORAD and Lockheed Martin HELSI systems tested at White Sands; Boeing Compact Laser Weapon System in Army evaluation.',
      },
      productization: {
        entities: ['Raytheon DE-SHORAD', 'Lockheed Martin HELSI', 'BlueHalo LOCUST'],
        metrics: [
          { label: 'PRODUCTS', value: '6', progress: 38 },
          { label: 'VENDORS', value: '15', progress: 48 },
        ],
      },
      adoption: {
        entities: ['White Sands Missile Range', 'Fort Bliss', 'US Army PEO MS', 'US Navy'],
        metrics: [
          { label: 'DEPLOYMENTS', value: '4', progress: 22 },
          { label: 'TEST EVENTS', value: '28', progress: 58 },
        ],
        notes: 'White Sands is the DoD primary directed energy open-air test range. Fort Bliss evaluating DE-SHORAD for installation force protection.',
      },
      impact: {
        entities: ['US Army', 'MDA', 'Fort Bliss'],
        metrics: [
          { label: 'COST PER SHOT', value: '$1–10', progress: 95 },
          { label: 'C-UAS EFFECTIVENESS', value: '+82%', progress: 82 },
          { label: 'MAGAZINE DEPTH', value: 'UNLIMITED', progress: 90 },
        ],
        notes: 'Directed energy offers near-zero cost per engagement vs. $100K+ missile interceptors, with unlimited magazine depth for sustained operations.',
      },
    },
  },

  // ── Border Tech ─────────────────────────────────────────────────────────────

  {
    id: 'tech-biometrics',
    name: 'Biometric Identity Systems',
    category: 'Border Tech',
    description:
      'Facial recognition, fingerprint, iris, and gait-based identification for border processing, trusted traveler programs, and access control.',
    currentStage: 'adoption',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['NIST', 'DARPA', 'MIT Media Lab', 'FBI CJIS'],
        metrics: [
          { label: 'FOUNDATIONAL PATENTS', value: '720', progress: 88 },
          { label: 'NIST BENCHMARKS', value: '14', progress: 92 },
        ],
        notes: 'Modern biometrics research began with NIST FERET face recognition program (1993) and FBI IAFIS fingerprint system.',
      },
      research: {
        entities: ['NIST', 'Army Research Lab', 'UTEP CS', 'Michigan State University'],
        metrics: [
          { label: 'ACTIVE PROGRAMS', value: '26', progress: 75 },
          { label: 'RESEARCH PAPERS', value: '9,200+', progress: 90 },
          { label: 'GRANT FUNDING', value: '$210M', progress: 68 },
        ],
        notes: 'NIST FRVT benchmark drives industry accuracy standards; UTEP researching bias mitigation in biometric systems.',
      },
      development: {
        entities: ['IDEMIA', 'NEC Corporation', 'Thales Group', 'Clear Secure'],
        metrics: [
          { label: 'PROTOTYPES', value: '18', progress: 72 },
          { label: 'DHS CONTRACTS', value: '$1.1B', progress: 82 },
          { label: 'ENG TEAM SIZE', value: '4,200+', progress: 75 },
        ],
        notes: 'IDEMIA and NEC supply CBP Biometric Entry-Exit matching engines; Thales provides credential systems.',
      },
      productization: {
        entities: ['IDEMIA Augmented Vision', 'NEC NeoFace', 'Clear Secure'],
        metrics: [
          { label: 'PRODUCTS', value: '14', progress: 72 },
          { label: 'VENDORS', value: '28', progress: 68 },
        ],
      },
      adoption: {
        entities: ['CBP El Paso Sector', 'Bridge of the Americas', 'El Paso International Airport', 'Fort Bliss'],
        metrics: [
          { label: 'DEPLOYMENTS', value: '22', progress: 72 },
          { label: 'PROCUREMENT SIGNALS', value: '38', progress: 82 },
        ],
        notes: 'CBP deploying facial comparison at all El Paso ports of entry under Biometric Entry-Exit mandate; BOTA and Paso del Norte bridges fully equipped.',
      },
      impact: {
        entities: ['DHS', 'CBP', 'TSA'],
        metrics: [
          { label: 'PROCESSING SPEED', value: '+68%', progress: 68 },
          { label: 'IDENTITY FRAUD', value: '-94%', progress: 94 },
          { label: 'OVERSTAY DETECTION', value: '+340%', progress: 85 },
        ],
        notes: 'Biometric matching has virtually eliminated fraudulent document use at El Paso ports of entry.',
      },
    },
  },

  {
    id: 'tech-rfid-tracking',
    name: 'RFID / IoT Asset Tracking',
    category: 'Border Tech',
    description:
      'Radio-frequency identification and IoT sensor networks for real-time cargo and vehicle tracking through ports of entry.',
    currentStage: 'impact',
    trend: 'stable',
    stages: {
      discovery: {
        entities: ['MIT Auto-ID Center', 'EPCglobal', 'Sandia National Labs', 'DoD Logistics'],
        metrics: [
          { label: 'FOUNDATIONAL PATENTS', value: '1,400+', progress: 95 },
          { label: 'STANDARDS CREATED', value: 'EPC Gen2', progress: 92 },
        ],
        notes: 'Modern RFID tracking originated from MIT Auto-ID Center (1999) and DoD mandate for RFID on military shipments (2004).',
      },
      research: {
        entities: ['UTEP ECE', 'Texas A&M', 'Auburn University RFID Lab', 'Army Research Lab'],
        metrics: [
          { label: 'ACTIVE STUDIES', value: '18', progress: 62 },
          { label: 'RESEARCH PAPERS', value: '4,600+', progress: 78 },
          { label: 'GRANT FUNDING', value: '$85M', progress: 55 },
        ],
        notes: 'UTEP researching RFID and IoT sensor fusion for cross-border cargo visibility in extreme desert temperatures.',
      },
      development: {
        entities: ['Zebra Technologies', 'Impinj', 'Honeywell', 'SATO'],
        metrics: [
          { label: 'PROTOTYPES', value: '28', progress: 82 },
          { label: 'CONTRACTS', value: '$420M', progress: 72 },
          { label: 'ENG TEAM SIZE', value: '3,800+', progress: 68 },
        ],
        notes: 'Zebra Technologies and Impinj lead RAIN RFID reader/tag development for commercial border applications.',
      },
      productization: {
        entities: ['Zebra FX Series', 'Impinj Octane', 'Honeywell Intermec'],
        metrics: [
          { label: 'PRODUCTS', value: '32', progress: 88 },
          { label: 'VENDORS', value: '35', progress: 82 },
        ],
      },
      adoption: {
        entities: ['CBP El Paso Sector', 'C-TPAT Shippers', 'Fort Bliss DLA', 'Santa Teresa POE'],
        metrics: [
          { label: 'DEPLOYMENTS', value: '42', progress: 85 },
          { label: 'CARGO TRACKED', value: '2.4M TEU/yr', progress: 78 },
        ],
        notes: 'C-TPAT certified shippers at El Paso-Juárez corridor use RFID for seal verification and manifest reconciliation.',
      },
      impact: {
        entities: ['CBP', 'DHS', 'DLA Fort Bliss'],
        metrics: [
          { label: 'CARGO VISIBILITY', value: '+92%', progress: 92 },
          { label: 'DWELL TIME REDUCTION', value: '-38%', progress: 38 },
          { label: 'SHRINKAGE REDUCTION', value: '-54%', progress: 54 },
        ],
        notes: 'RFID tracking has reduced cargo dwell times at El Paso commercial ports and improved DLA inventory accuracy at Fort Bliss.',
      },
    },
  },

  {
    id: 'tech-cargo-scanning',
    name: 'Non-Intrusive Inspection (NII) / Cargo Scanning',
    category: 'Border Tech',
    description:
      'X-ray, gamma-ray, and neutron-based scanning systems for detecting contraband, weapons, and undeclared goods in commercial cargo.',
    currentStage: 'adoption',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['Los Alamos National Lab', 'Sandia National Labs', 'DOE', 'DNDO'],
        metrics: [
          { label: 'FOUNDATIONAL PATENTS', value: '380', progress: 85 },
          { label: 'CONCEPT STUDIES', value: '24', progress: 78 },
        ],
        notes: 'Large-scale cargo scanning concepts evolved from nuclear detection programs at LANL and Sandia in the 1990s.',
      },
      research: {
        entities: ['Sandia National Labs', 'Los Alamos National Lab', 'Pacific Northwest National Lab', 'CWMD'],
        metrics: [
          { label: 'ACTIVE PROGRAMS', value: '16', progress: 68 },
          { label: 'RESEARCH PAPERS', value: '2,100+', progress: 72 },
          { label: 'GRANT FUNDING', value: '$340M', progress: 75 },
        ],
        notes: 'PNNL and Sandia developing next-gen dual-energy CT and spectroscopic imaging for automated threat detection.',
      },
      development: {
        entities: ['Leidos', 'Rapiscan Systems', 'Smiths Detection', 'Nuctech'],
        metrics: [
          { label: 'PROTOTYPES', value: '12', progress: 62 },
          { label: 'DHS CONTRACTS', value: '$1.8B', progress: 85 },
          { label: 'ENG TEAM SIZE', value: '3,400+', progress: 70 },
        ],
        notes: 'Leidos and Rapiscan supply majority of CBP large-scale NII systems deployed at El Paso commercial ports.',
      },
      productization: {
        entities: ['Leidos VACIS', 'Rapiscan Eagle', 'Smiths Detection HCVM'],
        metrics: [
          { label: 'PRODUCTS', value: '18', progress: 75 },
          { label: 'VENDORS', value: '14', progress: 65 },
        ],
      },
      adoption: {
        entities: ['CBP El Paso Sector', 'Bridge of the Americas Commercial', 'Ysleta-Zaragoza POE', 'Santa Teresa POE'],
        metrics: [
          { label: 'DEPLOYMENTS', value: '34', progress: 78 },
          { label: 'SCANS PER DAY', value: '8,400+', progress: 82 },
        ],
        notes: 'CBP operates large-scale NII at all El Paso commercial ports handling $100B+ in annual USMCA trade. VACIS and Eagle systems scan every suspect container.',
      },
      impact: {
        entities: ['CBP', 'DHS', 'DEA'],
        metrics: [
          { label: 'CONTRABAND DETECTION', value: '+186%', progress: 82 },
          { label: 'PROCESSING THROUGHPUT', value: '+45%', progress: 45 },
          { label: 'FALSE POSITIVE RATE', value: '-62%', progress: 62 },
        ],
        notes: 'NII systems have dramatically increased contraband seizure rates while maintaining commercial throughput at El Paso ports.',
      },
    },
  },

  {
    id: 'tech-surveillance-systems',
    name: 'Border Surveillance Systems',
    category: 'Border Tech',
    description:
      'Integrated fixed tower, mobile surveillance, and persistent ground sensor systems for border situational awareness.',
    currentStage: 'adoption',
    trend: 'stable',
    stages: {
      discovery: {
        entities: ['DARPA', 'Army Night Vision Lab', 'Sandia National Labs', 'DHS S&T'],
        metrics: [
          { label: 'FOUNDATIONAL PATENTS', value: '540', progress: 82 },
          { label: 'CONCEPT STUDIES', value: '32', progress: 88 },
        ],
        notes: 'Modern border surveillance concepts evolved from military ground sensor systems and DARPA persistent surveillance programs.',
      },
      research: {
        entities: ['DHS Science & Technology', 'Sandia National Labs', 'UTEP', 'Army Research Lab'],
        metrics: [
          { label: 'ACTIVE PROGRAMS', value: '20', progress: 72 },
          { label: 'RESEARCH PAPERS', value: '1,800+', progress: 65 },
          { label: 'GRANT FUNDING', value: '$240M', progress: 70 },
        ],
        notes: 'DHS S&T evaluating AI-enhanced surveillance for reduced false alarm rates in desert and urban border environments.',
      },
      development: {
        entities: ['Elbit Systems of America', 'General Dynamics', 'FLIR Systems (Teledyne)', 'Anduril Industries'],
        metrics: [
          { label: 'PROTOTYPES', value: '14', progress: 68 },
          { label: 'DHS CONTRACTS', value: '$2.2B', progress: 88 },
          { label: 'ENG TEAM SIZE', value: '2,800+', progress: 65 },
        ],
        notes: 'Elbit Systems IFT program and Anduril Lattice/Sentry Towers competing for next-gen border surveillance contracts.',
      },
      productization: {
        entities: ['Elbit Systems IFT', 'Anduril Sentry Tower', 'Teledyne FLIR Ranger'],
        metrics: [
          { label: 'PRODUCTS', value: '10', progress: 65 },
          { label: 'VENDORS', value: '18', progress: 58 },
        ],
      },
      adoption: {
        entities: ['CBP El Paso Sector', 'US Border Patrol', 'Fort Bliss Perimeter', 'DHS'],
        metrics: [
          { label: 'TOWER DEPLOYMENTS', value: '52', progress: 75 },
          { label: 'SENSOR COVERAGE', value: '340 mi', progress: 68 },
        ],
        notes: 'Elbit Systems IFT program covers the El Paso Sector with integrated radar, EO/IR cameras, and ground sensors. Anduril autonomous towers piloting.',
      },
      impact: {
        entities: ['CBP', 'DHS', 'Border Patrol El Paso'],
        metrics: [
          { label: 'DETECTION RATE', value: '+156%', progress: 78 },
          { label: 'AGENT RESPONSE TIME', value: '-52%', progress: 52 },
          { label: 'FALSE ALARM RATE', value: '-44%', progress: 44 },
        ],
        notes: 'IFT coverage has significantly increased detection and apprehension rates while reducing agent response times in El Paso Sector.',
      },
    },
  },

  {
    id: 'tech-trade-compliance-software',
    name: 'Trade Compliance & Customs Software',
    category: 'Border Tech',
    description:
      'ACE, AES, and USMCA compliance platforms for customs brokerage, certificate-of-origin management, and cross-border trade documentation.',
    currentStage: 'impact',
    trend: 'stable',
    stages: {
      discovery: {
        entities: ['US Customs Service', 'WCO', 'UNCTAD ASYCUDA', 'CBP Modernization'],
        metrics: [
          { label: 'STANDARDS DEVELOPED', value: 'WCO SAFE', progress: 90 },
          { label: 'CONCEPT PAPERS', value: '18', progress: 72 },
        ],
        notes: 'Customs automation concepts trace to WCO Revised Kyoto Convention (1999) and US ACE Single Window initiative.',
      },
      research: {
        entities: ['CBP Labs & Scientific Services', 'UTEP Business School', 'US International Trade Commission'],
        metrics: [
          { label: 'ACTIVE STUDIES', value: '8', progress: 48 },
          { label: 'POLICY PAPERS', value: '120+', progress: 62 },
          { label: 'GRANT FUNDING', value: '$32M', progress: 42 },
        ],
        notes: 'UTEP Center for Inter-American and Border Studies researching digital trade facilitation for US-Mexico corridor.',
      },
      development: {
        entities: ['Descartes Systems', 'Integration Point (Thomson Reuters)', 'Amber Road (E2open)', 'QAD'],
        metrics: [
          { label: 'PLATFORMS', value: '14', progress: 78 },
          { label: 'CONTRACTS', value: '$280M', progress: 65 },
          { label: 'ENG TEAM SIZE', value: '2,200+', progress: 62 },
        ],
        notes: 'Descartes and E2open lead ACE-certified trade compliance platform development for US-Mexico trade.',
      },
      productization: {
        entities: ['Descartes CustomsInfo', 'E2open Global Trade', 'QAD Trade Management'],
        metrics: [
          { label: 'PRODUCTS', value: '22', progress: 82 },
          { label: 'VENDORS', value: '22', progress: 75 },
        ],
      },
      adoption: {
        entities: ['El Paso Customs Brokers Assn', 'Maquiladora Operators', 'CBP ACE', 'C-TPAT Members'],
        metrics: [
          { label: 'IMPLEMENTATIONS', value: '520+', progress: 88 },
          { label: 'BROKERS USING ACE', value: '500+', progress: 92 },
        ],
        notes: 'Over 500 El Paso customs brokers and maquiladora operators use ACE-certified software for daily US-Mexico cross-border operations.',
      },
      impact: {
        entities: ['CBP', 'El Paso Chamber of Commerce', 'USMCA Trade Corridor'],
        metrics: [
          { label: 'CLEARANCE TIME', value: '-72%', progress: 72 },
          { label: 'COMPLIANCE RATE', value: '98.4%', progress: 98 },
          { label: 'TRADE FACILITATION', value: '+$4.2B/yr', progress: 85 },
        ],
        notes: 'Digital trade compliance has reduced border clearance times from days to hours for compliant shippers in El Paso corridor.',
      },
    },
  },
];
