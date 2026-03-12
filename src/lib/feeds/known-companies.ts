// src/lib/feeds/known-companies.ts
// NXT//LINK Known Companies Dictionary — 200+ company names mapped to category and sector.
// Used by the Vendor Discovery Agent for keyword-first entity recognition.
// When a company name appears in article title/description, we skip LLM extraction.

export type CompanyEntry = {
  category: string;
  sector: string;
};

// ─── Known companies map ────────────────────────────────────────────────────────

export const KNOWN_COMPANIES = new Map<string, CompanyEntry>([
  // ═══════════════════════════════════════════════════════════════════════════════
  // DEFENSE CONTRACTORS
  // ═══════════════════════════════════════════════════════════════════════════════
  ['Lockheed Martin', { category: 'defense', sector: 'Defense Tech' }],
  ['Raytheon', { category: 'defense', sector: 'Defense Tech' }],
  ['RTX', { category: 'defense', sector: 'Defense Tech' }],
  ['Northrop Grumman', { category: 'defense', sector: 'Defense Tech' }],
  ['Boeing', { category: 'defense', sector: 'Defense Tech' }],
  ['L3Harris', { category: 'defense', sector: 'Defense Tech' }],
  ['General Dynamics', { category: 'defense', sector: 'Defense Tech' }],
  ['BAE Systems', { category: 'defense', sector: 'Defense Tech' }],
  ['SAIC', { category: 'defense', sector: 'Defense Tech' }],
  ['Leidos', { category: 'defense', sector: 'Defense Tech' }],
  ['Booz Allen Hamilton', { category: 'defense', sector: 'Defense Tech' }],
  ['CACI International', { category: 'defense', sector: 'Defense Tech' }],
  ['ManTech', { category: 'defense', sector: 'Defense Tech' }],
  ['Peraton', { category: 'defense', sector: 'Defense Tech' }],
  ['Anduril', { category: 'defense', sector: 'Defense Tech' }],
  ['Palantir', { category: 'defense', sector: 'Defense Tech' }],
  ['Shield AI', { category: 'defense', sector: 'Defense Tech' }],
  ['Kratos Defense', { category: 'defense', sector: 'Defense Tech' }],
  ['Textron', { category: 'defense', sector: 'Defense Tech' }],
  ['Sierra Nevada Corp', { category: 'defense', sector: 'Defense Tech' }],
  ['Parsons', { category: 'defense', sector: 'Defense Tech' }],
  ['Huntington Ingalls', { category: 'defense', sector: 'Defense Tech' }],
  ['Elbit Systems', { category: 'defense', sector: 'Defense Tech' }],
  ['Thales', { category: 'defense', sector: 'Defense Tech' }],
  ['Rheinmetall', { category: 'defense', sector: 'Defense Tech' }],
  ['Leonardo DRS', { category: 'defense', sector: 'Defense Tech' }],
  ['General Atomics', { category: 'defense', sector: 'Defense Tech' }],
  ['AeroVironment', { category: 'defense', sector: 'Defense Tech' }],
  ['Raytheon Missiles', { category: 'defense', sector: 'Defense Tech' }],
  ['Collins Aerospace', { category: 'defense', sector: 'Defense Tech' }],
  ['Pratt & Whitney', { category: 'defense', sector: 'Defense Tech' }],
  ['GDIT', { category: 'defense', sector: 'Defense Tech' }],
  ['AECOM', { category: 'defense', sector: 'Defense Tech' }],
  ['KBR', { category: 'defense', sector: 'Defense Tech' }],
  ['Jacobs', { category: 'defense', sector: 'Defense Tech' }],
  ['Curtiss-Wright', { category: 'defense', sector: 'Defense Tech' }],
  ['Mercury Systems', { category: 'defense', sector: 'Defense Tech' }],
  ['HEICO', { category: 'defense', sector: 'Defense Tech' }],
  ['TransDigm', { category: 'defense', sector: 'Defense Tech' }],
  ['Hensoldt', { category: 'defense', sector: 'Defense Tech' }],
  ['Saab', { category: 'defense', sector: 'Defense Tech' }],
  ['Rafael Advanced Defense', { category: 'defense', sector: 'Defense Tech' }],
  ['Israel Aerospace Industries', { category: 'defense', sector: 'Defense Tech' }],

  // ═══════════════════════════════════════════════════════════════════════════════
  // ROBOTICS
  // ═══════════════════════════════════════════════════════════════════════════════
  ['Boston Dynamics', { category: 'robotics', sector: 'Robotics & Automation' }],
  ['KUKA', { category: 'robotics', sector: 'Manufacturing' }],
  ['ABB Robotics', { category: 'robotics', sector: 'Manufacturing' }],
  ['FANUC', { category: 'robotics', sector: 'Manufacturing' }],
  ['Yaskawa', { category: 'robotics', sector: 'Manufacturing' }],
  ['Universal Robots', { category: 'robotics', sector: 'Manufacturing' }],
  ['Fetch Robotics', { category: 'robotics', sector: 'Warehouse Automation' }],
  ['Agility Robotics', { category: 'robotics', sector: 'Robotics & Automation' }],
  ['Figure AI', { category: 'robotics', sector: 'Robotics & Automation' }],
  ['Sarcos Robotics', { category: 'robotics', sector: 'Robotics & Automation' }],
  ['Nuro', { category: 'robotics', sector: 'Robotics & Automation' }],
  ['Apptronik', { category: 'robotics', sector: 'Robotics & Automation' }],
  ['1X Technologies', { category: 'robotics', sector: 'Robotics & Automation' }],
  ['Covariant', { category: 'robotics', sector: 'Warehouse Automation' }],
  ['Realtime Robotics', { category: 'robotics', sector: 'Manufacturing' }],
  ['Berkshire Grey', { category: 'robotics', sector: 'Warehouse Automation' }],
  ['Symbotic', { category: 'robotics', sector: 'Warehouse Automation' }],
  ['Vecna Robotics', { category: 'robotics', sector: 'Warehouse Automation' }],
  ['Rapid Robotics', { category: 'robotics', sector: 'Manufacturing' }],
  ['Locus Robotics', { category: 'robotics', sector: 'Warehouse Automation' }],
  ['GreyOrange', { category: 'robotics', sector: 'Warehouse Automation' }],

  // ═══════════════════════════════════════════════════════════════════════════════
  // WAREHOUSE AUTOMATION
  // ═══════════════════════════════════════════════════════════════════════════════
  ['Dematic', { category: 'warehouse_automation', sector: 'Warehouse Automation' }],
  ['Honeywell Intelligrated', { category: 'warehouse_automation', sector: 'Warehouse Automation' }],
  ['Swisslog', { category: 'warehouse_automation', sector: 'Warehouse Automation' }],
  ['Knapp', { category: 'warehouse_automation', sector: 'Warehouse Automation' }],
  ['AutoStore', { category: 'warehouse_automation', sector: 'Warehouse Automation' }],
  ['Geek+', { category: 'warehouse_automation', sector: 'Warehouse Automation' }],
  ['Hai Robotics', { category: 'warehouse_automation', sector: 'Warehouse Automation' }],
  ['6 River Systems', { category: 'warehouse_automation', sector: 'Warehouse Automation' }],
  ['inVia Robotics', { category: 'warehouse_automation', sector: 'Warehouse Automation' }],
  ['Exotec', { category: 'warehouse_automation', sector: 'Warehouse Automation' }],
  ['Ocado Technology', { category: 'warehouse_automation', sector: 'Warehouse Automation' }],
  ['Plus One Robotics', { category: 'warehouse_automation', sector: 'Warehouse Automation' }],
  ['RightHand Robotics', { category: 'warehouse_automation', sector: 'Warehouse Automation' }],
  ['Addverb Technologies', { category: 'warehouse_automation', sector: 'Warehouse Automation' }],

  // ═══════════════════════════════════════════════════════════════════════════════
  // MANUFACTURING TECH
  // ═══════════════════════════════════════════════════════════════════════════════
  ['Siemens', { category: 'manufacturing', sector: 'Manufacturing Tech' }],
  ['Rockwell Automation', { category: 'manufacturing', sector: 'Manufacturing Tech' }],
  ['Emerson Electric', { category: 'manufacturing', sector: 'Manufacturing Tech' }],
  ['Schneider Electric', { category: 'manufacturing', sector: 'Manufacturing Tech' }],
  ['Honeywell', { category: 'manufacturing', sector: 'Manufacturing Tech' }],
  ['Dassault Systemes', { category: 'manufacturing', sector: 'Manufacturing Tech' }],
  ['PTC', { category: 'manufacturing', sector: 'Manufacturing Tech' }],
  ['Hexagon', { category: 'manufacturing', sector: 'Manufacturing Tech' }],
  ['Zeiss', { category: 'manufacturing', sector: 'Manufacturing Tech' }],
  ['Keyence', { category: 'manufacturing', sector: 'Manufacturing Tech' }],
  ['Stratasys', { category: 'manufacturing', sector: 'Manufacturing Tech' }],
  ['3D Systems', { category: 'manufacturing', sector: 'Manufacturing Tech' }],
  ['Desktop Metal', { category: 'manufacturing', sector: 'Manufacturing Tech' }],
  ['Markforged', { category: 'manufacturing', sector: 'Manufacturing Tech' }],
  ['Velo3D', { category: 'manufacturing', sector: 'Manufacturing Tech' }],
  ['Xometry', { category: 'manufacturing', sector: 'Manufacturing Tech' }],
  ['Tulip Interfaces', { category: 'manufacturing', sector: 'Manufacturing Tech' }],
  ['Augury', { category: 'manufacturing', sector: 'Manufacturing Tech' }],
  ['MachineMetrics', { category: 'manufacturing', sector: 'Manufacturing Tech' }],
  ['Sight Machine', { category: 'manufacturing', sector: 'Manufacturing Tech' }],

  // ═══════════════════════════════════════════════════════════════════════════════
  // INDUSTRIAL AI
  // ═══════════════════════════════════════════════════════════════════════════════
  ['C3.ai', { category: 'industrial_ai', sector: 'Industrial AI' }],
  ['Uptake Technologies', { category: 'industrial_ai', sector: 'Industrial AI' }],
  ['SparkCognition', { category: 'industrial_ai', sector: 'Industrial AI' }],
  ['Falkonry', { category: 'industrial_ai', sector: 'Industrial AI' }],
  ['Aspen Technology', { category: 'industrial_ai', sector: 'Industrial AI' }],
  ['Cognite', { category: 'industrial_ai', sector: 'Industrial AI' }],
  ['OSIsoft', { category: 'industrial_ai', sector: 'Industrial AI' }],
  ['Seeq', { category: 'industrial_ai', sector: 'Industrial AI' }],
  ['TwinThread', { category: 'industrial_ai', sector: 'Industrial AI' }],
  ['Noodle.ai', { category: 'industrial_ai', sector: 'Industrial AI' }],

  // ═══════════════════════════════════════════════════════════════════════════════
  // LOGISTICS PLATFORMS
  // ═══════════════════════════════════════════════════════════════════════════════
  ['FedEx', { category: 'logistics', sector: 'Logistics' }],
  ['UPS', { category: 'logistics', sector: 'Logistics' }],
  ['DHL', { category: 'logistics', sector: 'Logistics' }],
  ['XPO Logistics', { category: 'logistics', sector: 'Logistics' }],
  ['C.H. Robinson', { category: 'logistics', sector: 'Logistics' }],
  ['J.B. Hunt', { category: 'logistics', sector: 'Logistics' }],
  ['Kuehne+Nagel', { category: 'logistics', sector: 'Logistics' }],
  ['Maersk', { category: 'logistics', sector: 'Logistics' }],
  ['Flexport', { category: 'logistics', sector: 'Logistics' }],
  ['project44', { category: 'logistics', sector: 'Logistics' }],
  ['FourKites', { category: 'logistics', sector: 'Logistics' }],
  ['Samsara', { category: 'logistics', sector: 'Logistics' }],
  ['Convoy', { category: 'logistics', sector: 'Logistics' }],
  ['Uber Freight', { category: 'logistics', sector: 'Logistics' }],
  ['Transfix', { category: 'logistics', sector: 'Logistics' }],
  ['Loadsmart', { category: 'logistics', sector: 'Logistics' }],
  ['Descartes Systems', { category: 'logistics', sector: 'Logistics' }],
  ['Blue Yonder', { category: 'logistics', sector: 'Supply Chain Software' }],
  ['Manhattan Associates', { category: 'logistics', sector: 'Supply Chain Software' }],
  ['Kinaxis', { category: 'logistics', sector: 'Supply Chain Software' }],
  ['E2open', { category: 'logistics', sector: 'Supply Chain Software' }],
  ['o9 Solutions', { category: 'logistics', sector: 'Supply Chain Software' }],
  ['BNSF Railway', { category: 'logistics', sector: 'Logistics' }],
  ['Union Pacific', { category: 'logistics', sector: 'Logistics' }],
  ['Werner Enterprises', { category: 'logistics', sector: 'Logistics' }],
  ['Old Dominion', { category: 'logistics', sector: 'Logistics' }],
  ['Ryder', { category: 'logistics', sector: 'Logistics' }],

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUPPLY CHAIN SOFTWARE
  // ═══════════════════════════════════════════════════════════════════════════════
  ['SAP', { category: 'supply_chain', sector: 'Supply Chain Software' }],
  ['Oracle', { category: 'supply_chain', sector: 'Supply Chain Software' }],
  ['Coupa', { category: 'supply_chain', sector: 'Supply Chain Software' }],
  ['Jaggaer', { category: 'supply_chain', sector: 'Supply Chain Software' }],
  ['Ivalua', { category: 'supply_chain', sector: 'Supply Chain Software' }],
  ['GEP', { category: 'supply_chain', sector: 'Supply Chain Software' }],
  ['Resilinc', { category: 'supply_chain', sector: 'Supply Chain Software' }],
  ['Elementum', { category: 'supply_chain', sector: 'Supply Chain Software' }],
  ['Infor', { category: 'supply_chain', sector: 'Supply Chain Software' }],
  ['TradeGlobal', { category: 'supply_chain', sector: 'Supply Chain Software' }],

  // ═══════════════════════════════════════════════════════════════════════════════
  // CYBERSECURITY
  // ═══════════════════════════════════════════════════════════════════════════════
  ['CrowdStrike', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Palo Alto Networks', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Fortinet', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['SentinelOne', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Zscaler', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Cloudflare', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Okta', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['CyberArk', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Wiz', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Snyk', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Rapid7', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Qualys', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Tenable', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Mandiant', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Recorded Future', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Proofpoint', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['KnowBe4', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Sophos', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Trend Micro', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Check Point', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Trellix', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Dragos', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Claroty', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Nozomi Networks', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Armis', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Arctic Wolf', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Tanium', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Secureworks', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Mimecast', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Carbon Black', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Darktrace', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Abnormal Security', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Lacework', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Orca Security', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Cybereason', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['Varonis', { category: 'cybersecurity', sector: 'Cybersecurity' }],
  ['ExtraHop', { category: 'cybersecurity', sector: 'Cybersecurity' }],

  // ═══════════════════════════════════════════════════════════════════════════════
  // CLOUD & ENTERPRISE TECH
  // ═══════════════════════════════════════════════════════════════════════════════
  ['Amazon Web Services', { category: 'cloud', sector: 'Enterprise' }],
  ['AWS', { category: 'cloud', sector: 'Enterprise' }],
  ['Microsoft Azure', { category: 'cloud', sector: 'Enterprise' }],
  ['Google Cloud', { category: 'cloud', sector: 'Enterprise' }],
  ['Salesforce', { category: 'cloud', sector: 'Enterprise' }],
  ['ServiceNow', { category: 'cloud', sector: 'Enterprise' }],
  ['Snowflake', { category: 'cloud', sector: 'Enterprise' }],
  ['Databricks', { category: 'cloud', sector: 'Enterprise' }],
  ['Datadog', { category: 'cloud', sector: 'Enterprise' }],
  ['Splunk', { category: 'cloud', sector: 'Enterprise' }],
  ['HashiCorp', { category: 'cloud', sector: 'Enterprise' }],
  ['Confluent', { category: 'cloud', sector: 'Enterprise' }],
  ['MongoDB', { category: 'cloud', sector: 'Enterprise' }],
  ['Elastic', { category: 'cloud', sector: 'Enterprise' }],
  ['Twilio', { category: 'cloud', sector: 'Enterprise' }],
  ['Atlassian', { category: 'cloud', sector: 'Enterprise' }],
  ['Workday', { category: 'cloud', sector: 'Enterprise' }],
  ['VMware', { category: 'cloud', sector: 'Enterprise' }],
  ['Nutanix', { category: 'cloud', sector: 'Enterprise' }],
  ['Dell Technologies', { category: 'cloud', sector: 'Enterprise' }],
  ['HPE', { category: 'cloud', sector: 'Enterprise' }],
  ['IBM', { category: 'cloud', sector: 'Enterprise' }],
  ['Cisco', { category: 'cloud', sector: 'Enterprise' }],

  // ═══════════════════════════════════════════════════════════════════════════════
  // AI / ML COMPANIES
  // ═══════════════════════════════════════════════════════════════════════════════
  ['OpenAI', { category: 'ai_ml', sector: 'AI/ML' }],
  ['Anthropic', { category: 'ai_ml', sector: 'AI/ML' }],
  ['Google DeepMind', { category: 'ai_ml', sector: 'AI/ML' }],
  ['Meta AI', { category: 'ai_ml', sector: 'AI/ML' }],
  ['NVIDIA', { category: 'ai_ml', sector: 'AI/ML' }],
  ['AMD', { category: 'ai_ml', sector: 'AI/ML' }],
  ['Intel', { category: 'ai_ml', sector: 'AI/ML' }],
  ['Hugging Face', { category: 'ai_ml', sector: 'AI/ML' }],
  ['Stability AI', { category: 'ai_ml', sector: 'AI/ML' }],
  ['Cohere', { category: 'ai_ml', sector: 'AI/ML' }],
  ['Mistral AI', { category: 'ai_ml', sector: 'AI/ML' }],
  ['Scale AI', { category: 'ai_ml', sector: 'AI/ML' }],
  ['Cerebras', { category: 'ai_ml', sector: 'AI/ML' }],
  ['SambaNova', { category: 'ai_ml', sector: 'AI/ML' }],
  ['Groq', { category: 'ai_ml', sector: 'AI/ML' }],
  ['Together AI', { category: 'ai_ml', sector: 'AI/ML' }],
  ['Perplexity', { category: 'ai_ml', sector: 'AI/ML' }],
  ['xAI', { category: 'ai_ml', sector: 'AI/ML' }],
  ['Runway ML', { category: 'ai_ml', sector: 'AI/ML' }],
  ['Midjourney', { category: 'ai_ml', sector: 'AI/ML' }],

  // ═══════════════════════════════════════════════════════════════════════════════
  // ENERGY TECH
  // ═══════════════════════════════════════════════════════════════════════════════
  ['NextEra Energy', { category: 'energy', sector: 'Energy Tech' }],
  ['El Paso Electric', { category: 'energy', sector: 'Energy Tech' }],
  ['SunPower', { category: 'energy', sector: 'Energy Tech' }],
  ['Enphase Energy', { category: 'energy', sector: 'Energy Tech' }],
  ['SolarEdge', { category: 'energy', sector: 'Energy Tech' }],
  ['First Solar', { category: 'energy', sector: 'Energy Tech' }],
  ['Fluence Energy', { category: 'energy', sector: 'Energy Tech' }],
  ['Tesla Energy', { category: 'energy', sector: 'Energy Tech' }],
  ['Bloom Energy', { category: 'energy', sector: 'Energy Tech' }],
  ['Plug Power', { category: 'energy', sector: 'Energy Tech' }],
  ['Stem Inc', { category: 'energy', sector: 'Energy Tech' }],
  ['NuScale Power', { category: 'energy', sector: 'Energy Tech' }],
  ['Oklo', { category: 'energy', sector: 'Energy Tech' }],
  ['X-energy', { category: 'energy', sector: 'Energy Tech' }],
  ['TerraPower', { category: 'energy', sector: 'Energy Tech' }],
  ['Commonwealth Fusion', { category: 'energy', sector: 'Energy Tech' }],
  ['Helion Energy', { category: 'energy', sector: 'Energy Tech' }],

  // ═══════════════════════════════════════════════════════════════════════════════
  // BORDER TECH & TRADE
  // ═══════════════════════════════════════════════════════════════════════════════
  ['CrossingIQ', { category: 'border_tech', sector: 'Border Tech' }],
  ['TradeSync Border', { category: 'border_tech', sector: 'Border Tech' }],
  ['CBPASS Systems', { category: 'border_tech', sector: 'Border Tech' }],
  ['BorderTech', { category: 'border_tech', sector: 'Border Tech' }],
  ['PortLogic', { category: 'border_tech', sector: 'Border Tech' }],
  ['Pangea Customs', { category: 'border_tech', sector: 'Border Tech' }],
  ['Customs Info', { category: 'border_tech', sector: 'Border Tech' }],
  ['CargoSmart', { category: 'border_tech', sector: 'Border Tech' }],
  ['Livingston International', { category: 'border_tech', sector: 'Border Tech' }],
  ['C.H. Powell', { category: 'border_tech', sector: 'Border Tech' }],

  // ═══════════════════════════════════════════════════════════════════════════════
  // AUTONOMOUS VEHICLES & DRONES
  // ═══════════════════════════════════════════════════════════════════════════════
  ['Waymo', { category: 'autonomous', sector: 'Autonomous Vehicles' }],
  ['Cruise', { category: 'autonomous', sector: 'Autonomous Vehicles' }],
  ['Aurora Innovation', { category: 'autonomous', sector: 'Autonomous Vehicles' }],
  ['TuSimple', { category: 'autonomous', sector: 'Autonomous Vehicles' }],
  ['Gatik', { category: 'autonomous', sector: 'Autonomous Vehicles' }],
  ['Kodiak Robotics', { category: 'autonomous', sector: 'Autonomous Vehicles' }],
  ['Plus.ai', { category: 'autonomous', sector: 'Autonomous Vehicles' }],
  ['Skydio', { category: 'drones', sector: 'Defense Tech' }],
  ['Joby Aviation', { category: 'autonomous', sector: 'Autonomous Vehicles' }],
  ['Archer Aviation', { category: 'autonomous', sector: 'Autonomous Vehicles' }],
  ['Zipline', { category: 'drones', sector: 'Logistics' }],
  ['Wing Aviation', { category: 'drones', sector: 'Logistics' }],

  // ═══════════════════════════════════════════════════════════════════════════════
  // SEMICONDUCTOR & CHIPS
  // ═══════════════════════════════════════════════════════════════════════════════
  ['TSMC', { category: 'semiconductor', sector: 'Supply Chain' }],
  ['Samsung Electronics', { category: 'semiconductor', sector: 'Supply Chain' }],
  ['GlobalFoundries', { category: 'semiconductor', sector: 'Supply Chain' }],
  ['ASML', { category: 'semiconductor', sector: 'Supply Chain' }],
  ['Qualcomm', { category: 'semiconductor', sector: 'Supply Chain' }],
  ['Broadcom', { category: 'semiconductor', sector: 'Supply Chain' }],
  ['Texas Instruments', { category: 'semiconductor', sector: 'Supply Chain' }],
  ['Micron', { category: 'semiconductor', sector: 'Supply Chain' }],
  ['Applied Materials', { category: 'semiconductor', sector: 'Supply Chain' }],
  ['Lam Research', { category: 'semiconductor', sector: 'Supply Chain' }],
  ['KLA Corporation', { category: 'semiconductor', sector: 'Supply Chain' }],
  ['Marvell Technology', { category: 'semiconductor', sector: 'Supply Chain' }],
  ['ON Semiconductor', { category: 'semiconductor', sector: 'Supply Chain' }],
  ['Lattice Semiconductor', { category: 'semiconductor', sector: 'Supply Chain' }],

  // ═══════════════════════════════════════════════════════════════════════════════
  // WATER TECHNOLOGY
  // ═══════════════════════════════════════════════════════════════════════════════
  ['El Paso Water', { category: 'water', sector: 'Water Tech' }],
  ['AridTech', { category: 'water', sector: 'Water Tech' }],
  ['Xylem', { category: 'water', sector: 'Water Tech' }],
  ['Veolia', { category: 'water', sector: 'Water Tech' }],
  ['Suez', { category: 'water', sector: 'Water Tech' }],
  ['Pall Corporation', { category: 'water', sector: 'Water Tech' }],
  ['Evoqua', { category: 'water', sector: 'Water Tech' }],
  ['IDE Technologies', { category: 'water', sector: 'Water Tech' }],
  ['Gradiant', { category: 'water', sector: 'Water Tech' }],
  ['Desalitech', { category: 'water', sector: 'Water Tech' }],

  // ═══════════════════════════════════════════════════════════════════════════════
  // HEALTH TECH
  // ═══════════════════════════════════════════════════════════════════════════════
  ['Epic Systems', { category: 'healthtech', sector: 'Health Tech' }],
  ['Cerner', { category: 'healthtech', sector: 'Health Tech' }],
  ['Teladoc', { category: 'healthtech', sector: 'Health Tech' }],
  ['Veracyte', { category: 'healthtech', sector: 'Health Tech' }],
  ['Tempus AI', { category: 'healthtech', sector: 'Health Tech' }],
  ['Flatiron Health', { category: 'healthtech', sector: 'Health Tech' }],
  ['UMC El Paso', { category: 'healthtech', sector: 'Health Tech' }],
]);

// ─── Lookup helpers ─────────────────────────────────────────────────────────────

/**
 * Build a lowercased name set for O(1) lookup during scanning.
 * Maps lowercase name -> original cased name.
 */
const _lowerToOriginal = new Map<string, string>();
for (const [name] of KNOWN_COMPANIES) {
  _lowerToOriginal.set(name.toLowerCase(), name);
}

/**
 * Check if a company name (case-insensitive) is in the dictionary.
 * Returns the canonical (properly cased) name if found, null otherwise.
 */
export function findKnownCompany(name: string): string | null {
  return _lowerToOriginal.get(name.toLowerCase()) ?? null;
}

/**
 * Scan a text block for known company mentions.
 * Returns a deduplicated array of matched company names.
 */
export function scanForKnownCompanies(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const [lowerName, originalName] of _lowerToOriginal) {
    // Only match if the name has at least 3 characters (avoids false positives like "PTC", "AMD" matching substrings)
    // For short names, require word boundary
    if (lowerName.length <= 3) {
      const wordBoundaryPattern = new RegExp(`\\b${lowerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (wordBoundaryPattern.test(text)) {
        found.add(originalName);
      }
    } else if (lower.includes(lowerName)) {
      found.add(originalName);
    }
  }
  return Array.from(found);
}

/**
 * Get entry info for a known company by its canonical name.
 */
export function getCompanyEntry(name: string): CompanyEntry | undefined {
  return KNOWN_COMPANIES.get(name);
}

export const KNOWN_COMPANIES_COUNT = KNOWN_COMPANIES.size;
