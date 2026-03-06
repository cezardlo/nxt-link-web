import type { TechInnovationCycle } from './innovation-cycle';

// ── Batch 1: AI/ML + Cybersecurity Innovation Cycles ────────────────────────
// Technologies not already present in INNOVATION_CYCLES main array

export const BATCH1_CYCLES: TechInnovationCycle[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // AI / ML
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'tech-nlp',
    name: 'Natural Language Processing (NLP)',
    category: 'AI / ML',
    description:
      'AI systems that understand, process, and generate human language. Critical for bilingual government services, CBP document processing, and intelligence report summarization in the El Paso corridor.',
    currentStage: 'impact',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['MIT CSAIL', 'Stanford NLP Group', 'IBM Research', 'Bell Labs'],
        metrics: [
          { label: 'FOUNDATIONAL PAPERS', value: '8,200+', progress: 95 },
          { label: 'INITIAL PATENTS', value: '620', progress: 82 },
        ],
        notes: 'Roots in 1950s machine translation; modern era began with statistical methods in the 1990s and transformer architecture in 2017.',
      },
      research: {
        entities: ['UTEP Computational Linguistics', 'University of Washington', 'CMU LTI', 'Allen Institute for AI'],
        metrics: [
          { label: 'ACTIVE PROGRAMS', value: '42', progress: 80 },
          { label: 'RESEARCH GRANTS', value: '$128M', progress: 72 },
        ],
        notes: 'UTEP research on bilingual NLP models for Spanish-English government communication.',
      },
      development: {
        entities: ['OpenAI', 'Google DeepMind', 'Anthropic', 'Meta FAIR'],
        metrics: [
          { label: 'FOUNDATION MODELS', value: '24', progress: 85 },
          { label: 'TOTAL FUNDING', value: '$18B+', progress: 95 },
          { label: 'ENG TEAMS', value: '5,000+', progress: 90 },
        ],
      },
      productization: {
        entities: ['AWS Comprehend', 'Google Cloud NLP', 'Azure AI Language'],
        metrics: [
          { label: 'PRODUCTS', value: '32', progress: 82 },
          { label: 'VENDORS', value: '62', progress: 78 },
        ],
      },
      adoption: {
        entities: ['CBP El Paso Sector', 'US Army INSCOM', 'El Paso County Courts', 'TTUHSC'],
        metrics: [
          { label: 'DEPLOYMENTS', value: '28', progress: 68 },
          { label: 'PROCUREMENT SIGNALS', value: '41', progress: 78 },
        ],
        notes: 'CBP using NLP for automated document triage at El Paso ports of entry.',
      },
      impact: {
        entities: ['DHS', 'El Paso County', 'WBAMC'],
        metrics: [
          { label: 'PROCESSING TIME', value: '-52%', progress: 52 },
          { label: 'TRANSLATION ACCURACY', value: '96.4%', progress: 96 },
          { label: 'COST REDUCTION', value: '-28%', progress: 28 },
        ],
        notes: 'Measurable improvements in bilingual document processing and intelligence report generation.',
      },
    },
  },

  {
    id: 'tech-reinforcement-learning',
    name: 'Reinforcement Learning',
    category: 'AI / ML',
    description:
      'Training AI agents through reward-based feedback loops. Powers autonomous weapons guidance, robotic manipulation, and adaptive logistics routing at Fort Bliss and White Sands.',
    currentStage: 'development',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['DeepMind', 'UC Berkeley BAIR', 'University of Alberta', 'MIT CSAIL'],
        metrics: [
          { label: 'FOUNDATIONAL PAPERS', value: '2,800+', progress: 78 },
          { label: 'BREAKTHROUGHS', value: '12', progress: 65 },
        ],
        notes: 'AlphaGo (2016) and MuZero (2019) demonstrated superhuman RL capabilities.',
      },
      research: {
        entities: ['Sandia National Labs', 'Army Research Lab', 'UTEP CS', 'Georgia Tech'],
        metrics: [
          { label: 'ACTIVE PROGRAMS', value: '18', progress: 55 },
          { label: 'DOD GRANTS', value: '$84M', progress: 48 },
        ],
        notes: 'Army Research Lab studying RL for autonomous convoy navigation in desert terrain.',
      },
      development: {
        entities: ['Shield AI', 'Anduril', 'Northrop Grumman', 'Raytheon BBN'],
        metrics: [
          { label: 'PROTOTYPES', value: '11', progress: 48 },
          { label: 'DOD CONTRACTS', value: '$320M', progress: 62 },
          { label: 'ENG TEAM SIZE', value: '800+', progress: 55 },
        ],
        notes: 'Shield AI Hivemind autonomy stack uses RL for multi-drone coordination.',
      },
      productization: {
        entities: ['Covariant (robotics)', 'DeepMind AlphaFold', 'NVIDIA Isaac'],
        metrics: [
          { label: 'PRODUCTS', value: '6', progress: 35 },
          { label: 'VENDORS', value: '22', progress: 40 },
        ],
      },
      adoption: {
        entities: ['Fort Bliss ATC', 'White Sands Missile Range', 'Amazon Robotics'],
        metrics: [
          { label: 'PILOT PROGRAMS', value: '5', progress: 28 },
          { label: 'TEST EXERCISES', value: '8', progress: 35 },
        ],
        notes: 'Early-stage pilots for autonomous vehicle routing at Fort Bliss.',
      },
      impact: {
        entities: ['DOD CDAO', 'Army Futures Command'],
        metrics: [
          { label: 'TASK COMPLETION', value: '+18%', progress: 18 },
          { label: 'AUTONOMOUS OPS HOURS', value: '1,200', progress: 22 },
        ],
      },
    },
  },

  {
    id: 'tech-generative-ai',
    name: 'Generative AI',
    category: 'AI / ML',
    description:
      'Large language models, diffusion models, and multimodal AI for text, image, code, and synthetic data generation. Rapidly integrating into defense decision support and government service delivery.',
    currentStage: 'adoption',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['Google Brain', 'OpenAI', 'Stanford HAI', 'Anthropic'],
        metrics: [
          { label: 'KEY PAPERS', value: '4,600+', progress: 88 },
          { label: 'PATENTS FILED', value: '1,200+', progress: 72 },
        ],
        notes: 'Transformer architecture (2017) and GPT series catalyzed the generative AI revolution.',
      },
      research: {
        entities: ['UTEP Data Science', 'Los Alamos National Lab', 'CMU', 'UC Berkeley'],
        metrics: [
          { label: 'RESEARCH PROGRAMS', value: '56', progress: 82 },
          { label: 'FEDERAL GRANTS', value: '$2.1B', progress: 78 },
        ],
        notes: 'National AI Research Institutes funding applied GenAI research across universities.',
      },
      development: {
        entities: ['OpenAI', 'Anthropic', 'Google DeepMind', 'Meta', 'Palantir'],
        metrics: [
          { label: 'FOUNDATION MODELS', value: '18', progress: 75 },
          { label: 'VENTURE FUNDING', value: '$42B+', progress: 98 },
          { label: 'ENG TEAMS', value: '12,000+', progress: 92 },
        ],
      },
      productization: {
        entities: ['Palantir AIP', 'Microsoft Copilot', 'Scale AI Donovan'],
        metrics: [
          { label: 'PRODUCTS', value: '45+', progress: 78 },
          { label: 'VENDORS', value: '85', progress: 72 },
        ],
        notes: 'Palantir AIP and Scale AI Donovan targeting DoD decision support use cases.',
      },
      adoption: {
        entities: ['US Army', 'CBP', 'Fort Bliss', 'El Paso ISD', 'City of El Paso'],
        metrics: [
          { label: 'GOV DEPLOYMENTS', value: '18', progress: 52 },
          { label: 'PROCUREMENT SIGNALS', value: '67', progress: 85 },
        ],
        notes: 'Army evaluating Palantir AIP for operational planning at Fort Bliss.',
      },
      impact: {
        entities: ['DOD CDAO', 'GSA', 'OMB'],
        metrics: [
          { label: 'PRODUCTIVITY GAIN', value: '+38%', progress: 38 },
          { label: 'REPORT GENERATION', value: '-65% time', progress: 65 },
          { label: 'POLICY FRAMEWORKS', value: '4 active', progress: 45 },
        ],
        notes: 'OMB M-24-10 and EO 14110 establishing government-wide AI governance.',
      },
    },
  },

  {
    id: 'tech-mlops',
    name: 'MLOps / AI Platform',
    category: 'AI / ML',
    description:
      'Infrastructure and tooling for deploying, monitoring, and maintaining ML models in production. DoD CDAO mandates require MLOps for responsible AI governance.',
    currentStage: 'productization',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['Google', 'Netflix', 'Uber AI Labs', 'Facebook Applied ML'],
        metrics: [
          { label: 'CONCEPT PAPERS', value: '680', progress: 72 },
          { label: 'OPEN SOURCE TOOLS', value: '45', progress: 68 },
        ],
        notes: 'Born from need to operationalize ML beyond Jupyter notebooks; Google TFX (2019) formalized the discipline.',
      },
      research: {
        entities: ['Stanford MLSys', 'CMU ML Department', 'MIT DSAIL', 'Army Research Lab'],
        metrics: [
          { label: 'ACTIVE STUDIES', value: '22', progress: 58 },
          { label: 'FRAMEWORKS PROPOSED', value: '14', progress: 52 },
        ],
        notes: 'Research focus on model drift detection and responsible AI monitoring.',
      },
      development: {
        entities: ['Databricks', 'Weights & Biases', 'MLflow', 'Tecton'],
        metrics: [
          { label: 'PLATFORMS', value: '18', progress: 68 },
          { label: 'SERIES A-D FUNDING', value: '$4.2B', progress: 82 },
          { label: 'ENG TEAMS', value: '3,400+', progress: 72 },
        ],
      },
      productization: {
        entities: ['Databricks MLflow', 'AWS SageMaker', 'Azure ML Platform'],
        metrics: [
          { label: 'PRODUCTS', value: '22', progress: 72 },
          { label: 'VENDORS', value: '34', progress: 65 },
        ],
        notes: 'Platform One (DoD DevSecOps) integrating MLOps pipelines for military AI.',
      },
      adoption: {
        entities: ['DOD CDAO', 'Fort Bliss Data Teams', 'Army Futures Command'],
        metrics: [
          { label: 'DEPLOYMENTS', value: '8', progress: 38 },
          { label: 'PILOTS ACTIVE', value: '6', progress: 42 },
        ],
        notes: 'CDAO mandating MLOps for all new DoD AI programs.',
      },
      impact: {
        entities: ['DOD CDAO', 'Army AI Integration Center'],
        metrics: [
          { label: 'MODEL DEPLOYMENT TIME', value: '-45%', progress: 45 },
          { label: 'MODEL RELIABILITY', value: '+32%', progress: 32 },
        ],
      },
    },
  },

  {
    id: 'tech-anomaly-detection',
    name: 'AI Anomaly Detection',
    category: 'AI / ML',
    description:
      'Unsupervised and semi-supervised learning to identify unusual patterns in network traffic, cargo manifests, and sensor data. Core to CBP fraud detection and Army cyber operations.',
    currentStage: 'adoption',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['Bell Labs', 'MIT', 'CMU CERT', 'DARPA'],
        metrics: [
          { label: 'FOUNDATIONAL PAPERS', value: '3,400+', progress: 85 },
          { label: 'PATENTS', value: '280', progress: 70 },
        ],
        notes: 'Statistical anomaly detection dates to the 1960s; ML-based approaches emerged in the 2000s.',
      },
      research: {
        entities: ['UTEP CS', 'Sandia National Labs', 'NIST', 'Army Cyber Institute'],
        metrics: [
          { label: 'ACTIVE PROGRAMS', value: '24', progress: 65 },
          { label: 'RESEARCH GRANTS', value: '$62M', progress: 58 },
        ],
        notes: 'UTEP research on anomaly detection for cross-border financial transactions.',
      },
      development: {
        entities: ['Palantir', 'Splunk', 'Darktrace', 'Vectra AI'],
        metrics: [
          { label: 'PLATFORMS', value: '16', progress: 72 },
          { label: 'FUNDING RAISED', value: '$2.8B', progress: 80 },
          { label: 'ENG TEAMS', value: '2,200+', progress: 75 },
        ],
      },
      productization: {
        entities: ['Palantir Foundry', 'AWS Lookout', 'Azure Anomaly Detector'],
        metrics: [
          { label: 'PRODUCTS', value: '18', progress: 72 },
          { label: 'VENDORS', value: '41', progress: 68 },
        ],
      },
      adoption: {
        entities: ['CBP El Paso', 'Fort Bliss Cyber', 'El Paso Electric', 'US Army ARCYBER'],
        metrics: [
          { label: 'DEPLOYMENTS', value: '22', progress: 62 },
          { label: 'PROCUREMENT SIGNALS', value: '35', progress: 72 },
        ],
        notes: 'CBP deploying anomaly detection for cargo manifest screening at Ysleta and BOTA.',
      },
      impact: {
        entities: ['DHS', 'CBP', 'El Paso County'],
        metrics: [
          { label: 'FRAUD DETECTION', value: '+41%', progress: 41 },
          { label: 'FALSE POSITIVE REDUCTION', value: '-38%', progress: 38 },
          { label: 'THREAT IDENTIFICATION', value: '+29%', progress: 29 },
        ],
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Cybersecurity
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'tech-zero-trust',
    name: 'Zero Trust Architecture (ZTA)',
    category: 'Cybersecurity',
    description:
      'Security model requiring continuous verification of every user and device. DoD ZTA mandate requires full implementation by FY27. Fort Bliss network modernization is a primary implementation vehicle.',
    currentStage: 'adoption',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['Forrester Research', 'NIST', 'Google BeyondCorp', 'DISA'],
        metrics: [
          { label: 'FOUNDATIONAL PAPERS', value: '320', progress: 82 },
          { label: 'NIST STANDARDS', value: 'SP 800-207', progress: 90 },
        ],
        notes: 'John Kindervag at Forrester coined "Zero Trust" in 2010; NIST SP 800-207 formalized the architecture in 2020.',
      },
      research: {
        entities: ['NIST NCCoE', 'NSA Cybersecurity', 'MITRE', 'UTEP Cybersecurity'],
        metrics: [
          { label: 'REFERENCE ARCHITECTURES', value: '8', progress: 72 },
          { label: 'PILOT FRAMEWORKS', value: '12', progress: 65 },
        ],
        notes: 'NIST NCCoE publishing ZTA reference implementations for government networks.',
      },
      development: {
        entities: ['Zscaler', 'Palo Alto Networks', 'CrowdStrike', 'Illumio', 'Okta'],
        metrics: [
          { label: 'PLATFORMS', value: '24', progress: 78 },
          { label: 'TOTAL FUNDING', value: '$6.8B', progress: 88 },
          { label: 'ENG TEAMS', value: '8,500+', progress: 82 },
        ],
      },
      productization: {
        entities: ['Zscaler ZPA', 'Palo Alto Prisma Access', 'CrowdStrike Falcon ZTA'],
        metrics: [
          { label: 'PRODUCTS', value: '28', progress: 75 },
          { label: 'VENDORS', value: '52', progress: 70 },
        ],
        notes: 'DISA Thunderdome program deploying zero trust across DoD networks.',
      },
      adoption: {
        entities: ['Fort Bliss NEC', 'CBP', 'City of El Paso IT', 'UTEP', 'El Paso Electric'],
        metrics: [
          { label: 'DOD DEPLOYMENTS', value: '32', progress: 55 },
          { label: 'PROCUREMENT SIGNALS', value: '58', progress: 82 },
        ],
        notes: 'Fort Bliss Network Enterprise Center implementing ZTA per DoD mandate timeline.',
      },
      impact: {
        entities: ['DOD CIO', 'CISA', 'OMB'],
        metrics: [
          { label: 'BREACH REDUCTION', value: '-42%', progress: 42 },
          { label: 'LATERAL MOVEMENT BLOCKED', value: '94%', progress: 94 },
          { label: 'COMPLIANCE RATE', value: '68%', progress: 68 },
        ],
        notes: 'EO 14028 mandating ZTA across all federal agencies by 2025.',
      },
    },
  },

  {
    id: 'tech-siem',
    name: 'SIEM / Security Analytics',
    category: 'Cybersecurity',
    description:
      'Security Information and Event Management platforms aggregating and correlating security events across enterprise networks. Army ARCYBER mandates SIEM coverage for all Fort Bliss garrison systems.',
    currentStage: 'impact',
    trend: 'stable',
    stages: {
      discovery: {
        entities: ['Gartner', 'SANS Institute', 'MITRE', 'NSA IAD'],
        metrics: [
          { label: 'CONCEPT PAPERS', value: '480', progress: 88 },
          { label: 'INITIAL PRODUCTS', value: '6', progress: 75 },
        ],
        notes: 'SIEM emerged in 2005 from the convergence of SIM and SEM technologies.',
      },
      research: {
        entities: ['CMU SEI', 'MITRE ATT&CK', 'SANS Institute', 'Army Cyber Institute'],
        metrics: [
          { label: 'DETECTION RULES', value: '14,000+', progress: 85 },
          { label: 'THREAT FRAMEWORKS', value: 'ATT&CK v14', progress: 90 },
        ],
      },
      development: {
        entities: ['Splunk', 'IBM QRadar', 'Microsoft Sentinel', 'Elastic Security'],
        metrics: [
          { label: 'PLATFORMS', value: '18', progress: 82 },
          { label: 'MARKET SIZE', value: '$6.4B', progress: 85 },
          { label: 'ENG TEAMS', value: '6,200+', progress: 80 },
        ],
      },
      productization: {
        entities: ['Splunk Enterprise Security', 'Microsoft Sentinel', 'CrowdStrike LogScale'],
        metrics: [
          { label: 'PRODUCTS', value: '22', progress: 85 },
          { label: 'VENDORS', value: '38', progress: 80 },
        ],
      },
      adoption: {
        entities: ['Fort Bliss SOC', 'CBP NOC', 'El Paso County IT', 'UTEP CISO', 'WBAMC'],
        metrics: [
          { label: 'DEPLOYMENTS', value: '35', progress: 78 },
          { label: 'EVENTS / DAY', value: '2.4B', progress: 82 },
        ],
        notes: 'Fort Bliss garrison SOC processing over 500M events/day across NIPR/SIPR.',
      },
      impact: {
        entities: ['US Army ARCYBER', 'DISA', 'DHS CISA'],
        metrics: [
          { label: 'MEAN TIME TO DETECT', value: '-58%', progress: 58 },
          { label: 'INCIDENT RESPONSE', value: '-44%', progress: 44 },
          { label: 'COMPLIANCE COVERAGE', value: '92%', progress: 92 },
        ],
        notes: 'Mature technology with proven ROI across El Paso military and government networks.',
      },
    },
  },

  {
    id: 'tech-edr',
    name: 'Endpoint Detection & Response (EDR)',
    category: 'Cybersecurity',
    description:
      'Continuous monitoring and automated response on endpoint devices for malware, ransomware, and APT detection. DISA HBSS successor programs deploying EDR across DoD including Fort Bliss.',
    currentStage: 'impact',
    trend: 'stable',
    stages: {
      discovery: {
        entities: ['Gartner', 'SANS Institute', 'NSA TAO', 'DARPA'],
        metrics: [
          { label: 'INITIAL CONCEPTS', value: '120', progress: 85 },
          { label: 'EARLY PATENTS', value: '180', progress: 72 },
        ],
        notes: 'Anton Chuvakin at Gartner coined EDR in 2013; evolved from legacy antivirus and HIDS.',
      },
      research: {
        entities: ['MITRE Engenuity', 'CMU SEI', 'Sandia Cyber', 'NIST'],
        metrics: [
          { label: 'EVALUATION ROUNDS', value: 'ATT&CK R5', progress: 88 },
          { label: 'THREAT MODELS', value: '28', progress: 75 },
        ],
        notes: 'MITRE ATT&CK Evaluations provide rigorous EDR benchmarking framework.',
      },
      development: {
        entities: ['CrowdStrike', 'SentinelOne', 'Microsoft', 'Carbon Black (VMware)'],
        metrics: [
          { label: 'PLATFORMS', value: '14', progress: 82 },
          { label: 'MARKET SIZE', value: '$4.1B', progress: 85 },
          { label: 'ENG TEAMS', value: '4,800+', progress: 78 },
        ],
      },
      productization: {
        entities: ['CrowdStrike Falcon', 'Microsoft Defender for Endpoint', 'SentinelOne Singularity'],
        metrics: [
          { label: 'PRODUCTS', value: '16', progress: 82 },
          { label: 'VENDORS', value: '22', progress: 78 },
        ],
        notes: 'CrowdStrike Falcon deployed across 60% of Fortune 500 and DoD networks.',
      },
      adoption: {
        entities: ['Fort Bliss', 'DISA', 'CBP', 'El Paso County', 'EPISD'],
        metrics: [
          { label: 'ENDPOINTS PROTECTED', value: '48,000+', progress: 82 },
          { label: 'DEPLOYMENTS', value: '28', progress: 75 },
        ],
        notes: 'DISA deploying CrowdStrike as HBSS replacement across all DoD installations.',
      },
      impact: {
        entities: ['DOD CIO', 'DISA', 'CISA'],
        metrics: [
          { label: 'MALWARE BLOCKED', value: '99.2%', progress: 99 },
          { label: 'DWELL TIME', value: '-72%', progress: 72 },
          { label: 'RANSOMWARE PREVENTED', value: '98.5%', progress: 98 },
        ],
        notes: 'Proven technology delivering near-complete endpoint protection across El Paso installations.',
      },
    },
  },

  {
    id: 'tech-threat-intel',
    name: 'Cyber Threat Intelligence',
    category: 'Cybersecurity',
    description:
      'Structured intelligence feeds, IOCs, and adversary TTPs shared across government and commercial networks. Army ARCYBER and CBP consume commercial threat intel to protect El Paso critical infrastructure.',
    currentStage: 'adoption',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['NSA', 'GCHQ', 'Mandiant', 'MITRE'],
        metrics: [
          { label: 'THREAT FRAMEWORKS', value: '8', progress: 82 },
          { label: 'EARLY REPORTS', value: '240', progress: 68 },
        ],
        notes: 'Mandiant APT1 report (2013) catalyzed commercial threat intelligence as a discipline.',
      },
      research: {
        entities: ['MITRE ATT&CK', 'CISA', 'Army Cyber Institute', 'DHS S&T'],
        metrics: [
          { label: 'THREAT GROUPS TRACKED', value: '680+', progress: 78 },
          { label: 'TTP CATALOG', value: '14 tactics / 201 techniques', progress: 85 },
        ],
      },
      development: {
        entities: ['Mandiant (Google)', 'Recorded Future', 'CrowdStrike', 'ThreatConnect'],
        metrics: [
          { label: 'PLATFORMS', value: '22', progress: 75 },
          { label: 'MARKET SIZE', value: '$3.8B', progress: 78 },
          { label: 'ANALYSTS', value: '4,200+', progress: 72 },
        ],
      },
      productization: {
        entities: ['Recorded Future Intelligence Cloud', 'Mandiant Advantage', 'CrowdStrike Falcon Intelligence'],
        metrics: [
          { label: 'PRODUCTS', value: '18', progress: 72 },
          { label: 'VENDORS', value: '45', progress: 68 },
        ],
        notes: 'STIX/TAXII standards enabling automated threat sharing across government networks.',
      },
      adoption: {
        entities: ['Fort Bliss Cyber', 'CBP CISO', 'El Paso Fusion Center', 'US Army ARCYBER'],
        metrics: [
          { label: 'SUBSCRIBERS', value: '24', progress: 58 },
          { label: 'IOC FEEDS ACTIVE', value: '16', progress: 65 },
        ],
        notes: 'El Paso Fusion Center integrating commercial threat intel with DHS CISA feeds.',
      },
      impact: {
        entities: ['CISA', 'NSA', 'DOD'],
        metrics: [
          { label: 'THREATS PREEMPTED', value: '+34%', progress: 34 },
          { label: 'MEAN TIME TO RESPOND', value: '-48%', progress: 48 },
          { label: 'INTEL SHARING SPEED', value: '-82%', progress: 82 },
        ],
      },
    },
  },

  {
    id: 'tech-ics-ot-security',
    name: 'ICS / OT Cybersecurity',
    category: 'Cybersecurity',
    description:
      'Security monitoring and protection for industrial control systems, SCADA, and OT networks. Critical for El Paso Electric grid, water utility SCADA, and Fort Bliss installation control systems.',
    currentStage: 'productization',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['Idaho National Lab', 'Sandia National Labs', 'NSA', 'ICS-CERT'],
        metrics: [
          { label: 'FOUNDATIONAL REPORTS', value: '180', progress: 72 },
          { label: 'CVE DISCLOSURES', value: '2,400+', progress: 68 },
        ],
        notes: 'Stuxnet (2010) and Ukraine grid attacks (2015-2016) catalyzed ICS security as a discipline.',
      },
      research: {
        entities: ['Idaho National Lab', 'UTEP Engineering', 'Sandia Labs', 'CISA'],
        metrics: [
          { label: 'ACTIVE PROGRAMS', value: '16', progress: 55 },
          { label: 'ICS ADVISORIES/YR', value: '380+', progress: 72 },
        ],
        notes: 'INL Aurora test demonstrated physical destruction via cyber attack on generators.',
      },
      development: {
        entities: ['Dragos', 'Claroty', 'Nozomi Networks', 'Fortinet'],
        metrics: [
          { label: 'PLATFORMS', value: '12', progress: 62 },
          { label: 'FUNDING RAISED', value: '$1.4B', progress: 72 },
          { label: 'ENG TEAMS', value: '1,800+', progress: 58 },
        ],
      },
      productization: {
        entities: ['Dragos Platform', 'Claroty xDome', 'Nozomi Guardian'],
        metrics: [
          { label: 'PRODUCTS', value: '14', progress: 62 },
          { label: 'VENDORS', value: '18', progress: 55 },
        ],
        notes: 'Dragos platform certified for DoD and critical infrastructure OT monitoring.',
      },
      adoption: {
        entities: ['El Paso Electric', 'El Paso Water Utilities', 'Fort Bliss DPW', 'CBP POE Systems'],
        metrics: [
          { label: 'DEPLOYMENTS', value: '8', progress: 38 },
          { label: 'PROCUREMENT SIGNALS', value: '14', progress: 48 },
        ],
        notes: 'El Paso Electric deploying OT monitoring across SCADA networks per NERC CIP.',
      },
      impact: {
        entities: ['CISA', 'NERC', 'DOE'],
        metrics: [
          { label: 'OT VISIBILITY', value: '+62%', progress: 62 },
          { label: 'INCIDENT RESPONSE TIME', value: '-35%', progress: 35 },
          { label: 'COMPLIANCE GAPS', value: '-48%', progress: 48 },
        ],
      },
    },
  },

  {
    id: 'tech-devsecops',
    name: 'DevSecOps',
    category: 'Cybersecurity',
    description:
      'Integration of security into DevOps pipelines. DoD Instruction 5000.87 mandates DevSecOps for all software acquisition, driving demand for toolchains and training at Fort Bliss.',
    currentStage: 'adoption',
    trend: 'increasing',
    stages: {
      discovery: {
        entities: ['Gartner', 'OWASP', 'DOD CIO', 'NIST'],
        metrics: [
          { label: 'INITIAL FRAMEWORKS', value: '6', progress: 75 },
          { label: 'FOUNDATIONAL DOCS', value: '85', progress: 68 },
        ],
        notes: 'DoD DevSecOps Reference Design (2019) established the architecture for military software factories.',
      },
      research: {
        entities: ['CMU SEI', 'MITRE', 'DoD Platform One', 'MIT Lincoln Lab'],
        metrics: [
          { label: 'MATURITY MODELS', value: '4', progress: 65 },
          { label: 'BEST PRACTICES', value: '120+', progress: 72 },
        ],
      },
      development: {
        entities: ['GitLab', 'GitHub', 'JFrog', 'Snyk', 'Sonatype'],
        metrics: [
          { label: 'PLATFORMS', value: '20', progress: 72 },
          { label: 'MARKET SIZE', value: '$5.9B', progress: 78 },
          { label: 'ENG TEAMS', value: '7,200+', progress: 75 },
        ],
      },
      productization: {
        entities: ['GitLab Ultimate', 'GitHub Advanced Security', 'Synopsys Polaris'],
        metrics: [
          { label: 'PRODUCTS', value: '24', progress: 72 },
          { label: 'VENDORS', value: '31', progress: 65 },
        ],
        notes: 'Platform One (Kessel Run model) providing DoD-hardened DevSecOps environment.',
      },
      adoption: {
        entities: ['Army Software Factory', 'Fort Bliss IT', 'DISA', 'CBP TECS Modernization'],
        metrics: [
          { label: 'DOD SOFTWARE FACTORIES', value: '12', progress: 55 },
          { label: 'PROCUREMENT SIGNALS', value: '42', progress: 72 },
        ],
        notes: 'Army Software Factory training soldiers in DevSecOps practices.',
      },
      impact: {
        entities: ['DOD CIO', 'Army CIO/G-6', 'DISA'],
        metrics: [
          { label: 'RELEASE FREQUENCY', value: '+340%', progress: 85 },
          { label: 'VULNERABILITY ESCAPE', value: '-56%', progress: 56 },
          { label: 'TIME TO PRODUCTION', value: '-68%', progress: 68 },
        ],
        notes: 'DevSecOps reducing software delivery timelines from years to weeks for DoD programs.',
      },
    },
  },
];
