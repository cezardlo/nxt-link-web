// src/lib/feeds/quality-source-feeds.ts
// Registry of high-quality RSS/Atom feeds for authoritative intelligence sources.
// Tier 1 = highest authority (government, academic, major think tank)
// Tier 2 = strong authority (industry standards, major research orgs)
// Tier 3 = solid professional sources (trade press with editorial review)

export type QualityFeedType =
  | 'government'
  | 'academic'
  | 'whitepaper'
  | 'patent'
  | 'financial'
  | 'professional'
  | 'standards';

export type QualityFeedSource = {
  id: string;
  name: string;
  url: string;
  type: QualityFeedType;
  tier: 1 | 2 | 3;
  tags: string[];
};

// Google News RSS base (free, no key)
const GN = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

export const QUALITY_FEEDS: QualityFeedSource[] = [
  // ── Government Reports & White Papers ─────────────────────────────────────────
  {
    id: 'gao-reports',
    name: 'GAO Reports',
    url: 'https://www.gao.gov/rss/reports.xml',
    type: 'government',
    tier: 1,
    tags: ['government', 'audit', 'oversight', 'federal'],
  },
  {
    id: 'cbo-reports',
    name: 'CBO Reports',
    url: 'https://www.cbo.gov/publications/all/rss.xml',
    type: 'government',
    tier: 1,
    tags: ['budget', 'economic', 'federal', 'fiscal'],
  },
  {
    id: 'crs-reports',
    name: 'CRS Reports via EveryCRSReport',
    url: 'https://www.everycrsreport.com/rss/newest.xml',
    type: 'government',
    tier: 1,
    tags: ['congressional', 'policy', 'research', 'legislation'],
  },
  {
    id: 'rand-reports',
    name: 'RAND Corporation',
    url: 'https://www.rand.org/content/rand/pubs/research_reports.xml',
    type: 'whitepaper',
    tier: 1,
    tags: ['defense', 'policy', 'research', 'security'],
  },
  {
    id: 'rand-commentary',
    name: 'RAND Commentary',
    url: 'https://www.rand.org/content/rand/blog.xml',
    type: 'whitepaper',
    tier: 2,
    tags: ['defense', 'policy', 'analysis'],
  },
  {
    id: 'brookings',
    name: 'Brookings Institution',
    url: 'https://www.brookings.edu/feed/',
    type: 'whitepaper',
    tier: 1,
    tags: ['policy', 'economic', 'governance', 'technology'],
  },
  {
    id: 'csis-analysis',
    name: 'CSIS Analysis',
    url: 'https://www.csis.org/analysis/feed',
    type: 'whitepaper',
    tier: 1,
    tags: ['defense', 'security', 'international', 'strategy'],
  },
  {
    id: 'heritage',
    name: 'Heritage Foundation',
    url: 'https://www.heritage.org/rss/all-research-and-publications.xml',
    type: 'whitepaper',
    tier: 2,
    tags: ['policy', 'defense', 'economic', 'governance'],
  },
  {
    id: 'urban-institute',
    name: 'Urban Institute',
    url: 'https://www.urban.org/rss.xml',
    type: 'whitepaper',
    tier: 2,
    tags: ['policy', 'economic', 'urban', 'data'],
  },
  {
    id: 'wilson-center',
    name: 'Wilson Center',
    url: 'https://www.wilsoncenter.org/rss.xml',
    type: 'whitepaper',
    tier: 2,
    tags: ['international', 'policy', 'Mexico', 'security'],
  },
  {
    id: 'cfr',
    name: 'Council on Foreign Relations',
    url: 'https://www.cfr.org/rss.xml',
    type: 'whitepaper',
    tier: 1,
    tags: ['international', 'security', 'trade', 'policy'],
  },
  {
    id: 'itif',
    name: 'ITIF Technology Policy',
    url: 'https://itif.org/feed/',
    type: 'whitepaper',
    tier: 2,
    tags: ['technology', 'policy', 'innovation', 'digital'],
  },
  {
    id: 'new-america',
    name: 'New America',
    url: 'https://www.newamerica.org/rss/',
    type: 'whitepaper',
    tier: 2,
    tags: ['technology', 'policy', 'cybersecurity', 'education'],
  },
  {
    id: 'bipartisan-policy',
    name: 'Bipartisan Policy Center',
    url: 'https://bipartisanpolicy.org/feed/',
    type: 'whitepaper',
    tier: 2,
    tags: ['policy', 'infrastructure', 'energy', 'governance'],
  },
  {
    id: 'migration-policy',
    name: 'Migration Policy Institute',
    url: 'https://www.migrationpolicy.org/rss.xml',
    type: 'whitepaper',
    tier: 1,
    tags: ['immigration', 'border', 'policy', 'El Paso'],
  },

  // ── Government Advisories & Standards ─────────────────────────────────────────
  {
    id: 'cisa-advisories',
    name: 'CISA Cybersecurity Advisories',
    url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
    type: 'government',
    tier: 1,
    tags: ['cybersecurity', 'advisory', 'critical-infrastructure', 'defense'],
  },
  {
    id: 'nist-pubs',
    name: 'NIST Publications',
    url: 'https://csrc.nist.gov/publications/rss',
    type: 'standards',
    tier: 1,
    tags: ['cybersecurity', 'standards', 'compliance', 'technology'],
  },
  {
    id: 'nist-news',
    name: 'NIST News',
    url: 'https://www.nist.gov/news-events/news/rss.xml',
    type: 'standards',
    tier: 1,
    tags: ['standards', 'technology', 'measurement', 'research'],
  },
  {
    id: 'fedreg-technology',
    name: 'Federal Register: Technology',
    url: 'https://www.federalregister.gov/documents/search.atom?conditions%5Btopic%5D%5B%5D=science-and-technology',
    type: 'government',
    tier: 1,
    tags: ['regulation', 'technology', 'federal', 'compliance'],
  },
  {
    id: 'dhs-news',
    name: 'DHS News',
    url: 'https://www.dhs.gov/news-releases/rss.xml',
    type: 'government',
    tier: 1,
    tags: ['homeland-security', 'border', 'cybersecurity', 'defense'],
  },
  {
    id: 'cbp-newsroom',
    name: 'CBP Newsroom',
    url: 'https://www.cbp.gov/newsroom/rss.xml',
    type: 'government',
    tier: 1,
    tags: ['border', 'trade', 'customs', 'El Paso'],
  },
  {
    id: 'sba-research',
    name: 'SBA Research & Reports',
    url: 'https://advocacy.sba.gov/feed/',
    type: 'government',
    tier: 2,
    tags: ['small-business', 'economic', 'policy', 'research'],
  },
  {
    id: 'doe-research',
    name: 'DOE Office of Science',
    url: 'https://www.energy.gov/science/listings/rss.xml',
    type: 'government',
    tier: 1,
    tags: ['energy', 'research', 'technology', 'national-labs'],
  },
  {
    id: 'nsf-news',
    name: 'NSF News',
    url: 'https://www.nsf.gov/rss/rss_www_news.xml',
    type: 'government',
    tier: 1,
    tags: ['research', 'grants', 'science', 'technology'],
  },
  {
    id: 'ustr-news',
    name: 'USTR Press Releases',
    url: 'https://ustr.gov/about-us/policy-offices/press-office/feed',
    type: 'government',
    tier: 1,
    tags: ['trade', 'USMCA', 'Mexico', 'tariffs'],
  },

  // ── Academic Research — arXiv RSS feeds ───────────────────────────────────────
  {
    id: 'arxiv-ai',
    name: 'arXiv: Artificial Intelligence',
    url: 'https://rss.arxiv.org/rss/cs.AI',
    type: 'academic',
    tier: 1,
    tags: ['AI', 'research', 'preprint', 'machine-learning'],
  },
  {
    id: 'arxiv-crypto',
    name: 'arXiv: Cryptography & Security',
    url: 'https://rss.arxiv.org/rss/cs.CR',
    type: 'academic',
    tier: 1,
    tags: ['cybersecurity', 'cryptography', 'research', 'preprint'],
  },
  {
    id: 'arxiv-robotics',
    name: 'arXiv: Robotics',
    url: 'https://rss.arxiv.org/rss/cs.RO',
    type: 'academic',
    tier: 1,
    tags: ['robotics', 'automation', 'research', 'preprint'],
  },
  {
    id: 'arxiv-networking',
    name: 'arXiv: Networking',
    url: 'https://rss.arxiv.org/rss/cs.NI',
    type: 'academic',
    tier: 1,
    tags: ['networking', 'infrastructure', 'research', 'preprint'],
  },
  {
    id: 'arxiv-ml',
    name: 'arXiv: Machine Learning',
    url: 'https://rss.arxiv.org/rss/cs.LG',
    type: 'academic',
    tier: 1,
    tags: ['machine-learning', 'deep-learning', 'research', 'preprint'],
  },
  {
    id: 'arxiv-cv',
    name: 'arXiv: Computer Vision',
    url: 'https://rss.arxiv.org/rss/cs.CV',
    type: 'academic',
    tier: 1,
    tags: ['computer-vision', 'AI', 'research', 'preprint'],
  },
  {
    id: 'arxiv-systems',
    name: 'arXiv: Systems & Control',
    url: 'https://rss.arxiv.org/rss/eess.SY',
    type: 'academic',
    tier: 2,
    tags: ['systems', 'control', 'engineering', 'automation'],
  },
  {
    id: 'arxiv-signal',
    name: 'arXiv: Signal Processing',
    url: 'https://rss.arxiv.org/rss/eess.SP',
    type: 'academic',
    tier: 2,
    tags: ['signal-processing', 'communications', 'defense'],
  },
  {
    id: 'arxiv-computation',
    name: 'arXiv: Computational Engineering',
    url: 'https://rss.arxiv.org/rss/cs.CE',
    type: 'academic',
    tier: 2,
    tags: ['engineering', 'simulation', 'infrastructure'],
  },
  {
    id: 'arxiv-cyber-physical',
    name: 'arXiv: Multiagent Systems',
    url: 'https://rss.arxiv.org/rss/cs.MA',
    type: 'academic',
    tier: 2,
    tags: ['multi-agent', 'autonomous', 'defense', 'coordination'],
  },

  // ── Academic Research — Google Scholar RSS queries ─────────────────────────────
  {
    id: 'scholar-ep-tech',
    name: 'Scholar: El Paso Technology',
    url: 'https://scholar.google.com/scholar?as_sdt=0,5&q=%22El+Paso%22+technology&hl=en&output=rss',
    type: 'academic',
    tier: 1,
    tags: ['El Paso', 'technology', 'research', 'academic'],
  },
  {
    id: 'scholar-border-security',
    name: 'Scholar: Border Security Technology',
    url: 'https://scholar.google.com/scholar?as_sdt=0,5&q=border+security+technology+surveillance&hl=en&output=rss',
    type: 'academic',
    tier: 1,
    tags: ['border', 'security', 'surveillance', 'defense'],
  },
  {
    id: 'scholar-utep-research',
    name: 'Scholar: UTEP Research',
    url: 'https://scholar.google.com/scholar?as_sdt=0,5&q=UTEP+%22University+of+Texas+El+Paso%22+research&hl=en&output=rss',
    type: 'academic',
    tier: 1,
    tags: ['UTEP', 'El Paso', 'university', 'research'],
  },
  {
    id: 'scholar-desalination',
    name: 'Scholar: Desalination Technology Texas',
    url: 'https://scholar.google.com/scholar?as_sdt=0,5&q=desalination+technology+Texas+water&hl=en&output=rss',
    type: 'academic',
    tier: 1,
    tags: ['water', 'desalination', 'Texas', 'infrastructure'],
  },
  {
    id: 'scholar-fort-bliss',
    name: 'Scholar: Fort Bliss Defense Technology',
    url: 'https://scholar.google.com/scholar?as_sdt=0,5&q=%22Fort+Bliss%22+defense+technology+military&hl=en&output=rss',
    type: 'academic',
    tier: 1,
    tags: ['Fort Bliss', 'defense', 'military', 'technology'],
  },
  {
    id: 'scholar-cross-border',
    name: 'Scholar: Cross-Border Trade Logistics',
    url: 'https://scholar.google.com/scholar?as_sdt=0,5&q=cross-border+trade+logistics+technology+US+Mexico&hl=en&output=rss',
    type: 'academic',
    tier: 1,
    tags: ['trade', 'logistics', 'border', 'USMCA'],
  },
  {
    id: 'scholar-smart-city',
    name: 'Scholar: Smart City Infrastructure',
    url: 'https://scholar.google.com/scholar?as_sdt=0,5&q=smart+city+infrastructure+technology+deployment&hl=en&output=rss',
    type: 'academic',
    tier: 2,
    tags: ['smart-city', 'infrastructure', 'IoT', 'urban'],
  },
  {
    id: 'scholar-defense-ai',
    name: 'Scholar: Defense AI Systems',
    url: 'https://scholar.google.com/scholar?as_sdt=0,5&q=defense+artificial+intelligence+autonomous+systems&hl=en&output=rss',
    type: 'academic',
    tier: 1,
    tags: ['defense', 'AI', 'autonomous', 'military'],
  },
  {
    id: 'scholar-critical-infra',
    name: 'Scholar: Critical Infrastructure Security',
    url: 'https://scholar.google.com/scholar?as_sdt=0,5&q=critical+infrastructure+cybersecurity+SCADA&hl=en&output=rss',
    type: 'academic',
    tier: 1,
    tags: ['cybersecurity', 'critical-infrastructure', 'SCADA', 'ICS'],
  },
  {
    id: 'scholar-supply-chain-tech',
    name: 'Scholar: Supply Chain Technology',
    url: 'https://scholar.google.com/scholar?as_sdt=0,5&q=supply+chain+technology+optimization+automation&hl=en&output=rss',
    type: 'academic',
    tier: 2,
    tags: ['supply-chain', 'logistics', 'optimization', 'automation'],
  },
  {
    id: 'scholar-water-tech',
    name: 'Scholar: Water Treatment Technology',
    url: 'https://scholar.google.com/scholar?as_sdt=0,5&q=water+treatment+technology+arid+region&hl=en&output=rss',
    type: 'academic',
    tier: 2,
    tags: ['water', 'treatment', 'arid', 'infrastructure'],
  },
  {
    id: 'scholar-renewable-grid',
    name: 'Scholar: Renewable Energy Grid',
    url: 'https://scholar.google.com/scholar?as_sdt=0,5&q=renewable+energy+grid+integration+Texas&hl=en&output=rss',
    type: 'academic',
    tier: 2,
    tags: ['energy', 'renewable', 'grid', 'Texas'],
  },

  // ── National Labs & Research Institutions ──────────────────────────────────────
  {
    id: 'sandia-news',
    name: 'Sandia National Labs News',
    url: 'https://newsreleases.sandia.gov/feed/',
    type: 'academic',
    tier: 1,
    tags: ['national-lab', 'defense', 'research', 'New Mexico'],
  },
  {
    id: 'lanl-news',
    name: 'Los Alamos National Lab News',
    url: 'https://discover.lanl.gov/feed/',
    type: 'academic',
    tier: 1,
    tags: ['national-lab', 'defense', 'nuclear', 'New Mexico'],
  },
  {
    id: 'mit-news-research',
    name: 'MIT Research News',
    url: 'https://news.mit.edu/rss/research',
    type: 'academic',
    tier: 1,
    tags: ['research', 'technology', 'academic', 'innovation'],
  },
  {
    id: 'stanford-engineering',
    name: 'Stanford Engineering',
    url: 'https://engineering.stanford.edu/news/rss.xml',
    type: 'academic',
    tier: 1,
    tags: ['research', 'engineering', 'technology', 'academic'],
  },
  {
    id: 'georgia-tech-news',
    name: 'Georgia Tech Research News',
    url: 'https://research.gatech.edu/feed',
    type: 'academic',
    tier: 2,
    tags: ['research', 'engineering', 'defense', 'cybersecurity'],
  },

  // ── SEC / Financial ───────────────────────────────────────────────────────────
  {
    id: 'sec-edgar-8k',
    name: 'SEC EDGAR 8-K Filings',
    url: 'https://efts.sec.gov/LATEST/search-index?q=%22technology%22&dateRange=custom&startdt=2025-01-01&forms=8-K&rss_url=/cgi-bin/browse-edgar?action=getcompany&type=8-K&dateb=&owner=include&count=20&search_text=&action=getcompany&output=atom',
    type: 'financial',
    tier: 2,
    tags: ['SEC', 'filings', 'financial', 'corporate'],
  },
  {
    id: 'sec-edgar-10k',
    name: 'SEC EDGAR 10-K Filings',
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=10-K&dateb=&owner=include&count=20&output=atom',
    type: 'financial',
    tier: 2,
    tags: ['SEC', 'annual-report', 'financial', 'corporate'],
  },

  // ── Defense Contractor & Procurement Intelligence ─────────────────────────────
  {
    id: 'gn-defense-contract-award',
    name: 'GN: Defense Contract Awards',
    url: GN('defense contract award DoD billion'),
    type: 'professional',
    tier: 2,
    tags: ['defense', 'contract', 'procurement', 'DoD'],
  },
  {
    id: 'gn-dhs-technology-contract',
    name: 'GN: DHS Technology Contracts',
    url: GN('DHS homeland security technology contract border'),
    type: 'professional',
    tier: 2,
    tags: ['DHS', 'border', 'technology', 'contract'],
  },
  {
    id: 'gn-sbir-award',
    name: 'GN: SBIR/STTR Awards',
    url: GN('SBIR STTR award small business innovation research technology'),
    type: 'government',
    tier: 2,
    tags: ['SBIR', 'STTR', 'grants', 'small-business', 'innovation'],
  },
  {
    id: 'gn-gsa-schedule',
    name: 'GN: GSA Schedule Awards',
    url: GN('GSA schedule contract award technology services'),
    type: 'government',
    tier: 3,
    tags: ['GSA', 'procurement', 'contract', 'technology'],
  },

  // ── LinkedIn / Professional Intelligence (via Google News proxy) ──────────────
  {
    id: 'gn-linkedin-ep-tech',
    name: 'GN: LinkedIn El Paso Tech',
    url: GN('site:linkedin.com "El Paso" technology company'),
    type: 'professional',
    tier: 3,
    tags: ['LinkedIn', 'El Paso', 'company', 'hiring'],
  },
  {
    id: 'gn-linkedin-ep-hiring',
    name: 'GN: LinkedIn El Paso Hiring',
    url: GN('site:linkedin.com hiring "El Paso" engineer technology'),
    type: 'professional',
    tier: 3,
    tags: ['LinkedIn', 'hiring', 'El Paso', 'engineering'],
  },
  {
    id: 'gn-linkedin-defense-hiring',
    name: 'GN: LinkedIn Defense Hiring',
    url: GN('site:linkedin.com "Fort Bliss" OR "White Sands" hiring defense contractor'),
    type: 'professional',
    tier: 3,
    tags: ['LinkedIn', 'defense', 'hiring', 'Fort Bliss'],
  },

  // ── Google Business / Maps Intelligence (via Google News proxy) ───────────────
  {
    id: 'gn-ep-tech-business',
    name: 'GN: EP Tech Business Openings',
    url: GN('"El Paso" new technology company opening expansion'),
    type: 'professional',
    tier: 3,
    tags: ['El Paso', 'business', 'expansion', 'technology'],
  },
  {
    id: 'gn-ep-industrial-park',
    name: 'GN: EP Industrial Development',
    url: GN('"El Paso" industrial park development manufacturing facility'),
    type: 'professional',
    tier: 3,
    tags: ['El Paso', 'industrial', 'manufacturing', 'development'],
  },

  // ── Patent Intelligence (via Google News proxy for public patent news) ────────
  {
    id: 'gn-patent-ep',
    name: 'GN: El Paso Patents',
    url: GN('"El Paso" patent filing inventor technology'),
    type: 'patent',
    tier: 2,
    tags: ['patent', 'El Paso', 'innovation', 'IP'],
  },
  {
    id: 'gn-patent-defense',
    name: 'GN: Defense Technology Patents',
    url: GN('defense technology patent filing border security surveillance'),
    type: 'patent',
    tier: 2,
    tags: ['patent', 'defense', 'surveillance', 'security'],
  },
  {
    id: 'gn-patent-water',
    name: 'GN: Water Technology Patents',
    url: GN('water desalination patent technology treatment'),
    type: 'patent',
    tier: 3,
    tags: ['patent', 'water', 'desalination', 'treatment'],
  },

  // ── Industry Standards & Compliance ───────────────────────────────────────────
  {
    id: 'iso-news',
    name: 'GN: ISO Standards Updates',
    url: GN('ISO standard published technology cybersecurity'),
    type: 'standards',
    tier: 2,
    tags: ['ISO', 'standards', 'compliance', 'technology'],
  },
  {
    id: 'gn-fedramp',
    name: 'GN: FedRAMP Updates',
    url: GN('FedRAMP authorization cloud government'),
    type: 'standards',
    tier: 2,
    tags: ['FedRAMP', 'cloud', 'government', 'compliance'],
  },
  {
    id: 'gn-cmmc',
    name: 'GN: CMMC Compliance',
    url: GN('CMMC cybersecurity maturity model certification defense'),
    type: 'standards',
    tier: 2,
    tags: ['CMMC', 'cybersecurity', 'defense', 'compliance'],
  },

  // ── Water & Infrastructure Research ───────────────────────────────────────────
  {
    id: 'usgs-water',
    name: 'USGS Water Resources',
    url: 'https://www.usgs.gov/news/feed',
    type: 'government',
    tier: 1,
    tags: ['water', 'geological', 'research', 'infrastructure'],
  },
  {
    id: 'epa-research',
    name: 'EPA Research',
    url: 'https://www.epa.gov/newsreleases/search/rss',
    type: 'government',
    tier: 1,
    tags: ['environment', 'water', 'regulation', 'infrastructure'],
  },
  {
    id: 'usbr-news',
    name: 'Bureau of Reclamation News',
    url: 'https://www.usbr.gov/newsroom/newsrelease/rss.xml',
    type: 'government',
    tier: 1,
    tags: ['water', 'infrastructure', 'dam', 'reclamation'],
  },

  // ── Trade & Economic Intelligence ─────────────────────────────────────────────
  {
    id: 'bls-news',
    name: 'Bureau of Labor Statistics',
    url: 'https://www.bls.gov/feed/bls_latest.rss',
    type: 'government',
    tier: 1,
    tags: ['economic', 'employment', 'labor', 'statistics'],
  },
  {
    id: 'census-news',
    name: 'US Census Bureau News',
    url: 'https://www.census.gov/content/census/en/newsroom/press-releases.xml',
    type: 'government',
    tier: 1,
    tags: ['economic', 'demographic', 'trade', 'data'],
  },
  {
    id: 'ita-trade',
    name: 'International Trade Administration',
    url: 'https://www.trade.gov/rss.xml',
    type: 'government',
    tier: 1,
    tags: ['trade', 'export', 'international', 'commerce'],
  },
  {
    id: 'gn-usmca-trade',
    name: 'GN: USMCA Trade Updates',
    url: GN('USMCA trade agreement Mexico update technology tariff'),
    type: 'government',
    tier: 2,
    tags: ['USMCA', 'trade', 'Mexico', 'tariff'],
  },

  // ── El Paso Specific Research & Reports ───────────────────────────────────────
  {
    id: 'gn-ep-economic-report',
    name: 'GN: EP Economic Reports',
    url: GN('"El Paso" economic report data workforce development'),
    type: 'professional',
    tier: 2,
    tags: ['El Paso', 'economic', 'workforce', 'development'],
  },
  {
    id: 'gn-utep-research-grant',
    name: 'GN: UTEP Research Grants',
    url: GN('UTEP "University of Texas El Paso" grant award research million'),
    type: 'academic',
    tier: 2,
    tags: ['UTEP', 'grants', 'research', 'funding'],
  },
  {
    id: 'gn-borderplex-report',
    name: 'GN: Borderplex Economic Reports',
    url: GN('Borderplex Alliance economic impact report El Paso'),
    type: 'professional',
    tier: 2,
    tags: ['Borderplex', 'economic', 'report', 'El Paso'],
  },
  {
    id: 'gn-ep-white-paper',
    name: 'GN: El Paso White Papers',
    url: GN('"El Paso" white paper report technology infrastructure'),
    type: 'whitepaper',
    tier: 3,
    tags: ['El Paso', 'white-paper', 'report', 'technology'],
  },

  // ── Defense Research & White Papers ────────────────────────────────────────────
  {
    id: 'darpa-news',
    name: 'GN: DARPA News',
    url: GN('DARPA program technology research award'),
    type: 'government',
    tier: 1,
    tags: ['DARPA', 'defense', 'research', 'innovation'],
  },
  {
    id: 'gn-army-futures',
    name: 'GN: Army Futures Command',
    url: GN('Army Futures Command technology modernization program'),
    type: 'government',
    tier: 2,
    tags: ['Army', 'modernization', 'defense', 'technology'],
  },
  {
    id: 'gn-diu',
    name: 'GN: Defense Innovation Unit',
    url: GN('Defense Innovation Unit DIU technology prototype contract'),
    type: 'government',
    tier: 2,
    tags: ['DIU', 'defense', 'innovation', 'prototype'],
  },
  {
    id: 'gn-white-sands-research',
    name: 'GN: White Sands Research',
    url: GN('"White Sands Missile Range" OR "White Sands" research test technology'),
    type: 'government',
    tier: 2,
    tags: ['White Sands', 'testing', 'defense', 'New Mexico'],
  },

  // ── Professional/Industry Research ────────────────────────────────────────────
  {
    id: 'mckinsey-insights',
    name: 'GN: McKinsey Technology Insights',
    url: GN('site:mckinsey.com technology digital transformation AI'),
    type: 'professional',
    tier: 2,
    tags: ['consulting', 'technology', 'digital', 'strategy'],
  },
  {
    id: 'deloitte-insights',
    name: 'GN: Deloitte Insights',
    url: GN('site:deloitte.com technology defense government AI'),
    type: 'professional',
    tier: 2,
    tags: ['consulting', 'technology', 'government', 'defense'],
  },
  {
    id: 'gartner-research',
    name: 'GN: Gartner Research',
    url: GN('Gartner research report technology trend enterprise'),
    type: 'professional',
    tier: 2,
    tags: ['Gartner', 'research', 'enterprise', 'technology'],
  },
  {
    id: 'forrester-research',
    name: 'GN: Forrester Research',
    url: GN('Forrester research report technology wave enterprise'),
    type: 'professional',
    tier: 2,
    tags: ['Forrester', 'research', 'enterprise', 'technology'],
  },
];

// ── Helper functions ────────────────────────────────────────────────────────────

/** Get feeds by type */
export function getFeedsByType(type: QualityFeedType): QualityFeedSource[] {
  return QUALITY_FEEDS.filter((f) => f.type === type);
}

/** Get feeds by tier (1 = highest authority) */
export function getFeedsByTier(tier: 1 | 2 | 3): QualityFeedSource[] {
  return QUALITY_FEEDS.filter((f) => f.tier === tier);
}

/** Get feeds matching any of the given tags */
export function getFeedsByTags(tags: string[]): QualityFeedSource[] {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  return QUALITY_FEEDS.filter((f) =>
    f.tags.some((t) => tagSet.has(t.toLowerCase())),
  );
}

/** Get El Paso-specific feeds */
export function getElPasoFeeds(): QualityFeedSource[] {
  return QUALITY_FEEDS.filter((f) =>
    f.tags.some((t) =>
      ['el paso', 'el_paso', 'utep', 'fort bliss', 'borderplex', 'white sands'].includes(
        t.toLowerCase().replace(/-/g, ' '),
      ),
    ),
  );
}

/** Total count of quality feeds */
export const QUALITY_FEED_COUNT = QUALITY_FEEDS.length;
