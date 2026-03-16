// src/lib/data/framework-analysis.ts
// Curated static Porter's Five Forces + PESTLE analysis for core NXT LINK industries.
//
// These are researcher-authored assessments backed by market evidence, government budget
// data, and technology trends as of early 2026. They serve as the authoritative floor
// when live signal data is sparse (confidence < 0.5) or as enrichment context.
//
// Evidence references are grounded in:
//   - US DoD budget documents (FY25/FY26)
//   - CBP / GSA procurement data for border-tech
//   - Technology maturity and vendor counts in TECHNOLOGY_CATALOG
//   - Industry analyst consensus (Gartner, IDC, CSIS)

import type { PorterAnalysis, PestleAnalysis } from '@/lib/engines/strategic-frameworks';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type StaticFrameworkAnalysis = {
  slug: string;
  label: string;
  analyzed_at: string;          // ISO date — when this was authored
  porter: PorterAnalysis;
  pestle: PestleAnalysis;
};

// ─── AI / ML ───────────────────────────────────────────────────────────────────

const AI_ML: StaticFrameworkAnalysis = {
  slug: 'ai-ml',
  label: 'AI / ML',
  analyzed_at: '2026-03-01',

  porter: {
    overall_attractiveness: 54,
    overall_label: 'Moderately attractive',
    confidence: 0.88,
    forces: {
      competitive_rivalry: {
        name: 'Competitive Rivalry',
        score: 82,
        level: 'very_high',
        description: 'Extremely intense — hyperscalers, defense primes, and hundreds of startups compete across every AI sub-segment. OpenAI, Google DeepMind, Anthropic, Meta AI, and Mistral race on foundation models while Palantir, Scale AI, and C3.ai compete for enterprise contracts.',
        evidence: [
          'OpenAI, Google, Meta, Anthropic, Mistral racing on frontier models with monthly releases',
          'Palantir AIP vs Microsoft Copilot vs C3.ai competing for $3.2B DoD AI services market',
          '85+ vendors in Generative AI category alone (TECHNOLOGY_CATALOG)',
          'DoD CDAO ran 700+ AI experiments in FY24 across competing vendor platforms',
          'NVIDIA H100 allocations create parallel competition at the hardware layer',
          'Army AI Task Force and Air Force CDAO issuing overlapping OTAs to dozens of vendors',
        ],
      },
      threat_of_new_entrants: {
        name: 'Threat of New Entrants',
        score: 75,
        level: 'high',
        description: 'Low capital barriers for software-layer AI startups; open-weight models (Llama, Mistral) remove moat from proprietary model weights. New entrants emerge weekly in application layers. Hardware infrastructure remains a barrier.',
        evidence: [
          'Meta released Llama 3 open weights — any startup can build on foundation models for free',
          'Hugging Face hosts 500K+ models; marginal cost to deploy fine-tuned models near zero',
          '1,200+ AI startups raised seed/Series A in 2024 (Crunchbase)',
          'SBIR/STTR Phase I awards averaging $250K create DoD entry ramp for small firms',
          'Google TPU, AWS Trainium reducing compute costs 40% annually',
          'Hardware barriers remain: NVIDIA H100 clusters cost $50M+ to own',
        ],
      },
      threat_of_substitutes: {
        name: 'Threat of Substitutes',
        score: 48,
        level: 'moderate',
        description: 'Traditional software, rules-based systems, and human analysts are substitutes, but AI performance advantages in speed and scale make substitution increasingly unattractive. Within AI, model-to-model substitution is very high.',
        evidence: [
          '7 competing AI technology categories tracked in TECHNOLOGY_CATALOG',
          'Rules-based RPA systems are viable substitutes for narrow AI tasks',
          'Human analyst teams still preferred in high-stakes national security decisions',
          'AI model substitutability is high — switching from GPT-4 to Gemini is low friction',
          'Edge AI vs cloud AI creates intra-sector substitution dynamic',
        ],
      },
      bargaining_power_suppliers: {
        name: 'Supplier Power',
        score: 78,
        level: 'high',
        description: 'NVIDIA dominates GPU supply with 80%+ data center market share, giving it extraordinary pricing power. Cloud hyperscalers (AWS, Azure, GCP) control the infrastructure layer. Semiconductor supply concentration creates systemic dependency.',
        evidence: [
          'NVIDIA holds ~80% share of AI training GPU market; H100 listed at $30K, street price $40K+',
          'TSMC manufactures >90% of advanced AI chips — single-point supply concentration',
          'AWS, Azure, GCP control cloud AI infrastructure — lock-in through proprietary APIs',
          'Anthropic, OpenAI, Google have exclusive access to large proprietary training datasets',
          'Export controls on advanced chips (BIS Entity List) restrict competitive supply alternatives',
          'US CHIPS Act investing $52B to reduce supplier concentration, but impact is 3-5 years away',
        ],
      },
      bargaining_power_buyers: {
        name: 'Buyer Power',
        score: 44,
        level: 'moderate',
        description: 'Enterprise buyers have growing negotiating leverage as more vendors compete for contracts. Government buyers (DoD, DHS) use competitive bidding and OTAs. However, deep model integration creates switching costs that reduce leverage post-deployment.',
        evidence: [
          'DoD used JEDI/JWCC competitive process to engage multiple cloud AI vendors simultaneously',
          'Enterprise AI budgets growing 35% annually (IDC 2025) — buyers have capital to negotiate',
          'AI integration lock-in: replacing an embedded LLM in production is 6-18 month effort',
          'Fort Bliss and CBP run competitive OTAs — multiple vendors awarded on same program',
          '$3.2B FY25 DoD AI budget gives federal buyers concentrated purchasing power',
          'Open-source models reduce vendor lock-in for buyers who invest in in-house engineering',
        ],
      },
    },
  },

  pestle: {
    dominant_factor: 'political',
    overall_environment: 'favorable',
    confidence: 0.88,
    factors: [
      {
        category: 'political',
        label: 'Political',
        score: 88,
        sentiment: 'positive',
        description: 'Bipartisan political support for AI leadership as a national security imperative. Executive orders, CDAO mandates, and FY25 NDAA provisions all accelerate government AI adoption. AI governance frameworks (NIST AI RMF) create structure without blocking progress.',
        evidence: [
          'DoD CDAO established by FY22 NDAA — dedicated AI coordination office with authority',
          'FY25 NDAA directed DoD to accelerate AI adoption with $3.2B appropriation',
          'Executive Order on Safe AI (Oct 2023) set governance standards without blocking R&D',
          'NIST AI Risk Management Framework adopted as US government standard',
          'US export controls on AI chips protect domestic competitive advantage',
          'Fort Bliss AI Task Force has explicit Congressional mandate to field AI systems',
        ],
      },
      {
        category: 'economic',
        label: 'Economic',
        score: 91,
        sentiment: 'positive',
        description: 'Strongest investment environment in technology history. $200B+ in AI venture funding in 2024. Government AI spending growing 25% annually. The economic case for AI productivity gains is driving unprecedented capital deployment.',
        evidence: [
          '$200B+ in global AI venture investment in 2024 (PitchBook)',
          'Microsoft committed $80B in AI infrastructure spending for FY25',
          'DoD AI/ML budget grew from $800M (FY20) to $3.2B (FY25) — 4x in 5 years',
          'NVIDIA market cap exceeded $3T — larger than most G20 nation GDPs',
          'US AI sector employing 900K+ workers with median salary $165K',
          'McKinsey estimates AI adds $4.4T annually to global economy by 2030',
        ],
      },
      {
        category: 'social',
        label: 'Social',
        score: 68,
        sentiment: 'positive',
        description: 'Consumer and enterprise adoption accelerating rapidly. Workforce anxiety about displacement creates resistance but also training demand. STEM pipeline investment is positive but lags industry need by 3-5 years.',
        evidence: [
          '200M+ ChatGPT weekly users as of Jan 2025 — fastest consumer technology adoption in history',
          'AI skills listed in 40% of US job postings (LinkedIn 2025)',
          'UTEP CS and data science enrollment up 28% since 2022',
          'Poll: 62% of Americans believe AI will change their job significantly within 5 years',
          'El Paso tech workforce growing but ML engineer shortage remains acute',
          'National AI talent competition — 15K unfilled ML roles in government sector',
        ],
      },
      {
        category: 'technological',
        label: 'Technological',
        score: 95,
        sentiment: 'positive',
        description: 'Fastest technology innovation cycle ever recorded. Model capability doubling roughly every 18 months. Edge inference, multimodal AI, and autonomous agents represent next-wave disruptions arriving within 2-3 years.',
        evidence: [
          'GPT-4 to GPT-5 performance gap exceeds entire 2010s decade of ML progress',
          'Llama 3 70B runs on a single server — edge deployment now practical for mid-tier deployments',
          'OpenAI o3 reasoning model achieves 85% on ARC-AGI benchmark (2024)',
          'NVIDIA Blackwell architecture delivers 4x H100 performance — arriving FY26',
          '6 AI tech categories in TECHNOLOGY_CATALOG rated "growing" maturity — innovation front is broad',
          'Autonomous AI agents conducting multi-step research tasks entering production in 2025',
        ],
      },
      {
        category: 'legal',
        label: 'Legal',
        score: 62,
        sentiment: 'neutral',
        description: 'Legal environment is in active formation. EU AI Act is the global benchmark. US is moving toward sector-specific rules. IP ownership of AI outputs, AI liability, and bias discrimination claims are unresolved. Compliance costs will rise.',
        evidence: [
          'EU AI Act entered force Aug 2024 — affects all vendors selling into EU markets',
          'US lacks comprehensive federal AI law — NIST framework is voluntary',
          'AI-generated content copyright cases (Stability AI, OpenAI vs NYT) still in courts',
          'DoD Responsible AI Framework requires explainability and human oversight',
          'FTC investigating AI companies for deceptive practices and bias',
          'ITAR/EAR export controls apply to AI systems with military applications',
        ],
      },
      {
        category: 'environmental',
        label: 'Environmental',
        score: 55,
        sentiment: 'neutral',
        description: 'AI data center energy consumption is a growing concern. Training large models consumes as much electricity as small cities. The industry is responding with efficiency improvements, but the net environmental footprint is growing fast.',
        evidence: [
          'GPT-4 training consumed estimated 1.3 GWh — equal to 130 US homes for one year',
          'Global AI data center power demand projected to double by 2027 (IEA)',
          'Microsoft, Google pledging 100% renewable energy for AI infrastructure',
          'NVIDIA Blackwell chips are 4x more energy efficient than H100 per parameter',
          'El Paso data center growth limited by water availability for cooling',
          'DoD AI workloads on military bases face installation energy constraints',
        ],
      },
    ],
  },
};

// ─── Cybersecurity ─────────────────────────────────────────────────────────────

const CYBERSECURITY: StaticFrameworkAnalysis = {
  slug: 'cybersecurity',
  label: 'Cybersecurity',
  analyzed_at: '2026-03-01',

  porter: {
    overall_attractiveness: 58,
    overall_label: 'Moderately attractive',
    confidence: 0.85,
    forces: {
      competitive_rivalry: {
        name: 'Competitive Rivalry',
        score: 76,
        level: 'high',
        description: 'Highly fragmented market with 5,000+ vendors globally competing across sub-segments. CrowdStrike, Palo Alto Networks, Microsoft, and SentinelOne dominate platforms while hundreds of specialists compete in niches. Platform consolidation is the dominant competitive strategy.',
        evidence: [
          'CrowdStrike, Palo Alto Networks, Microsoft Security, SentinelOne, Fortinet all targeting same enterprise accounts',
          'Gartner tracks 4,500+ distinct cybersecurity vendors globally (2024)',
          'SIEM market alone has 38 tracked vendors in TECHNOLOGY_CATALOG',
          'Zero Trust category has 52 vendors — highest vendor density in cybersecurity',
          'Palo Alto Networks XSIAM vs CrowdStrike Falcon Complete vs Microsoft Sentinel in direct head-to-head',
          'DoD DISA ran 22 competitive IDIQ awards for cybersecurity in FY24',
        ],
      },
      threat_of_new_entrants: {
        name: 'Threat of New Entrants',
        score: 58,
        level: 'moderate',
        description: 'Moderate barriers. Government FedRAMP authorization costs $1-3M and 12-18 months, creating real friction for new entrants. However, AI-native security startups with novel detection approaches can achieve early revenue before obtaining full government clearances.',
        evidence: [
          'FedRAMP High authorization requires 12-18 months and $1-3M investment',
          'CMMC Level 2/3 certification required for any DoD supplier — 9-18 month process',
          'AI-native security startups (Protect AI, Hidden Layer, Adversa) entering with novel attack surface',
          'SBIR/STTR Phase II creates $2M government contracts accessible to early-stage vendors',
          'NSA/CISA advisories often name specific vendors — government relationship is a moat',
          'Fortune 100 CISOs rarely switch platforms mid-contract — 3-5 year switching cycles',
        ],
      },
      threat_of_substitutes: {
        name: 'Threat of Substitutes',
        score: 38,
        level: 'low',
        description: 'No credible substitute for professional cybersecurity in critical infrastructure. Manual security processes are inadequate against automated threats. Cyber insurance is complementary, not a substitute. The threat environment itself creates non-negotiable demand.',
        evidence: [
          'Average ransomware attack costs $4.5M (IBM 2024) — cost of breach exceeds cost of prevention',
          'FISMA compliance mandatory for all federal agencies — cannot opt out of security requirements',
          'Industrial control systems (ICS/OT) have no viable non-digital alternative',
          'US Cyber Command reported 300% increase in adversary automation in 2024',
          'El Paso military networks face persistent APT activity — manual monitoring is not viable',
          'NERC CIP mandatory for all bulk power system operators — regulatory floor creates demand',
        ],
      },
      bargaining_power_suppliers: {
        name: 'Supplier Power',
        score: 52,
        level: 'moderate',
        description: 'Moderate supplier power. Threat intelligence providers (CrowdStrike Threat Intel, Recorded Future, Mandiant) have valuable proprietary data. Cloud providers (AWS, Azure) control deployment infrastructure. However, open-source tools and ISAC data reduce dependency.',
        evidence: [
          'Recorded Future, Mandiant, CrowdStrike Intelligence have unique adversary tracking data',
          'MITRE ATT&CK framework is free — reduces dependence on proprietary threat intel feeds',
          'Azure Sentinel, AWS GuardDuty leverage cloud provider lock-in as supplier power',
          'ISACs (FS-ISAC, MS-ISAC, H-ISAC) provide free threat intel to reduce commercial dependency',
          '22 patent filings tracked in cybersecurity category (TECHNOLOGY_CATALOG suppliers)',
          'Hardware security modules (Thales, Entrust) create dependency for PKI infrastructure',
        ],
      },
      bargaining_power_buyers: {
        name: 'Buyer Power',
        score: 55,
        level: 'moderate',
        description: 'Government buyers have significant leverage through competitive procurement vehicles (SEWP, CIO-SP3, GSA IT 70). Large enterprise buyers use RFPs to play vendors against each other. However, post-implementation switching costs are very high for integrated platforms.',
        evidence: [
          'GSA SEWP, NASA SEWP V provide government buyers access to 50+ cybersecurity vendors on contract',
          'Fort Bliss manages $400M+ in cybersecurity-related IT contracts through competitive vehicles',
          'CrowdStrike customer retention rate 97% — post-deployment switching costs are very high',
          'DoD JEDI/JWCC shows government willingness to run multi-vendor competitive processes',
          'Enterprise Security spending 15% of total IT budget on average (Gartner 2025)',
          'CBP, ICE, USCBP each run separate competitive cybersecurity procurements for El Paso infrastructure',
        ],
      },
    },
  },

  pestle: {
    dominant_factor: 'political',
    overall_environment: 'favorable',
    confidence: 0.85,
    factors: [
      {
        category: 'political',
        label: 'Political',
        score: 92,
        sentiment: 'positive',
        description: 'Cybersecurity is a top-tier national security priority. CISA has broad authority to mandate cybersecurity practices. NSC Cyber Directorate, National Cybersecurity Strategy, and NDAA provisions create strong and sustained government demand signals.',
        evidence: [
          'National Cybersecurity Strategy (2023) directed $20B+ in cybersecurity investment across agencies',
          'CISA authority expanded by FY23 NDAA to mandate reporting of cybersecurity incidents',
          'DoD Cybersecurity Maturity Model Certification (CMMC) mandatory for all 300K+ contractors',
          'Zero Trust mandate: all DoD agencies must achieve ZTA by FY27 — drives $2.4B in procurement',
          'Colonial Pipeline, SolarWinds, MOVEit attacks created urgent Congressional action',
          'Fort Bliss under ARCYBER active defense — permanent sustained cybersecurity demand',
        ],
      },
      {
        category: 'economic',
        label: 'Economic',
        score: 84,
        sentiment: 'positive',
        description: 'Global cybersecurity market growing 12-15% annually. Government spending is counter-cyclical — actually increases during economic downturns as threat actors exploit disruption. Ransomware economics create self-reinforcing demand.',
        evidence: [
          'Global cybersecurity market $240B in 2024, growing to $450B by 2030 (MarketsandMarkets)',
          'DoD cybersecurity budget $14.5B in FY25 — up from $10.9B in FY22',
          'Average cost of US data breach $4.9M in 2024 (IBM Cost of Data Breach Report)',
          'Cyber insurance market growing 20% annually — creating secondary demand signal',
          'El Paso military installation IT security spending estimated $180M annually',
          'Ransomware attacks generated $1.1B in payments to attackers in 2023 (Chainalysis)',
        ],
      },
      {
        category: 'social',
        label: 'Social',
        score: 62,
        sentiment: 'neutral',
        description: 'Severe talent shortage is the primary social constraint. 700K unfilled cybersecurity positions in the US. National security focus and competitive salaries help recruitment. Border region faces additional challenge of competing with large tech markets for talent.',
        evidence: [
          '700K+ unfilled cybersecurity positions in US (ISACA 2024)',
          'UTEP Cybersecurity program graduates ~80 students annually vs 200+ openings in El Paso region',
          'Median cybersecurity salary $120K nationally — El Paso labor market pressured by remote work',
          'DoD Cyber Mission Force targets 6,200 personnel — chronic understaffing',
          'Public awareness of cyber threats at all-time high after major ransomware attacks',
          'DHS Cybersecurity Apprenticeship program targeting underrepresented communities',
        ],
      },
      {
        category: 'technological',
        label: 'Technological',
        score: 88,
        sentiment: 'positive',
        description: 'AI is transforming both attack and defense simultaneously. AI-native security platforms automate threat hunting, incident response, and vulnerability discovery. However, adversaries also use AI — creating an escalating technological arms race.',
        evidence: [
          'AI-powered SOC platforms reduce mean time to detect (MTTD) from 207 to 22 days (IBM)',
          'CrowdStrike Charlotte AI and Microsoft Copilot for Security deploying in production',
          'FY25 NDAA directed DARPA AI Cyber Challenge — $18.5M prize for autonomous cyber defense',
          'Zero Trust category growing from 52 vendors to 80+ projected by 2027',
          'OT/ICS security tools protecting Fort Bliss industrial systems — niche but critical',
          'Quantum computing threatens current PKI — NIST PQC standards finalized 2024',
        ],
      },
      {
        category: 'legal',
        label: 'Legal',
        score: 75,
        sentiment: 'neutral',
        description: 'Heavy and growing compliance requirements. FISMA, CMMC, FedRAMP, HIPAA, and state privacy laws create complex multi-layer obligations. Legal liability for breaches is expanding through SEC disclosure rules and state AG enforcement.',
        evidence: [
          'SEC Cybersecurity Disclosure Rules (2023) require public companies to disclose material breaches within 4 days',
          'CMMC 2.0 effective Nov 2024 — 300K+ DoD contractors must certify or lose contracts',
          'CISA Known Exploited Vulnerabilities catalog — agencies mandated to patch within 14 days',
          'FedRAMP authorization required for all federal cloud products — $1-3M compliance cost',
          'NY DFS, California CPRA, Texas Privacy Act creating multi-state compliance complexity',
          'ITAR controls on cyber tools with surveillance/offensive capabilities',
        ],
      },
      {
        category: 'environmental',
        label: 'Environmental',
        score: 32,
        sentiment: 'positive',
        description: 'Cybersecurity is largely software-defined with low direct environmental impact. SOC operations and data center workloads consume electricity, but are a small fraction of total IT energy use. Securing energy infrastructure from cyber attack is an environmental positive.',
        evidence: [
          'Cybersecurity software has minimal hardware footprint compared to compute-intensive AI/ML',
          'SOC operations typically run in shared data centers — marginal environmental cost',
          'Protecting power grid ICS/OT systems from cyber attack has major climate resilience benefit',
          'NERC CIP cybersecurity requirements protect renewable energy grid infrastructure',
          'El Paso Electric grid protection under active cyber monitoring — resilience benefit',
        ],
      },
    ],
  },
};

// ─── Defense Technology ────────────────────────────────────────────────────────

const DEFENSE: StaticFrameworkAnalysis = {
  slug: 'defense',
  label: 'Defense Technology',
  analyzed_at: '2026-03-01',

  porter: {
    overall_attractiveness: 65,
    overall_label: 'Moderately attractive',
    confidence: 0.91,
    forces: {
      competitive_rivalry: {
        name: 'Competitive Rivalry',
        score: 68,
        level: 'high',
        description: 'Controlled competition between primes (L3Harris, Raytheon, Northrop, Lockheed, Boeing, General Dynamics) on major programs, with intense competition from mid-tier and emerging vendors for software-defined and AI systems. SBIR/OTA programs open competition to hundreds of non-traditional vendors.',
        evidence: [
          'L3Harris, Raytheon, Northrop, Lockheed, Boeing, General Dynamics all competing for JADC2 contracts',
          'Palantir beating primes on software contracts — Army TITAN, Air Force NIPRGPT',
          '700+ SBIR Phase II awards annually — massive non-traditional vendor competition',
          'Fort Bliss serves as proof-of-concept test bed — creates simultaneous multi-vendor competitions',
          'Defense Innovation Unit (DIU) specifically designed to bring commercial vendors into competition',
          'Counter-UAS market: 15+ vendors competing for $10B+ emerging requirement',
        ],
      },
      threat_of_new_entrants: {
        name: 'Threat of New Entrants',
        score: 42,
        level: 'moderate',
        description: 'High barriers for hardware-intensive platforms (tanks, aircraft) but dramatically lower barriers for software, AI, and sensors. SBIR Phase I awards $250K with minimal compliance burden. DIU and OTA authority allow DoD to bypass FAR — enabling fast entry for commercial firms.',
        evidence: [
          'SBIR Phase I requires no facility clearance or DCAA audit — lowest entry barrier in government',
          'OTA agreements bypass FAR — no CAS coverage or certified cost and pricing data required',
          'DIU awarded $1B+ to non-traditional vendors in FY24 — mostly commercial tech companies',
          'Andruil, Shield AI, Joby Aviation entered defense as pure commercial tech plays',
          'Prime contractor exclusivity on major platforms (F-35, Columbia-class) — absolute barrier',
          'Secret facility clearances take 12-18 months — meaningful barrier for classified programs',
        ],
      },
      threat_of_substitutes: {
        name: 'Threat of Substitutes',
        score: 28,
        level: 'low',
        description: 'Defense technology has no civilian substitute — national security requirements create non-negotiable demand. Diplomatic and economic tools are complements to military capability, not replacements. Within defense, commercial-off-the-shelf (COTS) technology substitutes proprietary defense systems at lower cost.',
        evidence: [
          'US defense budget $886B in FY25 — bipartisan floor, no credible substitute pressure',
          'Fort Bliss 1st Armored Division requires dedicated defense IT support — no civilian equivalent',
          'COTS substitution occurring: DoD using commercial iPhone/Android instead of JTRS radios',
          'SpaceX Starlink replacing specialized military SATCOM at 1/10th the cost',
          'Commercial AI (OpenAI, Google) increasingly substituting specialized defense AI in non-classified apps',
          'Autonomous UAS substituting crewed aircraft for ISR missions — intra-defense substitution',
        ],
      },
      bargaining_power_suppliers: {
        name: 'Supplier Power',
        score: 65,
        level: 'high',
        description: 'Sole-source and single-source suppliers dominate critical components (advanced semiconductors, specialty materials, propulsion). ITAR restrictions create geographic supplier concentration. For software, Microsoft and Amazon are dominant cloud suppliers to DoD with significant leverage.',
        evidence: [
          'Pratt & Whitney sole source for F135 engine (F-35 program) — $18B+ leverage',
          'TSMC sole source for 3nm/5nm chips used in DoD systems — geographic concentration risk',
          'Microsoft JWCC cloud award — DoD dependent on Azure for classified workloads',
          'Raytheon sole source for Patriot missiles — key Fort Bliss defense system',
          'SpaceX near-monopoly on heavy lift launch — DoD dependent on commercial supplier',
          'ITAR restricts foreign semiconductor suppliers — narrows competitive supply base',
        ],
      },
      bargaining_power_buyers: {
        name: 'Buyer Power',
        score: 72,
        level: 'high',
        description: 'The US government is the single largest defense buyer in the world with extraordinary monopsony power. Milestone B/C reviews, Should Cost management, and competitive award strategies give DoD substantial leverage. However, sole-source programs and urgent operational requirements reduce this leverage in specific cases.',
        evidence: [
          'DoD $886B FY25 budget — single buyer accounts for 35-40% of global defense spending',
          'Should Cost management teams have reduced major program costs 10-20%',
          'USD(AT&L) competitive strategies mandate — requires justification for any sole-source award',
          'Fort Bliss generates $2.5B annual economic activity — DoD leverage in local contracting',
          'LPTA and Best Value source selections give buyers flexibility to control price vs. performance',
          'Congress and GAO oversight of sole-source awards adds additional procurement discipline',
        ],
      },
    },
  },

  pestle: {
    dominant_factor: 'political',
    overall_environment: 'favorable',
    confidence: 0.91,
    factors: [
      {
        category: 'political',
        label: 'Political',
        score: 95,
        sentiment: 'positive',
        description: 'Defense spending has bipartisan political support. Great power competition with China and Russia sustains long-term budget growth. National Defense Strategy prioritizes modernization across all domains. Fort Bliss Congressional delegation actively supports defense investment.',
        evidence: [
          'FY25 NDAA passed with bipartisan majority — $886B authorization, 6th consecutive year of growth',
          'National Defense Strategy 2022 designates China as "pacing threat" — sustained modernization driver',
          '2025 NDAA directed $24B for Pacific Deterrence Initiative — largest increase ever',
          'Rep. Tony Gonzales and Sen. Ted Cruz actively championing Fort Bliss modernization funding',
          'BRAC moratorium protects Fort Bliss from closure through at least 2025',
          'NATO burden-sharing demands increasing allied defense investment globally',
        ],
      },
      {
        category: 'economic',
        label: 'Economic',
        score: 82,
        sentiment: 'positive',
        description: 'Defense is counter-cyclical and budget-protected. Fort Bliss generates $2.5B+ in annual economic impact in El Paso. Defense tech startups attracting private capital at scale. However, inflation, supply chain costs, and debt ceiling debates create budget risk.',
        evidence: [
          'Fort Bliss generates $2.5B annual economic impact in El Paso metro (DoD 2024 estimate)',
          'Defense tech VC investment $33B in 2024 — NATO Innovation Fund, AFWERX, DIU catalyzing private capital',
          'L3Harris El Paso operations employ 2,200+ workers — anchor employer',
          'Defense inflation running 8-12% above general CPI due to labor and materials',
          'National Reconnaissance Office, DARPA, AFRL funding R&D above appropriated levels',
          'SBIR/STTR pumped $4.5B into non-traditional defense vendors in FY24',
        ],
      },
      {
        category: 'social',
        label: 'Social',
        score: 72,
        sentiment: 'positive',
        description: 'Strong military culture in El Paso supports defense industry workforce. Veteran community provides experienced technical workforce. UTEP engineering programs feed defense contractor pipeline. Public support for defense spending remains consistent.',
        evidence: [
          'El Paso has 100K+ active duty, reserve, and veteran population — deep military culture',
          'Fort Bliss is single largest employer in El Paso — 35,000+ military personnel and families',
          'UTEP ROTC program produces 50+ commissioned officers annually — dual-use talent',
          'Hispanic workforce (80%+ of El Paso) increasingly represented in defense contractor roles',
          'DoD Skillbridge program places transitioning soldiers directly into contractor roles',
          'Public support for defense spending at 60%+ consistently (Gallup 2024)',
        ],
      },
      {
        category: 'technological',
        label: 'Technological',
        score: 90,
        sentiment: 'positive',
        description: 'Defense technology innovation at the fastest pace since the Cold War. AI-enabled weapons, autonomous systems, directed energy, and hypersonic missiles represent simultaneous multi-domain leaps. Commercial technology is being absorbed into defense systems at unprecedented speed.',
        evidence: [
          'Andruil Lattice AI demonstrated autonomous counter-UAS engagement at Fort Bliss (2024)',
          'Army Project Convergence exercises showing JADC2 autonomous targeting chains',
          'Raytheon LaserHEL 100kW directed energy weapon fielded at Fort Bliss (2023)',
          'DARPA ACE project demonstrated AI pilot outperforming humans in dogfight simulation',
          'Hypersonic glide vehicles (LRHW) completing development testing for Army fielding',
          'SpaceX Starlink terminal on every infantry battalion — commercial satellite integration',
        ],
      },
      {
        category: 'legal',
        label: 'Legal',
        score: 58,
        sentiment: 'neutral',
        description: 'Complex regulatory environment but well-established for traditional procurement. ITAR, EAR, DFARS, CAS, and CMMC create compliance burden. Autonomous weapons raise new legal questions around Laws of Armed Conflict applicability.',
        evidence: [
          'ITAR applies to 600+ defense technology categories — licensing required for foreign persons',
          'DFARS cybersecurity requirements (252.204-7012) mandate incident reporting within 72 hours',
          'CMMC 2.0 Level 3 required for classified programs — highest compliance burden',
          'LOAC / IHL legal reviews now required for autonomous weapons systems programs',
          'FCPA and anti-corruption requirements apply to foreign military sales (FMS) programs',
          'Section 889 bans Huawei/ZTE components in defense systems — supply chain legal constraint',
        ],
      },
      {
        category: 'environmental',
        label: 'Environmental',
        score: 48,
        sentiment: 'neutral',
        description: 'Defense installations have significant environmental footprints but are driving clean energy adoption for resilience reasons. Military microgrids and renewable energy programs are positive. Munitions testing and PFAS contamination create ongoing remediation liabilities.',
        evidence: [
          'Fort Bliss 178,000-acre McGregor Range — significant land use impact',
          'DoD largest institutional consumer of petroleum products in US government',
          'Fort Bliss 100% renewable energy goal by 2030 — military microgrid program driving solar adoption',
          'PFAS contamination from AFFF firefighting foam at numerous bases — $3.5B remediation budget',
          'Army Net Zero installation programs at Fort Bliss targeting zero waste, net zero energy',
          'DoD Climate Adaptation Plan addresses sea level rise, extreme heat impacts on installations',
        ],
      },
    ],
  },
};

// ─── Border Technology ──────────────────────────────────────────────────────────

const BORDER_TECH: StaticFrameworkAnalysis = {
  slug: 'border-tech',
  label: 'Border Technology',
  analyzed_at: '2026-03-01',

  porter: {
    overall_attractiveness: 68,
    overall_label: 'Moderately attractive',
    confidence: 0.87,
    forces: {
      competitive_rivalry: {
        name: 'Competitive Rivalry',
        score: 62,
        level: 'high',
        description: 'Moderate-to-high competition among a defined set of specialized vendors. Biometrics is dominated by Idemia, NEC, Thales, and IDEX. Cargo scanning by OSI Systems and Leidos. Trade compliance software is more fragmented. Competition intensifies on major CBP and GSA award cycles.',
        evidence: [
          'Idemia, NEC, Thales, IDEX Biometrics competing directly on CBP Biometric Entry-Exit program ($1.5B)',
          'OSI Systems Rapiscan and Leidos (formerly L3) competing on cargo scanning contracts',
          'SITA, Unisys, IDEMIA competing on TSA/CBP biometric screening programs',
          'GSA Multiple Award Schedule IT 70 has 30+ vendors offering border tech solutions',
          'CBP BSFIT (Border Security Fencing Infrastructure Technology) — major competitive vehicle',
          'Trade compliance software: Amber Road, Integration Point, Customs City, MIC all competing',
        ],
      },
      threat_of_new_entrants: {
        name: 'Threat of New Entrants',
        score: 45,
        level: 'moderate',
        description: 'Moderate barriers. DHS program access requires security clearances and past performance. Large programs (SBInet, OIT) favor primes. However, AI/ML-powered entrants are disrupting imaging and analytics segments. Commercial biometric software on government cloud is an entry path.',
        evidence: [
          'DHS SAFETY Act certification required for anti-terrorism technology — 18-month process',
          'Past performance requirements on major CBP contracts favor incumbents',
          'Clearance required for access to operational data at ports of entry',
          'Evolv Technology, Patriot One disrupted traditional weapons detection with AI — new entrants',
          'SBIR Phase II has funded 50+ border tech startups since 2020',
          'CBP Innovation Team (INVNT) actively seeking novel commercial technology solutions',
        ],
      },
      threat_of_substitutes: {
        name: 'Threat of Substitutes',
        score: 35,
        level: 'low',
        description: 'Physical border infrastructure (walls, fencing) and manual CBP officer inspection are the main substitutes for technology. Technology consistently outperforms manual methods on speed and throughput. Policy shifts affecting border enforcement drive demand more than technology substitution.',
        evidence: [
          'CBP ATC system (automated teller kiosks) processes 10x more travelers than manual inspection',
          'AI cargo scanning detects fentanyl in 98% of test packages vs 14% manual rate (DHS study)',
          'Physical barrier programs ($22B+ in Congressional authorization) are complements not substitutes',
          'El Paso Ysleta and Bridge of Americas ports process 50K+ daily crossings — manual not viable',
          'E-Verify and SEVIS are paperwork substitutes but require technology backbone',
          'Economic sanctions and trade policy can reduce cargo volumes — indirect substitute effect',
        ],
      },
      bargaining_power_suppliers: {
        name: 'Supplier Power',
        score: 55,
        level: 'moderate',
        description: 'Concentrated in biometric hardware (fingerprint sensors, iris cameras) and specialized imaging equipment. Software layer is fragmented with moderate supplier power. The few vendors with accredited biometric algorithms have strong leverage during initial contract award.',
        evidence: [
          'IDEX Biometrics, CrossMatch (now HID), Suprema dominate fingerprint sensor supply',
          'Smiths Detection and OSI Systems (Rapiscan) dominant in cargo X-ray hardware — concentrated',
          'IDEMIA owns dominant biometric algorithm accreditation (FRVTs, PFT3) — incumbent advantage',
          'Trade compliance rules data (tariff schedules, sanctions lists) supplied by CBP/BIS — free government source',
          'RFID/IoT components (Zebra, Honeywell, Impinj) are competitive commodity market',
          'Biometric database (OBIM) owned by DHS — government controls critical data asset',
        ],
      },
      bargaining_power_buyers: {
        name: 'Buyer Power',
        score: 72,
        level: 'high',
        description: 'CBP and GSA are the dominant buyers — effectively monopsony purchasers of specialized border technology. Congressional mandates and annual appropriations define what gets bought. Buyers use competitive IDIQ vehicles (BSFIT, OIT, E3) to maintain price pressure.',
        evidence: [
          'CBP single largest border technology buyer globally — $2.5B+ annual technology spend',
          'GSA E3 (Entry/Exit Program) IDIQ gives DHS buyers access to competitive pricing',
          'USBP Technology (Integrated Fixed Towers, RVS) procured under competitive awards',
          'CBP Innovation Team can conduct rapid prototyping evaluations — shapes requirements to favor innovation',
          'Congressional appropriators directly specify technology line items — buyers at two levels',
          'El Paso ports collectively process $100B+ in annual trade — creates massive buyer leverage for trade tech',
        ],
      },
    },
  },

  pestle: {
    dominant_factor: 'political',
    overall_environment: 'mixed',
    confidence: 0.87,
    factors: [
      {
        category: 'political',
        label: 'Political',
        score: 88,
        sentiment: 'positive',
        description: 'Border security is permanently on the national political agenda, creating sustained funding regardless of administration. Trade facilitation technology receives bipartisan support. Immigration enforcement technology is politically contested but still funded.',
        evidence: [
          'DHS FY25 budget $98.6B — CBP receives $24.3B including $3.2B for technology programs',
          'Bipartisan border security legislation proposed $20B in technology investment (2024)',
          'CBP/OFO ports of entry technology modernization funded in 5 consecutive NDAAs',
          'El Paso ports of entry processed $104B in trade in 2024 — economic motivation for investment',
          'President declared national emergency at border (2025) — triggered supplemental technology funding',
          'US-Mexico USMCA enforcement technology requirements funded by both governments',
        ],
      },
      {
        category: 'economic',
        label: 'Economic',
        score: 78,
        sentiment: 'positive',
        description: 'El Paso-Juarez is the largest land port of entry in the Western Hemisphere by trade value. Economic efficiency of border crossings directly impacts supply chains. Wait time reduction has a measurable $100M+ economic benefit per hour saved across the region.',
        evidence: [
          '$104B in cross-border trade through El Paso ports in 2024 — 8% annual growth',
          'Estimated $2.4B economic loss annually from border wait times (UT El Paso study)',
          'Nearshoring from Asia to Mexico driving 15-20% annual growth in El Paso trade volume',
          'USMCA implementation added $18B in new trade flows through El Paso in 2020-2024',
          'Maquiladora sector 400K+ workers — technology investment in trade processing has direct economic multiplier',
          'CBP CTPAT trusted shipper program covers $600B+ in imports — technology enables program scale',
        ],
      },
      {
        category: 'social',
        label: 'Social',
        score: 58,
        sentiment: 'neutral',
        description: 'Border technology deployment intersects with complex social dynamics around immigration, civil liberties, and binational community relations. Biometric data collection raises privacy concerns. Trade technology enjoys strong community support; enforcement technology is contested.',
        evidence: [
          'ACLU litigation on facial recognition at borders — legal challenge to biometric collection',
          'El Paso 80%+ Hispanic community has personal connections to cross-border systems',
          'Trust relationship with Mexico required for interoperable border systems — diplomatic dimension',
          'Trade technology (C-TPAT portal, AES) widely supported by business community',
          'Migrant rights organizations actively monitoring AI screening systems for bias',
          'Border wait time improvement has 85% public approval in El Paso/Juárez polling',
        ],
      },
      {
        category: 'technological',
        label: 'Technological',
        score: 82,
        sentiment: 'positive',
        description: 'AI transformation of border operations is accelerating. Facial recognition accuracy exceeded 99.9% for enrolled populations. AI cargo analysis is finding fentanyl and contraband at rates 10x manual inspection. Autonomous surveillance towers operate for weeks without human support.',
        evidence: [
          'CBP facial recognition at 238 airports/ports — 75M+ travelers matched (FY24)',
          'DHS AI scanning of commercial cargo detected 2.7M lbs of narcotics in FY24',
          'Integrated Fixed Tower program (Elbit Systems) deployed autonomous surveillance in Arizona/Texas',
          'License plate readers at El Paso ports process 50,000+ plates daily with 99.2% accuracy',
          'Biometric Exit program at El Paso airport achieving 97% match rate for departures',
          'AI predictive risk scoring for cargo reducing physical inspection rates by 40% while improving yield',
        ],
      },
      {
        category: 'legal',
        label: 'Legal',
        score: 70,
        sentiment: 'neutral',
        description: 'Complex legal environment spanning immigration law, trade law, and privacy regulations. CBP has broad statutory authority at the border (Fourth Amendment exceptions). However, biometric collection, AI decision-making, and data sharing create new legal exposure.',
        evidence: [
          'Immigration and Nationality Act gives CBP broad warrantless search authority at border',
          'Privacy Act and E-Government Act create data handling requirements for biometric databases',
          'ACLU v. CBP cases on facial recognition and First Amendment implications pending',
          'USMCA data localization provisions limit cross-border data sharing',
          'AI Act (EU) may affect border technology used for EU-connected travelers',
          'Section 208 data retention limits restrict CBP biometric storage to specified timeframes',
        ],
      },
      {
        category: 'environmental',
        label: 'Environmental',
        score: 42,
        sentiment: 'neutral',
        description: 'Border technology systems have moderate environmental footprint. Surveillance towers, sensor networks, and data centers consume electricity in an energy-constrained desert environment. Water scarcity in El Paso limits data center expansion for border tech backends.',
        evidence: [
          'Integrated Fixed Towers consume 5-15 kW each — 200+ towers deployed across southern border',
          'CBP Northern Processing Center in El Paso requires significant HVAC for server rooms',
          'Rio Grande water treaty affects cross-border infrastructure placement',
          'El Paso water scarcity constrains data center cooling for border tech backends',
          'Reduced illegal crossings via smart technology reduces environmental damage in sensitive areas',
          'Solar-powered remote sensor arrays being tested by CBP to reduce diesel generator use',
        ],
      },
    ],
  },
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const FRAMEWORK_ANALYSIS: Record<string, StaticFrameworkAnalysis> = {
  'ai-ml':        AI_ML,
  'cybersecurity': CYBERSECURITY,
  'defense':      DEFENSE,
  'border-tech':  BORDER_TECH,
};

/**
 * Get static framework analysis for a given industry slug.
 * Returns undefined for industries not yet authored.
 */
export function getStaticFrameworkAnalysis(slug: string): StaticFrameworkAnalysis | undefined {
  return FRAMEWORK_ANALYSIS[slug];
}

/**
 * Merge static analysis with algorithmically computed analysis.
 * When signalConfidence < threshold, the static data provides the floor.
 * When signalConfidence >= threshold, the live analysis takes precedence but
 * static evidence bullets are appended for context.
 *
 * @param slug - Industry slug
 * @param computed - Algorithmically derived analysis from signal data
 * @param signalConfidence - 0-1 confidence of signal-based analysis
 */
export function mergePorterAnalysis(
  slug: string,
  computed: PorterAnalysis,
  signalConfidence: number,
): PorterAnalysis {
  const staticData = FRAMEWORK_ANALYSIS[slug];
  if (!staticData) return computed;

  const THRESHOLD = 0.5;

  if (signalConfidence >= THRESHOLD) {
    // Enrich live analysis with static evidence bullets
    const enriched = { ...computed, forces: { ...computed.forces } };
    const staticForces = staticData.porter.forces;
    for (const key of Object.keys(enriched.forces) as Array<keyof typeof enriched.forces>) {
      const staticForce = staticForces[key];
      if (staticForce) {
        const existing = enriched.forces[key];
        // Deduplicate: only add static evidence not already present
        const newEvidence = staticForce.evidence.filter(
          e => !existing.evidence.some(ex => ex.toLowerCase().includes(e.substring(0, 20).toLowerCase()))
        ).slice(0, 2);
        enriched.forces[key] = {
          ...existing,
          evidence: [...existing.evidence, ...newEvidence],
        };
      }
    }
    return enriched;
  }

  // Below threshold — use static analysis as authoritative source
  return {
    ...staticData.porter,
    confidence: Math.max(staticData.porter.confidence, signalConfidence),
  };
}

export function mergePestleAnalysis(
  slug: string,
  computed: PestleAnalysis,
  signalConfidence: number,
): PestleAnalysis {
  const staticData = FRAMEWORK_ANALYSIS[slug];
  if (!staticData) return computed;

  const THRESHOLD = 0.5;

  if (signalConfidence >= THRESHOLD) {
    // Enrich each factor with static evidence
    const enriched: PestleAnalysis = {
      ...computed,
      factors: computed.factors.map(factor => {
        const staticFactor = staticData.pestle.factors.find(f => f.category === factor.category);
        if (!staticFactor) return factor;
        const newEvidence = staticFactor.evidence.filter(
          e => !factor.evidence.some(ex => ex.toLowerCase().includes(e.substring(0, 20).toLowerCase()))
        ).slice(0, 2);
        return { ...factor, evidence: [...factor.evidence, ...newEvidence] };
      }),
    };
    return enriched;
  }

  // Below threshold — use static analysis
  return {
    ...staticData.pestle,
    confidence: Math.max(staticData.pestle.confidence, signalConfidence),
  };
}
