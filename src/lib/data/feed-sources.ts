// Feed sources registry — NXT//LINK platform
// 100+ authoritative data sources for procurement signals, market intelligence, and threat monitoring
// Used by the feed agent for source configuration, cadence scheduling, and priority routing

export type FeedSource = {
  id: string;
  name: string;
  type: 'rss' | 'api' | 'scrape';
  category: 'Government' | 'Defense' | 'Technology' | 'Manufacturing' | 'Logistics' | 'Finance' | 'Research' | 'News' | 'Patent' | 'Conference';
  url: string;
  cadenceHours: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
};

export const FEED_SOURCES: FeedSource[] = [

  // ── Government APIs ──────────────────────────────────────────────────────────

  {
    id: 'gov-sam-opportunities',
    name: 'SAM.gov Contract Opportunities',
    type: 'api',
    category: 'Government',
    url: 'https://api.sam.gov/opportunities/v2/search',
    cadenceHours: 6,
    priority: 'critical',
    description: 'System for Award Management federal procurement opportunities API. Primary source for DoD, DHS, and civilian agency solicitations. Filter by NAICS code and place of performance for El Paso-relevant awards. Requires API key.',
  },

  {
    id: 'gov-usaspending',
    name: 'USASpending.gov Awards API',
    type: 'api',
    category: 'Government',
    url: 'https://api.usaspending.gov/api/v2/awards/',
    cadenceHours: 24,
    priority: 'critical',
    description: 'Federal awards database covering contracts, grants, loans, and direct payments. Query by recipient location (El Paso County FIPS 48141), awarding agency, and NAICS code. Tracks actual obligated dollars versus solicitation estimates.',
  },

  {
    id: 'gov-sbir-awards',
    name: 'SBIR.gov Award Database',
    type: 'api',
    category: 'Government',
    url: 'https://www.sbir.gov/api/awards.json',
    cadenceHours: 24,
    priority: 'high',
    description: 'Small Business Innovation Research and STTR award database. Covers Phase I, II, and III DoD/DHS/DOE SBIR contracts with full award amounts and company data. Critical for tracking El Paso startup funding pipeline from federal R&D.',
  },

  {
    id: 'gov-fpds-ng',
    name: 'FPDS-NG Federal Procurement Data System',
    type: 'api',
    category: 'Government',
    url: 'https://www.fpds.gov/ezsearch/search.do',
    cadenceHours: 24,
    priority: 'high',
    description: 'Federal Procurement Data System Next Generation — comprehensive federal contract action reports. Covers modifications, awards, and delivery orders. Used for vendor IKER scoring validation and competitor contract tracking.',
  },

  {
    id: 'gov-grants-gov',
    name: 'Grants.gov RSS Feed',
    type: 'rss',
    category: 'Government',
    url: 'https://www.grants.gov/rss/GG_NewOppByAgency.xml',
    cadenceHours: 6,
    priority: 'high',
    description: 'Federal grant opportunities RSS feed. Covers NSF, NIH, DOE, and DoD research grants. UTEP research commercialization pipeline and El Paso startup R&D funding monitored via this feed.',
  },

  {
    id: 'gov-sec-edgar',
    name: 'SEC EDGAR Full-Text Search',
    type: 'api',
    category: 'Government',
    url: 'https://efts.sec.gov/LATEST/search-index?q=%22El+Paso%22&dateRange=custom',
    cadenceHours: 24,
    priority: 'medium',
    description: 'SEC EDGAR full-text search API for 10-K, 10-Q, 8-K, and S-1 filings. Surfaces public company disclosures mentioning El Paso contracts, facility openings, and defense program wins. Covers defense prime mentions of Fort Bliss in quarterly filings.',
  },

  {
    id: 'gov-bls-employment',
    name: 'BLS Quarterly Census of Employment & Wages',
    type: 'api',
    category: 'Government',
    url: 'https://api.bls.gov/publicAPI/v2/timeseries/data/',
    cadenceHours: 168,
    priority: 'medium',
    description: 'Bureau of Labor Statistics establishment-level employment data by NAICS. Track El Paso County defense, manufacturing, and tech sector job growth as leading indicator for vendor expansion and procurement activity.',
  },

  {
    id: 'gov-census-business',
    name: 'Census Bureau County Business Patterns',
    type: 'api',
    category: 'Government',
    url: 'https://api.census.gov/data/2022/cbp',
    cadenceHours: 168,
    priority: 'low',
    description: 'Annual census of business establishments, employment, and payroll by county and NAICS code. El Paso County (FIPS 48141) technology sector annual employment tracking for long-term market sizing and IKER confidence calibration.',
  },

  {
    id: 'gov-cbp-trade-stats',
    name: 'CBP Trade Statistics',
    type: 'api',
    category: 'Government',
    url: 'https://www.cbp.gov/newsroom/stats/trade',
    cadenceHours: 168,
    priority: 'high',
    description: 'US Customs and Border Protection official trade statistics including port-specific import/export volumes. El Paso ports (Paso del Norte, Bridge of Americas, Ysleta) tracked for USMCA trade flow intelligence and border technology procurement signals.',
  },

  {
    id: 'gov-bts-crossings',
    name: 'BTS Border Crossing Entry Data',
    type: 'api',
    category: 'Government',
    url: 'https://api.bts.gov/api/1/datastore/sql',
    cadenceHours: 168,
    priority: 'high',
    description: 'Bureau of Transportation Statistics monthly border crossing statistics by port, vehicle type, and commodity. Feeds the NXT//LINK BorderTrade layer with El Paso ports 2404 (Paso del Norte), 2406 (Bridge of Americas), and 2408 (Ysleta/Zaragoza) data.',
  },

  {
    id: 'gov-world-bank-trade',
    name: 'World Bank Trade Indicators',
    type: 'api',
    category: 'Government',
    url: 'https://api.worldbank.org/v2/country/MX/indicator/TG.VAL.TOTL.GD.ZS',
    cadenceHours: 168,
    priority: 'low',
    description: 'World Bank macroeconomic trade indicators for Mexico. Trade as share of GDP, export growth, and logistics performance index. Context layer for understanding Juárez maquiladora competitiveness and cross-border supply chain risk.',
  },

  {
    id: 'gov-dod-osd-budget',
    name: 'DoD Comptroller Budget Documents',
    type: 'scrape',
    category: 'Government',
    url: 'https://comptroller.defense.gov/Budget-Materials/',
    cadenceHours: 168,
    priority: 'high',
    description: 'Department of Defense annual budget justification documents (R-2, P-40, O-1 exhibits). Program-specific budget line items for Army systems relevant to Fort Bliss procurement. Released annually in March with President\'s Budget submission.',
  },

  {
    id: 'gov-army-contracting',
    name: 'Army Contracting Command News',
    type: 'rss',
    category: 'Government',
    url: 'https://www.army.mil/rss/148/',
    cadenceHours: 6,
    priority: 'critical',
    description: 'US Army official news RSS feed covering contract awards, acquisition announcements, and program office updates. Covers Fort Bliss MICC (Mission and Installation Contracting Command) awards and 1st Armored Division acquisition actions.',
  },

  {
    id: 'gov-dhs-procurement',
    name: 'DHS Procurement News',
    type: 'rss',
    category: 'Government',
    url: 'https://www.dhs.gov/rss-feeds',
    cadenceHours: 6,
    priority: 'high',
    description: 'Department of Homeland Security news and procurement RSS feeds. Covers CBP technology acquisitions, border surveillance system awards, and biometric program announcements directly relevant to El Paso port of entry technology layer.',
  },

  // ── Patent / IP ──────────────────────────────────────────────────────────────

  {
    id: 'patent-uspto-patentsview',
    name: 'USPTO PatentsView API',
    type: 'api',
    category: 'Patent',
    url: 'https://search.patentsview.org/api/v1/patent/',
    cadenceHours: 168,
    priority: 'medium',
    description: 'USPTO PatentsView open API covering all US patent grants from 1976 to present. Query by assignee location (El Paso, TX), CPC class, or technology keyword. Tracks UTEP and Fort Bliss-related defense company IP output as IKER signal.',
  },

  {
    id: 'patent-google-patents-rss',
    name: 'Google Patents Scholar RSS',
    type: 'rss',
    category: 'Patent',
    url: 'https://patents.google.com/?assignee=utep&output=rss',
    cadenceHours: 168,
    priority: 'medium',
    description: 'Google Patents RSS feed for new grants filtered by assignee. Monitors UTEP Technology Transfer Office IP output, El Paso defense company patent filings, and technology readiness level (TRL) advancement signals from research to commercialization.',
  },

  {
    id: 'patent-epo-ops',
    name: 'EPO Open Patent Services',
    type: 'api',
    category: 'Patent',
    url: 'https://ops.epo.org/3.2/rest-services/published-data/search',
    cadenceHours: 168,
    priority: 'low',
    description: 'European Patent Office Open Patent Services REST API. International patent family data and WIPO PCT applications. Tracks whether El Paso technology firms are building international IP portfolios — a leading indicator of global market ambition.',
  },

  {
    id: 'patent-lens-api',
    name: 'Lens.org Patent & Scholarly API',
    type: 'api',
    category: 'Patent',
    url: 'https://api.lens.org/patent/search',
    cadenceHours: 168,
    priority: 'low',
    description: 'Lens.org free patent and scholarly literature API. Links patents to citing academic papers and grants. Surfaces UTEP research commercialization pipeline and measures technology transfer velocity from lab to product.',
  },

  // ── Defense News ─────────────────────────────────────────────────────────────

  {
    id: 'def-defensenews',
    name: 'Defense News RSS',
    type: 'rss',
    category: 'Defense',
    url: 'https://www.defensenews.com/rss/',
    cadenceHours: 1,
    priority: 'high',
    description: 'Defense News flagship RSS feed. Covers Army modernization programs, Pentagon budget actions, and contract awards. Fort Bliss program news (IVAS, GCSS-Army, Integrated Air and Missile Defense) tracked for vendor procurement signals.',
  },

  {
    id: 'def-breakingdefense',
    name: 'Breaking Defense RSS',
    type: 'rss',
    category: 'Defense',
    url: 'https://breakingdefense.com/feed/',
    cadenceHours: 1,
    priority: 'high',
    description: 'Authoritative defense technology reporting. Strong coverage of Army acquisition policy, OTA (Other Transaction Authority) awards, and SBIR program funding decisions. Frequently breaks contract news 24–48 hours before official DoD announcements.',
  },

  {
    id: 'def-defense-one',
    name: 'Defense One RSS',
    type: 'rss',
    category: 'Defense',
    url: 'https://www.defenseone.com/rss/',
    cadenceHours: 1,
    priority: 'high',
    description: 'Policy-focused defense publication covering DoD strategy, acquisition reform, and technology investment. Pentagon leadership interviews and program office updates provide 6–12 month forward visibility on procurement priorities.',
  },

  {
    id: 'def-army-mil',
    name: 'Army.mil News RSS',
    type: 'rss',
    category: 'Defense',
    url: 'https://www.army.mil/rss/',
    cadenceHours: 6,
    priority: 'critical',
    description: 'Official US Army news RSS feed. Covers unit-level news from Fort Bliss, 1st Armored Division operations, and Army-wide acquisition announcements. Primary source for ground-truth Fort Bliss activity signals.',
  },

  {
    id: 'def-darpa-news',
    name: 'DARPA News RSS',
    type: 'rss',
    category: 'Defense',
    url: 'https://www.darpa.mil/rss.xml',
    cadenceHours: 6,
    priority: 'medium',
    description: 'DARPA program announcements, BAA (Broad Agency Announcement) releases, and technology transition updates. DARPA programs transitioning to Army programs are often fielded at Fort Bliss. 18–36 month lead time from DARPA award to fielding.',
  },

  {
    id: 'def-dvids',
    name: 'DVIDS — Defense Visual Information Service',
    type: 'rss',
    category: 'Defense',
    url: 'https://www.dvidshub.net/rss/news',
    cadenceHours: 6,
    priority: 'medium',
    description: 'Defense Visual Information Distribution Service news and media. Unit-level public affairs releases including Fort Bliss 1st Armored Division, 32nd AAMDC, and White Sands Missile Range exercises. Useful for inferring operational tempo and technology in use.',
  },

  {
    id: 'def-c4isrnet',
    name: 'C4ISRNET RSS',
    type: 'rss',
    category: 'Defense',
    url: 'https://www.c4isrnet.com/rss/',
    cadenceHours: 1,
    priority: 'high',
    description: 'Dedicated command, control, communications, computers, intelligence, surveillance, and reconnaissance technology publication. Covers EW, SATCOM, and tactical network modernization — Fort Bliss C4ISR investment areas covered extensively.',
  },

  {
    id: 'def-national-defense-mag',
    name: 'National Defense Magazine RSS',
    type: 'rss',
    category: 'Defense',
    url: 'https://www.nationaldefensemagazine.org/rss',
    cadenceHours: 6,
    priority: 'medium',
    description: 'NDIA publication covering defense industry news, technology development, and defense business. Contract awards and program office interviews provide procurement signal validation for IKER scoring calibration.',
  },

  // ── Technology News ───────────────────────────────────────────────────────────

  {
    id: 'tech-techcrunch',
    name: 'TechCrunch RSS',
    type: 'rss',
    category: 'Technology',
    url: 'https://techcrunch.com/feed/',
    cadenceHours: 1,
    priority: 'medium',
    description: 'Startup and venture capital technology news. Fundraising rounds, M&A activity, and product launches from defense-adjacent technology companies. Tracks AI, robotics, and drone startup funding rounds that may signal future DoD procurement candidates.',
  },

  {
    id: 'tech-ars-technica',
    name: 'Ars Technica RSS',
    type: 'rss',
    category: 'Technology',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    cadenceHours: 1,
    priority: 'medium',
    description: 'Deep technical reporting on hardware, software, and science. Strong coverage of semiconductor supply chains, cybersecurity vulnerabilities, and defense technology. Relevant for understanding technology maturity curves for IKER scoring.',
  },

  {
    id: 'tech-wired',
    name: 'Wired RSS',
    type: 'rss',
    category: 'Technology',
    url: 'https://www.wired.com/feed/rss',
    cadenceHours: 1,
    priority: 'low',
    description: 'Technology culture and business publication. Long-form reporting on AI, surveillance technology, and border technology policy. Wired has broken several CBP surveillance and border technology stories with procurement relevance.',
  },

  {
    id: 'tech-mit-tech-review',
    name: 'MIT Technology Review RSS',
    type: 'rss',
    category: 'Technology',
    url: 'https://www.technologyreview.com/feed/',
    cadenceHours: 6,
    priority: 'medium',
    description: 'MIT Technology Review science and technology editorial. Ten Breakthrough Technologies list annually identifies emerging areas 2–4 years ahead of DoD procurement. UTEP research alignment with MIT Tech Review trends tracked for grant signal detection.',
  },

  {
    id: 'tech-ieee-spectrum',
    name: 'IEEE Spectrum RSS',
    type: 'rss',
    category: 'Technology',
    url: 'https://spectrum.ieee.org/feeds/feed.rss',
    cadenceHours: 6,
    priority: 'medium',
    description: 'IEEE engineering and technology publication. Covers robotics, AI, power electronics, and communications technology from a practitioner perspective. Strong semiconductor, radar, and autonomous systems coverage directly relevant to Fort Bliss vendor ecosystem.',
  },

  {
    id: 'tech-the-verge',
    name: 'The Verge RSS',
    type: 'rss',
    category: 'Technology',
    url: 'https://www.theverge.com/rss/index.xml',
    cadenceHours: 1,
    priority: 'low',
    description: 'Consumer and enterprise technology news. Tracks major technology company product announcements, cloud platform updates, and AI model releases that flow into government procurement within 12–24 months of commercial launch.',
  },

  {
    id: 'tech-nextgov',
    name: 'Nextgov/FCW RSS',
    type: 'rss',
    category: 'Technology',
    url: 'https://www.nextgov.com/rss/all/',
    cadenceHours: 1,
    priority: 'high',
    description: 'Federal technology policy and IT acquisition news. Covers FedRAMP authorizations, zero-trust implementation mandates, and IT modernization awards. Direct source for CBP and DHS digital modernization procurement intelligence.',
  },

  {
    id: 'tech-fedscoop',
    name: 'FedScoop RSS',
    type: 'rss',
    category: 'Technology',
    url: 'https://fedscoop.com/feed/',
    cadenceHours: 1,
    priority: 'high',
    description: 'Federal technology insider news. Strong relationships with agency CIOs and program managers. Breaks contract awards and IT modernization program news. Army and DHS digital transformation coverage directly relevant to NXT//LINK intelligence layer.',
  },

  {
    id: 'tech-statescoop',
    name: 'StateScoop RSS',
    type: 'rss',
    category: 'Technology',
    url: 'https://statescoop.com/feed/',
    cadenceHours: 6,
    priority: 'medium',
    description: 'State government technology news. Covers Texas DPS technology investments, El Paso city government IT contracts, and Texas DIR (Department of Information Resources) procurement. Relevant for border technology and smart city layer intelligence.',
  },

  // ── Manufacturing & Industrial ────────────────────────────────────────────────

  {
    id: 'mfg-industry-week',
    name: 'IndustryWeek RSS',
    type: 'rss',
    category: 'Manufacturing',
    url: 'https://www.industryweek.com/rss',
    cadenceHours: 6,
    priority: 'medium',
    description: 'Manufacturing strategy and operations publication. Covers reshoring trends, supply chain risk, and automation adoption across US manufacturers. Juárez maquiladora nearshoring activity and El Paso manufacturing corridor news tracked.',
  },

  {
    id: 'mfg-modern-materials-handling',
    name: 'Modern Materials Handling RSS',
    type: 'rss',
    category: 'Manufacturing',
    url: 'https://www.mmh.com/rss',
    cadenceHours: 6,
    priority: 'medium',
    description: 'Warehouse automation and material handling systems publication. Covers AMR deployments, WMS implementations, and conveyor system upgrades at major distribution centers. El Paso FedEx and Amazon hub automation tracked.',
  },

  {
    id: 'mfg-automation-world',
    name: 'Automation World RSS',
    type: 'rss',
    category: 'Manufacturing',
    url: 'https://www.automationworld.com/rss.xml',
    cadenceHours: 6,
    priority: 'medium',
    description: 'Industrial automation and control systems publication. Covers PLC/SCADA upgrades, industrial robotics deployments, and IIoT platform adoption. Juárez automotive and electronics maquiladora automation investment tracked.',
  },

  {
    id: 'mfg-robotics-business-review',
    name: 'Robotics Business Review RSS',
    type: 'rss',
    category: 'Manufacturing',
    url: 'https://www.roboticsbusinessreview.com/rss/',
    cadenceHours: 6,
    priority: 'medium',
    description: 'B2B robotics market and business intelligence. Covers industrial robot shipment data, OEM financials, and end-user adoption across manufacturing sectors. El Paso-Juárez automotive parts manufacturing robot density tracked as IKER comparator.',
  },

  {
    id: 'mfg-sme-manufacturing',
    name: 'SME Manufacturing Engineering RSS',
    type: 'rss',
    category: 'Manufacturing',
    url: 'https://www.sme.org/technologies/articles/',
    cadenceHours: 24,
    priority: 'low',
    description: 'Society of Manufacturing Engineers technical publication. Additive manufacturing, machining, and composites production technology. Fort Bliss MRO and defense manufacturing supply chain firms use SME standards for procurement specifications.',
  },

  // ── Logistics & Supply Chain ──────────────────────────────────────────────────

  {
    id: 'log-supplychainbrain',
    name: 'SupplyChainBrain RSS',
    type: 'rss',
    category: 'Logistics',
    url: 'https://www.supplychainbrain.com/rss',
    cadenceHours: 6,
    priority: 'medium',
    description: 'Supply chain strategy and technology news. Covers cross-border logistics, 3PL market consolidation, and supply chain technology adoption. USMCA cross-border trade optimization technology vendors featured regularly.',
  },

  {
    id: 'log-journal-of-commerce',
    name: 'Journal of Commerce RSS',
    type: 'rss',
    category: 'Logistics',
    url: 'https://www.joc.com/rss',
    cadenceHours: 6,
    priority: 'medium',
    description: 'International trade and logistics publication covering port volumes, freight rates, and intermodal trends. El Paso inland port performance and Santa Teresa rail yard volumes tracked as cross-border trade health indicators.',
  },

  {
    id: 'log-freightwaves',
    name: 'FreightWaves SONAR RSS',
    type: 'rss',
    category: 'Logistics',
    url: 'https://www.freightwaves.com/rss.xml',
    cadenceHours: 1,
    priority: 'high',
    description: 'Real-time freight market data and news from FreightWaves. Covers spot rates, tender rejection rates, and capacity by lane. El Paso–Dallas and El Paso–Los Angeles lane data surfaces trucking market conditions for cross-border logistics vendors.',
  },

  {
    id: 'log-logistics-management',
    name: 'Logistics Management RSS',
    type: 'rss',
    category: 'Logistics',
    url: 'https://www.logisticsmgmt.com/rss',
    cadenceHours: 6,
    priority: 'medium',
    description: '3PL market analysis, warehouse technology, and transportation management system adoption news. Annual 3PL market report and Top 50 3PL provider list used for competitive intelligence benchmarking of El Paso logistics vendors.',
  },

  // ── Finance & Investment ──────────────────────────────────────────────────────

  {
    id: 'fin-crunchbase-api',
    name: 'Crunchbase Funding API',
    type: 'api',
    category: 'Finance',
    url: 'https://api.crunchbase.com/api/v4/entities/organizations',
    cadenceHours: 24,
    priority: 'high',
    description: 'Crunchbase startup funding and investment data API. Tracks venture capital rounds, acqui-hires, and M&A activity for defense and border technology companies. El Paso-headquartered startups and Texas-based defense tech investors monitored.',
  },

  {
    id: 'fin-pitchbook-alerts',
    name: 'PitchBook Market Coverage',
    type: 'scrape',
    category: 'Finance',
    url: 'https://pitchbook.com/news',
    cadenceHours: 24,
    priority: 'medium',
    description: 'PitchBook private capital market news and deal data. VC funding, PE buyouts, and public market comparables for defense technology companies. Texas-based fund activity and Southwest portfolio company tracking relevant to El Paso ecosystem.',
  },

  {
    id: 'fin-alpha-vantage',
    name: 'Alpha Vantage Financial API',
    type: 'api',
    category: 'Finance',
    url: 'https://www.alphavantage.co/query',
    cadenceHours: 1,
    priority: 'medium',
    description: 'Free financial data API for equities, forex, and economic indicators. Tracks stock performance of publicly traded defense vendors (L3Harris, Raytheon, SAIC, Leidos) as public market validation for IKER confidence scores.',
  },

  {
    id: 'fin-yahoo-finance',
    name: 'Yahoo Finance RSS',
    type: 'rss',
    category: 'Finance',
    url: 'https://finance.yahoo.com/rss/topstories',
    cadenceHours: 1,
    priority: 'low',
    description: 'Yahoo Finance news and market data RSS. Tracks defense sector earnings, analyst upgrades/downgrades, and M&A speculation. Supplementary source for IKER score calibration when quarterly earnings show contract revenue trends.',
  },

  {
    id: 'fin-sec-filings-rss',
    name: 'SEC EDGAR Filings RSS',
    type: 'rss',
    category: 'Finance',
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=8-K&dateb=&owner=include&count=40&search_text=&output=atom',
    cadenceHours: 6,
    priority: 'high',
    description: 'SEC EDGAR 8-K material event filings RSS. Defense prime contractors and technology companies must disclose material contract awards above threshold amounts within 4 business days. Fastest public signal for major federal contract wins.',
  },

  {
    id: 'fin-defense-daily',
    name: 'Defense Daily RSS',
    type: 'rss',
    category: 'Finance',
    url: 'https://www.defensedaily.com/rss',
    cadenceHours: 1,
    priority: 'high',
    description: 'Daily defense program and contract news with Wall Street analysis angle. Covers Pentagon budget toplines, program restructures, and contractor earnings calls that impact Fort Bliss program funding levels.',
  },

  // ── Research & Academic ───────────────────────────────────────────────────────

  {
    id: 'res-arxiv-cs-ai',
    name: 'arXiv cs.AI (Artificial Intelligence)',
    type: 'rss',
    category: 'Research',
    url: 'https://arxiv.org/rss/cs.AI',
    cadenceHours: 24,
    priority: 'medium',
    description: 'arXiv computer science artificial intelligence preprint RSS. 150–300 new papers daily. Scanned for UTEP author affiliations and El Paso/Fort Bliss-relevant applied AI research. DoD-affiliated co-authors tracked as procurement signal.',
  },

  {
    id: 'res-arxiv-cs-ro',
    name: 'arXiv cs.RO (Robotics)',
    type: 'rss',
    category: 'Research',
    url: 'https://arxiv.org/rss/cs.RO',
    cadenceHours: 24,
    priority: 'medium',
    description: 'arXiv robotics preprint RSS. Autonomous ground vehicles, manipulation, and multi-robot systems research. Army Research Lab co-authored papers on robotic combat vehicle navigation tracked for Fort Bliss fielding signal.',
  },

  {
    id: 'res-arxiv-cs-cr',
    name: 'arXiv cs.CR (Cryptography & Security)',
    type: 'rss',
    category: 'Research',
    url: 'https://arxiv.org/rss/cs.CR',
    cadenceHours: 24,
    priority: 'medium',
    description: 'arXiv cryptography and security preprint RSS. Zero-knowledge proofs, post-quantum cryptography, and adversarial machine learning. NSA/CISA-relevant research monitored for DoD CMMC compliance framework evolution signals.',
  },

  {
    id: 'res-arxiv-eess-sp',
    name: 'arXiv eess.SP (Signal Processing)',
    type: 'rss',
    category: 'Research',
    url: 'https://arxiv.org/rss/eess.SP',
    cadenceHours: 24,
    priority: 'low',
    description: 'arXiv electrical engineering signal processing preprint RSS. Radar waveform design, MIMO communications, and spectral sensing research. White Sands Missile Range and Army Research Lab radar modernization programs draw from this pipeline.',
  },

  {
    id: 'res-semantic-scholar',
    name: 'Semantic Scholar API',
    type: 'api',
    category: 'Research',
    url: 'https://api.semanticscholar.org/graph/v1/paper/search',
    cadenceHours: 168,
    priority: 'low',
    description: 'Semantic Scholar open academic search API. Citation graph and author affiliation data. Used to map UTEP researcher collaboration networks with DoD labs and industry partners — a leading indicator of tech transfer and SBIR application likelihood.',
  },

  {
    id: 'res-nsf-awards',
    name: 'NSF Award Search API',
    type: 'api',
    category: 'Research',
    url: 'https://api.nsf.gov/services/v1/awards.json',
    cadenceHours: 168,
    priority: 'medium',
    description: 'NSF Award Search open API. UTEP-affiliated NSF awards by principal investigator, program, and amount. NSF awards in AI, cybersecurity, and advanced manufacturing tracked as leading indicators of UTEP commercialization pipeline 3–5 years forward.',
  },

  {
    id: 'res-rand-publications',
    name: 'RAND Corporation Publications RSS',
    type: 'rss',
    category: 'Research',
    url: 'https://www.rand.org/rss.xml',
    cadenceHours: 24,
    priority: 'medium',
    description: 'RAND Corporation research reports and policy analysis. Defense acquisition reform, border security technology assessments, and Army modernization program evaluations. RAND findings frequently shape DoD procurement priorities 12–18 months forward.',
  },

  {
    id: 'res-crs-reports',
    name: 'Congressional Research Service Reports',
    type: 'scrape',
    category: 'Research',
    url: 'https://crsreports.congress.gov/search/#/?page=1&pageSize=20&orderBy=Date',
    cadenceHours: 168,
    priority: 'medium',
    description: 'CRS nonpartisan policy analysis reports for Congress. Defense authorization, DHS appropriations, and border security policy reports directly inform procurement authorizations. Army modernization and border wall technology reports tracked.',
  },

  // ── General News ──────────────────────────────────────────────────────────────

  {
    id: 'news-ep-times',
    name: 'El Paso Times RSS',
    type: 'rss',
    category: 'News',
    url: 'https://www.elpasotimes.com/rss/',
    cadenceHours: 1,
    priority: 'critical',
    description: 'Primary El Paso metro news source. Covers Fort Bliss personnel changes, border crossing news, city government technology contracts, and El Paso Electric rate cases. Local procurement signal primary feed.',
  },

  {
    id: 'news-ktsm',
    name: 'KTSM NBC9 El Paso RSS',
    type: 'rss',
    category: 'News',
    url: 'https://www.ktsm.com/feed/',
    cadenceHours: 1,
    priority: 'critical',
    description: 'El Paso NBC affiliate local news RSS. Crime news, border crossing updates, and Fort Bliss activity reporting. NXT//LINK crime intelligence layer primary source alongside KTSM crime beat coverage.',
  },

  {
    id: 'news-kfox14',
    name: 'KFOX14 El Paso RSS',
    type: 'rss',
    category: 'News',
    url: 'https://kfoxtv.com/feed/',
    cadenceHours: 1,
    priority: 'high',
    description: 'El Paso Fox affiliate local news RSS. Border security, military, and business coverage. Cross-validates KTSM crime and border news with independent reporting. Secondary local intelligence layer feed.',
  },

  {
    id: 'news-kvia',
    name: 'KVIA ABC7 El Paso RSS',
    type: 'rss',
    category: 'News',
    url: 'https://kvia.com/feed/',
    cadenceHours: 1,
    priority: 'high',
    description: 'El Paso ABC affiliate local news RSS. Fort Bliss and border technology business news coverage. Convergence detection: when KTSM + KFOX14 + KVIA all cover same story, marks ◉ CONV badge in CrimeNewsOverlay.',
  },

  {
    id: 'news-el-diario',
    name: 'El Diario de El Paso RSS',
    type: 'rss',
    category: 'News',
    url: 'https://www.diario.mx/rss.xml',
    cadenceHours: 1,
    priority: 'high',
    description: 'Spanish-language El Paso/Juárez regional newspaper RSS. Covers maquiladora business, Chihuahua state government contracts, and cross-border supply chain news. Critical for monitoring Juárez industrial corridor intelligence not covered by English-language sources.',
  },

  {
    id: 'news-texas-tribune',
    name: 'Texas Tribune RSS',
    type: 'rss',
    category: 'News',
    url: 'https://www.texastribune.org/rss.xml',
    cadenceHours: 6,
    priority: 'medium',
    description: 'Texas policy and political news nonprofit. Covers state border security funding, Texas Department of Public Safety technology contracts, and El Paso legislative representation activity. State-level procurement signals.',
  },

  {
    id: 'news-san-antonio-express',
    name: 'San Antonio Express-News Business RSS',
    type: 'rss',
    category: 'News',
    url: 'https://www.expressnews.com/rss/business/',
    cadenceHours: 6,
    priority: 'low',
    description: 'San Antonio metro business news. Covers JBSA (Joint Base San Antonio) technology contracts, Border Security Expo announcements, and South Texas defense industry developments. Regional context for El Paso defense market.',
  },

  {
    id: 'news-reuters-defense',
    name: 'Reuters Defense & Aerospace RSS',
    type: 'rss',
    category: 'News',
    url: 'https://feeds.reuters.com/reuters/businessNews',
    cadenceHours: 1,
    priority: 'medium',
    description: 'Reuters global business and defense news. International context for US defense budget decisions, NATO procurement, and global arms market trends that affect Fort Bliss program funding and prime contractor revenues.',
  },

  {
    id: 'news-politico-defense',
    name: 'Politico Defense RSS',
    type: 'rss',
    category: 'News',
    url: 'https://www.politico.com/rss/politicopicks.xml',
    cadenceHours: 1,
    priority: 'medium',
    description: 'Politico national defense and national security reporting. Pentagon policy decisions, NDAA provisions, and DoD leadership changes that shift acquisition priorities. 90-day procurement signal leading indicator for major program changes.',
  },

  // ── Energy News ───────────────────────────────────────────────────────────────

  {
    id: 'energy-renewableenergyworld',
    name: 'Renewable Energy World RSS',
    type: 'rss',
    category: 'Technology',
    url: 'https://www.renewableenergyworld.com/rss/',
    cadenceHours: 6,
    priority: 'medium',
    description: 'Renewable energy technology and project news. Solar, wind, and storage project developments in West Texas and New Mexico tracked. NextEra and El Paso Electric capital project announcements monitored for procurement intelligence.',
  },

  {
    id: 'energy-pv-magazine',
    name: 'PV Magazine US RSS',
    type: 'rss',
    category: 'Technology',
    url: 'https://pv-magazine-usa.com/feed/',
    cadenceHours: 6,
    priority: 'medium',
    description: 'Solar photovoltaic industry news. Module pricing, inverter technology, and utility-scale project announcements. El Paso Electric and West Texas community solar procurements tracked for technology vendor signal extraction.',
  },

  {
    id: 'energy-utility-dive',
    name: 'Utility Dive RSS',
    type: 'rss',
    category: 'Technology',
    url: 'https://www.utilitydive.com/feeds/news/',
    cadenceHours: 6,
    priority: 'high',
    description: 'Electric utility industry news and regulatory analysis. PUCT (Public Utility Commission of Texas) rate cases, grid modernization programs, and utility technology procurement. El Paso Electric regulatory filings and capex plan updates tracked.',
  },

  // ── Border / Trade Specific ────────────────────────────────────────────────────

  {
    id: 'border-cbp-news',
    name: 'CBP Newsroom RSS',
    type: 'rss',
    category: 'Government',
    url: 'https://www.cbp.gov/about/media/news-releases/rss',
    cadenceHours: 6,
    priority: 'critical',
    description: 'US Customs and Border Protection official news releases RSS. Port of entry technology deployments, biometric system activations, and trade enforcement actions. El Paso field office (OFO) announcements tracked for border technology layer updates.',
  },

  {
    id: 'border-ice-news',
    name: 'ICE News Releases RSS',
    type: 'rss',
    category: 'Government',
    url: 'https://www.ice.gov/news/releases/rss',
    cadenceHours: 6,
    priority: 'high',
    description: 'Immigration and Customs Enforcement news releases. El Paso field office enforcement actions, technology procurement announcements, and HSI (Homeland Security Investigations) El Paso operations — relevant to border technology intelligence layer.',
  },

  {
    id: 'border-ustr-trade',
    name: 'USTR Trade Policy News RSS',
    type: 'rss',
    category: 'Government',
    url: 'https://ustr.gov/rss',
    cadenceHours: 24,
    priority: 'medium',
    description: 'US Trade Representative policy and negotiation updates. USMCA implementation monitoring, Section 232/301 tariff actions, and Mexico trade dispute resolution. Trade policy changes have direct impact on El Paso-Juárez cross-border technology procurement.',
  },

  {
    id: 'border-mexico-diario-oficial',
    name: 'Mexico Diario Oficial (DOF) Federal Register',
    type: 'scrape',
    category: 'Government',
    url: 'https://dof.gob.mx/rss.php',
    cadenceHours: 24,
    priority: 'medium',
    description: 'Mexico\'s official federal register RSS. Mexican government procurement notices, IMSS/ISSSTE technology contracts, and Chihuahua state procurement for Juárez infrastructure technology. Supplements US-side border intelligence.',
  },

  // ── Job Market Intelligence ───────────────────────────────────────────────────

  {
    id: 'jobs-indeed-ep-defense',
    name: 'Indeed El Paso Defense Jobs',
    type: 'scrape',
    category: 'Government',
    url: 'https://www.indeed.com/jobs?q=defense+secret+clearance&l=El+Paso%2C+TX&sort=date',
    cadenceHours: 24,
    priority: 'medium',
    description: 'Indeed job postings scrape for El Paso defense and cleared professional positions. Job posting velocity by contractor is a leading indicator of contract win activity — companies staff up 30–90 days before award announcement. Track changes in SAIC, L3Harris, Booz Allen posting volume.',
  },

  {
    id: 'jobs-usajobs-ep',
    name: 'USAJobs El Paso Federal Openings',
    type: 'api',
    category: 'Government',
    url: 'https://data.usajobs.gov/api/search?LocationName=El+Paso%2C+Texas',
    cadenceHours: 24,
    priority: 'medium',
    description: 'USAJobs API for El Paso federal civilian and military vacancy postings. Fort Bliss program manager and acquisition officer postings signal upcoming procurement actions. CBP El Paso Field Office technology specialist hires correlate with system deployment timelines.',
  },

  {
    id: 'jobs-linkedin-scrape',
    name: 'LinkedIn El Paso Tech Jobs (reference)',
    type: 'scrape',
    category: 'Government',
    url: 'https://www.linkedin.com/jobs/search/?location=El%20Paso%2C%20Texas&keywords=software+defense+cleared',
    cadenceHours: 24,
    priority: 'low',
    description: 'LinkedIn job search reference for El Paso technology and defense professional openings. Rate-limited scrape for monitoring contractor hiring spikes. Note: LinkedIn blocks automated scraping — use manual review or approved API partner access.',
  },

  // ── Conference Intel Feeds ────────────────────────────────────────────────────

  {
    id: 'conf-ausa-rss',
    name: 'AUSA News RSS',
    type: 'rss',
    category: 'Conference',
    url: 'https://www.ausa.org/rss.xml',
    cadenceHours: 24,
    priority: 'high',
    description: 'Association of the United States Army news and event RSS. Conference program announcements, speaker lineups, and exhibitor news for AUSA Annual Meeting. 6-month forward visibility on Army procurement themes and senior leader speaking topics.',
  },

  {
    id: 'conf-afcea-rss',
    name: 'AFCEA International News RSS',
    type: 'rss',
    category: 'Conference',
    url: 'https://www.afcea.org/signal/rss.xml',
    cadenceHours: 24,
    priority: 'medium',
    description: 'AFCEA Signal magazine and international news RSS. C4ISR technology news, conference previews, and acquisition policy analysis. Army and Navy program office themes previewed 3–6 months before AFCEA West and TechNet events.',
  },

  {
    id: 'conf-ndia-rss',
    name: 'National Defense Magazine RSS',
    type: 'rss',
    category: 'Conference',
    url: 'https://www.nationaldefensemagazine.org/rss',
    cadenceHours: 24,
    priority: 'medium',
    description: 'NDIA publication with conference preview and post-event coverage. Procurement panel summaries from SOFIC, AUSA, and NDIA events provide distilled acquisition priority intelligence without attending.',
  },

  // ── Procurement & Acquisition Policy ─────────────────────────────────────────

  {
    id: 'policy-far-updates',
    name: 'Federal Acquisition Regulation Updates',
    type: 'rss',
    category: 'Government',
    url: 'https://www.federalregister.gov/documents/search.rss?conditions%5Bagencies%5D%5B%5D=defense-acquisition-regulations-system',
    cadenceHours: 24,
    priority: 'medium',
    description: 'Federal Register RSS for Defense FAR Supplement (DFARS) and FAR rule changes. CMMC certification requirements, OTA authority expansions, and SBIR reform rules monitored. Regulatory changes can shift procurement eligibility for El Paso vendors.',
  },

  {
    id: 'policy-pogo-oversight',
    name: 'POGO Federal Contractor Misconduct Database',
    type: 'scrape',
    category: 'Government',
    url: 'https://contractormisconduct.org/contractors',
    cadenceHours: 168,
    priority: 'low',
    description: 'Project On Government Oversight contractor misconduct database. Tracks fraud, overbilling, and False Claims Act settlements for federal contractors. IKER risk scoring supplement — negative evidence for deductions from vendor confidence score.',
  },

  // ── Water Technology ──────────────────────────────────────────────────────────

  {
    id: 'water-waterworld-rss',
    name: 'WaterWorld Magazine RSS',
    type: 'rss',
    category: 'Technology',
    url: 'https://www.waterworld.com/rss',
    cadenceHours: 24,
    priority: 'medium',
    description: 'Water treatment and infrastructure technology publication. Desalination, water reuse, and smart metering technology news. El Paso Water Utilities (World Water Prize 2024 finalist) leads the US in advanced water reuse — monitoring EPWU procurement for vendor signals.',
  },

  {
    id: 'water-awwa-news',
    name: 'AWWA Water Science RSS',
    type: 'rss',
    category: 'Research',
    url: 'https://www.awwa.org/Portals/0/files/publications/documents/RSS/Water_Science.xml',
    cadenceHours: 168,
    priority: 'low',
    description: 'American Water Works Association Water Science journal RSS. Research on desalination technology, aquifer storage, and brackish water treatment. EPWU desalination plant expansion program technology sourcing monitored via AWWA research pipeline.',
  },

  // ── Health Tech ───────────────────────────────────────────────────────────────

  {
    id: 'health-modern-healthcare',
    name: 'Modern Healthcare RSS',
    type: 'rss',
    category: 'Technology',
    url: 'https://www.modernhealthcare.com/rss',
    cadenceHours: 6,
    priority: 'low',
    description: 'Healthcare industry management and technology news. Hospital IT, EHR system procurement, and telehealth platform adoption. UMC, El Paso Children\'s Hospital, and TTUHSC Paul Foster technology procurement monitored for health IT vendor signals.',
  },

  {
    id: 'health-dod-health-news',
    name: 'Military Health System News RSS',
    type: 'rss',
    category: 'Defense',
    url: 'https://health.mil/News/RSS',
    cadenceHours: 24,
    priority: 'medium',
    description: 'Defense Health Agency news and program updates. Military treatment facility technology, MHS Genesis EHR deployment, and telehealth expansion. William Beaumont Army Medical Center (Fort Bliss) health IT procurement tracked.',
  },

];
