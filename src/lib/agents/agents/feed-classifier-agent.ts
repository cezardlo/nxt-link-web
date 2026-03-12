// src/lib/agents/agents/feed-classifier-agent.ts
// Keyword-first classification agent for NXT//LINK feed articles.
// Scores articles against all category keyword lists using TF-IDF-like weighting.
// Falls back to Gemini only when confidence < 0.4.

import type { FeedCategory } from '@/lib/agents/feed-agent';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ClassificationResult = {
  category: FeedCategory;
  confidence: number;           // 0.0–1.0
  relevanceToElPaso: boolean;
  sentiment: 'positive' | 'negative' | 'neutral';
  keyEntities: string[];
  secondaryCategory?: FeedCategory;
  usedGemini: boolean;
};

export type ArticleInput = {
  title: string;
  description: string;
  source: string;
  fullText?: string;  // scraped article body (optional)
};

// ─── Keyword dictionaries ───────────────────────────────────────────────────────
// Each category has 200+ keywords ordered roughly by signal strength.

export const CLASSIFICATION_KEYWORDS: Record<FeedCategory, string[]> = {
  'AI/ML': [
    // Core AI terms
    'artificial intelligence', 'machine learning', 'deep learning', 'neural network',
    'large language model', 'llm', 'gpt', 'chatgpt', 'generative ai', 'gen ai',
    'transformer', 'diffusion model', 'foundation model', 'computer vision',
    'natural language processing', 'nlp', 'reinforcement learning', 'rlhf',
    'supervised learning', 'unsupervised learning', 'transfer learning',
    'fine-tuning', 'prompt engineering', 'retrieval augmented generation', 'rag',
    // Companies
    'openai', 'anthropic', 'claude', 'deepmind', 'google ai', 'meta ai',
    'microsoft copilot', 'nvidia ai', 'hugging face', 'stability ai',
    'midjourney', 'runway ml', 'cohere', 'mistral', 'perplexity',
    'databricks', 'scale ai', 'c3.ai', 'palantir aip',
    'cerebras', 'groq', 'sambanova', 'inflection', 'xai', 'grok',
    // Hardware
    'gpu', 'tpu', 'h100', 'a100', 'b100', 'mi300', 'gaudi',
    'tensor core', 'inference chip', 'ai accelerator', 'custom silicon',
    'neuromorphic', 'photonic computing',
    // Applications
    'autonomous vehicle', 'self-driving', 'robotics', 'humanoid robot',
    'computer vision', 'object detection', 'image recognition', 'face recognition',
    'speech recognition', 'text-to-speech', 'voice cloning', 'voice synthesis',
    'ai coding', 'github copilot', 'cursor ai', 'code generation',
    'ai agent', 'autonomous agent', 'multimodal', 'vision language model',
    'text-to-image', 'image generation', 'video generation', 'sora',
    'ai drug discovery', 'protein folding', 'alphafold',
    'recommendation system', 'chatbot', 'virtual assistant',
    'predictive analytics', 'anomaly detection', 'pattern recognition',
    // Concepts
    'training data', 'inference', 'model weights', 'parameters',
    'embedding', 'vector database', 'semantic search', 'tokenizer',
    'context window', 'hallucination', 'alignment', 'ai safety',
    'ai ethics', 'ai bias', 'explainable ai', 'xai',
    'federated learning', 'synthetic data', 'data augmentation',
    'model compression', 'quantization', 'pruning', 'distillation',
    'edge ai', 'on-device ai', 'tinyml',
    // Policy
    'ai regulation', 'ai act', 'ai executive order', 'ai governance',
    'responsible ai', 'ai copyright', 'ai legislation',
    // Emerging
    'quantum computing', 'qubit', 'quantum supremacy', 'quantum advantage',
    'blockchain', 'web3', 'decentralized', 'smart contract',
    'metaverse', 'augmented reality', 'virtual reality', 'mixed reality',
    'digital twin', 'simulation', 'iot', 'internet of things',
    '5g', '6g', 'edge computing', 'fog computing',
    'ar headset', 'vr headset', 'spatial computing',
    // Research
    'arxiv', 'preprint', 'benchmark', 'leaderboard', 'sota',
    'attention mechanism', 'convolutional', 'recurrent', 'gan',
    'variational autoencoder', 'contrastive learning', 'self-supervised',
    'open source model', 'model hub', 'api endpoint',
  ],

  'Cybersecurity': [
    // Threats
    'ransomware', 'malware', 'phishing', 'spear phishing', 'social engineering',
    'zero-day', 'zero day', 'exploit', 'vulnerability', 'cve',
    'data breach', 'data leak', 'credential stuffing', 'brute force',
    'denial of service', 'ddos', 'botnet', 'trojan', 'worm', 'rootkit',
    'keylogger', 'spyware', 'adware', 'cryptojacking', 'cryptominer',
    'supply chain attack', 'watering hole', 'man-in-the-middle', 'mitm',
    'sql injection', 'cross-site scripting', 'xss', 'csrf',
    'remote code execution', 'rce', 'privilege escalation',
    'buffer overflow', 'use-after-free', 'heap spray',
    // Threat actors
    'apt', 'advanced persistent threat', 'threat actor', 'nation-state',
    'lazarus group', 'fancy bear', 'cozy bear', 'apt28', 'apt29',
    'volt typhoon', 'sandworm', 'turla', 'kimsuky', 'charming kitten',
    'fin7', 'evil corp', 'lockbit', 'blackcat', 'alphv', 'cl0p', 'clop',
    'conti', 'revil', 'darkside', 'black basta', 'play ransomware',
    'scattered spider', 'lapsus',
    // Defense tech
    'endpoint detection', 'edr', 'xdr', 'mdr', 'soar', 'siem',
    'firewall', 'intrusion detection', 'ids', 'intrusion prevention', 'ips',
    'antivirus', 'anti-malware', 'sandbox', 'detonation',
    'threat intelligence', 'threat hunting', 'ioc', 'indicator of compromise',
    'yara rule', 'sigma rule', 'mitre att&ck', 'mitre attack',
    'kill chain', 'diamond model', 'incident response',
    'digital forensics', 'memory forensics', 'disk forensics',
    'penetration testing', 'pentest', 'red team', 'blue team', 'purple team',
    'bug bounty', 'responsible disclosure', 'coordinated disclosure',
    // Architecture
    'zero trust', 'sase', 'sse', 'casb', 'swg', 'ztna',
    'network segmentation', 'microsegmentation', 'deception technology',
    'honeypot', 'honeytoken', 'canary', 'moving target defense',
    // Identity
    'identity access management', 'iam', 'privileged access', 'pam',
    'multi-factor authentication', 'mfa', 'passwordless', 'passkey', 'fido2',
    'single sign-on', 'sso', 'saml', 'oauth', 'oidc',
    // Cloud security
    'cloud security', 'cspm', 'cwpp', 'cnapp', 'ciem',
    'container security', 'kubernetes security', 'serverless security',
    'infrastructure as code security', 'iac scanning',
    // Compliance
    'cmmc', 'fedramp', 'nist framework', 'nist 800', 'iso 27001',
    'soc 2', 'hipaa security', 'pci dss', 'gdpr security',
    'cyber insurance', 'cyber risk', 'risk assessment',
    // Companies
    'crowdstrike', 'palo alto networks', 'fortinet', 'sentinelone',
    'zscaler', 'cloudflare security', 'okta', 'cyberark', 'wiz',
    'snyk', 'rapid7', 'qualys', 'tenable', 'mandiant',
    'recorded future', 'proofpoint', 'mimecast', 'knowbe4',
    'sophos', 'trend micro', 'check point', 'trellix',
    'dragos', 'claroty', 'nozomi networks', 'armis',
    'tanium', 'carbon black', 'secureworks', 'arctic wolf',
    // OT/ICS
    'ot security', 'ics security', 'scada', 'plc security',
    'industrial control system', 'operational technology',
    // Misc
    'encryption', 'cryptography', 'post-quantum cryptography', 'pqc',
    'ssl', 'tls', 'certificate', 'pki',
    'vpn', 'proxy', 'tor', 'dark web', 'darknet',
    'patch tuesday', 'security update', 'security advisory',
    'cisa alert', 'cisa advisory', 'us-cert',
  ],

  'Defense': [
    // Military branches
    'us army', 'us navy', 'us air force', 'us marine corps', 'usmc',
    'space force', 'ussf', 'coast guard', 'national guard',
    'department of defense', 'dod', 'pentagon',
    // Commands
    'centcom', 'eucom', 'indopacom', 'northcom', 'southcom', 'africom',
    'socom', 'transcom', 'stratcom', 'cybercom', 'spacecom',
    // Agencies
    'darpa', 'disa', 'dla', 'diu', 'dia', 'nsa', 'nro', 'nga',
    'missile defense agency', 'mda', 'army futures command',
    'naval research laboratory', 'air force research laboratory',
    'cdao', 'chief digital officer dod',
    // Contractors
    'lockheed martin', 'raytheon', 'rtx', 'northrop grumman',
    'boeing defense', 'l3harris', 'general dynamics', 'bae systems',
    'saic', 'leidos', 'booz allen', 'caci', 'mantech', 'peraton',
    'anduril', 'palantir defense', 'shield ai', 'kratos defense',
    'textron', 'sierra nevada corp', 'parsons', 'huntington ingalls',
    'elbit systems', 'thales', 'rheinmetall', 'leonardo drs',
    // Programs
    'jadc2', 'ivas', 'ngad', 'b-21 raider', 'f-35', 'f-22',
    'columbia class', 'sentinel icbm', 'flraa', 'fara',
    'abrams', 'bradley', 'stryker', 'omfv', 'mrap',
    'patriot missile', 'thaad', 'iron dome', 'aegis',
    'tomahawk', 'jassm', 'lrasm', 'hypersonic missile',
    'replicator initiative', 'project convergence', 'project overmatch',
    // Capabilities
    'defense contract', 'military contract', 'contract award', 'idiq',
    'task order', 'sole source', 'competitive bid', 'rfp defense',
    'procurement', 'acquisition program', 'milestone decision',
    'operational test', 'initial operational capability', 'ioc',
    'full operational capability', 'foc', 'low rate initial production', 'lrip',
    'electronic warfare', 'signals intelligence', 'sigint', 'elint', 'comint',
    'c4isr', 'command and control', 'battle management',
    'counter-uas', 'counter drone', 'unmanned systems', 'uas', 'uav',
    'autonomous weapons', 'lethal autonomous', 'loitering munition',
    'directed energy', 'laser weapon', 'microwave weapon',
    'stealth', 'low observable', 'radar cross section',
    'nuclear deterrent', 'nuclear modernization', 'nnsa', 'nuclear triad',
    'hypersonic', 'scramjet', 'boost glide',
    'submarine', 'aircraft carrier', 'destroyer', 'frigate',
    // Alliances
    'nato', 'aukus', 'five eyes', 'quad', 'allies',
    'defense cooperation', 'foreign military sales', 'fms',
    'arms export', 'itar', 'military aid',
    // Installations
    'fort bliss', 'white sands missile range', 'holloman afb',
    'fort cavazos', 'fort liberty', 'camp pendleton',
    'joint base', 'military installation', 'defense facility',
    'sandia national', 'los alamos national',
    // Budget
    'defense budget', 'ndaa', 'defense appropriations',
    'pentagon spending', 'military spending', 'defense industrial base',
    // Misc
    'veteran', 'military family', 'ptsd', 'gi bill',
    'recruiting', 'retention', 'military readiness',
    'war game', 'exercise', 'deployment', 'rotation',
  ],

  'Enterprise': [
    // Cloud
    'cloud computing', 'aws', 'amazon web services', 'azure', 'microsoft azure',
    'google cloud', 'gcp', 'oracle cloud', 'ibm cloud', 'alibaba cloud',
    'multi-cloud', 'hybrid cloud', 'cloud migration', 'cloud native',
    'serverless', 'lambda', 'cloud functions', 'faas', 'paas', 'iaas', 'saas',
    // SaaS
    'salesforce', 'servicenow', 'workday', 'hubspot', 'zendesk',
    'atlassian', 'jira', 'confluence', 'slack', 'teams',
    'zoom', 'webex', 'docusign', 'dropbox business',
    'notion', 'airtable', 'monday.com', 'asana', 'clickup',
    'figma', 'canva enterprise', 'miro', 'lucidchart',
    // ERP & CRM
    'erp', 'enterprise resource planning', 'sap', 's/4hana',
    'oracle erp', 'dynamics 365', 'netsuite', 'sage', 'infor',
    'crm', 'customer relationship management', 'pipeline management',
    'marketing automation', 'martech', 'sales enablement',
    // Data
    'data warehouse', 'data lake', 'data lakehouse', 'data mesh',
    'snowflake', 'databricks', 'redshift', 'bigquery',
    'etl', 'elt', 'data pipeline', 'data integration',
    'business intelligence', 'bi', 'tableau', 'power bi', 'looker',
    'data governance', 'data quality', 'master data management',
    'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
    'kafka', 'confluent', 'rabbitmq', 'pulsar',
    // DevOps
    'devops', 'devsecops', 'cicd', 'ci/cd', 'continuous integration',
    'continuous deployment', 'gitlab', 'github', 'bitbucket',
    'jenkins', 'circleci', 'github actions', 'argocd',
    'docker', 'container', 'kubernetes', 'k8s', 'openshift',
    'terraform', 'pulumi', 'ansible', 'chef', 'puppet',
    'istio', 'envoy', 'service mesh', 'api gateway',
    // Observability
    'observability', 'monitoring', 'datadog', 'splunk', 'elastic',
    'new relic', 'dynatrace', 'grafana', 'prometheus',
    'apm', 'application performance', 'log management',
    'opentelemetry', 'tracing', 'metrics', 'alerting',
    // Digital transformation
    'digital transformation', 'modernization', 'legacy migration',
    'technical debt', 'platform engineering', 'developer experience',
    'low-code', 'no-code', 'citizen developer', 'rapid application',
    'rpa', 'robotic process automation', 'uipath', 'automation anywhere',
    'workflow automation', 'process mining', 'process optimization',
    // Networking
    'networking', 'cisco', 'juniper', 'arista', 'sd-wan',
    'wifi 6', 'wifi 7', 'lte', 'private 5g', 'sdn',
    // IT management
    'it service management', 'itsm', 'itil', 'help desk',
    'endpoint management', 'mdm', 'uem', 'patch management',
    'asset management', 'cmdb', 'configuration management',
    // Research
    'gartner', 'forrester', 'idc', 'magic quadrant',
    'technology forecast', 'market research', 'analyst report',
    // GovTech
    'fedramp', 'govcloud', 'government cloud', 'il5', 'il6',
    'government technology', 'govtech', 'civic tech',
    'sam.gov', 'usaspending', 'federal procurement',
  ],

  'Supply Chain': [
    // Logistics
    'supply chain', 'logistics', 'freight', 'shipping', 'cargo',
    'trucking', 'rail freight', 'air freight', 'ocean freight',
    'intermodal', 'multimodal', 'last mile delivery',
    'warehouse', 'warehousing', 'distribution center', 'fulfillment',
    '3pl', 'third-party logistics', '4pl', 'freight forwarder',
    'freight broker', 'customs broker', 'clearing agent',
    // Companies
    'maersk', 'msc', 'cosco', 'cma cgm', 'hapag-lloyd',
    'fedex', 'ups', 'dhl', 'usps', 'amazon logistics',
    'xpo', 'j.b. hunt', 'c.h. robinson', 'kuehne nagel',
    'flexport', 'project44', 'fourkites', 'samsara',
    'uber freight', 'convoy', 'transfix', 'loadsmart',
    // Ports & trade
    'port', 'container terminal', 'container ship', 'teu',
    'port congestion', 'vessel tracking', 'ais data',
    'customs', 'cbp', 'tariff', 'duty', 'import', 'export',
    'trade agreement', 'usmca', 'free trade', 'trade war',
    'sanctions', 'export controls', 'embargo',
    'port of entry', 'commercial crossing', 'bridge traffic',
    // Cross-border
    'cross-border trade', 'maquiladora', 'maquila', 'nearshoring',
    'reshoring', 'friendshoring', 'offshoring', 'outsourcing',
    'foreign trade zone', 'ftz', 'bonded warehouse',
    'c-tpat', 'aeo', 'trusted trader',
    // Semiconductors
    'semiconductor', 'chip', 'integrated circuit', 'foundry',
    'tsmc', 'intel foundry', 'samsung foundry', 'globalfoundries',
    'asml', 'euv lithography', 'chip fabrication', 'wafer',
    'micron', 'sk hynix', 'qualcomm', 'broadcom', 'nvidia chip',
    'amd chip', 'texas instruments', 'nxp', 'infineon', 'stmicro',
    'applied materials', 'lam research', 'kla', 'tokyo electron',
    'chips act', 'semiconductor shortage', 'chip export ban',
    'hbm', 'dram', 'nand', 'sram', 'memory chip',
    // Manufacturing
    'manufacturing', 'factory', 'assembly line', 'production line',
    'lean manufacturing', 'six sigma', 'kaizen', 'just-in-time',
    'industry 4.0', 'smart factory', 'digital factory',
    'additive manufacturing', '3d printing', 'cnc machining',
    'quality control', 'quality assurance', 'inspection',
    'bill of materials', 'bom', 'procurement', 'sourcing',
    // Raw materials
    'raw materials', 'commodities', 'rare earth', 'lithium',
    'cobalt', 'nickel', 'copper', 'steel', 'aluminum',
    'critical minerals', 'mining', 'refining', 'processing',
    // Tech
    'supply chain visibility', 'track and trace', 'rfid',
    'barcode', 'iot sensor', 'digital supply chain',
    'demand planning', 'demand forecasting', 'inventory management',
    'warehouse management system', 'wms', 'tms', 'erp scm',
    'autonomous truck', 'delivery drone', 'warehouse robot',
    // Disruption
    'supply chain disruption', 'shortage', 'backlog', 'lead time',
    'stockout', 'bullwhip effect', 'supply chain risk',
    'supplier diversification', 'dual sourcing',
  ],

  'Energy': [
    // Oil & gas
    'oil', 'crude oil', 'petroleum', 'natural gas', 'lng',
    'refinery', 'pipeline', 'drilling', 'fracking', 'hydraulic fracturing',
    'shale', 'permian basin', 'eagle ford', 'bakken',
    'opec', 'opec+', 'oil price', 'wti', 'brent crude',
    'upstream', 'midstream', 'downstream', 'petrochemical',
    'exxonmobil', 'chevron', 'conocophillips', 'bp', 'shell',
    // Renewables
    'renewable energy', 'clean energy', 'green energy',
    'solar', 'solar panel', 'photovoltaic', 'pv', 'solar farm',
    'wind', 'wind turbine', 'offshore wind', 'onshore wind', 'wind farm',
    'hydropower', 'hydroelectric', 'dam', 'tidal energy',
    'geothermal', 'biomass', 'biofuel', 'ethanol', 'biodiesel',
    // Storage
    'battery', 'battery storage', 'energy storage', 'lithium-ion',
    'solid-state battery', 'sodium-ion', 'flow battery',
    'grid-scale storage', 'pumped hydro', 'compressed air',
    // EV
    'electric vehicle', 'ev', 'ev charging', 'charger', 'evse',
    'supercharger', 'fast charging', 'dc fast charge',
    'tesla', 'rivian', 'lucid', 'byd', 'nio',
    'electric bus', 'electric truck', 'fleet electrification',
    // Nuclear
    'nuclear', 'nuclear power', 'nuclear reactor', 'smr',
    'small modular reactor', 'advanced reactor', 'gen iv',
    'nuclear fusion', 'fusion reactor', 'tokamak', 'stellarator',
    'iter', 'commonwealth fusion', 'helion', 'tae technologies',
    'nuscale', 'oklo', 'x-energy', 'terrapower', 'kairos',
    // Hydrogen
    'hydrogen', 'green hydrogen', 'blue hydrogen', 'gray hydrogen',
    'electrolyzer', 'fuel cell', 'hydrogen storage',
    'hydrogen pipeline', 'hydrogen hub',
    // Grid
    'electric grid', 'power grid', 'transmission', 'distribution',
    'ercot', 'pjm', 'caiso', 'miso', 'spp',
    'grid modernization', 'smart grid', 'smart meter', 'ami',
    'microgrid', 'distributed energy', 'der', 'virtual power plant', 'vpp',
    'demand response', 'grid stability', 'frequency regulation',
    'interconnection', 'grid congestion', 'curtailment',
    // Utilities
    'utility', 'electric utility', 'regulated utility', 'ipp',
    'nextera', 'duke energy', 'southern company', 'dominion',
    'aep', 'xcel energy', 'entergy', 'exelon', 'eversource',
    'el paso electric', 'epwu', 'water utility',
    // Water
    'water', 'water treatment', 'wastewater', 'desalination',
    'water reuse', 'water recycling', 'water conservation',
    'membrane', 'reverse osmosis', 'water infrastructure',
    'water scarcity', 'drought', 'aquifer', 'groundwater',
    // Climate & carbon
    'carbon capture', 'ccs', 'ccus', 'carbon sequestration',
    'carbon credit', 'carbon offset', 'carbon market',
    'climate tech', 'cleantech', 'esg', 'sustainability',
    'net zero', 'decarbonization', 'emissions reduction',
    'greenhouse gas', 'methane', 'co2',
  ],

  'Finance': [
    // Markets
    'stock market', 'equity', 'bond', 'treasury', 'yield',
    'nasdaq', 'nyse', 's&p 500', 'dow jones', 'russell',
    'bull market', 'bear market', 'correction', 'rally',
    'earnings', 'revenue', 'profit', 'guidance', 'forecast',
    'market cap', 'valuation', 'pe ratio', 'dividend',
    // Banking
    'bank', 'banking', 'commercial bank', 'investment bank',
    'jpmorgan', 'goldman sachs', 'morgan stanley', 'bank of america',
    'citigroup', 'wells fargo', 'hsbc', 'ubs', 'deutsche bank',
    'federal reserve', 'interest rate', 'monetary policy', 'fed funds',
    'inflation', 'cpi', 'gdp', 'recession', 'unemployment',
    'fdic', 'occ', 'banking regulation', 'stress test',
    'deposit', 'lending', 'mortgage', 'credit card',
    // FinTech
    'fintech', 'financial technology', 'neobank', 'digital bank',
    'stripe', 'square', 'block inc', 'paypal', 'adyen',
    'plaid', 'marqeta', 'green dot', 'chime', 'revolut',
    'sofi', 'robinhood', 'wealthfront', 'betterment',
    'buy now pay later', 'bnpl', 'affirm', 'klarna', 'afterpay',
    'payment processing', 'digital wallet', 'mobile payment',
    'contactless payment', 'real-time payment', 'instant payment',
    'open banking', 'embedded finance', 'banking as a service',
    // Crypto
    'cryptocurrency', 'bitcoin', 'ethereum', 'crypto',
    'stablecoin', 'usdc', 'usdt', 'tether',
    'coinbase', 'binance', 'kraken', 'gemini exchange',
    'defi', 'decentralized finance', 'yield farming',
    'nft', 'non-fungible token', 'web3', 'dao',
    'crypto regulation', 'sec crypto', 'spot bitcoin etf',
    // Investment
    'venture capital', 'vc', 'series a', 'series b', 'series c',
    'seed funding', 'angel investor', 'startup funding',
    'ipo', 'initial public offering', 'direct listing', 'spac',
    'private equity', 'pe', 'buyout', 'leveraged buyout',
    'merger', 'acquisition', 'm&a', 'takeover',
    'hedge fund', 'mutual fund', 'etf', 'index fund',
    'blackrock', 'vanguard', 'state street', 'fidelity',
    // Government finance
    'federal budget', 'appropriations', 'continuing resolution',
    'government spending', 'fiscal policy', 'deficit', 'debt ceiling',
    'government shutdown', 'sequestration',
    'defense spending', 'infrastructure spending',
    // Insurance
    'insurance', 'insurtech', 'underwriting', 'claims',
    'reinsurance', 'cyber insurance', 'risk management',
    // Cross-border
    'remittance', 'cross-border payment', 'forex', 'exchange rate',
    'currency', 'dollar', 'euro', 'peso', 'yen',
    'wise', 'western union', 'moneygram', 'remitly',
    'correspondent banking', 'swift', 'wire transfer',
    // Regulatory
    'sec', 'securities exchange commission', 'cftc', 'finra',
    'dodd-frank', 'basel', 'aml', 'kyc', 'know your customer',
    'anti-money laundering', 'sanctions compliance',
    'regtech', 'regulatory technology', 'compliance automation',
  ],

  'Crime': [
    // Violent crime
    'homicide', 'murder', 'shooting', 'stabbing', 'assault',
    'armed robbery', 'carjacking', 'kidnapping', 'hostage',
    'domestic violence', 'aggravated assault', 'battery',
    'manslaughter', 'attempted murder', 'drive-by',
    // Property crime
    'theft', 'burglary', 'robbery', 'larceny', 'shoplifting',
    'auto theft', 'vehicle theft', 'stolen vehicle',
    'arson', 'vandalism', 'trespassing', 'break-in',
    'identity theft', 'fraud', 'forgery', 'embezzlement',
    // Drug crime
    'drug trafficking', 'narcotics', 'fentanyl', 'methamphetamine',
    'cocaine', 'heroin', 'marijuana', 'drug seizure',
    'drug bust', 'controlled substance', 'drug deal',
    'overdose', 'opioid', 'drug cartel',
    // Law enforcement
    'police', 'sheriff', 'deputy', 'officer', 'trooper',
    'arrest', 'arrested', 'suspect', 'apprehended', 'detained',
    'investigation', 'detective', 'forensic', 'evidence',
    'warrant', 'indictment', 'charged', 'prosecution',
    'conviction', 'sentencing', 'prison', 'jail', 'inmate',
    'probation', 'parole', 'bail', 'bond', 'plea deal',
    'most wanted', 'fugitive', 'manhunt', 'chase',
    'body camera', 'dash camera', 'use of force',
    // Agencies
    'fbi', 'dea', 'atf', 'ice', 'cbp', 'border patrol',
    'us marshals', 'secret service', 'homeland security',
    'texas dps', 'texas rangers', 'eppd', 'el paso police',
    'el paso sheriff', 'county sheriff',
    // Border & transnational
    'smuggling', 'human smuggling', 'human trafficking',
    'border crossing', 'illegal entry', 'undocumented',
    'stash house', 'tunnel', 'contraband',
    'cartel', 'gang', 'organized crime', 'racketeering', 'rico',
    'money laundering', 'wire fraud', 'conspiracy',
    // Emergency
    'crime scene', 'victim', 'witness', 'emergency', '911',
    'swat', 'tactical unit', 'hostage negotiation',
    'amber alert', 'silver alert', 'missing person',
    'hit and run', 'dui', 'dwi', 'intoxicated', 'impaired driving',
    'fatal crash', 'traffic fatality', 'vehicular homicide',
    // Courts
    'grand jury', 'trial', 'verdict', 'guilty', 'not guilty',
    'acquittal', 'appeal', 'district court', 'federal court',
    'district attorney', 'prosecutor', 'public defender',
    // El Paso specific
    'el paso crime', 'el paso arrest', 'el paso shooting',
    'el paso police', 'juarez violence', 'border violence',
    // Public safety tech
    'shotspotter', 'gunshot detection', 'surveillance camera',
    'ring doorbell', 'license plate reader', 'alpr',
    'real-time crime center', 'crime analytics', 'predictive policing',
  ],

  'General': [
    // Catch-all terms that don't strongly signal any specific category
    'technology', 'innovation', 'startup', 'business', 'industry',
    'announcement', 'update', 'report', 'analysis', 'opinion',
    'conference', 'summit', 'expo', 'trade show',
    'policy', 'regulation', 'legislation', 'executive order',
    'research', 'study', 'survey', 'white paper',
    'partnership', 'collaboration', 'joint venture',
    'hiring', 'layoff', 'restructuring', 'reorganization',
    'expansion', 'opening', 'closing', 'relocation',
    'community', 'local', 'regional', 'state', 'national',
    'education', 'university', 'school', 'training',
    'healthcare', 'hospital', 'medical', 'health',
    'real estate', 'construction', 'development', 'zoning',
    'transportation', 'transit', 'highway', 'bridge', 'road',
    'weather', 'climate', 'natural disaster', 'wildfire', 'flood',
    'tourism', 'travel', 'hospitality', 'restaurant',
    'sports', 'entertainment', 'culture', 'arts',
    'el paso', 'borderplex', 'west texas', 'southern new mexico',
  ],
};

// ─── El Paso relevance keywords ─────────────────────────────────────────────────

const EL_PASO_KEYWORDS: string[] = [
  'el paso', 'elpaso', 'ep texas', 'sun city',
  'ciudad juarez', 'juarez', 'juárez',
  'fort bliss', 'white sands', 'holloman',
  'utep', 'university texas el paso',
  'borderplex', 'epedco', 'paso del norte',
  'el paso electric', 'epwu', 'sun metro',
  'ktsm', 'kfox', 'kvia', 'kdbc',
  'las cruces', 'dona ana', 'otero county',
  'chihuahua', 'maquiladora', 'maquila',
  'westside', 'northeast el paso', 'montana avenue',
  'mesa street', 'paisano', 'border highway',
  'ysleta', 'socorro', 'horizon city', 'anthony tx',
  'sunland park', 'santa teresa',
  'william beaumont', 'sierra medical', 'del sol medical',
  'i-10 texas', 'loop 375', 'spur 601',
];

// ─── Sentiment keywords ─────────────────────────────────────────────────────────

const POSITIVE_KEYWORDS: string[] = [
  'launch', 'launched', 'announces', 'awarded', 'award', 'wins', 'won',
  'partnership', 'partnered', 'collaboration', 'expansion', 'expands',
  'growth', 'growing', 'revenue increase', 'profit', 'profitable',
  'funding', 'raised', 'investment', 'acquisition', 'acquired',
  'innovation', 'innovative', 'breakthrough', 'milestone', 'achievement',
  'approved', 'approval', 'certified', 'compliant', 'upgrade',
  'hiring', 'hires', 'new jobs', 'record high', 'record revenue',
  'progress', 'advancing', 'successful', 'improves', 'improvement',
  'deployment', 'deployed', 'operational', 'delivered', 'delivery',
  'exceeded expectations', 'beat estimates', 'outperformed',
];

const NEGATIVE_KEYWORDS: string[] = [
  'breach', 'breached', 'hacked', 'attack', 'attacked',
  'vulnerability', 'exploit', 'compromised', 'ransomware',
  'layoff', 'layoffs', 'fired', 'downsizing', 'restructuring',
  'decline', 'declining', 'loss', 'losses', 'deficit',
  'failure', 'failed', 'crash', 'outage', 'disruption',
  'lawsuit', 'sued', 'fine', 'fined', 'penalty', 'sanctions',
  'investigation', 'probe', 'scrutiny', 'violation',
  'recall', 'defect', 'malfunction', 'shutdown',
  'delay', 'delayed', 'overbudget', 'cost overrun',
  'bankrupt', 'bankruptcy', 'insolvent', 'default',
  'fraud', 'scam', 'theft', 'stolen', 'crime', 'arrest',
  'shooting', 'killed', 'death', 'fatal', 'victim',
  'warning', 'threat', 'risk', 'danger', 'critical vulnerability',
  'missed expectations', 'below estimates', 'underperformed',
];

// ─── Entity extraction patterns ─────────────────────────────────────────────────

const ENTITY_PATTERNS: Array<[RegExp, string]> = [
  // Major tech companies
  [/\b(OpenAI|Anthropic|Google|Meta|Microsoft|Apple|Amazon|NVIDIA|AMD|Intel)\b/gi, ''],
  // Defense contractors
  [/\b(Lockheed Martin|Raytheon|RTX|Northrop Grumman|Boeing|L3Harris|General Dynamics|BAE Systems|SAIC|Leidos|Booz Allen|Palantir|Anduril)\b/gi, ''],
  // Cyber companies
  [/\b(CrowdStrike|Palo Alto Networks|Fortinet|SentinelOne|Zscaler|Okta|CyberArk)\b/gi, ''],
  // Cloud
  [/\b(AWS|Azure|GCP|Salesforce|ServiceNow|Snowflake|Datadog|Splunk)\b/gi, ''],
  // Government agencies
  [/\b(DoD|Pentagon|DARPA|DISA|DHS|CBP|ICE|FBI|DEA|ATF|NSA|CIA|NASA|NIST|NSF|EPA|FCC|FTC|SEC|FAA|DOE|DOT)\b/g, ''],
  // Military
  [/\b(US Army|US Navy|Air Force|Space Force|Marines|SOCOM|CENTCOM|NORTHCOM)\b/gi, ''],
  // Financial
  [/\b(JPMorgan|Goldman Sachs|Morgan Stanley|BlackRock|Stripe|PayPal|Coinbase)\b/gi, ''],
  // Supply chain
  [/\b(TSMC|Maersk|FedEx|UPS|DHL|Flexport)\b/gi, ''],
  // Dollar amounts
  [/\$[\d,.]+\s*(million|billion|M|B|mn|bn)/gi, ''],
];

// ─── Classifier implementation ──────────────────────────────────────────────────

function countKeywordHits(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      hits++;
      // Bonus for multi-word keywords (more specific)
      if (kw.includes(' ')) hits += 0.5;
    }
  }
  return hits;
}

function scoreCategoryForArticle(
  article: ArticleInput,
  category: FeedCategory,
  keywords: string[],
): number {
  // Title keywords worth 3x
  const titleHits = countKeywordHits(article.title, keywords) * 3;
  // Description (first paragraph) worth 2x
  const descHits = countKeywordHits(article.description, keywords) * 2;
  // Full text worth 1x (if available)
  const bodyHits = article.fullText ? countKeywordHits(article.fullText, keywords) : 0;

  const totalHits = titleHits + descHits + bodyHits;

  // Normalize: divide by keyword count to get a 0–1 range
  // We use a sigmoid-like function to map raw hits to confidence
  const maxExpectedHits = 15; // diminishing returns after 15 unique keyword matches
  const confidence = totalHits / (totalHits + maxExpectedHits);

  return confidence;
}

function detectSentiment(article: ArticleInput): 'positive' | 'negative' | 'neutral' {
  const combined = `${article.title} ${article.description}`.toLowerCase();
  const posScore = countKeywordHits(combined, POSITIVE_KEYWORDS);
  const negScore = countKeywordHits(combined, NEGATIVE_KEYWORDS);

  if (posScore > negScore + 1) return 'positive';
  if (negScore > posScore + 1) return 'negative';
  return 'neutral';
}

function detectElPasoRelevance(article: ArticleInput): boolean {
  const combined = `${article.title} ${article.description} ${article.source}`.toLowerCase();
  return EL_PASO_KEYWORDS.some(kw => combined.includes(kw));
}

function extractEntities(article: ArticleInput): string[] {
  const combined = `${article.title} ${article.description}`;
  const entities = new Set<string>();

  for (const [pattern] of ENTITY_PATTERNS) {
    const matches = combined.matchAll(new RegExp(pattern.source, pattern.flags));
    for (const match of matches) {
      entities.add(match[0].trim());
    }
  }

  return Array.from(entities).slice(0, 5);
}

/**
 * Classify a single article using keyword scoring.
 * Returns the classification result with confidence.
 * If confidence < 0.4, the caller should fall back to Gemini.
 */
export function classifyArticle(article: ArticleInput): ClassificationResult {
  const categories = Object.keys(CLASSIFICATION_KEYWORDS) as FeedCategory[];
  const scores: Array<{ category: FeedCategory; score: number }> = [];

  for (const cat of categories) {
    const score = scoreCategoryForArticle(article, cat, CLASSIFICATION_KEYWORDS[cat]);
    scores.push({ category: cat, score });
  }

  // Sort descending by score
  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];
  const secondBest = scores[1];

  // If the best score is 'General' and there's a close second, prefer the specific category
  let finalCategory = best.category;
  let finalConfidence = best.score;
  if (best.category === 'General' && secondBest && secondBest.score > 0.15) {
    finalCategory = secondBest.category;
    finalConfidence = secondBest.score;
  }

  return {
    category: finalCategory,
    confidence: Math.round(finalConfidence * 100) / 100,
    relevanceToElPaso: detectElPasoRelevance(article),
    sentiment: detectSentiment(article),
    keyEntities: extractEntities(article),
    secondaryCategory: secondBest?.score > 0.1 ? secondBest.category : undefined,
    usedGemini: false,
  };
}

/**
 * Classify a batch of articles. Returns results for all articles.
 * Articles with confidence < threshold are marked for Gemini fallback.
 */
export function classifyBatch(
  articles: ArticleInput[],
  confidenceThreshold: number = 0.4,
): { results: ClassificationResult[]; needsGemini: number[] } {
  const results: ClassificationResult[] = [];
  const needsGemini: number[] = [];

  for (let i = 0; i < articles.length; i++) {
    const result = classifyArticle(articles[i]);
    results.push(result);
    if (result.confidence < confidenceThreshold) {
      needsGemini.push(i);
    }
  }

  return { results, needsGemini };
}

/**
 * Get classification stats for debugging/logging.
 */
export function getClassificationStats(results: ClassificationResult[]): {
  total: number;
  byCategory: Record<string, number>;
  avgConfidence: number;
  geminiCount: number;
  elPasoRelevant: number;
} {
  const byCategory: Record<string, number> = {};
  let totalConfidence = 0;
  let geminiCount = 0;
  let elPasoRelevant = 0;

  for (const r of results) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    totalConfidence += r.confidence;
    if (r.usedGemini) geminiCount++;
    if (r.relevanceToElPaso) elPasoRelevant++;
  }

  return {
    total: results.length,
    byCategory,
    avgConfidence: results.length > 0 ? Math.round((totalConfidence / results.length) * 100) / 100 : 0,
    geminiCount,
    elPasoRelevant,
  };
}
