// Global technology hub definitions for NXT//LINK platform
// Used for macro-level geopolitical technology intelligence overlays

export type TechHub = {
  id: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  topSectors: string[];
  vendorCount: number;
  description: string;
  gdpTechBillions: number;       // Approximate tech sector GDP contribution (USD billions)
  activeContracts: number;       // Approximate active government/defense contract count
  threatLevel: 'low' | 'moderate' | 'elevated' | 'high';
  relevanceToElPaso: string;     // How this hub connects to El Paso/border economy
};

export const GLOBAL_TECH_HUBS: TechHub[] = [

  {
    id: 'hub-silicon-valley',
    name: 'Silicon Valley',
    region: 'California, USA',
    country: 'USA',
    lat: 37.3861,
    lon: -122.0839,
    topSectors: ['AI/ML', 'Semiconductors', 'Cloud Computing', 'Cybersecurity', 'Defense Tech', 'Biotech'],
    vendorCount: 8500,
    description: 'The world\'s dominant technology cluster, anchored by Apple, Google, Meta, NVIDIA, and Intel. Produces the majority of global AI foundation models and semiconductor design IP. Strong DoD commercial technology pipeline via DARPA and In-Q-Tel.',
    gdpTechBillions: 850,
    activeContracts: 3200,
    threatLevel: 'low',
    relevanceToElPaso: 'Primary source of AI/ML platforms (Palantir, Anduril) deployed at Fort Bliss. NVIDIA GPU supply chain runs through El Paso-Juárez corridor maquiladoras.',
  },

  {
    id: 'hub-austin',
    name: 'Austin Tech Corridor',
    region: 'Texas, USA',
    country: 'USA',
    lat: 30.2672,
    lon: -97.7431,
    topSectors: ['Defense Tech', 'Semiconductors', 'AI/ML', 'Cybersecurity', 'Space', 'Fintech'],
    vendorCount: 3200,
    description: 'Fastest-growing major US technology hub, anchored by Tesla, Samsung Semiconductor, Dell, Apple, and a dense defense tech cluster including L3Harris HQ and SpaceX Starbase proximity. Key SBIR and DoD contract pipeline second only to Silicon Valley.',
    gdpTechBillions: 220,
    activeContracts: 1850,
    threatLevel: 'low',
    relevanceToElPaso: 'Shares Texas defense procurement ecosystem. Austin-based defense primes regularly subcontract El Paso corridor vendors. Samsung Austin fab relies on Trans-Pecos energy infrastructure.',
  },

  {
    id: 'hub-boston',
    name: 'Boston / Cambridge',
    region: 'Massachusetts, USA',
    country: 'USA',
    lat: 42.3601,
    lon: -71.0589,
    topSectors: ['Biotech', 'AI/ML', 'Robotics', 'Defense', 'Quantum Computing', 'Health IT'],
    vendorCount: 4100,
    description: 'World\'s leading biotech and life sciences hub, anchored by MIT, Harvard, and an extraordinary density of Kendall Square research institutions. Home to Boston Dynamics, iRobot, and major DoD research programs. Raytheon and General Dynamics maintain R&D centers.',
    gdpTechBillions: 310,
    activeContracts: 2400,
    threatLevel: 'low',
    relevanceToElPaso: 'Boston robotics companies (Boston Dynamics, iRobot) supply Fort Bliss autonomous systems testing programs. Harvard/MIT research partnerships with UTEP active in health informatics.',
  },

  {
    id: 'hub-seattle',
    name: 'Seattle / Puget Sound',
    region: 'Washington, USA',
    country: 'USA',
    lat: 47.6062,
    lon: -122.3321,
    topSectors: ['Cloud Computing', 'Defense', 'Aerospace', 'AI/ML', 'Logistics Tech', 'Cybersecurity'],
    vendorCount: 2800,
    description: 'Home to Amazon AWS, Microsoft Azure, Boeing Commercial, and Palantir\'s second major campus. Dominant cloud government platform providers (AWS GovCloud, Azure Government) serving DoD workloads including Fort Bliss infrastructure modernization programs.',
    gdpTechBillions: 380,
    activeContracts: 2100,
    threatLevel: 'low',
    relevanceToElPaso: 'AWS GovCloud and Azure Government host Fort Bliss IT modernization programs. Amazon ELP1 fulfillment center (Horizon City) is a Seattle-directed logistics node.',
  },

  {
    id: 'hub-shenzhen',
    name: 'Shenzhen / Pearl River Delta',
    region: 'Guangdong, China',
    country: 'China',
    lat: 22.5431,
    lon: 114.0579,
    topSectors: ['Electronics Manufacturing', 'Semiconductors', 'Drones', 'AI Hardware', 'Telecom', '5G'],
    vendorCount: 12000,
    description: 'World\'s largest electronics manufacturing cluster, home to Foxconn, Huawei, DJI, BYD, and CCTV manufacturer Hikvision. Produces 80%+ of global consumer electronics. Significant dual-use technology development and PLA supply chain overlap creates CFIUS review triggers.',
    gdpTechBillions: 580,
    activeContracts: 0,
    threatLevel: 'high',
    relevanceToElPaso: 'Foxconn\'s Juárez campus is a direct extension of the Shenzhen manufacturing model. CBP screens Shenzhen-origin electronics at El Paso POEs for UFLPA forced labor compliance. DJI drone restrictions affect Fort Bliss UAS procurement.',
  },

  {
    id: 'hub-munich',
    name: 'Munich / Bavaria',
    region: 'Bavaria, Germany',
    country: 'Germany',
    lat: 48.1351,
    lon: 11.5820,
    topSectors: ['Automotive Tech', 'Industrial AI', 'Defense', 'Aerospace', 'Advanced Manufacturing', 'Robotics'],
    vendorCount: 3800,
    description: 'Europe\'s largest industrial technology cluster, anchored by BMW, Siemens, MTU Aero Engines, and Airbus Defense. World-leading expertise in Industry 4.0, KUKA robotics (Chinese-owned), and defense electronics. NATO technology interoperability programs hub.',
    gdpTechBillions: 290,
    activeContracts: 1200,
    threatLevel: 'low',
    relevanceToElPaso: 'Siemens and Rockwell Automation industrial control systems dominate El Paso-Juárez maquiladora factory floors. BMW supply chain runs through El Paso trans-border automotive corridor.',
  },

  {
    id: 'hub-tel-aviv',
    name: 'Tel Aviv / Silicon Wadi',
    region: 'Central District, Israel',
    country: 'Israel',
    lat: 32.0853,
    lon: 34.7818,
    topSectors: ['Cybersecurity', 'Defense Tech', 'AI/ML', 'UAV Systems', 'Intelligence Systems', 'Border Tech'],
    vendorCount: 1800,
    description: 'World\'s highest density of cybersecurity startups per capita. Homeland security technology exports — including border surveillance, biometrics, and cyber intelligence — are mission-critical exports. Elbit Systems, Rafael, and IAI have significant US market presence supporting CBP and DoD programs.',
    gdpTechBillions: 85,
    activeContracts: 640,
    threatLevel: 'moderate',
    relevanceToElPaso: 'Elbit Systems of America operates near Fort Bliss, supplying ENVG-B night vision and IDF-proven surveillance tech for border. Rafael Trophy APS deployed on M1 Abrams tanks at Fort Bliss.',
  },

  {
    id: 'hub-bangalore',
    name: 'Bangalore / Karnataka',
    region: 'Karnataka, India',
    country: 'India',
    lat: 12.9716,
    lon: 77.5946,
    topSectors: ['Enterprise IT', 'AI/ML', 'Cloud Services', 'Defense Software', 'BPO/KPO', 'Space Tech'],
    vendorCount: 5500,
    description: 'South Asia\'s dominant technology hub and the world\'s largest software services export cluster, anchored by Infosys, Wipro, and TCS. Growing AI and defense software capability driven by India\'s Make in India initiative. ISRO aerospace and HAL defense ties create dual-use technology pathways.',
    gdpTechBillions: 170,
    activeContracts: 420,
    threatLevel: 'low',
    relevanceToElPaso: 'India-based IT services firms (Infosys, Wipro) support Army ERP programs at Fort Bliss through prime contractor subcontracts. Alorica El Paso competes with and partners with Bangalore-based BPO centers.',
  },

  {
    id: 'hub-tokyo',
    name: 'Tokyo / Kanto',
    region: 'Kanto, Japan',
    country: 'Japan',
    lat: 35.6762,
    lon: 139.6503,
    topSectors: ['Robotics', 'Semiconductors', 'Automotive Tech', 'Advanced Manufacturing', 'Electronics', 'AI Hardware'],
    vendorCount: 6200,
    description: 'World\'s leading industrial robotics and precision manufacturing hub, home to FANUC, Yaskawa, Denso, and Sony Semiconductor. Japanese OEM supply chains are deeply embedded in the El Paso-Juárez maquiladora corridor through Tier 1 automotive suppliers. TSMC Japan fab expansion broadens semiconductor independence.',
    gdpTechBillions: 420,
    activeContracts: 980,
    threatLevel: 'low',
    relevanceToElPaso: 'FANUC, Yaskawa, and Mitsubishi robot arms are the dominant automation technology inside Juárez maquiladora plants. Japanese automotive OEMs (Toyota, Honda) drive El Paso cross-border wiring harness supply chains.',
  },

  {
    id: 'hub-el-paso',
    name: 'El Paso / Juárez Bi-National Metro',
    region: 'Texas-Chihuahua Border',
    country: 'USA/Mexico',
    lat: 31.7619,
    lon: -106.4850,
    topSectors: ['Defense Tech', 'Border Technology', 'Advanced Manufacturing', 'Logistics', 'Energy', 'Health Tech'],
    vendorCount: 420,
    description: 'The largest bi-national metropolitan technology cluster on the US-Mexico border, anchored by Fort Bliss ($600M+ annual procurement), 330+ active maquiladora plants, and the Paso del Norte Port of Entry — the busiest US land border crossing. El Paso\'s unique position at the nexus of defense, trade, and energy infrastructure makes it a strategic technology acquisition corridor.',
    gdpTechBillions: 28,
    activeContracts: 380,
    threatLevel: 'moderate',
    relevanceToElPaso: 'This IS the El Paso hub — ground zero for NXT//LINK intelligence operations. Fort Bliss technology procurement, CBP border tech, USMCA-driven nearshoring, and El Paso Water\'s global water tech leadership are the primary acquisition signals.',
  },

];

// Returns hubs sorted by relevance tier: El Paso first, then US hubs, then international
export function getHubsByPriority(): TechHub[] {
  const order = ['hub-el-paso', 'hub-austin', 'hub-silicon-valley', 'hub-seattle', 'hub-boston', 'hub-tel-aviv', 'hub-munich', 'hub-tokyo', 'hub-bangalore', 'hub-shenzhen'];
  return order.map((id) => GLOBAL_TECH_HUBS.find((h) => h.id === id)).filter((h): h is TechHub => h !== undefined);
}

// Returns hubs that have direct supply chain or contract links to El Paso
export function getElPasoLinkedHubs(): TechHub[] {
  return GLOBAL_TECH_HUBS.filter((h) => h.id !== 'hub-el-paso');
}
