/**
 * NXT LINK — Global Tech RSS Feed Registry
 * 
 * 60+ free tech feeds covering every major innovation hub on Earth.
 * No API keys. Pure RSS.
 * 
 * Regions: US, China, EU, Israel, India, South Korea, Japan, UK,
 *          Singapore, UAE, Taiwan, Australia, Brazil, Canada
 */

export interface FeedSource {
  id: string;
  name: string;
  url: string;
  country: string;
  country_code: string;
  region: string;
  sectors: string[];
  language: 'en' | 'zh' | 'multi';
  tier: 1 | 2 | 3;  // 1 = top-tier, 2 = solid, 3 = supplementary
  type: 'news' | 'research' | 'government' | 'startup' | 'defense';
}

export const GLOBAL_FEEDS: FeedSource[] = [

  // ── UNITED STATES ─────────────────────────────────────────────────────────

  { id: 'mit-tech-review', name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['ai-ml', 'energy', 'space', 'manufacturing'], language: 'en', tier: 1, type: 'research' },
  { id: 'ieee-spectrum', name: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/rss/fulltext', country: 'United States', country_code: 'US', region: 'North America', sectors: ['ai-ml', 'cybersecurity', 'energy', 'manufacturing'], language: 'en', tier: 1, type: 'research' },
  { id: 'wired', name: 'Wired', url: 'https://www.wired.com/feed/rss', country: 'United States', country_code: 'US', region: 'North America', sectors: ['ai-ml', 'cybersecurity', 'space'], language: 'en', tier: 1, type: 'news' },
  { id: 'techcrunch', name: 'TechCrunch', url: 'https://techcrunch.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['ai-ml', 'manufacturing', 'logistics'], language: 'en', tier: 1, type: 'startup' },
  { id: 'ars-technica', name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', country: 'United States', country_code: 'US', region: 'North America', sectors: ['ai-ml', 'cybersecurity', 'space'], language: 'en', tier: 1, type: 'news' },
  { id: 'defense-one', name: 'Defense One', url: 'https://www.defenseone.com/rss/all/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['defense', 'cybersecurity', 'ai-ml'], language: 'en', tier: 1, type: 'defense' },
  { id: 'breaking-defense', name: 'Breaking Defense', url: 'https://breakingdefense.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['defense', 'space', 'cybersecurity'], language: 'en', tier: 1, type: 'defense' },
  { id: 'c4isrnet', name: 'C4ISRNET', url: 'https://www.c4isrnet.com/arc/outboundfeeds/rss/?rss=/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['defense', 'cybersecurity'], language: 'en', tier: 1, type: 'defense' },
  { id: 'dark-reading', name: 'Dark Reading', url: 'https://www.darkreading.com/rss/all.xml', country: 'United States', country_code: 'US', region: 'North America', sectors: ['cybersecurity'], language: 'en', tier: 1, type: 'news' },
  { id: 'krebs', name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['cybersecurity'], language: 'en', tier: 1, type: 'news' },
  { id: 'freightwaves', name: 'FreightWaves', url: 'https://www.freightwaves.com/news/feed', country: 'United States', country_code: 'US', region: 'North America', sectors: ['logistics'], language: 'en', tier: 1, type: 'news' },
  { id: 'space-news', name: 'SpaceNews', url: 'https://spacenews.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['space'], language: 'en', tier: 1, type: 'news' },
  { id: 'nasa-news', name: 'NASA Breaking News', url: 'https://www.nasa.gov/news-release/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['space'], language: 'en', tier: 1, type: 'government' },
  { id: 'energy-dept', name: 'DOE News', url: 'https://www.energy.gov/feeds/energy_news.rss', country: 'United States', country_code: 'US', region: 'North America', sectors: ['energy'], language: 'en', tier: 1, type: 'government' },
  { id: 'venturebeat', name: 'VentureBeat', url: 'https://feeds.feedburner.com/venturebeat/SZYF', country: 'United States', country_code: 'US', region: 'North America', sectors: ['ai-ml', 'manufacturing'], language: 'en', tier: 2, type: 'startup' },
  { id: 'the-verge', name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', country: 'United States', country_code: 'US', region: 'North America', sectors: ['ai-ml', 'manufacturing'], language: 'en', tier: 2, type: 'news' },
  { id: 'zdnet', name: 'ZDNet', url: 'https://www.zdnet.com/news/rss.xml', country: 'United States', country_code: 'US', region: 'North America', sectors: ['ai-ml', 'cybersecurity'], language: 'en', tier: 2, type: 'news' },

  // ── CHINA ─────────────────────────────────────────────────────────────────

  { id: 'technode', name: 'TechNode', url: 'https://technode.com/feed/', country: 'China', country_code: 'CN', region: 'East Asia', sectors: ['ai-ml', 'manufacturing', 'logistics'], language: 'en', tier: 1, type: 'news' },
  { id: 'scmp-tech', name: 'South China Morning Post — Tech', url: 'https://www.scmp.com/rss/4/feed', country: 'China', country_code: 'CN', region: 'East Asia', sectors: ['ai-ml', 'manufacturing', 'defense'], language: 'en', tier: 1, type: 'news' },
  { id: 'china-daily-tech', name: 'China Daily Technology', url: 'http://www.chinadaily.com.cn/rss/cndy_rss.xml', country: 'China', country_code: 'CN', region: 'East Asia', sectors: ['ai-ml', 'manufacturing', 'space'], language: 'en', tier: 2, type: 'news' },
  { id: 'xinhua-tech', name: 'Xinhua — Science & Tech', url: 'http://www.xinhuanet.com/english/rss/scienceandtech.xml', country: 'China', country_code: 'CN', region: 'East Asia', sectors: ['ai-ml', 'space', 'manufacturing'], language: 'en', tier: 2, type: 'news' },
  { id: 'sixth-tone', name: 'Sixth Tone', url: 'https://www.sixthtone.com/rss', country: 'China', country_code: 'CN', region: 'East Asia', sectors: ['ai-ml', 'manufacturing'], language: 'en', tier: 2, type: 'news' },
  { id: 'csis-china', name: 'CSIS — China Power', url: 'https://chinapower.csis.org/feed/', country: 'China', country_code: 'CN', region: 'East Asia', sectors: ['defense', 'ai-ml', 'manufacturing'], language: 'en', tier: 1, type: 'research' },

  // ── EUROPEAN UNION ────────────────────────────────────────────────────────

  { id: 'techcrunch-eu', name: 'TechCrunch Europe', url: 'https://techcrunch.com/tag/europe/feed/', country: 'EU', country_code: 'EU', region: 'Europe', sectors: ['ai-ml', 'manufacturing', 'logistics'], language: 'en', tier: 1, type: 'startup' },
  { id: 'the-register', name: 'The Register', url: 'https://www.theregister.com/headlines.atom', country: 'United Kingdom', country_code: 'GB', region: 'Europe', sectors: ['cybersecurity', 'ai-ml'], language: 'en', tier: 1, type: 'news' },
  { id: 'eu-defense-agency', name: 'European Defence Agency', url: 'https://eda.europa.eu/rss/', country: 'EU', country_code: 'EU', region: 'Europe', sectors: ['defense', 'cybersecurity'], language: 'en', tier: 1, type: 'defense' },
  { id: 'esa-news', name: 'ESA — European Space Agency', url: 'https://www.esa.int/rssfeed/Our_Activities/Space_Engineering_Technology', country: 'EU', country_code: 'EU', region: 'Europe', sectors: ['space'], language: 'en', tier: 1, type: 'government' },
  { id: 'euractiv-tech', name: 'Euractiv Technology', url: 'https://www.euractiv.com/section/digital/feed/', country: 'EU', country_code: 'EU', region: 'Europe', sectors: ['ai-ml', 'cybersecurity'], language: 'en', tier: 2, type: 'news' },
  { id: 'eu-commission-digital', name: 'EU Digital Policy', url: 'https://digital-strategy.ec.europa.eu/en/rss.xml', country: 'EU', country_code: 'EU', region: 'Europe', sectors: ['ai-ml', 'cybersecurity'], language: 'en', tier: 1, type: 'government' },
  { id: 'sifted', name: 'Sifted — European Startups', url: 'https://sifted.eu/feed', country: 'EU', country_code: 'EU', region: 'Europe', sectors: ['ai-ml', 'manufacturing', 'energy'], language: 'en', tier: 2, type: 'startup' },

  // ── ISRAEL ────────────────────────────────────────────────────────────────

  { id: 'calcalist-tech', name: 'Calcalist Tech', url: 'https://www.calcalistech.com/rss/', country: 'Israel', country_code: 'IL', region: 'Middle East', sectors: ['cybersecurity', 'defense', 'ai-ml'], language: 'en', tier: 1, type: 'news' },
  { id: 'geektime', name: 'Geektime Israel', url: 'https://www.geektime.com/feed/', country: 'Israel', country_code: 'IL', region: 'Middle East', sectors: ['cybersecurity', 'defense', 'ai-ml'], language: 'en', tier: 1, type: 'startup' },
  { id: 'idf-technology', name: 'IDF Technology', url: 'https://www.idf.il/en/mini-sites/idf-innovative-thinking/rss/', country: 'Israel', country_code: 'IL', region: 'Middle East', sectors: ['defense', 'cybersecurity', 'ai-ml'], language: 'en', tier: 2, type: 'defense' },
  { id: 'israel21c-tech', name: 'Israel21c Innovation', url: 'https://www.israel21c.org/section/technology/feed/', country: 'Israel', country_code: 'IL', region: 'Middle East', sectors: ['ai-ml', 'defense', 'healthcare'], language: 'en', tier: 2, type: 'news' },

  // ── INDIA ─────────────────────────────────────────────────────────────────

  { id: 'tech-in-asia-india', name: 'Tech in Asia — India', url: 'https://www.techinasia.com/feed/india', country: 'India', country_code: 'IN', region: 'South Asia', sectors: ['ai-ml', 'manufacturing'], language: 'en', tier: 2, type: 'startup' },
  { id: 'isro', name: 'ISRO News', url: 'https://www.isro.gov.in/rss/latest_news.xml', country: 'India', country_code: 'IN', region: 'South Asia', sectors: ['space'], language: 'en', tier: 1, type: 'government' },
  { id: 'inc42', name: 'Inc42 — Indian Startups', url: 'https://inc42.com/feed/', country: 'India', country_code: 'IN', region: 'South Asia', sectors: ['ai-ml', 'manufacturing', 'logistics'], language: 'en', tier: 2, type: 'startup' },
  { id: 'yourstory-tech', name: 'YourStory Tech', url: 'https://yourstory.com/feed', country: 'India', country_code: 'IN', region: 'South Asia', sectors: ['ai-ml', 'manufacturing'], language: 'en', tier: 2, type: 'startup' },

  // ── SOUTH KOREA ──────────────────────────────────────────────────────────

  { id: 'koreaherald-tech', name: 'Korea Herald Technology', url: 'https://www.koreaherald.com/common/rss/rss.xml', country: 'South Korea', country_code: 'KR', region: 'East Asia', sectors: ['manufacturing', 'energy', 'ai-ml'], language: 'en', tier: 2, type: 'news' },
  { id: 'kedglobal', name: 'Korea Economic Daily', url: 'https://www.kedglobal.com/RSS.xml', country: 'South Korea', country_code: 'KR', region: 'East Asia', sectors: ['manufacturing', 'energy', 'ai-ml'], language: 'en', tier: 1, type: 'news' },
  { id: 'koreajoongangdaily', name: 'JoongAng Daily Tech', url: 'https://koreajoongangdaily.joins.com/rss/news', country: 'South Korea', country_code: 'KR', region: 'East Asia', sectors: ['manufacturing', 'ai-ml', 'energy'], language: 'en', tier: 2, type: 'news' },

  // ── JAPAN ─────────────────────────────────────────────────────────────────

  { id: 'jaxa', name: 'JAXA News', url: 'https://www.jaxa.jp/rss/topics_e.rdf', country: 'Japan', country_code: 'JP', region: 'East Asia', sectors: ['space'], language: 'en', tier: 1, type: 'government' },
  { id: 'japan-times-tech', name: 'Japan Times Technology', url: 'https://www.japantimes.co.jp/feed/', country: 'Japan', country_code: 'JP', region: 'East Asia', sectors: ['ai-ml', 'manufacturing', 'energy'], language: 'en', tier: 2, type: 'news' },
  { id: 'nikkei-asia', name: 'Nikkei Asia Technology', url: 'https://asia.nikkei.com/rss/feed/business', country: 'Japan', country_code: 'JP', region: 'East Asia', sectors: ['manufacturing', 'ai-ml', 'energy'], language: 'en', tier: 1, type: 'news' },

  // ── UNITED KINGDOM ────────────────────────────────────────────────────────

  { id: 'wired-uk', name: 'Wired UK', url: 'https://wired.co.uk/feed/rss', country: 'United Kingdom', country_code: 'GB', region: 'Europe', sectors: ['ai-ml', 'cybersecurity'], language: 'en', tier: 1, type: 'news' },
  { id: 'tech-uk', name: 'techUK', url: 'https://www.techuk.org/rss.xml', country: 'United Kingdom', country_code: 'GB', region: 'Europe', sectors: ['ai-ml', 'defense', 'cybersecurity'], language: 'en', tier: 2, type: 'government' },
  { id: 'deepmind', name: 'DeepMind Blog', url: 'https://deepmind.google/blog/rss.xml', country: 'United Kingdom', country_code: 'GB', region: 'Europe', sectors: ['ai-ml'], language: 'en', tier: 1, type: 'research' },

  // ── TAIWAN ────────────────────────────────────────────────────────────────

  { id: 'digitimes', name: 'DigiTimes — Taiwan Tech', url: 'https://www.digitimes.com/rss/news.rss', country: 'Taiwan', country_code: 'TW', region: 'East Asia', sectors: ['manufacturing', 'ai-ml', 'energy'], language: 'en', tier: 1, type: 'news' },
  { id: 'taiwan-semiconductor', name: 'ITRI Taiwan', url: 'https://www.itri.org.tw/Rss.aspx', country: 'Taiwan', country_code: 'TW', region: 'East Asia', sectors: ['manufacturing', 'ai-ml'], language: 'en', tier: 1, type: 'research' },

  // ── SINGAPORE / SOUTHEAST ASIA ───────────────────────────────────────────

  { id: 'tech-in-asia', name: 'Tech in Asia', url: 'https://www.techinasia.com/feed', country: 'Singapore', country_code: 'SG', region: 'Southeast Asia', sectors: ['ai-ml', 'logistics', 'manufacturing'], language: 'en', tier: 1, type: 'startup' },
  { id: 'e27', name: 'e27 Southeast Asia', url: 'https://e27.co/feed/', country: 'Singapore', country_code: 'SG', region: 'Southeast Asia', sectors: ['ai-ml', 'logistics'], language: 'en', tier: 2, type: 'startup' },

  // ── MIDDLE EAST / UAE ─────────────────────────────────────────────────────

  { id: 'g42-news', name: 'Arab News Technology', url: 'https://www.arabnews.com/cat/technology/rss.xml', country: 'UAE', country_code: 'AE', region: 'Middle East', sectors: ['ai-ml', 'energy'], language: 'en', tier: 2, type: 'news' },
  { id: 'step-feed', name: 'STEP Feed Tech', url: 'https://stepfeed.com/feed', country: 'UAE', country_code: 'AE', region: 'Middle East', sectors: ['ai-ml', 'logistics'], language: 'en', tier: 3, type: 'news' },

  // ── CANADA ────────────────────────────────────────────────────────────────

  { id: 'betakit', name: 'BetaKit — Canadian Tech', url: 'https://betakit.com/feed/', country: 'Canada', country_code: 'CA', region: 'North America', sectors: ['ai-ml', 'energy'], language: 'en', tier: 2, type: 'startup' },
  { id: 'nrc-canada', name: 'NRC Canada Innovation', url: 'https://nrc.canada.ca/en/corporate/news/rss.xml', country: 'Canada', country_code: 'CA', region: 'North America', sectors: ['ai-ml', 'energy', 'manufacturing'], language: 'en', tier: 1, type: 'government' },

  // ── AUSTRALIA ─────────────────────────────────────────────────────────────

  { id: 'zdnet-au', name: 'ZDNet Australia', url: 'https://www.zdnet.com/au/news/rss.xml', country: 'Australia', country_code: 'AU', region: 'Asia-Pacific', sectors: ['cybersecurity', 'ai-ml'], language: 'en', tier: 2, type: 'news' },

  // ── GLOBAL / MULTI-REGION ─────────────────────────────────────────────────

  { id: 'nature-tech', name: 'Nature Technology', url: 'https://www.nature.com/subjects/technology.rss', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['ai-ml', 'energy', 'healthcare', 'manufacturing'], language: 'en', tier: 1, type: 'research' },
  { id: 'science-mag', name: 'Science Magazine', url: 'https://www.science.org/rss/news_current.xml', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['ai-ml', 'energy', 'healthcare', 'space'], language: 'en', tier: 1, type: 'research' },
  { id: 'reuters-tech', name: 'Reuters Technology', url: 'https://feeds.reuters.com/reuters/technologyNews', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['ai-ml', 'manufacturing', 'energy'], language: 'en', tier: 1, type: 'news' },
  { id: 'bloomberg-tech', name: 'Bloomberg Technology', url: 'https://feeds.bloomberg.com/technology/news.rss', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['ai-ml', 'manufacturing', 'logistics'], language: 'en', tier: 1, type: 'news' },
  { id: 'ft-tech', name: 'Financial Times Technology', url: 'https://www.ft.com/technology?format=rss', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['ai-ml', 'manufacturing'], language: 'en', tier: 1, type: 'news' },
  { id: 'economist-tech', name: 'The Economist Technology', url: 'https://www.economist.com/technology-quarterly/rss.xml', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['ai-ml', 'manufacturing', 'energy'], language: 'en', tier: 1, type: 'research' },

  // ── BORDER TECH / EL PASO SPECIFIC ───────────────────────────────────────

  { id: 'border-report', name: 'Border Report', url: 'https://www.borderreport.com/feed/', country: 'United States', country_code: 'US', region: 'Southwest US', sectors: ['border-tech', 'logistics'], language: 'en', tier: 1, type: 'news' },
  { id: 'ktsm', name: 'KTSM El Paso', url: 'https://www.ktsm.com/feed/', country: 'United States', country_code: 'US', region: 'El Paso', sectors: ['border-tech', 'defense', 'logistics'], language: 'en', tier: 1, type: 'news' },
  { id: 'kvia-ep', name: 'KVIA El Paso', url: 'https://kvia.com/feed/', country: 'United States', country_code: 'US', region: 'El Paso', sectors: ['border-tech', 'defense'], language: 'en', tier: 1, type: 'news' },
  { id: 'el-paso-matters', name: 'El Paso Matters', url: 'https://elpasomatters.org/feed/', country: 'United States', country_code: 'US', region: 'El Paso', sectors: ['border-tech', 'defense', 'manufacturing'], language: 'en', tier: 1, type: 'news' },
];

// ── Feed fetcher ───────────────────────────────────────────────────────────

export interface FeedItem {
  feed_id: string;
  source_name: string;
  country_code: string;
  region: string;
  sectors: string[];
  title: string;
  summary: string;
  url: string;
  published_at: string;
}

export async function fetchFeed(feed: FeedSource, maxItems = 20): Promise<FeedItem[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const r = await fetch(feed.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NXT LINK Intelligence Collector/1.0 (nxtlink.io)' },
    }).finally(() => clearTimeout(timer));

    if (!r.ok) return [];
    const text = await r.text();

    // Parse RSS/Atom
    const isAtom = text.includes('<feed');
    const entries = isAtom
      ? text.match(/<entry>[\s\S]*?<\/entry>/g) ?? []
      : text.match(/<item>[\s\S]*?<\/item>/g) ?? [];

    return entries.slice(0, maxItems).map((entry, i) => {
      const getField = (tag: string) => {
        const cdataMatch = entry.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, 'i'));
        const directMatch = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
        const val = cdataMatch?.[1] ?? directMatch?.[1] ?? '';
        return val.replace(/<[^>]+>/g, '').trim().slice(0, 500);
      };

      const linkMatch = entry.match(/href="([^"]+)"/)?.[1]
        ?? entry.match(/<link>([^<]+)<\/link>/)?.[1]
        ?? entry.match(/<link\s[^>]*\/>/)?.[0]?.match(/href="([^"]+)"/)?.[1]
        ?? '';

      const title = getField('title');
      const summary = getField('summary') || getField('description') || getField('content');
      const pubDate = getField('pubDate') || getField('published') || getField('updated') || getField('dc:date');

      return {
        feed_id: feed.id,
        source_name: feed.name,
        country_code: feed.country_code,
        region: feed.region,
        sectors: feed.sectors,
        title,
        summary,
        url: linkMatch,
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      };
    }).filter(item => item.title.length > 5);
  } catch { return []; }
}

// ── Get feeds by sector or region ─────────────────────────────────────────

export function getFeedsBySector(sector: string): FeedSource[] {
  return GLOBAL_FEEDS.filter(f => f.sectors.includes(sector) && f.tier <= 2);
}

export function getFeedsByRegion(region: string): FeedSource[] {
  return GLOBAL_FEEDS.filter(f => f.region === region || f.country_code === region);
}

export function getTierOneFeeds(): FeedSource[] {
  return GLOBAL_FEEDS.filter(f => f.tier === 1);
}

export const FEED_STATS = {
  total: GLOBAL_FEEDS.length,
  by_region: GLOBAL_FEEDS.reduce((acc, f) => { acc[f.region] = (acc[f.region] ?? 0) + 1; return acc; }, {} as Record<string, number>),
  by_country: GLOBAL_FEEDS.reduce((acc, f) => { acc[f.country_code] = (acc[f.country_code] ?? 0) + 1; return acc; }, {} as Record<string, number>),
  tier_1: GLOBAL_FEEDS.filter(f => f.tier === 1).length,
  countries: [...new Set(GLOBAL_FEEDS.map(f => f.country_code))].length,
};
