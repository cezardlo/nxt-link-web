// Global vendor intelligence — technology companies worldwide tracked by NXT LINK
// Covers AI/ML, Cybersecurity, Defense Tech, Manufacturing/Robotics, Energy/CleanTech,
// Border/Surveillance, Logistics, Healthcare/Biotech, Space/Aerospace, and Data platforms.

import type { VendorRecord } from './el-paso-vendors';

export const GLOBAL_VENDORS: Record<string, VendorRecord> = {

  // ── AI / ML ───────────────────────────────────────────────────────────────

  'gbl-openai': {
    id: 'gbl-openai',
    name: 'OpenAI',
    description: 'Developer of the GPT model family and ChatGPT, the fastest-growing enterprise AI platform in history. OpenAI provides API access to GPT-4o, o1, and Sora for enterprise automation, code generation, document intelligence, and multimodal reasoning. The company holds a strategic Microsoft Azure partnership worth $13B and is expanding into government, defense, and critical-infrastructure sectors via FedRAMP-authorized deployments.',
    website: 'https://openai.com',
    tags: ['AI/ML', 'LLM', 'GPT', 'Enterprise AI', 'Multimodal', 'Government AI', 'API'],
    evidence: [
      'Microsoft $13B strategic investment (2023–2024) grants Azure exclusive commercial cloud distribution rights.',
      'ChatGPT Enterprise surpassed 600,000 enterprise users across Fortune 500 firms by Q4 2024.',
      'DoD and IC community pilots underway through Microsoft GovCloud FedRAMP authorization pathway.',
    ],
    category: 'AI/ML',
    ikerScore: 94,
    lat: 37.7749, lon: -122.4194, layer: 'vendors', weight: 0.95, confidence: 0.92,
  },

  'gbl-anthropic': {
    id: 'gbl-anthropic',
    name: 'Anthropic',
    description: 'AI safety company and developer of the Claude model family, specializing in Constitutional AI alignment techniques. Anthropic\'s Claude 3 Opus and Sonnet models rank among the top-performing LLMs on reasoning benchmarks and are deployed by enterprise customers requiring higher interpretability and safety guarantees. AWS partnership ($4B) provides cloud infrastructure and distribution.',
    website: 'https://anthropic.com',
    tags: ['AI/ML', 'LLM', 'Constitutional AI', 'AI Safety', 'Enterprise AI', 'Claude'],
    evidence: [
      'Amazon AWS $4B strategic investment (2023) with AWS as preferred cloud and distribution partner.',
      'Claude 3 Opus achieved top-1 performance on MMLU, HumanEval, and MATH benchmarks (March 2024).',
      'Deployed in government and classified research environments via AWS GovCloud integration pathway.',
    ],
    category: 'AI/ML',
    ikerScore: 88,
    lat: 37.7749, lon: -122.4313, layer: 'vendors', weight: 0.88, confidence: 0.90,
  },

  'gbl-deepmind': {
    id: 'gbl-deepmind',
    name: 'Google DeepMind',
    description: 'Alphabet\'s AI research laboratory and applied AI division, responsible for AlphaFold protein structure prediction, Gemini Ultra, and AlphaCode. DeepMind provides AI capabilities across Google Cloud\'s Vertex AI platform and delivers breakthrough science tools used by pharmaceutical, climate, and defense research organizations globally. The London-based lab employs over 2,000 researchers.',
    website: 'https://deepmind.google',
    tags: ['AI/ML', 'Research AI', 'AlphaFold', 'Gemini', 'Drug Discovery', 'Scientific AI', 'Robotics AI'],
    evidence: [
      'AlphaFold 3 model published in Nature (May 2024) — predicted structures for 200M+ proteins, free public access.',
      'Gemini Ultra integrated into Google Cloud Vertex AI for enterprise fine-tuning and deployment.',
      'DeepMind AlphaCode 2 achieved 85th percentile on competitive programming benchmarks (2023).',
    ],
    category: 'AI/ML',
    ikerScore: 92,
    lat: 51.5253, lon: -0.1353, layer: 'vendors', weight: 0.92, confidence: 0.91,
  },

  'gbl-mistral': {
    id: 'gbl-mistral',
    name: 'Mistral AI',
    description: 'Paris-based AI startup developing open-weight and commercial LLMs with industry-leading efficiency. Mistral 7B, Mixtral 8x7B, and Mistral Large offer competitive performance at a fraction of the compute cost of closed models. Strong European government interest given data sovereignty position; Mistral Le Chat enterprise platform launched 2024 targets regulated industries.',
    website: 'https://mistral.ai',
    tags: ['AI/ML', 'LLM', 'Open-Weight Models', 'European AI', 'Data Sovereignty', 'Edge AI'],
    evidence: [
      'Series B funding: $640M at $6B valuation (June 2024), investors include Andreessen Horowitz and General Catalyst.',
      'Mixtral 8x7B open-weight model outperforms GPT-3.5 on 6 of 7 standard benchmarks at 3x lower inference cost.',
      'Microsoft Azure and Google Cloud distribution agreements signed Q1 2024 for Mistral Large commercial model.',
    ],
    category: 'AI/ML',
    ikerScore: 74,
    lat: 48.8566, lon: 2.3522, layer: 'momentum', weight: 0.74, confidence: 0.85,
  },

  'gbl-cohere': {
    id: 'gbl-cohere',
    name: 'Cohere',
    description: 'Enterprise NLP platform provider specializing in retrieval-augmented generation (RAG), text embeddings, and large-scale document understanding for regulated industries. Cohere\'s Command R+ and Embed models are optimized for private deployment on enterprise infrastructure, making them preferred by financial services, healthcare, and government customers with strict data residency requirements.',
    website: 'https://cohere.com',
    tags: ['AI/ML', 'Enterprise NLP', 'RAG', 'Text Embeddings', 'Retrieval AI', 'Private Deployment'],
    evidence: [
      'Series C funding: $270M at $2.2B valuation (June 2023), investors include Nvidia, Oracle, and Salesforce.',
      'Command R+ model benchmarked at top-3 RAG performance for enterprise document Q&A tasks (April 2024).',
      'Oracle Cloud Infrastructure partnership enables private on-premises deployment for regulated industries.',
    ],
    category: 'AI/ML',
    ikerScore: 68,
    lat: 43.6532, lon: -79.3832, layer: 'momentum', weight: 0.68, confidence: 0.82,
  },

  'gbl-stability': {
    id: 'gbl-stability',
    name: 'Stability AI',
    description: 'Developer of Stable Diffusion, the leading open-source image-generation model family, and a suite of generative AI tools for image, audio, video, and 3D content. Stability AI\'s models are embedded in thousands of commercial products and used by defense, advertising, and creative industries. The company is restructuring under new leadership as of 2024 with focus on API monetization.',
    website: 'https://stability.ai',
    tags: ['AI/ML', 'Generative AI', 'Image Generation', 'Stable Diffusion', 'Open Source AI', 'Multimodal'],
    evidence: [
      'Stable Diffusion 3 Medium released open-weights (June 2024) — 2B parameter model, top image quality benchmarks.',
      'Stable Diffusion embedded in 10,000+ commercial applications globally per Stability API usage data.',
      'New CEO Prem Akkaraju appointed March 2024; company restructuring targets API-first revenue model.',
    ],
    category: 'AI/ML',
    ikerScore: 58,
    lat: 51.5074, lon: -0.1278, layer: 'funding', weight: 0.58, confidence: 0.72,
  },

  // ── Cybersecurity ─────────────────────────────────────────────────────────

  'gbl-crowdstrike': {
    id: 'gbl-crowdstrike',
    name: 'CrowdStrike',
    description: 'Cloud-native endpoint detection and response (EDR) and extended detection and response (XDR) leader. The Falcon platform provides AI-powered threat detection, identity protection, and cloud security across 23,000+ enterprise and government customers. CrowdStrike holds a DoD IL4/IL5 authorization and is an active vendor on multiple federal cybersecurity contracts including the DoD CMMC framework.',
    website: 'https://crowdstrike.com',
    tags: ['Cybersecurity', 'EDR', 'XDR', 'Endpoint Protection', 'AI Security', 'Government Cyber', 'CMMC'],
    evidence: [
      'FY2025 ARR reached $3.44B (Q1 FY2025), 33% YoY growth — largest pure-play cybersecurity vendor.',
      'DoD IL4/IL5 FedRAMP High authorization for Falcon GovCloud environment (2023).',
      'DHS CISA selected CrowdStrike Falcon for federal endpoint protection under CDM program (2024).',
    ],
    category: 'Cybersecurity',
    ikerScore: 91,
    lat: 30.2672, lon: -97.7431, layer: 'vendors', weight: 0.91, confidence: 0.93,
  },

  'gbl-paloalto': {
    id: 'gbl-paloalto',
    name: 'Palo Alto Networks',
    description: 'Global cybersecurity platform provider offering next-generation firewalls, zero-trust network access (ZTNA), SASE, cloud security (Prisma Cloud), and AI-powered security operations (Cortex). Palo Alto Networks is the highest-revenue dedicated cybersecurity company globally, serving 80,000+ organizations including the majority of the Fortune 100 and multiple federal agencies under GSA schedule.',
    website: 'https://paloaltonetworks.com',
    tags: ['Cybersecurity', 'NGFW', 'Zero Trust', 'SASE', 'Cloud Security', 'SOC', 'Federal Cyber'],
    evidence: [
      'FY2024 revenue: $8.03B — largest dedicated cybersecurity company globally by revenue.',
      'Prisma Cloud SASE platform selected by U.S. Army for enterprise remote access modernization (2024).',
      'Cortex XSIAM deployed at 200+ enterprise SOCs, replacing legacy SIEM at 3x lower analyst alert load.',
    ],
    category: 'Cybersecurity',
    ikerScore: 92,
    lat: 37.3693, lon: -122.0308, layer: 'vendors', weight: 0.92, confidence: 0.93,
  },

  'gbl-darktrace': {
    id: 'gbl-darktrace',
    name: 'Darktrace',
    description: 'Cambridge-based AI-driven cybersecurity company pioneering autonomous threat detection and self-healing network security. Darktrace\'s Enterprise Immune System uses unsupervised machine learning to establish behavioral baselines and detect novel threats in real time. The company serves 9,000+ customers across critical infrastructure, financial services, and defense, with strong UK MoD and NATO partner adoption.',
    website: 'https://darktrace.com',
    tags: ['Cybersecurity', 'AI Security', 'Autonomous Response', 'Network Detection', 'OT Security', 'Critical Infrastructure'],
    evidence: [
      'Darktrace ActiveAI Security Platform launched 2024, integrating email, network, cloud, and OT threat detection.',
      'UK MoD and NATO member defense networks deployed Darktrace Enterprise Immune System (2022–2024).',
      'FY2024 ARR: $716M — publicly traded (LSE: DARK), 9,000+ customers across 110 countries.',
    ],
    category: 'Cybersecurity',
    ikerScore: 78,
    lat: 52.2053, lon: 0.1218, layer: 'momentum', weight: 0.78, confidence: 0.86,
  },

  'gbl-checkpoint': {
    id: 'gbl-checkpoint',
    name: 'Check Point Software',
    description: 'Tel Aviv-based cybersecurity pioneer and one of the world\'s largest network security vendors, known for inventing stateful firewall inspection in the 1990s. Check Point\'s Infinity platform spans network security, cloud security, endpoint, mobile, and IoT across 100,000+ enterprise and government customers. The company has a particularly strong presence in government and critical infrastructure sectors globally.',
    website: 'https://checkpoint.com',
    tags: ['Cybersecurity', 'Network Security', 'Firewall', 'Cloud Security', 'Endpoint', 'IoT Security'],
    evidence: [
      'FY2024 revenue: $2.39B, Q4 2024 EPS beat consensus by 4% — 30+ consecutive years of profitability.',
      'Check Point Infinity platform deployed across 100,000+ organizations including 80% of Fortune 100.',
      'Harmony Email & Collaboration blocked 2B+ phishing attacks per year across enterprise deployments (2024 data).',
    ],
    category: 'Cybersecurity',
    ikerScore: 84,
    lat: 32.0853, lon: 34.7818, layer: 'vendors', weight: 0.84, confidence: 0.89,
  },

  'gbl-sentinelone': {
    id: 'gbl-sentinelone',
    name: 'SentinelOne',
    description: 'Autonomous AI-powered endpoint protection platform (EPP) and XDR company. SentinelOne\'s Singularity Platform operates without cloud connectivity, making it a strong fit for air-gapped defense and critical infrastructure environments. The company competes directly with CrowdStrike and holds multiple U.S. federal authorizations including FedRAMP High and DoD IL4.',
    website: 'https://sentinelone.com',
    tags: ['Cybersecurity', 'EDR', 'XDR', 'Autonomous Protection', 'Air Gap', 'Federal Cyber', 'Endpoint'],
    evidence: [
      'FY2025 ARR: $2.19B, 32% YoY growth; 11,000+ enterprise and government customers globally.',
      'FedRAMP High authorization achieved 2023 — deployed at multiple civilian and DoD agencies.',
      'Singularity Platform selected by U.S. Air Force for endpoint protection across classified and unclassified networks.',
    ],
    category: 'Cybersecurity',
    ikerScore: 82,
    lat: 37.3861, lon: -122.0839, layer: 'vendors', weight: 0.82, confidence: 0.88,
  },

  'gbl-dragos': {
    id: 'gbl-dragos',
    name: 'Dragos',
    description: 'Industrial cybersecurity company specializing in operational technology (OT) and industrial control systems (ICS) threat detection and incident response. Dragos serves energy, utilities, manufacturing, and defense industrial base customers, providing the only OT-native threat intelligence platform with named threat group tracking for state-sponsored ICS attackers. CISA and DHS partner for critical infrastructure protection.',
    website: 'https://dragos.com',
    tags: ['Cybersecurity', 'OT Security', 'ICS Security', 'Industrial Cyber', 'SCADA', 'Critical Infrastructure', 'Threat Intelligence'],
    evidence: [
      'Series D funding: $200M at $1.7B valuation (2021); backed by Koch Industries, Saudi Aramco, and Hewlett Packard Enterprise.',
      'Dragos Platform deployed across 500+ industrial sites in energy, chemicals, and defense manufacturing (2024).',
      'CISA designated Dragos as preferred OT security partner for critical infrastructure incident response support.',
    ],
    category: 'Cybersecurity',
    ikerScore: 72,
    lat: 39.0469, lon: -76.9033, layer: 'momentum', weight: 0.72, confidence: 0.84,
  },

  'gbl-tenable': {
    id: 'gbl-tenable',
    name: 'Tenable',
    description: 'Vulnerability management and exposure management platform provider with 44,000+ enterprise and government customers. Tenable Nessus is the world\'s most widely deployed vulnerability scanner; Tenable One provides unified exposure management across IT, OT, cloud, and identity. The company holds FedRAMP authorization and is an active vendor on DHS and DoD vulnerability management contracts.',
    website: 'https://tenable.com',
    tags: ['Cybersecurity', 'Vulnerability Management', 'Exposure Management', 'OT Security', 'Federal Cyber', 'Compliance'],
    evidence: [
      'FY2023 revenue: $811M, 16% YoY growth — 44,000 customers in 170 countries.',
      'Tenable.sc deployed across 50+ U.S. federal agencies under CDM program (CISA, 2023).',
      'Tenable OT Security selected by U.S. Navy for critical shipyard ICS vulnerability management (2024).',
    ],
    category: 'Cybersecurity',
    ikerScore: 79,
    lat: 39.2037, lon: -76.8610, layer: 'momentum', weight: 0.79, confidence: 0.87,
  },

  // ── Defense Tech ──────────────────────────────────────────────────────────

  'gbl-anduril': {
    id: 'gbl-anduril',
    name: 'Anduril Industries',
    description: 'Defense technology company building autonomous systems, AI command-and-control software (Lattice), and counter-drone platforms for the U.S. military and allies. Anduril products include the Sentry autonomous surveillance tower (deployed on the U.S.-Mexico border), Ghost autonomous fixed-wing UAS, and Roadrunner counter-drone interceptor. The company is the fastest-growing defense prime by contract growth rate.',
    website: 'https://anduril.com',
    tags: ['Defense Tech', 'Autonomous Systems', 'Counter-UAS', 'AI Command & Control', 'Border Security', 'Lattice', 'Surveillance'],
    evidence: [
      'Series F funding: $1.5B at $14B valuation (August 2024) — largest single defense tech raise of 2024.',
      'U.S. Border Patrol Sentry tower contract: 200+ autonomous surveillance towers deployed on U.S.-Mexico border.',
      'SOCOM Roadrunner counter-drone interceptor contract awarded 2024 for layered air defense fleet.',
    ],
    category: 'Defense Tech',
    ikerScore: 85,
    lat: 33.6405, lon: -117.9187, layer: 'vendors', weight: 0.85, confidence: 0.88,
  },

  'gbl-palantir': {
    id: 'gbl-palantir',
    name: 'Palantir Technologies',
    description: 'Data integration and AI decision-support platform provider for defense, intelligence, and commercial sectors. Palantir Gotham powers analysis for intelligence agencies and military commands; Foundry serves commercial enterprise data operations; AIP (Artificial Intelligence Platform) integrates LLMs into operational decision workflows. The company is deeply embedded in U.S. and UK national security infrastructure.',
    website: 'https://palantir.com',
    tags: ['Defense IT', 'AI/ML', 'Data Analytics', 'Intelligence Platforms', 'Gotham', 'Foundry', 'AIP', 'C2'],
    evidence: [
      'U.S. Army IDA2 contract: $821M over 5 years for battlefield intelligence and logistics data platform (2024).',
      'U.S. government revenue FY2024: $1.14B — growing 40% YoY, driven by AIP deployments at combatant commands.',
      'Added to S&P 500 index September 2024; FY2024 total revenue $2.86B — first full year of GAAP profitability.',
    ],
    category: 'Defense IT',
    ikerScore: 90,
    lat: 39.7392, lon: -104.9903, layer: 'vendors', weight: 0.90, confidence: 0.92,
  },

  'gbl-bae': {
    id: 'gbl-bae',
    name: 'BAE Systems',
    description: 'UK-headquartered global defense prime providing electronic warfare, cyber operations, naval systems, combat vehicles, and intelligence platforms across the U.S., UK, Australia, and NATO allies. BAE Systems is the third-largest defense company in the world by revenue. In the U.S., BAE operates as BAE Systems Inc. with $15B+ in U.S. government contracts, covering Bradley Fighting Vehicle upgrades and the U.S. Navy\'s DDG-51 destroyer program.',
    website: 'https://baesystems.com',
    tags: ['Defense', 'Electronic Warfare', 'Cyber Defense', 'Combat Vehicles', 'Naval Systems', 'Intelligence Systems'],
    evidence: [
      'FY2023 revenue: £25.3B ($31.9B), 9% organic growth — highest growth decade in company history.',
      'Bradley Fighting Vehicle A4 upgrade contract: $4.6B, U.S. Army, 2023–2028.',
      'Selected for AUKUS nuclear submarine program electronic systems integration (2023).',
    ],
    category: 'Defense',
    ikerScore: 91,
    lat: 51.5074, lon: -0.1278, layer: 'vendors', weight: 0.91, confidence: 0.92,
  },

  'gbl-thales': {
    id: 'gbl-thales',
    name: 'Thales Group',
    description: 'French defense and technology multinational covering defense electronics, cybersecurity, avionics, transportation, and digital identity systems. Thales is a prime on numerous NATO programs and supplies tactical radios, air defense sensors, IFF systems, and cyber operations platforms to 68 countries. The company\'s Thales DIS division is the world\'s largest provider of digital identity and security (SIM cards, passports, border systems).',
    website: 'https://thalesgroup.com',
    tags: ['Defense', 'Electronic Warfare', 'Avionics', 'Cybersecurity', 'Border Systems', 'Digital Identity', 'NATO'],
    evidence: [
      'FY2023 revenue: €20.6B ($22.5B), defense segment up 14% driven by NATO rearmament demand.',
      'Thales CONTACT tactical radio selected for French, Belgian, and Dutch armed forces (2023).',
      'Thales Identity & Security border systems deployed across 60+ countries covering e-passport and biometric inspection.',
    ],
    category: 'Defense',
    ikerScore: 89,
    lat: 48.8566, lon: 2.3522, layer: 'vendors', weight: 0.89, confidence: 0.91,
  },

  'gbl-rafael': {
    id: 'gbl-rafael',
    name: 'Rafael Advanced Defense Systems',
    description: 'Israeli state-owned defense R&D company and manufacturer of the Iron Dome air defense system, Spike missile family, Trophy active protection system, and David\'s Sling. Rafael systems are co-produced with Raytheon for U.S. Army Trophy APS on Abrams tanks. The company\'s Iron Dome system has achieved 90%+ intercept rate against thousands of rocket and mortar threats, and the system has been sold to the U.S. Army.',
    website: 'https://rafael.co.il',
    tags: ['Defense', 'Missiles', 'Air Defense', 'Iron Dome', 'Counter-UAS', 'Active Protection', 'Trophy APS'],
    evidence: [
      'U.S. Army Iron Dome battery contract: $373M for two Iron Dome systems, delivered 2021–2022.',
      'Trophy APS selected for U.S. Abrams M1A2 SEPv3 upgrade program — Raytheon co-production agreement.',
      'Spike NLOS missile system exported to 40+ countries; $600M+ in orders in 2023 alone.',
    ],
    category: 'Defense',
    ikerScore: 86,
    lat: 32.7940, lon: 34.9896, layer: 'vendors', weight: 0.86, confidence: 0.87,
  },

  'gbl-elbit': {
    id: 'gbl-elbit',
    name: 'Elbit Systems',
    description: 'Israel-based international defense electronics company providing surveillance systems, UAVs, electro-optical sensors, helmet-mounted displays, and border security technology. Elbit\'s TORCH-X C2 platform and SkEye wide-area persistent surveillance system are deployed on the U.S.-Mexico border through the DHS Integrated Fixed Tower (IFT) program. Elbit is a direct competitor and partner to Anduril in border surveillance.',
    website: 'https://elbitsystems.com',
    tags: ['Defense Tech', 'Border Security', 'Surveillance', 'UAV', 'Electro-Optical', 'C4ISR', 'Integrated Fixed Tower'],
    evidence: [
      'DHS Integrated Fixed Tower (IFT) Phase 2 contract: $145M for autonomous surveillance towers on U.S. southern border.',
      'U.S. Army IVAS competitor — Elbit TORCH-X HMD evaluated in soldier-worn C2 program (2023).',
      'FY2023 revenue: $5.96B, backlog of $17.7B — 80% from international defense customers.',
    ],
    category: 'Defense Tech',
    ikerScore: 83,
    lat: 32.7940, lon: 34.9896, layer: 'vendors', weight: 0.83, confidence: 0.87,
  },

  // ── Manufacturing / Robotics ──────────────────────────────────────────────

  'gbl-fanuc': {
    id: 'gbl-fanuc',
    name: 'Fanuc Corporation',
    description: 'World\'s largest industrial robot manufacturer by unit volume, headquartered in Yamanashi, Japan. Fanuc robots power automotive, electronics, and aerospace assembly lines in 108 countries. The company\'s CNC (computer numerical control) systems control approximately 30% of global machine tools. Fanuc\'s Collaborative Robot (CR) series and FIELD IoT platform are expanding into defense manufacturing and aerospace supply chains.',
    website: 'https://fanuc.com',
    tags: ['Manufacturing', 'Industrial Robots', 'CNC', 'Automation', 'Collaborative Robots', 'IoT Manufacturing'],
    evidence: [
      'FY2024 revenue: ¥990B ($6.6B) — 500,000+ cumulative robots installed globally.',
      'Fanuc CRX collaborative robots selected for Lockheed Martin F-35 composite assembly line automation (2023).',
      'FIELD IoT platform deployed at 1,400+ factories in 30 countries for predictive maintenance integration.',
    ],
    category: 'Manufacturing',
    ikerScore: 93,
    lat: 35.5626, lon: 138.7522, layer: 'vendors', weight: 0.93, confidence: 0.92,
  },

  'gbl-abb': {
    id: 'gbl-abb',
    name: 'ABB',
    description: 'Swiss-Swedish multinational technology company providing industrial robotics, electrification, automation, and motion systems. ABB Robotics is one of the four global robot market leaders, with 1,000+ robot models covering payloads from 0.5 kg to 1,000 kg. ABB\'s YuMi collaborative robot is widely used in electronics assembly, and its GoFa/SWIFTI cobot line targets automotive and logistics sectors.',
    website: 'https://abb.com',
    tags: ['Manufacturing', 'Industrial Robots', 'Automation', 'Electrification', 'Collaborative Robots', 'Industrial IoT'],
    evidence: [
      'FY2023 revenue: $32.2B, Robotics & Discrete Automation division: $3.8B (+7% YoY).',
      'ABB GoFa cobot deployed at 500+ automotive Tier-1 suppliers globally for flexible manufacturing cells.',
      'ABB Ability OCTOPUS fleet management selected by 20+ European automotive OEMs for mixed robot orchestration.',
    ],
    category: 'Manufacturing',
    ikerScore: 91,
    lat: 47.3769, lon: 8.5417, layer: 'vendors', weight: 0.91, confidence: 0.91,
  },

  'gbl-siemens': {
    id: 'gbl-siemens',
    name: 'Siemens Digital Industries',
    description: 'Industrial automation and digital twin platform leader providing PLM software (Teamcenter, NX), MES systems (Opcenter), and IIoT edge platforms (MindSphere/Industrial Edge). Siemens Digital Industries Software is the world\'s largest industrial software company by revenue. The Xcelerator portfolio powers digital manufacturing transformation at aerospace primes, automotive OEMs, and defense manufacturers globally.',
    website: 'https://siemens.com/industries',
    tags: ['Manufacturing', 'Digital Twin', 'PLM', 'MES', 'Industrial IoT', 'Automation', 'Smart Factory'],
    evidence: [
      'Siemens Digital Industries revenue FY2024: €20.8B — largest industrial software segment by revenue globally.',
      'Teamcenter PLM deployed at Boeing, Lockheed Martin, and Airbus for F-35 and A320neo digital thread.',
      'Opcenter MES selected by TSMC for advanced semiconductor fab production management (2023).',
    ],
    category: 'Manufacturing',
    ikerScore: 93,
    lat: 48.1351, lon: 11.5820, layer: 'vendors', weight: 0.93, confidence: 0.92,
  },

  'gbl-bostondynamics': {
    id: 'gbl-bostondynamics',
    name: 'Boston Dynamics',
    description: 'Advanced robotics company known for Spot, Atlas, and Stretch — the world\'s most capable mobile robots. Spot is deployed in industrial inspection, defense reconnaissance, and hazardous environment monitoring. The U.S. Army and USMC have evaluated Spot for battlefield logistics and force protection roles. Boston Dynamics is majority-owned by Hyundai Motor Group.',
    website: 'https://bostondynamics.com',
    tags: ['Robotics', 'Mobile Robots', 'Defense Robotics', 'Industrial Inspection', 'Autonomous Systems', 'Spot', 'Atlas'],
    evidence: [
      'U.S. Army Futures Command Spot evaluation contract — reconnaissance and base security pilot, 2023.',
      'Spot deployed at 1,000+ industrial sites globally including Chevron, BP, and Ford manufacturing plants.',
      'Stretch warehouse robot commercial launch 2024 — 800+ unit order backlog from automotive logistics customers.',
    ],
    category: 'Robotics',
    ikerScore: 76,
    lat: 42.3601, lon: -71.0589, layer: 'momentum', weight: 0.76, confidence: 0.84,
  },

  'gbl-ur': {
    id: 'gbl-ur',
    name: 'Universal Robots',
    description: 'Danish pioneer of collaborative robots (cobots), with the world\'s largest installed base of cobots at 75,000+ units across 80 countries. Universal Robots UR3, UR5, UR10, and UR20 arms are the industry standard for flexible manufacturing automation in electronics, medical devices, food processing, and defense manufacturing. The company is a subsidiary of Teradyne and holds 60%+ global cobot market share.',
    website: 'https://universal-robots.com',
    tags: ['Robotics', 'Collaborative Robots', 'Cobots', 'Flexible Manufacturing', 'Defense Manufacturing', 'Electronics Assembly'],
    evidence: [
      '75,000+ cobots in operation globally — 60% global collaborative robot market share by installed units.',
      'UR20 high-payload cobot selected for multiple Tier-1 automotive suppliers\' weld-cell automation programs (2024).',
      'UR+ ecosystem: 400+ certified hardware and software plug-ins, largest cobot application ecosystem globally.',
    ],
    category: 'Robotics',
    ikerScore: 84,
    lat: 55.3959, lon: 10.3883, layer: 'vendors', weight: 0.84, confidence: 0.88,
  },

  // ── Energy / CleanTech ────────────────────────────────────────────────────

  'gbl-tesla-energy': {
    id: 'gbl-tesla-energy',
    name: 'Tesla Energy',
    description: 'Tesla\'s energy division providing utility-scale battery storage (Megapack), residential storage (Powerwall), and solar generation (Solar Roof, Solar Panels). Tesla Megapack is the world\'s most deployed large-scale battery storage system, with installations powering grid stability in California, Texas, Australia, and the UK. Tesla Energy revenues exceeded $10B in FY2024 for the first time.',
    website: 'https://tesla.com/energy',
    tags: ['Energy', 'Battery Storage', 'Solar', 'Megapack', 'Grid Stabilization', 'Microgrids', 'CleanTech'],
    evidence: [
      'Megapack deployments reached 31.4 GWh in FY2024 — largest single-year battery storage deployment globally.',
      'Tesla Energy FY2024 revenue: $10.1B, 113% YoY growth driven by Megapack backlog of $12B+.',
      'U.S. Army and Air Force evaluating Megapack for installation microgrid resilience at 15+ bases (2024).',
    ],
    category: 'Energy',
    ikerScore: 90,
    lat: 30.2672, lon: -97.7431, layer: 'vendors', weight: 0.90, confidence: 0.91,
  },

  'gbl-vestas': {
    id: 'gbl-vestas',
    name: 'Vestas Wind Systems',
    description: 'Danish company and the world\'s largest wind turbine manufacturer by cumulative installed capacity. Vestas has installed 180+ GW of wind power in 90+ countries and provides multi-decade service contracts (LTSA) for its global installed base. The company\'s V236-15.0 MW offshore turbine is the world\'s largest commercial wind turbine in production.',
    website: 'https://vestas.com',
    tags: ['Energy', 'Wind Power', 'Renewable Energy', 'Offshore Wind', 'Turbine Manufacturing', 'CleanTech'],
    evidence: [
      'FY2023 revenue: €14.6B — 25.7 GW of turbines delivered, 180+ GW cumulative installed globally.',
      'V236 offshore turbine selected for 1.5 GW North Sea projects by Ørsted and RWE (2023).',
      'U.S. offshore wind backlog: 3.4 GW across Mid-Atlantic and New England projects as of Q1 2024.',
    ],
    category: 'Energy',
    ikerScore: 87,
    lat: 56.1629, lon: 10.2039, layer: 'vendors', weight: 0.87, confidence: 0.89,
  },

  'gbl-enphase': {
    id: 'gbl-enphase',
    name: 'Enphase Energy',
    description: 'Fremont-based clean energy technology company and global leader in residential solar microinverter systems and IQ Battery home energy storage. Enphase shipped its 100 millionth microinverter in 2022 and holds 70%+ U.S. residential microinverter market share. The IQ8 microinverter enables "grid-agnostic" operation, a critical capability for military base resilience and disaster-response microgrids.',
    website: 'https://enphase.com',
    tags: ['Energy', 'Solar', 'Microinverters', 'Energy Storage', 'Microgrids', 'Residential Solar', 'CleanTech'],
    evidence: [
      'Q3 2024 revenue: $380M; 100M+ microinverters shipped globally — 70% U.S. residential market share.',
      'IQ8 "grid-agnostic" microinverter selected for DoD Utility Energy Service Contract (UESC) solar projects (2023).',
      'IQ Battery 5P launched 2024 — 5 kWh modular storage used in FEMA emergency resilience deployments.',
    ],
    category: 'Energy',
    ikerScore: 81,
    lat: 37.5485, lon: -121.9886, layer: 'vendors', weight: 0.81, confidence: 0.87,
  },

  'gbl-catl': {
    id: 'gbl-catl',
    name: 'CATL (Contemporary Amperex Technology)',
    description: 'Chinese battery manufacturer and the world\'s largest EV battery producer, supplying Tesla, BMW, Volkswagen, Ford, and most major global automakers. CATL holds approximately 37% global EV battery market share. The company\'s condensed matter battery and sodium-ion technology represent the next generation of energy storage for electric vehicles, aviation, and grid storage. Closely watched for geopolitical supply chain implications.',
    website: 'https://catl.com',
    tags: ['Energy', 'EV Batteries', 'Battery Manufacturing', 'Energy Storage', 'Lithium-Ion', 'Supply Chain'],
    evidence: [
      'FY2023 revenue: ¥402B ($55.4B) — 37% global EV battery market share by GWh shipped.',
      'CATL CTP 3.0 (Kirin battery) achieves 1,000 km range in BYD Han EV — industry energy density benchmark.',
      'Ford BlueOval SK JV: CATL technology licensed for $3.5B U.S. battery plant despite NDAA scrutiny (2023–2024).',
    ],
    category: 'Energy',
    ikerScore: 86,
    lat: 26.6615, lon: 119.5469, layer: 'vendors', weight: 0.86, confidence: 0.83,
  },

  'gbl-nextera': {
    id: 'gbl-nextera',
    name: 'NextEra Energy',
    description: 'Florida-based utility and the world\'s largest renewable energy company by capacity. NextEra operates Florida Power & Light (FPL) and NextEra Energy Resources, which owns the largest wind and solar portfolio in the U.S. The company has a West Texas wind and solar footprint directly relevant to El Paso metro energy supply. NextEra\'s 2025 capex plan of $20B targets solar + battery storage expansion in Texas and the Sun Belt.',
    website: 'https://nexteraenergy.com',
    tags: ['Energy', 'Renewable Energy', 'Wind Power', 'Solar', 'Battery Storage', 'Utility', 'Texas Grid'],
    evidence: [
      'FY2024 adjusted EPS: $3.33; 70+ GW total generation capacity — largest renewable operator globally.',
      'West Texas wind portfolio: 8+ GW of operating wind capacity serving ERCOT, adjacent to El Paso metro grid.',
      '$20B capex plan (2025–2026): majority allocated to solar + storage expansion in Texas and Florida.',
    ],
    category: 'Energy',
    ikerScore: 89,
    lat: 26.9342, lon: -80.0942, layer: 'vendors', weight: 0.89, confidence: 0.90,
  },

  'gbl-orsted': {
    id: 'gbl-orsted',
    name: 'Ørsted',
    description: 'Danish energy company and the world\'s leading offshore wind developer, having transformed from a fossil fuel company to the most sustainable energy company globally by multiple rankings. Ørsted develops, constructs, and operates offshore wind farms across Europe, the U.S. East Coast, and Asia-Pacific. The company\'s U.S. portfolio of 4+ GW represents the largest private offshore wind investment on the Eastern Seaboard.',
    website: 'https://orsted.com',
    tags: ['Energy', 'Offshore Wind', 'Renewable Energy', 'Sustainability', 'CleanTech', 'Grid Infrastructure'],
    evidence: [
      'FY2023 installed capacity: 8.9 GW offshore wind globally — largest offshore wind operator by capacity.',
      'Sunrise Wind and Revolution Wind (1.1 GW) under construction off New England coast, delivery 2025–2026.',
      'Ørsted U.S. market investment: $28B committed through 2030 for East Coast offshore wind portfolio.',
    ],
    category: 'Energy',
    ikerScore: 83,
    lat: 55.6761, lon: 12.5683, layer: 'vendors', weight: 0.83, confidence: 0.87,
  },

  // ── Border / Surveillance Tech ────────────────────────────────────────────

  'gbl-flir': {
    id: 'gbl-flir',
    name: 'Teledyne FLIR',
    description: 'World\'s largest thermal imaging and surveillance technology company, a division of Teledyne Technologies. FLIR thermal cameras and systems are deployed across border security, military vehicles, naval vessels, firefighting, and industrial inspection. CBP uses FLIR thermal systems on border surveillance towers and air assets. The Neutrino thermal camera core powers surveillance towers on the U.S.-Mexico border.',
    website: 'https://teledyneflir.com',
    tags: ['Border Tech', 'Thermal Imaging', 'Surveillance', 'Defense', 'CBP', 'Border Security', 'ISR'],
    evidence: [
      'CBP UAS fleet: FLIR Star SAFIRE sensors on Predator B drones conducting southern border surveillance.',
      'Teledyne acquired FLIR for $8B (2021) — combined defense sensing revenue exceeded $1.5B in 2023.',
      'FLIR ThermoSight Pro thermal scope selected for U.S. Army NGSW carbine program ancillary equipment.',
    ],
    category: 'Border Tech',
    ikerScore: 83,
    lat: 45.5051, lon: -122.6750, layer: 'vendors', weight: 0.83, confidence: 0.87,
  },

  'gbl-axon': {
    id: 'gbl-axon',
    name: 'Axon Enterprise',
    description: 'Scottsdale-based public safety technology company providing TASER conducted energy weapons, body-worn cameras, cloud evidence management (Evidence.com), drone-as-first-responder (DFR) systems, and AI-powered dispatch tools. Axon\'s digital evidence platform is deployed in 18,000+ law enforcement agencies globally including CBP, ICE, and most major U.S. police departments.',
    website: 'https://axon.com',
    tags: ['Border Tech', 'Public Safety Tech', 'Body Cameras', 'Evidence Management', 'TASER', 'Drones', 'AI Dispatch'],
    evidence: [
      'FY2024 revenue: $2.01B, 34% YoY growth — SaaS ARR crossed $1B for the first time in 2024.',
      'CBP body-worn camera contract: 2,000+ cameras deployed under DHS BWC program (2023).',
      'Axon AI Draft One auto-transcription deployed at 400+ police agencies reducing report-writing time 82%.',
    ],
    category: 'Border Tech',
    ikerScore: 81,
    lat: 33.4942, lon: -111.9261, layer: 'vendors', weight: 0.81, confidence: 0.88,
  },

  // ── Supply Chain / Logistics ──────────────────────────────────────────────

  'gbl-flexport': {
    id: 'gbl-flexport',
    name: 'Flexport',
    description: 'San Francisco-based digital freight forwarding platform providing air, ocean, truck, and customs brokerage services through a unified software interface. Flexport serves 10,000+ importers and exporters including Fortune 500 brands, providing real-time shipment visibility, automated customs filing, and supply chain analytics. The company handles $19B+ in annual merchandise trade and has particular relevance to U.S.-Mexico cross-border logistics.',
    website: 'https://flexport.com',
    tags: ['Logistics', 'Digital Freight', 'Supply Chain Visibility', 'Customs Brokerage', 'Border Logistics', 'Trade Tech'],
    evidence: [
      'Ryan Petersen returned as CEO (2023), company raised $260M and achieved profitability path by Q4 2024.',
      'Acquired Shopify Logistics business (2023) to add B2C fulfillment alongside freight forwarding.',
      'Customs ACE integration: Flexport handles $19B+ in annual trade value through U.S. border clearance.',
    ],
    category: 'Logistics',
    ikerScore: 68,
    lat: 37.7749, lon: -122.4194, layer: 'momentum', weight: 0.68, confidence: 0.80,
  },

  'gbl-project44': {
    id: 'gbl-project44',
    name: 'project44',
    description: 'Chicago-based supply chain visibility platform connecting 175,000+ carriers, LSPs, and shippers for real-time freight tracking across all modes. project44 is used by 67% of the Fortune 500 for end-to-end shipment visibility. Its Movement platform provides predictive ETAs, exception management, and carbon tracking. Strong presence in automotive, retail, and government supply chains.',
    website: 'https://project44.com',
    tags: ['Logistics', 'Supply Chain Visibility', 'Freight Tracking', 'Predictive ETA', 'Supply Chain Tech'],
    evidence: [
      'Series F funding: $420M at $2.7B valuation (2022); 175,000+ carriers connected globally.',
      '67% of Fortune 500 use project44 Movement for real-time multi-modal shipment tracking.',
      'U.S. Army DLA (Defense Logistics Agency) integration for Class IX spare parts tracking pilot (2024).',
    ],
    category: 'Logistics',
    ikerScore: 71,
    lat: 41.8781, lon: -87.6298, layer: 'momentum', weight: 0.71, confidence: 0.82,
  },

  'gbl-locus': {
    id: 'gbl-locus',
    name: 'Locus Robotics',
    description: 'Wilmington-based warehouse autonomous mobile robot (AMR) company providing collaborative picking robots for e-commerce and retail distribution centers. Locus OriginBot and Vector robots work alongside human pickers to increase fulfillment throughput 2–3x with no infrastructure changes. The company has 1,000+ robots deployed at customers including DHL, Whirlpool, and 3PL leaders across the U.S. and Europe.',
    website: 'https://locusrobotics.com',
    tags: ['Logistics', 'Warehouse Robots', 'AMR', 'Fulfillment Automation', 'E-Commerce Logistics'],
    evidence: [
      'Over 1,000 OriginBot robots deployed across 50+ customer sites in North America and Europe.',
      'DHL Supply Chain expanded Locus AMR deployment to 10 sites in 2023, tripling initial footprint.',
      'Series F funding: $117M (2022) — total raised $415M; robots have traveled 1B+ operational miles.',
    ],
    category: 'Logistics',
    ikerScore: 62,
    lat: 42.5584, lon: -71.4017, layer: 'funding', weight: 0.62, confidence: 0.78,
  },

  // ── Healthcare / Biotech ──────────────────────────────────────────────────

  'gbl-illumina': {
    id: 'gbl-illumina',
    name: 'Illumina',
    description: 'San Diego-based genomics company and the world\'s dominant provider of DNA sequencing instruments, reagents, and bioinformatics software. Illumina sequencers process 90%+ of the world\'s genomic data. The company\'s NovaSeq X platform enables whole-genome sequencing at under $200 per sample. Illumina technology underpins cancer diagnostics, infectious disease surveillance, and military personnel genomic screening programs.',
    website: 'https://illumina.com',
    tags: ['Healthcare', 'Genomics', 'DNA Sequencing', 'Biotech', 'Precision Medicine', 'Diagnostics', 'Bioinformatics'],
    evidence: [
      'FY2023 revenue: $4.5B — 90%+ global market share in short-read DNA sequencing.',
      'NovaSeq X platform: $200 whole-genome sequence price; deployed at 1,500+ clinical and research institutions.',
      'DoD genomic screening program uses Illumina sequencing for active-duty personnel pharmacogenomics study.',
    ],
    category: 'Healthcare',
    ikerScore: 87,
    lat: 32.8801, lon: -117.2340, layer: 'vendors', weight: 0.87, confidence: 0.89,
  },

  'gbl-intuitive': {
    id: 'gbl-intuitive',
    name: 'Intuitive Surgical',
    description: 'Sunnyvale-based medical device company and inventor of robotic-assisted surgery, with the da Vinci surgical system in clinical use at 9,000+ hospitals globally. Over 10 million da Vinci procedures have been performed. The company\'s Ion bronchoscopy system is expanding robotic surgery into pulmonary diagnostics. DoD Medical Command hospitals use da Vinci systems at Brooke Army Medical Center and other major military treatment facilities.',
    website: 'https://intuitive.com',
    tags: ['Healthcare', 'Surgical Robotics', 'Medical Devices', 'Da Vinci', 'Minimally Invasive Surgery', 'Defense Health'],
    evidence: [
      'FY2024 revenue: $8.35B, 17% YoY growth — 9,000+ da Vinci systems installed globally, 10M+ procedures performed.',
      'Brooke Army Medical Center (BAMC) operates da Vinci Xi for trauma-related reconstructive surgery.',
      'Ion bronchoscopy system: 1,200+ placements in 2024, 30% YoY growth in lung biopsy procedures.',
    ],
    category: 'Healthcare',
    ikerScore: 91,
    lat: 37.3688, lon: -122.0363, layer: 'vendors', weight: 0.91, confidence: 0.91,
  },

  'gbl-tempus': {
    id: 'gbl-tempus',
    name: 'Tempus AI',
    description: 'Chicago-based AI-powered precision medicine company operating the largest library of multimodal clinical and molecular data in the world. Tempus uses AI to analyze genomic, pathology, radiology, and clinical data to help physicians personalize cancer treatment decisions. The company went public on Nasdaq in June 2024 at a $6.1B valuation. Tempus is expanding into infectious disease and cardiology AI.',
    website: 'https://tempus.com',
    tags: ['Healthcare', 'AI/ML', 'Precision Medicine', 'Genomics', 'Oncology', 'Clinical AI', 'Medical Data'],
    evidence: [
      'IPO on Nasdaq (TEMPUS): June 2024 at $37/share, $6.1B valuation — raised $410M in offering.',
      'Tempus AI library: genomic + clinical data on 900,000+ de-identified patients across 18+ cancer types.',
      'AstraZeneca, Bristol-Myers Squibb, and Novartis all signed multi-year Tempus data licensing agreements.',
    ],
    category: 'Healthcare',
    ikerScore: 71,
    lat: 41.8781, lon: -87.6298, layer: 'momentum', weight: 0.71, confidence: 0.82,
  },

  'gbl-dexcom': {
    id: 'gbl-dexcom',
    name: 'Dexcom',
    description: 'San Diego-based medical technology company and global leader in continuous glucose monitoring (CGM) systems for diabetes management. The Dexcom G7 and Stelo wearable sensors transmit real-time blood glucose data to smartphones and clinical dashboards. DoD and VA health systems deploy Dexcom CGM for the 100,000+ active-duty and veteran diabetes patients. Dexcom is expanding into performance monitoring for military and athlete populations.',
    website: 'https://dexcom.com',
    tags: ['Healthcare', 'Medical Devices', 'Wearables', 'Diabetes Tech', 'Remote Monitoring', 'Defense Health'],
    evidence: [
      'FY2024 revenue: $4.03B, 11% YoY growth; Dexcom G7 adopted by 70+ countries\' national health systems.',
      'VA National CGM Program: Dexcom G6/G7 primary supply for 80,000+ veteran diabetic patients.',
      'Stelo OTC CGM launched 2024 — first FDA-cleared over-the-counter CGM, 500,000 units sold in first 90 days.',
    ],
    category: 'Healthcare',
    ikerScore: 82,
    lat: 32.8801, lon: -117.2340, layer: 'vendors', weight: 0.82, confidence: 0.87,
  },

  // ── Space / Aerospace ─────────────────────────────────────────────────────

  'gbl-spacex': {
    id: 'gbl-spacex',
    name: 'SpaceX',
    description: 'Hawthorne-based aerospace company operating the world\'s most capable and cost-efficient launch system (Falcon 9, Falcon Heavy, Starship), plus the world\'s largest satellite internet constellation (Starlink). SpaceX is the DoD\'s dominant commercial launch provider, holds NRO and USSF contracts, and Starlink has been combat-proven in Ukraine. Starlink terminals are fielded with U.S. Army units for expeditionary broadband.',
    website: 'https://spacex.com',
    tags: ['Space', 'Aerospace', 'Launch Services', 'Starlink', 'Satellite Internet', 'Defense Space', 'USSF'],
    evidence: [
      'NSSL Phase 3 DoD launch contract: $733M covering up to 15 national security launches (2024–2027).',
      'Starlink: 6,000+ satellites in LEO, 3M+ active subscribers, fielded by Ukraine Armed Forces (15,000+ terminals).',
      'Falcon 9: 300+ consecutive successful launches as of 2024 — 95% of U.S. commercial orbital market share.',
    ],
    category: 'Aerospace',
    ikerScore: 95,
    lat: 33.9206, lon: -118.3281, layer: 'vendors', weight: 0.95, confidence: 0.93,
  },

  'gbl-rocketlab': {
    id: 'gbl-rocketlab',
    name: 'Rocket Lab',
    description: 'Long Beach-based launch and space systems company operating the Electron small launch vehicle and developing the Neutron medium-lift rocket. Rocket Lab is the second-highest-frequency orbital launch provider globally after SpaceX, with 50+ Electron missions completed. The company also manufactures spacecraft components (solar panels, separation systems) used on national security satellites.',
    website: 'https://rocketlabusa.com',
    tags: ['Space', 'Aerospace', 'Small Satellite Launch', 'Electron', 'Defense Space', 'USSF', 'Space Systems'],
    evidence: [
      'USSF NSSL Lane 1 certification: Rocket Lab Electron approved for DoD small satellite launches (2023).',
      '50+ Electron orbital launches completed; 170+ satellites deployed across commercial and government customers.',
      'Neutron medium-lift rocket development contract: $14.5M AFRL agreement for reusable launch vehicle development.',
    ],
    category: 'Aerospace',
    ikerScore: 72,
    lat: 33.7701, lon: -118.1937, layer: 'momentum', weight: 0.72, confidence: 0.83,
  },

  'gbl-planet': {
    id: 'gbl-planet',
    name: 'Planet Labs',
    description: 'San Francisco-based Earth observation company operating the world\'s largest fleet of optical imaging satellites — 200+ Dove and SkySat satellites providing daily global coverage at 3–72 cm resolution. Planet\'s PlanetScope and SkySat imagery is used by NGA, DoD, USDA, and commercial customers for daily change detection, agricultural monitoring, and infrastructure surveillance. The company went public via SPAC in 2021.',
    website: 'https://planet.com',
    tags: ['Space', 'Earth Observation', 'Satellite Imagery', 'Defense Intelligence', 'Geospatial', 'NGA', 'Remote Sensing'],
    evidence: [
      'NGA commercial satellite imagery contract: Planet Labs primary provider for daily global change detection.',
      '200+ satellites in orbit delivering 7M+ km² of daily Earth imagery to 800+ enterprise and government customers.',
      'Planet Fusion Monitoring AI product launched 2024 — daily 3m resolution imagery analysis for agriculture and defense.',
    ],
    category: 'Aerospace',
    ikerScore: 67,
    lat: 37.7749, lon: -122.4194, layer: 'momentum', weight: 0.67, confidence: 0.80,
  },

  'gbl-maxar': {
    id: 'gbl-maxar',
    name: 'Maxar Intelligence',
    description: 'Westminster-based Earth intelligence and space technology company producing the highest-resolution commercial satellite imagery (30 cm) and operating WorldView-3 and WorldView Legion satellite constellations. Maxar is the NGA\'s primary commercial imagery vendor under the EnhancedView Follow-On (EVFO) contract. Maxar Space Solutions manufactures satellite bus components for government and commercial customers including GPS III satellites.',
    website: 'https://maxar.com',
    tags: ['Space', 'Earth Observation', 'High-Resolution Imagery', 'Defense Intelligence', 'Geospatial', 'NGA', 'GPS'],
    evidence: [
      'NGA EnhancedView Follow-On (EVFO) contract: Maxar primary imagery vendor, $300M/year ceiling.',
      'WorldView Legion: 6-satellite constellation providing 30 cm imagery of every point on Earth 15x/day by 2025.',
      'GPS III satellite bus: Maxar manufactured bus for Lockheed Martin GPS III SV06–SV10 satellites.',
    ],
    category: 'Aerospace',
    ikerScore: 80,
    lat: 39.8917, lon: -105.0897, layer: 'vendors', weight: 0.80, confidence: 0.87,
  },

  // ── Data / AI Platforms ───────────────────────────────────────────────────

  'gbl-databricks': {
    id: 'gbl-databricks',
    name: 'Databricks',
    description: 'San Francisco-based data and AI company that invented the Data Lakehouse architecture and develops the open-source Apache Spark ecosystem. Databricks Unity Catalog and Mosaic AI platform power data engineering, ML training, and LLM fine-tuning at Fortune 500 companies and government agencies. The company acquired MosaicML for $1.3B to accelerate enterprise LLM training capabilities.',
    website: 'https://databricks.com',
    tags: ['AI/ML', 'Data Engineering', 'Data Lakehouse', 'Machine Learning', 'LLM Training', 'Enterprise AI', 'Apache Spark'],
    evidence: [
      'Series I funding: $500M at $43B valuation (September 2023) — pre-IPO largest AI infrastructure company.',
      'Databricks acquired MosaicML for $1.3B (June 2023) — enterprise LLM training and DBRX open-source model.',
      'U.S. Air Force BESPIN program uses Databricks Lakehouse for operational AI/ML data pipelines (2023).',
    ],
    category: 'AI/ML',
    ikerScore: 82,
    lat: 37.7749, lon: -122.4194, layer: 'vendors', weight: 0.82, confidence: 0.86,
  },

  'gbl-snowflake': {
    id: 'gbl-snowflake',
    name: 'Snowflake',
    description: 'Cloud data platform company providing a multi-cloud data warehouse, data lake, and data sharing architecture. Snowflake Cortex AI integrates LLM capabilities natively into the data platform, enabling SQL-based AI workflows without data movement. The company holds FedRAMP High authorization and serves 50+ U.S. federal agencies, including active use in DHS, DoD, and intelligence community data programs.',
    website: 'https://snowflake.com',
    tags: ['AI/ML', 'Data Platform', 'Cloud Data', 'Data Warehouse', 'Federal Data', 'FedRAMP', 'Data Sharing'],
    evidence: [
      'FY2025 revenue: $3.26B, 29% YoY growth; 10,600+ customers including 691 Forbes Global 2000 companies.',
      'FedRAMP High Authorization achieved 2022 — 50+ federal agency customers including DHS and DoD components.',
      'Snowflake Cortex AI: LLM-powered SQL analytics GA 2024 — deployed in IC data sharing environments.',
    ],
    category: 'AI/ML',
    ikerScore: 84,
    lat: 37.3688, lon: -119.4179, layer: 'vendors', weight: 0.84, confidence: 0.87,
  },

  'gbl-c3ai': {
    id: 'gbl-c3ai',
    name: 'C3.ai',
    description: 'Redwood City-based enterprise AI application company providing pre-built AI solutions for predictive maintenance, fraud detection, supply chain optimization, and government intelligence. C3.ai has a strong federal presence, with contracts at the DoD, Air Force, Navy, and Army for predictive maintenance of aircraft, ships, and combat vehicles. The company\' C3 Generative AI product layer integrates with multiple foundation models.',
    website: 'https://c3.ai',
    tags: ['AI/ML', 'Enterprise AI', 'Predictive Maintenance', 'Defense AI', 'Supply Chain AI', 'Government AI'],
    evidence: [
      'DoD JAIC / CDAO enterprise AI license: C3.ai deployed for predictive maintenance across Air Force and Navy fleets.',
      'C3 AI predictive maintenance at Baker Hughes: $150M contract for oilfield equipment failure prediction.',
      'FY2025 revenue: $310M, 20% YoY growth; federal sector now represents 35% of total ARR.',
    ],
    category: 'AI/ML',
    ikerScore: 65,
    lat: 37.4852, lon: -122.2364, layer: 'momentum', weight: 0.65, confidence: 0.80,
  },

  'gbl-scale': {
    id: 'gbl-scale',
    name: 'Scale AI',
    description: 'San Francisco-based data labeling, RLHF, and AI readiness platform company serving AI labs, autonomous vehicle companies, and the U.S. federal government. Scale AI\'s Donovan platform is purpose-built for national security AI applications and is under active evaluation at multiple DoD and IC programs. The company recently received a $1.1B Series F and signed a DoD prime contract for AI training data.',
    website: 'https://scale.com',
    tags: ['AI/ML', 'Data Labeling', 'RLHF', 'Defense AI', 'Government AI', 'AI Training Data', 'National Security AI'],
    evidence: [
      'Series F: $1B at $13.8B valuation (May 2024) — largest AI data infrastructure raise of 2024.',
      'DoD AI training data prime contract: Scale AI Donovan platform deployed at multiple combatant commands.',
      'Meta, OpenAI, Microsoft, and Anthropic all use Scale AI for RLHF and model evaluation pipelines.',
    ],
    category: 'AI/ML',
    ikerScore: 76,
    lat: 37.7749, lon: -122.4194, layer: 'momentum', weight: 0.76, confidence: 0.83,
  },

};

export default GLOBAL_VENDORS;
