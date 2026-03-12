// src/lib/intelligence/nxt-entities.ts
// NXT LINK entity registry — El Paso defense/border/supply-chain tech ecosystem.
// Used by the signal engine to match news headlines to known vendors,
// detect contract awards, and correlate market signals.

import { NXT_ENTITIES_ELPASO } from './nxt-entities-elpaso';

export type EntityCategory =
  | 'Defense Tech'
  | 'Border Tech'
  | 'Logistics'
  | 'Water Tech'
  | 'Energy Tech'
  | 'Health Tech'
  | 'AI / R&D'
  | 'University'
  | 'Robotics & Automation'
  | 'Warehouse Automation'
  | 'Manufacturing Tech'
  | 'Industrial AI'
  | 'Logistics Platform'
  | 'Supply Chain Software'
  // ── Global categories ────────────────────────────────────────────────────────
  | 'Computer Vision'
  | 'Industrial Automation'
  | 'Global Defense'
  | 'Energy Intelligence'
  | 'Global Cybersecurity'
  | 'Global Robotics'
  | 'Global AI'
  | 'Semiconductor'
  | 'Drone & Autonomy'
  | 'Global Supply Chain'
  | 'Enterprise';

export type NxtEntity = {
  id: string;                   // Matches entity_id in el-paso-vendors.ts
  name: string;
  category: EntityCategory;
  aliases: string[];            // All lowercased name variants for matching
  keywords: string[];           // Topic keywords linked to this entity
  naicsCodes?: string[];        // For SAM.gov contract matching
  ikerScore?: number;           // Baseline IKER score (0–100)
};

// ─── Global Technology Entities ───────────────────────────────────────────────
// These are the world's top technology companies across key sectors.
// Used by the signal engine to detect global tech signals in news feeds.

export const GLOBAL_TECH_ENTITIES: NxtEntity[] = [

  // ── Manufacturing & Industrial Automation ─────────────────────────────────
  {
    id: 'siemens',
    name: 'Siemens',
    category: 'Industrial Automation',
    aliases: ['siemens', 'siemens ag', 'siemens digital industries', 'siemens healthineers', 'siemens energy', 'siemens plm'],
    keywords: ['industrial automation', 'plc', 'scada', 'digital twin', 'mindsphere', 'factory automation', 'process control', 'motion control', 'building automation'],
    ikerScore: 95,
  },
  {
    id: 'abb',
    name: 'ABB',
    category: 'Industrial Automation',
    aliases: ['abb', 'abb ltd', 'abb robotics', 'abb automation', 'abb electrification'],
    keywords: ['industrial robot', 'collaborative robot', 'power grid', 'motor drive', 'process automation', 'electrification', 'robotics automation'],
    ikerScore: 93,
  },
  {
    id: 'rockwell-automation',
    name: 'Rockwell Automation',
    category: 'Industrial Automation',
    aliases: ['rockwell automation', 'rockwell', 'allen bradley', 'factorytalk', 'logix'],
    keywords: ['plc control', 'industrial iot', 'smart manufacturing', 'connected enterprise', 'discrete manufacturing', 'process manufacturing'],
    ikerScore: 91,
  },
  {
    id: 'honeywell-industrial',
    name: 'Honeywell',
    category: 'Industrial Automation',
    aliases: ['honeywell', 'honeywell industrial', 'honeywell process solutions', 'honeywell connected plant'],
    keywords: ['process control', 'dcs', 'industrial cybersecurity', 'warehouse automation', 'building automation', 'iot platform'],
    ikerScore: 90,
  },
  {
    id: 'emerson-automation',
    name: 'Emerson',
    category: 'Industrial Automation',
    aliases: ['emerson', 'emerson electric', 'emerson automation solutions', 'plantweb', 'deltav'],
    keywords: ['process automation', 'control valve', 'measurement instrumentation', 'asset management', 'industrial ai'],
    ikerScore: 88,
  },
  {
    id: 'mitsubishi-electric',
    name: 'Mitsubishi Electric',
    category: 'Industrial Automation',
    aliases: ['mitsubishi electric', 'mitsubishi', 'melsec', 'melservo'],
    keywords: ['factory automation', 'plc', 'servo motor', 'robot controller', 'cnc machine', 'hvac controls'],
    ikerScore: 87,
  },
  {
    id: 'fanuc',
    name: 'Fanuc',
    category: 'Global Robotics',
    aliases: ['fanuc', 'fanuc corporation', 'fanuc robotics', 'fanuc robot', 'fanuc cnc'],
    keywords: ['cnc machine', 'industrial robot', 'robot arm', 'machine tool', 'cobot', 'cobalt robot', 'collaborative robot fanuc'],
    ikerScore: 92,
  },
  {
    id: 'yokogawa',
    name: 'Yokogawa',
    category: 'Industrial Automation',
    aliases: ['yokogawa', 'yokogawa electric', 'yokogawa dcs', 'centum'],
    keywords: ['distributed control system', 'process safety', 'plant operations', 'industrial iot', 'asset lifecycle management'],
    ikerScore: 84,
  },

  // ── Global Robotics ───────────────────────────────────────────────────────
  {
    id: 'boston-dynamics',
    name: 'Boston Dynamics',
    category: 'Global Robotics',
    aliases: ['boston dynamics', 'boston dynamics spot', 'spot robot', 'atlas robot', 'stretch robot'],
    keywords: ['spot robot', 'quadruped robot', 'mobile robot', 'inspection robot', 'warehouse robot', 'atlas humanoid', 'legged robot', 'robot dog'],
    ikerScore: 96,
  },
  {
    id: 'kuka',
    name: 'KUKA',
    category: 'Global Robotics',
    aliases: ['kuka', 'kuka robotics', 'kuka ag', 'kuka robot', 'kuka cobot'],
    keywords: ['industrial robot arm', 'welding robot', 'automotive robot', 'collaborative robot', 'robot programming', 'smart factory robot'],
    ikerScore: 91,
  },
  {
    id: 'universal-robots',
    name: 'Universal Robots',
    category: 'Global Robotics',
    aliases: ['universal robots', 'ur robots', 'cobot', 'ur3', 'ur5', 'ur10', 'ur16', 'collaborative robot universal'],
    keywords: ['collaborative robot', 'cobot deployment', 'flexible automation', 'plug and produce', 'light manufacturing robot'],
    ikerScore: 90,
  },
  {
    id: 'yaskawa',
    name: 'Yaskawa',
    category: 'Global Robotics',
    aliases: ['yaskawa', 'yaskawa electric', 'motoman', 'yaskawa motoman', 'yaskawa robot'],
    keywords: ['industrial robot', 'servo drive', 'motoman robot', 'welding automation', 'material handling robot'],
    ikerScore: 88,
  },
  {
    id: 'omron-robotics',
    name: 'Omron',
    category: 'Global Robotics',
    aliases: ['omron', 'omron robotics', 'omron automation', 'omron mobile robot', 'omron ld'],
    keywords: ['autonomous mobile robot', 'amr', 'collaborative robot', 'mobile manipulator', 'flexible manufacturing'],
    ikerScore: 85,
  },

  // ── Computer Vision & Inspection ─────────────────────────────────────────
  {
    id: 'keyence',
    name: 'Keyence',
    category: 'Computer Vision',
    aliases: ['keyence', 'keyence corporation', 'keyence cv-x', 'keyence vision', 'keyence sensor'],
    keywords: ['machine vision', 'image processing', 'quality inspection', 'barcode reader', 'laser sensor', 'measurement sensor', 'industrial camera', 'defect detection'],
    ikerScore: 94,
  },
  {
    id: 'cognex',
    name: 'Cognex',
    category: 'Computer Vision',
    aliases: ['cognex', 'cognex corporation', 'cognex in-sight', 'cognex dataman'],
    keywords: ['machine vision system', 'barcode verification', 'vision guided robot', 'surface inspection', 'deep learning vision', 'optical character recognition'],
    ikerScore: 91,
  },
  {
    id: 'zebra-technologies',
    name: 'Zebra Technologies',
    category: 'Computer Vision',
    aliases: ['zebra technologies', 'zebra tech', 'zebra', 'zebra scanner', 'zebra rfid'],
    keywords: ['barcode scanner', 'rfid reader', 'mobile computer', 'warehouse visibility', 'asset tracking', 'rugged device'],
    ikerScore: 87,
  },
  {
    id: 'teledyne-flir',
    name: 'Teledyne FLIR',
    category: 'Computer Vision',
    aliases: ['flir', 'teledyne flir', 'flir systems', 'flir thermal', 'flir camera'],
    keywords: ['thermal camera', 'infrared imaging', 'predictive maintenance thermal', 'border surveillance thermal', 'industrial thermography', 'drone thermal'],
    ikerScore: 89,
  },
  {
    id: 'landing-ai',
    name: 'Landing AI',
    category: 'Computer Vision',
    aliases: ['landing ai', 'landingai', 'landing lens'],
    keywords: ['ai visual inspection', 'defect detection ai', 'computer vision platform', 'manufacturing ai', 'andrew ng ai'],
    ikerScore: 85,
  },

  // ── Industrial AI ─────────────────────────────────────────────────────────
  {
    id: 'c3-ai',
    name: 'C3.ai',
    category: 'Industrial AI',
    aliases: ['c3.ai', 'c3 ai', 'c3 dot ai', 'c3 enterprise ai'],
    keywords: ['enterprise ai', 'predictive maintenance', 'supply chain ai', 'fraud detection ai', 'energy management ai', 'manufacturing ai'],
    ikerScore: 87,
  },
  {
    id: 'sight-machine',
    name: 'Sight Machine',
    category: 'Industrial AI',
    aliases: ['sight machine', 'sightmachine'],
    keywords: ['manufacturing analytics', 'oee improvement', 'process optimization ai', 'factory intelligence', 'production ai'],
    ikerScore: 80,
  },
  {
    id: 'sparkcognition',
    name: 'SparkCognition',
    category: 'Industrial AI',
    aliases: ['sparkcognition', 'spark cognition'],
    keywords: ['industrial ai', 'predictive analytics', 'equipment failure prediction', 'generative ai industrial', 'oil gas ai'],
    ikerScore: 82,
  },
  {
    id: 'aspentech',
    name: 'AspenTech',
    category: 'Industrial AI',
    aliases: ['aspentech', 'aspen technology', 'aspen hysys', 'aspen plus'],
    keywords: ['process optimization', 'energy optimization', 'asset performance', 'refinery optimization', 'chemical process ai'],
    ikerScore: 84,
  },
  {
    id: 'augury',
    name: 'Augury',
    category: 'Industrial AI',
    aliases: ['augury', 'augury ai', 'augury machine health'],
    keywords: ['machine health', 'vibration analysis', 'predictive maintenance iot', 'equipment monitoring', 'manufacturing reliability'],
    ikerScore: 81,
  },
  {
    id: 'nvidia-industrial',
    name: 'NVIDIA',
    category: 'Global AI',
    aliases: ['nvidia', 'nvidia corporation', 'nvidia jetson', 'nvidia omniverse', 'nvidia isaac', 'nvidia dgx'],
    keywords: ['gpu computing', 'ai chips', 'edge ai', 'digital twin omniverse', 'isaac robot', 'jetson edge', 'ai inference', 'cuda'],
    ikerScore: 98,
  },

  // ── Global Cybersecurity ──────────────────────────────────────────────────
  {
    id: 'crowdstrike',
    name: 'CrowdStrike',
    category: 'Global Cybersecurity',
    aliases: ['crowdstrike', 'crowdstrike falcon', 'crowdstrike holdings'],
    keywords: ['endpoint detection', 'threat intelligence', 'incident response', 'zero trust', 'threat hunting', 'xdr', 'edr'],
    ikerScore: 96,
  },
  {
    id: 'palo-alto-networks',
    name: 'Palo Alto Networks',
    category: 'Global Cybersecurity',
    aliases: ['palo alto networks', 'palo alto', 'panos', 'prisma access', 'cortex xdr'],
    keywords: ['next gen firewall', 'zero trust network', 'cloud security', 'soc automation', 'ot security', 'industrial firewall'],
    ikerScore: 95,
  },
  {
    id: 'dragos',
    name: 'Dragos',
    category: 'Global Cybersecurity',
    aliases: ['dragos', 'dragos inc', 'dragos platform'],
    keywords: ['ics security', 'ot cybersecurity', 'industrial control system', 'critical infrastructure protection', 'scada security', 'ot threat detection'],
    ikerScore: 89,
  },
  {
    id: 'claroty',
    name: 'Claroty',
    category: 'Global Cybersecurity',
    aliases: ['claroty', 'claroty platform'],
    keywords: ['ot security', 'iot security', 'asset visibility ot', 'industrial network security', 'cyber physical systems'],
    ikerScore: 86,
  },
  {
    id: 'nozomi-networks',
    name: 'Nozomi Networks',
    category: 'Global Cybersecurity',
    aliases: ['nozomi', 'nozomi networks', 'nozomi guardian'],
    keywords: ['ot visibility', 'operational technology monitoring', 'industrial network anomaly', 'scada monitoring ai'],
    ikerScore: 84,
  },
  {
    id: 'fortinet',
    name: 'Fortinet',
    category: 'Global Cybersecurity',
    aliases: ['fortinet', 'fortigate', 'fortios', 'fortisiem', 'fortisoc'],
    keywords: ['security fabric', 'ot firewall', 'sd-wan security', 'network security', 'industrial firewall'],
    ikerScore: 91,
  },
  {
    id: 'check-point',
    name: 'Check Point',
    category: 'Global Cybersecurity',
    aliases: ['check point', 'checkpoint software', 'check point software technologies', 'harmony'],
    keywords: ['threat prevention', 'cloud security', 'mobile security', 'iot security', 'ransomware protection'],
    ikerScore: 89,
  },
  {
    id: 'wiz-security',
    name: 'Wiz',
    category: 'Global Cybersecurity',
    aliases: ['wiz', 'wiz cloud security', 'wiz io'],
    keywords: ['cloud security posture', 'cnapp', 'cloud vulnerability', 'cloud risk', 'agentless security'],
    ikerScore: 88,
  },

  // ── Warehouse Automation ──────────────────────────────────────────────────
  {
    id: 'autostore',
    name: 'AutoStore',
    category: 'Warehouse Automation',
    aliases: ['autostore', 'auto store', 'autostore system'],
    keywords: ['cube storage', 'goods to person', 'warehouse robot', 'bin picking robot', 'fulfillment automation'],
    ikerScore: 90,
  },
  {
    id: 'locus-robotics',
    name: 'Locus Robotics',
    category: 'Warehouse Automation',
    aliases: ['locus robotics', 'locus', 'locusbot'],
    keywords: ['warehouse amr', 'autonomous mobile robot', 'order picking', 'fulfillment robot', 'warehouse efficiency'],
    ikerScore: 84,
  },
  {
    id: 'greyorange',
    name: 'GreyOrange',
    category: 'Warehouse Automation',
    aliases: ['greyorange', 'grey orange', 'greyorange ranger', 'ranger bot'],
    keywords: ['fulfillment robot', 'amr sorting', 'ai fulfillment', 'warehouse intelligence', 'omnichannel fulfillment'],
    ikerScore: 83,
  },
  {
    id: 'geek-plus',
    name: 'Geek+',
    category: 'Warehouse Automation',
    aliases: ['geek+', 'geek plus', 'geekplus'],
    keywords: ['amr warehouse china', 'goods to person robot', 'sorting robot', 'smart logistics'],
    ikerScore: 82,
  },
  {
    id: 'berkshire-grey',
    name: 'Berkshire Grey',
    category: 'Warehouse Automation',
    aliases: ['berkshire grey', 'berkshire grey robot', 'bg robot'],
    keywords: ['ai robotic picking', 'parcel processing robot', 'fulfillment automation', 'goods to person ai'],
    ikerScore: 80,
  },

  // ── Supply Chain Intelligence ─────────────────────────────────────────────
  {
    id: 'blue-yonder',
    name: 'Blue Yonder',
    category: 'Global Supply Chain',
    aliases: ['blue yonder', 'blueyonder', 'jda software', 'blue yonder scm'],
    keywords: ['supply chain planning', 'demand planning', 'warehouse management', 'transportation management', 'supply chain ai'],
    ikerScore: 88,
  },
  {
    id: 'o9-solutions',
    name: 'o9 Solutions',
    category: 'Global Supply Chain',
    aliases: ['o9 solutions', 'o9', 'o9 supply chain'],
    keywords: ['integrated business planning', 'supply chain digital twin', 'demand sensing', 'supply chain platform'],
    ikerScore: 83,
  },
  {
    id: 'kinaxis',
    name: 'Kinaxis',
    category: 'Global Supply Chain',
    aliases: ['kinaxis', 'kinaxis rapidresponse', 'rapid response supply chain'],
    keywords: ['concurrent planning', 'supply chain resilience', 'supply chain visibility', 'scenario planning supply chain'],
    ikerScore: 82,
  },
  {
    id: 'fourkites',
    name: 'FourKites',
    category: 'Global Supply Chain',
    aliases: ['fourkites', 'four kites', 'fourkites platform'],
    keywords: ['real time freight visibility', 'supply chain visibility', 'predictive eta', 'last mile tracking'],
    ikerScore: 80,
  },
  {
    id: 'project44',
    name: 'project44',
    category: 'Global Supply Chain',
    aliases: ['project44', 'project 44', 'p44 supply chain'],
    keywords: ['supply chain visibility platform', 'ocean freight tracking', 'freight analytics', 'multimodal visibility'],
    ikerScore: 79,
  },
  {
    id: 'flexport',
    name: 'Flexport',
    category: 'Global Supply Chain',
    aliases: ['flexport', 'flexport logistics'],
    keywords: ['digital freight forwarder', 'customs clearance', 'ocean freight', 'air freight', 'trade intelligence'],
    ikerScore: 81,
  },

  // ── Global Defense Tech ───────────────────────────────────────────────────
  {
    id: 'anduril',
    name: 'Anduril',
    category: 'Global Defense',
    aliases: ['anduril', 'anduril industries', 'lattice ai', 'anduril ghost'],
    keywords: ['defense ai', 'autonomous drone', 'border surveillance ai', 'battlefield ai', 'ghost drone', 'sentry tower', 'lattice platform'],
    ikerScore: 93,
  },
  {
    id: 'shield-ai',
    name: 'Shield AI',
    category: 'Global Defense',
    aliases: ['shield ai', 'shield artificial intelligence', 'hivemind ai'],
    keywords: ['autonomous fighter pilot', 'drone swarm', 'military ai', 'unmanned aerial vehicle', 'hivemind autopilot'],
    ikerScore: 87,
  },
  {
    id: 'palantir',
    name: 'Palantir',
    category: 'Global Defense',
    aliases: ['palantir', 'palantir technologies', 'palantir gotham', 'palantir foundry', 'palantir aip'],
    keywords: ['data intelligence platform', 'defense ai platform', 'gotham intelligence', 'foundry data', 'ai platform enterprise', 'ontology'],
    ikerScore: 95,
  },
  {
    id: 'elbit-systems',
    name: 'Elbit Systems',
    category: 'Global Defense',
    aliases: ['elbit', 'elbit systems', 'elbit systems of america'],
    keywords: ['uav', 'surveillance drone', 'c4i systems', 'border surveillance', 'night vision', 'soldier systems'],
    ikerScore: 86,
  },

  // ── Energy Intelligence ───────────────────────────────────────────────────
  {
    id: 'schneider-electric',
    name: 'Schneider Electric',
    category: 'Energy Intelligence',
    aliases: ['schneider electric', 'schneider', 'ecostruxure', 'se digital'],
    keywords: ['energy management', 'smart grid', 'microgrid', 'ecostruxure', 'electrical distribution', 'datacenter power', 'building automation'],
    ikerScore: 91,
  },
  {
    id: 'itron',
    name: 'Itron',
    category: 'Energy Intelligence',
    aliases: ['itron', 'itron inc', 'itron riva', 'itron smart grid'],
    keywords: ['smart meter', 'ami system', 'grid intelligence', 'utility analytics', 'demand response', 'grid modernization'],
    ikerScore: 83,
  },
  {
    id: 'autogrid',
    name: 'AutoGrid',
    category: 'Energy Intelligence',
    aliases: ['autogrid', 'autogrid systems', 'autogrid flex'],
    keywords: ['flex resource management', 'virtual power plant', 'demand flexibility', 'grid edge ai', 'energy storage optimization'],
    ikerScore: 78,
  },

  // ── Semiconductor & Hardware ──────────────────────────────────────────────
  {
    id: 'tsmc',
    name: 'TSMC',
    category: 'Semiconductor',
    aliases: ['tsmc', 'taiwan semiconductor', 'taiwan semiconductor manufacturing'],
    keywords: ['chip manufacturing', 'semiconductor foundry', 'advanced node', '3nm chip', '2nm chip', 'chiplet', 'advanced packaging'],
    ikerScore: 97,
  },
  {
    id: 'intel',
    name: 'Intel',
    category: 'Semiconductor',
    aliases: ['intel', 'intel corporation', 'intel foundry', 'intel gaudi'],
    keywords: ['cpu', 'edge ai chip', 'fpga', 'gaudi accelerator', 'intel foundry services', 'semiconductor manufacturing'],
    ikerScore: 93,
  },
  {
    id: 'qualcomm',
    name: 'Qualcomm',
    category: 'Semiconductor',
    aliases: ['qualcomm', 'qualcomm snapdragon', 'qualcomm ai'],
    keywords: ['edge ai chip', 'snapdragon', '5g modem', 'ai edge inference', 'iot chip', 'autonomous driving chip'],
    ikerScore: 91,
  },

  // ── Drone & Autonomy ──────────────────────────────────────────────────────
  {
    id: 'dji',
    name: 'DJI',
    category: 'Drone & Autonomy',
    aliases: ['dji', 'dji enterprise', 'dji matrice', 'dji dock'],
    keywords: ['commercial drone', 'inspection drone', 'agriculture drone', 'mapping drone', 'enterprise uav', 'drone autonomy'],
    ikerScore: 90,
  },
  {
    id: 'skydio',
    name: 'Skydio',
    category: 'Drone & Autonomy',
    aliases: ['skydio', 'skydio drone', 'skydio x10'],
    keywords: ['autonomous drone', 'ai drone', 'infrastructure inspection drone', 'defense drone', 'skydio obstacle avoidance'],
    ikerScore: 84,
  },
  {
    id: 'percepto',
    name: 'Percepto',
    category: 'Drone & Autonomy',
    aliases: ['percepto', 'percepto drone', 'percepto arc'],
    keywords: ['autonomous inspection drone', 'drone in a box', 'site monitoring drone', 'industrial autonomy'],
    ikerScore: 79,
  },
  {
    id: 'flyability',
    name: 'Flyability',
    category: 'Drone & Autonomy',
    aliases: ['flyability', 'flyability elios'],
    keywords: ['confined space drone', 'indoor drone inspection', 'tank inspection drone', 'elios drone'],
    ikerScore: 77,
  },

  // ── Global AI Leaders ─────────────────────────────────────────────────────
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'Global AI',
    aliases: ['openai', 'open ai', 'chatgpt', 'gpt-4', 'gpt4', 'gpt-4o', 'sora openai'],
    keywords: ['large language model', 'chatgpt enterprise', 'gpt api', 'ai assistant', 'generative ai', 'foundation model'],
    ikerScore: 99,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    category: 'Global AI',
    aliases: ['anthropic', 'claude ai', 'claude', 'anthropic ai', 'claude opus', 'claude sonnet'],
    keywords: ['safe ai', 'constitutional ai', 'claude model', 'enterprise ai', 'ai safety research', 'foundation model'],
    ikerScore: 97,
  },
  {
    id: 'google-deepmind',
    name: 'Google DeepMind',
    category: 'Global AI',
    aliases: ['google deepmind', 'deepmind', 'gemini', 'gemini pro', 'gemini ultra', 'google ai'],
    keywords: ['alphafold', 'gemini model', 'foundation model google', 'ai research', 'reinforcement learning', 'protein structure'],
    ikerScore: 98,
  },
  {
    id: 'hugging-face',
    name: 'Hugging Face',
    category: 'Global AI',
    aliases: ['hugging face', 'huggingface', 'hf hub'],
    keywords: ['open source ai model', 'transformer model', 'ai hub', 'llm fine tuning', 'model deployment'],
    ikerScore: 90,
  },
  {
    id: 'microsoft-ai',
    name: 'Microsoft AI',
    category: 'Global AI',
    aliases: ['microsoft copilot', 'microsoft azure ai', 'azure openai', 'copilot', 'azure ml'],
    keywords: ['copilot enterprise', 'azure ai platform', 'openai partnership', 'ai cloud', 'enterprise llm'],
    ikerScore: 97,
  },
];

// ─── Vendor Entities ─────────────────────────────────────────────────────────

export const NXT_ENTITIES: NxtEntity[] = [
  // ── Defense Tech ────────────────────────────────────────────────────────────
  {
    id: 'l3harris',
    name: 'L3Harris',
    category: 'Defense Tech',
    aliases: ['l3harris', 'l3 harris', 'harris corporation', 'l3 technologies', 'l3t'],
    keywords: ['c4isr', 'tactical radio', 'communication systems', 'electronic warfare', 'fort bliss c4isr', 'patriot', 'antennas'],
    naicsCodes: ['334511', '334220', '541330'],
    ikerScore: 88,
  },
  {
    id: 'raytheon',
    name: 'Raytheon',
    category: 'Defense Tech',
    aliases: ['raytheon', 'rtx', 'raytheon technologies', 'collins aerospace', 'pratt whitney', 'raytheon missiles'],
    keywords: ['patriot missile', 'air defense', 'missile systems', 'guided munitions', 'radar systems', 'hypersonic'],
    naicsCodes: ['336414', '334511', '541330'],
    ikerScore: 91,
  },
  {
    id: 'saic',
    name: 'SAIC',
    category: 'Defense Tech',
    aliases: ['saic', 'science applications international', 'science applications'],
    keywords: ['gcss-army', 'army modernization', 'logistics it', 'enterprise it', 'defense it', 'army erp'],
    naicsCodes: ['541512', '541519', '541330'],
    ikerScore: 84,
  },
  {
    id: 'leidos',
    name: 'Leidos',
    category: 'Defense Tech',
    aliases: ['leidos', 'leidos holdings', 'saic leidos'],
    keywords: ['defense analytics', 'health it', 'civilian it', 'airport security', 'intelligence solutions'],
    naicsCodes: ['541512', '541330', '611430'],
    ikerScore: 82,
  },
  {
    id: 'booz-allen',
    name: 'Booz Allen Hamilton',
    category: 'Defense Tech',
    aliases: ['booz allen', 'booz allen hamilton', 'bah', 'booz hamilton'],
    keywords: ['ai ml defense', 'cleared personnel', 'digital transformation', 'cyber analytics', 'mission analytics'],
    naicsCodes: ['541611', '541512', '541690'],
    ikerScore: 85,
  },
  {
    id: 'boeing',
    name: 'Boeing Defense',
    category: 'Defense Tech',
    aliases: ['boeing', 'boeing defense', 'boeing military'],
    keywords: ['apache helicopter', 'ah-64', 'chinook', 'helicopter simulator', 'rotary wing', 'unmanned systems'],
    naicsCodes: ['336411', '336413', '541330'],
    ikerScore: 79,
  },
  {
    id: 'mantech',
    name: 'ManTech',
    category: 'Defense Tech',
    aliases: ['mantech', 'man tech international'],
    keywords: ['cyber readiness', 'army cyber', 'it modernization', 'mission solutions'],
    naicsCodes: ['541512', '541519'],
    ikerScore: 76,
  },
  {
    id: 'gdit',
    name: 'GDIT',
    category: 'Defense Tech',
    aliases: ['gdit', 'general dynamics it', 'general dynamics information technology'],
    keywords: ['cloud migration', 'digital modernization', 'enterprise cloud', 'dod cloud'],
    naicsCodes: ['541512', '541519', '541330'],
    ikerScore: 80,
  },
  {
    id: 'mesaai',
    name: 'MesaAI',
    category: 'AI / R&D',
    aliases: ['mesaai', 'mesa ai', 'mesa artificial intelligence'],
    keywords: ['battlefield ai', 'edge ai', 'autonomous systems', 'computer vision defense'],
    naicsCodes: ['541715', '541512'],
    ikerScore: 71,
  },

  // ── Border Tech ─────────────────────────────────────────────────────────────
  {
    id: 'crossingiq',
    name: 'CrossingIQ',
    category: 'Border Tech',
    aliases: ['crossingiq', 'crossing iq', 'crossiq'],
    keywords: ['wait time prediction', 'port of entry ai', 'cbp ai', 'border wait', 'paso del norte'],
    naicsCodes: ['541511', '541519'],
    ikerScore: 83,
  },
  {
    id: 'tradesync',
    name: 'TradeSync Border',
    category: 'Border Tech',
    aliases: ['tradesync', 'trade sync border', 'tradesync border'],
    keywords: ['usmca certificate', 'maquiladora compliance', 'customs software', 'ace platform', 'certificate of origin'],
    naicsCodes: ['541511', '561499'],
    ikerScore: 77,
  },
  {
    id: 'cbpass',
    name: 'CBPASS Systems',
    category: 'Border Tech',
    aliases: ['cbpass', 'cb pass', 'cbpass systems'],
    keywords: ['facial recognition border', 'cbp biometric', 'gsa schedule border', 'biometric screening'],
    naicsCodes: ['334519', '541512'],
    ikerScore: 74,
  },
  {
    id: 'bordertech',
    name: 'BorderTech',
    category: 'Border Tech',
    aliases: ['bordertech', 'border tech'],
    keywords: ['rfid border', 'fast program', 'trusted traveler', 'border rfid credentialing'],
    naicsCodes: ['334519', '541512'],
    ikerScore: 70,
  },
  {
    id: 'portlogic',
    name: 'PortLogic',
    category: 'Border Tech',
    aliases: ['portlogic', 'port logic'],
    keywords: ['ace integration', 'customs processing', 'commercial lane', 'port efficiency'],
    naicsCodes: ['541511', '488510'],
    ikerScore: 68,
  },

  // ── Logistics & Supply Chain ────────────────────────────────────────────────
  {
    id: 'fedex',
    name: 'FedEx',
    category: 'Logistics',
    aliases: ['fedex', 'federal express', 'fedex ground', 'fedex freight'],
    keywords: ['last mile delivery', 'freight network', 'supply chain el paso', 'cross-border freight'],
    naicsCodes: ['492110', '488510'],
    ikerScore: 75,
  },
  {
    id: 'cargonerve',
    name: 'CargoNerve',
    category: 'Logistics',
    aliases: ['cargonerve', 'cargo nerve'],
    keywords: ['cross-border eta', 'customs delay forecast', 'freight risk', 'delay prediction'],
    naicsCodes: ['541511', '488510'],
    ikerScore: 72,
  },

  // ── Water Technology ────────────────────────────────────────────────────────
  {
    id: 'elpaso-water',
    name: 'El Paso Water',
    category: 'Water Tech',
    aliases: ['el paso water', 'epwu', 'el paso water utilities', 'el paso water utility'],
    keywords: ['desalination', 'desal', 'water reuse', 'aquifer', 'water treatment', 'brackish water'],
    naicsCodes: ['221310', '237110'],
    ikerScore: 86,
  },
  {
    id: 'aridtech',
    name: 'AridTech',
    category: 'Water Tech',
    aliases: ['aridtech', 'arid tech'],
    keywords: ['atmospheric water', 'water from air', 'field water', 'sbir water', 'dod water'],
    naicsCodes: ['333318', '541715'],
    ikerScore: 78,
  },

  // ── Energy Technology ────────────────────────────────────────────────────────
  {
    id: 'elpaso-electric',
    name: 'El Paso Electric',
    category: 'Energy Tech',
    aliases: ['el paso electric', 'epe', 'el paso electric company', 'epelectric'],
    keywords: ['grid modernization', 'capex electric', 'smart grid', 'transmission upgrade', 'ercot'],
    naicsCodes: ['221122', '237130'],
    ikerScore: 81,
  },
  {
    id: 'nextera',
    name: 'NextEra Energy',
    category: 'Energy Tech',
    aliases: ['nextera', 'nextera energy', 'next era', 'fpl group'],
    keywords: ['battery storage', 'solar west texas', 'renewable energy', 'wind energy', 'ercot storage'],
    naicsCodes: ['221114', '221115'],
    ikerScore: 83,
  },
  {
    id: 'sunpower',
    name: 'SunPower',
    category: 'Energy Tech',
    aliases: ['sunpower', 'sun power', 'sunpower solar'],
    keywords: ['residential solar', 'commercial solar', 'solar installation', 'maquiladora solar', 'pv panels'],
    naicsCodes: ['221114', '238210'],
    ikerScore: 74,
  },

  // ── Health Technology ────────────────────────────────────────────────────────
  {
    id: 'umc',
    name: 'UMC El Paso',
    category: 'Health Tech',
    aliases: ['umc', 'university medical center', 'umc el paso', 'umc health system'],
    keywords: ['ehr modernization', 'hospital it', 'telemedicine', 'health informatics', 'medical center'],
    naicsCodes: ['622110', '541512'],
    ikerScore: 79,
  },

  // ── University / R&D ────────────────────────────────────────────────────────
  {
    id: 'utep',
    name: 'UTEP',
    category: 'University',
    aliases: ['utep', 'university of texas el paso', 'ut el paso', 'utep research'],
    keywords: ['nsf grant', 'research grant', 'tech transfer', 'university research', 'stem border', 'utep ai lab'],
    naicsCodes: ['611310'],
    ikerScore: 88,
  },

  // ── Additional Defense Tech ──────────────────────────────────────────────────
  {
    id: 'northrop-grumman',
    name: 'Northrop Grumman',
    category: 'Defense Tech',
    aliases: ['northrop grumman', 'northrop', 'ngc', 'northrop grumman corp'],
    keywords: ['b-21 raider', 'space systems', 'cyber defense', 'autonomous systems', 'missile defense', 'c2 systems'],
    naicsCodes: ['336411', '334511', '541330'],
    ikerScore: 90,
  },
  {
    id: 'lockheed-martin',
    name: 'Lockheed Martin',
    category: 'Defense Tech',
    aliases: ['lockheed martin', 'lockheed', 'lmt', 'lockheed martin corp'],
    keywords: ['f-35', 'thaad', 'sikorsky', 'skunk works', 'space systems', 'hypersonic weapons', 'battlefield management'],
    naicsCodes: ['336411', '336414', '334511'],
    ikerScore: 93,
  },
  {
    id: 'general-dynamics',
    name: 'General Dynamics',
    category: 'Defense Tech',
    aliases: ['general dynamics', 'gd', 'gdls', 'general dynamics land systems', 'general dynamics mission systems'],
    keywords: ['m1 abrams', 'stryker', 'land systems', 'mission systems', 'nuclear submarines', 'armored vehicles'],
    naicsCodes: ['336992', '334511', '541512'],
    ikerScore: 89,
  },
  {
    id: 'bae-systems',
    name: 'BAE Systems',
    category: 'Defense Tech',
    aliases: ['bae systems', 'bae', 'bae systems inc'],
    keywords: ['electronic systems', 'intelligence surveillance', 'electronic warfare', 'armored vehicles', 'cyber intelligence'],
    naicsCodes: ['334511', '336992', '541330'],
    ikerScore: 85,
  },
  {
    id: 'textron',
    name: 'Textron Systems',
    category: 'Defense Tech',
    aliases: ['textron', 'textron systems', 'bell textron', 'textron defense'],
    keywords: ['bell helicopter', 'v-22 osprey', 'unmanned ground vehicle', 'shadow uav', 'aerosonde'],
    naicsCodes: ['336413', '336411', '541330'],
    ikerScore: 82,
  },
  {
    id: 'caci',
    name: 'CACI International',
    category: 'Defense Tech',
    aliases: ['caci', 'caci international', 'caci inc'],
    keywords: ['intelligence solutions', 'cyber operations', 'signals intelligence', 'enterprise it defense', 'it services dod'],
    naicsCodes: ['541512', '541519', '541690'],
    ikerScore: 80,
  },
  {
    id: 'l3-oma',
    name: 'L3 OMA',
    category: 'Defense Tech',
    aliases: ['l3 oma', 'l3 aviation', 'l3 technologies oma'],
    keywords: ['aviation maintenance', 'helicopter maintenance', 'fleet support', 'rotary wing maintenance'],
    naicsCodes: ['488190', '336413'],
    ikerScore: 75,
  },
  {
    id: 'drs-technologies',
    name: 'DRS Technologies',
    category: 'Defense Tech',
    aliases: ['drs technologies', 'drs', 'leonardo drs', 'drs defense'],
    keywords: ['vetronics', 'power electronics defense', 'thermal sights', 'network systems defense'],
    naicsCodes: ['334511', '335311', '541330'],
    ikerScore: 78,
  },
  {
    id: 'cubic-defense',
    name: 'Cubic Defense',
    category: 'Defense Tech',
    aliases: ['cubic defense', 'cubic corporation', 'cubic'],
    keywords: ['live training', 'combat training centers', 'iess', 'training systems', 'force on force'],
    naicsCodes: ['611699', '334511', '541512'],
    ikerScore: 77,
  },
  {
    id: 'vectrus',
    name: 'Vectrus',
    category: 'Defense Tech',
    aliases: ['vectrus', 'v2x', 'vectrus systems'],
    keywords: ['base operations', 'facilities management military', 'infrastructure support', 'converge v2x'],
    naicsCodes: ['561210', '237990', '541330'],
    ikerScore: 74,
  },
  {
    id: 'amentum',
    name: 'Amentum',
    category: 'Defense Tech',
    aliases: ['amentum', 'aecom management services', 'amentum services'],
    keywords: ['nuclear operations', 'defense program management', 'technical services government', 'environmental remediation'],
    naicsCodes: ['541330', '541690', '562910'],
    ikerScore: 76,
  },
  {
    id: 'perspecta',
    name: 'Perspecta',
    category: 'Defense Tech',
    aliases: ['perspecta', 'dxc government', 'perspecta inc'],
    keywords: ['dod it modernization', 'cloud services government', 'intelligence community it'],
    naicsCodes: ['541512', '541519'],
    ikerScore: 73,
  },
  {
    id: 'elbit-systems',
    name: 'Elbit Systems of America',
    category: 'Defense Tech',
    aliases: ['elbit', 'elbit systems', 'elbit systems of america'],
    keywords: ['night vision', 'helmet mounted display', 'ivas competing', 'soldier systems', 'uas'],
    naicsCodes: ['334511', '334519', '541330'],
    ikerScore: 79,
  },

  // ── Robotics & Automation ────────────────────────────────────────────────────
  {
    id: 'boston-dynamics',
    name: 'Boston Dynamics',
    category: 'Robotics & Automation',
    aliases: ['boston dynamics', 'boston dynamics inc', 'spot robot'],
    keywords: ['spot robot', 'atlas humanoid', 'stretch robot', 'legged robot', 'mobile manipulation', 'autonomous inspection'],
    naicsCodes: ['333249', '541715'],
    ikerScore: 82,
  },
  {
    id: 'kuka',
    name: 'KUKA',
    category: 'Robotics & Automation',
    aliases: ['kuka', 'kuka robotics', 'kuka ag', 'kuka systems'],
    keywords: ['industrial robot arm', 'welding robot', 'collaborative robot', 'kuka kr', 'robot integration'],
    naicsCodes: ['333249', '333514'],
    ikerScore: 80,
  },
  {
    id: 'abb-robotics',
    name: 'ABB Robotics',
    category: 'Robotics & Automation',
    aliases: ['abb robotics', 'abb', 'abb inc', 'abb group robotics'],
    keywords: ['irb robot', 'cobot', 'power and automation', 'robot arm', 'yumi robot', 'motion control'],
    naicsCodes: ['333249', '335313', '541330'],
    ikerScore: 83,
  },
  {
    id: 'fanuc',
    name: 'FANUC',
    category: 'Robotics & Automation',
    aliases: ['fanuc', 'fanuc america', 'fanuc corporation', 'fanuc robotics'],
    keywords: ['cnc machine', 'robot arm manufacturing', 'servo motor', 'roboshot', 'collaborative robot fanuc'],
    naicsCodes: ['333249', '333514'],
    ikerScore: 84,
  },
  {
    id: 'yaskawa',
    name: 'Yaskawa',
    category: 'Robotics & Automation',
    aliases: ['yaskawa', 'yaskawa electric', 'yaskawa motoman', 'motoman'],
    keywords: ['motoman robot', 'servo drives', 'ac drives', 'robot welding', 'arc welding robot'],
    naicsCodes: ['333249', '335312'],
    ikerScore: 81,
  },
  {
    id: 'universal-robots',
    name: 'Universal Robots',
    category: 'Robotics & Automation',
    aliases: ['universal robots', 'ur robots', 'ur5', 'ur10', 'ur3', 'universal robots as'],
    keywords: ['cobot', 'collaborative robot', 'easy programming robot', 'small robot arm', 'ur series'],
    naicsCodes: ['333249'],
    ikerScore: 79,
  },
  {
    id: 'omron-robotics',
    name: 'Omron Robotics',
    category: 'Robotics & Automation',
    aliases: ['omron robotics', 'omron', 'omron automation', 'adept technologies'],
    keywords: ['mobile robot', 'ld series robot', 'autonomous mobile robot', 'plc automation', 'vision systems'],
    naicsCodes: ['333249', '334515'],
    ikerScore: 77,
  },
  {
    id: 'locus-robotics',
    name: 'Locus Robotics',
    category: 'Robotics & Automation',
    aliases: ['locus robotics', 'locus robot', 'locusbots'],
    keywords: ['warehouse robot', 'order picking robot', 'amr picking', 'human robot collaboration warehouse'],
    naicsCodes: ['333249', '493110'],
    ikerScore: 72,
  },
  {
    id: 'greyorange',
    name: 'GreyOrange',
    category: 'Robotics & Automation',
    aliases: ['greyorange', 'grey orange', 'greyorange inc'],
    keywords: ['ranger amr', 'fulfillment robot', 'sortation robot', 'goods to person', 'warehouse ai robot'],
    naicsCodes: ['333249', '493110'],
    ikerScore: 71,
  },
  {
    id: 'fetch-robotics',
    name: 'Fetch Robotics',
    category: 'Robotics & Automation',
    aliases: ['fetch robotics', 'fetch robot', 'fetchcore'],
    keywords: ['freight robot', 'mobile robot platform', 'amr logistics', 'robot as a service'],
    naicsCodes: ['333249', '493110'],
    ikerScore: 68,
  },
  {
    id: 'geek-plus',
    name: 'Geek+',
    category: 'Robotics & Automation',
    aliases: ['geek+', 'geek plus', 'geekplus', 'geek+ robotics'],
    keywords: ['goods to person robot', 'p series robot', 'sorting robot', 'smart logistics robot'],
    naicsCodes: ['333249', '493110'],
    ikerScore: 70,
  },
  {
    id: 'covariant',
    name: 'Covariant',
    category: 'Robotics & Automation',
    aliases: ['covariant', 'covariant ai', 'covariant robotics'],
    keywords: ['robotic picking ai', 'robotic brain', 'unstructured picking', 'depalletizing robot ai'],
    naicsCodes: ['333249', '541715'],
    ikerScore: 69,
  },
  {
    id: 'agility-robotics',
    name: 'Agility Robotics',
    category: 'Robotics & Automation',
    aliases: ['agility robotics', 'digit robot', 'agility robot'],
    keywords: ['humanoid robot', 'digit humanoid', 'bipedal robot', 'warehouse humanoid'],
    naicsCodes: ['333249', '541715'],
    ikerScore: 67,
  },
  {
    id: 'mir-robots',
    name: 'MiR (Mobile Industrial Robots)',
    category: 'Robotics & Automation',
    aliases: ['mir robots', 'mobile industrial robots', 'mir amr', 'mir250', 'mir500'],
    keywords: ['autonomous mobile robot', 'internal logistics robot', 'mir fleet', 'intralogistics amr'],
    naicsCodes: ['333249'],
    ikerScore: 74,
  },
  {
    id: 'otto-motors',
    name: 'OTTO Motors',
    category: 'Robotics & Automation',
    aliases: ['otto motors', 'otto amr', 'clearpath robotics'],
    keywords: ['industrial amr', 'otto 100', 'otto 1500', 'heavy payload amr', 'factory amr'],
    naicsCodes: ['333249'],
    ikerScore: 71,
  },
  {
    id: 'seegrid',
    name: 'Seegrid',
    category: 'Robotics & Automation',
    aliases: ['seegrid', 'seegrid corp', 'seegrid robotics'],
    keywords: ['vision guided vehicle', 'vgv', 'autonomous tugger', 'pallet transport robot'],
    naicsCodes: ['333249', '493110'],
    ikerScore: 70,
  },
  {
    id: 'vecna-robotics',
    name: 'Vecna Robotics',
    category: 'Robotics & Automation',
    aliases: ['vecna robotics', 'vecna', 'vecna technologies'],
    keywords: ['pallet jack robot', 'tugger amr', 'hospital robot', 'healthcare logistics robot'],
    naicsCodes: ['333249', '622110'],
    ikerScore: 66,
  },
  {
    id: 'mujin',
    name: 'Mujin',
    category: 'Robotics & Automation',
    aliases: ['mujin', 'mujin inc', 'mujin robot'],
    keywords: ['robot intelligence platform', 'mujin controller', 'depalletizing', 'bin picking'],
    naicsCodes: ['333249', '541715'],
    ikerScore: 68,
  },
  {
    id: 'righthand-robotics',
    name: 'RightHand Robotics',
    category: 'Robotics & Automation',
    aliases: ['righthand robotics', 'right hand robotics', 'rhr'],
    keywords: ['robotic piece picking', 'gripper robot', 'e-commerce fulfillment robot', 'rh series'],
    naicsCodes: ['333249', '493110'],
    ikerScore: 65,
  },
  {
    id: 'iam-robotics',
    name: 'IAM Robotics',
    category: 'Robotics & Automation',
    aliases: ['iam robotics', 'iam robot', 'swift robot'],
    keywords: ['swift robotic picking', 'autonomous picking robot', 'mobile manipulation'],
    naicsCodes: ['333249', '493110'],
    ikerScore: 62,
  },
  {
    id: 'brightpick',
    name: 'Brightpick',
    category: 'Robotics & Automation',
    aliases: ['brightpick', 'bright pick', 'brightpick autopicker'],
    keywords: ['autopicker robot', 'goods to robot picking', 'shuttle robot', 'cube storage picking'],
    naicsCodes: ['333249', '493110'],
    ikerScore: 61,
  },
  {
    id: 'hai-robotics',
    name: 'Hai Robotics',
    category: 'Robotics & Automation',
    aliases: ['hai robotics', 'hai robot', 'haipick'],
    keywords: ['haipick system', 'case handling robot', 'acr robot', 'high bay robot'],
    naicsCodes: ['333249', '493110'],
    ikerScore: 63,
  },
  {
    id: 'attabotics',
    name: 'Attabotics',
    category: 'Robotics & Automation',
    aliases: ['attabotics', 'attabotics inc', 'attabotics 3d fulfillment'],
    keywords: ['3d fulfillment', 'vertical robot storage', 'grid robot', 'attabotics system'],
    naicsCodes: ['333249', '493110'],
    ikerScore: 60,
  },
  {
    id: 'sarcos-robotics',
    name: 'Sarcos Robotics',
    category: 'Robotics & Automation',
    aliases: ['sarcos', 'sarcos robotics', 'sarcos guardian'],
    keywords: ['exoskeleton', 'guardian xo', 'full body exoskeleton', 'industrial exosuit', 'dexterous robot'],
    naicsCodes: ['333249', '339113'],
    ikerScore: 64,
  },
  {
    id: 'vention',
    name: 'Vention',
    category: 'Robotics & Automation',
    aliases: ['vention', 'vention machine builder', 'machinebuilder.io'],
    keywords: ['machine design platform', 'robot cell builder', 'ml robot', 'custom robot cell'],
    naicsCodes: ['333249', '541512'],
    ikerScore: 59,
  },
  {
    id: 'robust-ai',
    name: 'Robust.AI',
    category: 'Robotics & Automation',
    aliases: ['robust ai', 'robust.ai', 'carter robot'],
    keywords: ['carter warehouse robot', 'cognitive robot', 'ros robot', 'adaptive warehouse robot'],
    naicsCodes: ['333249', '541715'],
    ikerScore: 58,
  },
  {
    id: 'realtime-robotics',
    name: 'Realtime Robotics',
    category: 'Robotics & Automation',
    aliases: ['realtime robotics', 'real time robotics', 'rtr motion planning'],
    keywords: ['robot motion planning', 'collision avoidance', 'rtr processor', 'multi robot coordination'],
    naicsCodes: ['541715', '333249'],
    ikerScore: 61,
  },
  {
    id: 'kawasaki-robotics',
    name: 'Kawasaki Robotics',
    category: 'Robotics & Automation',
    aliases: ['kawasaki robotics', 'kawasaki robot', 'kawasaki rs series'],
    keywords: ['painting robot', 'welding robot kawasaki', 'heavy payload robot', 'pharma robot'],
    naicsCodes: ['333249'],
    ikerScore: 76,
  },
  {
    id: 'nachi-robotics',
    name: 'Nachi Robotics',
    category: 'Robotics & Automation',
    aliases: ['nachi robotics', 'nachi', 'nachi fujikoshi'],
    keywords: ['spot welding robot', 'arc welding robot nachi', 'painting robot nachi'],
    naicsCodes: ['333249'],
    ikerScore: 72,
  },
  {
    id: 'staubli-robotics',
    name: 'Staubli Robotics',
    category: 'Robotics & Automation',
    aliases: ['staubli', 'staubli robotics', 'st\u00e4ubli'],
    keywords: ['fast robot', 'cleanroom robot', 'medical robot', 'textiles robot', 'staubli rx'],
    naicsCodes: ['333249'],
    ikerScore: 74,
  },
  {
    id: 'denso-robotics',
    name: 'Denso Robotics',
    category: 'Robotics & Automation',
    aliases: ['denso robotics', 'denso robot', 'denso wave'],
    keywords: ['small robot arm', 'vs series robot', 'cobotta cobot', 'qr code inventor robot'],
    naicsCodes: ['333249', '336390'],
    ikerScore: 73,
  },

  // ── Warehouse & Logistics Automation ────────────────────────────────────────
  {
    id: 'dematic',
    name: 'Dematic',
    category: 'Warehouse Automation',
    aliases: ['dematic', 'dematic corp', 'dematic group'],
    keywords: ['automated conveyor', 'goods to person', 'warehouse management system', 'sortation system', 'dematic multishuttle'],
    naicsCodes: ['333922', '493110', '541512'],
    ikerScore: 83,
  },
  {
    id: 'daifuku',
    name: 'Daifuku',
    category: 'Warehouse Automation',
    aliases: ['daifuku', 'daifuku co', 'daifuku americas'],
    keywords: ['automated storage retrieval', 'asrs', 'conveyor system', 'airport baggage handling', 'cleanroom automation'],
    naicsCodes: ['333922', '488119'],
    ikerScore: 82,
  },
  {
    id: 'honeywell-intelligrated',
    name: 'Honeywell Intelligrated',
    category: 'Warehouse Automation',
    aliases: ['honeywell intelligrated', 'intelligrated', 'honeywell warehouse'],
    keywords: ['integrated conveyor', 'voice directed picking', 'warehouse execution system', 'scan tunnel'],
    naicsCodes: ['333922', '493110', '541512'],
    ikerScore: 84,
  },
  {
    id: 'ssi-schaefer',
    name: 'SSI Schaefer',
    category: 'Warehouse Automation',
    aliases: ['ssi schaefer', 'schaefer', 'ssi sch\u00e4fer', 'ssi systems'],
    keywords: ['shuttle system', 'weasel amr', 'robot system wamas', 'bin system', 'vertical lift module'],
    naicsCodes: ['333922', '332439'],
    ikerScore: 81,
  },
  {
    id: 'autostore',
    name: 'AutoStore',
    category: 'Warehouse Automation',
    aliases: ['autostore', 'auto store', 'autostore system'],
    keywords: ['cube storage robot', 'autostore grid', 'autostore robot', 'high density storage'],
    naicsCodes: ['333922', '493110'],
    ikerScore: 79,
  },
  {
    id: 'symbotic',
    name: 'Symbotic',
    category: 'Warehouse Automation',
    aliases: ['symbotic', 'symbotic inc', 'coborgt'],
    keywords: ['warehouse automation ai', 'symbotic bot', 'walmart automation', 'autonomous case handling'],
    naicsCodes: ['333249', '493110', '541715'],
    ikerScore: 78,
  },
  {
    id: 'exotec',
    name: 'Exotec',
    category: 'Warehouse Automation',
    aliases: ['exotec', 'exotec solutions', 'skypod system'],
    keywords: ['skypod robot', '3d warehouse robot', 'high speed picking', 'rack climbing robot'],
    naicsCodes: ['333249', '493110'],
    ikerScore: 73,
  },
  {
    id: 'swisslog',
    name: 'Swisslog',
    category: 'Warehouse Automation',
    aliases: ['swisslog', 'swisslog healthcare', 'swisslog automation', 'kardex remstar'],
    keywords: ['carousel automated', 'pharmacy automation', 'vertical lift module', 'asrs healthcare'],
    naicsCodes: ['333922', '622110', '541512'],
    ikerScore: 77,
  },
  {
    id: 'vanderlande',
    name: 'Vanderlande',
    category: 'Warehouse Automation',
    aliases: ['vanderlande', 'vanderlande industries'],
    keywords: ['baggage handling airport', 'parcel sorting', 'warehouse conveyor', 'hls airport', 'pharma automation'],
    naicsCodes: ['333922', '488119'],
    ikerScore: 80,
  },
  {
    id: 'beumer-group',
    name: 'BEUMER Group',
    category: 'Warehouse Automation',
    aliases: ['beumer', 'beumer group', 'crisplant'],
    keywords: ['cross belt sorter', 'baggage handling', 'bulk conveying', 'packaging system', 'loading system'],
    naicsCodes: ['333922', '488119'],
    ikerScore: 76,
  },
  {
    id: 'mecalux',
    name: 'Mecalux',
    category: 'Warehouse Automation',
    aliases: ['mecalux', 'mecalux sa', 'easy wms'],
    keywords: ['pallet rack', 'wms software', 'automated warehouse software', 'miniload', 'shuttle rack'],
    naicsCodes: ['332311', '493110', '541512'],
    ikerScore: 71,
  },
  {
    id: 'bastian-solutions',
    name: 'Bastian Solutions',
    category: 'Warehouse Automation',
    aliases: ['bastian solutions', 'bastian', 'toyota bastian'],
    keywords: ['material handling integrator', 'conveyor integration', 'warehouse software wcs', 'robotic integration'],
    naicsCodes: ['333922', '541512'],
    ikerScore: 72,
  },
  {
    id: 'fortna',
    name: 'FORTNA',
    category: 'Warehouse Automation',
    aliases: ['fortna', 'fortna inc', 'fortna group'],
    keywords: ['distribution center design', 'fulfillment automation', 'warehouse strategy consulting', 'wms selection'],
    naicsCodes: ['541614', '493110'],
    ikerScore: 74,
  },
  {
    id: 'witron',
    name: 'Witron',
    category: 'Warehouse Automation',
    aliases: ['witron', 'witron logistik', 'witron automation'],
    keywords: ['com system', 'automated grocery dc', 'retail warehouse automation', 'order management system'],
    naicsCodes: ['333922', '493110'],
    ikerScore: 75,
  },
  {
    id: 'hytrol',
    name: 'Hytrol',
    category: 'Warehouse Automation',
    aliases: ['hytrol', 'hytrol conveyor', 'hytrol conveyor co'],
    keywords: ['conveyor belt', 'zero pressure accumulation', 'incline conveyor', 'warehouse conveyor system'],
    naicsCodes: ['333922'],
    ikerScore: 68,
  },
  {
    id: 'knapp',
    name: 'Knapp',
    category: 'Warehouse Automation',
    aliases: ['knapp', 'knapp ag', 'knapp logistics'],
    keywords: ['open shuttle', 'pharmacy warehouse', 'osr shuttle', 'pick it easy', 'automated pharmacy'],
    naicsCodes: ['333922', '541512'],
    ikerScore: 77,
  },
  {
    id: 'tgw-systems',
    name: 'TGW Systems',
    category: 'Warehouse Automation',
    aliases: ['tgw systems', 'tgw logistics', 'tgw'],
    keywords: ['fulfillment center automation', 'conveyor technology', 'goods to person tgw', 'automated picking tgw'],
    naicsCodes: ['333922', '493110'],
    ikerScore: 73,
  },
  {
    id: 'kardex',
    name: 'Kardex',
    category: 'Warehouse Automation',
    aliases: ['kardex', 'kardex remstar', 'kardex ag'],
    keywords: ['vertical carousel', 'horizontal carousel', 'compact lift', 'automated storage unit'],
    naicsCodes: ['333922', '332439'],
    ikerScore: 70,
  },
  {
    id: 'murata-machinery',
    name: 'Murata Machinery',
    category: 'Warehouse Automation',
    aliases: ['murata machinery', 'muratec', 'murata asrs'],
    keywords: ['stacker crane', 'asrs system', 'semiconductor fab automation', 'automated transport system'],
    naicsCodes: ['333922', '333242'],
    ikerScore: 74,
  },
  {
    id: 'system-logistics',
    name: 'System Logistics',
    category: 'Warehouse Automation',
    aliases: ['system logistics', 'system logistics spa'],
    keywords: ['miniload system', 'unit load asrs', 'pallet handling', 'tote shuttle'],
    naicsCodes: ['333922'],
    ikerScore: 67,
  },
  {
    id: 'intelligrated',
    name: 'Intelligrated',
    category: 'Warehouse Automation',
    aliases: ['intelligrated', 'honeywell robotics'],
    keywords: ['picking robot', 'slam dunk robot', 'robotic sortation', 'depalletizer'],
    naicsCodes: ['333249', '333922'],
    ikerScore: 72,
  },

  // ── Manufacturing Technology ─────────────────────────────────────────────────
  {
    id: 'siemens-industry',
    name: 'Siemens Industry',
    category: 'Manufacturing Tech',
    aliases: ['siemens', 'siemens industry', 'siemens ag', 'siemens usa', 'siemens plm', 'siemens digital industries'],
    keywords: ['plc automation', 'simatic', 'totally integrated automation', 'scada', 'digital twin factory', 'mindsphere', 'opcenter mes'],
    naicsCodes: ['335313', '334515', '541330'],
    ikerScore: 87,
  },
  {
    id: 'rockwell-automation',
    name: 'Rockwell Automation',
    category: 'Manufacturing Tech',
    aliases: ['rockwell automation', 'rockwell', 'allen bradley', 'allen-bradley', 'factorytalk'],
    keywords: ['allen bradley plc', 'logix controller', 'factorytalk scada', 'smart manufacturing', 'mes manufacturing'],
    naicsCodes: ['335313', '334515', '541512'],
    ikerScore: 86,
  },
  {
    id: 'schneider-electric',
    name: 'Schneider Electric',
    category: 'Manufacturing Tech',
    aliases: ['schneider electric', 'schneider', 'square d', 'aveva', 'schneider electric se'],
    keywords: ['ecostruxure', 'energy management', 'switchgear', 'industrial automation', 'data center power', 'scada had'],
    naicsCodes: ['335313', '335999', '541330'],
    ikerScore: 85,
  },
  {
    id: 'emerson-electric',
    name: 'Emerson Electric',
    category: 'Manufacturing Tech',
    aliases: ['emerson electric', 'emerson', 'emerson automation', 'fisher controls', 'deltav'],
    keywords: ['deltav dcs', 'process control', 'control valve', 'measurement instrumentation', 'aspentech', 'ovation dcs'],
    naicsCodes: ['334515', '335314', '541330'],
    ikerScore: 84,
  },
  {
    id: 'keyence',
    name: 'Keyence',
    category: 'Manufacturing Tech',
    aliases: ['keyence', 'keyence corp', 'keyence corporation'],
    keywords: ['vision system', 'barcode reader', 'laser sensor', 'measurement sensor', 'inspection system'],
    naicsCodes: ['334515', '334519'],
    ikerScore: 80,
  },
  {
    id: 'festo',
    name: 'Festo',
    category: 'Manufacturing Tech',
    aliases: ['festo', 'festo ag', 'festo didactic'],
    keywords: ['pneumatic automation', 'electric actuator', 'process automation valve', 'festo handling', 'bionic robot'],
    naicsCodes: ['332912', '333249'],
    ikerScore: 78,
  },
  {
    id: 'sick-ag',
    name: 'SICK',
    category: 'Manufacturing Tech',
    aliases: ['sick', 'sick ag', 'sick sensor', 'sick inc'],
    keywords: ['safety sensor', 'lidar sensor', 'barcode scanner industrial', '2d vision', '3d vision inspection'],
    naicsCodes: ['334515', '334519'],
    ikerScore: 76,
  },
  {
    id: 'cognex',
    name: 'Cognex',
    category: 'Manufacturing Tech',
    aliases: ['cognex', 'cognex corporation', 'in-sight', 'dataman'],
    keywords: ['machine vision', 'in-sight camera', 'dataman barcode reader', 'surface inspection', 'vision job'],
    naicsCodes: ['334515', '334519'],
    ikerScore: 81,
  },
  {
    id: 'hexagon-manufacturing',
    name: 'Hexagon Manufacturing Intelligence',
    category: 'Manufacturing Tech',
    aliases: ['hexagon', 'hexagon manufacturing', 'hexagon mi', 'leica geosystems hexagon', 'creaform'],
    keywords: ['cmm measurement', 'metrology', '3d scanning', 'quality control manufacturing', 'digital reality'],
    naicsCodes: ['334519', '541380'],
    ikerScore: 79,
  },
  {
    id: 'beckhoff',
    name: 'Beckhoff Automation',
    category: 'Manufacturing Tech',
    aliases: ['beckhoff', 'beckhoff automation', 'twincat'],
    keywords: ['twincat plc', 'pc-based control', 'ethercat', 'motion control beckhoff', 'industrial pc'],
    naicsCodes: ['334515', '333249'],
    ikerScore: 74,
  },
  {
    id: 'br-automation',
    name: 'B&R Automation',
    category: 'Manufacturing Tech',
    aliases: ['b&r automation', 'b and r automation', 'br automation', 'b&r industrial'],
    keywords: ['powerlink', 'acopos drive', 'x90 controller', 'machine-centric robotics', 'openrobotics'],
    naicsCodes: ['334515', '333249'],
    ikerScore: 73,
  },
  {
    id: 'bosch-rexroth',
    name: 'Bosch Rexroth',
    category: 'Manufacturing Tech',
    aliases: ['bosch rexroth', 'rexroth', 'bosch rexroth ag'],
    keywords: ['hydraulics industrial', 'electric drives', 'linear motion', 'ctrlx automation', 'industrial hydraulics'],
    naicsCodes: ['333996', '333249'],
    ikerScore: 80,
  },
  {
    id: 'mitsubishi-electric',
    name: 'Mitsubishi Electric Automation',
    category: 'Manufacturing Tech',
    aliases: ['mitsubishi electric', 'mitsubishi automation', 'melsec', 'melfa robot'],
    keywords: ['melsec plc', 'melfa industrial robot', 'inverter drive', 'servo system', 'vision sensor'],
    naicsCodes: ['335313', '333249'],
    ikerScore: 79,
  },
  {
    id: 'omron-automation',
    name: 'Omron Industrial Automation',
    category: 'Manufacturing Tech',
    aliases: ['omron industrial', 'omron plc', 'omron sysmac'],
    keywords: ['sysmac plc', 'safety component', 'temperature controller', 'encoder industrial', 'vision inspection omron'],
    naicsCodes: ['334515', '334519'],
    ikerScore: 78,
  },
  {
    id: 'ifm-electronic',
    name: 'ifm Electronic',
    category: 'Manufacturing Tech',
    aliases: ['ifm', 'ifm electronic', 'ifm efector'],
    keywords: ['position sensor', 'io-link sensor', 'condition monitoring', 'flow sensor', 'process sensor'],
    naicsCodes: ['334515'],
    ikerScore: 70,
  },
  {
    id: 'balluff',
    name: 'Balluff',
    category: 'Manufacturing Tech',
    aliases: ['balluff', 'balluff gmbh'],
    keywords: ['inductive sensor', 'rfid industrial', 'io-link network', 'vision sensor balluff'],
    naicsCodes: ['334515'],
    ikerScore: 68,
  },
  {
    id: 'turck',
    name: 'Turck',
    category: 'Manufacturing Tech',
    aliases: ['turck', 'turck inc', 'banner engineering turck'],
    keywords: ['proximity sensor', 'fieldbus interface', 'industrial rfid', 'inductive coupler'],
    naicsCodes: ['334515'],
    ikerScore: 67,
  },
  {
    id: 'ptc-inc',
    name: 'PTC',
    category: 'Manufacturing Tech',
    aliases: ['ptc', 'ptc inc', 'creo', 'windchill', 'thingworx'],
    keywords: ['creo cad', 'windchill plm', 'thingworx iot', 'kepware', 'augmented reality manufacturing'],
    naicsCodes: ['541511', '541512'],
    ikerScore: 83,
  },
  {
    id: 'dassault-systemes',
    name: 'Dassault Systemes',
    category: 'Manufacturing Tech',
    aliases: ['dassault systemes', 'dassault', 'solidworks', '3dexperience', 'catia'],
    keywords: ['solidworks cad', 'catia design', '3dexperience platform', 'simulia simulation', 'virtual twin'],
    naicsCodes: ['541511', '541715'],
    ikerScore: 84,
  },
  {
    id: 'ansys',
    name: 'Ansys',
    category: 'Manufacturing Tech',
    aliases: ['ansys', 'ansys inc', 'fluent simulation'],
    keywords: ['finite element analysis', 'cfd simulation', 'digital twin simulation', 'structural simulation'],
    naicsCodes: ['541511', '541715'],
    ikerScore: 80,
  },

  // ── Industrial AI ────────────────────────────────────────────────────────────
  {
    id: 'palantir',
    name: 'Palantir Technologies',
    category: 'Industrial AI',
    aliases: ['palantir', 'palantir technologies', 'foundry', 'gotham palantir', 'aip palantir'],
    keywords: ['foundry platform', 'gotham intelligence', 'aip ai platform', 'data integration', 'defense analytics palantir', 'ai decision making'],
    naicsCodes: ['541511', '541512', '541715'],
    ikerScore: 89,
  },
  {
    id: 'c3-ai',
    name: 'C3.ai',
    category: 'Industrial AI',
    aliases: ['c3 ai', 'c3.ai', 'c3 inc', 'c3 enterprise ai'],
    keywords: ['enterprise ai application', 'predictive maintenance c3', 'ai crm', 'ai supply chain', 'c3 aiot'],
    naicsCodes: ['541511', '541715'],
    ikerScore: 77,
  },
  {
    id: 'sparkcognition',
    name: 'SparkCognition',
    category: 'Industrial AI',
    aliases: ['sparkcognition', 'spark cognition', 'sparkcognition inc'],
    keywords: ['industrial ai', 'predictive maintenance ai', 'wind farm ai', 'oil gas ai', 'darwin ai'],
    naicsCodes: ['541715', '541512'],
    ikerScore: 72,
  },
  {
    id: 'datarobot',
    name: 'DataRobot',
    category: 'Industrial AI',
    aliases: ['datarobot', 'data robot', 'datarobot inc'],
    keywords: ['automated machine learning', 'automl', 'mlops', 'ai cloud enterprise', 'model deployment'],
    naicsCodes: ['541511', '541715'],
    ikerScore: 74,
  },
  {
    id: 'uptake',
    name: 'Uptake',
    category: 'Industrial AI',
    aliases: ['uptake', 'uptake technologies'],
    keywords: ['asset performance management', 'locomotive ai', 'equipment health monitoring', 'industrial analytics'],
    naicsCodes: ['541715', '541512'],
    ikerScore: 68,
  },
  {
    id: 'sight-machine',
    name: 'Sight Machine',
    category: 'Industrial AI',
    aliases: ['sight machine', 'sightmachine'],
    keywords: ['factory analytics', 'oee manufacturing ai', 'production data platform', 'shopfloor analytics'],
    naicsCodes: ['541715', '541512'],
    ikerScore: 64,
  },
  {
    id: 'augury',
    name: 'Augury',
    category: 'Industrial AI',
    aliases: ['augury', 'augury inc', 'augury ai'],
    keywords: ['machine health', 'vibration monitoring ai', 'predictive maintenance iot', 'pump health monitoring'],
    naicsCodes: ['541715', '334515'],
    ikerScore: 66,
  },
  {
    id: 'tulip-interfaces',
    name: 'Tulip',
    category: 'Industrial AI',
    aliases: ['tulip', 'tulip interfaces', 'tulip platform'],
    keywords: ['frontline operations platform', 'no-code manufacturing app', 'connected worker', 'digital work instructions'],
    naicsCodes: ['541511', '541715'],
    ikerScore: 63,
  },
  {
    id: 'symphonyai',
    name: 'SymphonyAI',
    category: 'Industrial AI',
    aliases: ['symphonyai', 'symphony ai', 'symphony ai industrial', 'savantis'],
    keywords: ['industrial ai suite', 'sap companion ai', 'predictive quality', 'oil gas ai symphony'],
    naicsCodes: ['541715', '541511'],
    ikerScore: 71,
  },
  {
    id: 'aspentech',
    name: 'AspenTech',
    category: 'Industrial AI',
    aliases: ['aspentech', 'aspen technology', 'aspenone'],
    keywords: ['process optimization', 'refinery optimization', 'aspen plus', 'mtell predictive', 'process simulation'],
    naicsCodes: ['541511', '541715'],
    ikerScore: 78,
  },
  {
    id: 'aveva',
    name: 'AVEVA',
    category: 'Industrial AI',
    aliases: ['aveva', 'aveva group', 'aveva scada', 'wonderware'],
    keywords: ['wonderware scada', 'pi system', 'industrial data ops', 'digital twin process', 'asset lifecycle'],
    naicsCodes: ['541511', '541715'],
    ikerScore: 79,
  },
  {
    id: 'seeq',
    name: 'Seeq',
    category: 'Industrial AI',
    aliases: ['seeq', 'seeq corporation'],
    keywords: ['process intelligence', 'industrial analytics saas', 'pi system analytics', 'manufacturing analytics cloud'],
    naicsCodes: ['541511', '541715'],
    ikerScore: 62,
  },
  {
    id: 'foghorn-systems',
    name: 'FogHorn Systems',
    category: 'Industrial AI',
    aliases: ['foghorn', 'foghorn systems', 'foghorn lightning'],
    keywords: ['edge ai industrial', 'lightning ml', 'edge analytics', 'iot edge intelligence'],
    naicsCodes: ['541715', '541512'],
    ikerScore: 60,
  },
  {
    id: 'neurala',
    name: 'Neurala',
    category: 'Industrial AI',
    aliases: ['neurala', 'neurala inc', 'brain builder'],
    keywords: ['visual inspection ai', 'defect detection ai', 'brain builder platform', 'visual quality control'],
    naicsCodes: ['541715'],
    ikerScore: 58,
  },
  {
    id: 'instrumental',
    name: 'Instrumental',
    category: 'Industrial AI',
    aliases: ['instrumental', 'instrumental inc'],
    keywords: ['manufacturing intelligence', 'anomaly detection manufacturing', 'traceability manufacturing ai'],
    naicsCodes: ['541715'],
    ikerScore: 57,
  },
  {
    id: 'vanti-analytics',
    name: 'Vanti Analytics',
    category: 'Industrial AI',
    aliases: ['vanti', 'vanti analytics'],
    keywords: ['self-optimizing manufacturing', 'process parameter optimization', 'yield improvement ai'],
    naicsCodes: ['541715'],
    ikerScore: 55,
  },
  {
    id: 'ms-azure-iot',
    name: 'Microsoft Azure Industrial IoT',
    category: 'Industrial AI',
    aliases: ['azure iot', 'microsoft azure iot', 'azure industrial iot', 'azure digital twins'],
    keywords: ['azure iot hub', 'azure digital twins', 'azure time series insights', 'industrial iot cloud'],
    naicsCodes: ['541511', '541519'],
    ikerScore: 85,
  },
  {
    id: 'aws-iot',
    name: 'AWS IoT',
    category: 'Industrial AI',
    aliases: ['aws iot', 'amazon iot', 'aws industrial', 'amazon web services iot'],
    keywords: ['aws iot core', 'aws greengrass', 'aws lookout equipment', 'industrial cloud aws'],
    naicsCodes: ['541511', '541519'],
    ikerScore: 86,
  },
  {
    id: 'google-cloud-manufacturing',
    name: 'Google Cloud Manufacturing',
    category: 'Industrial AI',
    aliases: ['google cloud manufacturing', 'google manufacturing ai', 'visual inspection ai google'],
    keywords: ['manufacturing data cloud', 'visual inspection google', 'vertex ai manufacturing'],
    naicsCodes: ['541511', '541715'],
    ikerScore: 82,
  },

  // ── Logistics Platforms ──────────────────────────────────────────────────────
  {
    id: 'flexport',
    name: 'Flexport',
    category: 'Logistics Platform',
    aliases: ['flexport', 'flexport inc'],
    keywords: ['digital freight forwarding', 'supply chain visibility', 'customs brokerage digital', 'ocean freight tech'],
    naicsCodes: ['488510', '541512'],
    ikerScore: 78,
  },
  {
    id: 'project44',
    name: 'Project44',
    category: 'Logistics Platform',
    aliases: ['project44', 'project 44', 'p44'],
    keywords: ['freight visibility platform', 'real-time tracking freight', 'eld integration logistics', 'carrier api'],
    naicsCodes: ['488510', '541511'],
    ikerScore: 74,
  },
  {
    id: 'fourkites',
    name: 'FourKites',
    category: 'Logistics Platform',
    aliases: ['fourkites', 'four kites', 'fourkites inc'],
    keywords: ['supply chain visibility saas', 'real-time eta freight', 'dynamic eta', 'freight intelligence'],
    naicsCodes: ['488510', '541511'],
    ikerScore: 73,
  },
  {
    id: 'uber-freight',
    name: 'Uber Freight',
    category: 'Logistics Platform',
    aliases: ['uber freight', 'uberfreight'],
    keywords: ['digital brokerage', 'spot market freight', 'shipper tech', 'carrier marketplace'],
    naicsCodes: ['488510'],
    ikerScore: 71,
  },
  {
    id: 'manhattan-associates',
    name: 'Manhattan Associates',
    category: 'Logistics Platform',
    aliases: ['manhattan associates', 'manhattan wms', 'manh'],
    keywords: ['warehouse management system', 'order management system', 'supply chain commerce', 'wms cloud'],
    naicsCodes: ['541511', '493110'],
    ikerScore: 82,
  },
  {
    id: 'blue-yonder',
    name: 'Blue Yonder',
    category: 'Logistics Platform',
    aliases: ['blue yonder', 'jda software', 'blueyonder', 'panasonic blue yonder'],
    keywords: ['demand planning', 'supply chain planning', 'wms blue yonder', 'logistics fulfillment platform'],
    naicsCodes: ['541511', '541512'],
    ikerScore: 80,
  },
  {
    id: 'descartes',
    name: 'Descartes Systems',
    category: 'Logistics Platform',
    aliases: ['descartes', 'descartes systems', 'descartes systems group'],
    keywords: ['customs filing', 'route optimization software', 'fleet routing', 'global trade content', 'denied party screening'],
    naicsCodes: ['488510', '541511'],
    ikerScore: 76,
  },
  {
    id: 'e2open',
    name: 'E2open',
    category: 'Logistics Platform',
    aliases: ['e2open', 'e2 open', 'e2open inc'],
    keywords: ['supply chain network', 'channel data management', 'global trade management', 'transportation management'],
    naicsCodes: ['541511', '488510'],
    ikerScore: 74,
  },
  {
    id: 'kinaxis',
    name: 'Kinaxis',
    category: 'Logistics Platform',
    aliases: ['kinaxis', 'kinaxis inc', 'rapidresponse'],
    keywords: ['supply chain planning saas', 'rapidresponse platform', 'concurrent planning', 'supply chain risk kinaxis'],
    naicsCodes: ['541511'],
    ikerScore: 76,
  },
  {
    id: 'trimble-transportation',
    name: 'Trimble Transportation',
    category: 'Logistics Platform',
    aliases: ['trimble transportation', 'trimble', 'tmw systems', 'tms trimble'],
    keywords: ['tms software', 'eld compliance', 'driver workflow', 'fleet management trimble'],
    naicsCodes: ['541511', '517911'],
    ikerScore: 74,
  },
  {
    id: 'samsara',
    name: 'Samsara',
    category: 'Logistics Platform',
    aliases: ['samsara', 'samsara inc'],
    keywords: ['fleet telematics', 'eld mandate', 'video safety', 'asset tracking saas', 'connected operations'],
    naicsCodes: ['334290', '541511'],
    ikerScore: 73,
  },
  {
    id: 'platform-science',
    name: 'Platform Science',
    category: 'Logistics Platform',
    aliases: ['platform science', 'platform science inc'],
    keywords: ['open fleet platform', 'truck telematics os', 'third party app trucking'],
    naicsCodes: ['541511', '517911'],
    ikerScore: 65,
  },
  {
    id: 'motive-fleet',
    name: 'Motive (KeepTruckin)',
    category: 'Logistics Platform',
    aliases: ['motive', 'keeptruckin', 'keep truckin', 'motive fleet'],
    keywords: ['eld fleet', 'dash cam fleet', 'fleet card', 'driver safety ai'],
    naicsCodes: ['541511', '517911'],
    ikerScore: 67,
  },
  {
    id: 'transplace',
    name: 'Transplace',
    category: 'Logistics Platform',
    aliases: ['transplace', 'transplace llc', 'uber freight transplace'],
    keywords: ['managed transportation', 'freight brokerage managed', 'tms outsourcing', 'mexico freight'],
    naicsCodes: ['488510', '541614'],
    ikerScore: 71,
  },
  {
    id: 'coyote-logistics',
    name: 'Coyote Logistics',
    category: 'Logistics Platform',
    aliases: ['coyote logistics', 'coyote', 'upg coyote'],
    keywords: ['freight brokerage', 'spot freight', 'shipper network', 'coyote go app'],
    naicsCodes: ['488510'],
    ikerScore: 70,
  },

  // ── Supply Chain Software ────────────────────────────────────────────────────
  {
    id: 'sap-scm',
    name: 'SAP',
    category: 'Supply Chain Software',
    aliases: ['sap', 'sap se', 'sap erp', 'sap s4hana', 'sap ariba', 'sap scm'],
    keywords: ['sap s/4hana', 'sap ariba', 'sap integrated business planning', 'sap extended warehouse', 'ewm sap', 'supply chain erp'],
    naicsCodes: ['541511', '541512'],
    ikerScore: 90,
  },
  {
    id: 'oracle-scm',
    name: 'Oracle SCM',
    category: 'Supply Chain Software',
    aliases: ['oracle scm', 'oracle', 'oracle cloud scm', 'oracle supply chain'],
    keywords: ['oracle fusion scm', 'oracle planning', 'oracle manufacturing', 'oracle logistics', 'netsuite supply'],
    naicsCodes: ['541511', '541512'],
    ikerScore: 89,
  },
  {
    id: 'infor',
    name: 'Infor',
    category: 'Supply Chain Software',
    aliases: ['infor', 'infor inc', 'infor scm', 'infor cloud suite'],
    keywords: ['infor cloud suite', 'infor wms', 'infor m3', 'lx erp', 'infor ln', 'infor supply chain'],
    naicsCodes: ['541511', '541512'],
    ikerScore: 77,
  },
  {
    id: 'celonis',
    name: 'Celonis',
    category: 'Supply Chain Software',
    aliases: ['celonis', 'celonis se'],
    keywords: ['process mining', 'execution management', 'process intelligence celonis', 'procurement mining'],
    naicsCodes: ['541511', '541715'],
    ikerScore: 74,
  },
  {
    id: 'uipath',
    name: 'UiPath',
    category: 'Supply Chain Software',
    aliases: ['uipath', 'ui path', 'uipath inc'],
    keywords: ['rpa automation', 'robotic process automation', 'enterprise automation', 'document understanding'],
    naicsCodes: ['541511', '541519'],
    ikerScore: 79,
  },
  {
    id: 'coupa',
    name: 'Coupa Software',
    category: 'Supply Chain Software',
    aliases: ['coupa', 'coupa software', 'coupa bsm'],
    keywords: ['business spend management', 'procurement software', 'supplier management', 'coupa pay'],
    naicsCodes: ['541511'],
    ikerScore: 76,
  },
  {
    id: 'anaplan',
    name: 'Anaplan',
    category: 'Supply Chain Software',
    aliases: ['anaplan', 'anaplan inc'],
    keywords: ['connected planning', 'sales planning', 'supply chain planning anaplan', 'workforce planning'],
    naicsCodes: ['541511'],
    ikerScore: 75,
  },
  {
    id: 'o9-solutions',
    name: 'o9 Solutions',
    category: 'Supply Chain Software',
    aliases: ['o9 solutions', 'o9', 'o9 platform'],
    keywords: ['integrated business planning', 'demand sensing', 'supply planning o9', 'revenue planning'],
    naicsCodes: ['541511', '541715'],
    ikerScore: 71,
  },
  {
    id: 'llamasoft',
    name: 'LLamasoft (Coupa)',
    category: 'Supply Chain Software',
    aliases: ['llamasoft', 'llama soft', 'llamasoft coupa'],
    keywords: ['supply chain design', 'network design software', 'supply chain simulation', 'scenario modeling'],
    naicsCodes: ['541511', '541715'],
    ikerScore: 70,
  },
  {
    id: 'nulogy',
    name: 'Nulogy',
    category: 'Supply Chain Software',
    aliases: ['nulogy', 'nulogy corp'],
    keywords: ['contract packaging software', 'co-packer collaboration', 'secondary packaging platform'],
    naicsCodes: ['541511'],
    ikerScore: 59,
  },
  {
    id: 'logility',
    name: 'Logility',
    category: 'Supply Chain Software',
    aliases: ['logility', 'logility supply chain'],
    keywords: ['demand planning software', 'inventory optimization', 'supplier management platform', 'voyager solutions'],
    naicsCodes: ['541511'],
    ikerScore: 65,
  },
  {
    id: 'jda-software',
    name: 'JDA Software',
    category: 'Supply Chain Software',
    aliases: ['jda software', 'jda supply chain'],
    keywords: ['category management', 'retail planning', 'workforce management retail', 'markdown optimization'],
    naicsCodes: ['541511'],
    ikerScore: 68,
  },
  {
    id: 'gep-worldwide',
    name: 'GEP',
    category: 'Supply Chain Software',
    aliases: ['gep', 'gep worldwide', 'gep smart'],
    keywords: ['smart procurement platform', 'spend analysis', 'sourcing software', 'contract management software'],
    naicsCodes: ['541511', '541614'],
    ikerScore: 67,
  },
  {
    id: 'ivalua',
    name: 'Ivalua',
    category: 'Supply Chain Software',
    aliases: ['ivalua', 'ivalua inc'],
    keywords: ['supplier relationship management', 'source to pay', 'procurement ai', 'contract lifecycle'],
    naicsCodes: ['541511'],
    ikerScore: 66,
  },
  {
    id: 'jaggaer',
    name: 'JAGGAER',
    category: 'Supply Chain Software',
    aliases: ['jaggaer', 'sciquest', 'pool4tool'],
    keywords: ['direct spend procurement', 'research procurement', 'supplier collaboration', 'advanced sourcing'],
    naicsCodes: ['541511'],
    ikerScore: 65,
  },
  {
    id: 'veritiv',
    name: 'Veritiv',
    category: 'Supply Chain Software',
    aliases: ['veritiv', 'veritiv corp'],
    keywords: ['packaging distribution', 'facility supplies', 'print distribution', 'supply chain outsourcing'],
    naicsCodes: ['424130', '541614'],
    ikerScore: 62,
  },
  {
    id: 'roper-technologies',
    name: 'Roper Technologies',
    category: 'Supply Chain Software',
    aliases: ['roper technologies', 'roper', 'roper industries'],
    keywords: ['software industrial', 'niche software acquisitions', 'freight match', 'loadlink technologies'],
    naicsCodes: ['541511', '334519'],
    ikerScore: 76,
  },
  {
    id: 'gains-systems',
    name: 'GAINS Systems',
    category: 'Supply Chain Software',
    aliases: ['gains systems', 'gains', 'gains supply chain'],
    keywords: ['inventory policy', 'supply chain performance', 'replenishment optimization', 'service level optimization'],
    naicsCodes: ['541511'],
    ikerScore: 58,
  },
  {
    id: 'llamasoft-supply-chain',
    name: 'ToolsGroup',
    category: 'Supply Chain Software',
    aliases: ['toolsgroup', 'tools group', 'so99+'],
    keywords: ['demand sensing toolsgroup', 'probabilistic forecasting', 'inventory optimization toolsgroup'],
    naicsCodes: ['541511'],
    ikerScore: 60,
  },

  // ── El Paso Extension Entities (March 2026) ──────────────────────────────────
  {
    id: 'ep-northrop',
    name: 'Northrop Grumman (El Paso)',
    category: 'Defense Tech',
    aliases: ['northrop grumman ibcs', 'ibcs northrop', 'integrated battle command northrop'],
    keywords: ['ibcs integrated battle command', 'air missile defense c2', 'ibcs program', 'sensor fusion air defense fort bliss'],
    naicsCodes: ['336411', '334511', '541330'],
    ikerScore: 90,
  },
  {
    id: 'ep-lockheed',
    name: 'Lockheed Martin MFC (El Paso)',
    category: 'Defense Tech',
    aliases: ['lockheed mfc', 'lockheed fire control el paso', 'thaad lockheed'],
    keywords: ['thaad interceptor', 'terminal high altitude area defense', 'himars', 'pac-3 mse fort bliss', 'guided mlrs'],
    naicsCodes: ['336414', '336411', '541330'],
    ikerScore: 93,
  },
  {
    id: 'ep-generaldynamics',
    name: 'General Dynamics Land Systems (El Paso)',
    category: 'Defense Tech',
    aliases: ['gdls el paso', 'general dynamics land systems fort bliss', 'm1 abrams depot'],
    keywords: ['m1a2 sepv3 fort bliss', 'abrams tank depot', 'armored vehicle sustainment fort bliss'],
    naicsCodes: ['336992', '541512', '334511'],
    ikerScore: 89,
  },
  {
    id: 'ep-bae',
    name: 'BAE Systems (El Paso)',
    category: 'Defense Tech',
    aliases: ['bae systems el paso', 'bae bradley fort bliss', 'bae electronic warfare el paso'],
    keywords: ['bradley m2a4 upgrade', 'electronic warfare bae fort bliss', 'envg-b night vision bae', 'soldier systems bae'],
    naicsCodes: ['334511', '336992', '541330'],
    ikerScore: 85,
  },
  {
    id: 'ep-accenturefed',
    name: 'Accenture Federal Services (El Paso)',
    category: 'Defense Tech',
    aliases: ['accenture federal el paso', 'accenture federal dod el paso', 'afs army'],
    keywords: ['gcss army s4hana upgrade', 'army erp modernization accenture', 'azure govcloud army', 'army ai center excellence'],
    naicsCodes: ['541611', '541512', '541519'],
    ikerScore: 84,
  },
  {
    id: 'ep-deloitte',
    name: 'Deloitte Government El Paso',
    category: 'Defense Tech',
    aliases: ['deloitte el paso', 'deloitte government el paso', 'deloitte gps el paso'],
    keywords: ['army audit readiness deloitte', 'cbp it deloitte', 'defense financial management consulting', 'cleared consulting el paso'],
    naicsCodes: ['541611', '541512', '541219'],
    ikerScore: 82,
  },
  {
    id: 'ep-caci-ep',
    name: 'CACI International (El Paso)',
    category: 'Defense Tech',
    aliases: ['caci el paso', 'caci wsmr', 'caci fort bliss'],
    keywords: ['sigint processing el paso', 'army intelligence wsmr', 'intelligence brigade it fort bliss', 'cyber operations caci'],
    naicsCodes: ['541512', '541519', '541690'],
    ikerScore: 81,
  },
  {
    id: 'ep-vectrus-ep',
    name: 'V2X Vectrus (Fort Bliss)',
    category: 'Defense Tech',
    aliases: ['vectrus fort bliss', 'v2x fort bliss', 'logcap v fort bliss'],
    keywords: ['logcap v fort bliss', 'base operations fort bliss support', 'installation support contract fort bliss'],
    naicsCodes: ['561210', '237990', '541330'],
    ikerScore: 77,
  },
  {
    id: 'ep-palantir',
    name: 'Palantir Army AIP (El Paso)',
    category: 'Defense Tech',
    aliases: ['palantir army aip', 'palantir fort bliss', 'army aip el paso', 'palantir titan'],
    keywords: ['army aip platform fort bliss', 'palantir foundry army', 'titan ground station palantir', 'army ai platform operational'],
    naicsCodes: ['541511', '541715', '541512'],
    ikerScore: 89,
  },
  {
    id: 'ep-crowdstrike',
    name: 'CrowdStrike Federal (El Paso)',
    category: 'Defense Tech',
    aliases: ['crowdstrike federal el paso', 'crowdstrike cbp', 'crowdstrike dod el paso'],
    keywords: ['falcon endpoint dod el paso', 'disa hbss replacement crowdstrike', 'cbp network security crowdstrike', 'army arcyber threat intel'],
    naicsCodes: ['541512', '541519'],
    ikerScore: 83,
  },
  {
    id: 'ep-sievert',
    name: 'Sievert Larson Cyber',
    category: 'Defense Tech',
    aliases: ['sievert larson', 'sievert larson cyber', 'slc cyber el paso'],
    keywords: ['fort bliss cyber range red team', 'ics security el paso', 'cisa assessment critical infrastructure', 'ot security utilities el paso'],
    naicsCodes: ['541512', '541519', '541690'],
    ikerScore: 65,
  },
  {
    id: 'ep-irontower',
    name: 'Iron Tower Security',
    category: 'Defense Tech',
    aliases: ['iron tower security', 'iron tower', 'irontower el paso'],
    keywords: ['zero trust maquiladora network', 'cross border network security el paso', 'bi-national zero trust'],
    naicsCodes: ['541512', '541519'],
    ikerScore: 55,
  },
  {
    id: 'ep-elpaso-childrens',
    name: "El Paso Children's Hospital",
    category: 'Health Tech',
    aliases: ["el paso children's", 'epch', 'ep childrens hospital', 'el paso pediatric hospital'],
    keywords: ['pediatric sepsis ai el paso', 'childrens telehealth west texas', 'pediatric ehr bilingual', 'mychart childrens el paso'],
    naicsCodes: ['622110', '541512'],
    ikerScore: 72,
  },
  {
    id: 'ep-wbamc',
    name: 'William Beaumont Army Medical Center',
    category: 'Health Tech',
    aliases: ['wbamc', 'william beaumont army', 'beaumont army medical center'],
    keywords: ['mhs genesis wbamc', 'military health ehr fort bliss', 'combat casualty simulation army', 'army medical readiness data'],
    naicsCodes: ['622110', '541512', '611430'],
    ikerScore: 76,
  },
  {
    id: 'ep-caremore',
    name: 'CareMore Health El Paso',
    category: 'Health Tech',
    aliases: ['caremore el paso', 'caremore health el paso'],
    keywords: ['medicare advantage el paso', 'remote cardiac monitoring el paso', 'hedis care management hispanic', 'medicare care gap ai'],
    naicsCodes: ['621498', '541512'],
    ikerScore: 68,
  },
  {
    id: 'ep-gridworks',
    name: 'GridWorks Energy El Paso',
    category: 'Energy Tech',
    aliases: ['gridworks energy', 'gridworks ep', 'gridworks el paso'],
    keywords: ['epe derms pilot', 'fort bliss microgrid battery', 'grid edge el paso', 'solar storage military el paso'],
    naicsCodes: ['221122', '238210', '541330'],
    ikerScore: 62,
  },
  {
    id: 'ep-abengoa',
    name: 'Abengoa Solar El Paso',
    category: 'Energy Tech',
    aliases: ['abengoa solar el paso', 'abengoa el paso'],
    keywords: ['csp west texas epe', 'crez solar compliance texas', 'utility solar ppa el paso electric'],
    naicsCodes: ['221114', '237130'],
    ikerScore: 66,
  },
  {
    id: 'ep-borgwarner',
    name: 'BorgWarner El Paso',
    category: 'Manufacturing Tech',
    aliases: ['borgwarner el paso', 'borgwarner juarez', 'borg warner maquiladora'],
    keywords: ['ev thermal management juarez plant', 'gm ultium borgwarner supply', 'ev components maquiladora el paso'],
    naicsCodes: ['336390', '336300'],
    ikerScore: 70,
  },
  {
    id: 'ep-commscope',
    name: 'CommScope El Paso',
    category: 'Manufacturing Tech',
    aliases: ['commscope el paso', 'commscope juarez', 'commscope fiber el paso'],
    keywords: ['fiber optic assembly el paso juarez', '5g hardware manufacturing maquiladora', 'rf connectivity defense components'],
    naicsCodes: ['335921', '334220'],
    ikerScore: 69,
  },
  {
    id: 'ep-sanmina',
    name: 'Sanmina Corporation El Paso',
    category: 'Manufacturing Tech',
    aliases: ['sanmina el paso', 'sanmina juarez', 'sanmina ems el paso'],
    keywords: ['medical device assembly juarez el paso', 'ipc class iii pcb el paso', 'defense electronics ems maquiladora'],
    naicsCodes: ['334418', '334419'],
    ikerScore: 73,
  },
  {
    id: 'ep-ontrac',
    name: 'OnTrac El Paso',
    category: 'Logistics',
    aliases: ['ontrac el paso', 'lasership el paso', 'ontrac west texas'],
    keywords: ['last mile el paso delivery', 'regional parcel west texas', 'amazon sfp carrier el paso'],
    naicsCodes: ['492110'],
    ikerScore: 64,
  },
  {
    id: 'ep-globaltranz',
    name: 'GlobalTranz El Paso',
    category: 'Logistics',
    aliases: ['globaltranz el paso', 'global tranz el paso', 'globaltranz cross border'],
    keywords: ['cross border freight brokerage el paso', 'us mexico truckload globaltranz', 'cold chain el paso mexico'],
    naicsCodes: ['488510', '541614'],
    ikerScore: 67,
  },
  {
    id: 'ep-nuvocargo',
    name: 'Nuvocargo',
    category: 'Border Tech',
    aliases: ['nuvocargo', 'nuvo cargo', 'nuvocargo freight mexico'],
    keywords: ['digital freight us mexico', 'pedimento automation platform', 'cross border working capital freight', 'a16z us mexico freight'],
    naicsCodes: ['488510', '541511'],
    ikerScore: 72,
  },
  {
    id: 'ep-samsara-ep',
    name: 'Samsara Border Fleet',
    category: 'Logistics',
    aliases: ['samsara cross border', 'samsara border fleet', 'samsara el paso fleet'],
    keywords: ['c-tpat gps tracking cbp', 'cross border eld compliance', 'trusted shipper telematics el paso'],
    naicsCodes: ['334290', '541511'],
    ikerScore: 71,
  },
  {
    id: 'ep-palantir-local',
    name: 'Palantir Technologies (Local Office)',
    category: 'Defense Tech',
    aliases: ['palantir local el paso', 'palantir el paso office'],
    keywords: ['army aip fort bliss local', 'foundry logistics army el paso', 'titan palantir el paso'],
    naicsCodes: ['541511', '541715'],
    ikerScore: 89,
  },
  {
    id: 'ep-cogility',
    name: 'Cogility Corp',
    category: 'AI / R&D',
    aliases: ['cogility', 'cogility corp', 'cobweb cogility', 'cogility el paso'],
    keywords: ['cobweb platform army g4', 'army readiness analytics el paso', 'defense logistics ai sbir', 'logsa integration cogility'],
    naicsCodes: ['541715', '541512'],
    ikerScore: 62,
  },
  {
    id: 'ep-kpmg',
    name: 'KPMG El Paso',
    category: 'Defense Tech',
    aliases: ['kpmg el paso', 'kpmg juarez advisory', 'kpmg maquiladora'],
    keywords: ['usmca advisory kpmg el paso', 'maquiladora restructuring kpmg', 'digital transformation maquiladora kpmg'],
    naicsCodes: ['541611', '541219', '541512'],
    ikerScore: 72,
  },
  {
    id: 'ep-elpasoinnovation',
    name: 'El Paso Innovation Hub (Entrada)',
    category: 'AI / R&D',
    aliases: ['entrada el paso', 'el paso innovation hub', 'ep innovation hub', 'entrada startup incubator'],
    keywords: ['sbir el paso startup', 'border tech incubator utep', 'defense dual use startup el paso', 'dhs sbir el paso tech'],
    naicsCodes: ['926150', '541715'],
    ikerScore: 55,
  },
];

// ─── Topic / Sector Entities (not vendors, but tracked signals) ──────────────

export type SectorKeywords = {
  id: string;
  label: string;
  color: string;
  keywords: string[];
  contractKeywords: string[];    // SAM.gov / news contract signals
  securityKeywords: string[];    // Crime/incident keywords that affect this sector
};

export const SECTOR_KEYWORDS: SectorKeywords[] = [
  {
    id: 'defense',
    label: 'Defense Tech',
    color: '#ff6400',
    keywords: [
      'fort bliss', 'army', 'dod', 'defense contract', 'pentagon', 'ndaa',
      'c4isr', 'patriot', 'ivas', 'army futures', 'army modernization',
      'missile defense', 'electronic warfare', 'unmanned systems', 'drone',
    ],
    contractKeywords: [
      'idiq', 'task order', 'contract award', 'base contract', 'follow-on',
      'sbir phase', 'other transaction', 'gsa schedule', 'multiple award',
    ],
    securityKeywords: [
      'fort bliss incident', 'base security', 'classified breach', 'insider threat',
    ],
  },
  {
    id: 'border-trade',
    label: 'Border Trade',
    color: '#00d4ff',
    keywords: [
      'usmca', 'maquiladora', 'immex', 'cbp', 'customs', 'port of entry',
      'bridge of americas', 'ysleta', 'paso del norte', 'nearshoring',
      'cross-border', 'trade corridor', 'juarez', 'chihuahua manufacturing',
    ],
    contractKeywords: [
      'cbp contract', 'dhs award', 'customs modernization', 'ace platform award',
      'biometric contract', 'border technology contract',
    ],
    securityKeywords: [
      'border closure', 'port closure', 'bridge closure', 'crossing incident',
      'smuggling seizure', 'cartel interdiction', 'drug seizure',
    ],
  },
  {
    id: 'logistics',
    label: 'Supply Chain',
    color: '#a855f7',
    keywords: [
      'supply chain', 'logistics', 'freight', 'warehouse', 'distribution',
      'last mile', 'route optimization', 'fleet management', 'cold chain',
      'inventory management', 'procurement', 'fulfilment',
    ],
    contractKeywords: [
      'logistics contract', 'supply chain award', 'distribution contract',
      'freight contract', 'transportation award',
    ],
    securityKeywords: [
      'cargo theft', 'freight hijacking', 'supply chain disruption',
      'port congestion', 'bridge closure supply',
    ],
  },
  {
    id: 'water',
    label: 'Water Tech',
    color: '#00ffcc',
    keywords: [
      'desalination', 'water scarcity', 'water reuse', 'aquifer depletion',
      'brackish water', 'water treatment', 'water infrastructure', 'desal plant',
      'water recycling', 'drought', 'rio grande', 'water management',
    ],
    contractKeywords: [
      'water contract', 'desal contract', 'water infrastructure award',
      'water technology grant', 'epwu contract',
    ],
    securityKeywords: [
      'water contamination', 'infrastructure attack', 'water system breach',
    ],
  },
  {
    id: 'energy',
    label: 'Energy Tech',
    color: '#ffb800',
    keywords: [
      'solar energy', 'battery storage', 'grid modernization', 'ercot',
      'renewable energy', 'wind energy', 'energy storage', 'smart grid',
      'power infrastructure', 'energy efficiency', 'electric vehicle',
    ],
    contractKeywords: [
      'energy contract', 'doe award', 'grid contract', 'solar contract',
      'battery storage contract', 'energy grant',
    ],
    securityKeywords: [
      'grid attack', 'power outage attack', 'energy infrastructure threat',
      'substation incident',
    ],
  },
  {
    id: 'robotics',
    label: 'Robotics & Automation',
    color: '#a855f7',
    keywords: [
      'industrial robot', 'collaborative robot', 'cobot', 'autonomous mobile robot',
      'amr', 'automated guided vehicle', 'agv', 'humanoid robot', 'robotic arm',
      'warehouse robot', 'mobile manipulation', 'exoskeleton', 'pick and place robot',
    ],
    contractKeywords: [
      'robot contract', 'automation award', 'robotic system contract', 'amr deployment',
      'warehouse automation contract', 'robot integration award',
    ],
    securityKeywords: [
      'robot safety incident', 'autonomous system failure', 'automation disruption',
    ],
  },
  {
    id: 'warehouse-automation',
    label: 'Warehouse Automation',
    color: '#06b6d4',
    keywords: [
      'asrs', 'automated storage retrieval', 'goods to person', 'conveyor system',
      'sortation', 'warehouse management system', 'wms', 'pick and pass', 'fulfillment automation',
      'cube storage', 'shuttle system', 'vertical lift module', 'miniload',
    ],
    contractKeywords: [
      'warehouse automation contract', 'fulfillment center award', 'asrs contract',
      'distribution automation award', 'wms implementation award',
    ],
    securityKeywords: [
      'warehouse fire', 'fulfillment center incident', 'distribution disruption',
    ],
  },
  {
    id: 'manufacturing-tech',
    label: 'Manufacturing Tech',
    color: '#22c55e',
    keywords: [
      'plc', 'scada', 'mes', 'cnc', 'digital twin', 'machine vision', 'industrial iot',
      'smart factory', 'industry 4.0', 'additive manufacturing', '3d printing industrial',
      'quality control automation', 'machine tool', 'servo drive',
    ],
    contractKeywords: [
      'manufacturing contract', 'factory automation award', 'mes implementation',
      'digital factory award', 'smart manufacturing grant',
    ],
    securityKeywords: [
      'manufacturing plant incident', 'factory cyber attack', 'ot security breach',
      'scada attack', 'industrial control system incident',
    ],
  },
  {
    id: 'industrial-ai',
    label: 'Industrial AI',
    color: '#f59e0b',
    keywords: [
      'predictive maintenance', 'process optimization ai', 'industrial machine learning',
      'edge ai', 'iot analytics', 'anomaly detection industrial', 'digital twin ai',
      'computer vision manufacturing', 'foundation model industrial', 'generative ai manufacturing',
    ],
    contractKeywords: [
      'ai contract industrial', 'predictive analytics award', 'industrial ai grant',
      'iot platform contract', 'machine learning deployment',
    ],
    securityKeywords: [
      'ai system failure', 'model adversarial attack', 'data pipeline breach',
    ],
  },
  {
    id: 'supply-chain-software',
    label: 'Supply Chain Software',
    color: '#ec4899',
    keywords: [
      'erp supply chain', 'demand planning', 'inventory optimization', 'procurement software',
      'supplier management', 'spend analytics', 'source to pay', 'contract lifecycle management',
      'supply chain visibility', 'order management', 'global trade management',
    ],
    contractKeywords: [
      'erp implementation', 'scm software award', 'procurement platform contract',
      'supply chain software license', 'wms saas contract',
    ],
    securityKeywords: [
      'erp breach', 'supply chain software attack', 'ransomware supply chain',
      'data breach procurement',
    ],
  },
];

// ─── Extended Global Entity Registry ─────────────────────────────────────────
// 700+ additional global defense, tech, industrial, and emerging companies
// covering 30+ countries across every major sector.

export const EXTENDED_GLOBAL_ENTITIES: NxtEntity[] = [

  // ══════════════════════════════════════════════════════════════════════
  // DEFENSE & AEROSPACE — GLOBAL
  // ══════════════════════════════════════════════════════════════════════

  // United States
  { id: 'lockheed-martin', name: 'Lockheed Martin', category: 'Global Defense', aliases: ['lockheed martin', 'lockheed', 'lmt', 'lmco', 'lockheed martin corporation'], keywords: ['f-35', 'missile defense', 'space systems', 'aeronautics', 'sikorsky', 'hypersonic', 'c-130', 'f-22', 'aegis'], ikerScore: 99 },
  { id: 'raytheon', name: 'Raytheon Technologies', category: 'Global Defense', aliases: ['raytheon', 'raytheon technologies', 'rtx', 'rtx corporation', 'raytheon missiles', 'pratt whitney'], keywords: ['patriot missile', 'tomahawk', 'air defense', 'radar systems', 'electronic warfare', 'jet engine', 'cybersecurity defense'], ikerScore: 98 },
  { id: 'boeing-defense', name: 'Boeing Defense', category: 'Global Defense', aliases: ['boeing defense', 'boeing', 'ba stock', 'boeing company', 'boeing space'], keywords: ['f-15', 'apache helicopter', 'chinook', 'tanker aircraft', 'space launch system', 'surveillance aircraft', 'unmanned systems'], ikerScore: 97 },
  { id: 'northrop-grumman', name: 'Northrop Grumman', category: 'Global Defense', aliases: ['northrop grumman', 'northrop', 'noc', 'grumman', 'northrop grumman corporation'], keywords: ['b-21 raider', 'stealth bomber', 'space systems', 'cyber operations', 'autonomous systems', 'ground radar', 'missile defense'], ikerScore: 97 },
  { id: 'general-dynamics', name: 'General Dynamics', category: 'Global Defense', aliases: ['general dynamics', 'gd', 'gdit', 'general dynamics it', 'gd mission systems'], keywords: ['abrams tank', 'stryker', 'submarine', 'it services defense', 'cloud computing defense', 'c4isr', 'command control'], ikerScore: 96 },
  { id: 'l3harris', name: 'L3Harris Technologies', category: 'Global Defense', aliases: ['l3harris', 'l3 harris', 'harris corporation', 'l3 technologies', 'lhx'], keywords: ['communication systems', 'electronic warfare', 'night vision', 'intelligence surveillance', 'unmanned aerial', 'tactical radio', 'space systems'], ikerScore: 94 },
  { id: 'leidos', name: 'Leidos', category: 'Global Defense', aliases: ['leidos', 'leidos holdings', 'saic leidos', 'leidos defense'], keywords: ['defense it', 'intelligence systems', 'health it', 'civil programs', 'cybersecurity federal', 'airport security', 'logistics it'], ikerScore: 91 },
  { id: 'saic', name: 'SAIC', category: 'Global Defense', aliases: ['saic', 'science applications international', 'science applications international corporation'], keywords: ['defense it services', 'intelligence community', 'space systems', 'cyber defense', 'logistics modernization', 'c4isr solutions'], ikerScore: 89 },
  { id: 'booz-allen', name: 'Booz Allen Hamilton', category: 'Global Defense', aliases: ['booz allen', 'booz allen hamilton', 'bah', 'booz allen hamilton holding'], keywords: ['management consulting defense', 'analytics intelligence', 'cyber consulting', 'digital transformation federal', 'ai government'], ikerScore: 88 },
  { id: 'caci-international', name: 'CACI International', category: 'Global Defense', aliases: ['caci', 'caci international', 'caci inc'], keywords: ['intelligence analysis', 'cyber operations', 'it modernization', 'enterprise it defense', 'signals intelligence'], ikerScore: 85 },
  { id: 'moog-inc', name: 'Moog Inc', category: 'Global Defense', aliases: ['moog', 'moog inc', 'moog defense'], keywords: ['flight controls', 'missile actuation', 'space propulsion', 'defense components', 'precision motion control'], ikerScore: 82 },
  { id: 'textron', name: 'Textron', category: 'Global Defense', aliases: ['textron', 'textron inc', 'textron aviation', 'bell textron', 'textron systems'], keywords: ['bell helicopter', 'cessna', 'unmanned systems', 'armored vehicles', 'marine vessels', 'v-22 osprey'], ikerScore: 85 },
  { id: 'curtiss-wright', name: 'Curtiss-Wright', category: 'Global Defense', aliases: ['curtiss-wright', 'curtiss wright', 'cw defense'], keywords: ['defense electronics', 'naval systems', 'flight test', 'rugged electronics', 'embedded computing defense'], ikerScore: 80 },
  { id: 'kratos-defense', name: 'Kratos Defense', category: 'Global Defense', aliases: ['kratos', 'kratos defense', 'kratos defense security solutions'], keywords: ['unmanned combat aerial', 'satellite systems', 'microwave electronics', 'tactical drones', 'valkyrie drone'], ikerScore: 83 },
  { id: 'shield-ai', name: 'Shield AI', category: 'Global Defense', aliases: ['shield ai', 'shield artificial intelligence', 'hivemind', 'shield ai drone'], keywords: ['autonomous pilot', 'ai pilot', 'f-16 ai', 'military ai', 'swarm intelligence', 'hivemind ai', 'drone autonomy'], ikerScore: 87 },
  { id: 'anduril', name: 'Anduril Industries', category: 'Global Defense', aliases: ['anduril', 'anduril industries', 'palmer luckey defense', 'lattice ai', 'anduril defense'], keywords: ['lattice os', 'autonomous systems', 'surveillance tower', 'ghost drone', 'counter drone', 'ai defense', 'border surveillance'], ikerScore: 92 },
  { id: 'joby-aviation', name: 'Joby Aviation', category: 'Drone & Autonomy', aliases: ['joby', 'joby aviation', 'joby s4', 'joby air taxi'], keywords: ['evtol', 'air taxi', 'electric aircraft', 'urban air mobility', 'autonomous flight'], ikerScore: 78 },
  { id: 'archer-aviation', name: 'Archer Aviation', category: 'Drone & Autonomy', aliases: ['archer aviation', 'archer', 'midnight aircraft'], keywords: ['evtol', 'electric air taxi', 'urban air mobility', 'midnight evtol'], ikerScore: 74 },
  { id: 'aerovironment', name: 'AeroVironment', category: 'Drone & Autonomy', aliases: ['aerovironment', 'aeroviroment', 'avav', 'raven drone', 'switchblade drone'], keywords: ['switchblade loitering munition', 'raven uav', 'puma drone', 'small uas', 'kamikaze drone', 'tactical drone'], ikerScore: 86 },
  { id: 'joby-defense', name: 'Wisk Aero', category: 'Drone & Autonomy', aliases: ['wisk', 'wisk aero', 'boeing wisk'], keywords: ['autonomous air taxi', 'cora aircraft', 'urban air mobility'], ikerScore: 72 },

  // European Defense
  { id: 'bae-systems', name: 'BAE Systems', category: 'Global Defense', aliases: ['bae systems', 'bae', 'british aerospace', 'bae systems plc'], keywords: ['eurofighter typhoon', 'destroyer warship', 'armoured vehicle', 'electronic systems', 'cyber intelligence', 'naval guns', 'combat aircraft'], ikerScore: 97 },
  { id: 'airbus-defence', name: 'Airbus Defence & Space', category: 'Global Defense', aliases: ['airbus defence', 'airbus defense', 'airbus ds', 'cassidian', 'eads'], keywords: ['a400m transport', 'eurofighter', 'satellite systems', 'drone military', 'earth observation', 'secure communications'], ikerScore: 95 },
  { id: 'thales', name: 'Thales Group', category: 'Global Defense', aliases: ['thales', 'thales group', 'thomson-csf', 'thales alenia space'], keywords: ['radar systems', 'avionics', 'naval defense', 'secure communications', 'biometrics', 'digital identity', 'air traffic management'], ikerScore: 94 },
  { id: 'safran', name: 'Safran', category: 'Global Defense', aliases: ['safran', 'safran group', 'snecma', 'turbomeca'], keywords: ['aircraft engines', 'landing systems', 'navigation systems', 'optronics', 'ejection seats', 'helicopter turbines'], ikerScore: 91 },
  { id: 'dassault', name: 'Dassault Aviation', category: 'Global Defense', aliases: ['dassault', 'dassault aviation', 'dassault systemes defense', 'rafale manufacturer'], keywords: ['rafale fighter', 'falcon jet', 'nEUROn drone', 'combat aircraft france', 'stealth drone'], ikerScore: 89 },
  { id: 'mbda', name: 'MBDA', category: 'Global Defense', aliases: ['mbda', 'mbda systems', 'mbda missiles'], keywords: ['missile systems', 'meteor missile', 'aster missile', 'brimstone missile', 'exocet', 'air defense europe'], ikerScore: 88 },
  { id: 'rheinmetall', name: 'Rheinmetall', category: 'Global Defense', aliases: ['rheinmetall', 'rheinmetall ag', 'rheinmetall defence'], keywords: ['lynx infantry vehicle', 'boxer vehicle', 'leopard tank', 'artillery systems', 'ammunition', 'armored vehicles'], ikerScore: 90 },
  { id: 'knds', name: 'KNDS', category: 'Global Defense', aliases: ['knds', 'krauss-maffei wegmann', 'kmw', 'nexter', 'giat'], keywords: ['leopard 2 tank', 'leclerc tank', 'caesar howitzer', 'armored vehicles europe', 'franco-german defense'], ikerScore: 86 },
  { id: 'saab-ab', name: 'Saab AB', category: 'Global Defense', aliases: ['saab', 'saab ab', 'saab defense', 'gripen manufacturer'], keywords: ['gripen fighter', 'erieye aew', 'carl-Gustaf', 'at4 rocket', 'underwater defense', 'jas 39'], ikerScore: 87 },
  { id: 'leonardo-spa', name: 'Leonardo S.p.A.', category: 'Global Defense', aliases: ['leonardo', 'leonardo drs', 'finmeccanica', 'alenia aermacchi', 'agustawestland'], keywords: ['m-346 trainer', 'aw101 helicopter', 'eurofighter electronics', 'naval electronics', 'space systems italy'], ikerScore: 88 },
  { id: 'hensoldt', name: 'HENSOLDT', category: 'Global Defense', aliases: ['hensoldt', 'hensoldt ag', 'airbus sensors', 'hensoldt sensors'], keywords: ['radar defense', 'optronics military', 'electronic warfare sensors', 'eurofighter radar', 'air surveillance'], ikerScore: 83 },

  // Israel Defense
  { id: 'elbit-systems', name: 'Elbit Systems', category: 'Global Defense', aliases: ['elbit', 'elbit systems', 'elbit systems of america'], keywords: ['iron dome component', 'night vision goggles', 'hermes drone', 'land systems', 'c4isr israel', 'battle management', 'electronic warfare'], ikerScore: 93 },
  { id: 'rafael', name: 'Rafael Advanced Defense Systems', category: 'Global Defense', aliases: ['rafael', 'rafael advanced defense', 'rafael defense', 'iron dome manufacturer'], keywords: ['iron dome', 'david sling', 'spike missile', 'trophy active protection', 'barak missile', 'laser beam defense'], ikerScore: 94 },
  { id: 'iai', name: 'Israel Aerospace Industries', category: 'Global Defense', aliases: ['iai', 'israel aerospace industries', 'israel aircraft industries', 'malat'], keywords: ['heron drone', 'harop loitering', 'arrow missile defense', 'barak air defense', 'iai satellite'], ikerScore: 91 },

  // Asia-Pacific Defense
  { id: 'mitsubishi-defense', name: 'Mitsubishi Heavy Industries', category: 'Global Defense', aliases: ['mitsubishi heavy industries', 'mhi defense', 'mitsubishi defense', 'mhi'], keywords: ['f-2 fighter', 'f-15j', 'p-1 patrol aircraft', 'type 10 tank', 'destroyer japan', 'space launch vehicle'], ikerScore: 88 },
  { id: 'kawasaki-defense', name: 'Kawasaki Defense', category: 'Global Defense', aliases: ['kawasaki defense', 'kawasaki heavy industries defense', 'kawasaki aerospace'], keywords: ['c-2 transport', 'p-1 aircraft', 'submarines japan', 'type 82 missile', 'military helicopter japan'], ikerScore: 82 },
  { id: 'hanwha-defense', name: 'Hanwha Defense', category: 'Global Defense', aliases: ['hanwha defense', 'hanwha', 'hanwha aerospace', 'k9 thunder manufacturer'], keywords: ['k9 thunder howitzer', 'redback infantry vehicle', 'chunmoo rocket', 'korean defense', 'armored vehicle korea'], ikerScore: 85 },
  { id: 'kddi-defense', name: 'LIG Nex1', category: 'Global Defense', aliases: ['lig nex1', 'lig nexone', 'korean missile defense'], keywords: ['cheon궁 air defense', 'hae sung missile', 'korean air defense system', 'surface-to-air missile korea'], ikerScore: 78 },

  // ══════════════════════════════════════════════════════════════════════
  // CYBERSECURITY — GLOBAL
  // ══════════════════════════════════════════════════════════════════════

  { id: 'crowdstrike', name: 'CrowdStrike', category: 'Global Cybersecurity', aliases: ['crowdstrike', 'crowdstrike holdings', 'falcon platform', 'crwd'], keywords: ['endpoint detection response', 'threat intelligence', 'falcon sensor', 'xdr security', 'incident response', 'nation state threat'], ikerScore: 96 },
  { id: 'palo-alto-networks', name: 'Palo Alto Networks', category: 'Global Cybersecurity', aliases: ['palo alto networks', 'palo alto', 'panw', 'cortex xdr', 'prisma cloud'], keywords: ['next gen firewall', 'cloud security', 'sase network', 'zero trust', 'soc automation', 'cortex xsoar'], ikerScore: 95 },
  { id: 'sentinelone', name: 'SentinelOne', category: 'Global Cybersecurity', aliases: ['sentinelone', 'sentinel one', 's1 security', 'singularity platform'], keywords: ['ai endpoint protection', 'autonomous threat detection', 'edr platform', 'singularity xdr', 'purple ai'], ikerScore: 90 },
  { id: 'tenable', name: 'Tenable', category: 'Global Cybersecurity', aliases: ['tenable', 'tenable holdings', 'nessus scanner', 'tenable.io'], keywords: ['vulnerability management', 'nessus', 'cloud security posture', 'ot security', 'attack surface', 'exposure management'], ikerScore: 88 },
  { id: 'qualys', name: 'Qualys', category: 'Global Cybersecurity', aliases: ['qualys', 'qualys inc', 'qualys cloud platform'], keywords: ['cloud security', 'vulnerability scanning', 'compliance monitoring', 'web application security', 'patch management'], ikerScore: 85 },
  { id: 'cyberark', name: 'CyberArk', category: 'Global Cybersecurity', aliases: ['cyberark', 'cyberark software', 'privileged access management', 'pam security'], keywords: ['privileged access management', 'identity security', 'zero trust security', 'secrets management', 'cloud privilege'], ikerScore: 88 },
  { id: 'checkmarx', name: 'Checkmarx', category: 'Global Cybersecurity', aliases: ['checkmarx', 'cx appsec'], keywords: ['application security testing', 'sast security', 'devsecops', 'code security scanning', 'open source security'], ikerScore: 80 },
  { id: 'darktrace', name: 'Darktrace', category: 'Global Cybersecurity', aliases: ['darktrace', 'darktrace ai', 'darktrace plc'], keywords: ['autonomous response', 'ai cybersecurity', 'industrial ics security', 'self-learning ai security', 'email security ai'], ikerScore: 86 },
  { id: 'wiz', name: 'Wiz', category: 'Global Cybersecurity', aliases: ['wiz', 'wiz.io', 'wiz cloud security', 'wiz security'], keywords: ['cloud native security', 'cloud posture management', 'agentless cloud scan', 'multi-cloud security', 'cloud vulnerability'], ikerScore: 90 },
  { id: 'lacework', name: 'Lacework', category: 'Global Cybersecurity', aliases: ['lacework', 'lacework security'], keywords: ['cloud security', 'anomaly detection cloud', 'behavioral analytics security', 'devsecops cloud'], ikerScore: 78 },
  { id: 'snyk', name: 'Snyk', category: 'Global Cybersecurity', aliases: ['snyk', 'snyk.io', 'snyk security'], keywords: ['developer security', 'open source vulnerability', 'container security', 'iac security', 'supply chain security software'], ikerScore: 83 },
  { id: 'zscaler', name: 'Zscaler', category: 'Global Cybersecurity', aliases: ['zscaler', 'zscaler inc', 'zs security', 'zero trust exchange'], keywords: ['zero trust network access', 'cloud proxy', 'sase security', 'ztna', 'secure web gateway', 'cloud firewall'], ikerScore: 91 },
  { id: 'okta', name: 'Okta', category: 'Global Cybersecurity', aliases: ['okta', 'okta inc', 'okta identity', 'auth0'], keywords: ['identity management', 'single sign-on', 'mfa authentication', 'zero trust identity', 'workforce identity'], ikerScore: 88 },
  { id: 'rapid7', name: 'Rapid7', category: 'Global Cybersecurity', aliases: ['rapid7', 'rapid7 inc', 'insightvm', 'nexpose'], keywords: ['vulnerability management', 'penetration testing', 'detection response', 'threat exposure', 'managed detection'], ikerScore: 84 },
  { id: 'forcepoint', name: 'Forcepoint', category: 'Global Cybersecurity', aliases: ['forcepoint', 'forcepoint llc', 'websense', 'forcepoint dlp'], keywords: ['data loss prevention', 'insider threat', 'cloud access security', 'behavior analytics security', 'cross domain security'], ikerScore: 82 },
  { id: 'illumio', name: 'Illumio', category: 'Global Cybersecurity', aliases: ['illumio', 'illumio inc', 'zero trust segmentation'], keywords: ['zero trust segmentation', 'microsegmentation', 'lateral movement prevention', 'cloud segmentation', 'ransomware containment'], ikerScore: 81 },
  { id: 'exabeam', name: 'Exabeam', category: 'Global Cybersecurity', aliases: ['exabeam', 'exabeam security'], keywords: ['siem security', 'ueba analytics', 'threat detection platform', 'security analytics', 'behavioral detection'], ikerScore: 78 },
  { id: 'nozomi-networks', name: 'Nozomi Networks', category: 'Global Cybersecurity', aliases: ['nozomi', 'nozomi networks', 'nozomi guardian'], keywords: ['ot security', 'ics cybersecurity', 'industrial network security', 'operational technology monitoring', 'scada security'], ikerScore: 83 },
  { id: 'claroty', name: 'Claroty', category: 'Global Cybersecurity', aliases: ['claroty', 'claroty platform', 'medigate claroty'], keywords: ['ot security', 'ics visibility', 'industrial cybersecurity', 'healthcare iot security', 'connected device security'], ikerScore: 83 },
  { id: 'armis', name: 'Armis Security', category: 'Global Cybersecurity', aliases: ['armis', 'armis security', 'armis centrix'], keywords: ['asset intelligence', 'iot security', 'ot security platform', 'unmanaged device security', 'connected asset visibility'], ikerScore: 82 },
  { id: 'vectra-ai', name: 'Vectra AI', category: 'Global Cybersecurity', aliases: ['vectra ai', 'vectra networks', 'vectra cognito'], keywords: ['network detection response', 'ai threat detection', 'hybrid attack detection', 'identity threat detection'], ikerScore: 79 },
  { id: 'recorded-future', name: 'Recorded Future', category: 'Global Cybersecurity', aliases: ['recorded future', 'recorded future inc', 'insikt group'], keywords: ['threat intelligence', 'dark web monitoring', 'vulnerability intelligence', 'nation state tracking', 'geopolitical intelligence'], ikerScore: 87 },
  { id: 'mandiant', name: 'Mandiant', category: 'Global Cybersecurity', aliases: ['mandiant', 'fireeye mandiant', 'google mandiant'], keywords: ['incident response', 'threat intelligence', 'nation state attribution', 'apt tracking', 'breach investigation', 'red team'], ikerScore: 89 },

  // ══════════════════════════════════════════════════════════════════════
  // SEMICONDUCTORS & CHIPS
  // ══════════════════════════════════════════════════════════════════════

  { id: 'nvidia', name: 'NVIDIA', category: 'Semiconductor', aliases: ['nvidia', 'nvidia corporation', 'nvda', 'nvidia gpu', 'nvidia ai'], keywords: ['gpu computing', 'ai accelerator', 'h100 chip', 'dgx server', 'cuda platform', 'autonomous vehicle chip', 'data center gpu', 'generative ai hardware'], ikerScore: 99 },
  { id: 'intel-corp', name: 'Intel', category: 'Semiconductor', aliases: ['intel', 'intel corporation', 'intc', 'intel foundry'], keywords: ['x86 processor', 'data center cpu', 'gaudi ai accelerator', 'arc gpu', 'intel foundry services', 'manufacturing process node'], ikerScore: 95 },
  { id: 'amd-corp', name: 'AMD', category: 'Semiconductor', aliases: ['amd', 'advanced micro devices', 'amd cpu', 'epyc processor', 'instinct gpu'], keywords: ['epyc server chip', 'instinct mi300', 'ai accelerator', 'radeon gpu', 'data center processor', 'xilinx fpga'], ikerScore: 93 },
  { id: 'tsmc', name: 'TSMC', category: 'Semiconductor', aliases: ['tsmc', 'taiwan semiconductor', 'taiwan semiconductor manufacturing', 'tsm'], keywords: ['semiconductor foundry', '3nm chip', '2nm process', 'advanced node fabrication', 'chip manufacturing', 'fab capacity'], ikerScore: 98 },
  { id: 'qualcomm', name: 'Qualcomm', category: 'Semiconductor', aliases: ['qualcomm', 'qualcomm inc', 'qcom', 'snapdragon', 'qualcomm technologies'], keywords: ['snapdragon chip', '5g modem', 'ai edge computing', 'mobile processor', 'automotive chip', 'iot connectivity'], ikerScore: 92 },
  { id: 'broadcom', name: 'Broadcom', category: 'Semiconductor', aliases: ['broadcom', 'broadcom inc', 'avgo', 'broadcom vmware'], keywords: ['network chip', 'asic design', 'storage controller', 'wifi chip', 'data center networking', 'vmware cloud'], ikerScore: 90 },
  { id: 'marvell-tech', name: 'Marvell Technology', category: 'Semiconductor', aliases: ['marvell', 'marvell technology', 'mrvl'], keywords: ['data infrastructure chip', 'cloud networking', '5g semiconductor', 'custom asic', 'storage processor'], ikerScore: 84 },
  { id: 'micron-tech', name: 'Micron Technology', category: 'Semiconductor', aliases: ['micron', 'micron technology', 'mu stock', 'micron dram'], keywords: ['dram memory', 'nand flash', 'hbm memory', 'ai memory chip', 'high bandwidth memory', 'memory storage'], ikerScore: 88 },
  { id: 'samsung-semi', name: 'Samsung Semiconductor', category: 'Semiconductor', aliases: ['samsung semiconductor', 'samsung electronics', 'samsung foundry', 'samsung chip'], keywords: ['samsung dram', 'hbm3 memory', 'foundry services', 'exynos chip', 'nand flash samsung', '3nm process samsung'], ikerScore: 95 },
  { id: 'sk-hynix', name: 'SK Hynix', category: 'Semiconductor', aliases: ['sk hynix', 'sk hynix inc', 'hynix semiconductor'], keywords: ['hbm memory', 'dram production', 'ai memory', 'hbm3e chip', 'nand flash production'], ikerScore: 87 },
  { id: 'asml', name: 'ASML', category: 'Semiconductor', aliases: ['asml', 'asml holding', 'euv lithography', 'asml machines'], keywords: ['euv lithography', 'extreme ultraviolet', 'chip making machine', 'semiconductor equipment', 'next-gen lithography'], ikerScore: 97 },
  { id: 'applied-materials', name: 'Applied Materials', category: 'Semiconductor', aliases: ['applied materials', 'amat', 'applied materials inc'], keywords: ['semiconductor equipment', 'chip deposition', 'etch equipment', 'display technology', 'advanced packaging'], ikerScore: 91 },
  { id: 'lam-research', name: 'Lam Research', category: 'Semiconductor', aliases: ['lam research', 'lam research corporation', 'lrcx'], keywords: ['wafer fabrication equipment', 'etch deposition', 'cryogenic etch', 'advanced packaging tools', 'memory manufacturing'], ikerScore: 88 },
  { id: 'arm-holdings', name: 'Arm Holdings', category: 'Semiconductor', aliases: ['arm', 'arm holdings', 'arm architecture', 'arm chip design', 'armh'], keywords: ['risc architecture', 'mobile chip design', 'cpu ip licensing', 'ai chip architecture', 'cortex processor', 'arm server chip'], ikerScore: 94 },

  // ══════════════════════════════════════════════════════════════════════
  // ARTIFICIAL INTELLIGENCE & MACHINE LEARNING
  // ══════════════════════════════════════════════════════════════════════

  { id: 'openai', name: 'OpenAI', category: 'Global AI', aliases: ['openai', 'open ai', 'chatgpt maker', 'gpt-4', 'gpt-5', 'openai llc'], keywords: ['gpt-4', 'chatgpt', 'dall-e', 'whisper model', 'openai api', 'large language model', 'agi research', 'sora video ai'], ikerScore: 99 },
  { id: 'anthropic', name: 'Anthropic', category: 'Global AI', aliases: ['anthropic', 'anthropic pbc', 'claude ai', 'claude anthropic'], keywords: ['claude llm', 'constitutional ai', 'ai safety research', 'enterprise ai', 'claude 3'], ikerScore: 92 },
  { id: 'google-deepmind', name: 'Google DeepMind', category: 'Global AI', aliases: ['deepmind', 'google deepmind', 'alphabet ai', 'gemini ai', 'bard ai'], keywords: ['gemini model', 'alphafold', 'reinforcement learning', 'ai research google', 'protein structure', 'alphago'], ikerScore: 98 },
  { id: 'meta-ai', name: 'Meta AI', category: 'Global AI', aliases: ['meta ai', 'facebook ai research', 'fair lab', 'llama model', 'meta llama'], keywords: ['llama 3', 'open source llm', 'meta ai research', 'imagen', 'fair research', 'ai assistant meta'], ikerScore: 93 },
  { id: 'mistral-ai', name: 'Mistral AI', category: 'Global AI', aliases: ['mistral ai', 'mistral', 'mistral model', 'mixtral'], keywords: ['open source llm', 'mixtral model', 'european ai', 'le chat', 'mistral large'], ikerScore: 84 },
  { id: 'cohere', name: 'Cohere', category: 'Global AI', aliases: ['cohere', 'cohere inc', 'cohere nlp'], keywords: ['enterprise llm', 'command model', 'rag enterprise', 'text generation api', 'embed model'], ikerScore: 82 },
  { id: 'inflection-ai', name: 'Inflection AI', category: 'Global AI', aliases: ['inflection ai', 'inflection', 'pi chatbot'], keywords: ['pi ai assistant', 'personal ai', 'conversational ai'], ikerScore: 75 },
  { id: 'xai-grok', name: 'xAI', category: 'Global AI', aliases: ['xai', 'x.ai', 'grok ai', 'elon musk ai', 'grok chatbot'], keywords: ['grok llm', 'real-time ai', 'x platform ai', 'elon ai company'], ikerScore: 82 },
  { id: 'baidu-ai', name: 'Baidu AI', category: 'Global AI', aliases: ['baidu', 'baidu ai', 'ernie bot', 'wenxin', 'bidu'], keywords: ['ernie llm', 'chinese ai', 'autonomous driving ai', 'baidu cloud ai', 'wenxin model'], ikerScore: 88 },
  { id: 'alibaba-ai', name: 'Alibaba AI', category: 'Global AI', aliases: ['alibaba ai', 'tongyi', 'qwen model', 'alibaba damo academy'], keywords: ['qwen model', 'tongyi qianwen', 'alibaba cloud ai', 'chinese llm', 'damo academy'], ikerScore: 86 },
  { id: 'huawei-ai', name: 'Huawei AI', category: 'Global AI', aliases: ['huawei ai', 'pangu model', 'huawei ascend', 'huawei cloud ai'], keywords: ['pangu llm', 'ascend ai chip', 'mindspore framework', 'huawei cloud', 'chinese ai chip'], ikerScore: 85 },
  { id: 'scale-ai', name: 'Scale AI', category: 'Global AI', aliases: ['scale ai', 'scale ai inc', 'alexandr wang ai'], keywords: ['ai training data', 'data labeling', 'rlhf training', 'foundation model training', 'government ai', 'defense ai data'], ikerScore: 87 },
  { id: 'c3ai', name: 'C3.ai', category: 'Global AI', aliases: ['c3.ai', 'c3 ai', 'c3 artificial intelligence', 'ai enterprise'], keywords: ['enterprise ai applications', 'predictive maintenance ai', 'defense ai', 'supply chain ai', 'fraud detection ai'], ikerScore: 82 },
  { id: 'palantir', name: 'Palantir Technologies', category: 'Global Defense', aliases: ['palantir', 'palantir technologies', 'pltr', 'palantir aip', 'gotham platform'], keywords: ['gotham intelligence platform', 'foundry data platform', 'aip ai platform', 'defense analytics', 'government data', 'battlefield ai'], ikerScore: 96 },

  // ══════════════════════════════════════════════════════════════════════
  // ROBOTICS — GLOBAL
  // ══════════════════════════════════════════════════════════════════════

  { id: 'boston-dynamics', name: 'Boston Dynamics', category: 'Global Robotics', aliases: ['boston dynamics', 'boston dynamics spot', 'spot robot', 'atlas robot', 'stretch robot'], keywords: ['spot quadruped', 'atlas humanoid', 'stretch warehouse', 'legged robot', 'inspection robot', 'mobile manipulation'], ikerScore: 94 },
  { id: 'boston-dynamics-2', name: 'Figure AI', category: 'Global Robotics', aliases: ['figure ai', 'figure robot', 'figure humanoid'], keywords: ['humanoid robot', 'bipedal robot', 'openai humanoid', 'warehouse humanoid', 'general purpose robot'], ikerScore: 85 },
  { id: 'agility-robotics', name: 'Agility Robotics', category: 'Global Robotics', aliases: ['agility robotics', 'digit robot', 'agility digit'], keywords: ['digit humanoid', 'bipedal humanoid', 'warehouse robot walking', 'amazon humanoid'], ikerScore: 82 },
  { id: '1x-technologies', name: '1X Technologies', category: 'Global Robotics', aliases: ['1x technologies', 'eve robot', '1x neo', 'halodi robotics'], keywords: ['humanoid robot', 'android robot', 'industrial humanoid', 'physical ai'], ikerScore: 78 },
  { id: 'apptronik', name: 'Apptronik', category: 'Global Robotics', aliases: ['apptronik', 'apollo robot apptronik', 'nasa robotics spin'], keywords: ['apollo humanoid', 'space robotics', 'nasa robot spinoff', 'construction robot'], ikerScore: 76 },
  { id: 'fanuc-corp', name: 'Fanuc', category: 'Global Robotics', aliases: ['fanuc', 'fanuc corporation', 'fanuc america', 'fanuc robot'], keywords: ['industrial robot arm', 'cnc machine', 'collaborative robot fanuc', 'robot controller', 'factory automation'], ikerScore: 93 },
  { id: 'kuka-ag', name: 'KUKA', category: 'Global Robotics', aliases: ['kuka', 'kuka ag', 'kuka robotics', 'midea kuka'], keywords: ['kuka robot arm', 'industrial automation germany', 'collaborative robot kuka', 'welding robot', 'automotive robot'], ikerScore: 91 },
  { id: 'universal-robots', name: 'Universal Robots', category: 'Global Robotics', aliases: ['universal robots', 'ur robots', 'ur5 robot', 'cobot universal', 'teradyne ur'], keywords: ['collaborative robot', 'cobot arm', 'easy programming robot', 'flexible automation', 'ur5 ur10'], ikerScore: 88 },
  { id: 'yaskawa-electric', name: 'Yaskawa Electric', category: 'Global Robotics', aliases: ['yaskawa', 'yaskawa electric', 'yaskawa motoman', 'motoman robot'], keywords: ['motoman robot', 'servo drive', 'industrial robot japan', 'welding robot yaskawa', 'motion control'], ikerScore: 87 },
  { id: 'staubli', name: 'Stäubli', category: 'Global Robotics', aliases: ['stäubli', 'staubli', 'staubli robotics'], keywords: ['precision robot arm', 'clean room robot', 'fast pick robot', 'connector systems', 'textile machine'], ikerScore: 80 },
  { id: 'omron-robotics', name: 'OMRON Robotics', category: 'Global Robotics', aliases: ['omron robotics', 'omron automation', 'omron mobile robot', 'ld mobile robot'], keywords: ['mobile robot amr', 'autonomous mobile', 'industrial automation omron', 'vision inspection omron'], ikerScore: 82 },
  { id: 'autostore-system', name: 'AutoStore', category: 'Warehouse Automation', aliases: ['autostore', 'auto store', 'autostore system', 'autostore grid'], keywords: ['cube storage automation', 'grid robot warehouse', 'automated storage retrieval', 'robotic fulfillment'], ikerScore: 87 },
  { id: 'locus-robotics', name: 'Locus Robotics', category: 'Warehouse Automation', aliases: ['locus robotics', 'locus robot', 'locusbot'], keywords: ['warehouse amr', 'order fulfillment robot', 'pick assist robot', 'distribution center robot'], ikerScore: 83 },
  { id: 'greyorange', name: 'GreyOrange', category: 'Warehouse Automation', aliases: ['greyorange', 'grey orange', 'ranger robot', 'butler robot greyorange'], keywords: ['fulfillment robot', 'warehouse ai', 'sortation robot', 'picking robot', 'last-mile fulfillment'], ikerScore: 80 },
  { id: 'geekplus', name: 'Geek+', category: 'Warehouse Automation', aliases: ['geek+', 'geekplus', 'geek plus robotics', 'goods-to-person robot'], keywords: ['goods to person robot', 'amr warehouse china', 'sorting robot', 'mobile shelving robot'], ikerScore: 82 },
  { id: 'six-river-systems', name: '6 River Systems', category: 'Warehouse Automation', aliases: ['6 river systems', 'six river systems', 'chuck robot shopify'], keywords: ['chuck robot', 'collaborative fulfillment', 'voice picking robot', 'warehouse collaboration'], ikerScore: 79 },
  { id: 'berkshire-grey', name: 'Berkshire Grey', category: 'Warehouse Automation', aliases: ['berkshire grey', 'berkshire grey inc'], keywords: ['piece picking robot', 'parcel sortation', 'retail fulfillment automation', 'ai-powered picking'], ikerScore: 77 },
  { id: 'symbotic', name: 'Symbotic', category: 'Warehouse Automation', aliases: ['symbotic', 'symbotic inc', 'walmart automation', 'symbot'], keywords: ['warehouse robotics system', 'symbot robot', 'automated distribution', 'walmart fulfillment robot'], ikerScore: 83 },

  // ══════════════════════════════════════════════════════════════════════
  // DRONES & AUTONOMOUS SYSTEMS
  // ══════════════════════════════════════════════════════════════════════

  { id: 'dji', name: 'DJI', category: 'Drone & Autonomy', aliases: ['dji', 'dji drone', 'da jiang innovations', 'mavic drone', 'phantom drone'], keywords: ['consumer drone', 'enterprise drone', 'fpv racing', 'agricultural drone', 'inspection drone', 'matrice drone'], ikerScore: 90 },
  { id: 'skydio', name: 'Skydio', category: 'Drone & Autonomy', aliases: ['skydio', 'skydio drone', 'skydio x10'], keywords: ['autonomous drone', 'ai powered drone', 'infrastructure inspection drone', 'defense drone usa', 'obstacle avoidance drone'], ikerScore: 83 },
  { id: 'zipline-drone', name: 'Zipline', category: 'Drone & Autonomy', aliases: ['zipline', 'zipline drone', 'zipline delivery', 'zipline medical'], keywords: ['medical delivery drone', 'last-mile drone delivery', 'healthcare drone logistics', 'autonomous delivery zip'], ikerScore: 80 },
  { id: 'wing-alphabet', name: 'Wing (Alphabet)', category: 'Drone & Autonomy', aliases: ['wing', 'wing aviation', 'google wing', 'alphabet wing drone'], keywords: ['drone delivery alphabet', 'urban delivery drone', 'faa drone approval'], ikerScore: 78 },
  { id: 'joby-aviation-2', name: 'Joby Aviation', category: 'Drone & Autonomy', aliases: ['joby aviation', 'joby'], keywords: ['evtol aircraft', 'electric air taxi', 'urban air mobility', 'autonomous aviation'], ikerScore: 78 },
  { id: 'wingscopex', name: 'Wingcopter', category: 'Drone & Autonomy', aliases: ['wingcopter', 'wingcopter drone', 'tiltrotor delivery'], keywords: ['tiltrotor drone', 'medical drone delivery', 'last mile drone', 'hybrid drone'], ikerScore: 72 },
  { id: 'firestorm-labs', name: 'Sarcos Technology', category: 'Drone & Autonomy', aliases: ['sarcos', 'sarcos robotics', 'guardian xo', 'exoskeleton'], keywords: ['powered exoskeleton', 'industrial exosuit', 'military exoskeleton', 'robotic exosuit'], ikerScore: 74 },

  // ══════════════════════════════════════════════════════════════════════
  // COMPUTER VISION & SENSORS
  // ══════════════════════════════════════════════════════════════════════

  { id: 'keyence', name: 'Keyence', category: 'Computer Vision', aliases: ['keyence', 'keyence corporation', 'keyence sensor', 'keyence laser'], keywords: ['industrial sensor', 'vision system', 'barcode scanner', 'laser measurement', 'microscope digital', 'safety sensor'], ikerScore: 92 },
  { id: 'cognex', name: 'Cognex', category: 'Computer Vision', aliases: ['cognex', 'cognex corporation', 'cognex vision', 'dataman reader'], keywords: ['machine vision system', 'vision sensor', 'barcode reading', 'inspection vision', 'id reader factory'], ikerScore: 89 },
  { id: 'teledyne-flir', name: 'Teledyne FLIR', category: 'Computer Vision', aliases: ['teledyne flir', 'flir systems', 'flir thermal', 'teledyne technologies'], keywords: ['thermal imaging', 'infrared camera', 'surveillance camera', 'border detection camera', 'military thermal'], ikerScore: 88 },
  { id: 'basler-ag', name: 'Basler', category: 'Computer Vision', aliases: ['basler', 'basler ag', 'basler camera'], keywords: ['industrial camera', 'machine vision camera', 'area scan camera', 'line scan camera'], ikerScore: 81 },
  { id: 'landing-ai', name: 'Landing AI', category: 'Computer Vision', aliases: ['landing ai', 'landingai', 'andrew ng ai', 'visual ai'], keywords: ['visual ai inspection', 'computer vision platform', 'manufacturing ai inspection', 'landinglens'], ikerScore: 82 },
  { id: 'zebra-tech', name: 'Zebra Technologies', category: 'Computer Vision', aliases: ['zebra technologies', 'zebra tech', 'zbra', 'zebra barcode'], keywords: ['barcode printer', 'rfid systems', 'mobile computers warehouse', 'label printing', 'inventory tracking'], ikerScore: 85 },
  { id: 'isra-vision', name: 'ISRA Vision', category: 'Computer Vision', aliases: ['isra vision', 'isra', 'isra vision ag'], keywords: ['surface inspection system', 'automated optical inspection', '3d measurement', 'automotive vision'], ikerScore: 78 },
  { id: 'viavi-solutions', name: 'Viavi Solutions', category: 'Computer Vision', aliases: ['viavi', 'viavi solutions', 'jdsu'], keywords: ['optical inspection', 'network test', 'fiber optic measurement', 'anti-counterfeiting'], ikerScore: 76 },

  // ══════════════════════════════════════════════════════════════════════
  // SPACE TECH
  // ══════════════════════════════════════════════════════════════════════

  { id: 'spacex', name: 'SpaceX', category: 'Global Defense', aliases: ['spacex', 'space exploration technologies', 'starlink', 'elon musk rocket', 'falcon 9', 'starship rocket'], keywords: ['falcon 9 launch', 'starship mega rocket', 'starlink satellite internet', 'reusable rocket', 'nasa artemis', 'crewed spaceflight'], ikerScore: 98 },
  { id: 'blue-origin', name: 'Blue Origin', category: 'Global Defense', aliases: ['blue origin', 'new shepard', 'new glenn rocket', 'jeff bezos rocket'], keywords: ['new glenn rocket', 'lunar lander blue', 'space tourism', 'orbital rocket', 'be-4 engine'], ikerScore: 88 },
  { id: 'rocket-lab', name: 'Rocket Lab', category: 'Global Defense', aliases: ['rocket lab', 'rklb', 'electron rocket', 'neutron rocket'], keywords: ['small satellite launch', 'electron vehicle', 'photon spacecraft', 'neutron reusable rocket'], ikerScore: 83 },
  { id: 'planet-labs', name: 'Planet Labs', category: 'Global Defense', aliases: ['planet labs', 'planet.com', 'planet satellite', 'planetscope'], keywords: ['earth observation satellite', 'daily satellite imagery', 'smallsat constellation', 'geospatial analytics'], ikerScore: 84 },
  { id: 'maxar-tech', name: 'Maxar Technologies', category: 'Global Defense', aliases: ['maxar', 'maxar technologies', 'digitalglobe', 'worldview satellite'], keywords: ['satellite imagery', 'geospatial intelligence', 'earth observation defense', 'worldview constellation'], ikerScore: 85 },
  { id: 'airbus-space', name: 'Airbus Defence Space', category: 'Global Defense', aliases: ['airbus space', 'astrium', 'airbus intelligence'], keywords: ['pleiades satellite', 'earth observation airbus', 'military communication satellite', 'sar satellite'], ikerScore: 88 },
  { id: 'oneweb', name: 'OneWeb', category: 'Global Defense', aliases: ['oneweb', 'oneweb satellite', 'eutelsat oneweb'], keywords: ['low earth orbit broadband', 'leo satellite constellation', 'global internet satellite'], ikerScore: 80 },
  { id: 'iceye', name: 'ICEYE', category: 'Global Defense', aliases: ['iceye', 'iceye satellite', 'sar satellite iceye'], keywords: ['sar satellite', 'radar imaging satellite', 'persistent monitoring', 'all-weather surveillance'], ikerScore: 81 },

  // ══════════════════════════════════════════════════════════════════════
  // INDUSTRIAL AI & MANUFACTURING TECH
  // ══════════════════════════════════════════════════════════════════════

  { id: 'c3ai-industrial', name: 'SparkCognition', category: 'Industrial AI', aliases: ['sparkcognition', 'sparkcognition industrial ai', 'darwin ai', 'generative ai industrial'], keywords: ['industrial ai analytics', 'predictive maintenance ai', 'ai energy', 'defense ai ml', 'turbine ai'], ikerScore: 81 },
  { id: 'aspentech', name: 'AspenTech', category: 'Industrial AI', aliases: ['aspentech', 'aspen technology', 'aspen plus', 'aspenone'], keywords: ['process optimization', 'digital twin plant', 'aspen dmcplus', 'refinery optimization', 'chemical plant ai'], ikerScore: 82 },
  { id: 'sight-machine', name: 'Sight Machine', category: 'Industrial AI', aliases: ['sight machine', 'sightmachine', 'manufacturing analytics'], keywords: ['factory analytics', 'manufacturing ai', 'process intelligence', 'quality ai factory'], ikerScore: 77 },
  { id: 'augury', name: 'Augury', category: 'Industrial AI', aliases: ['augury', 'augury inc', 'machine health ai'], keywords: ['machine health monitoring', 'vibration analysis', 'predictive maintenance sensor', 'ai asset monitoring'], ikerScore: 79 },
  { id: 'uptake', name: 'Uptake Technologies', category: 'Industrial AI', aliases: ['uptake', 'uptake technologies', 'uptake industrial ai'], keywords: ['industrial ai asset', 'predictive analytics equipment', 'condition monitoring', 'fleet intelligence'], ikerScore: 76 },
  { id: 'ptc-inc', name: 'PTC Inc', category: 'Industrial AI', aliases: ['ptc', 'ptc inc', 'windchill plm', 'thingworx iot'], keywords: ['product lifecycle management', 'iot platform thingworx', 'augmented reality vuforia', 'digital twin ptc', 'cad software'], ikerScore: 84 },
  { id: 'dassault-systemes', name: 'Dassault Systèmes', category: 'Industrial AI', aliases: ['dassault systemes', '3ds', 'catia cad', 'solidworks', 'simulia'], keywords: ['catia design', 'solidworks 3d', '3dexperience platform', 'simulation software', 'digital twin automotive'], ikerScore: 88 },
  { id: 'hexagon-ab', name: 'Hexagon AB', category: 'Industrial AI', aliases: ['hexagon', 'hexagon ab', 'hexagon manufacturing', 'leica geosystems'], keywords: ['metrology systems', 'coordinate measuring machine', 'manufacturing intelligence', 'geospatial solutions', 'autonomous reality capture'], ikerScore: 85 },

  // ══════════════════════════════════════════════════════════════════════
  // ENERGY TECH
  // ══════════════════════════════════════════════════════════════════════

  { id: 'schneider-electric', name: 'Schneider Electric', category: 'Energy Intelligence', aliases: ['schneider electric', 'schneider', 'se energy', 'aveva schneider'], keywords: ['energy management', 'smart grid', 'building automation', 'industrial control', 'data center power', 'microgrid'], ikerScore: 90 },
  { id: 'siemens-energy', name: 'Siemens Energy', category: 'Energy Intelligence', aliases: ['siemens energy', 'siemens energy ag', 'gamesa turbine'], keywords: ['wind turbine', 'power generation', 'gas turbine', 'grid stabilization', 'hydrogen energy', 'energy transition'], ikerScore: 87 },
  { id: 'vestas', name: 'Vestas', category: 'Energy Intelligence', aliases: ['vestas', 'vestas wind systems', 'vestas turbine'], keywords: ['wind energy', 'offshore wind turbine', 'wind farm', 'renewable energy'], ikerScore: 85 },
  { id: 'nextracker', name: 'Nextracker', category: 'Energy Intelligence', aliases: ['nextracker', 'nxt solar tracker', 'solar tracking system'], keywords: ['solar tracker', 'single-axis tracker', 'utility solar', 'bifacial solar'], ikerScore: 80 },
  { id: 'fluence-energy', name: 'Fluence Energy', category: 'Energy Intelligence', aliases: ['fluence', 'fluence energy', 'abb siemens battery'], keywords: ['battery energy storage', 'grid scale battery', 'energy storage system', 'bess'], ikerScore: 79 },
  { id: 'opower', name: 'Oracle Energy & Water', category: 'Energy Intelligence', aliases: ['oracle utilities', 'opower', 'oracle energy'], keywords: ['utility software', 'smart meter analytics', 'energy engagement', 'grid management software'], ikerScore: 76 },
  { id: 'itron', name: 'Itron', category: 'Energy Intelligence', aliases: ['itron', 'itron inc', 'smart meter itron'], keywords: ['smart meter', 'ami system', 'utility analytics', 'water meter', 'grid edge intelligence'], ikerScore: 82 },
  { id: 'landis-gyr', name: 'Landis+Gyr', category: 'Energy Intelligence', aliases: ['landis gyr', 'landis+gyr', 'landis & gyr'], keywords: ['smart metering', 'electricity meter', 'head-end system', 'energy data management'], ikerScore: 80 },

  // ══════════════════════════════════════════════════════════════════════
  // SUPPLY CHAIN & LOGISTICS PLATFORMS
  // ══════════════════════════════════════════════════════════════════════

  { id: 'blue-yonder', name: 'Blue Yonder', category: 'Supply Chain Software', aliases: ['blue yonder', 'jda software', 'blue yonder panasonic'], keywords: ['supply chain planning', 'demand forecasting', 'transportation management', 'warehouse management system', 'order management'], ikerScore: 85 },
  { id: 'o9-solutions', name: 'o9 Solutions', category: 'Supply Chain Software', aliases: ['o9 solutions', 'o9', 'o9 supply chain'], keywords: ['integrated business planning', 'demand sensing', 'supply chain control tower', 'scenario planning supply'], ikerScore: 80 },
  { id: 'kinaxis', name: 'Kinaxis', category: 'Supply Chain Software', aliases: ['kinaxis', 'kinaxis inc', 'rapidresponse kinaxis'], keywords: ['supply chain orchestration', 'rapid response planning', 'concurrent planning', 'supply chain resilience'], ikerScore: 79 },
  { id: 'fourkites', name: 'FourKites', category: 'Supply Chain Software', aliases: ['fourkites', 'four kites', 'fourkites visibility'], keywords: ['supply chain visibility', 'shipment tracking', 'eta prediction', 'freight intelligence'], ikerScore: 78 },
  { id: 'project44', name: 'project44', category: 'Supply Chain Software', aliases: ['project44', 'project 44', 'p44 supply'], keywords: ['supply chain visibility platform', 'carrier connectivity', 'freight tracking', 'ocean visibility'], ikerScore: 78 },
  { id: 'flexport', name: 'Flexport', category: 'Supply Chain Software', aliases: ['flexport', 'flexport freight', 'flexport logistics'], keywords: ['digital freight forwarder', 'customs brokerage', 'ocean freight', 'supply chain software'], ikerScore: 80 },
  { id: 'stord', name: 'Stord', category: 'Supply Chain Software', aliases: ['stord', 'stord fulfillment'], keywords: ['cloud supply chain', 'fulfillment platform', 'distributed warehousing'], ikerScore: 72 },

  // ══════════════════════════════════════════════════════════════════════
  // HEALTH TECH & BIOTECH
  // ══════════════════════════════════════════════════════════════════════

  { id: 'medtronic', name: 'Medtronic', category: 'Health Tech', aliases: ['medtronic', 'medtronic plc', 'medtronic device'], keywords: ['medical device', 'cardiac monitoring', 'surgical robot', 'insulin pump', 'spinal implant', 'deep brain stimulation'], ikerScore: 88 },
  { id: 'abbott-labs', name: 'Abbott Laboratories', category: 'Health Tech', aliases: ['abbott', 'abbott laboratories', 'abbott diagnostics', 'libre glucose'], keywords: ['diagnostics point care', 'continuous glucose monitor', 'cardiac monitoring', 'rapid test', 'vascular device'], ikerScore: 86 },
  { id: 'philips-health', name: 'Philips Healthcare', category: 'Health Tech', aliases: ['philips healthcare', 'philips health', 'royal philips', 'philips medical'], keywords: ['mri machine', 'patient monitoring', 'ultrasound system', 'icu monitoring', 'remote patient care'], ikerScore: 87 },
  { id: 'siemens-healthineers', name: 'Siemens Healthineers', category: 'Health Tech', aliases: ['siemens healthineers', 'siemens medical', 'syngo platform'], keywords: ['ct scanner', 'pet scan', 'lab diagnostics', 'digital health', 'ai radiology', 'molecular diagnostics'], ikerScore: 89 },
  { id: 'intuitive-surgical', name: 'Intuitive Surgical', category: 'Health Tech', aliases: ['intuitive surgical', 'da vinci robot', 'isrg', 'davinci surgery'], keywords: ['surgical robot', 'da vinci system', 'minimally invasive surgery', 'robotic surgery'], ikerScore: 90 },
  { id: 'moderna', name: 'Moderna', category: 'Health Tech', aliases: ['moderna', 'moderna inc', 'moderna mrna'], keywords: ['mrna vaccine', 'mrna therapeutics', 'covid vaccine', 'cancer vaccine', 'personalized medicine'], ikerScore: 85 },
  { id: 'tempus-ai', name: 'Tempus AI', category: 'Health Tech', aliases: ['tempus ai', 'tempus', 'tempus labs'], keywords: ['ai diagnostics', 'precision medicine', 'genomic analysis', 'oncology ai', 'clinical data platform'], ikerScore: 80 },

  // ══════════════════════════════════════════════════════════════════════
  // CLOUD & ENTERPRISE TECH
  // ══════════════════════════════════════════════════════════════════════

  { id: 'aws', name: 'Amazon Web Services', category: 'Global AI', aliases: ['aws', 'amazon web services', 'amazon cloud', 'amazon ec2', 'amazon s3'], keywords: ['cloud computing', 'serverless computing', 'ml services aws', 'cloud storage', 'bedrock ai aws', 'govcloud'], ikerScore: 97 },
  { id: 'microsoft-azure', name: 'Microsoft Azure', category: 'Global AI', aliases: ['microsoft azure', 'azure cloud', 'msft cloud', 'azure openai'], keywords: ['azure cloud services', 'azure openai service', 'copilot enterprise', 'azure government', 'azure arc', 'microsoft 365'], ikerScore: 97 },
  { id: 'google-cloud', name: 'Google Cloud', category: 'Global AI', aliases: ['google cloud', 'gcp', 'google cloud platform', 'vertex ai'], keywords: ['vertex ai', 'google cloud ai', 'bigquery analytics', 'kubernetes engine', 'apigee platform', 'cloud spanner'], ikerScore: 94 },
  { id: 'oracle-cloud', name: 'Oracle Cloud', category: 'Global AI', aliases: ['oracle cloud', 'oci', 'oracle infrastructure', 'oracle database'], keywords: ['oracle database cloud', 'oci compute', 'erp cloud oracle', 'autonomous database', 'oracle fusion'], ikerScore: 88 },
  { id: 'servicenow', name: 'ServiceNow', category: 'Global AI', aliases: ['servicenow', 'now platform', 'servicenow itil'], keywords: ['it service management', 'workflow automation', 'enterprise platform', 'ai operations', 'digital workflows'], ikerScore: 87 },
  { id: 'salesforce', name: 'Salesforce', category: 'Global AI', aliases: ['salesforce', 'salesforce inc', 'crm platform', 'einstein ai', 'slack salesforce'], keywords: ['crm platform', 'einstein ai', 'sales cloud', 'service cloud', 'mulesoft integration'], ikerScore: 89 },

  // ══════════════════════════════════════════════════════════════════════
  // TELECOM & CONNECTIVITY
  // ══════════════════════════════════════════════════════════════════════

  { id: 'ericsson', name: 'Ericsson', category: 'Manufacturing Tech', aliases: ['ericsson', 'ericsson telecom', 'lm ericsson', 'telefonaktiebolaget ericsson'], keywords: ['5g network', 'telecom equipment', 'radio access network', 'core network', '5g private network', 'open ran'], ikerScore: 88 },
  { id: 'nokia-networks', name: 'Nokia Networks', category: 'Manufacturing Tech', aliases: ['nokia', 'nokia networks', 'nokia bell labs', 'nokia solutions networks'], keywords: ['5g infrastructure', 'open ran', 'private 5g', 'network software', 'air defense radar nokia'], ikerScore: 87 },
  { id: 'cisco-systems', name: 'Cisco Systems', category: 'Global Cybersecurity', aliases: ['cisco', 'cisco systems', 'csco', 'cisco networking', 'webex'], keywords: ['network switch', 'routing equipment', 'network security', 'zero trust cisco', 'unified communications', 'industrial iot cisco'], ikerScore: 90 },

  // ══════════════════════════════════════════════════════════════════════
  // EMERGING / HIGH-GROWTH
  // ══════════════════════════════════════════════════════════════════════

  { id: 'relativity-space', name: 'Relativity Space', category: 'Global Defense', aliases: ['relativity space', 'terran rocket', '3d printed rocket'], keywords: ['3d printed rocket', 'terran r rocket', 'additive manufacturing rocket', 'methane rocket'], ikerScore: 79 },
  { id: 'true-anomaly', name: 'True Anomaly', category: 'Global Defense', aliases: ['true anomaly', 'true anomaly spacecraft', 'jackal spacecraft'], keywords: ['space domain awareness', 'satellite inspector', 'orbital warfare', 'space surveillance'], ikerScore: 78 },
  { id: 'sievert-defense', name: 'Epirus', category: 'Global Defense', aliases: ['epirus', 'epirus systems', 'leonidas drone counter'], keywords: ['high power microwave', 'counter drone directed energy', 'leonidas system', 'electronic warfare'], ikerScore: 80 },
  { id: 'vannevar-labs', name: 'Vannevar Labs', category: 'Global Defense', aliases: ['vannevar labs', 'vannevar', 'vannevar ai defense'], keywords: ['ai defense analytics', 'geospatial ai', 'battlefield intelligence', 'defense software'], ikerScore: 77 },
  { id: 'rebellion-defense', name: 'Rebellion Defense', category: 'Global Defense', aliases: ['rebellion defense', 'rebellion', 'rebellion ai dod'], keywords: ['ai defense platform', 'ml defense analytics', 'dod digital transformation', 'counter threat ai'], ikerScore: 76 },
  { id: 'hadrian', name: 'Hadrian', category: 'Manufacturing Tech', aliases: ['hadrian', 'hadrian automation', 'cnc factory automation'], keywords: ['autonomous factory', 'cnc machining ai', 'defense parts manufacturing', 'precision machining startup'], ikerScore: 78 },
  { id: 'velo3d', name: 'Velo3D', category: 'Manufacturing Tech', aliases: ['velo3d', 'velo 3d', 'sapphire printer', 'metal 3d printing'], keywords: ['metal additive manufacturing', 'aerospace 3d printing', '3d printed metal parts', 'complex geometry manufacturing'], ikerScore: 77 },
  { id: 'markforged', name: 'Markforged', category: 'Manufacturing Tech', aliases: ['markforged', 'mark forged', 'digital forge', 'continuous fiber printing'], keywords: ['3d printing industrial', 'continuous fiber reinforcement', 'metal 3d printing', 'defense spare parts'], ikerScore: 76 },

  // ══════════════════════════════════════════════════════════════════════
  // MIDDLE EAST — UAE, Saudi Arabia, Israel (expanded)
  // ══════════════════════════════════════════════════════════════════════

  { id: 'edge-group', name: 'EDGE Group', category: 'Global Defense', aliases: ['edge group', 'edge uae', 'edge defense uae', 'caracal uae'], keywords: ['uae defense technology', 'autonomous weapons uae', 'unmanned systems uae', 'smart weapon emirates'], ikerScore: 82 },
  { id: 'g42-ai', name: 'G42', category: 'Global AI', aliases: ['g42', 'g42 ai', 'group 42', 'g42 healthcare', 'g42 cloud uae'], keywords: ['uae artificial intelligence', 'sovereign ai uae', 'abu dhabi ai', 'g42 microsoft partnership', 'llm arabic'], ikerScore: 84 },
  { id: 'presight-ai', name: 'Presight AI', category: 'Global AI', aliases: ['presight', 'presight ai', 'presight abu dhabi'], keywords: ['surveillance ai uae', 'smart city analytics uae', 'crime prediction ai', 'citywide surveillance analytics'], ikerScore: 75 },
  { id: 'stc-saudi', name: 'Saudi Telecom (STC)', category: 'Global Cybersecurity', aliases: ['stc', 'saudi telecom', 'stc cybersecurity', 'help ag'], keywords: ['saudi 5g', 'saudi telecom security', 'cybersecurity saudi', 'neom connectivity', 'saudi cloud'], ikerScore: 76 },
  { id: 'aramco-digital', name: 'Aramco Digital', category: 'Energy Intelligence', aliases: ['aramco digital', 'saudi aramco digital', 'aramco ai', 'iktva'], keywords: ['oil field ai', 'petrochemical ai', 'energy iot saudi', 'oilfield robotics', 'upstream digital twin'], ikerScore: 83 },
  { id: 'wiz-cloud', name: 'Wiz', category: 'Global Cybersecurity', aliases: ['wiz', 'wiz cloud security', 'wiz inc', 'wiz cnapp'], keywords: ['cloud security posture', 'cnapp platform', 'cloud vulnerability', 'agentless security', 'cloud native security'], ikerScore: 89 },
  { id: 'sygnia-cyber', name: 'Sygnia', category: 'Global Cybersecurity', aliases: ['sygnia', 'sygnia cyber', 'sygnia incident response'], keywords: ['cyber incident response', 'nation state attack response', 'threat hunting', 'red team cyber'], ikerScore: 78 },
  { id: 'cognyte', name: 'Cognyte', category: 'Global Cybersecurity', aliases: ['cognyte', 'cognyte software', 'verint security division'], keywords: ['osint platform', 'intelligence analytics', 'crime analytics', 'investigative analytics'], ikerScore: 77 },
  { id: 'imi-systems', name: 'IMI Systems', category: 'Global Defense', aliases: ['imi systems', 'elbit imi', 'israel military industries'], keywords: ['artillery system israel', 'mortar system', 'infantry weapon israel', 'active protection system'], ikerScore: 79 },

  // ══════════════════════════════════════════════════════════════════════
  // SOUTHEAST ASIA — Singapore, Vietnam, Indonesia, Thailand, Malaysia
  // ══════════════════════════════════════════════════════════════════════

  { id: 'sea-group', name: 'Sea Group', category: 'Global Supply Chain', aliases: ['sea group', 'sea limited', 'shopee', 'garena', 'seamoney'], keywords: ['southeast asia ecommerce', 'digital payments sea', 'logistics southeast asia', 'shopee logistics'], ikerScore: 80 },
  { id: 'grab-holdings', name: 'Grab', category: 'Global Supply Chain', aliases: ['grab', 'grab holdings', 'grabfood', 'grabexpress logistics'], keywords: ['southeast asia delivery', 'last mile sea', 'ride hailing logistics', 'super app logistics'], ikerScore: 78 },
  { id: 'singtel', name: 'Singtel', category: 'Global Cybersecurity', aliases: ['singtel', 'singapore telecom', 'trustwave singtel', 'ncs singtel'], keywords: ['singapore 5g security', 'managed security services asia', 'telecom cybersecurity apac', 'singtel optus'], ikerScore: 76 },
  { id: 'st-engineering', name: 'ST Engineering', category: 'Global Defense', aliases: ['st engineering', 'singapore technologies engineering', 'stee', 'vie aerospace'], keywords: ['singapore defense contractor', 'satellite communication singapore', 'urban solutions', 'autonomous vehicle singapore', 'military vehicle'], ikerScore: 81 },
  { id: 'dsta-singapore', name: 'DSTA Singapore', category: 'Global Defense', aliases: ['dsta', 'defence science technology agency', 'singapore defence'], keywords: ['singapore defense procurement', 'rsaf technology', 'singapore armed forces tech', 'naval defense singapore'], ikerScore: 73 },
  { id: 'viettel-cyber', name: 'Viettel Cybersecurity', category: 'Global Cybersecurity', aliases: ['viettel', 'viettel cyber', 'vcslab', 'viettel cybersecurity'], keywords: ['vietnam cybersecurity', 'southeast asia threat intel', 'vietnamese apt', 'viettel pentest'], ikerScore: 70 },
  { id: 'myeg-services', name: 'MyEG', category: 'Enterprise', aliases: ['myeg', 'myeg services', 'malaysia egovernment'], keywords: ['malaysia digital government', 'egovernment services', 'digital id malaysia', 'blockchain government asia'], ikerScore: 65 },

  // ══════════════════════════════════════════════════════════════════════
  // SOUTH AMERICA — Brazil, Colombia, Chile, Argentina
  // ══════════════════════════════════════════════════════════════════════

  { id: 'embraer-defense', name: 'Embraer Defense', category: 'Global Defense', aliases: ['embraer', 'embraer defense', 'embraer security', 'embraer kc390'], keywords: ['brazil military aircraft', 'kc390 tanker', 'a-29 super tucano', 'defense aviation brazil', 'eve evtol'], ikerScore: 83 },
  { id: 'totvs', name: 'TOTVS', category: 'Enterprise', aliases: ['totvs', 'totvs brazil', 'rm totvs', 'protheus totvs'], keywords: ['brazil erp', 'latin america enterprise software', 'smb software brazil', 'fluig platform'], ikerScore: 72 },
  { id: 'weg-automation', name: 'WEG', category: 'Industrial Automation', aliases: ['weg', 'weg sa', 'weg electric', 'weg automation'], keywords: ['electric motor brazil', 'industrial automation brazil', 'energy efficiency motor', 'weg drives'], ikerScore: 75 },
  { id: 'stefanini-group', name: 'Stefanini', category: 'Enterprise', aliases: ['stefanini', 'stefanini group', 'stefanini it'], keywords: ['it services latam', 'digital transformation brazil', 'managed services latin america', 'stefanini ai'], ikerScore: 70 },
  { id: 'lulo-bank', name: 'Rappi', category: 'Global Supply Chain', aliases: ['rappi', 'rappi delivery', 'rappi colombia'], keywords: ['latin america delivery', 'last mile latam', 'quick commerce colombia', 'rappi drone delivery'], ikerScore: 68 },
  { id: 'mercadolibre-tech', name: 'MercadoLibre', category: 'Global Supply Chain', aliases: ['mercadolibre', 'meli', 'mercado libre', 'mercadopago', 'mercado envios'], keywords: ['latam logistics', 'latin america fulfillment', 'ecommerce brazil argentina', 'mercadopago fintech'], ikerScore: 82 },

  // ══════════════════════════════════════════════════════════════════════
  // EASTERN EUROPE — Poland, Czech Republic, Romania, Baltic States
  // ══════════════════════════════════════════════════════════════════════

  { id: 'pgz-poland', name: 'Polska Grupa Zbrojeniowa (PGZ)', category: 'Global Defense', aliases: ['pgz', 'polska grupa zbrojeniowa', 'pzl mielec', 'poland defense'], keywords: ['poland defense industry', 'nato eastern flank', 'k2 tank poland', 'homar rocket artillery poland', 'polish military'], ikerScore: 78 },
  { id: 'cd-projekt', name: 'CD Projekt', category: 'Enterprise', aliases: ['cd projekt', 'cdpr', 'cd projekt red', 'cyberpunk 2077 dev'], keywords: ['poland game engine', 'redam engine', 'simulation technology', 'virtual world engine'], ikerScore: 68 },
  { id: 'asseco-group', name: 'Asseco', category: 'Enterprise', aliases: ['asseco', 'asseco poland', 'asseco group', 'asseco solutions'], keywords: ['eastern europe banking software', 'government it poland', 'healthcare it poland', 'asseco ecommerce'], ikerScore: 71 },
  { id: 'eset-security', name: 'ESET', category: 'Global Cybersecurity', aliases: ['eset', 'eset security', 'nod32', 'eset antivirus', 'eset endpoint'], keywords: ['endpoint security europe', 'antivirus eastern europe', 'threat intelligence eset', 'eset apt reports'], ikerScore: 79 },
  { id: 'cgi-estonia', name: 'Cybernetica', category: 'Global Cybersecurity', aliases: ['cybernetica', 'cybernetica estonia', 'x-tee', 'estonian data exchange'], keywords: ['estonian digital government', 'x-road data exchange', 'e-estonia', 'blockchain government estonia'], ikerScore: 74 },
  { id: 'bit-sentinel', name: 'Bit Sentinel', category: 'Global Cybersecurity', aliases: ['bit sentinel', 'bit sentinel romania', 'cybersecurity romania'], keywords: ['romanian cybersecurity', 'eastern europe threat', 'pentest romania', 'soc eastern europe'], ikerScore: 66 },

  // ══════════════════════════════════════════════════════════════════════
  // INDIA — Expanded coverage
  // ══════════════════════════════════════════════════════════════════════

  { id: 'hal-india', name: 'Hindustan Aeronautics (HAL)', category: 'Global Defense', aliases: ['hal', 'hindustan aeronautics', 'hal india', 'tejas fighter', 'htpb hal'], keywords: ['india military aircraft', 'tejas fighter jet', 'lca tejas', 'dhruv helicopter', 'india defense manufacturing'], ikerScore: 80 },
  { id: 'drdo-india', name: 'DRDO', category: 'Global Defense', aliases: ['drdo', 'defence research development organisation', 'india defence research'], keywords: ['india missile program', 'akash missile', 'brahmos drdo', 'india defense research', 'india hypersonic'], ikerScore: 79 },
  { id: 'tata-advanced-systems', name: 'Tata Advanced Systems', category: 'Global Defense', aliases: ['tata advanced systems', 'tasl', 'tata aerospace defense', 'tata sikorsky'], keywords: ['india aerospace manufacturing', 'ch47 india', 'aerostructures india', 'make in india defense'], ikerScore: 77 },
  { id: 'ideaforge-drones', name: 'ideaForge', category: 'Drone & Autonomy', aliases: ['ideaforge', 'idea forge', 'netra drone', 'switch uav india'], keywords: ['india military drone', 'border surveillance drone india', 'quad rotor india', 'made in india uav'], ikerScore: 74 },
  { id: 'zoho-corp', name: 'Zoho', category: 'Enterprise', aliases: ['zoho', 'zoho corp', 'zoho crm', 'zoho one', 'manageengine'], keywords: ['india saas', 'smb crm india', 'manageengine it management', 'zoho analytics', 'enterprise software india'], ikerScore: 78 },
  { id: 'freshworks', name: 'Freshworks', category: 'Enterprise', aliases: ['freshworks', 'freshdesk', 'freshservice', 'freshsales'], keywords: ['customer support saas', 'it service management saas', 'crm saas india', 'freshservice itsm'], ikerScore: 76 },
  { id: 'quickheal', name: 'Quick Heal', category: 'Global Cybersecurity', aliases: ['quick heal', 'quick heal technologies', 'seqrite', 'quick heal antivirus'], keywords: ['india endpoint security', 'smb cybersecurity india', 'seqrite enterprise', 'ransomware protection india'], ikerScore: 67 },

  // ══════════════════════════════════════════════════════════════════════
  // ADDITIONAL KOREA & JAPAN
  // ══════════════════════════════════════════════════════════════════════

  { id: 'hanwha-ocean', name: 'Hanwha Ocean', category: 'Global Defense', aliases: ['hanwha ocean', 'hanwha daewoo', 'dsme korea', 'korea shipbuilding'], keywords: ['korea submarine', 'destroyer korea', 'naval shipbuilding korea', 'uss submarine export', 'ssn korea'], ikerScore: 80 },
  { id: 'lig-nex1', name: 'LIG Nex1', category: 'Global Defense', aliases: ['lig nex1', 'lg innotek defense', 'korea guided missile', 'cheongung missile'], keywords: ['korea missile defense', 'cheongung sam system', 'korea radar', 'korea torpedo', 'guided weapon korea'], ikerScore: 78 },
  { id: 'kakao-enterprise', name: 'Kakao Enterprise', category: 'Global AI', aliases: ['kakao', 'kakao enterprise', 'kakao ai', 'kakaotalk', 'kogpt'], keywords: ['korea llm', 'kogpt language model', 'kakao cloud ai', 'korea ai platform', 'koreanl nlp'], ikerScore: 75 },
  { id: 'naver-cloud', name: 'NAVER Cloud', category: 'Global AI', aliases: ['naver', 'naver cloud', 'clova ai', 'hyperclova', 'naver search'], keywords: ['korea cloud computing', 'hyperclova llm', 'naver ai research', 'korean nlp ai', 'clova studio'], ikerScore: 77 },
  { id: 'kawasaki-defense', name: 'Kawasaki Defense', category: 'Global Defense', aliases: ['kawasaki', 'kawasaki defense', 'kawasaki heavy industries defense', 'p-1 patrol'], keywords: ['japan submarine', 'p1 maritime patrol japan', 'japan military shipbuilding', 'kawasaki aerospace defense'], ikerScore: 79 },
  { id: 'subaru-defense', name: 'Subaru Corporation Defense', category: 'Global Defense', aliases: ['subaru defense', 'fuji heavy industries', 'subaru t-7', 'subaru uh60'], keywords: ['japan trainer aircraft', 'japan helicopter', 'fuji heavy defense', 'uh60 japan license'], ikerScore: 72 },
  { id: 'nec-defense', name: 'NEC Defense', category: 'Global Defense', aliases: ['nec', 'nec corporation defense', 'nec facial recognition', 'nec c2 systems'], keywords: ['japan c2 systems', 'air defense command japan', 'nec biometric', 'nec defense it', 'radar nec'], ikerScore: 78 },

  // ══════════════════════════════════════════════════════════════════════
  // AFRICA & GLOBAL SOUTH
  // ══════════════════════════════════════════════════════════════════════

  { id: 'flutterwave', name: 'Flutterwave', category: 'Enterprise', aliases: ['flutterwave', 'flutterwave africa', 'flutterwave payments'], keywords: ['africa payments infrastructure', 'fintech africa', 'cross border payments africa', 'nigeria fintech'], ikerScore: 72 },
  { id: 'andela-talent', name: 'Andela', category: 'Enterprise', aliases: ['andela', 'andela africa', 'andela developers'], keywords: ['africa software talent', 'remote tech talent', 'distributed engineering africa'], ikerScore: 65 },
  { id: 'denel-aerospace', name: 'Denel', category: 'Global Defense', aliases: ['denel', 'denel south africa', 'denel aerospace', 'rooivalk helicopter'], keywords: ['south africa defense', 'rooivalk attack helicopter', 'umkhonto missile south africa', 'africa arms manufacturer'], ikerScore: 70 },

  // ══════════════════════════════════════════════════════════════════════
  // ADDITIONAL US — Defense & AI startups
  // ══════════════════════════════════════════════════════════════════════

  { id: 'joby-aviation', name: 'Joby Aviation', category: 'Drone & Autonomy', aliases: ['joby', 'joby aviation', 'joby evtol', 'joby air taxi'], keywords: ['evtol air taxi', 'urban air mobility', 'electric vtol', 'nasa uam', 'army evtol joby'], ikerScore: 79 },
  { id: 'archer-aviation', name: 'Archer Aviation', category: 'Drone & Autonomy', aliases: ['archer aviation', 'archer evtol', 'midnight aircraft'], keywords: ['electric air taxi', 'evtol certification', 'urban air mobility archer', 'usaf agility prime'], ikerScore: 76 },
  { id: 'hermeus', name: 'Hermeus', category: 'Global Defense', aliases: ['hermeus', 'hermeus aerospace', 'quarterhorse hypersonic'], keywords: ['hypersonic aircraft', 'mach 5 aircraft', 'turbine based combined cycle', 'hypersonic commercial'], ikerScore: 80 },
  { id: 'overland-ai', name: 'Overland AI', category: 'Drone & Autonomy', aliases: ['overland ai', 'overland autonomous vehicle'], keywords: ['autonomous ground vehicle military', 'uncrewed ground vehicle', 'army autonomous logistics', 'ugv navigation ai'], ikerScore: 77 },
  { id: 'quantum-systems', name: 'Quantum Systems', category: 'Drone & Autonomy', aliases: ['quantum systems', 'quantum-systems gmbh', 'vector uav'], keywords: ['vtol fixed wing drone', 'isr drone germany', 'trinity pro drone', 'autonomous uas recon'], ikerScore: 76 },
  { id: 'leidos-health', name: 'Leidos', category: 'Defense Tech', aliases: ['leidos', 'leidos holdings', 'leidos health', 'leidos defense'], keywords: ['health it federal', 'dha contract leidos', 'veterans it leidos', 'enterprise it dod leidos', 'c2 systems leidos'], ikerScore: 86 },
  { id: 'sarcos-robotics', name: 'Sarcos Technology', category: 'Global Robotics', aliases: ['sarcos', 'sarcos robotics', 'guardian xo', 'sarcos exoskeleton'], keywords: ['industrial exoskeleton', 'powered exosuit', 'guardian xo exoskeleton', 'human augmentation industrial'], ikerScore: 74 },
  { id: 'apptronik', name: 'Apptronik', category: 'Global Robotics', aliases: ['apptronik', 'apollo robot', 'apptronik humanoid'], keywords: ['humanoid robot logistics', 'apollo humanoid robot', 'nasa humanoid robot', 'bipedal robot manufacturing'], ikerScore: 78 },
  { id: 'gecko-robotics', name: 'Gecko Robotics', category: 'Global Robotics', aliases: ['gecko robotics', 'toka robot', 'inspection robot gecko'], keywords: ['infrastructure inspection robot', 'tank inspection robot', 'power plant inspection robot', 'military infrastructure inspection'], ikerScore: 75 },
];

// ─── Merge all entity registries ─────────────────────────────────────────────
// 1. El Paso ecosystem vendors (defense, cyber, health, border, etc.)
NXT_ENTITIES.push(...NXT_ENTITIES_ELPASO);
// 2. Global technology companies (Siemens, Boston Dynamics, CrowdStrike, etc.)
NXT_ENTITIES.push(...GLOBAL_TECH_ENTITIES);
// 3. Extended global registry (500+ additional companies across 30+ countries)
NXT_ENTITIES.push(...EXTENDED_GLOBAL_ENTITIES);

// ─── Lookups ──────────────────────────────────────────────────────────────────

// Build alias → entity map for O(1) lookup
const _aliasMap = new Map<string, NxtEntity>();
for (const entity of NXT_ENTITIES) {
  for (const alias of entity.aliases) {
    _aliasMap.set(alias.toLowerCase(), entity);
  }
}

export function findEntityByText(text: string): NxtEntity[] {
  const lower = text.toLowerCase();
  const found = new Map<string, NxtEntity>();
  for (const [alias, entity] of Array.from(_aliasMap.entries() as Iterable<[string, NxtEntity]>)) {
    if (lower.includes(alias)) {
      found.set(entity.id, entity);
    }
  }
  return [...found.values()];
}

export function findSectorsByText(text: string): SectorKeywords[] {
  const lower = text.toLowerCase();
  return SECTOR_KEYWORDS.filter((s) =>
    s.keywords.some((kw) => lower.includes(kw)) ||
    s.contractKeywords.some((kw) => lower.includes(kw)) ||
    s.securityKeywords.some((kw) => lower.includes(kw)),
  );
}

export function isContractSignal(text: string): boolean {
  const lower = text.toLowerCase();
  const contractPatterns = [
    /\$[\d,.]+\s*[mb]illion/i,
    /\$[\d,.]+[mb]/i,
    /idiq/i,
    /task order/i,
    /contract award/i,
    /sbir phase/i,
    /gsa schedule/i,
    /other transaction authority/i,
    /ota agreement/i,
    /sole source/i,
    /multiple award/i,
    /\bota\b/,
    /billion.*contract|contract.*billion/i,
    /million.*award|award.*million/i,
  ];
  return contractPatterns.some((re) => re.test(lower));
}

export function isSecuritySignal(text: string): boolean {
  const lower = text.toLowerCase();
  return SECTOR_KEYWORDS.some((s) =>
    s.securityKeywords.some((kw) => lower.includes(kw)),
  );
}

export function extractContractAmount(text: string): number | null {
  const billions = text.match(/\$?([\d,.]+)\s*billion/i);
  if (billions) return parseFloat(billions[1].replace(/,/g, '')) * 1000;
  const millions = text.match(/\$?([\d,.]+)\s*million/i);
  if (millions) return parseFloat(millions[1].replace(/,/g, ''));
  const shortM = text.match(/\$?([\d,.]+)M\b/i);
  if (shortM) return parseFloat(shortM[1].replace(/,/g, ''));
  const shortB = text.match(/\$?([\d,.]+)B\b/i);
  if (shortB) return parseFloat(shortB[1].replace(/,/g, '')) * 1000;
  return null;
}
