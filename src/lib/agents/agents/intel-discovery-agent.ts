// src/lib/agents/agents/intel-discovery-agent.ts
// Intelligence Discovery Agent — cross-industry tracking of patents, research
// papers, case studies, hiring signals, funding rounds, M&A, and contracts.
// Aggregates from quality-source-feeds + vendor-discovery + opportunities.

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';
import { parseAnyFeed, type ParsedItem } from '@/lib/rss/parser';
import {
  QUALITY_FEEDS,
  type QualityFeedSource,
} from '@/lib/feeds/quality-source-feeds';
import { getDynamicFeeds } from '@/lib/feeds/dynamic-feed-generator';
import { persistIntelSignals } from '@/db/queries/intel-signals';
import { logPrediction } from '@/db/queries/prediction-outcomes';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type IntelSignalType =
  | 'patent_filing'
  | 'research_paper'
  | 'case_study'
  | 'hiring_signal'
  | 'funding_round'
  | 'merger_acquisition'
  | 'contract_award'
  | 'product_launch'
  | 'regulatory_action'
  | 'facility_expansion';

export type IntelIndustry =
  | 'healthcare'
  | 'manufacturing'
  | 'defense'
  | 'agriculture'
  | 'construction'
  | 'energy'
  | 'fintech'
  | 'cybersecurity'
  | 'ai-ml'
  | 'logistics'
  | 'general';

export type IntelSignal = {
  id: string;
  type: IntelSignalType;
  industry: IntelIndustry;
  title: string;
  url: string;
  source: string;
  evidence: string;
  company?: string;
  amountUsd?: number;
  confidence: number;
  discoveredAt: string;
  tags: string[];
};

export type IntelDiscoveryStore = {
  signals: IntelSignal[];
  as_of: string;
  feeds_scanned: number;
  feeds_ok: number;
  feeds_failed: number;
  total_raw_items: number;
  signals_by_type: Record<string, number>;
  signals_by_industry: Record<string, number>;
  scan_duration_ms: number;
};

// ─── Signal Detection Patterns ──────────────────────────────────────────────────

const SIGNAL_PATTERNS: Array<{
  type: IntelSignalType;
  patterns: RegExp[];
  confidence: number;
}> = [
  {
    type: 'patent_filing',
    patterns: [
      /\bpatent\s+(fil|grant|approv|award|issu)/i,
      /\b(US|EP|WO|CN|JP)\s?\d{5,}/i,
      /\bUSPTO\b/i,
      /\binvent(or|ion)\b.*\b(fil|patent|claim)/i,
      /\bintellectual\s+property\b/i,
    ],
    confidence: 0.75,
  },
  {
    type: 'research_paper',
    patterns: [
      /\barxiv[.:]\s?\d{4}\.\d{4,}/i,
      /\bpeer[- ]review/i,
      /\bpreprint\b/i,
      /\bpublish(ed|ing)\s+(in|a)\s+\w+\s+(journal|paper|study)/i,
      /\bclinical\s+trial\s+result/i,
      /\bphase\s+[IiIi123]\b.*\b(trial|study|result)/i,
      /\bdoi[.:]\s?10\.\d{4,}/i,
    ],
    confidence: 0.8,
  },
  {
    type: 'case_study',
    patterns: [
      /\bcase\s+stud(y|ies)\b/i,
      /\bcustomer\s+stor(y|ies)\b/i,
      /\bsuccess\s+stor(y|ies)\b/i,
      /\bimplementation\s+(report|review|case)/i,
      /\bdeployed\b.*\b(result|outcome|impact)/i,
    ],
    confidence: 0.65,
  },
  {
    type: 'hiring_signal',
    patterns: [
      /\bhiring\s+\d+/i,
      /\bjob\s+opening/i,
      /\bworkforce\s+expansion/i,
      /\bnew\s+position/i,
      /\brecruiting\s+(drive|push|effort)/i,
      /\bheadcount\s+(growth|increase|expansion)/i,
    ],
    confidence: 0.6,
  },
  {
    type: 'funding_round',
    patterns: [
      /\b(series\s+[A-G]|seed\s+round|pre-seed)\b/i,
      /\braised?\s+\$[\d.,]+\s*(M|B|million|billion)/i,
      /\bfunding\s+round\b/i,
      /\bventure\s+capital\b/i,
      /\b(IPO|SPAC|public\s+offering)\b/i,
    ],
    confidence: 0.8,
  },
  {
    type: 'merger_acquisition',
    patterns: [
      /\b(acquir|merger|takeover|buyout)\b/i,
      /\bmerge(d|r|s)\s+with\b/i,
      /\bacquisition\s+(of|deal|complete|announce)/i,
      /\bbought\s+by\b/i,
    ],
    confidence: 0.8,
  },
  {
    type: 'contract_award',
    patterns: [
      /\bcontract\s+(award|win|won|value)/i,
      /\bawarded?\s+\$[\d.,]+\s*(M|B|million|billion)/i,
      /\b(DoD|DHS|NASA|DOE|NIH|DARPA)\s+contract\b/i,
      /\bgovernment\s+contract\b/i,
      /\bSBIR\b.*\b(award|grant|phase)/i,
    ],
    confidence: 0.75,
  },
  {
    type: 'product_launch',
    patterns: [
      /\b(launch|unveil|introduc|announc)\w*\s+(new|its|a)\s+/i,
      /\bnew\s+product\b/i,
      /\bproduct\s+release\b/i,
      /\bgeneral\s+availability\b/i,
    ],
    confidence: 0.6,
  },
  {
    type: 'regulatory_action',
    patterns: [
      /\bFDA\s+(approv|clear|authoriz)/i,
      /\bFAA\s+(certif|approv)/i,
      /\bFCC\s+(approv|licens)/i,
      /\bregulat(or|ion|ory)\s+(approv|action|update)/i,
      /\bcompliance\s+(certif|achiev)/i,
    ],
    confidence: 0.75,
  },
  {
    type: 'facility_expansion',
    patterns: [
      /\b(new|open|expand)\w*\s+(facility|factory|plant|campus|office|lab|center)/i,
      /\bgroundbreaking\b/i,
      /\bconstruction\s+(begin|start|commence)/i,
      /\bmanufacturing\s+(facility|plant|expansion)/i,
    ],
    confidence: 0.65,
  },
];

// ─── Industry Detection ─────────────────────────────────────────────────────────

const INDUSTRY_KEYWORDS: Array<{ industry: IntelIndustry; keywords: RegExp }> = [
  { industry: 'healthcare', keywords: /\b(pharma|biotech|medical|health|FDA|clinical|drug|therapy|vaccine|hospital|patient|diagnostic|genomic|CRISPR)\b/i },
  { industry: 'manufacturing', keywords: /\b(manufactur|factory|industrial|CNC|3D\s?print|additive|assembly|production\s+line|quality\s+control|lean|robotics?\s+assembly)\b/i },
  { industry: 'defense', keywords: /\b(aerospace|defense|military|DoD|DARPA|satellite|rocket|missile|drone|UAV|fighter|submarine|radar|Pentagon)\b/i },
  { industry: 'agriculture', keywords: /\b(agriculture|farming|crop|livestock|agtech|precision\s+ag|USDA|harvest|irrigation|seed|fertilizer)\b/i },
  { industry: 'construction', keywords: /\b(construction|building|infrastructure|BIM|concrete|HVAC|architect|modular|prefab|real\s+estate|smart\s+building)\b/i },
  { industry: 'energy', keywords: /\b(energy|solar|wind|battery|grid|renewable|hydrogen|nuclear|utility|power\s+plant|EV\s+charg|oil|gas|ERCOT)\b/i },
  { industry: 'fintech', keywords: /\b(fintech|blockchain|cryptocurrency|payment|banking|insurance|lending|trading|DeFi|neobank|regtech)\b/i },
  { industry: 'cybersecurity', keywords: /\b(cybersecurity|zero\s+trust|ransomware|malware|threat|vulnerability|encryption|firewall|SOC|SIEM|penetration\s+test)\b/i },
  { industry: 'ai-ml', keywords: /\b(artificial\s+intelligence|machine\s+learning|deep\s+learning|LLM|GPT|neural\s+network|computer\s+vision|NLP|generative\s+AI)\b/i },
  { industry: 'logistics', keywords: /\b(supply\s+chain|logistics|freight|warehouse|shipping|port|customs|trade\s+route|last\s+mile|3PL|TMS|WMS)\b/i },
];

// ─── Amount Extraction ──────────────────────────────────────────────────────────

// Matches: $1.5B, $500M, £200 million, €3.2 billion, valued at $X, worth $X
const AMOUNT_PATTERNS = [
  /(?:\$|USD|£|€|¥)\s?([\d.,]+)\s*(B|billion|M|million|K|thousand)/gi,
  /(?:valued?\s+at|worth|raised?|awarded?|contract\s+(?:valued?|worth)|deal\s+(?:valued?|worth))\s+(?:\$|USD|£|€)?\s?([\d.,]+)\s*(B|billion|M|million|K|thousand)/gi,
];

function parseAmountMatch(numStr: string, unit: string): number {
  const num = parseFloat(numStr.replace(/,/g, ''));
  const u = unit.toLowerCase();
  if (u === 'b' || u === 'billion') return num * 1_000_000_000;
  if (u === 'm' || u === 'million') return num * 1_000_000;
  if (u === 'k' || u === 'thousand') return num * 1_000;
  return num;
}

function extractAmount(text: string): number | undefined {
  let best: number | undefined;
  for (const re of AMOUNT_PATTERNS) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const numStr = match[1] ?? match[2];
      const unit = match[2] ?? match[3];
      if (!numStr || !unit) continue;
      const val = parseAmountMatch(numStr, unit);
      if (!best || val > best) best = val; // take the largest amount mentioned
    }
  }
  return best;
}

// ─── Company Extraction ──────────────────────────────────────────────────────────

// Known companies — checked first for fast, accurate extraction
const KNOWN_COMPANIES: string[] = [
  // ── Defense & Aerospace — US ──────────────────────────────────────────────────
  'Lockheed Martin', 'Raytheon Technologies', 'Raytheon', 'Northrop Grumman', 'General Dynamics',
  'Boeing', 'L3Harris', 'Leidos', 'SAIC', 'Booz Allen Hamilton', 'Booz Allen', 'CACI',
  'ManTech', 'Textron', 'Kratos', 'Anduril', 'Shield AI', 'AeroVironment', 'Moog',
  'TransDigm', 'Mercury Systems', 'Curtiss-Wright', 'DRS Technologies', 'Ducommun',
  'Parsons', 'Engility', 'Peraton', 'Vectrus', 'KEYW', 'FLIR Systems', 'Teledyne',
  'Palantir', 'Rebellion Defense', 'Vannevar Labs', 'Epirus', 'Sarcos', 'Ghost Robotics',
  'Dynetics', 'BWX Technologies', 'Huntington Ingalls', 'Ball Aerospace', 'Aerojet Rocketdyne',
  'V2X', 'KBR', 'Science Applications', 'Jacobs Engineering', 'Amentum',
  'Sierra Nevada', 'Orbital ATK', 'Elroy Air', 'Joby Defense', 'Applied Intuition',
  // ── Defense — Europe ──────────────────────────────────────────────────────────
  'BAE Systems', 'Thales', 'Safran', 'Dassault Aviation', 'Dassault', 'MBDA', 'Airbus',
  'Rheinmetall', 'Kongsberg', 'Saab', 'QinetiQ', 'Rolls-Royce',
  'Leonardo', 'Finmeccanica', 'Oto Melara', 'Fincantieri', 'MBDA Italia',
  'NAMMO', 'Patria', 'Diehl', 'Hensoldt',
  'Indra', 'Navantia',
  'PGZ', 'WB Electronics',
  'NetLine', 'Elbit Systems of America',
  // ── Defense — Israel ──────────────────────────────────────────────────────────
  'Elbit Systems', 'Elbit', 'Rafael', 'IAI', 'Elta', 'IMOD',
  // ── Defense — Turkey ──────────────────────────────────────────────────────────
  'Baykar', 'Aselsan', 'TUSAS', 'TAI', 'Roketsan', 'HAVELSAN', 'STM', 'FNSS',
  // ── Defense — South Korea ─────────────────────────────────────────────────────
  'Hanwha', 'Hanwha Defense', 'LIG Nex1', 'Korea Aerospace Industries', 'Korea Aerospace', 'KAI',
  // ── Defense — India ───────────────────────────────────────────────────────────
  'HAL', 'Hindustan Aeronautics', 'BEL', 'Bharat Electronics',
  'DRDO', 'Bharat Dynamics', 'Tata Advanced Systems',
  // ── Defense — Brazil ──────────────────────────────────────────────────────────
  'Embraer Defense', 'Avibras', 'IMBEL',
  // ── Defense — Japan ───────────────────────────────────────────────────────────
  'Mitsubishi Heavy Industries', 'IHI', 'Kawasaki Heavy Industries',
  // ── Defense — Australia ───────────────────────────────────────────────────────
  'Austal', 'CEA Technologies',
  // ── Defense — Singapore ───────────────────────────────────────────────────────
  'ST Engineering', 'DSTA',
  // ── Defense — UAE ─────────────────────────────────────────────────────────────
  'EDGE Group', 'Calidus', 'Tawazun',
  // ── Defense — South Africa ────────────────────────────────────────────────────
  'Denel', 'Paramount Group',

  // ── AI / ML & Cloud ───────────────────────────────────────────────────────────
  'OpenAI', 'Anthropic', 'Google DeepMind', 'DeepMind', 'Google', 'Alphabet',
  'Microsoft', 'Meta', 'Amazon', 'Apple', 'IBM', 'Oracle', 'Salesforce',
  'NVIDIA', 'Qualcomm', 'Intel', 'AMD', 'Arm',
  'Scale AI', 'Cohere', 'Mistral AI', 'Mistral', 'xAI', 'Stability AI',
  'Inflection AI', 'Adept AI', 'Character AI', 'Perplexity AI', 'Perplexity',
  'DataRobot', 'C3.ai', 'Samba Nova', 'Groq', 'Cerebras',
  'Snowflake', 'Databricks', 'Hugging Face',
  'Datadog', 'Elastic', 'Confluent',
  'Lightning AI', 'Weights & Biases',
  'DeepSeek', 'Runway ML', 'Midjourney', 'Jasper AI', 'Glean',
  'Mosaic ML', 'Together AI', 'Anyscale', 'Modal', 'Replicate',
  'Pinecone', 'Weaviate', 'Chroma', 'LangChain', 'LlamaIndex',
  'Descript', 'Synthesis AI', 'Covariant AI', 'Harvey AI', 'Codeium',
  // ── AI / ML — China ───────────────────────────────────────────────────────────
  'Megvii', 'iFlytek', 'Cambricon',
  // ── AI / ML — Japan ───────────────────────────────────────────────────────────
  'Preferred Networks', 'ABEJA',
  // ── AI / ML — South Korea ─────────────────────────────────────────────────────
  'Naver', 'Kakao Brain',
  // ── AI / ML — India ───────────────────────────────────────────────────────────
  'Krutrim', 'Sarvam AI',

  // ── Cybersecurity ─────────────────────────────────────────────────────────────
  'CrowdStrike', 'Palo Alto Networks', 'SentinelOne', 'Fortinet', 'Zscaler',
  'Darktrace', 'Check Point', 'CyberArk', 'Wiz', 'Cellebrite',
  'Tenable', 'Rapid7', 'Qualys', 'Veracode', 'Synopsys',
  'Mandiant', 'FireEye', 'Secureworks', 'Recorded Future', 'FS-ISAC',
  'IronNet', 'CISA', 'BlueVoyant', 'Claroty', 'Nozomi Networks',
  'Dragos', 'Waterfall Security', 'Clarified Security',
  'Cloudflare', 'Varonis', 'Abnormal Security',
  'KnowBe4', 'Proofpoint', 'Trellix', 'McAfee', 'Symantec',
  'Carbon Black', 'Deep Instinct', 'Tanium', 'LogRhythm', 'Sumo Logic',
  'Netskope', 'Lacework', 'Onfido', 'Jumio', 'Okta',
  // ── Cybersecurity — Israel ────────────────────────────────────────────────────
  'Orca Security', 'Snyk', 'Cybereason', 'Armis',
  'Pentera', 'XM Cyber', 'Salt Security', 'Cato Networks', 'Aqua Security',
  // ── Cybersecurity — UK ────────────────────────────────────────────────────────
  'Sophos',

  // ── Robotics & Automation ─────────────────────────────────────────────────────
  'Boston Dynamics', 'Skydio', 'Joby Aviation', 'Archer Aviation', 'Lilium',
  'Figure AI', 'Agility Robotics', 'Apptronik', '1X Technologies',
  'KUKA', 'Fanuc', 'Yaskawa', 'ABB', 'Universal Robots',
  'Keyence', 'Kawasaki Robotics', 'Mitsubishi Electric', 'Siemens',
  'Fetch Robotics', 'Locus Robotics', 'Geek Plus', 'GreyOrange',
  'Covariant', 'Osaro', 'Vecna Robotics',
  // ── Robotics — Japan ──────────────────────────────────────────────────────────
  'Epson Robots', 'Denso Robotics',
  // ── Robotics — China ──────────────────────────────────────────────────────────
  'UBTECH', 'JAKA Robotics',
  // ── Robotics — Germany ────────────────────────────────────────────────────────
  'Franka Emika',

  // ── Space & Satellite ─────────────────────────────────────────────────────────
  'SpaceX', 'Rocket Lab', 'Planet Labs', 'Maxar', 'Maxar Technologies',
  'Relativity Space', 'Firefly Aerospace', 'ABL Space', 'Sierra Space',
  'Axiom Space', 'Voyager Space', 'Astrobotic', 'Intuitive Machines',
  'HawkEye 360', 'BlackSky', 'Satellogic', 'Capella Space',
  'Virgin Orbit', 'Astra Space', 'Spire Global', 'Terran Orbital', 'Viasat',
  'L3Harris Space', 'York Space Systems', 'Umbra', 'ICEYE',
  // ── Space — Europe ────────────────────────────────────────────────────────────
  'Arianespace', 'OHB SE',
  // ── Space — India ─────────────────────────────────────────────────────────────
  'NewSpace India',
  // ── Space — Japan ─────────────────────────────────────────────────────────────
  'ispace', 'Astroscale',

  // ── Semiconductors ────────────────────────────────────────────────────────────
  'TSMC', 'Samsung', 'SK Hynix', 'ASML', 'NXP Semiconductors', 'NXP',
  'MediaTek', 'Broadcom', 'Marvell', 'Marvell Technology', 'Lattice Semiconductor', 'Wolfspeed',
  'GlobalFoundries', 'UMC', 'Tower Semiconductor', 'ON Semiconductor',
  'Texas Instruments', 'Analog Devices', 'Microchip Technology',
  'Cadence', 'Mentor Graphics',
  'Skyworks Solutions', 'Qorvo', 'Amkor Technology', 'Cirrus Logic', 'MACOM',
  'Infineon', 'STMicroelectronics', 'Allegro Microsystems', 'Diodes Incorporated',
  // ── Semiconductors — Taiwan ───────────────────────────────────────────────────
  'ASE Technology',
  // ── Semiconductors — China ────────────────────────────────────────────────────
  'YMTC', 'CXMT',
  // ── Semiconductors — Japan ────────────────────────────────────────────────────
  'Tokyo Electron', 'Renesas', 'Rohm',

  // ── Energy & Climate ──────────────────────────────────────────────────────────
  'GE Vernova', 'Siemens Energy', 'Vestas', 'NextEra Energy', 'NextEra',
  'Ørsted', 'BP', 'Shell', 'ExxonMobil', 'Chevron',
  'First Solar', 'Enphase', 'Enphase Energy', 'SolarEdge', 'Sunrun', 'Sunnova', 'SunPower',
  'Tesla', 'BYD', 'CATL', 'Northvolt', 'QuantumScape',
  'Bloom Energy', 'Plug Power', 'Ballard Power',
  'Solid Power', 'EnerVenue',
  'ChargePoint', 'EVgo', 'Blink Charging', 'Rivian', 'Lucid Motors',
  'Proterra', 'Nikola', 'Hyzon Motors', 'Cummins', 'Hycroft Mining',
  'NEXTracker', 'Array Technologies', 'Stem Inc', 'Fluence Energy',
  // ── Energy — China ────────────────────────────────────────────────────────────
  'LONGi Green Energy', 'LONGi', 'Envision',
  // ── Energy — South Korea ──────────────────────────────────────────────────────
  'LG Energy Solution', 'Samsung SDI', 'SK Innovation',
  // ── Energy — Europe ───────────────────────────────────────────────────────────
  'Siemens Gamesa',

  // ── Quantum Computing ─────────────────────────────────────────────────────────
  'IonQ', 'Rigetti', 'D-Wave', 'PsiQuantum', 'Xanadu',
  // ── Quantum — UK ──────────────────────────────────────────────────────────────
  'Quantinuum', 'Oxford Quantum Circuits',
  // ── Quantum — China ───────────────────────────────────────────────────────────
  'Origin Quantum', 'SpinQ',
  // ── Quantum — Australia ───────────────────────────────────────────────────────
  'Silicon Quantum Computing',

  // ── Healthcare & Biotech ──────────────────────────────────────────────────────
  'Pfizer', 'Moderna', 'Johnson & Johnson', 'AstraZeneca', 'Novartis',
  'Roche', 'Genentech', 'Regeneron', 'BioNTech', 'Gilead',
  'Abbott', 'Medtronic', 'Boston Scientific', 'Stryker', 'Intuitive Surgical',
  'Illumina', 'Pacific Biosciences', 'Oxford Nanopore',
  'CRISPR Therapeutics', 'Editas Medicine', 'Beam Therapeutics',
  'Intellia Therapeutics', 'Intellia',
  '10x Genomics', 'Twist Bioscience',
  'Exact Sciences', 'Guardant Health', 'Natera', 'Invitae',
  'Amgen', 'Biogen', 'Vertex Pharmaceuticals', 'Eli Lilly', 'Merck',
  'Bristol-Myers Squibb', 'Sanofi', 'GSK', 'Novo Nordisk', 'Takeda',
  'Danaher Life Sciences', 'Thermo Fisher', 'Agilent', 'Waters Corporation',
  // ── Biotech — China ───────────────────────────────────────────────────────────
  'BGI Genomics', 'BGI', 'WuXi AppTec',
  // ── Biotech — India ───────────────────────────────────────────────────────────
  'Biocon', 'Serum Institute',

  // ── Logistics & Supply Chain ──────────────────────────────────────────────────
  'FedEx', 'UPS', 'DHL', 'Maersk', 'Amazon Logistics',
  'XPO Logistics', 'XPO', 'J.B. Hunt', 'Werner Enterprises',
  'Flexport', 'Transfix', 'Convoy', 'Loadsmart',
  'project44', 'FourKites', 'Samsara', 'Motive',

  // ── Manufacturing & Industrial ────────────────────────────────────────────────
  'GE', 'General Electric', 'Honeywell', 'Emerson Electric', 'Rockwell Automation',
  'Parker Hannifin', 'Eaton', '3M', 'Danaher', 'Xylem',
  'Bosch', 'BASF', 'Thyssenkrupp', 'Festo',
  'Caterpillar', 'John Deere', 'CNH Industrial', 'AGCO', 'Trimble',
  'Dover Corporation', 'Illinois Tool Works', 'Roper Technologies',
  'Schneider Electric', 'ABB Industrial', 'Omron', 'Beckhoff',

  // ── Tech — China ──────────────────────────────────────────────────────────────
  'Huawei', 'DJI', 'Hikvision', 'SenseTime', 'Baidu', 'Alibaba', 'Tencent',
  'ByteDance', 'Xiaomi', 'SMIC', 'CNOOC', 'COMAC',

  // ── Tech — Global ─────────────────────────────────────────────────────────────
  'Embraer', 'CAE', 'SAP', 'Foxconn',
  'Tata Consultancy Services', 'Infosys', 'Wipro', 'HCL Technologies',
  'Accenture', 'Deloitte', 'PwC', 'McKinsey',
  'Capgemini', 'Cognizant', 'Tech Mahindra', 'LTIMindtree',
  'NTT Data', 'Fujitsu', 'NEC', 'Hitachi',

  // ── Fintech & Payments ────────────────────────────────────────────────────────
  'Stripe', 'Plaid', 'Square', 'Block', 'PayPal', 'Adyen',
  'Klarna', 'Affirm', 'Marqeta', 'Brex', 'Ramp',
  'Ripple', 'Circle', 'Coinbase', 'Chainalysis', 'Fireblocks',
  'Carta', 'Robinhood', 'SoFi', 'Chime', 'Revolut',

  // ── Telecom & Connectivity ────────────────────────────────────────────────────
  'AT&T', 'Verizon', 'T-Mobile', 'Comcast', 'Charter',
  'Ericsson', 'Nokia', 'ZTE', 'Juniper Networks', 'Ciena',
  'Arista Networks', 'Cisco', 'Motorola Solutions',

  // ── Autonomous Vehicles & Mobility ────────────────────────────────────────────
  'Nuro', 'Waymo', 'Cruise', 'Aurora', 'Argo AI', 'Zoox',
  'Mobileye', 'TuSimple', 'Embark', 'Kodiak Robotics', 'Gatik',
  'May Mobility', 'Pony.ai', 'WeRide', 'Momenta', 'Hesai Technology',
  'Luminar', 'Velodyne', 'Ouster', 'Innoviz', 'Aeva',

  // ── Startups & Notable ────────────────────────────────────────────────────────
  'Wisk Aero', 'Overair', 'Volocopter', 'EHang',
  'Zipline', 'Wing', 'Amazon Prime Air',
  'Flexiv', 'Saronic', 'Hermeus', 'Ursa Major', 'Impulse Space',
  'Hadrian', 'Machina Labs', 'Reliable Robotics', 'Joby Aviation Defense',
  'Filigran', 'HiddenLayer', 'Protect AI', 'CalypsoAI', 'Credo AI',
];

// Regex fallback for companies with legal suffixes
const COMPANY_SUFFIX_RE = /\b([A-Z][A-Za-z]+(?:[\s-][A-Z][A-Za-z]+){0,3})\s+(?:Inc\.?|LLC|Corp\.?|Ltd\.?|Technologies|Systems|Solutions|Therapeutics|Pharmaceuticals|Biotech|Sciences|Semiconductor|Aerospace|Aviation|Defense|Dynamics|Networks|Analytics|Intelligence|Robotics|Labs?|Group|Holdings?|Ventures?)\b/g;

// ─── Evidence Cleaning ───────────────────────────────────────────────────────────

/** Strip HTML tags and entities from raw RSS descriptions */
function cleanEvidence(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 500);
}

/** Try to extract a company from the feed name itself (e.g. "NVIDIA Blog" → "NVIDIA") */
function extractCompanyFromFeedName(feedName: string): string | undefined {
  const lowerFeed = feedName.toLowerCase();
  for (const co of KNOWN_COMPANIES) {
    if (lowerFeed.includes(co.toLowerCase())) return co;
  }
  return undefined;
}

/** Extract the most prominent company name from article text */
function extractCompany(text: string, feedName?: string): string | undefined {
  // 1. Try extracting from feed name first (most reliable)
  if (feedName) {
    const fromFeed = extractCompanyFromFeedName(feedName);
    if (fromFeed) return fromFeed;
  }

  // 2. Check known company list against the text
  for (const co of KNOWN_COMPANIES) {
    if (new RegExp(`\\b${co.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)) {
      return co;
    }
  }

  // 3. Regex fallback for companies with legal suffixes
  COMPANY_SUFFIX_RE.lastIndex = 0;
  const match = COMPANY_SUFFIX_RE.exec(text);
  return match ? match[0] : undefined;
}

// ─── Cache ──────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 45 * 60 * 1000; // 45 minutes
let cachedStore: IntelDiscoveryStore | null = null;
let storeExpiresAt = 0;
let inFlightRun: Promise<IntelDiscoveryStore> | null = null;

export function getCachedIntelDiscovery(): IntelDiscoveryStore | null {
  if (cachedStore && Date.now() < storeExpiresAt) return cachedStore;
  return null;
}

function setCachedIntelDiscovery(store: IntelDiscoveryStore): void {
  cachedStore = store;
  storeExpiresAt = Date.now() + CACHE_TTL_MS;
}

// ─── Main Runner ────────────────────────────────────────────────────────────────

export async function runIntelDiscoveryAgent(): Promise<IntelDiscoveryStore> {
  if (inFlightRun) return inFlightRun;
  inFlightRun = doRun().finally(() => { inFlightRun = null; });
  return inFlightRun;
}

const CONCURRENCY = 15;
const MAX_FEEDS = 300;

async function doRun(): Promise<IntelDiscoveryStore> {
  const startMs = Date.now();
  let feedsOk = 0;
  let feedsFailed = 0;
  let totalRawItems = 0;

  // Select feeds — prioritize tier 1 financial + professional first (highest signal quality),
  // then patent, then government/academic. Within each tier, financial > professional > patent > rest.
  // Dynamic feeds (country×sector, company-specific) are appended as tier 3 to fill remaining slots.
  const allFeeds: QualityFeedSource[] = [...QUALITY_FEEDS];

  // Add dynamic feeds (randomized subset to rotate coverage across runs)
  const dynamicPool = getDynamicFeeds();
  // Shuffle dynamic feeds so each run covers different countries/companies
  const shuffled = dynamicPool.slice().sort(() => Math.random() - 0.5);
  allFeeds.push(...shuffled);

  const tier1Financial = allFeeds.filter(f => f.tier === 1 && f.type === 'financial');
  const tier1Professional = allFeeds.filter(f => f.tier === 1 && f.type === 'professional');
  const tier1Rest = allFeeds.filter(f => f.tier === 1 && f.type !== 'financial' && f.type !== 'professional');
  const tier2Financial = allFeeds.filter(f => f.tier === 2 && f.type === 'financial');
  const tier2Professional = allFeeds.filter(f => f.tier === 2 && f.type === 'professional');
  const tier2Rest = allFeeds.filter(f => f.tier === 2 && f.type !== 'financial' && f.type !== 'professional');
  const tier3 = allFeeds.filter(f => f.tier === 3);
  const selectedFeeds = [
    ...tier1Financial, ...tier1Professional, ...tier1Rest,
    ...tier2Financial, ...tier2Professional, ...tier2Rest,
    ...tier3,
  ].slice(0, MAX_FEEDS);

  // Fetch all feeds in batches
  const allItems: Array<{ item: ParsedItem; feed: QualityFeedSource }> = [];

  const batches: QualityFeedSource[][] = [];
  for (let i = 0; i < selectedFeeds.length; i += CONCURRENCY) {
    batches.push(selectedFeeds.slice(i, i + CONCURRENCY));
  }

  for (const batch of batches) {
    const settled = await Promise.allSettled(
      batch.map(async (feed) => {
        try {
          const response = await fetchWithRetry(
            feed.url,
            {
              headers: {
                Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
                'User-Agent': 'NXTLinkIntelAgent/1.0',
              },
              signal: AbortSignal.timeout(8_000),
            },
            {
              retries: 1,
              cacheKey: `intel-disc:${feed.id}`,
              cacheTtlMs: 20 * 60 * 1000,
              staleIfErrorMs: 60 * 60 * 1000,
              dedupeInFlight: true,
            },
          );
          const text = await response.text();
          const items = parseAnyFeed(text, feed.name);
          return { items, feed };
        } catch {
          return { items: [] as ParsedItem[], feed, failed: true };
        }
      }),
    );

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        const { items, feed, failed } = result.value as { items: ParsedItem[]; feed: QualityFeedSource; failed?: boolean };
        if (failed) {
          feedsFailed++;
        } else {
          feedsOk++;
          totalRawItems += items.length;
          for (const item of items) {
            allItems.push({ item, feed });
          }
        }
      } else {
        feedsFailed++;
      }
    }
  }

  // Detect signals from all items
  const signals: IntelSignal[] = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  for (const { item, feed } of allItems) {
    const rawText = `${item.title ?? ''} ${item.description ?? ''}`;
    const text = rawText.replace(/<[^>]+>/g, ' '); // strip HTML for pattern matching
    if (text.length < 20) continue;

    // Deduplicate by URL first
    const url = item.link ?? '';
    if (url && seenUrls.has(url)) continue;

    // Deduplicate by normalized title (catch same story from multiple feeds)
    const normalizedTitle = (item.title ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 60);
    if (normalizedTitle.length > 20 && seenTitles.has(normalizedTitle)) continue;

    // Score ALL matching patterns — pick best (highest confidence), track how many matched
    let bestMatch: (typeof SIGNAL_PATTERNS)[0] | null = null;
    let matchCount = 0;
    for (const pattern of SIGNAL_PATTERNS) {
      if (pattern.patterns.some(re => re.test(text))) {
        matchCount++;
        if (!bestMatch || pattern.confidence > bestMatch.confidence) {
          bestMatch = pattern;
        }
      }
    }
    if (!bestMatch) continue;

    if (url) seenUrls.add(url);
    if (normalizedTitle.length > 20) seenTitles.add(normalizedTitle);

    // Detect industry from text
    let industry: IntelIndustry = 'general';
    for (const { industry: ind, keywords } of INDUSTRY_KEYWORDS) {
      if (keywords.test(text)) {
        industry = ind;
        break;
      }
    }

    // Fallback: infer industry from feed tags when text detection fails
    if (industry === 'general' && feed.tags.length > 0) {
      const tagStr = feed.tags.join(' ').toLowerCase();
      if (/defense|military|aerospace|pentagon|darpa/.test(tagStr)) industry = 'defense';
      else if (/cyber|security|malware|vulnerability/.test(tagStr)) industry = 'cybersecurity';
      else if (/\bai\b|machine-learning|deep-learning|neural/.test(tagStr)) industry = 'ai-ml';
      else if (/energy|renewable|solar|wind|grid/.test(tagStr)) industry = 'energy';
      else if (/health|medical|pharma|biotech|clinical/.test(tagStr)) industry = 'healthcare';
      else if (/logistics|supply-chain|freight|shipping/.test(tagStr)) industry = 'logistics';
      else if (/manufactur|factory|robotics|automation|industrial/.test(tagStr)) industry = 'manufacturing';
    }

    // Extract metadata
    const amount = extractAmount(text);
    const company = extractCompany(text, feed.name);

    // Confidence boost for richer signals
    let confidence = bestMatch.confidence;
    if (company) confidence = Math.min(1, confidence + 0.05);
    if (amount) confidence = Math.min(1, confidence + 0.05);
    if (matchCount >= 2) confidence = Math.min(1, confidence + 0.05); // multiple pattern types → stronger signal

    const id = `intel-${bestMatch.type}-${hashCode(url || item.title || '')}`;

    signals.push({
      id,
      type: bestMatch.type,
      industry,
      title: (item.title ?? '').replace(/<[^>]+>/g, '').trim().slice(0, 200),
      url,
      source: feed.name,
      evidence: cleanEvidence(item.description ?? ''),
      company,
      amountUsd: amount,
      confidence,
      discoveredAt: item.pubDate ?? new Date().toISOString(),
      tags: feed.tags,
    });
  }

  // Sort by confidence descending, then by date
  signals.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime();
  });

  // Build stats
  const signalsByType: Record<string, number> = {};
  const signalsByIndustry: Record<string, number> = {};
  for (const s of signals) {
    signalsByType[s.type] = (signalsByType[s.type] ?? 0) + 1;
    signalsByIndustry[s.industry] = (signalsByIndustry[s.industry] ?? 0) + 1;
  }

  const store: IntelDiscoveryStore = {
    signals: signals.slice(0, 500), // Cap at 500
    as_of: new Date().toISOString(),
    feeds_scanned: selectedFeeds.length,
    feeds_ok: feedsOk,
    feeds_failed: feedsFailed,
    total_raw_items: totalRawItems,
    signals_by_type: signalsByType,
    signals_by_industry: signalsByIndustry,
    scan_duration_ms: Date.now() - startMs,
  };

  setCachedIntelDiscovery(store);

  // Persist to Supabase (fire-and-forget, don't block response)
  persistIntelSignals(store.signals).then(count => {
    if (count > 0) console.log(`[intel-discovery] Persisted ${count} signals to Supabase`);
  }).catch(err => {
    console.warn('[intel-discovery] Failed to persist signals:', err);
  });

  // Log IKER predictions for funding signals (self-learning loop)
  // These will be measured ~180 days later when outcomes are known
  const fundingSignals = store.signals.filter(s =>
    s.type === 'funding_round' && s.company && s.confidence >= 0.7
  );
  if (fundingSignals.length > 0) {
    Promise.all(
      fundingSignals.slice(0, 10).map(sig =>
        logPrediction({
          entity_id: sig.company?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? 'unknown',
          entity_name: sig.company ?? null,
          prediction_type: 'funding',
          predicted_score: sig.confidence,
          prediction_horizon: 180,
          context_data: { signal_id: sig.id, industry: sig.industry, source: sig.source },
          agent: 'intel-discovery',
        }).catch(() => null),
      ),
    ).catch((err) => console.warn('[IntelDiscoveryAgent] batch upsert failed:', err));
  }

  return store;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function hashCode(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

/** Get stats summary for API response */
export function getIntelStats(store: IntelDiscoveryStore): {
  total_signals: number;
  by_type: Record<string, number>;
  by_industry: Record<string, number>;
  top_signals: IntelSignal[];
} {
  return {
    total_signals: store.signals.length,
    by_type: store.signals_by_type,
    by_industry: store.signals_by_industry,
    top_signals: store.signals.slice(0, 20),
  };
}
