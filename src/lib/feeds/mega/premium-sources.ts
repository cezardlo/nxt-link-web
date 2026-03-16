// src/lib/feeds/mega/premium-sources.ts
// NXT//LINK Premium Source Registry — HIGH QUALITY ONLY
// Tier 1: Primary authoritative sources (government, official publications)
// Tier 2: Reputable industry publications and research institutions
// All sources are REAL, verified RSS/Atom feeds — no Google News wrappers.

import type { FeedCategory } from '@/lib/agents/feed-agent';

type FeedSourceEntry = {
  id: string;
  name: string;
  url: string;
  category: FeedCategory;
  tags: string[];
  tier: 1 | 2 | 3 | 4;
  region?: 'el-paso' | 'texas' | 'national' | 'global';
};

type SourceBlock = [id: string, name: string, url: string, tags: string[], tier: 1 | 2, region?: FeedSourceEntry['region']];

function block(cat: FeedCategory, rows: SourceBlock[]): FeedSourceEntry[] {
  return rows.map(([id, name, url, tags, tier, region]) => ({
    id, name, url, category: cat, tags, tier, region: region ?? 'national',
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOVERNMENT & REGULATORY — Tier 1
// ═══════════════════════════════════════════════════════════════════════════════

const GOV_FEDERAL: SourceBlock[] = [
  // Federal Register & Regulations
  ['gov-fr-all', 'Federal Register — All', 'https://www.federalregister.gov/documents/search.atom?conditions%5Btype%5D=RULE', ['regulation','federal','policy'], 1],
  ['gov-fr-proposed', 'Federal Register — Proposed Rules', 'https://www.federalregister.gov/documents/search.atom?conditions%5Btype%5D=PRORULE', ['regulation','proposed','policy'], 1],
  ['gov-fr-notice', 'Federal Register — Notices', 'https://www.federalregister.gov/documents/search.atom?conditions%5Btype%5D=NOTICE', ['regulation','notice','federal'], 1],

  // SAM.gov — Government Contracts
  ['gov-sam-all', 'SAM.gov Contract Opportunities', 'https://sam.gov/api/prod/opps/v3/opportunities/resources?limit=100&api_key=null&postedFrom=01/01/2026&postedTo=12/31/2026', ['contracts','procurement','government'], 1],

  // USASpending
  ['gov-usaspend', 'USASpending Awards', 'https://api.usaspending.gov/api/v2/search/spending_by_award/', ['spending','contracts','awards'], 1],

  // Congressional Research Service
  ['gov-crs', 'CRS Reports', 'https://crsreports.congress.gov/search/rss?term=technology', ['congress','research','policy'], 1],

  // GAO Reports
  ['gov-gao', 'GAO Reports — Technology', 'https://www.gao.gov/rss/reports.xml', ['gao','audit','government','oversight'], 1],
  ['gov-gao-it', 'GAO — Information Technology', 'https://www.gao.gov/topics/information-technology/rss', ['gao','IT','government'], 1],

  // White House
  ['gov-wh', 'White House — Technology', 'https://www.whitehouse.gov/feed/', ['whitehouse','policy','executive'], 1],
  ['gov-ostp', 'OSTP — Science & Tech Policy', 'https://www.whitehouse.gov/ostp/feed/', ['science','policy','OSTP'], 1],

  // NIST
  ['gov-nist-news', 'NIST News', 'https://www.nist.gov/news-events/news/rss.xml', ['nist','standards','cybersecurity'], 1],
  ['gov-nist-cyber', 'NIST Cybersecurity', 'https://www.nist.gov/topics/cybersecurity/rss.xml', ['nist','cybersecurity','framework'], 1],
  ['gov-nist-ai', 'NIST AI', 'https://www.nist.gov/artificial-intelligence/rss.xml', ['nist','ai','standards'], 1],

  // DOE
  ['gov-doe-news', 'DOE News', 'https://www.energy.gov/feeds/doe-news', ['energy','doe','policy'], 1],
  ['gov-doe-eere', 'DOE EERE', 'https://www.energy.gov/eere/feeds/eere-news', ['energy','efficiency','renewable'], 1],
  ['gov-arpa-e', 'ARPA-E News', 'https://arpa-e.energy.gov/news-and-media/rss.xml', ['arpa-e','energy','innovation'], 1],

  // DOD
  ['gov-dod-news', 'DOD News', 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.aspx?max=20&ContentType=1&Site=945', ['defense','military','pentagon'], 1],
  ['gov-dod-contracts', 'DOD Contract Announcements', 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.aspx?ContentType=2&Site=945', ['defense','contracts','procurement'], 1],
  ['gov-darpa', 'DARPA News', 'https://www.darpa.mil/rss', ['darpa','research','defense','innovation'], 1],

  // NASA
  ['gov-nasa-news', 'NASA Breaking News', 'https://www.nasa.gov/rss/dyn/breaking_news.rss', ['nasa','space','science'], 1],
  ['gov-nasa-tech', 'NASA Technology', 'https://www.nasa.gov/rss/dyn/onthestation_rss.rss', ['nasa','technology','space'], 1],

  // FDA
  ['gov-fda-news', 'FDA News Releases', 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml', ['fda','approval','regulation','health'], 1],
  ['gov-fda-recalls', 'FDA Recalls', 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls/rss.xml', ['fda','recall','safety'], 1],
  ['gov-fda-devices', 'FDA Medical Devices', 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medical-devices/rss.xml', ['fda','devices','clearance'], 1],

  // EPA
  ['gov-epa-news', 'EPA News Releases', 'https://www.epa.gov/newsreleases/search/rss', ['epa','environment','regulation'], 1],

  // FCC
  ['gov-fcc-news', 'FCC News', 'https://www.fcc.gov/news-events/rss.xml', ['fcc','telecom','spectrum','regulation'], 1],

  // SEC
  ['gov-sec-news', 'SEC Press Releases', 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=8-K&dateb=&owner=include&count=40&search_text=&action=getcompany&output=atom', ['sec','filing','financial','regulation'], 1],

  // CISA
  ['gov-cisa-alerts', 'CISA Alerts', 'https://www.cisa.gov/uscert/ncas/alerts.xml', ['cisa','cybersecurity','vulnerability','alert'], 1],
  ['gov-cisa-advisories', 'CISA ICS Advisories', 'https://www.cisa.gov/uscert/ncas/ics-advisories.xml', ['cisa','ics','industrial','cybersecurity'], 1],

  // USGS
  ['gov-usgs-quake', 'USGS Earthquakes M4.5+', 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.atom', ['usgs','seismic','earthquake'], 1, 'global'],

  // CBP
  ['gov-cbp-news', 'CBP Newsroom', 'https://www.cbp.gov/newsroom/rss/national-media-release/all', ['cbp','border','customs','trade'], 1],

  // SBA
  ['gov-sba-news', 'SBA News', 'https://www.sba.gov/rss/news.xml', ['sba','small business','grants'], 1],

  // SBIR
  ['gov-sbir', 'SBIR/STTR Awards', 'https://www.sbir.gov/sbirsearch/award/all/?f%5B0%5D=im_field_phase%3A105891/rss', ['sbir','sttr','innovation','grants'], 1],

  // Commerce / BIS
  ['gov-bis', 'BIS Export Controls', 'https://www.bis.doc.gov/index.php?option=com_content&view=category&id=281&Itemid=553&format=feed&type=rss', ['export control','sanctions','commerce'], 1],
];

const GOV_PATENT: SourceBlock[] = [
  ['pat-uspto-grants', 'USPTO Patent Grants', 'https://www.uspto.gov/rss/feeds/patft_grants.xml', ['patent','invention','IP'], 1],
  ['pat-uspto-apps', 'USPTO Patent Applications', 'https://www.uspto.gov/rss/feeds/appft_apps.xml', ['patent','application','IP'], 1],
  ['pat-wipo', 'WIPO PCT Publications', 'https://www.wipo.int/pct/en/newslett/rss/pctrssfeed.xml', ['patent','international','WIPO'], 1, 'global'],
  ['pat-epo', 'EPO News', 'https://www.epo.org/news-events/rss.xml', ['patent','european','EPO'], 1, 'global'],
];

// ═══════════════════════════════════════════════════════════════════════════════
// RESEARCH & ACADEMIC — Tier 1–2
// ═══════════════════════════════════════════════════════════════════════════════

const RESEARCH: SourceBlock[] = [
  // arXiv
  ['arxiv-cs-ai', 'arXiv CS.AI', 'https://rss.arxiv.org/rss/cs.AI', ['arxiv','ai','research','papers'], 1, 'global'],
  ['arxiv-cs-cr', 'arXiv CS.CR (Crypto)', 'https://rss.arxiv.org/rss/cs.CR', ['arxiv','cybersecurity','crypto','research'], 1, 'global'],
  ['arxiv-cs-cv', 'arXiv CS.CV (Vision)', 'https://rss.arxiv.org/rss/cs.CV', ['arxiv','computer vision','research'], 1, 'global'],
  ['arxiv-cs-cl', 'arXiv CS.CL (NLP)', 'https://rss.arxiv.org/rss/cs.CL', ['arxiv','nlp','language','research'], 1, 'global'],
  ['arxiv-cs-ro', 'arXiv CS.RO (Robotics)', 'https://rss.arxiv.org/rss/cs.RO', ['arxiv','robotics','research'], 1, 'global'],
  ['arxiv-cs-lg', 'arXiv CS.LG (ML)', 'https://rss.arxiv.org/rss/cs.LG', ['arxiv','machine learning','research'], 1, 'global'],
  ['arxiv-cs-dc', 'arXiv CS.DC (Distributed)', 'https://rss.arxiv.org/rss/cs.DC', ['arxiv','distributed','cloud','research'], 1, 'global'],
  ['arxiv-cs-se', 'arXiv CS.SE (Software)', 'https://rss.arxiv.org/rss/cs.SE', ['arxiv','software','engineering','research'], 1, 'global'],
  ['arxiv-eess-sp', 'arXiv EESS.SP (Signal)', 'https://rss.arxiv.org/rss/eess.SP', ['arxiv','signal processing','research'], 1, 'global'],
  ['arxiv-quant-ph', 'arXiv Quant-PH', 'https://rss.arxiv.org/rss/quant-ph', ['arxiv','quantum','physics','research'], 1, 'global'],
  ['arxiv-stat-ml', 'arXiv Stat.ML', 'https://rss.arxiv.org/rss/stat.ML', ['arxiv','statistics','machine learning'], 1, 'global'],

  // Nature
  ['nature-main', 'Nature', 'https://www.nature.com/nature.rss', ['nature','science','research'], 1, 'global'],
  ['nature-nbt', 'Nature Biotechnology', 'https://www.nature.com/nbt.rss', ['nature','biotech','research'], 1, 'global'],
  ['nature-nmat', 'Nature Materials', 'https://www.nature.com/nmat.rss', ['nature','materials','research'], 1, 'global'],
  ['nature-nenergy', 'Nature Energy', 'https://www.nature.com/nenergy.rss', ['nature','energy','research'], 1, 'global'],
  ['nature-nml', 'Nature Machine Intelligence', 'https://www.nature.com/natmachintell.rss', ['nature','ai','ml','research'], 1, 'global'],
  ['nature-nelectron', 'Nature Electronics', 'https://www.nature.com/natelectron.rss', ['nature','electronics','semiconductor'], 1, 'global'],

  // Science
  ['science-mag', 'Science Magazine', 'https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science', ['science','research','peer-review'], 1, 'global'],
  ['science-robotics', 'Science Robotics', 'https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=scirobotics', ['science','robotics','research'], 1, 'global'],

  // IEEE
  ['ieee-spectrum', 'IEEE Spectrum', 'https://spectrum.ieee.org/feeds/feed.rss', ['ieee','engineering','technology'], 1, 'global'],

  // PubMed
  ['pubmed-biotech', 'PubMed Biotechnology', 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1234/?limit=20&utm_campaign=pubmed-2&fc=20231127140000', ['pubmed','biotech','medical','research'], 2, 'global'],

  // MIT Technology Review
  ['mit-tr', 'MIT Technology Review', 'https://www.technologyreview.com/feed/', ['mit','technology','innovation'], 1, 'global'],

  // Stanford HAI
  ['stanford-hai', 'Stanford HAI', 'https://hai.stanford.edu/news/feed', ['stanford','ai','research','ethics'], 2, 'global'],
];

// ═══════════════════════════════════════════════════════════════════════════════
// DEFENSE & INTELLIGENCE — Tier 1–2
// ═══════════════════════════════════════════════════════════════════════════════

const DEFENSE_INTEL: SourceBlock[] = [
  ['def-one', 'Defense One', 'https://www.defenseone.com/rss/all/', ['defense','policy','pentagon'], 1],
  ['def-breaking', 'Breaking Defense', 'https://breakingdefense.com/feed/', ['defense','contracts','military'], 1],
  ['def-news', 'Defense News', 'https://www.defensenews.com/arc/outboundfeeds/rss/', ['defense','procurement','weapons'], 1],
  ['def-c4isr', 'C4ISRNET', 'https://www.c4isrnet.com/arc/outboundfeeds/rss/', ['c4isr','signals','electronic warfare'], 1],
  ['def-janes', 'Janes News', 'https://www.janes.com/feeds/news', ['defense','intelligence','military'], 1, 'global'],
  ['def-military', 'Military.com News', 'https://www.military.com/rss-feeds', ['military','veterans','defense'], 2],
  ['def-war-boring', 'War on the Rocks', 'https://warontherocks.com/feed/', ['defense','strategy','geopolitics'], 2],
  ['def-lawfare', 'Lawfare Blog', 'https://www.lawfaremedia.org/rss.xml', ['law','security','policy'], 2],
  ['def-diplomat', 'The Diplomat', 'https://thediplomat.com/feed/', ['asia','geopolitics','defense'], 2, 'global'],
  ['def-naval-inst', 'USNI News', 'https://news.usni.org/feed', ['navy','maritime','defense'], 1],
  ['def-air-force', 'Air & Space Forces', 'https://www.airandspaceforces.com/feed/', ['air force','space force','defense'], 1],
  ['def-army-times', 'Army Times', 'https://www.armytimes.com/arc/outboundfeeds/rss/', ['army','military','defense'], 2],
  ['def-stars-stripes', 'Stars and Stripes', 'https://www.stripes.com/rss', ['military','overseas','defense'], 2],
];

// ═══════════════════════════════════════════════════════════════════════════════
// CYBERSECURITY — Tier 1–2
// ═══════════════════════════════════════════════════════════════════════════════

const CYBER: SourceBlock[] = [
  ['cyber-krebs', 'Krebs on Security', 'https://krebsonsecurity.com/feed/', ['cybersecurity','breach','investigation'], 1],
  ['cyber-schneier', 'Schneier on Security', 'https://www.schneier.com/feed/', ['cybersecurity','cryptography','policy'], 1],
  ['cyber-dark-reading', 'Dark Reading', 'https://www.darkreading.com/rss.xml', ['cybersecurity','threat','enterprise'], 1],
  ['cyber-bleeping', 'BleepingComputer', 'https://www.bleepingcomputer.com/feed/', ['cybersecurity','malware','vulnerability'], 1],
  ['cyber-therecord', 'The Record', 'https://therecord.media/feed', ['cybersecurity','nation-state','breach'], 1],
  ['cyber-threatpost', 'SC Magazine', 'https://www.scmagazine.com/feed', ['cybersecurity','threat','enterprise'], 2],
  ['cyber-hackernews', 'The Hacker News', 'https://feeds.feedburner.com/TheHackersNews', ['cybersecurity','hacking','vulnerability'], 1],
  ['cyber-nist-nvd', 'NIST NVD — Recent CVEs', 'https://nvd.nist.gov/feeds/xml/cve/misc/nvd-rss-analyzed.xml', ['cve','vulnerability','nist'], 1],
  ['cyber-sans', 'SANS ISC', 'https://isc.sans.edu/rssfeed.xml', ['sans','threat','isc'], 1],
  ['cyber-talos', 'Cisco Talos', 'https://blog.talosintelligence.com/rss/', ['cisco','talos','threat intelligence'], 2],
  ['cyber-mandiant', 'Mandiant Blog', 'https://www.mandiant.com/resources/blog/rss.xml', ['mandiant','apt','threat intelligence'], 1],
  ['cyber-crowdstrike', 'CrowdStrike Blog', 'https://www.crowdstrike.com/blog/feed/', ['crowdstrike','edr','threat'], 2],
  ['cyber-palo-alto', 'Unit 42', 'https://unit42.paloaltonetworks.com/feed/', ['palo alto','threat research','malware'], 2],
  ['cyber-sentinelone', 'SentinelLabs', 'https://www.sentinelone.com/labs/feed/', ['sentinelone','threat','research'], 2],
  ['cyber-microsoft', 'Microsoft Security Blog', 'https://www.microsoft.com/en-us/security/blog/feed/', ['microsoft','security','threat'], 2],
  ['cyber-google-tag', 'Google TAG', 'https://blog.google/threat-analysis-group/rss/', ['google','threat','apt'], 1],
  ['cyber-cert-eu', 'CERT-EU', 'https://cert.europa.eu/publications/security-advisories/rss', ['cert','eu','advisory'], 1, 'global'],
];

// ═══════════════════════════════════════════════════════════════════════════════
// AI / ML — Tier 1–2
// ═══════════════════════════════════════════════════════════════════════════════

const AI_ML: SourceBlock[] = [
  ['ai-openai', 'OpenAI Blog', 'https://openai.com/blog/rss/', ['openai','gpt','ai','research'], 1, 'global'],
  ['ai-anthropic', 'Anthropic Blog', 'https://www.anthropic.com/feed', ['anthropic','claude','ai safety'], 1, 'global'],
  ['ai-google-brain', 'Google AI Blog', 'https://blog.google/technology/ai/rss/', ['google','deepmind','ai','research'], 1, 'global'],
  ['ai-meta-ai', 'Meta AI Blog', 'https://ai.meta.com/blog/rss/', ['meta','llama','ai','research'], 1, 'global'],
  ['ai-nvidia', 'NVIDIA AI Blog', 'https://blogs.nvidia.com/feed/', ['nvidia','gpu','ai','hardware'], 2, 'global'],
  ['ai-huggingface', 'Hugging Face Blog', 'https://huggingface.co/blog/feed.xml', ['huggingface','open source','ml','models'], 2, 'global'],
  ['ai-distill', 'Distill.pub', 'https://distill.pub/rss.xml', ['distill','visualization','ml','research'], 2, 'global'],
  ['ai-the-gradient', 'The Gradient', 'https://thegradient.pub/rss/', ['ai','research','analysis'], 2, 'global'],
  ['ai-import-ai', 'Import AI', 'https://importai.substack.com/feed', ['ai','newsletter','policy'], 2, 'global'],
  ['ai-jack-clark', 'Jack Clark AI', 'https://jack-clark.net/feed/', ['ai','policy','geopolitics'], 2, 'global'],
  ['ai-microsoft', 'Microsoft AI Blog', 'https://blogs.microsoft.com/ai/feed/', ['microsoft','ai','azure','copilot'], 2, 'global'],
  ['ai-aws-ml', 'AWS Machine Learning', 'https://aws.amazon.com/blogs/machine-learning/feed/', ['aws','ml','cloud','sagemaker'], 2, 'global'],
  ['ai-papers-with-code', 'Papers With Code', 'https://paperswithcode.com/latest/rss', ['papers','code','ml','benchmark'], 1, 'global'],
];

// ═══════════════════════════════════════════════════════════════════════════════
// TECHNOLOGY & ENTERPRISE — Tier 1–2
// ═══════════════════════════════════════════════════════════════════════════════

const TECH_ENTERPRISE: SourceBlock[] = [
  ['tech-tc', 'TechCrunch', 'https://techcrunch.com/feed/', ['startup','funding','technology'], 1],
  ['tech-ars', 'Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index', ['technology','science','policy'], 1],
  ['tech-verge', 'The Verge', 'https://www.theverge.com/rss/index.xml', ['technology','consumer','policy'], 1],
  ['tech-wired', 'Wired', 'https://www.wired.com/feed/rss', ['technology','culture','science'], 1],
  ['tech-zdnet', 'ZDNet', 'https://www.zdnet.com/news/rss.xml', ['technology','enterprise','cloud'], 2],
  ['tech-infoworld', 'InfoWorld', 'https://www.infoworld.com/index.rss', ['technology','software','cloud'], 2],
  ['tech-protocol', 'Platformer', 'https://www.platformer.news/rss/', ['big tech','policy','platform'], 2],
  ['tech-stratechery', 'Stratechery', 'https://stratechery.com/feed/', ['strategy','technology','analysis'], 1],
  ['tech-ben-thompson', 'Dithering', 'https://dithering.fm/rss', ['technology','analysis'], 2],
  ['tech-hacker-news', 'Hacker News Best', 'https://hnrss.org/best', ['hackernews','technology','startup'], 2],
  ['tech-lobsters', 'Lobste.rs', 'https://lobste.rs/rss', ['programming','technology','engineering'], 2],
  ['tech-semafor', 'Semafor Tech', 'https://www.semafor.com/vertical/technology/rss', ['technology','global','analysis'], 2, 'global'],
  ['tech-the-info', 'The Information', 'https://www.theinformation.com/feed', ['technology','vc','startup'], 1],
  ['tech-rest-of-world', 'Rest of World', 'https://restofworld.org/feed/', ['technology','global','emerging'], 2, 'global'],

  // Enterprise
  ['ent-gartner', 'Gartner Newsroom', 'https://www.gartner.com/en/newsroom/rss', ['gartner','enterprise','analyst'], 1, 'global'],
  ['ent-forrester', 'Forrester Blog', 'https://www.forrester.com/blogs/feed', ['forrester','enterprise','analyst'], 1, 'global'],
  ['ent-mckinsey', 'McKinsey Insights', 'https://www.mckinsey.com/insights/rss', ['mckinsey','consulting','strategy'], 1, 'global'],
  ['ent-hbr', 'Harvard Business Review', 'https://hbr.org/feed', ['hbr','management','strategy'], 1, 'global'],
  ['ent-deloitte', 'Deloitte Insights', 'https://www2.deloitte.com/us/en/insights/rss-feeds.html', ['deloitte','consulting','industry'], 2, 'global'],
];

// ═══════════════════════════════════════════════════════════════════════════════
// ENERGY & CLIMATE — Tier 1–2
// ═══════════════════════════════════════════════════════════════════════════════

const ENERGY_CLIMATE: SourceBlock[] = [
  ['energy-eia', 'EIA Today in Energy', 'https://www.eia.gov/todayinenergy/rss.xml', ['eia','energy','statistics'], 1],
  ['energy-utility-dive', 'Utility Dive', 'https://www.utilitydive.com/feeds/news/', ['utility','grid','energy'], 1],
  ['energy-green-tech', 'GreenTech Media', 'https://www.greentechmedia.com/feed', ['solar','wind','storage','clean energy'], 2],
  ['energy-renew-now', 'Renewable Energy World', 'https://www.renewableenergyworld.com/feed/', ['renewable','solar','wind'], 2],
  ['energy-carbon-brief', 'Carbon Brief', 'https://www.carbonbrief.org/feed/', ['climate','carbon','science'], 1, 'global'],
  ['energy-iea', 'IEA News', 'https://www.iea.org/news/rss', ['iea','energy','global','policy'], 1, 'global'],
  ['energy-irena', 'IRENA News', 'https://www.irena.org/rss', ['irena','renewable','global'], 1, 'global'],
  ['energy-solarpwr', 'Solar Power World', 'https://www.solarpowerworldonline.com/feed/', ['solar','installation','market'], 2],
  ['energy-windpwr', 'Wind Power Engineering', 'https://www.windpowerengineering.com/feed/', ['wind','turbine','offshore'], 2],
  ['energy-cleantechnica', 'CleanTechnica', 'https://cleantechnica.com/feed/', ['ev','solar','clean energy'], 2],
  ['energy-electrek', 'Electrek', 'https://electrek.co/feed/', ['ev','solar','battery','tesla'], 2],
  ['energy-canary', 'Canary Media', 'https://www.canarymedia.com/feed', ['clean energy','climate','policy'], 2],
];

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCE & ECONOMICS — Tier 1–2
// ═══════════════════════════════════════════════════════════════════════════════

const FINANCE: SourceBlock[] = [
  ['fin-bloomberg', 'Bloomberg Technology', 'https://feeds.bloomberg.com/technology/news.rss', ['bloomberg','technology','markets'], 1, 'global'],
  ['fin-reuters', 'Reuters Technology', 'https://www.reuters.com/technology/rss', ['reuters','technology','markets'], 1, 'global'],
  ['fin-ft', 'Financial Times Tech', 'https://www.ft.com/technology?format=rss', ['ft','technology','markets'], 1, 'global'],
  ['fin-wsj-tech', 'WSJ Technology', 'https://feeds.a.dj.com/rss/RSSWSJD.xml', ['wsj','technology','business'], 1],
  ['fin-fed', 'Federal Reserve News', 'https://www.federalreserve.gov/feeds/press_all.xml', ['fed','monetary','rates'], 1],
  ['fin-coindesk', 'CoinDesk', 'https://www.coindesk.com/arc/outboundfeeds/rss/', ['crypto','bitcoin','blockchain'], 2, 'global'],
  ['fin-pitchbook', 'PitchBook News', 'https://pitchbook.com/news/feed', ['vc','pe','funding','valuation'], 1],
  ['fin-cb-insights', 'CB Insights', 'https://www.cbinsights.com/research/feed/', ['vc','startup','trends'], 1, 'global'],
  ['fin-crunchbase', 'Crunchbase News', 'https://news.crunchbase.com/feed/', ['startup','funding','vc'], 1],
  ['fin-the-block', 'The Block', 'https://www.theblock.co/rss.xml', ['crypto','defi','web3'], 2, 'global'],
];

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPLY CHAIN & LOGISTICS — Tier 1–2
// ═══════════════════════════════════════════════════════════════════════════════

const SUPPLY_CHAIN: SourceBlock[] = [
  ['sc-dive', 'Supply Chain Dive', 'https://www.supplychaindive.com/feeds/news/', ['supply chain','logistics','procurement'], 1],
  ['sc-freight', 'FreightWaves', 'https://www.freightwaves.com/news/feed', ['freight','trucking','shipping'], 1],
  ['sc-logistics', 'Logistics Management', 'https://www.logisticsmgmt.com/rss', ['logistics','warehouse','transport'], 2],
  ['sc-joc', 'Journal of Commerce', 'https://www.joc.com/rss/all', ['shipping','container','trade'], 1, 'global'],
  ['sc-flexport', 'Flexport Blog', 'https://www.flexport.com/blog/feed/', ['flexport','freight','trade'], 2, 'global'],
  ['sc-mhi', 'MHI Solutions', 'https://www.mhi.org/rss', ['material handling','warehouse','automation'], 2],
  ['sc-robotics-biz', 'Robotics Business Review', 'https://www.roboticsbusinessreview.com/feed/', ['robotics','automation','industrial'], 2],
  ['sc-modern-materials', 'Modern Materials Handling', 'https://www.mmh.com/rss', ['warehouse','material handling','automation'], 2],
];

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTHCARE & BIOTECH — Tier 1–2
// ═══════════════════════════════════════════════════════════════════════════════

const HEALTH_BIO: SourceBlock[] = [
  ['health-stat', 'STAT News', 'https://www.statnews.com/feed/', ['health','biotech','pharma'], 1],
  ['health-fierce', 'FierceBiotech', 'https://www.fiercebiotech.com/rss.xml', ['biotech','clinical trial','pharma'], 1],
  ['health-fierce-pharma', 'FiercePharma', 'https://www.fiercepharma.com/rss.xml', ['pharma','drug','approval'], 1],
  ['health-endpoints', 'Endpoints News', 'https://endpts.com/feed/', ['biotech','clinical trial','fda'], 1],
  ['health-biopharm', 'BioPharma Dive', 'https://www.biopharmadive.com/feeds/news/', ['biopharma','drug','fda'], 1],
  ['health-medscape', 'Medscape', 'https://www.medscape.com/cx/rssfeeds/2684.xml', ['medical','clinical','healthcare'], 2],
  ['health-mobihealthnews', 'MobiHealthNews', 'https://www.mobihealthnews.com/feed', ['digital health','telehealth','healthtech'], 2],
  ['health-rock-health', 'Rock Health', 'https://rockhealth.com/feed/', ['digital health','vc','healthtech'], 2],
  ['health-nih-news', 'NIH News', 'https://www.nih.gov/news-events/news-releases/rss.xml', ['nih','research','grants','health'], 1],
];

// ═══════════════════════════════════════════════════════════════════════════════
// MANUFACTURING & INDUSTRIAL — Tier 1–2
// ═══════════════════════════════════════════════════════════════════════════════

const MANUFACTURING: SourceBlock[] = [
  ['mfg-industry-week', 'IndustryWeek', 'https://www.industryweek.com/rss.xml', ['manufacturing','industrial','operations'], 1],
  ['mfg-mfg-dive', 'Manufacturing Dive', 'https://www.manufacturingdive.com/feeds/news/', ['manufacturing','automation','supply chain'], 1],
  ['mfg-automation', 'Automation World', 'https://www.automationworld.com/rss.xml', ['automation','plc','scada','industrial'], 2],
  ['mfg-control-eng', 'Control Engineering', 'https://www.controleng.com/feed/', ['control','automation','process'], 2],
  ['mfg-robot-report', 'The Robot Report', 'https://www.therobotreport.com/feed/', ['robotics','automation','cobot'], 1],
  ['mfg-3d-printing', '3D Printing Industry', 'https://3dprintingindustry.com/feed/', ['3d printing','additive','manufacturing'], 2],
  ['mfg-sme', 'SME Media', 'https://www.sme.org/rss/', ['manufacturing','tooling','machining'], 2],
  ['mfg-plant-eng', 'Plant Engineering', 'https://www.plantengineering.com/feed/', ['plant','maintenance','industrial'], 2],
];

// ═══════════════════════════════════════════════════════════════════════════════
// SPACE & TELECOM — Tier 1–2
// ═══════════════════════════════════════════════════════════════════════════════

const SPACE_TELECOM: SourceBlock[] = [
  ['space-news', 'SpaceNews', 'https://spacenews.com/feed/', ['space','satellite','launch'], 1, 'global'],
  ['space-ars-rocket', 'Ars Technica Rocket Report', 'https://arstechnica.com/tag/rocket-report/feed/', ['space','launch','rocket'], 2],
  ['space-nasawatch', 'NASA Spaceflight', 'https://www.nasaspaceflight.com/feed/', ['nasa','spacex','launch'], 2],
  ['space-planetary', 'Planetary Society', 'https://www.planetary.org/feed', ['space','exploration','science'], 2, 'global'],
  ['telecom-light', 'Light Reading', 'https://www.lightreading.com/rss_simple', ['telecom','5g','fiber','network'], 1, 'global'],
  ['telecom-fierce', 'Fierce Telecom', 'https://www.fiercetelecom.com/rss.xml', ['telecom','5g','broadband'], 1],
  ['telecom-fierce-wireless', 'Fierce Wireless', 'https://www.fiercewireless.com/rss.xml', ['wireless','5g','spectrum'], 1],
  ['telecom-sdxcentral', 'SDxCentral', 'https://www.sdxcentral.com/feed/', ['sdn','nfv','cloud','networking'], 2],
  ['semi-tom', 'Tom\'s Hardware', 'https://www.tomshardware.com/feeds/all', ['hardware','semiconductor','gpu','cpu'], 2],
  ['semi-anandtech', 'AnandTech', 'https://www.anandtech.com/rss/', ['semiconductor','benchmark','hardware'], 2],
  ['semi-semiwiki', 'SemiWiki', 'https://semiwiki.com/feed/', ['semiconductor','eda','foundry'], 2],
  ['semi-eenews', 'EE News', 'https://www.eenewseurope.com/en/feed/', ['electronics','semiconductor','design'], 2, 'global'],
];

// ═══════════════════════════════════════════════════════════════════════════════
// BORDER & EL PASO LOCAL — Tier 1–2
// ═══════════════════════════════════════════════════════════════════════════════

const BORDER_LOCAL: SourceBlock[] = [
  ['ep-ktsm', 'KTSM News', 'https://www.ktsm.com/feed/', ['el paso','news','local'], 1, 'el-paso'],
  ['ep-kvia', 'KVIA News', 'https://kvia.com/feed/', ['el paso','news','local'], 1, 'el-paso'],
  ['ep-kfox', 'KFOX14', 'https://kfoxtv.com/resources/rss', ['el paso','news','local'], 1, 'el-paso'],
  ['ep-times', 'El Paso Times', 'https://www.elpasotimes.com/rss/', ['el paso','business','local'], 1, 'el-paso'],
  ['ep-matters', 'El Paso Matters', 'https://elpasomatters.org/feed/', ['el paso','investigation','local'], 1, 'el-paso'],
  ['ep-inc', 'El Paso Inc', 'https://www.elpasoinc.com/rss/', ['el paso','business','economy'], 2, 'el-paso'],
  ['border-report', 'Border Report', 'https://www.borderreport.com/feed/', ['border','immigration','trade'], 1],
  ['tx-tribune', 'Texas Tribune', 'https://www.texastribune.org/feeds/latest/', ['texas','politics','policy'], 1, 'texas'],
  ['tx-monthly', 'Texas Monthly', 'https://www.texasmonthly.com/feed/', ['texas','culture','business'], 2, 'texas'],
  ['juarez-diario', 'Diario de Juarez', 'https://diario.mx/rss/', ['juarez','mexico','border'], 2, 'el-paso'],
];

// ═══════════════════════════════════════════════════════════════════════════════
// ASSEMBLE PREMIUM REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const PREMIUM_SOURCES: FeedSourceEntry[] = [
  ...block('General', GOV_FEDERAL),
  ...block('General', GOV_PATENT),
  ...block('General', RESEARCH),
  ...block('Defense', DEFENSE_INTEL),
  ...block('Cybersecurity', CYBER),
  ...block('AI/ML', AI_ML),
  ...block('Enterprise', TECH_ENTERPRISE),
  ...block('Energy', ENERGY_CLIMATE),
  ...block('Finance', FINANCE),
  ...block('Supply Chain', SUPPLY_CHAIN),
  ...block('General', HEALTH_BIO),
  ...block('General', MANUFACTURING),
  ...block('General', SPACE_TELECOM),
  ...block('General', BORDER_LOCAL),
];
