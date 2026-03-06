// src/lib/feeds/feed-sources-registry.ts
// NXT//LINK Feed Sources Registry — 70,000+ intelligence sources
// Uses compact data tables expanded via generator functions to keep code manageable.
// Mega-registries in ./mega/ add ~65,000 additional sources via TopicMatrix expansion.

import type { FeedCategory } from '@/lib/agents/feed-agent';

// ─── Mega-registries (10k+ per category) ────────────────────────────────────
import { DEFENSE_MEGA_SOURCES } from '@/lib/feeds/mega/defense-sources';
import { CYBERSECURITY_MEGA_SOURCES } from '@/lib/feeds/mega/cybersecurity-sources';
import { AI_ML_MEGA_SOURCES } from '@/lib/feeds/mega/ai-ml-sources';
import { ENTERPRISE_MEGA_SOURCES } from '@/lib/feeds/mega/enterprise-sources';
import { SUPPLY_CHAIN_MEGA_SOURCES } from '@/lib/feeds/mega/supply-chain-sources';
import { ENERGY_MEGA_SOURCES } from '@/lib/feeds/mega/energy-sources';
import { FINANCE_MEGA_SOURCES } from '@/lib/feeds/mega/finance-sources';
import { CRIME_MEGA_SOURCES } from '@/lib/feeds/mega/crime-sources';
import { GENERAL_MEGA_SOURCES } from '@/lib/feeds/mega/general-sources';

export type FeedSourceEntry = {
  id: string;
  name: string;
  url: string;
  category: FeedCategory;
  tags: string[];
  tier: 1 | 2 | 3 | 4;
  region?: 'el-paso' | 'texas' | 'national' | 'global';
};

const GN = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

// Helper: build a GN source entry from compact tuple
type CompactGN = [id: string, name: string, query: string, tags: string[], tier: 1|2|3|4, region?: FeedSourceEntry['region']];
type CompactDirect = [id: string, name: string, url: string, tags: string[], tier: 1|2|3|4, region?: FeedSourceEntry['region']];

function gnEntries(cat: FeedCategory, rows: CompactGN[]): FeedSourceEntry[] {
  return rows.map(([id, name, query, tags, tier, region]) => ({
    id, name, url: GN(query), category: cat, tags, tier, region: region ?? 'national',
  }));
}

function directEntries(cat: FeedCategory, rows: CompactDirect[]): FeedSourceEntry[] {
  return rows.map(([id, name, url, tags, tier, region]) => ({
    id, name, url, category: cat, tags, tier, region: region ?? 'national',
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFENSE & MILITARY (~210 sources)
// ═══════════════════════════════════════════════════════════════════════════════

const DEFENSE_DIRECT: CompactDirect[] = [
  ['def-defense-one', 'Defense One', 'https://www.defenseone.com/rss/all/', ['defense','policy','pentagon'], 1],
  ['def-breaking-defense', 'Breaking Defense', 'https://breakingdefense.com/feed/', ['defense','contracts','military'], 1],
  ['def-defense-news', 'Defense News', 'https://www.defensenews.com/arc/outboundfeeds/rss/', ['defense','procurement','weapons'], 1],
  ['def-c4isrnet', 'C4ISRNET', 'https://www.c4isrnet.com/arc/outboundfeeds/rss/', ['c4isr','electronic warfare','signals'], 1],
  ['def-defensescoop', 'DefenseScoop', 'https://defensescoop.com/feed/', ['defense','technology','dod'], 2],
  ['def-military-times', 'Military Times', 'https://www.militarytimes.com/arc/outboundfeeds/rss/', ['military','troops','veterans'], 2],
  ['def-army-times', 'Army Times', 'https://www.armytimes.com/arc/outboundfeeds/rss/', ['army','soldiers','modernization'], 2],
  ['def-dod-news', 'DoD News', 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945&max=10', ['dod','pentagon','official'], 1],
  ['def-task-purpose', 'Task & Purpose', 'https://taskandpurpose.com/feed/', ['military','veterans','culture'], 2],
  ['def-military-com', 'Military.com', 'https://www.military.com/rss-feeds/content?keyword=news', ['military','benefits','careers'], 2],
];

const DEFENSE_GN: CompactGN[] = [
  // Trade pubs via GN
  ['def-janes', 'GN: Janes', 'Janes defense intelligence analysis', ['janes','intelligence','analysis'], 1, 'global'],
  ['def-national-defense', 'GN: National Defense', 'National Defense Magazine NDIA', ['ndia','defense','industry'], 2],
  ['def-air-space-mag', 'GN: Air Space Forces', 'Air and Space Forces Magazine', ['air force','space force','aviation'], 2],
  ['def-usni', 'GN: USNI News', 'USNI News naval institute proceedings', ['navy','maritime','naval'], 2],
  ['def-war-rocks', 'GN: War on Rocks', 'War on the Rocks defense strategy', ['strategy','policy','analysis'], 2],
  // Contractors
  ['def-lockheed', 'GN: Lockheed Martin', 'Lockheed Martin defense contract award', ['lockheed','f-35','missiles','space'], 2],
  ['def-lockheed-hyper', 'GN: Lockheed Hyper', 'Lockheed Martin hypersonic missile program', ['lockheed','hypersonic'], 3],
  ['def-raytheon', 'GN: RTX Raytheon', 'RTX Raytheon defense contract missile radar', ['raytheon','rtx','missiles','radar'], 2],
  ['def-raytheon-cyber', 'GN: RTX Cyber', 'Raytheon RTX cybersecurity electronic warfare', ['raytheon','cyber','ew'], 3],
  ['def-boeing-def', 'GN: Boeing Defense', 'Boeing defense contract military aircraft', ['boeing','aircraft','tanker'], 2],
  ['def-northrop', 'GN: Northrop Grumman', 'Northrop Grumman defense contract space', ['northrop','b-21','space','cyber'], 2],
  ['def-l3harris', 'GN: L3Harris', 'L3Harris Technologies defense contract', ['l3harris','sensors','communications'], 2],
  ['def-gen-dynamics', 'GN: General Dynamics', 'General Dynamics defense contract GDIT', ['general dynamics','gdit','submarines'], 2],
  ['def-bae', 'GN: BAE Systems', 'BAE Systems defense contract electronic', ['bae','electronic warfare','vehicles'], 2],
  ['def-saic', 'GN: SAIC', 'SAIC defense technology contract award', ['saic','it','services'], 2],
  ['def-leidos', 'GN: Leidos', 'Leidos defense contract technology', ['leidos','it','intelligence'], 2],
  ['def-booz-allen', 'GN: Booz Allen', 'Booz Allen Hamilton defense contract', ['booz allen','consulting','cyber'], 2],
  ['def-textron', 'GN: Textron', 'Textron Systems defense Bell helicopter', ['textron','bell','helicopters'], 3],
  ['def-hii', 'GN: HII', 'Huntington Ingalls Industries shipbuilding defense', ['hii','shipbuilding','carriers'], 3],
  ['def-parsons', 'GN: Parsons', 'Parsons Corporation defense contract infrastructure', ['parsons','infrastructure','missile defense'], 3],
  ['def-kratos', 'GN: Kratos', 'Kratos Defense drones unmanned systems', ['kratos','drones','unmanned'], 3],
  ['def-palantir', 'GN: Palantir Def', 'Palantir Technologies defense contract military', ['palantir','data','ai','army'], 2],
  ['def-anduril', 'GN: Anduril', 'Anduril Industries defense technology autonomous', ['anduril','autonomous','ai','border'], 2],
  ['def-shield-ai', 'GN: Shield AI', 'Shield AI autonomous drone defense', ['shield ai','drone','autonomous'], 3],
  ['def-sierra-nev', 'GN: Sierra Nevada', 'Sierra Nevada Corporation defense space', ['sierra nevada','space','dream chaser'], 3],
  ['def-elbit', 'GN: Elbit', 'Elbit Systems defense contract US', ['elbit','uas','sensors'], 3, 'global'],
  ['def-thales', 'GN: Thales', 'Thales defense technology contract', ['thales','radar','communications'], 3, 'global'],
  ['def-rheinmetall', 'GN: Rheinmetall', 'Rheinmetall defense vehicles ammunition', ['rheinmetall','vehicles','ammunition'], 3, 'global'],
  ['def-caci', 'GN: CACI', 'CACI International defense IT contract', ['caci','it','intelligence'], 3],
  ['def-mantech', 'GN: ManTech', 'ManTech International defense technology', ['mantech','it','cyber'], 3],
  ['def-peraton', 'GN: Peraton', 'Peraton defense intelligence technology contract', ['peraton','intelligence','space'], 3],
  ['def-v2x', 'GN: V2X', 'V2X defense services technology contract', ['v2x','logistics','services'], 3],
  ['def-amentum', 'GN: Amentum', 'Amentum defense technology services contract', ['amentum','services','nuclear'], 3],
  ['def-aerojet', 'GN: Aerojet', 'Aerojet Rocketdyne propulsion missile defense', ['aerojet','propulsion','rockets'], 3],
  ['def-curtiss', 'GN: Curtiss-Wright', 'Curtiss-Wright defense electronics technology', ['curtiss-wright','electronics','naval'], 3],
  ['def-mercury', 'GN: Mercury Systems', 'Mercury Systems defense electronics processing', ['mercury','electronics','processing'], 3],
  // Branches & commands
  ['def-us-army', 'GN: US Army', 'US Army modernization technology program', ['army','modernization','afc'], 2],
  ['def-us-navy', 'GN: US Navy', 'US Navy contract ship program technology', ['navy','ships','naval'], 2],
  ['def-us-af', 'GN: US Air Force', 'US Air Force technology program contract', ['air force','fighter','bombers'], 2],
  ['def-space-force', 'GN: Space Force', 'US Space Force USSF technology satellite', ['space force','satellite','space'], 2],
  ['def-marines', 'GN: Marines', 'US Marine Corps technology modernization', ['marines','usmc','expeditionary'], 2],
  ['def-socom', 'GN: SOCOM', 'SOCOM special operations command technology', ['socom','special operations','sof'], 3],
  ['def-northcom', 'GN: NORTHCOM', 'NORTHCOM northern command homeland defense', ['northcom','homeland','defense'], 3],
  ['def-indopacom', 'GN: INDOPACOM', 'INDOPACOM Indo-Pacific command strategy', ['indopacom','pacific','china'], 3, 'global'],
  // Installations
  ['def-ft-bliss', 'GN: Fort Bliss', 'Fort Bliss Army technology contract', ['fort bliss','el paso','1ad'], 2, 'el-paso'],
  ['def-ft-bliss-ops', 'GN: Bliss Ops', 'Fort Bliss 1st Armored Division operations modernization', ['fort bliss','1st armored','operations'], 3, 'el-paso'],
  ['def-ft-bliss-hire', 'GN: Bliss Hiring', 'Fort Bliss hiring civilian jobs contractor', ['fort bliss','hiring','jobs'], 3, 'el-paso'],
  ['def-wsmr', 'GN: White Sands', 'White Sands Missile Range technology test', ['wsmr','missile','testing'], 2, 'el-paso'],
  ['def-holloman', 'GN: Holloman AFB', 'Holloman Air Force Base drone MQ-9', ['holloman','drones','mq-9'], 3, 'el-paso'],
  ['def-ft-cavazos', 'GN: Fort Cavazos', 'Fort Cavazos Hood Army technology', ['fort cavazos','iii corps','army'], 3, 'texas'],
  ['def-ft-sam', 'GN: Fort Sam', 'Fort Sam Houston JBSA medical command', ['fort sam','jbsa','medical'], 3, 'texas'],
  ['def-lackland', 'GN: Lackland', 'Lackland Air Force Base cyber training', ['lackland','cyber','training'], 3, 'texas'],
  ['def-sandia', 'GN: Sandia Labs', 'Sandia National Laboratories technology research', ['sandia','national lab','nuclear'], 2, 'el-paso'],
  ['def-los-alamos', 'GN: Los Alamos', 'Los Alamos National Laboratory research technology', ['los alamos','national lab','weapons'], 2, 'el-paso'],
  // Programs
  ['def-jadc2', 'GN: JADC2', 'JADC2 joint all-domain command control', ['jadc2','c2','joint'], 2],
  ['def-ivas', 'GN: IVAS', 'IVAS integrated visual augmentation system Army', ['ivas','hololens','mixed reality'], 3],
  ['def-hypersonics', 'GN: Hypersonics', 'hypersonic weapons missile defense program', ['hypersonic','missiles','speed'], 2],
  ['def-autonomous', 'GN: Autonomous Sys', 'autonomous weapons systems drones military AI', ['autonomous','drones','ai weapons'], 2],
  ['def-counter-uas', 'GN: Counter-UAS', 'counter drone UAS defense technology', ['counter-uas','c-uas','drone defense'], 3],
  ['def-directed-energy', 'GN: Directed Energy', 'directed energy weapons laser defense', ['laser','directed energy','weapons'], 3],
  ['def-mda', 'GN: Missile Defense', 'Missile Defense Agency MDA THAAD Patriot', ['mda','thaad','patriot'], 2],
  ['def-cybercom', 'GN: Cyber Command', 'US Cyber Command CYBERCOM operations', ['cybercom','cyber','offensive'], 2],
  ['def-darpa', 'GN: DARPA', 'DARPA research program technology defense', ['darpa','research','advanced'], 1],
  ['def-disa', 'GN: DISA', 'DISA Defense Information Systems Agency', ['disa','networks','it'], 2],
  ['def-afc', 'GN: Army Futures', 'Army Futures Command modernization technology', ['afc','futures','modernization'], 2, 'texas'],
  ['def-nato', 'GN: NATO', 'NATO alliance defense technology modernization', ['nato','alliance','europe'], 2, 'global'],
  ['def-diu', 'GN: DIU', 'Defense Innovation Unit DIU technology commercial', ['diu','innovation','commercial tech'], 2],
  ['def-ndaa', 'GN: NDAA', 'National Defense Authorization Act NDAA budget', ['ndaa','budget','authorization'], 2],
  ['def-pentagon-budget', 'GN: Pentagon Budget', 'Pentagon defense budget spending procurement', ['budget','procurement','spending'], 2],
  ['def-nsa-def', 'GN: NSA', 'NSA National Security Agency cybersecurity defense', ['nsa','sigint','signals intelligence'], 2],
  ['def-nuclear-mod', 'GN: Nuclear Mod', 'nuclear weapons modernization NNSA triad', ['nuclear','nnsa','triad'], 2],
  ['def-space-weapons', 'GN: Space Weapons', 'space defense satellite anti-satellite weapons', ['space','satellite','anti-satellite'], 3],
  ['def-ukraine', 'GN: Ukraine Defense', 'Ukraine weapons aid defense technology', ['ukraine','aid','weapons'], 3, 'global'],
  ['def-taiwan', 'GN: Taiwan Defense', 'Taiwan defense military technology arms', ['taiwan','arms','pacific'], 3, 'global'],
  ['def-israel', 'GN: Israel Defense', 'Israel defense technology Iron Dome military', ['israel','iron dome','defense'], 3, 'global'],
  ['def-aukus', 'GN: AUKUS', 'AUKUS submarine pact Australia UK defense', ['aukus','submarine','australia'], 3, 'global'],
  ['def-mil-ai', 'GN: Military AI', 'artificial intelligence military defense autonomous weapons', ['ai','military','autonomous'], 2],
  ['def-cdao', 'GN: CDAO', 'Chief Digital Artificial Intelligence Office CDAO DoD', ['cdao','ai','data'], 2],
  ['def-dla', 'GN: DLA', 'Defense Logistics Agency supply chain contract', ['dla','logistics','supply'], 3],
  ['def-transcom', 'GN: TRANSCOM', 'TRANSCOM transportation command logistics', ['transcom','transportation','logistics'], 3],
  ['def-ew', 'GN: EW', 'electronic warfare spectrum operations military', ['ew','spectrum','jamming'], 3],
  ['def-5th-gen', 'GN: 5th Gen', 'fifth generation fighter F-35 F-22 NGAD', ['f-35','ngad','fighter'], 3],
  ['def-naval-ships', 'GN: Naval Ships', 'Navy shipbuilding submarine destroyer frigate', ['shipbuilding','submarine','destroyer'], 3],
  ['def-army-vehicles', 'GN: Army Vehicles', 'Army ground vehicle Stryker Bradley OMFV', ['vehicles','stryker','bradley'], 3],
  ['def-gao', 'GN: GAO Defense', 'GAO Government Accountability Office defense audit', ['gao','audit','oversight'], 2],
  ['def-sbir-def', 'GN: SBIR Defense', 'SBIR STTR small business innovation defense', ['sbir','sttr','small business'], 3],
  ['def-replicator', 'GN: Replicator', 'Replicator initiative autonomous drones DoD', ['replicator','drones','mass production'], 2],
  ['def-icbm', 'GN: Sentinel ICBM', 'Sentinel ICBM nuclear modernization program', ['sentinel','icbm','nuclear'], 3],
  ['def-b21', 'GN: B-21 Raider', 'B-21 Raider stealth bomber Northrop', ['b-21','stealth','bomber'], 3],
  ['def-columbia-sub', 'GN: Columbia Sub', 'Columbia class submarine program Navy', ['columbia','submarine','ssbn'], 3],
  ['def-next-gen-helo', 'GN: FLRAA Helo', 'FLRAA Future Long Range Assault Aircraft helicopter', ['flraa','helicopter','bell'], 3],
  ['def-army-network', 'GN: Army Network', 'Army tactical network JTRS communications', ['army network','tactical','comms'], 3],
];

// ═══════════════════════════════════════════════════════════════════════════════
// CYBERSECURITY (~200 sources)
// ═══════════════════════════════════════════════════════════════════════════════

const CYBER_DIRECT: CompactDirect[] = [
  ['cyb-thn', 'THN Sec', 'https://thehackernews.com/feeds/posts/default', ['hacking','threats','vulnerabilities'], 1],
  ['cyb-dark-reading', 'Dark Reading', 'https://www.darkreading.com/rss_simple.asp', ['security','enterprise','threats'], 1],
  ['cyb-bleeping', 'BleepingComp', 'https://www.bleepingcomputer.com/feed/', ['malware','ransomware','vulnerabilities'], 1],
  ['cyb-krebs', 'Krebs on Security', 'https://krebsonsecurity.com/feed/', ['breaches','cybercrime','investigations'], 1],
  ['cyb-schneier', 'Schneier on Security', 'https://www.schneier.com/feed/', ['cryptography','policy','analysis'], 1],
  ['cyb-securityweek', 'SecurityWeek', 'https://www.securityweek.com/feed/', ['vulnerabilities','malware','breaches'], 1],
  ['cyb-threatpost', 'Threatpost', 'https://threatpost.com/feed/', ['threats','vulnerabilities','malware'], 2],
  ['cyb-us-cert', 'CISA Alerts', 'https://www.cisa.gov/cybersecurity-advisories/all.xml', ['cisa','advisories','government'], 1],
  ['cyb-nist-vuln', 'NIST NVD', 'https://nvd.nist.gov/feeds/xml/cve/misc/nvd-rss-analyzed.xml', ['cve','nvd','vulnerabilities'], 1],
  ['cyb-cyberscoop', 'CyberScoop', 'https://cyberscoop.com/feed/', ['cyber','policy','government'], 2],
  ['cyb-infosec-mag', 'Infosecurity Mag', 'https://www.infosecurity-magazine.com/rss/news/', ['infosec','breaches','threats'], 2],
  ['cyb-helpnet', 'Help Net Security', 'https://www.helpnetsecurity.com/feed/', ['security','products','research'], 2],
  ['cyb-sc-media', 'SC Media', 'https://www.scmagazine.com/feed', ['security','enterprise','compliance'], 2],
];

const CYBER_GN: CompactGN[] = [
  // Threat intel & research
  ['cyb-mandiant', 'GN: Mandiant', 'Mandiant threat intelligence APT analysis', ['mandiant','apt','threat intel'], 2],
  ['cyb-recorded-future', 'GN: Recorded Future', 'Recorded Future threat intelligence', ['recorded future','threat intel','dark web'], 2],
  ['cyb-unit42', 'GN: Unit 42', 'Palo Alto Unit 42 threat research', ['unit42','palo alto','threat research'], 2],
  ['cyb-talos', 'GN: Cisco Talos', 'Cisco Talos threat intelligence malware', ['talos','cisco','malware'], 2],
  ['cyb-proofpoint', 'GN: Proofpoint', 'Proofpoint threat research phishing', ['proofpoint','phishing','email security'], 3],
  ['cyb-sentinel-labs', 'GN: SentinelLabs', 'SentinelOne SentinelLabs threat research', ['sentinelone','edr','threat'], 3],
  // Companies
  ['cyb-crowdstrike', 'GN: CrowdStrike', 'CrowdStrike cybersecurity threat detection', ['crowdstrike','edr','threat'], 2],
  ['cyb-palo-alto', 'GN: Palo Alto', 'Palo Alto Networks cybersecurity firewall', ['palo alto','firewall','sase'], 2],
  ['cyb-fortinet', 'GN: Fortinet', 'Fortinet cybersecurity firewall FortiGate', ['fortinet','fortigate','firewall'], 2],
  ['cyb-sentinelone', 'GN: SentinelOne', 'SentinelOne cybersecurity endpoint protection', ['sentinelone','endpoint','xdr'], 2],
  ['cyb-zscaler', 'GN: Zscaler', 'Zscaler zero trust cloud security', ['zscaler','zero trust','sase'], 3],
  ['cyb-cloudflare', 'GN: Cloudflare Sec', 'Cloudflare security DDoS WAF protection', ['cloudflare','ddos','waf'], 2],
  ['cyb-okta', 'GN: Okta', 'Okta identity security breach authentication', ['okta','identity','iam'], 3],
  ['cyb-wiz', 'GN: Wiz', 'Wiz cloud security CNAPP vulnerability', ['wiz','cloud security','cnapp'], 3],
  ['cyb-snyk', 'GN: Snyk', 'Snyk application security developer vulnerability', ['snyk','appsec','devsecops'], 3],
  ['cyb-rapid7', 'GN: Rapid7', 'Rapid7 cybersecurity vulnerability management', ['rapid7','vulnerability','metasploit'], 3],
  ['cyb-qualys', 'GN: Qualys', 'Qualys vulnerability management cloud security', ['qualys','vulnerability','scanning'], 3],
  ['cyb-tenable', 'GN: Tenable', 'Tenable vulnerability management Nessus', ['tenable','nessus','vulnerability'], 3],
  ['cyb-varonis', 'GN: Varonis', 'Varonis data security insider threat', ['varonis','data security','insider'], 3],
  ['cyb-cyberark', 'GN: CyberArk', 'CyberArk privileged access identity security', ['cyberark','pam','identity'], 3],
  ['cyb-trellix', 'GN: Trellix', 'Trellix XDR cybersecurity threat detection', ['trellix','xdr','detection'], 3],
  ['cyb-abnormal', 'GN: Abnormal', 'Abnormal Security email AI phishing', ['abnormal','email','ai security'], 3],
  // Threat types
  ['cyb-ransomware', 'GN: Ransomware', 'ransomware attack data breach extortion', ['ransomware','extortion','data breach'], 2],
  ['cyb-apt-china', 'GN: APT China', 'Chinese APT hacking cyber espionage', ['china','apt','espionage'], 2, 'global'],
  ['cyb-apt-russia', 'GN: APT Russia', 'Russian APT hacking cyber operations', ['russia','apt','operations'], 2, 'global'],
  ['cyb-apt-iran', 'GN: APT Iran', 'Iranian cyber attacks hacking operations', ['iran','apt','operations'], 3, 'global'],
  ['cyb-apt-nk', 'GN: APT North Korea', 'North Korea hacking crypto Lazarus', ['north korea','lazarus','crypto theft'], 3, 'global'],
  ['cyb-zero-day', 'GN: Zero-Day', 'zero-day vulnerability exploit CVE critical', ['zero-day','exploit','cve'], 1],
  ['cyb-supply-chain-attack', 'GN: Supply Chain Attack', 'software supply chain attack compromise', ['supply chain','attack','compromise'], 2],
  ['cyb-critical-infra', 'GN: Critical Infra', 'critical infrastructure cyber attack ICS SCADA', ['ics','scada','critical infrastructure'], 2],
  ['cyb-healthcare-breach', 'GN: Healthcare Breach', 'healthcare data breach HIPAA hospital', ['healthcare','hipaa','data breach'], 3],
  ['cyb-financial-cyber', 'GN: Financial Cyber', 'bank financial cybersecurity fraud', ['banking','fraud','financial'], 3],
  // Compliance & frameworks
  ['cyb-cmmc', 'GN: CMMC', 'CMMC cybersecurity maturity model certification', ['cmmc','dod','compliance'], 3],
  ['cyb-fedramp', 'GN: FedRAMP', 'FedRAMP cloud security authorization government', ['fedramp','cloud','government'], 3],
  ['cyb-nist-framework', 'GN: NIST Framework', 'NIST cybersecurity framework compliance', ['nist','framework','compliance'], 2],
  ['cyb-soc2', 'GN: SOC 2', 'SOC 2 compliance audit cybersecurity', ['soc2','audit','compliance'], 4],
  ['cyb-gdpr-sec', 'GN: GDPR Security', 'GDPR data protection security breach fine', ['gdpr','data protection','fine'], 3, 'global'],
  // Technologies
  ['cyb-zero-trust', 'GN: Zero Trust', 'zero trust architecture cybersecurity SASE', ['zero trust','sase','architecture'], 2],
  ['cyb-siem-soar', 'GN: SIEM SOAR', 'SIEM SOAR security operations automation', ['siem','soar','secops'], 3],
  ['cyb-deception', 'GN: Deception Tech', 'deception technology honeypot cyber defense', ['deception','honeypot','defense'], 4],
  ['cyb-threat-hunting', 'GN: Threat Hunting', 'threat hunting proactive cybersecurity detection', ['threat hunting','detection','proactive'], 3],
  ['cyb-pentesting', 'GN: Pentesting', 'penetration testing red team cybersecurity', ['pentesting','red team','offensive'], 3],
  ['cyb-ot-security', 'GN: OT Security', 'OT operational technology security ICS', ['ot security','ics','industrial'], 2],
  ['cyb-cloud-sec', 'GN: Cloud Security', 'cloud security AWS Azure GCP misconfiguration', ['cloud','misconfiguration','cspm'], 2],
  ['cyb-container-sec', 'GN: Container Sec', 'container security Kubernetes Docker vulnerability', ['containers','kubernetes','docker'], 3],
  ['cyb-api-sec', 'GN: API Security', 'API security vulnerability OWASP', ['api','owasp','web security'], 3],
  ['cyb-ai-sec', 'GN: AI Security', 'AI security machine learning adversarial attacks', ['ai security','adversarial','ml'], 3],
  ['cyb-quantum-crypto', 'GN: Quantum Crypto', 'post-quantum cryptography encryption NIST', ['quantum','cryptography','pqc'], 3],
  ['cyb-browser-sec', 'GN: Browser Sec', 'browser security Chrome Firefox vulnerability', ['browser','chrome','vulnerability'], 3],
  ['cyb-mobile-sec', 'GN: Mobile Sec', 'mobile security Android iOS malware', ['mobile','android','ios'], 3],
  ['cyb-dns-sec', 'GN: DNS Security', 'DNS security DDoS BGP hijacking', ['dns','ddos','bgp'], 4],
  ['cyb-iot-sec', 'GN: IoT Security', 'IoT security vulnerability device firmware', ['iot','firmware','embedded'], 3],
  ['cyb-dark-web', 'GN: Dark Web', 'dark web marketplace cybercrime data leak', ['dark web','cybercrime','data leak'], 3],
  ['cyb-election-sec', 'GN: Election Sec', 'election security disinformation cyber threats', ['election','disinformation','influence'], 3],
  ['cyb-sec-funding', 'GN: Cyber Funding', 'cybersecurity startup funding venture capital', ['funding','startup','venture capital'], 3],
  ['cyb-msft-sec', 'GN: Microsoft Sec', 'Microsoft security Patch Tuesday vulnerability', ['microsoft','patch tuesday','windows'], 2],
  ['cyb-google-sec', 'GN: Google Sec', 'Google Project Zero Chrome security vulnerability', ['google','project zero','chrome'], 2],
  ['cyb-apple-sec', 'GN: Apple Sec', 'Apple security iOS macOS vulnerability update', ['apple','ios','macos'], 2],
];

// ═══════════════════════════════════════════════════════════════════════════════
// AI/ML & EMERGING TECH (~300 sources)
// ═══════════════════════════════════════════════════════════════════════════════

const AI_DIRECT: CompactDirect[] = [
  ['ai-mit', 'MIT AI', 'https://news.mit.edu/rss/topic/artificial-intelligence2', ['mit','ai','research'], 1],
  ['ai-techcrunch', 'TechCrunch AI', 'https://techcrunch.com/tag/artificial-intelligence/feed/', ['ai','startups','funding'], 1],
  ['ai-venturebeat', 'VentureBeat', 'https://venturebeat.com/feed/', ['ai','enterprise','transformation'], 1],
  ['ai-wired', 'Wired', 'https://www.wired.com/feed/rss', ['tech','culture','science'], 1],
  ['ai-verge', 'The Verge', 'https://www.theverge.com/rss/index.xml', ['tech','consumer','gadgets'], 1],
  ['ai-ars', 'Ars Technica', 'https://feeds.arstechnica.com/arstechnica/technology-lab', ['tech','science','analysis'], 1],
  ['ai-ieee', 'IEEE Spectrum', 'https://spectrum.ieee.org/feeds/feed.rss', ['engineering','tech','standards'], 1],
  ['ai-arxiv', 'arXiv AI', 'https://arxiv.org/rss/cs.AI', ['research','papers','academic'], 1],
  ['ai-arxiv-ml', 'arXiv ML', 'https://arxiv.org/rss/cs.LG', ['machine learning','research','papers'], 1],
  ['ai-arxiv-cv', 'arXiv CV', 'https://arxiv.org/rss/cs.CV', ['computer vision','research','papers'], 2],
  ['ai-arxiv-cl', 'arXiv CL', 'https://arxiv.org/rss/cs.CL', ['nlp','language','research'], 2],
  ['ai-arxiv-ro', 'arXiv Robotics', 'https://arxiv.org/rss/cs.RO', ['robotics','research','papers'], 2],
  ['ai-hn', 'Hacker News', 'https://news.ycombinator.com/rss', ['tech','startups','discussion'], 2],
  ['ai-zdnet', 'ZDNet', 'https://www.zdnet.com/news/rss.xml', ['tech','enterprise','analysis'], 2],
  ['ai-aibusiness', 'AI Business', 'https://aibusiness.com/feed/', ['ai','enterprise','applications'], 2],
  ['ai-ap-tech', 'AP Tech', 'https://feeds.apnews.com/rss/apf-technology', ['tech','news','breaking'], 1],
  ['ai-bbc-tech', 'BBC Tech', 'https://feeds.bbci.co.uk/news/technology/rss.xml', ['tech','news','uk'], 1],
  ['ai-techradar', 'TechRadar', 'https://www.techradar.com/feeds/articletype/news', ['tech','reviews','consumer'], 2],
  ['ai-robot-report', 'Robot Report', 'https://www.therobotreport.com/feed/', ['robotics','automation','drones'], 2],
  ['ai-automation-world', 'Automation World', 'https://www.automationworld.com/rss.xml', ['automation','manufacturing','industrial'], 2],
];

const AI_GN: CompactGN[] = [
  // Major AI companies
  ['ai-openai', 'GN: OpenAI', 'OpenAI GPT model release technology', ['openai','gpt','chatgpt'], 1],
  ['ai-anthropic', 'GN: Anthropic', 'Anthropic Claude AI safety research', ['anthropic','claude','safety'], 1],
  ['ai-google-ai', 'GN: Google AI', 'Google DeepMind Gemini AI technology', ['google','deepmind','gemini'], 1],
  ['ai-meta-ai', 'GN: Meta AI', 'Meta AI Llama open source research', ['meta','llama','open source'], 1],
  ['ai-microsoft-ai', 'GN: Microsoft AI', 'Microsoft AI Copilot Azure OpenAI', ['microsoft','copilot','azure'], 1],
  ['ai-nvidia-ai', 'GN: NVIDIA AI', 'NVIDIA AI GPU H100 training inference', ['nvidia','gpu','h100','cuda'], 1],
  ['ai-apple-ai', 'GN: Apple AI', 'Apple AI intelligence Siri machine learning', ['apple','siri','on-device'], 2],
  ['ai-amazon-ai', 'GN: Amazon AI', 'Amazon AWS AI Bedrock machine learning', ['amazon','aws','bedrock'], 2],
  ['ai-xai', 'GN: xAI', 'xAI Elon Musk Grok artificial intelligence', ['xai','grok','elon musk'], 2],
  ['ai-mistral', 'GN: Mistral AI', 'Mistral AI open source language model', ['mistral','open source','european'], 2, 'global'],
  ['ai-cohere', 'GN: Cohere', 'Cohere enterprise AI language model', ['cohere','enterprise','nlp'], 3],
  ['ai-huggingface', 'GN: Hugging Face', 'Hugging Face open source AI models', ['hugging face','open source','models'], 2],
  ['ai-stability', 'GN: Stability AI', 'Stability AI Stable Diffusion image generation', ['stability','stable diffusion','image'], 3],
  ['ai-midjourney', 'GN: Midjourney', 'Midjourney AI art image generation', ['midjourney','art','image generation'], 3],
  ['ai-runway', 'GN: Runway', 'Runway AI video generation creative', ['runway','video','creative'], 3],
  ['ai-inflection', 'GN: Inflection', 'Inflection AI personal assistant', ['inflection','personal ai','assistant'], 3],
  ['ai-perplexity', 'GN: Perplexity', 'Perplexity AI search engine answer', ['perplexity','search','answer engine'], 3],
  ['ai-databricks', 'GN: Databricks', 'Databricks AI lakehouse data analytics', ['databricks','lakehouse','data'], 2],
  ['ai-scale-ai', 'GN: Scale AI', 'Scale AI data labeling training defense', ['scale ai','labeling','training data'], 2],
  ['ai-c3ai', 'GN: C3.ai', 'C3.ai enterprise artificial intelligence platform', ['c3ai','enterprise','platform'], 3],
  // AI applications
  ['ai-autonomous-vehicles', 'GN: Autonomous Vehicles', 'autonomous vehicle self-driving car technology', ['autonomous','self-driving','lidar'], 2],
  ['ai-waymo', 'GN: Waymo', 'Waymo autonomous driving robotaxi', ['waymo','robotaxi','autonomous'], 2],
  ['ai-tesla-ai', 'GN: Tesla AI', 'Tesla AI FSD autonomous driving Optimus', ['tesla','fsd','optimus'], 2],
  ['ai-computer-vision', 'GN: Computer Vision', 'computer vision object detection recognition AI', ['computer vision','detection','recognition'], 3],
  ['ai-nlp', 'GN: NLP', 'natural language processing NLP text AI', ['nlp','text','language'], 3],
  ['ai-robotics-ai', 'GN: Robotics AI', 'robotics artificial intelligence humanoid robot', ['robotics','humanoid','automation'], 2],
  ['ai-drug-discovery', 'GN: AI Drug Discovery', 'AI drug discovery pharmaceutical machine learning', ['drug discovery','pharma','biotech'], 3],
  ['ai-medical-ai', 'GN: Medical AI', 'AI medical imaging diagnosis healthcare', ['medical ai','imaging','diagnosis'], 3],
  ['ai-financial-ai', 'GN: Financial AI', 'AI financial trading algorithmic machine learning', ['financial ai','trading','algorithmic'], 3],
  ['ai-manufacturing-ai', 'GN: Manufacturing AI', 'AI manufacturing quality control automation', ['manufacturing','quality','automation'], 3],
  ['ai-climate-ai', 'GN: Climate AI', 'AI climate change weather prediction modeling', ['climate','weather','prediction'], 3],
  // AI policy & regulation
  ['ai-regulation', 'GN: AI Regulation', 'artificial intelligence regulation policy government', ['regulation','policy','government'], 2],
  ['ai-eu-ai-act', 'GN: EU AI Act', 'European Union AI Act regulation compliance', ['eu','ai act','regulation'], 2, 'global'],
  ['ai-executive-order', 'GN: AI Executive Order', 'AI executive order White House policy', ['executive order','white house','policy'], 2],
  ['ai-safety', 'GN: AI Safety', 'AI safety alignment existential risk', ['safety','alignment','risk'], 2],
  ['ai-ethics', 'GN: AI Ethics', 'AI ethics bias fairness responsible', ['ethics','bias','fairness'], 3],
  ['ai-copyright-ai', 'GN: AI Copyright', 'AI copyright intellectual property training data', ['copyright','ip','training data'], 3],
  // AI hardware
  ['ai-nvidia-gpu', 'GN: NVIDIA GPU', 'NVIDIA GPU H100 B100 data center AI', ['nvidia','gpu','data center'], 1],
  ['ai-amd-ai', 'GN: AMD AI', 'AMD AI GPU MI300 data center Instinct', ['amd','mi300','instinct'], 2],
  ['ai-intel-ai', 'GN: Intel AI', 'Intel AI Gaudi accelerator Habana', ['intel','gaudi','habana'], 2],
  ['ai-tpu', 'GN: Google TPU', 'Google TPU tensor processing unit AI', ['google','tpu','tensor'], 2],
  ['ai-custom-silicon', 'GN: Custom AI Silicon', 'custom AI chip ASIC accelerator startup', ['custom silicon','asic','accelerator'], 3],
  ['ai-cerebras', 'GN: Cerebras', 'Cerebras wafer-scale AI chip training', ['cerebras','wafer','training'], 3],
  ['ai-groq', 'GN: Groq', 'Groq inference chip LPU technology', ['groq','inference','lpu'], 3],
  ['ai-sambanova', 'GN: SambaNova', 'SambaNova Systems AI chip enterprise', ['sambanova','chip','enterprise'], 3],
  // Emerging tech
  ['ai-quantum', 'GN: Quantum Computing', 'quantum computing qubit IBM Google', ['quantum','qubit','computing'], 2],
  ['ai-quantum-ibm', 'GN: IBM Quantum', 'IBM quantum computing processor technology', ['ibm','quantum','processor'], 3],
  ['ai-quantum-google', 'GN: Google Quantum', 'Google quantum computing supremacy Willow', ['google','quantum','willow'], 3],
  ['ai-ionq', 'GN: IonQ', 'IonQ quantum computing trapped ion', ['ionq','quantum','trapped ion'], 3],
  ['ai-blockchain', 'GN: Blockchain', 'blockchain technology enterprise distributed ledger', ['blockchain','distributed ledger','web3'], 3],
  ['ai-iot', 'GN: IoT', 'internet of things IoT sensors connected devices', ['iot','sensors','connected'], 3],
  ['ai-ar-vr', 'GN: AR VR', 'augmented reality virtual reality metaverse headset', ['ar','vr','metaverse'], 3],
  ['ai-5g-6g', 'GN: 5G 6G', '5G 6G network technology telecom', ['5g','6g','telecom'], 3],
  ['ai-edge-computing', 'GN: Edge Computing', 'edge computing AI inference IoT', ['edge','computing','inference'], 3],
  ['ai-digital-twin', 'GN: Digital Twin', 'digital twin simulation industrial technology', ['digital twin','simulation','industrial'], 3],
  ['ai-generative', 'GN: Generative AI', 'generative AI content creation enterprise', ['generative','content creation','enterprise'], 2],
  ['ai-agents', 'GN: AI Agents', 'AI agents autonomous software automation', ['ai agents','autonomous','automation'], 2],
  ['ai-multimodal', 'GN: Multimodal AI', 'multimodal AI vision language model', ['multimodal','vision','language'], 3],
  ['ai-rag', 'GN: RAG', 'retrieval augmented generation RAG enterprise AI', ['rag','retrieval','enterprise'], 3],
  ['ai-fine-tuning', 'GN: Fine-Tuning', 'fine-tuning AI model customization training', ['fine-tuning','customization','training'], 4],
  ['ai-open-source-ai', 'GN: Open Source AI', 'open source AI model weights community', ['open source','community','weights'], 3],
  ['ai-small-language', 'GN: Small LLMs', 'small language model on-device edge AI', ['slm','on-device','edge'], 3],
  ['ai-ai-coding', 'GN: AI Coding', 'AI coding assistant GitHub Copilot Cursor', ['ai coding','copilot','cursor'], 2],
  ['ai-voice-ai', 'GN: Voice AI', 'AI voice cloning text-to-speech synthesis', ['voice','tts','speech'], 3],
  ['ai-ai-video', 'GN: AI Video', 'AI video generation Sora synthesis', ['video','sora','generation'], 3],
  ['ai-ai-music', 'GN: AI Music', 'AI music generation Suno composition', ['music','suno','generation'], 4],
  ['ai-neuromorphic', 'GN: Neuromorphic', 'neuromorphic computing brain-inspired chip', ['neuromorphic','brain-inspired','computing'], 4],
  ['ai-photonics', 'GN: Photonic AI', 'photonic computing optical AI chip', ['photonic','optical','computing'], 4],
  ['ai-foundation', 'GN: Foundation Models', 'foundation model large language model benchmark', ['foundation','llm','benchmark'], 2],
  ['ai-inference-opt', 'GN: Inference Opt', 'AI inference optimization quantization deployment', ['inference','quantization','deployment'], 3],
  ['ai-synthetic-data', 'GN: Synthetic Data', 'synthetic data generation AI training', ['synthetic data','generation','training'], 3],
  ['ai-federated', 'GN: Federated Learning', 'federated learning privacy AI distributed', ['federated','privacy','distributed'], 4],
  ['ai-reinforcement', 'GN: Reinforcement', 'reinforcement learning RLHF reward model', ['rlhf','reinforcement','reward'], 3],
];

// ═══════════════════════════════════════════════════════════════════════════════
// ENTERPRISE TECHNOLOGY (~200 sources)
// ═══════════════════════════════════════════════════════════════════════════════

const ENTERPRISE_DIRECT: CompactDirect[] = [
  ['ent-fedscoop', 'FedScoop', 'https://fedscoop.com/feed/', ['federal','it','government'], 2],
  ['ent-nextgov', 'Nextgov', 'https://www.nextgov.com/rss/all/', ['government','it','digital'], 2],
  ['ent-govexec', 'GovExec', 'https://www.govexec.com/rss/all/', ['government','management','policy'], 2],
  ['ent-govcon-wire', 'GovCon Wire', 'https://www.govconwire.com/feed/', ['govcon','contracts','awards'], 2],
  ['ent-fed-news', 'Fed News Network', 'https://federalnewsnetwork.com/feed/', ['federal','agencies','policy'], 2],
  ['ent-meritalk', 'MeriTalk', 'https://www.meritalk.com/feed/', ['government','it','cyber'], 2],
  ['ent-fcw', 'FCW', 'https://fcw.com/rss/', ['federal','computing','government'], 2],
  ['ent-industry-week', 'IndustryWeek', 'https://www.industryweek.com/rss', ['manufacturing','industry','operations'], 2],
];

const ENTERPRISE_GN: CompactGN[] = [
  // Cloud providers
  ['ent-aws', 'GN: AWS', 'Amazon Web Services AWS cloud launch service', ['aws','cloud','amazon'], 1],
  ['ent-azure', 'GN: Azure', 'Microsoft Azure cloud enterprise service', ['azure','microsoft','cloud'], 1],
  ['ent-gcp', 'GN: Google Cloud', 'Google Cloud Platform GCP enterprise', ['gcp','google','cloud'], 1],
  ['ent-oracle-cloud', 'GN: Oracle Cloud', 'Oracle Cloud Infrastructure OCI enterprise', ['oracle','oci','cloud'], 2],
  ['ent-ibm-cloud', 'GN: IBM Cloud', 'IBM Cloud hybrid enterprise technology', ['ibm','hybrid cloud','enterprise'], 2],
  // SaaS leaders
  ['ent-salesforce', 'GN: Salesforce', 'Salesforce CRM enterprise cloud AI', ['salesforce','crm','cloud'], 1],
  ['ent-servicenow', 'GN: ServiceNow', 'ServiceNow workflow automation enterprise', ['servicenow','workflow','automation'], 2],
  ['ent-workday', 'GN: Workday', 'Workday HCM finance enterprise cloud', ['workday','hcm','finance'], 2],
  ['ent-datadog', 'GN: Datadog', 'Datadog observability monitoring cloud', ['datadog','observability','monitoring'], 2],
  ['ent-snowflake', 'GN: Snowflake', 'Snowflake data cloud warehouse analytics', ['snowflake','data cloud','analytics'], 2],
  ['ent-splunk', 'GN: Splunk', 'Splunk observability SIEM security data', ['splunk','siem','observability'], 2],
  ['ent-mongo', 'GN: MongoDB', 'MongoDB database Atlas enterprise', ['mongodb','atlas','database'], 3],
  ['ent-elastic', 'GN: Elastic', 'Elastic search observability security', ['elastic','search','observability'], 3],
  ['ent-confluent', 'GN: Confluent', 'Confluent Kafka data streaming enterprise', ['confluent','kafka','streaming'], 3],
  ['ent-hashicorp', 'GN: HashiCorp', 'HashiCorp Terraform Vault infrastructure', ['hashicorp','terraform','vault'], 3],
  ['ent-twilio', 'GN: Twilio', 'Twilio communications API enterprise', ['twilio','api','communications'], 3],
  ['ent-atlassian', 'GN: Atlassian', 'Atlassian Jira Confluence enterprise tools', ['atlassian','jira','confluence'], 2],
  // ERP
  ['ent-sap', 'GN: SAP', 'SAP ERP S/4HANA enterprise cloud', ['sap','erp','s4hana'], 1],
  ['ent-oracle-erp', 'GN: Oracle ERP', 'Oracle ERP Cloud Fusion enterprise', ['oracle','erp','fusion'], 2],
  ['ent-dynamics', 'GN: Dynamics 365', 'Microsoft Dynamics 365 ERP CRM', ['dynamics','erp','crm'], 2],
  // DevOps
  ['ent-github', 'GN: GitHub', 'GitHub developer platform Copilot enterprise', ['github','developer','copilot'], 2],
  ['ent-gitlab', 'GN: GitLab', 'GitLab DevSecOps platform enterprise', ['gitlab','devsecops','cicd'], 3],
  ['ent-docker', 'GN: Docker', 'Docker containers platform enterprise', ['docker','containers','platform'], 3],
  ['ent-kubernetes', 'GN: Kubernetes', 'Kubernetes container orchestration enterprise', ['kubernetes','k8s','orchestration'], 2],
  ['ent-redhat', 'GN: Red Hat', 'Red Hat OpenShift enterprise Linux IBM', ['red hat','openshift','linux'], 2],
  ['ent-vmware', 'GN: VMware', 'VMware Broadcom virtualization cloud', ['vmware','broadcom','virtualization'], 2],
  // Digital transformation
  ['ent-digital-transform', 'GN: Digital Transform', 'digital transformation enterprise technology strategy', ['digital transformation','strategy','enterprise'], 2],
  ['ent-low-code', 'GN: Low-Code', 'low-code no-code platform enterprise automation', ['low-code','no-code','automation'], 3],
  ['ent-rpa', 'GN: RPA', 'robotic process automation UiPath enterprise', ['rpa','uipath','automation'], 3],
  ['ent-enterprise-ai', 'GN: Enterprise AI', 'enterprise AI deployment contract adoption', ['enterprise ai','deployment','adoption'], 2],
  // GovTech
  ['ent-sam-gov', 'GN: SAM.gov', 'SAM.gov contract opportunity solicitation award', ['sam.gov','contract','solicitation'], 3],
  ['ent-sbir', 'GN: SBIR', 'SBIR STTR small business innovation research grant', ['sbir','sttr','innovation'], 3],
  ['ent-usaspending', 'GN: USASpending', 'USASpending federal contract spending award', ['usaspending','spending','federal'], 3],
  ['ent-govcon', 'GN: GovCon', 'government contracting IDIQ task order award', ['govcon','idiq','task order'], 3],
  ['ent-dhs-contract', 'GN: DHS Contract', 'DHS homeland security contract technology', ['dhs','homeland','contract'], 3],
  ['ent-it-modernization', 'GN: IT Modernization', 'federal IT modernization technology fund', ['it modernization','tmf','federal'], 3],
  ['ent-cloud-gov', 'GN: Cloud Gov', 'federal government cloud migration FedRAMP', ['cloud','fedramp','migration'], 3],
  // Additional enterprise
  ['ent-dell', 'GN: Dell Tech', 'Dell Technologies enterprise infrastructure server', ['dell','infrastructure','server'], 2],
  ['ent-hpe', 'GN: HPE', 'Hewlett Packard Enterprise GreenLake hybrid', ['hpe','greenlake','hybrid'], 2],
  ['ent-cisco', 'GN: Cisco', 'Cisco networking enterprise technology', ['cisco','networking','enterprise'], 2],
  ['ent-ibm-ent', 'GN: IBM Enterprise', 'IBM enterprise technology AI consulting', ['ibm','consulting','enterprise'], 2],
  ['ent-accenture', 'GN: Accenture', 'Accenture consulting technology transformation', ['accenture','consulting','transformation'], 2],
  ['ent-deloitte-tech', 'GN: Deloitte Tech', 'Deloitte technology consulting digital', ['deloitte','consulting','digital'], 2],
  ['ent-gartner', 'GN: Gartner', 'Gartner technology research forecast report', ['gartner','research','forecast'], 1],
  ['ent-forrester', 'GN: Forrester', 'Forrester Research technology enterprise analysis', ['forrester','research','analysis'], 1],
  ['ent-idc', 'GN: IDC', 'IDC International Data Corporation technology forecast', ['idc','forecast','market'], 2],
  // Data & analytics
  ['ent-palantir-ent', 'GN: Palantir Enterprise', 'Palantir enterprise data analytics platform', ['palantir','data','analytics'], 2],
  ['ent-tableau', 'GN: Tableau', 'Tableau Salesforce data visualization analytics', ['tableau','visualization','analytics'], 3],
  ['ent-power-bi', 'GN: Power BI', 'Power BI Microsoft business intelligence analytics', ['power bi','bi','analytics'], 3],
  ['ent-dbt', 'GN: dbt', 'dbt data transformation analytics engineering', ['dbt','data','analytics engineering'], 4],
];

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPLY CHAIN & LOGISTICS (~150 sources)
// ═══════════════════════════════════════════════════════════════════════════════

const SUPPLY_DIRECT: CompactDirect[] = [
  ['sc-supply-chain-dive', 'Supply Chain Dive', 'https://www.supplychaindive.com/feeds/news/', ['supply chain','logistics','procurement'], 1],
  ['sc-brain', 'SC Brain', 'https://www.supplychainbrain.com/rss.xml', ['supply chain','logistics','planning'], 2],
  ['sc-freightwaves', 'FreightWaves', 'https://www.freightwaves.com/news/feed/', ['freight','trucking','shipping'], 1],
  ['sc-dc-velocity', 'DC Velocity', 'https://dcvelocity.com/feed/', ['distribution','warehousing','logistics'], 2],
  ['sc-transport-topics', 'Transport Topics', 'https://www.ttnews.com/articles/feed', ['trucking','transport','freight'], 2],
  ['sc-logistics-mgmt', 'Logistics Mgmt', 'https://www.logisticsmgmt.com/rss', ['logistics','warehousing','3pl'], 2],
];

const SUPPLY_GN: CompactGN[] = [
  // Shipping & freight
  ['sc-maersk', 'GN: Maersk', 'Maersk shipping container freight logistics', ['maersk','shipping','container'], 2, 'global'],
  ['sc-fedex', 'GN: FedEx', 'FedEx shipping logistics technology', ['fedex','shipping','delivery'], 2],
  ['sc-ups', 'GN: UPS', 'UPS shipping logistics technology automation', ['ups','shipping','automation'], 2],
  ['sc-dhl', 'GN: DHL', 'DHL logistics supply chain global shipping', ['dhl','logistics','global'], 2, 'global'],
  ['sc-xpo', 'GN: XPO', 'XPO Logistics trucking freight transportation', ['xpo','trucking','freight'], 3],
  ['sc-ch-robinson', 'GN: C.H. Robinson', 'C.H. Robinson freight brokerage logistics', ['ch robinson','brokerage','freight'], 3],
  ['sc-jb-hunt', 'GN: J.B. Hunt', 'J.B. Hunt trucking intermodal logistics', ['jb hunt','trucking','intermodal'], 3],
  // Ports & customs
  ['sc-cbp-trade', 'GN: CBP Trade', 'CBP customs border protection trade import', ['cbp','customs','trade'], 2],
  ['sc-port-of-entry', 'GN: Ports of Entry', 'US Mexico port of entry commercial trade', ['port of entry','commercial','bridge'], 3, 'el-paso'],
  ['sc-port-la', 'GN: Port LA/LB', 'Port Los Angeles Long Beach shipping congestion', ['port la','shipping','congestion'], 3],
  ['sc-port-houston', 'GN: Port Houston', 'Port Houston shipping container trade', ['port houston','shipping','texas'], 3, 'texas'],
  // Cross-border trade
  ['sc-usmca', 'GN: USMCA', 'USMCA trade agreement Mexico Canada commerce', ['usmca','trade','agreement'], 2],
  ['sc-maquiladora', 'GN: Maquiladoras', 'maquiladora manufacturing Mexico Juarez border', ['maquiladora','manufacturing','juarez'], 2, 'el-paso'],
  ['sc-nearshoring', 'GN: Nearshoring', 'nearshoring Mexico manufacturing supply chain', ['nearshoring','mexico','reshoring'], 2],
  ['sc-juarez-mfg', 'GN: Juarez Mfg', 'Ciudad Juarez manufacturing technology industry', ['juarez','manufacturing','industry'], 3, 'el-paso'],
  ['sc-tx-border-trade', 'GN: TX Border Trade', 'Texas Mexico border trade import export USMCA', ['texas','mexico','border trade'], 2, 'texas'],
  ['sc-ep-port', 'GN: EP Port', 'El Paso port of entry bridge commercial trade', ['el paso','port','bridge'], 3, 'el-paso'],
  ['sc-ep-airport', 'GN: EP Airport', 'El Paso International Airport cargo freight', ['el paso','airport','cargo'], 3, 'el-paso'],
  // Supply chain tech
  ['sc-flexport', 'GN: Flexport', 'Flexport freight forwarding technology', ['flexport','freight','technology'], 3],
  ['sc-project44', 'GN: project44', 'project44 supply chain visibility tracking', ['project44','visibility','tracking'], 3],
  ['sc-fourkites', 'GN: FourKites', 'FourKites supply chain visibility logistics', ['fourkites','visibility','logistics'], 3],
  ['sc-e2open', 'GN: E2open', 'E2open supply chain management platform', ['e2open','supply chain','platform'], 4],
  ['sc-kinaxis', 'GN: Kinaxis', 'Kinaxis supply chain planning software', ['kinaxis','planning','software'], 4],
  // Semiconductors
  ['sc-tsmc', 'GN: TSMC', 'TSMC semiconductor chip manufacturing foundry', ['tsmc','semiconductor','foundry'], 1, 'global'],
  ['sc-intel-fab', 'GN: Intel Foundry', 'Intel semiconductor foundry manufacturing chip', ['intel','foundry','manufacturing'], 2],
  ['sc-samsung-semi', 'GN: Samsung Semi', 'Samsung semiconductor chip memory HBM', ['samsung','memory','hbm'], 2, 'global'],
  ['sc-chip-shortage', 'GN: Chip Supply', 'semiconductor supply chain shortage chip', ['semiconductor','shortage','chip'], 2],
  ['sc-chips-act', 'GN: CHIPS Act', 'CHIPS Act semiconductor manufacturing subsidy', ['chips act','subsidy','manufacturing'], 2],
  ['sc-asml', 'GN: ASML', 'ASML lithography EUV semiconductor equipment', ['asml','euv','lithography'], 2, 'global'],
  ['sc-micron', 'GN: Micron', 'Micron memory chip DRAM HBM technology', ['micron','dram','hbm'], 2],
  ['sc-qualcomm', 'GN: Qualcomm', 'Qualcomm chip Snapdragon mobile 5G', ['qualcomm','snapdragon','5g'], 2],
  ['sc-broadcom', 'GN: Broadcom', 'Broadcom semiconductor enterprise VMware', ['broadcom','semiconductor','vmware'], 2],
  ['sc-ti', 'GN: Texas Instruments', 'Texas Instruments semiconductor analog chip', ['ti','analog','semiconductor'], 3, 'texas'],
  // Raw materials & commodities
  ['sc-rare-earth', 'GN: Rare Earth', 'rare earth minerals supply chain China', ['rare earth','minerals','china'], 3, 'global'],
  ['sc-lithium', 'GN: Lithium', 'lithium battery supply chain mining', ['lithium','battery','mining'], 3, 'global'],
  ['sc-steel', 'GN: Steel', 'steel manufacturing supply chain tariff', ['steel','manufacturing','tariff'], 3],
  ['sc-copper', 'GN: Copper', 'copper supply demand mining electric', ['copper','mining','electric'], 4, 'global'],
  // Manufacturing
  ['sc-smart-mfg', 'GN: Smart Manufacturing', 'smart manufacturing Industry 4.0 automation', ['smart manufacturing','industry 4.0','automation'], 3],
  ['sc-additive', 'GN: 3D Printing', '3D printing additive manufacturing aerospace', ['3d printing','additive','aerospace'], 3],
  ['sc-reshoring', 'GN: Reshoring', 'reshoring manufacturing US supply chain', ['reshoring','manufacturing','us'], 3],
  ['sc-warehouse-auto', 'GN: Warehouse Auto', 'warehouse automation robotics logistics', ['warehouse','automation','robotics'], 3],
  ['sc-last-mile', 'GN: Last Mile', 'last mile delivery logistics technology drone', ['last mile','delivery','drone'], 3],
  ['sc-autonomous-truck', 'GN: Autonomous Trucks', 'autonomous trucking self-driving freight', ['autonomous','trucking','self-driving'], 3],
  ['sc-cold-chain', 'GN: Cold Chain', 'cold chain logistics pharmaceutical temperature', ['cold chain','pharmaceutical','temperature'], 4],
];

// ═══════════════════════════════════════════════════════════════════════════════
// ENERGY & SUSTAINABILITY (~150 sources)
// ═══════════════════════════════════════════════════════════════════════════════

const ENERGY_DIRECT: CompactDirect[] = [
  ['en-power-mag', 'Power Mag', 'https://www.powermag.com/feed/', ['power','generation','grid'], 2],
  ['en-utility-dive', 'Utility Dive', 'https://www.utilitydive.com/feeds/news/', ['utilities','grid','regulation'], 1],
  ['en-energy-dive', 'Energy Dive', 'https://www.energydive.com/feeds/news/', ['energy','policy','markets'], 1],
  ['en-solar-power', 'Solar Power World', 'https://www.solarpowerworldonline.com/feed/', ['solar','renewable','installation'], 2],
  ['en-renewables-now', 'Renewables Now', 'https://renewablesnow.com/news/feed/', ['renewables','wind','solar'], 2],
  ['en-doe', 'DOE', 'https://www.energy.gov/rss.xml', ['doe','policy','research'], 1],
  ['en-waterworld', 'WaterWorld', 'https://www.waterworld.com/rss.xml', ['water','treatment','infrastructure'], 2],
  ['en-water-digest', 'Water Digest', 'https://www.waterandwastesdigest.com/rss.xml', ['water','waste','treatment'], 3],
  ['en-water-online', 'Water Online', 'https://www.wateronline.com/rss', ['water','technology','treatment'], 3],
];

const ENERGY_GN: CompactGN[] = [
  // Oil & gas
  ['en-permian-basin', 'GN: Permian Basin', 'Permian Basin oil gas production Texas', ['permian','oil','gas'], 2, 'texas'],
  ['en-ercot', 'GN: ERCOT', 'ERCOT Texas grid electricity power', ['ercot','texas grid','electricity'], 2, 'texas'],
  ['en-oil-price', 'GN: Oil Price', 'oil price crude WTI Brent production', ['oil','crude','wti'], 2, 'global'],
  ['en-natural-gas', 'GN: Natural Gas', 'natural gas LNG production export', ['natural gas','lng','export'], 2],
  ['en-pipeline', 'GN: Pipelines', 'pipeline oil gas infrastructure construction', ['pipeline','infrastructure','construction'], 3],
  ['en-exxon', 'GN: ExxonMobil', 'ExxonMobil energy oil production Permian', ['exxon','oil','permian'], 2],
  ['en-chevron', 'GN: Chevron', 'Chevron energy oil production technology', ['chevron','oil','production'], 2],
  ['en-conocophillips', 'GN: ConocoPhillips', 'ConocoPhillips oil gas production', ['conocophillips','oil','gas'], 3],
  // Renewables
  ['en-solar', 'GN: Solar Energy', 'solar energy panel installation utility scale', ['solar','panels','utility scale'], 2],
  ['en-wind', 'GN: Wind Energy', 'wind energy turbine offshore onshore', ['wind','turbine','offshore'], 2],
  ['en-battery', 'GN: Battery Storage', 'battery storage energy lithium grid', ['battery','storage','lithium'], 2],
  ['en-ev', 'GN: EV', 'electric vehicle EV charging infrastructure', ['ev','charging','electric vehicle'], 2],
  ['en-ev-tesla', 'GN: Tesla Energy', 'Tesla energy Powerwall Megapack solar', ['tesla','megapack','solar'], 2],
  ['en-hydrogen', 'GN: Hydrogen', 'hydrogen green blue fuel cell energy', ['hydrogen','fuel cell','green'], 3],
  ['en-nuclear', 'GN: Nuclear', 'nuclear energy SMR power plant', ['nuclear','smr','power plant'], 2],
  ['en-nuclear-fusion', 'GN: Fusion', 'nuclear fusion energy technology startup', ['fusion','energy','tokamak'], 3],
  ['en-geothermal', 'GN: Geothermal', 'geothermal energy technology enhanced', ['geothermal','energy','enhanced'], 4],
  // Water tech
  ['en-desal', 'GN: Desalination', 'desalination water technology membrane', ['desalination','membrane','water'], 3],
  ['en-ep-water', 'GN: EP Water', 'El Paso water utility EPWU technology', ['el paso','epwu','water'], 3, 'el-paso'],
  ['en-water-reuse', 'GN: Water Reuse', 'water reuse recycling treatment technology', ['water reuse','recycling','treatment'], 3],
  ['en-drought', 'GN: Drought Tech', 'drought water conservation technology management', ['drought','conservation','management'], 3],
  // Grid & utilities
  ['en-grid-mod', 'GN: Grid Modernization', 'grid modernization smart grid technology', ['grid','smart grid','modernization'], 2],
  ['en-microgrids', 'GN: Microgrids', 'microgrid distributed energy resources', ['microgrid','distributed','energy'], 3],
  ['en-energy-storage', 'GN: Energy Storage', 'energy storage technology grid battery', ['energy storage','grid','battery'], 2],
  ['en-transmission', 'GN: Transmission', 'electric transmission line infrastructure grid', ['transmission','line','infrastructure'], 3],
  // Carbon & climate
  ['en-carbon-capture', 'GN: Carbon Capture', 'carbon capture CCS CCUS technology', ['carbon capture','ccs','ccus'], 3],
  ['en-climate-tech', 'GN: Climate Tech', 'climate technology startup funding', ['climate tech','startup','funding'], 3],
  ['en-esg', 'GN: ESG', 'ESG sustainability reporting corporate', ['esg','sustainability','reporting'], 3],
  ['en-carbon-credit', 'GN: Carbon Credit', 'carbon credit market offset trading', ['carbon credit','offset','trading'], 4, 'global'],
  // Texas & EP energy
  ['en-tx-energy', 'GN: TX Energy', 'Texas energy grid ERCOT renewable solar wind', ['texas','ercot','renewable'], 2, 'texas'],
  ['en-tx-solar', 'GN: TX Solar', 'Texas solar energy farm installation West', ['texas','solar','farm'], 3, 'texas'],
  ['en-tx-wind', 'GN: TX Wind', 'Texas wind energy turbine production West', ['texas','wind','turbine'], 3, 'texas'],
  ['en-ep-sun-metro', 'GN: EP Sun Metro', 'El Paso Sun Metro electric bus transit', ['el paso','sun metro','electric bus'], 4, 'el-paso'],
  // Energy companies
  ['en-nextera', 'GN: NextEra', 'NextEra Energy renewable wind solar', ['nextera','renewable','utility'], 3],
  ['en-duke', 'GN: Duke Energy', 'Duke Energy utility grid technology', ['duke','utility','grid'], 3],
  ['en-aep', 'GN: AEP', 'American Electric Power grid technology', ['aep','grid','electric'], 3],
  ['en-ep-electric', 'GN: EP Electric', 'El Paso Electric utility grid solar', ['el paso electric','utility','solar'], 3, 'el-paso'],
  // Energy tech
  ['en-smart-meter', 'GN: Smart Meters', 'smart meter AMI utility technology', ['smart meter','ami','utility'], 4],
  ['en-vpp', 'GN: Virtual Power', 'virtual power plant VPP distributed energy', ['vpp','distributed','virtual'], 4],
  ['en-energy-ai', 'GN: Energy AI', 'artificial intelligence energy grid optimization', ['ai','energy','optimization'], 3],
  ['en-green-hydrogen', 'GN: Green Hydrogen', 'green hydrogen electrolyzer production', ['green hydrogen','electrolyzer','production'], 3],
];

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCE & MARKETS (~150 sources)
// ═══════════════════════════════════════════════════════════════════════════════

const FINANCE_DIRECT: CompactDirect[] = [
  ['fin-sec-8k', 'SEC 8-K', 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&dateb=&owner=include&count=20&output=atom', ['sec','filings','corporate'], 1],
];

const FINANCE_GN: CompactGN[] = [
  // Major financial news
  ['fin-bloomberg', 'GN: Bloomberg', 'Bloomberg financial markets technology', ['bloomberg','markets','finance'], 1, 'global'],
  ['fin-reuters', 'GN: Reuters', 'Reuters financial news markets economy', ['reuters','markets','economy'], 1, 'global'],
  ['fin-wsj', 'GN: WSJ', 'Wall Street Journal markets finance business', ['wsj','markets','business'], 1],
  ['fin-ft', 'GN: FT', 'Financial Times markets economy global', ['ft','markets','economy'], 1, 'global'],
  ['fin-cnbc', 'GN: CNBC', 'CNBC markets stocks technology business', ['cnbc','stocks','business'], 1],
  ['fin-barrons', 'GN: Barrons', 'Barrons investing stocks market analysis', ['barrons','investing','analysis'], 2],
  // FinTech
  ['fin-stripe', 'GN: Stripe', 'Stripe payments fintech technology', ['stripe','payments','fintech'], 2],
  ['fin-square-block', 'GN: Block', 'Block Square Cash App fintech payments', ['block','square','cash app'], 2],
  ['fin-plaid', 'GN: Plaid', 'Plaid fintech banking API data', ['plaid','api','banking'], 3],
  ['fin-fintech-general', 'GN: FinTech', 'fintech startup funding technology payments', ['fintech','startup','payments'], 2],
  ['fin-neobank', 'GN: Neobanks', 'neobank digital bank Chime Revolut', ['neobank','digital bank','chime'], 3],
  ['fin-buy-now', 'GN: BNPL', 'buy now pay later BNPL Affirm Klarna', ['bnpl','affirm','klarna'], 3],
  // Crypto
  ['fin-crypto', 'GN: Crypto', 'cryptocurrency Bitcoin Ethereum blockchain', ['crypto','bitcoin','ethereum'], 2, 'global'],
  ['fin-crypto-regulation', 'GN: Crypto Regulation', 'cryptocurrency regulation SEC enforcement', ['crypto','regulation','sec'], 3],
  ['fin-stablecoin', 'GN: Stablecoin', 'stablecoin USDC USDT regulation banking', ['stablecoin','usdc','regulation'], 3],
  ['fin-defi', 'GN: DeFi', 'DeFi decentralized finance protocol', ['defi','decentralized','protocol'], 4],
  // VC & IPO
  ['fin-vc', 'GN: Venture Capital', 'venture capital funding startup round', ['vc','funding','startup'], 2],
  ['fin-ipo', 'GN: IPO', 'IPO initial public offering stock market', ['ipo','public offering','stock'], 2],
  ['fin-pe', 'GN: Private Equity', 'private equity acquisition buyout fund', ['pe','acquisition','buyout'], 2],
  ['fin-spac', 'GN: SPAC', 'SPAC merger acquisition special purpose', ['spac','merger','special purpose'], 3],
  ['fin-tech-ipo', 'GN: Tech IPO', 'technology IPO startup public offering', ['tech ipo','startup','public'], 3],
  // Government spending
  ['fin-fed-budget', 'GN: Federal Budget', 'federal budget spending government fiscal', ['federal budget','spending','fiscal'], 2],
  ['fin-defense-spending', 'GN: Defense Spending', 'defense spending budget military procurement', ['defense spending','budget','procurement'], 2],
  ['fin-infrastructure', 'GN: Infrastructure Bill', 'infrastructure spending bill investment', ['infrastructure','spending','investment'], 2],
  // Banking
  ['fin-jpmorgan', 'GN: JPMorgan', 'JPMorgan Chase banking technology AI', ['jpmorgan','banking','technology'], 2],
  ['fin-goldman', 'GN: Goldman Sachs', 'Goldman Sachs banking markets technology', ['goldman sachs','banking','markets'], 2],
  ['fin-fed-reserve', 'GN: Federal Reserve', 'Federal Reserve interest rate monetary policy', ['federal reserve','interest rate','monetary'], 1],
  ['fin-fdic', 'GN: FDIC', 'FDIC banking regulation deposit insurance', ['fdic','banking','regulation'], 2],
  ['fin-sec-enforcement', 'GN: SEC Enforcement', 'SEC enforcement action fraud regulation', ['sec','enforcement','fraud'], 2],
  // Cross-border payments (EP relevant)
  ['fin-remittance', 'GN: Remittances', 'remittance cross-border payment Mexico transfer', ['remittance','cross-border','mexico'], 3, 'el-paso'],
  ['fin-wise', 'GN: Wise', 'Wise TransferWise cross-border payments', ['wise','transferwise','cross-border'], 3, 'global'],
  ['fin-peso-dollar', 'GN: Peso Dollar', 'Mexican peso US dollar exchange rate', ['peso','dollar','exchange rate'], 3, 'el-paso'],
  // Insurance & payments
  ['fin-insurtech', 'GN: InsurTech', 'insurance technology insurtech startup', ['insurtech','insurance','startup'], 3],
  ['fin-paytech', 'GN: Payment Tech', 'payment technology contactless digital wallet', ['payment','contactless','digital wallet'], 3],
  ['fin-regtech', 'GN: RegTech', 'regulatory technology compliance automation', ['regtech','compliance','automation'], 4],
  // EP finance
  ['fin-ep-business', 'GN: EP Business', 'El Paso business investment development', ['el paso','business','investment'], 3, 'el-paso'],
  ['fin-ep-realestate', 'GN: EP Real Estate', 'El Paso commercial real estate development industrial', ['el paso','real estate','industrial'], 3, 'el-paso'],
];

// ═══════════════════════════════════════════════════════════════════════════════
// GOVERNMENT & POLICY (~150 sources)
// ═══════════════════════════════════════════════════════════════════════════════

const GOV_DIRECT: CompactDirect[] = [
  ['gov-cbp', 'CBP Newsroom', 'https://www.cbp.gov/newsroom/rss.xml', ['cbp','border','customs'], 1],
  ['gov-nasa', 'NASA', 'https://www.nasa.gov/feed/', ['nasa','space','research'], 1],
  ['gov-dot', 'DOT', 'https://www.transportation.gov/feed/rss', ['dot','transportation','infrastructure'], 1],
  ['gov-sba', 'SBA News', 'https://www.sba.gov/blogs.xml', ['sba','small business','loans'], 2],
  ['gov-gsa', 'GSA News', 'https://www.gsa.gov/rss', ['gsa','procurement','facilities'], 2],
];

const GOV_GN: CompactGN[] = [
  // Federal agencies
  ['gov-dod', 'GN: DoD Policy', 'Department of Defense policy strategy budget', ['dod','policy','strategy'], 1],
  ['gov-dhs', 'GN: DHS', 'Department Homeland Security policy technology', ['dhs','homeland','security'], 1],
  ['gov-doe-policy', 'GN: DOE Policy', 'Department of Energy policy clean energy', ['doe','energy','policy'], 2],
  ['gov-epa', 'GN: EPA', 'EPA Environmental Protection Agency regulation', ['epa','environment','regulation'], 2],
  ['gov-nist', 'GN: NIST', 'NIST standards technology cybersecurity AI', ['nist','standards','technology'], 1],
  ['gov-nsf', 'GN: NSF', 'NSF National Science Foundation research grant', ['nsf','research','grant'], 2],
  ['gov-fcc', 'GN: FCC', 'FCC communications spectrum broadband regulation', ['fcc','spectrum','broadband'], 2],
  ['gov-ftc', 'GN: FTC', 'FTC antitrust consumer protection technology', ['ftc','antitrust','consumer'], 2],
  ['gov-sec-policy', 'GN: SEC Policy', 'SEC Securities Exchange Commission regulation', ['sec','regulation','securities'], 2],
  ['gov-faa', 'GN: FAA', 'FAA aviation drone regulation airspace', ['faa','aviation','drone'], 2],
  ['gov-commerce', 'GN: Commerce Dept', 'Commerce Department trade technology export', ['commerce','trade','export'], 2],
  ['gov-census', 'GN: Census Bureau', 'Census Bureau data population economics', ['census','data','population'], 3],
  ['gov-omb', 'GN: OMB', 'OMB Office Management Budget federal spending', ['omb','budget','spending'], 3],
  ['gov-opm', 'GN: OPM', 'OPM federal workforce hiring government', ['opm','workforce','hiring'], 3],
  ['gov-va', 'GN: VA', 'VA Veterans Affairs healthcare technology', ['va','veterans','healthcare'], 2],
  ['gov-irs-tech', 'GN: IRS Tech', 'IRS technology modernization digital', ['irs','modernization','digital'], 3],
  // Texas state
  ['gov-tx-legislature', 'GN: TX Legislature', 'Texas legislature law technology business', ['texas','legislature','law'], 2, 'texas'],
  ['gov-tx-governor', 'GN: TX Governor', 'Texas governor Abbott policy business', ['texas','governor','policy'], 2, 'texas'],
  ['gov-tx-comptroller', 'GN: TX Comptroller', 'Texas Comptroller economy revenue budget', ['texas','comptroller','revenue'], 3, 'texas'],
  ['gov-txdot', 'GN: TxDOT', 'TxDOT Texas Department Transportation infrastructure', ['txdot','transportation','infrastructure'], 3, 'texas'],
  ['gov-txdot-ep', 'GN: TxDOT EP', 'TxDOT Texas Transportation El Paso project', ['txdot','el paso','project'], 3, 'el-paso'],
  // El Paso city
  ['gov-ep-city', 'GN: EP City', 'El Paso city council government policy', ['el paso','city council','policy'], 3, 'el-paso'],
  ['gov-ep-county', 'GN: EP County', 'El Paso County government services', ['el paso','county','government'], 3, 'el-paso'],
  // Think tanks
  ['gov-rand', 'GN: RAND', 'RAND Corporation research policy defense', ['rand','research','policy'], 1],
  ['gov-brookings', 'GN: Brookings', 'Brookings Institution policy research technology', ['brookings','policy','research'], 1],
  ['gov-csis', 'GN: CSIS', 'CSIS strategic international studies defense', ['csis','strategic','international'], 1],
  ['gov-heritage', 'GN: Heritage', 'Heritage Foundation policy defense technology', ['heritage','policy','defense'], 2],
  ['gov-hudson', 'GN: Hudson', 'Hudson Institute defense policy technology', ['hudson','defense','policy'], 2],
  ['gov-aei', 'GN: AEI', 'American Enterprise Institute policy economics', ['aei','policy','economics'], 2],
  ['gov-cato', 'GN: CATO', 'CATO Institute policy technology regulation', ['cato','policy','regulation'], 3],
  ['gov-new-america', 'GN: New America', 'New America technology policy cybersecurity', ['new america','technology','policy'], 3],
  ['gov-carnegie', 'GN: Carnegie', 'Carnegie Endowment international technology policy', ['carnegie','international','policy'], 2, 'global'],
  ['gov-atlantic-council', 'GN: Atlantic Council', 'Atlantic Council defense technology geopolitics', ['atlantic council','defense','geopolitics'], 2, 'global'],
  ['gov-cfr', 'GN: CFR', 'Council Foreign Relations international policy', ['cfr','foreign relations','international'], 2, 'global'],
  // Export controls
  ['gov-export-controls', 'GN: Export Controls', 'export controls BIS technology China sanctions', ['export controls','bis','sanctions'], 2, 'global'],
  ['gov-cfius', 'GN: CFIUS', 'CFIUS foreign investment national security review', ['cfius','foreign investment','review'], 3],
  ['gov-chips-policy', 'GN: CHIPS Policy', 'CHIPS science act semiconductor policy', ['chips act','semiconductor','policy'], 2],
  ['gov-itar', 'GN: ITAR', 'ITAR arms export control defense technology', ['itar','export','arms'], 3],
  // Additional
  ['gov-cbo', 'GN: CBO', 'Congressional Budget Office spending forecast', ['cbo','budget','forecast'], 2],
  ['gov-gao-general', 'GN: GAO', 'GAO Government Accountability Office audit report', ['gao','audit','report'], 2],
  ['gov-ig-reports', 'GN: IG Reports', 'Inspector General report federal agency oversight', ['ig','oversight','report'], 3],
  ['gov-whitehouse-tech', 'GN: White House Tech', 'White House technology policy AI executive order', ['white house','technology','executive order'], 1],
];

// ═══════════════════════════════════════════════════════════════════════════════
// BORDER & IMMIGRATION (~100 sources)
// ═══════════════════════════════════════════════════════════════════════════════

const BORDER_GN: CompactGN[] = [
  // CBP & border agencies
  ['bor-cbp-news', 'GN: CBP News', 'CBP Customs Border Protection news enforcement', ['cbp','border','enforcement'], 1],
  ['bor-cbp-contract', 'GN: CBP Contracts', 'CBP DHS border security technology contract award', ['cbp','contract','technology'], 2],
  ['bor-ice', 'GN: ICE', 'ICE Immigration Customs Enforcement operation', ['ice','immigration','enforcement'], 2],
  ['bor-border-patrol', 'GN: Border Patrol', 'Border Patrol agents operations sector', ['border patrol','agents','operations'], 2],
  ['bor-bp-el-paso', 'GN: BP El Paso', 'Border Patrol El Paso sector apprehension', ['border patrol','el paso','sector'], 2, 'el-paso'],
  // Immigration policy
  ['bor-immigration-policy', 'GN: Immigration Policy', 'immigration policy reform law border', ['immigration','policy','reform'], 2],
  ['bor-visa-policy', 'GN: Visa Policy', 'visa immigration H-1B green card work', ['visa','h-1b','work permit'], 3],
  ['bor-asylum', 'GN: Asylum', 'asylum seekers immigration border policy', ['asylum','seekers','border'], 3],
  ['bor-daca', 'GN: DACA', 'DACA Dreamers immigration policy program', ['daca','dreamers','program'], 3],
  ['bor-title-42', 'GN: Border Policy', 'border policy immigration enforcement Title', ['border','policy','enforcement'], 2],
  // Cross-border commerce
  ['bor-cross-border', 'GN: Cross-Border Commerce', 'cross-border commerce trade El Paso Juarez', ['cross-border','commerce','trade'], 2, 'el-paso'],
  ['bor-bridge-traffic', 'GN: Bridge Traffic', 'El Paso bridge traffic wait time port entry', ['bridge','traffic','wait time'], 3, 'el-paso'],
  ['bor-trusted-traveler', 'GN: Trusted Traveler', 'Global Entry SENTRI trusted traveler CBP', ['global entry','sentri','trusted'], 3],
  ['bor-commercial-crossing', 'GN: Commercial Crossing', 'commercial vehicle crossing border truck freight', ['commercial','truck','crossing'], 3, 'el-paso'],
  // El Paso / Juarez corridor
  ['bor-ep-juarez', 'GN: EP Juarez', 'El Paso Juarez border corridor economy', ['el paso','juarez','corridor'], 2, 'el-paso'],
  ['bor-maquila-trade', 'GN: Maquila Trade', 'maquiladora trade Mexico US manufacturing border', ['maquiladora','trade','manufacturing'], 3, 'el-paso'],
  ['bor-borderplex', 'GN: Borderplex', 'Borderplex Alliance EPEDCO El Paso economic', ['borderplex','epedco','economic'], 3, 'el-paso'],
  ['bor-ep-chamber', 'GN: EP Chamber', 'El Paso Chamber Commerce business expansion', ['el paso','chamber','business'], 3, 'el-paso'],
  // Border technology
  ['bor-border-tech', 'GN: Border Tech', 'border technology surveillance detection sensor', ['border tech','surveillance','sensor'], 2],
  ['bor-border-wall-tech', 'GN: Wall Tech', 'border wall technology sensor camera autonomous', ['wall','sensor','camera'], 3],
  ['bor-biometric-border', 'GN: Biometric Border', 'biometric facial recognition border entry', ['biometric','facial recognition','entry'], 3],
  ['bor-drone-border', 'GN: Drone Border', 'drone unmanned border surveillance patrol', ['drone','surveillance','patrol'], 3],
  ['bor-tunnel-detect', 'GN: Tunnel Detection', 'tunnel detection technology border smuggling', ['tunnel','detection','smuggling'], 4],
  // Trade facilitation
  ['bor-ace-trade', 'GN: ACE Trade', 'ACE Automated Commercial Environment customs', ['ace','automated','customs'], 4],
  ['bor-c-tpat', 'GN: C-TPAT', 'C-TPAT customs trade partnership security', ['c-tpat','partnership','security'], 4],
  ['bor-free-trade-zone', 'GN: FTZ', 'Foreign Trade Zone FTZ El Paso border', ['ftz','foreign trade zone','el paso'], 4, 'el-paso'],
  // Mexico
  ['bor-mexico-economy', 'GN: Mexico Economy', 'Mexico economy trade investment manufacturing', ['mexico','economy','investment'], 2, 'global'],
  ['bor-mexico-security', 'GN: Mexico Security', 'Mexico security cartel violence border', ['mexico','security','cartel'], 2, 'global'],
  ['bor-chihuahua', 'GN: Chihuahua', 'Chihuahua Mexico industry manufacturing Juarez', ['chihuahua','industry','juarez'], 3, 'el-paso'],
  ['bor-mexico-nearshore', 'GN: Mexico Nearshore', 'Mexico nearshoring manufacturing investment US', ['nearshoring','manufacturing','investment'], 2, 'global'],
];

// ═══════════════════════════════════════════════════════════════════════════════
// EL PASO & REGIONAL (~100 sources)
// ═══════════════════════════════════════════════════════════════════════════════

const ELPASO_DIRECT: CompactDirect[] = [
  ['ep-times', 'EP Times', 'https://www.elpasotimes.com/arc/outboundfeeds/rss/', ['el paso','news','local'], 1, 'el-paso'],
  ['ep-matters', 'EP Matters', 'https://elpasomatters.org/feed/', ['el paso','community','news'], 2, 'el-paso'],
  ['ep-kvia', 'KVIA EP', 'https://kvia.com/feed/', ['el paso','tv','news'], 2, 'el-paso'],
  ['ep-inc', 'EP Inc', 'https://www.elpasoinc.com/feed/', ['el paso','business','economy'], 2, 'el-paso'],
  ['ep-herald', 'EP Herald-Post', 'https://elpasoheraldpost.com/feed/', ['el paso','news','community'], 2, 'el-paso'],
  ['ep-ktsm', 'KTSM NBC', 'https://www.ktsm.com/feed/', ['el paso','tv','news'], 2, 'el-paso'],
  ['ep-kfox', 'KFOX14', 'https://kfoxtv.com/feed/', ['el paso','tv','news'], 2, 'el-paso'],
  ['ep-utep', 'UTEP News', 'https://www.utep.edu/newsfeed/', ['utep','university','research'], 2, 'el-paso'],
  ['ep-tx-tribune', 'TX Tribune', 'https://www.texastribune.org/feeds/latest/', ['texas','politics','news'], 1, 'texas'],
  ['ep-tx-monthly', 'TX Monthly', 'https://www.texasmonthly.com/feed/', ['texas','culture','business'], 2, 'texas'],
];

const ELPASO_GN: CompactGN[] = [
  // EP tech & business
  ['ep-tech', 'GN: EP Tech', 'El Paso technology startup innovation', ['el paso','technology','startup'], 3, 'el-paso'],
  ['ep-econ', 'GN: EP Economy', 'El Paso economic development business', ['el paso','economy','development'], 3, 'el-paso'],
  ['ep-defense', 'GN: EP Defense', 'El Paso defense contractor award', ['el paso','defense','contractor'], 3, 'el-paso'],
  ['ep-mfg', 'GN: EP Mfg', 'El Paso manufacturing jobs industry', ['el paso','manufacturing','jobs'], 3, 'el-paso'],
  ['ep-startups', 'GN: EP Startups', 'El Paso startup venture capital funding', ['el paso','startup','funding'], 3, 'el-paso'],
  ['ep-health', 'GN: EP Health', 'El Paso health technology hospital UMC', ['el paso','health','hospital'], 3, 'el-paso'],
  ['ep-construction', 'GN: EP Construction', 'El Paso construction development project', ['el paso','construction','development'], 3, 'el-paso'],
  ['ep-education', 'GN: EP Education', 'El Paso education school EPISD technology', ['el paso','education','episd'], 4, 'el-paso'],
  ['ep-tourism', 'GN: EP Tourism', 'El Paso tourism downtown convention center', ['el paso','tourism','downtown'], 4, 'el-paso'],
  ['ep-infrastructure', 'GN: EP Infrastructure', 'El Paso infrastructure project road bridge', ['el paso','infrastructure','road'], 3, 'el-paso'],
  // UTEP
  ['ep-utep-research', 'GN: UTEP Research', 'UTEP research grant NSF NIH DOD engineering', ['utep','research','grant'], 3, 'el-paso'],
  ['ep-utep-cyber', 'GN: UTEP Cyber', 'UTEP cybersecurity computer science AI research', ['utep','cybersecurity','ai'], 3, 'el-paso'],
  ['ep-utep-mining', 'GN: UTEP Mining', 'UTEP mining engineering materials research', ['utep','mining','engineering'], 4, 'el-paso'],
  // Regional
  ['ep-las-cruces', 'GN: Las Cruces', 'Las Cruces New Mexico technology business', ['las cruces','new mexico','business'], 3, 'el-paso'],
  ['ep-nm-tech', 'GN: NM Tech', 'New Mexico technology startup Sandia Los Alamos', ['new mexico','technology','startup'], 3, 'el-paso'],
  ['ep-tx-tech', 'GN: TX Tech', 'Texas technology startup Austin Dallas innovation', ['texas','technology','startup'], 3, 'texas'],
  ['ep-spaceport', 'GN: Spaceport', 'Spaceport America New Mexico launch', ['spaceport','new mexico','launch'], 4, 'el-paso'],
  ['ep-wt-weather', 'GN: WT Weather', 'West Texas weather dust storm drought', ['west texas','weather','drought'], 4, 'el-paso'],
  // Military community
  ['ep-bliss-community', 'GN: Bliss Community', 'Fort Bliss community families military El Paso', ['fort bliss','community','families'], 3, 'el-paso'],
  ['ep-veteran-ep', 'GN: EP Veterans', 'El Paso veteran services employment transition', ['veterans','employment','el paso'], 4, 'el-paso'],
  // Borderplex economy
  ['ep-warehouse', 'GN: EP Warehouse', 'El Paso warehouse distribution logistics center', ['warehouse','distribution','logistics'], 3, 'el-paso'],
  ['ep-data-center', 'GN: EP Data Center', 'El Paso data center colocation cloud', ['data center','colocation','cloud'], 3, 'el-paso'],
  ['ep-solar-ep', 'GN: EP Solar', 'El Paso solar energy installation renewable', ['solar','energy','el paso'], 3, 'el-paso'],
  // Government procurement & contracts
  ['ep-sam-awards', 'GN: SAM Awards EP', 'SAM.gov contract award El Paso Texas defense', ['sam.gov','contract','award'], 3, 'el-paso'],
  ['ep-usaspend', 'GN: USASpending EP', 'USASpending federal contract El Paso Fort Bliss', ['usaspending','federal','contract'], 3, 'el-paso'],
  ['ep-dod-contracts', 'GN: DoD Contracts EP', 'Department of Defense contract award Texas El Paso', ['dod','contract','texas'], 2, 'el-paso'],
  ['ep-dhs-procurement', 'GN: DHS Procurement', 'DHS CBP procurement technology border security', ['dhs','cbp','procurement'], 3, 'el-paso'],
  ['ep-army-contract', 'GN: Army Contracting', 'Army contracting command MICC Fort Bliss award', ['army','contracting','fort bliss'], 3, 'el-paso'],
  // Transport & freight
  ['ep-bnsf-news', 'GN: BNSF EP', 'BNSF Railway El Paso intermodal freight rail', ['bnsf','railway','intermodal'], 3, 'el-paso'],
  ['ep-freight-ep', 'GN: EP Freight', 'El Paso freight trucking cross-border logistics', ['freight','trucking','cross-border'], 3, 'el-paso'],
  ['ep-customs-trade', 'GN: EP Customs Trade', 'El Paso customs brokerage trade compliance USMCA', ['customs','brokerage','usmca'], 3, 'el-paso'],
  // Professional services & Big 4
  ['ep-big4-border', 'GN: Big 4 Border', 'PwC EY Deloitte KPMG maquiladora border advisory', ['pwc','ey','maquiladora'], 3, 'el-paso'],
  // Helen of Troy (EP HQ)
  ['ep-hot-news', 'GN: Helen of Troy', 'Helen of Troy Limited housewares OXO Hydro Flask', ['helen of troy','oxo','hydro flask'], 3, 'el-paso'],
  // White Sands & missile testing
  ['ep-wsmr-test', 'GN: WSMR Testing', 'White Sands Missile Range test hypersonic directed energy', ['wsmr','hypersonic','directed energy'], 3, 'el-paso'],
  // DEA EPIC intelligence
  ['ep-dea-intel', 'GN: DEA EPIC', 'DEA El Paso Intelligence Center drug trafficking', ['dea','epic','intelligence'], 3, 'el-paso'],
  // Quantum & advanced tech
  ['ep-quantum-army', 'GN: Quantum Army', 'quantum computing Army research laboratory defense', ['quantum','army','defense'], 3, 'national'],
  // Delek refinery
  ['ep-delek-news', 'GN: Delek US', 'Delek US Holdings refinery petroleum El Paso', ['delek','refinery','petroleum'], 3, 'el-paso'],
];

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTHCARE & BIOTECH (~100 sources)
// ═══════════════════════════════════════════════════════════════════════════════

const HEALTH_GN: CompactGN[] = [
  // Health IT
  ['hlt-health-it', 'GN: Health IT', 'health IT electronic health records EHR', ['health it','ehr','records'], 2],
  ['hlt-telemedicine', 'GN: Telemedicine', 'telemedicine telehealth virtual care technology', ['telemedicine','telehealth','virtual care'], 2],
  ['hlt-epic-cerner', 'GN: Epic Cerner', 'Epic Cerner EHR hospital technology', ['epic','cerner','ehr'], 3],
  ['hlt-digital-health', 'GN: Digital Health', 'digital health startup wearable monitoring', ['digital health','wearable','monitoring'], 2],
  ['hlt-health-ai', 'GN: Health AI', 'artificial intelligence healthcare diagnosis imaging', ['health ai','diagnosis','imaging'], 2],
  ['hlt-health-data', 'GN: Health Data', 'health data interoperability FHIR analytics', ['health data','fhir','analytics'], 3],
  // Biotech & pharma
  ['hlt-biotech', 'GN: Biotech', 'biotechnology drug development clinical trial', ['biotech','drug','clinical trial'], 2],
  ['hlt-pharma', 'GN: Pharma', 'pharmaceutical drug approval FDA pipeline', ['pharma','fda','drug approval'], 2],
  ['hlt-gene-therapy', 'GN: Gene Therapy', 'gene therapy CRISPR genome editing', ['gene therapy','crispr','genome'], 3],
  ['hlt-mrna', 'GN: mRNA', 'mRNA vaccine technology Moderna BioNTech', ['mrna','vaccine','moderna'], 3],
  ['hlt-medical-device', 'GN: Medical Devices', 'medical device technology FDA approval', ['medical device','fda','device'], 2],
  ['hlt-diagnostic', 'GN: Diagnostics', 'diagnostic technology testing point-of-care', ['diagnostics','testing','point-of-care'], 3],
  // Public health
  ['hlt-cdc', 'GN: CDC', 'CDC disease outbreak public health surveillance', ['cdc','disease','public health'], 1],
  ['hlt-fda-news', 'GN: FDA', 'FDA drug approval regulation medical device', ['fda','approval','regulation'], 1],
  ['hlt-who', 'GN: WHO', 'WHO World Health Organization global health', ['who','global health','pandemic'], 1, 'global'],
  ['hlt-pandemic-prep', 'GN: Pandemic Prep', 'pandemic preparedness biodefense public health', ['pandemic','preparedness','biodefense'], 3],
  ['hlt-antimicrobial', 'GN: AMR', 'antimicrobial resistance antibiotic drug', ['amr','antibiotic','resistance'], 4, 'global'],
  // Military health
  ['hlt-dha', 'GN: DHA', 'Defense Health Agency military healthcare technology', ['dha','military health','technology'], 3],
  ['hlt-va-health', 'GN: VA Health', 'VA healthcare technology veteran hospital', ['va','veteran','healthcare'], 2],
  ['hlt-combat-casualty', 'GN: Combat Casualty', 'combat casualty care military medicine technology', ['combat','casualty','military medicine'], 4],
  // EP healthcare
  ['hlt-ep-hospital', 'GN: EP Hospital', 'El Paso hospital UMC healthcare technology', ['el paso','hospital','umc'], 3, 'el-paso'],
  ['hlt-ep-health-dept', 'GN: EP Health Dept', 'El Paso health department public health', ['el paso','health department','public health'], 4, 'el-paso'],
  // Additional
  ['hlt-precision-med', 'GN: Precision Med', 'precision medicine genomics personalized treatment', ['precision','genomics','personalized'], 3],
  ['hlt-robotics-surgery', 'GN: Surgical Robotics', 'surgical robotics Intuitive da Vinci medical', ['surgical robotics','intuitive','da vinci'], 3],
  ['hlt-mental-health', 'GN: Mental Health Tech', 'mental health technology app digital therapy', ['mental health','app','digital therapy'], 3],
  ['hlt-biomarker', 'GN: Biomarkers', 'biomarker diagnostic blood test technology', ['biomarker','diagnostic','blood test'], 4],
  ['hlt-clinical-ai', 'GN: Clinical AI', 'clinical AI decision support pathology radiology', ['clinical ai','pathology','radiology'], 3],
  ['hlt-remote-monitor', 'GN: Remote Monitoring', 'remote patient monitoring RPM wearable', ['rpm','wearable','monitoring'], 3],
];

// ═══════════════════════════════════════════════════════════════════════════════
// CRIME & PUBLIC SAFETY (~100 sources)
// ═══════════════════════════════════════════════════════════════════════════════

const CRIME_DIRECT: CompactDirect[] = [
  ['crm-ktsm-crime', 'KTSM Crime', 'https://www.ktsm.com/news/crime/feed/', ['el paso','crime','arrest'], 2, 'el-paso'],
];

const CRIME_GN: CompactGN[] = [
  // El Paso crime
  ['crm-ep-crime', 'GN: EP Crime', 'El Paso crime arrest police shooting', ['el paso','crime','arrest'], 2, 'el-paso'],
  ['crm-ep-police', 'GN: EP Police', 'El Paso Police Department EPPD news', ['el paso','police','eppd'], 2, 'el-paso'],
  ['crm-cbp-crime', 'GN: CBP Crime', 'CBP border patrol arrest seizure El Paso', ['cbp','arrest','seizure'], 2, 'el-paso'],
  ['crm-ep-shooting', 'GN: EP Shooting', 'El Paso shooting homicide violent crime', ['el paso','shooting','homicide'], 2, 'el-paso'],
  ['crm-ep-theft', 'GN: EP Theft', 'El Paso theft robbery burglary crime', ['el paso','theft','robbery'], 3, 'el-paso'],
  ['crm-ep-drug', 'GN: EP Drugs', 'El Paso drug trafficking fentanyl seizure', ['el paso','drug','fentanyl'], 2, 'el-paso'],
  ['crm-ep-dui', 'GN: EP DUI', 'El Paso DUI DWI arrest crash', ['el paso','dui','dwi'], 3, 'el-paso'],
  ['crm-ep-fire', 'GN: EP Fire', 'El Paso fire department emergency rescue', ['el paso','fire','emergency'], 3, 'el-paso'],
  // Federal law enforcement
  ['crm-fbi', 'GN: FBI', 'FBI investigation arrest federal crime', ['fbi','investigation','federal'], 1],
  ['crm-dea', 'GN: DEA', 'DEA drug enforcement seizure trafficking', ['dea','drug','trafficking'], 1],
  ['crm-atf', 'GN: ATF', 'ATF firearms explosives investigation', ['atf','firearms','explosives'], 2],
  ['crm-usms', 'GN: US Marshals', 'US Marshals fugitive arrest operation', ['marshals','fugitive','arrest'], 2],
  ['crm-secret-service', 'GN: Secret Service', 'Secret Service fraud cybercrime investigation', ['secret service','fraud','cybercrime'], 3],
  ['crm-fbi-ep', 'GN: FBI El Paso', 'FBI El Paso field office investigation', ['fbi','el paso','investigation'], 3, 'el-paso'],
  // Cartel & transnational
  ['crm-cartel', 'GN: Cartel', 'cartel drug trafficking Mexico border violence', ['cartel','trafficking','violence'], 2, 'global'],
  ['crm-fentanyl', 'GN: Fentanyl', 'fentanyl trafficking seizure overdose border', ['fentanyl','trafficking','overdose'], 1],
  ['crm-human-trafficking', 'GN: Human Trafficking', 'human trafficking smuggling border operation', ['human trafficking','smuggling','operation'], 2],
  ['crm-money-laundering', 'GN: Money Laundering', 'money laundering financial crime investigation', ['money laundering','financial crime','investigation'], 3],
  ['crm-transnational', 'GN: Transnational Crime', 'transnational organized crime TCO operation', ['transnational','organized crime','tco'], 2, 'global'],
  // Public safety tech
  ['crm-body-cam', 'GN: Body Cameras', 'body camera police technology Axon', ['body camera','axon','police'], 3],
  ['crm-gunshot-detect', 'GN: Gunshot Detection', 'gunshot detection ShotSpotter technology', ['shotspotter','gunshot','detection'], 3],
  ['crm-facial-rec', 'GN: Facial Recognition', 'facial recognition police surveillance technology', ['facial recognition','surveillance','police'], 2],
  ['crm-predictive', 'GN: Predictive Policing', 'predictive policing technology crime analysis', ['predictive','policing','analysis'], 3],
  ['crm-license-plate', 'GN: License Plate', 'license plate reader ALPR surveillance', ['alpr','license plate','surveillance'], 4],
  ['crm-real-time-crime', 'GN: Real-Time Crime', 'real-time crime center RTCC technology', ['rtcc','real-time','crime center'], 3],
  ['crm-drone-police', 'GN: Police Drones', 'police drone surveillance first responder', ['police drone','surveillance','first responder'], 3],
  // Gang intelligence
  ['crm-gang', 'GN: Gang Intel', 'gang intelligence operation task force', ['gang','task force','operation'], 3],
  ['crm-ms13', 'GN: MS-13', 'MS-13 gang operation arrest federal', ['ms-13','gang','arrest'], 3],
  // Texas crime
  ['crm-tx-crime', 'GN: TX Crime', 'Texas crime arrest shooting investigation', ['texas','crime','investigation'], 3, 'texas'],
  ['crm-tx-dps', 'GN: TX DPS', 'Texas DPS Department Public Safety operation', ['texas dps','operation','enforcement'], 3, 'texas'],
  ['crm-tx-ranger', 'GN: TX Rangers', 'Texas Rangers investigation cold case crime', ['texas rangers','investigation','case'], 3, 'texas'],
  // Cybercrime (law enforcement side)
  ['crm-cybercrime-fbi', 'GN: FBI Cybercrime', 'FBI cybercrime investigation arrest hacking', ['fbi','cybercrime','hacking'], 2],
  ['crm-ransomware-arrest', 'GN: Ransomware Arrest', 'ransomware arrest indictment law enforcement', ['ransomware','arrest','indictment'], 2],
  // Additional safety
  ['crm-amber-alert', 'GN: Amber Alert', 'amber alert missing child Texas El Paso', ['amber alert','missing','child'], 2, 'texas'],
  ['crm-school-safety', 'GN: School Safety', 'school safety security technology active shooter', ['school safety','security','active shooter'], 3],
  ['crm-jail-prison', 'GN: Jail Prison', 'El Paso jail prison detention county', ['jail','prison','detention'], 4, 'el-paso'],
];

// ═══════════════════════════════════════════════════════════════════════════════
// GENERAL / WIRE SERVICES (~50 sources)
// ═══════════════════════════════════════════════════════════════════════════════

const GENERAL_DIRECT: CompactDirect[] = [
  ['gen-govwin', 'GovWin', 'https://iq.govwin.com/neo/rss/marketAnalysis', ['govwin','market','analysis'], 3],
];

const GENERAL_GN: CompactGN[] = [
  ['gen-robotics', 'GN: Robotics', 'industrial robotics automation', ['robotics','automation','industrial'], 3],
  ['gen-logistics', 'GN: Logistics', 'logistics technology startup', ['logistics','technology','startup'], 3],
  ['gen-water-tech', 'GN: Water Tech', 'water technology startup funding', ['water','technology','startup'], 3],
  ['gen-semicon', 'GN: Semicon', 'semiconductor supply chain manufacturing', ['semiconductor','supply chain','manufacturing'], 3],
  ['gen-energy-tech', 'GN: Energy Tech', 'energy technology grid AI', ['energy','technology','grid'], 3],
];

// ═══════════════════════════════════════════════════════════════════════════════
// CONFERENCES & TRADE SHOWS (~55 sources)
// Track exhibitor/vendor discovery from major industry conferences
// ═══════════════════════════════════════════════════════════════════════════════

const CONFERENCE_GN: CompactGN[] = [
  // Logistics conferences
  ['conf-modex', 'GN: MODEX', 'MODEX 2026 exhibitor vendor automation', ['modex','exhibitor','automation'], 2],
  ['conf-promat', 'GN: ProMat', 'ProMat 2026 exhibitor vendor automation', ['promat','exhibitor','automation'], 2],
  ['conf-cscmp-edge', 'GN: CSCMP EDGE', 'CSCMP EDGE 2026 supply chain logistics conference', ['cscmp','edge','supply chain'], 2],
  ['conf-manifest', 'GN: Manifest', 'Manifest 2026 logistics technology conference vendor', ['manifest','logistics','technology'], 2],
  ['conf-logimat', 'GN: LogiMAT', 'LogiMAT 2026 intralogistics exhibitor warehouse', ['logimat','intralogistics','warehouse'], 3, 'global'],
  ['conf-transport-logistic', 'GN: Transport Logistic', 'Transport Logistic 2026 Munich exhibitor freight', ['transport logistic','munich','freight'], 3, 'global'],
  ['conf-tpm', 'GN: TPM Conference', 'TPM Conference 2026 container shipping logistics', ['tpm','container','shipping'], 3],
  ['conf-parcel-forum', 'GN: Parcel Forum', 'Parcel Forum 2026 last mile delivery logistics', ['parcel forum','last mile','delivery'], 3],
  ['conf-home-delivery', 'GN: Home Delivery World', 'Home Delivery World 2026 ecommerce logistics', ['home delivery','ecommerce','logistics'], 3],
  // Manufacturing conferences
  ['conf-imts', 'GN: IMTS', 'IMTS 2026 exhibitor manufacturing technology vendor', ['imts','manufacturing','technology'], 1],
  ['conf-hannover', 'GN: Hannover Messe', 'Hannover Messe 2026 industrial automation exhibitor', ['hannover messe','industrial','automation'], 1, 'global'],
  ['conf-fabtech', 'GN: FABTECH', 'FABTECH 2026 welding fabrication exhibitor vendor', ['fabtech','welding','fabrication'], 2],
  ['conf-pack-expo', 'GN: PACK EXPO', 'PACK EXPO 2026 packaging exhibitor automation vendor', ['pack expo','packaging','automation'], 2],
  ['conf-smart-mfg-exp', 'GN: Smart Mfg Exp', 'Smart Manufacturing Experience 2026 exhibitor vendor', ['smart manufacturing','experience','exhibitor'], 3],
  ['conf-adv-mfg-expo', 'GN: Adv Mfg Expo', 'Advanced Manufacturing Expo 2026 exhibitor technology', ['advanced manufacturing','expo','technology'], 3],
  ['conf-eastec', 'GN: EASTEC', 'EASTEC 2026 manufacturing exhibitor precision machining', ['eastec','precision','machining'], 3],
  ['conf-rapid-3d', 'GN: RAPID+TCT', 'RAPID+TCT 2026 3D printing additive manufacturing exhibitor', ['rapid','3d printing','additive'], 3],
  // Robotics conferences
  ['conf-automate', 'GN: Automate Show', 'Automate Show 2026 robotics automation exhibitor vendor', ['automate','robotics','automation'], 2],
  ['conf-robotics-summit', 'GN: Robotics Summit', 'Robotics Summit Expo 2026 exhibitor vendor technology', ['robotics summit','expo','technology'], 2],
  ['conf-robobusiness', 'GN: RoboBusiness', 'RoboBusiness 2026 robotics commercial exhibitor vendor', ['robobusiness','robotics','commercial'], 3],
  ['conf-roscon', 'GN: ROSCon', 'ROSCon 2026 ROS robotics open source conference', ['roscon','ros','open source'], 3],
  ['conf-arm-robotics', 'GN: ARM Robotics', 'Advanced Robotics Manufacturing 2026 exhibitor', ['advanced robotics','manufacturing','exhibitor'], 3],
  ['conf-cobot-expo', 'GN: Cobot Expo', 'Collaborative Robot Expo 2026 cobot vendor automation', ['cobot','collaborative','automation'], 3],
  // AI / Tech conferences
  ['conf-neurips', 'GN: NeurIPS', 'NeurIPS 2026 conference AI machine learning research', ['neurips','ai','machine learning'], 1, 'global'],
  ['conf-icml', 'GN: ICML', 'ICML 2026 conference machine learning research paper', ['icml','machine learning','research'], 1, 'global'],
  ['conf-nvidia-gtc', 'GN: NVIDIA GTC', 'NVIDIA GTC 2026 GPU AI exhibitor vendor launch', ['nvidia','gtc','gpu'], 1],
  ['conf-aws-reinvent', 'GN: AWS re:Invent', 'AWS re:Invent 2026 cloud exhibitor vendor launch', ['aws','reinvent','cloud'], 1],
  ['conf-msft-ignite', 'GN: Microsoft Ignite', 'Microsoft Ignite 2026 enterprise AI exhibitor launch', ['microsoft','ignite','enterprise'], 1],
  ['conf-google-next', 'GN: Google Cloud Next', 'Google Cloud Next 2026 exhibitor vendor AI launch', ['google cloud','next','exhibitor'], 1],
  ['conf-ces', 'GN: CES', 'CES 2026 exhibitor vendor technology launch consumer', ['ces','consumer','technology'], 1],
  ['conf-sxsw', 'GN: SXSW', 'SXSW 2026 technology startup exhibitor innovation', ['sxsw','startup','innovation'], 2],
  ['conf-tc-disrupt', 'GN: TechCrunch Disrupt', 'TechCrunch Disrupt 2026 startup exhibitor demo pitch', ['techcrunch','disrupt','startup'], 2],
  ['conf-web-summit', 'GN: Web Summit', 'Web Summit 2026 technology startup exhibitor vendor', ['web summit','startup','technology'], 2, 'global'],
  ['conf-collision', 'GN: Collision', 'Collision 2026 technology conference startup exhibitor', ['collision','startup','technology'], 3],
  ['conf-isc-west', 'GN: ISC West', 'ISC West 2026 security technology exhibitor vendor', ['isc west','security','exhibitor'], 3],
  // Warehousing conferences
  ['conf-warehouse-auto', 'GN: Warehouse Auto Summit', 'Warehouse Automation Summit 2026 exhibitor vendor', ['warehouse','automation','summit'], 2],
  ['conf-werc', 'GN: WERC Conference', 'WERC Conference 2026 warehouse education research council', ['werc','warehouse','education'], 3],
  ['conf-material-handling', 'GN: Material Handling', 'Material Handling World 2026 exhibitor equipment vendor', ['material handling','equipment','vendor'], 3],
  ['conf-sitl', 'GN: SITL', 'SITL 2026 supply chain logistics exhibitor Europe', ['sitl','supply chain','logistics'], 4, 'global'],
  // Infrastructure conferences
  ['conf-smart-cities', 'GN: Smart Cities Connect', 'Smart Cities Connect 2026 exhibitor technology vendor', ['smart cities','connect','technology'], 3],
  ['conf-infra-investor', 'GN: Infra Investor', 'Infrastructure Investor Global Summit 2026 investment', ['infrastructure','investor','summit'], 3, 'global'],
  ['conf-verge', 'GN: GreenBiz VERGE', 'GreenBiz VERGE 2026 climate technology exhibitor', ['greenbiz','verge','climate'], 3],
  // Defense conferences
  ['conf-ausa', 'GN: AUSA', 'AUSA 2026 Army exhibitor defense vendor technology', ['ausa','army','defense'], 1],
  ['conf-sofic', 'GN: SOFIC', 'SOFIC 2026 special operations exhibitor vendor', ['sofic','special operations','exhibitor'], 2],
  ['conf-sea-air-space', 'GN: Sea-Air-Space', 'Sea-Air-Space 2026 Navy League exhibitor defense', ['sea-air-space','navy league','defense'], 2],
  ['conf-dsei', 'GN: DSEI', 'DSEI 2026 defence security exhibitor vendor London', ['dsei','defence','security'], 2, 'global'],
  ['conf-shot-show', 'GN: SHOT Show', 'SHOT Show 2026 firearms defense exhibitor vendor', ['shot show','firearms','defense'], 3],
  ['conf-eurosatory', 'GN: Eurosatory', 'Eurosatory 2026 defense land exhibitor vendor Paris', ['eurosatory','defense','land'], 3, 'global'],
  ['conf-idex', 'GN: IDEX', 'IDEX 2026 defence exhibitor vendor Abu Dhabi', ['idex','defence','abu dhabi'], 3, 'global'],
  ['conf-afcea-west', 'GN: AFCEA West', 'AFCEA West 2026 C4ISR cyber exhibitor vendor', ['afcea','c4isr','cyber'], 3],
  ['conf-itsec', 'GN: I/ITSEC', 'I/ITSEC 2026 modeling simulation training exhibitor', ['iitsec','simulation','training'], 3],
  ['conf-space-symposium', 'GN: Space Symposium', 'Space Symposium 2026 exhibitor vendor satellite defense', ['space symposium','satellite','defense'], 2],
];

// ═══════════════════════════════════════════════════════════════════════════════
// JOB MARKET SIGNALS (~25 sources)
// Track hiring patterns, workforce expansion, contractor demand
// ═══════════════════════════════════════════════════════════════════════════════

const JOBS_GN: CompactGN[] = [
  // El Paso hiring
  ['job-ep-tech', 'GN: EP Tech Hiring', 'El Paso hiring technology engineer', ['el paso','hiring','technology'], 3, 'el-paso'],
  ['job-ep-mfg', 'GN: EP Mfg Hiring', 'El Paso manufacturing jobs expansion hiring', ['el paso','manufacturing','jobs'], 3, 'el-paso'],
  ['job-ep-warehouse', 'GN: EP Warehouse Jobs', 'El Paso warehouse jobs logistics hiring', ['el paso','warehouse','logistics'], 3, 'el-paso'],
  ['job-ep-defense', 'GN: EP Defense Jobs', 'El Paso defense contractor hiring jobs', ['el paso','defense','contractor'], 3, 'el-paso'],
  ['job-ep-healthcare', 'GN: EP Health Jobs', 'El Paso healthcare hiring hospital jobs', ['el paso','healthcare','hiring'], 3, 'el-paso'],
  // Fort Bliss
  ['job-bliss-civilian', 'GN: Bliss Civilian', 'Fort Bliss civilian contractor hiring jobs', ['fort bliss','civilian','contractor'], 3, 'el-paso'],
  ['job-bliss-it', 'GN: Bliss IT Jobs', 'Fort Bliss IT technology contractor hiring', ['fort bliss','it','technology'], 3, 'el-paso'],
  // Texas regional
  ['job-tx-robotics', 'GN: TX Robotics Hiring', 'Texas robotics hiring engineer automation', ['texas','robotics','hiring'], 3, 'texas'],
  ['job-tx-logistics', 'GN: TX Logistics Hiring', 'logistics automation hiring Texas warehouse', ['logistics','automation','texas'], 3, 'texas'],
  ['job-tx-energy', 'GN: TX Energy Jobs', 'Texas energy hiring renewable solar wind', ['texas','energy','hiring'], 3, 'texas'],
  ['job-tx-cyber', 'GN: TX Cyber Jobs', 'Texas cybersecurity hiring engineer analyst', ['texas','cybersecurity','hiring'], 3, 'texas'],
  ['job-tx-mfg', 'GN: TX Mfg Jobs', 'Texas manufacturing expansion hiring jobs plant', ['texas','manufacturing','expansion'], 3, 'texas'],
  // Company-specific EP-relevant hires
  ['job-raytheon-ep', 'GN: Raytheon EP Hire', 'Raytheon hiring El Paso Texas jobs', ['raytheon','el paso','hiring'], 3, 'el-paso'],
  ['job-l3harris-tx', 'GN: L3Harris TX Hire', 'L3Harris jobs Texas hiring engineer', ['l3harris','texas','hiring'], 3, 'texas'],
  ['job-boeing-tx', 'GN: Boeing TX Hire', 'Boeing hiring Texas jobs engineer', ['boeing','texas','hiring'], 3, 'texas'],
  ['job-lockheed-tx', 'GN: Lockheed TX Hire', 'Lockheed Martin hiring Texas jobs', ['lockheed','texas','hiring'], 3, 'texas'],
  ['job-northrop-tx', 'GN: Northrop TX Hire', 'Northrop Grumman hiring Texas jobs', ['northrop','texas','hiring'], 3, 'texas'],
  ['job-general-dynamics-tx', 'GN: GenDyn TX Hire', 'General Dynamics hiring Texas jobs', ['general dynamics','texas','hiring'], 3, 'texas'],
  ['job-amazon-ep', 'GN: Amazon EP Hire', 'Amazon hiring El Paso warehouse fulfillment', ['amazon','el paso','warehouse'], 3, 'el-paso'],
  ['job-fedex-ep', 'GN: FedEx EP Hire', 'FedEx hiring El Paso logistics jobs', ['fedex','el paso','logistics'], 3, 'el-paso'],
  // National tech hiring trends
  ['job-tech-layoffs', 'GN: Tech Layoffs', 'technology company layoffs hiring freeze', ['layoffs','hiring freeze','technology'], 2],
  ['job-ai-hiring', 'GN: AI Hiring', 'artificial intelligence hiring engineer demand', ['ai','hiring','engineer'], 2],
  ['job-defense-hiring', 'GN: Defense Hiring', 'defense contractor hiring workforce expansion', ['defense','hiring','workforce'], 2],
  ['job-stem-shortage', 'GN: STEM Shortage', 'STEM worker shortage hiring engineer technology', ['stem','shortage','engineer'], 3],
  ['job-clearance-jobs', 'GN: Clearance Jobs', 'security clearance jobs hiring contractor', ['clearance','jobs','contractor'], 3],
];

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTRUCTION & PERMITS (~18 sources)
// Track commercial/industrial development activity
// ═══════════════════════════════════════════════════════════════════════════════

const CONSTRUCTION_GN: CompactGN[] = [
  // El Paso construction
  ['cst-ep-permit', 'GN: EP Permit', 'El Paso building permit commercial construction', ['el paso','building permit','commercial'], 3, 'el-paso'],
  ['cst-ep-warehouse', 'GN: EP Warehouse Build', 'El Paso warehouse construction development', ['el paso','warehouse','construction'], 3, 'el-paso'],
  ['cst-ep-industrial', 'GN: EP Industrial Dev', 'El Paso industrial development park construction', ['el paso','industrial','development'], 3, 'el-paso'],
  ['cst-ep-zoning', 'GN: EP Zoning', 'El Paso zoning approval commercial industrial', ['el paso','zoning','approval'], 3, 'el-paso'],
  ['cst-ep-office', 'GN: EP Office Build', 'El Paso office building construction downtown', ['el paso','office','construction'], 4, 'el-paso'],
  ['cst-ep-data-center', 'GN: EP Data Center Build', 'El Paso data center construction campus', ['el paso','data center','construction'], 3, 'el-paso'],
  ['cst-ep-hospital', 'GN: EP Hospital Build', 'El Paso hospital construction healthcare facility', ['el paso','hospital','facility'], 4, 'el-paso'],
  ['cst-ep-road-bridge', 'GN: EP Road Bridge', 'El Paso road bridge construction project infrastructure', ['el paso','road','bridge'], 3, 'el-paso'],
  // Texas construction
  ['cst-tx-factory', 'GN: TX Factory Build', 'Texas factory construction plant expansion', ['texas','factory','construction'], 3, 'texas'],
  ['cst-tx-warehouse', 'GN: TX Warehouse Build', 'Texas warehouse construction logistics center', ['texas','warehouse','logistics center'], 3, 'texas'],
  ['cst-tx-data-center', 'GN: TX Data Center', 'Texas data center construction campus cloud', ['texas','data center','campus'], 3, 'texas'],
  ['cst-tx-semiconductor', 'GN: TX Chip Plant', 'Texas semiconductor fab construction chip plant', ['texas','semiconductor','fab'], 2, 'texas'],
  ['cst-tx-solar-farm', 'GN: TX Solar Build', 'Texas solar farm construction renewable energy', ['texas','solar farm','construction'], 3, 'texas'],
  ['cst-tx-industrial', 'GN: TX Industrial Park', 'Texas industrial park development construction', ['texas','industrial park','development'], 3, 'texas'],
  // National development trends
  ['cst-commercial-dev', 'GN: Commercial Dev', 'commercial real estate development construction industrial', ['commercial','development','industrial'], 3],
  ['cst-onshoring-plant', 'GN: Onshoring Plant', 'onshoring manufacturing plant construction US factory', ['onshoring','plant','factory'], 2],
  ['cst-megaproject', 'GN: Megaproject', 'megaproject construction billion dollar plant factory', ['megaproject','billion','plant'], 3],
  ['cst-ftz-development', 'GN: FTZ Development', 'Foreign Trade Zone development construction expansion', ['ftz','development','expansion'], 4],
];

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE & BORDER COMMERCE (~18 sources)
// Track cross-border trade flows, nearshoring, and port activity
// ═══════════════════════════════════════════════════════════════════════════════

const TRADE_GN: CompactGN[] = [
  // El Paso trade
  ['trd-ep-port-volume', 'GN: EP Port Volume', 'El Paso port entry trade volume commerce', ['el paso','port','trade volume'], 2, 'el-paso'],
  ['trd-ep-bridge-comm', 'GN: EP Bridge Commerce', 'El Paso international bridge commercial crossing trade', ['el paso','bridge','commercial'], 3, 'el-paso'],
  ['trd-ep-export', 'GN: EP Export', 'El Paso export import international trade', ['el paso','export','import'], 3, 'el-paso'],
  ['trd-ep-customs-broker', 'GN: EP Customs Broker', 'El Paso customs broker freight forwarder trade', ['el paso','customs broker','freight'], 3, 'el-paso'],
  // USMCA & cross-border
  ['trd-usmca-tx', 'GN: USMCA TX', 'USMCA Texas Mexico trade agreement impact', ['usmca','texas','mexico'], 2, 'texas'],
  ['trd-usmca-auto', 'GN: USMCA Auto', 'USMCA automotive trade rules origin Mexico', ['usmca','automotive','rules of origin'], 3],
  ['trd-tariff-mexico', 'GN: Tariff Mexico', 'tariff Mexico United States trade commerce import', ['tariff','mexico','import'], 2],
  // Maquiladora & nearshoring
  ['trd-maquila-juarez', 'GN: Maquila Juarez', 'maquiladora Juarez expansion manufacturing plant', ['maquiladora','juarez','expansion'], 2, 'el-paso'],
  ['trd-maquila-auto', 'GN: Maquila Auto', 'maquiladora automotive manufacturing Juarez Chihuahua', ['maquiladora','automotive','chihuahua'], 3, 'el-paso'],
  ['trd-nearshore-tx', 'GN: Nearshore TX', 'nearshoring Mexico Texas manufacturing investment', ['nearshoring','mexico','texas'], 2, 'texas'],
  ['trd-nearshore-elec', 'GN: Nearshore Electronics', 'nearshoring electronics manufacturing Mexico supply chain', ['nearshoring','electronics','supply chain'], 3, 'global'],
  ['trd-friend-shoring', 'GN: Friendshoring', 'friendshoring supply chain ally manufacturing trade', ['friendshoring','supply chain','ally'], 3, 'global'],
  // Cross-border logistics
  ['trd-cross-border-log', 'GN: Cross-Border Log', 'cross-border logistics El Paso Juarez freight', ['cross-border','logistics','freight'], 2, 'el-paso'],
  ['trd-cross-border-ecom', 'GN: Cross-Border Ecom', 'cross-border ecommerce Mexico US marketplace', ['cross-border','ecommerce','marketplace'], 3],
  ['trd-bonded-warehouse', 'GN: Bonded Warehouse', 'bonded warehouse El Paso customs trade facility', ['bonded warehouse','customs','facility'], 4, 'el-paso'],
  // Border trade data
  ['trd-bts-trade', 'GN: BTS Trade Data', 'Bureau Transportation Statistics border crossing trade', ['bts','border crossing','trade data'], 3],
  ['trd-trade-deficit', 'GN: Trade Deficit MX', 'US Mexico trade deficit surplus bilateral', ['trade deficit','mexico','bilateral'], 3],
  ['trd-supply-chain-mx', 'GN: Supply Chain MX', 'Mexico supply chain manufacturing disruption investment', ['mexico','supply chain','investment'], 2, 'global'],
];

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRAMMATIC EXPANSION — generates ~1400 additional sources from topic matrices
// Each matrix combines entities x contexts to produce targeted Google News queries.
// ═══════════════════════════════════════════════════════════════════════════════

type TopicMatrix = {
  prefix: string;
  category: FeedCategory;
  tier: 3 | 4;
  region?: FeedSourceEntry['region'];
  entities: string[];
  contexts: string[];
};

function expandMatrix(m: TopicMatrix): FeedSourceEntry[] {
  const results: FeedSourceEntry[] = [];
  for (const entity of m.entities) {
    for (const context of m.contexts) {
      const slug = `${entity} ${context}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      const id = `${m.prefix}-${slug}`;
      const query = `${entity} ${context}`;
      results.push({
        id,
        name: `GN: ${entity.slice(0, 18)} ${context.slice(0, 10)}`,
        url: GN(query),
        category: m.category,
        tags: query.toLowerCase().split(/\s+/).filter(w => w.length > 2),
        tier: m.tier,
        region: m.region ?? 'national',
      });
    }
  }
  return results;
}

// -- Defense contractors x deal contexts --
const DEF_CONTRACTOR_MATRIX: TopicMatrix = {
  prefix: 'mx-def', category: 'Defense', tier: 3,
  entities: [
    'Lockheed Martin', 'Raytheon RTX', 'Northrop Grumman', 'Boeing Defense',
    'L3Harris', 'General Dynamics', 'BAE Systems', 'SAIC', 'Leidos',
    'Booz Allen Hamilton', 'CACI International', 'Peraton', 'Amentum',
    'Textron Systems', 'Kratos Defense', 'Parsons Corporation', 'ManTech',
    'Science Applications', 'Elbit Systems', 'Leonardo DRS',
    'Curtiss-Wright', 'Mercury Systems', 'Aerojet Rocketdyne',
    'Sierra Nevada Corp', 'V2X Inc', 'KBR Defense', 'Jacobs Engineering',
    'Maxar Technologies', 'Vectrus', 'DXC Technology Defense',
  ],
  contexts: ['contract award', 'Pentagon deal', 'technology deployment', 'earnings revenue', 'hiring jobs'],
};

// -- Cybersecurity vendors x threat contexts --
const CYBER_VENDOR_MATRIX: TopicMatrix = {
  prefix: 'mx-cyb', category: 'Cybersecurity', tier: 3,
  entities: [
    'CrowdStrike', 'Palo Alto Networks', 'Fortinet', 'SentinelOne',
    'Zscaler', 'CyberArk', 'Tenable', 'Qualys', 'Rapid7',
    'Varonis', 'Trellix', 'Abnormal Security', 'Wiz Cloud',
    'Snyk', 'Lacework', 'Dragos ICS', 'Claroty OT',
    'Recorded Future', 'Mandiant Google', 'Proofpoint',
    'Mimecast', 'KnowBe4', 'Secureworks', 'Arctic Wolf',
    'Sophos', 'Trend Micro', 'Check Point', 'WithSecure',
    'Tanium', 'Carbon Black VMware',
  ],
  contexts: ['threat research', 'vulnerability disclosure', 'product launch', 'acquisition deal', 'government contract'],
};

// -- AI companies x application contexts --
const AI_COMPANY_MATRIX: TopicMatrix = {
  prefix: 'mx-ai', category: 'AI/ML', tier: 3,
  entities: [
    'OpenAI', 'Anthropic', 'Google DeepMind', 'Meta AI', 'Microsoft AI',
    'NVIDIA AI', 'AMD AI', 'Intel AI', 'Cerebras', 'Groq',
    'SambaNova', 'Cohere', 'Mistral AI', 'Stability AI', 'Hugging Face',
    'Scale AI', 'Databricks', 'Weights Biases', 'Anyscale Ray',
    'Lightning AI', 'Determined AI', 'Mosaic ML', 'Adept AI',
    'Inflection AI', 'Character AI', 'Runway ML', 'Jasper AI',
    'Copy AI', 'Synthesia', 'DeepL', 'Otter AI', 'Assembly AI',
    'Eleven Labs', 'Midjourney', 'Perplexity AI', 'Glean AI',
  ],
  contexts: ['product launch', 'funding round', 'enterprise deal', 'research paper', 'partnership'],
};

// -- Cloud & enterprise x use case contexts --
const ENTERPRISE_MATRIX: TopicMatrix = {
  prefix: 'mx-ent', category: 'Enterprise', tier: 3,
  entities: [
    'Salesforce', 'ServiceNow', 'Workday', 'SAP', 'Oracle',
    'Snowflake', 'Datadog', 'Splunk', 'MongoDB', 'Confluent',
    'HashiCorp', 'Elastic', 'Twilio', 'Atlassian', 'HubSpot',
    'Zendesk', 'Okta', 'DocuSign', 'Zoom Video', 'Slack',
    'Notion', 'Airtable', 'Monday.com', 'Asana', 'Figma',
    'Vercel', 'Netlify', 'Supabase', 'PlanetScale', 'Neon Database',
    'Retool', 'Appsmith', 'UiPath RPA', 'Automation Anywhere',
    'Pegasystems', 'Appian', 'Coupa Software', 'Verint Systems',
    'NICE Systems', 'Five9', 'RingCentral', 'Genesys Cloud',
  ],
  contexts: ['AI feature', 'enterprise deal', 'product update', 'earnings report', 'acquisition'],
};

// -- Supply chain companies x logistics contexts --
const SUPPLY_MATRIX: TopicMatrix = {
  prefix: 'mx-sc', category: 'Supply Chain', tier: 3,
  entities: [
    'Maersk', 'FedEx', 'UPS', 'DHL', 'Amazon Logistics',
    'XPO Logistics', 'J.B. Hunt', 'C.H. Robinson', 'Kuehne Nagel',
    'Flexport', 'project44', 'FourKites', 'Convoy', 'Uber Freight',
    'TSMC', 'Intel Foundry', 'Samsung Semiconductor', 'Micron',
    'Qualcomm', 'Broadcom', 'Texas Instruments', 'NXP Semi',
    'ON Semiconductor', 'Infineon', 'STMicroelectronics',
    'Applied Materials', 'Lam Research', 'KLA Corporation', 'ASML',
    'Caterpillar', 'Deere John', 'Honeywell Industrial',
  ],
  contexts: ['supply disruption', 'technology upgrade', 'quarterly earnings', 'expansion plan'],
};

// -- Energy companies x sector contexts --
const ENERGY_MATRIX: TopicMatrix = {
  prefix: 'mx-en', category: 'Energy', tier: 3,
  entities: [
    'ExxonMobil', 'Chevron', 'ConocoPhillips', 'Pioneer Natural',
    'NextEra Energy', 'Duke Energy', 'Southern Company', 'Dominion Energy',
    'AES Corporation', 'Enphase Energy', 'SolarEdge', 'First Solar',
    'Sunrun', 'Tesla Energy', 'Bloom Energy', 'Plug Power',
    'Ballard Power', 'Fluence Energy', 'Stem Inc', 'Sunnova',
    'ChargePoint', 'EVgo', 'Blink Charging',
    'NuScale Power', 'Oklo Nuclear', 'X-energy', 'TerraPower',
    'Commonwealth Fusion', 'Helion Energy', 'TAE Technologies',
  ],
  contexts: ['project announcement', 'quarterly earnings', 'technology breakthrough', 'regulatory approval'],
};

// -- Finance companies x deal contexts --
const FINANCE_MATRIX: TopicMatrix = {
  prefix: 'mx-fin', category: 'Finance', tier: 3,
  entities: [
    'JPMorgan Chase', 'Goldman Sachs', 'Morgan Stanley', 'Bank of America',
    'Citigroup', 'Wells Fargo', 'BlackRock', 'Vanguard',
    'Stripe', 'Block Square', 'PayPal', 'Adyen',
    'Plaid', 'Marqeta', 'Green Dot', 'SoFi',
    'Robinhood', 'Coinbase', 'Binance', 'Circle USDC',
    'Affirm', 'Klarna', 'Wise TransferWise',
  ],
  contexts: ['technology investment', 'quarterly earnings', 'regulatory action', 'product launch'],
};

// -- Healthcare companies x medical contexts --
const HEALTH_MATRIX: TopicMatrix = {
  prefix: 'mx-hlt', category: 'General', tier: 3,
  entities: [
    'Epic Systems', 'Cerner Oracle', 'Veeva Systems', 'Teladoc Health',
    'Amwell', 'Doximity', 'Phreesia', 'Health Catalyst',
    'Illumina', 'Moderna', 'BioNTech', 'Regeneron',
    'Intuitive Surgical', 'Medtronic', 'Abbott Labs', 'Stryker',
    'Dexcom', 'Insulet', 'Tandem Diabetes',
    'Tempus AI', 'PathAI', 'Viz AI', 'Butterfly Network',
  ],
  contexts: ['FDA approval', 'clinical trial', 'technology launch', 'partnership deal'],
};

// -- Border & regional El Paso x topic contexts --
const BORDER_MATRIX: TopicMatrix = {
  prefix: 'mx-bor', category: 'General', tier: 3, region: 'el-paso',
  entities: [
    'El Paso Texas', 'Ciudad Juarez', 'Fort Bliss', 'UTEP',
    'Borderplex Alliance', 'El Paso Electric', 'EPWU Water',
    'Sun Metro Transit', 'El Paso Airport', 'William Beaumont Hospital',
    'Las Cruces NM', 'Dona Ana County', 'Otero County NM',
    'Chihuahua Mexico', 'Sunland Park NM',
  ],
  contexts: [
    'technology innovation', 'business development', 'construction project',
    'federal funding', 'economic growth', 'hiring expansion',
  ],
};

// -- Additional defense programs x capability contexts --
const DEF_PROGRAM_MATRIX: TopicMatrix = {
  prefix: 'mx-dp', category: 'Defense', tier: 4,
  entities: [
    'JADC2', 'Project Convergence', 'IVAS Army', 'ABMS Air Force',
    'Project Overmatch Navy', 'Replicator Initiative', 'NGAD fighter',
    'Sentinel ICBM', 'Columbia submarine', 'FLRAA helicopter',
    'Stryker upgrade', 'Bradley replacement', 'LTAMDS radar',
    'IBCS missile defense', 'Patriot upgrade', 'THAAD battery',
    'Iron Dome US', 'Guam defense', 'Pacific Deterrence',
    'INDOPACOM strategy', 'Arctic strategy defense',
  ],
  contexts: ['test milestone', 'contract award', 'budget request', 'deployment timeline'],
};

// -- Global geopolitics x region contexts --
const GEOPOLITICS_MATRIX: TopicMatrix = {
  prefix: 'mx-geo', category: 'Defense', tier: 4, region: 'global',
  entities: [
    'China military', 'Russia military', 'North Korea missile',
    'Iran nuclear', 'Taiwan strait', 'South China Sea',
    'Ukraine war', 'NATO expansion', 'AUKUS pact',
    'India defense', 'Japan defense', 'South Korea military',
    'Saudi Arabia defense', 'UAE military', 'Poland defense',
    'Germany rearmament', 'UK defense', 'France military',
    'Turkey defense', 'Australia defense',
  ],
  contexts: ['technology deal', 'military exercise', 'arms purchase', 'strategic development'],
};

// -- Conference exhibitors x technology contexts --
const CONFERENCE_MATRIX: TopicMatrix = {
  prefix: 'mx-conf', category: 'Supply Chain', tier: 4,
  entities: [
    'MODEX', 'ProMat', 'IMTS', 'Hannover Messe', 'FABTECH',
    'PACK EXPO', 'Automate Show', 'NVIDIA GTC', 'AWS re:Invent',
    'CES', 'AUSA', 'DSEI', 'Sea-Air-Space',
  ],
  contexts: ['new exhibitor', 'product launch', 'award winner', 'startup showcase'],
};

// -- Job market x sector contexts --
const JOBS_MATRIX: TopicMatrix = {
  prefix: 'mx-job', category: 'General', tier: 4, region: 'texas',
  entities: [
    'El Paso Texas', 'Fort Bliss', 'Raytheon', 'L3Harris',
    'Lockheed Martin', 'General Dynamics', 'Amazon', 'FedEx',
    'UTEP', 'William Beaumont', 'El Paso Electric',
  ],
  contexts: ['hiring expansion', 'new jobs', 'workforce development', 'contractor positions'],
};

// -- Construction & permits x project contexts --
const CONSTRUCTION_MATRIX: TopicMatrix = {
  prefix: 'mx-cst', category: 'General', tier: 4, region: 'el-paso',
  entities: [
    'El Paso Texas', 'Ciudad Juarez', 'Las Cruces NM',
    'Sunland Park NM', 'Anthony Texas', 'Horizon City Texas',
    'San Elizario Texas', 'Canutillo Texas',
  ],
  contexts: ['building permit', 'warehouse construction', 'industrial park', 'commercial development'],
};

// -- Expand all matrices --
const EXPANDED_SOURCES: FeedSourceEntry[] = [
  ...expandMatrix(DEF_CONTRACTOR_MATRIX),
  ...expandMatrix(CYBER_VENDOR_MATRIX),
  ...expandMatrix(AI_COMPANY_MATRIX),
  ...expandMatrix(ENTERPRISE_MATRIX),
  ...expandMatrix(SUPPLY_MATRIX),
  ...expandMatrix(ENERGY_MATRIX),
  ...expandMatrix(FINANCE_MATRIX),
  ...expandMatrix(HEALTH_MATRIX),
  ...expandMatrix(BORDER_MATRIX),
  ...expandMatrix(DEF_PROGRAM_MATRIX),
  ...expandMatrix(GEOPOLITICS_MATRIX),
  ...expandMatrix(CONFERENCE_MATRIX),
  ...expandMatrix(JOBS_MATRIX),
  ...expandMatrix(CONSTRUCTION_MATRIX),
];

// ═══════════════════════════════════════════════════════════════════════════════
// ASSEMBLE THE FULL REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const FEED_REGISTRY: FeedSourceEntry[] = [
  ...directEntries('Defense', DEFENSE_DIRECT),
  ...gnEntries('Defense', DEFENSE_GN),
  ...directEntries('Cybersecurity', CYBER_DIRECT),
  ...gnEntries('Cybersecurity', CYBER_GN),
  ...directEntries('AI/ML', AI_DIRECT),
  ...gnEntries('AI/ML', AI_GN),
  ...directEntries('Enterprise', ENTERPRISE_DIRECT),
  ...gnEntries('Enterprise', ENTERPRISE_GN),
  ...directEntries('Supply Chain', SUPPLY_DIRECT),
  ...gnEntries('Supply Chain', SUPPLY_GN),
  ...directEntries('Energy', ENERGY_DIRECT),
  ...gnEntries('Energy', ENERGY_GN),
  ...directEntries('Finance', FINANCE_DIRECT),
  ...gnEntries('Finance', FINANCE_GN),
  ...directEntries('Defense', GOV_DIRECT),   // Gov sources → Defense category as most relevant
  ...gnEntries('General', GOV_GN),
  ...gnEntries('General', BORDER_GN),
  ...directEntries('General', ELPASO_DIRECT),
  ...gnEntries('General', ELPASO_GN),
  ...gnEntries('General', HEALTH_GN),
  ...directEntries('Crime', CRIME_DIRECT),
  ...gnEntries('Crime', CRIME_GN),
  ...directEntries('General', GENERAL_DIRECT),
  ...gnEntries('General', GENERAL_GN),
  ...gnEntries('Supply Chain', CONFERENCE_GN),
  ...gnEntries('General', JOBS_GN),
  ...gnEntries('General', CONSTRUCTION_GN),
  ...gnEntries('Supply Chain', TRADE_GN),
  ...EXPANDED_SOURCES,
  // ─── Mega-registries (~65,000 additional sources) ──────────────────────────
  ...DEFENSE_MEGA_SOURCES,
  ...CYBERSECURITY_MEGA_SOURCES,
  ...AI_ML_MEGA_SOURCES,
  ...ENTERPRISE_MEGA_SOURCES,
  ...SUPPLY_CHAIN_MEGA_SOURCES,
  ...ENERGY_MEGA_SOURCES,
  ...FINANCE_MEGA_SOURCES,
  ...CRIME_MEGA_SOURCES,
  ...GENERAL_MEGA_SOURCES,
];

// Quick lookup by ID
export const REGISTRY_BY_ID = new Map(FEED_REGISTRY.map((s) => [s.id, s]));

// Crime source IDs (superset of original CRIME_SOURCE_IDS)
export const CRIME_SOURCE_IDS = new Set(
  FEED_REGISTRY.filter((s) => s.category === 'Crime').map((s) => s.id),
);

// Source count for logging
export const REGISTRY_COUNT = FEED_REGISTRY.length;
