// @ts-nocheck
/**
 * NXT LINK — World Sources Registry
 * 
 * 500+ direct RSS/Atom feeds from the world's best science,
 * technology, innovation, research, and intelligence publications.
 * 
 * Covers: US, China, EU, Israel, India, Korea, Japan, UK, Australia,
 *         Singapore, Canada, Brazil, Taiwan, UAE, South Africa
 * 
 * Categories: AI, Defense, Cybersecurity, Space, Climate, Agriculture,
 *             Life Sciences, Quantum, Energy, Ocean, Materials, Neuro,
 *             Fintech, Logistics, Manufacturing, Border Tech, Startups
 */

export interface WorldSource {
  id: string;
  name: string;
  url: string;
  country: string;
  country_code: string;
  region: string;
  sectors: string[];
  type: 'journal' | 'news' | 'government' | 'startup' | 'institution' | 'wire';
  tier: 1 | 2 | 3;
  humanity_impact: 'transformative' | 'significant' | 'moderate';
  active: boolean;
}

export const WORLD_SOURCES: WorldSource[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 1 — SCIENCE & RESEARCH (highest signal quality)
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'nature', name: 'Nature', url: 'https://www.nature.com/nature.rss', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['ai-ml', 'life-sciences', 'quantum', 'climate-tech', 'synthetic-bio', 'energy'], type: 'journal', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'science-mag', name: 'Science Magazine', url: 'https://www.science.org/rss/news_current.xml', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['life-sciences', 'climate-tech', 'ai-ml', 'quantum', 'space', 'agriculture'], type: 'journal', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'nature-news', name: 'Nature News & Comment', url: 'https://www.nature.com/news.rss', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['ai-ml', 'life-sciences', 'climate-tech', 'quantum'], type: 'journal', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'cell', name: 'Cell Journal', url: 'https://www.cell.com/cell/current.rss', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['life-sciences', 'synthetic-bio', 'neural-tech'], type: 'journal', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'nejm', name: 'New England Journal of Medicine', url: 'https://www.nejm.org/action/showFeed?jc=nejmoa&type=etoc&feed=rss', country: 'United States', country_code: 'US', region: 'North America', sectors: ['life-sciences'], type: 'journal', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'pnas', name: 'PNAS', url: 'https://www.pnas.org/action/showFeed?type=etoc&feed=rss&jc=pnas', country: 'United States', country_code: 'US', region: 'North America', sectors: ['life-sciences', 'climate-tech', 'quantum', 'ai-ml'], type: 'journal', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'ieee-spectrum', name: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/rss/fulltext', country: 'United States', country_code: 'US', region: 'North America', sectors: ['ai-ml', 'quantum', 'energy', 'manufacturing', 'cybersecurity'], type: 'journal', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'mit-tech', name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['ai-ml', 'quantum', 'energy', 'life-sciences', 'climate-tech'], type: 'news', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'new-scientist', name: 'New Scientist', url: 'https://www.newscientist.com/feed/home/?cmpid=RSS|NSNS|2012-GLOBAL|home', country: 'United Kingdom', country_code: 'GB', region: 'Europe', sectors: ['life-sciences', 'space', 'quantum', 'climate-tech', 'ai-ml'], type: 'journal', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'sci-am', name: 'Scientific American', url: 'https://www.scientificamerican.com/feed/blogs/rss/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['life-sciences', 'climate-tech', 'ai-ml', 'quantum', 'space'], type: 'journal', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'the-lancet', name: 'The Lancet', url: 'https://www.thelancet.com/action/showFeed?jc=lancet&type=etoc&feed=rss', country: 'United Kingdom', country_code: 'GB', region: 'Europe', sectors: ['life-sciences'], type: 'journal', tier: 1, humanity_impact: 'transformative', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 1 — AI & TECHNOLOGY
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'wired', name: 'Wired', url: 'https://www.wired.com/feed/rss', country: 'United States', country_code: 'US', region: 'North America', sectors: ['ai-ml', 'cybersecurity', 'space', 'life-sciences'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'ars-technica', name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', country: 'United States', country_code: 'US', region: 'North America', sectors: ['ai-ml', 'cybersecurity', 'space', 'energy'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'techcrunch', name: 'TechCrunch', url: 'https://techcrunch.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['ai-ml', 'manufacturing', 'logistics', 'life-sciences'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'the-verge', name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', country: 'United States', country_code: 'US', region: 'North America', sectors: ['ai-ml', 'neural-tech', 'manufacturing'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'venturebeat', name: 'VentureBeat AI', url: 'https://feeds.feedburner.com/venturebeat/SZYF', country: 'United States', country_code: 'US', region: 'North America', sectors: ['ai-ml', 'manufacturing'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'deepmind-blog', name: 'Google DeepMind Blog', url: 'https://deepmind.google/blog/rss.xml', country: 'United Kingdom', country_code: 'GB', region: 'Europe', sectors: ['ai-ml', 'life-sciences', 'climate-tech'], type: 'institution', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'openai-blog', name: 'OpenAI Research', url: 'https://openai.com/blog/rss.xml', country: 'United States', country_code: 'US', region: 'North America', sectors: ['ai-ml', 'neural-tech'], type: 'institution', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'anthropic-news', name: 'Anthropic News', url: 'https://www.anthropic.com/news/rss', country: 'United States', country_code: 'US', region: 'North America', sectors: ['ai-ml'], type: 'institution', tier: 1, humanity_impact: 'transformative', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 1 — GLOBAL NEWS WIRES
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'reuters-tech', name: 'Reuters Technology', url: 'https://feeds.reuters.com/reuters/technologyNews', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['ai-ml', 'manufacturing', 'energy', 'logistics'], type: 'wire', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'reuters-science', name: 'Reuters Science', url: 'https://feeds.reuters.com/reuters/scienceNews', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['life-sciences', 'climate-tech', 'space'], type: 'wire', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'ap-tech', name: 'AP Technology', url: 'https://feeds.apnews.com/rss/apf-technology', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['ai-ml', 'cybersecurity', 'manufacturing'], type: 'wire', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'bloomberg-tech', name: 'Bloomberg Technology', url: 'https://feeds.bloomberg.com/technology/news.rss', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['ai-ml', 'manufacturing', 'energy', 'logistics'], type: 'wire', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'ft-tech', name: 'Financial Times — Technology', url: 'https://www.ft.com/technology?format=rss', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['ai-ml', 'manufacturing', 'energy'], type: 'wire', tier: 1, humanity_impact: 'significant', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 1 — DEFENSE & SECURITY
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'defense-one', name: 'Defense One', url: 'https://www.defenseone.com/rss/all/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['defense', 'cybersecurity', 'ai-ml', 'space'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'breaking-defense', name: 'Breaking Defense', url: 'https://breakingdefense.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['defense', 'space', 'cybersecurity'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'c4isrnet', name: 'C4ISRNET', url: 'https://www.c4isrnet.com/arc/outboundfeeds/rss/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['defense', 'cybersecurity', 'ai-ml'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'sipri-news', name: 'SIPRI News', url: 'https://www.sipri.org/news/feed', country: 'Sweden', country_code: 'SE', region: 'Europe', sectors: ['defense'], type: 'institution', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'darpa', name: 'DARPA Announcements', url: 'https://www.darpa.mil/news-events/announcements.atom', country: 'United States', country_code: 'US', region: 'North America', sectors: ['defense', 'ai-ml', 'quantum', 'synthetic-bio'], type: 'government', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'army-al-t', name: 'Army AL&T Magazine', url: 'https://www.asc.army.mil/docs/pubs/alt/rss.xml', country: 'United States', country_code: 'US', region: 'North America', sectors: ['defense', 'manufacturing'], type: 'government', tier: 1, humanity_impact: 'significant', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 1 — SPACE
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'space-news', name: 'SpaceNews', url: 'https://spacenews.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['space'], type: 'news', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'nasa-breaking', name: 'NASA News', url: 'https://www.nasa.gov/news-release/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['space', 'ai-ml', 'climate-tech'], type: 'government', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'esa-news', name: 'ESA News', url: 'https://www.esa.int/rssfeed/Our_Activities/Space_Engineering_Technology', country: 'EU', country_code: 'EU', region: 'Europe', sectors: ['space', 'climate-tech'], type: 'government', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'isro', name: 'ISRO News', url: 'https://www.isro.gov.in/rss/latest_news.xml', country: 'India', country_code: 'IN', region: 'South Asia', sectors: ['space'], type: 'government', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'jaxa', name: 'JAXA News', url: 'https://www.jaxa.jp/rss/topics_e.rdf', country: 'Japan', country_code: 'JP', region: 'East Asia', sectors: ['space', 'manufacturing'], type: 'government', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'space-com', name: 'Space.com', url: 'https://www.space.com/feeds/all', country: 'United States', country_code: 'US', region: 'North America', sectors: ['space'], type: 'news', tier: 1, humanity_impact: 'transformative', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 1 — ENERGY & CLIMATE
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'iea-news', name: 'IEA News', url: 'https://www.iea.org/rss/news.xml', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['energy', 'climate-tech', 'renewable-energy'], type: 'institution', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'irena', name: 'IRENA News', url: 'https://www.irena.org/rss/News.xml', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['renewable-energy', 'energy'], type: 'institution', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'cleantechnica', name: 'CleanTechnica', url: 'https://cleantechnica.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['renewable-energy', 'energy', 'manufacturing'], type: 'news', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'electrek', name: 'Electrek', url: 'https://electrek.co/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['renewable-energy', 'energy', 'manufacturing'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'pv-magazine', name: 'PV Magazine Solar', url: 'https://www.pv-magazine.com/feed/', country: 'Germany', country_code: 'DE', region: 'Europe', sectors: ['renewable-energy', 'energy'], type: 'news', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'nasa-climate', name: 'NASA Climate', url: 'https://climate.nasa.gov/news/rss.xml', country: 'United States', country_code: 'US', region: 'North America', sectors: ['climate-tech', 'space'], type: 'government', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'noaa-news', name: 'NOAA News', url: 'https://www.noaa.gov/media-releases.rss', country: 'United States', country_code: 'US', region: 'North America', sectors: ['climate-tech', 'agriculture'], type: 'government', tier: 1, humanity_impact: 'transformative', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 1 — AGRICULTURE & FOOD
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'fao-news', name: 'FAO News', url: 'https://www.fao.org/newsroom/rss/en/', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['agriculture', 'climate-tech'], type: 'institution', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'usda-news', name: 'USDA News', url: 'https://www.usda.gov/rss/home.xml', country: 'United States', country_code: 'US', region: 'North America', sectors: ['agriculture'], type: 'government', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'agfunder', name: 'AgFunder News', url: 'https://agfundernews.com/feed', country: 'United States', country_code: 'US', region: 'North America', sectors: ['agriculture', 'life-sciences'], type: 'news', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'food-navigator', name: 'Food Navigator', url: 'https://www.foodnavigator.com/rss/news', country: 'United Kingdom', country_code: 'GB', region: 'Europe', sectors: ['agriculture', 'synthetic-bio'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'modern-farmer', name: 'Modern Farmer', url: 'https://modernfarmer.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['agriculture'], type: 'news', tier: 2, humanity_impact: 'significant', active: true },
  { id: 'the-spoon', name: 'The Spoon — Food Tech', url: 'https://thespoon.tech/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['agriculture', 'synthetic-bio'], type: 'news', tier: 2, humanity_impact: 'significant', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 1 — CYBERSECURITY
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'dark-reading', name: 'Dark Reading', url: 'https://www.darkreading.com/rss/all.xml', country: 'United States', country_code: 'US', region: 'North America', sectors: ['cybersecurity'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'krebs', name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['cybersecurity'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'cyberscoop', name: 'CyberScoop', url: 'https://cyberscoop.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['cybersecurity', 'defense'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'bleeping-computer', name: 'Bleeping Computer', url: 'https://www.bleepingcomputer.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['cybersecurity'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'threatpost', name: 'Threatpost', url: 'https://threatpost.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['cybersecurity'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 1 — CHINA TECH (English-language coverage)
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'technode', name: 'TechNode China', url: 'https://technode.com/feed/', country: 'China', country_code: 'CN', region: 'East Asia', sectors: ['ai-ml', 'manufacturing', 'logistics', 'renewable-energy'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'scmp-tech', name: 'SCMP Technology', url: 'https://www.scmp.com/rss/4/feed', country: 'China', country_code: 'CN', region: 'East Asia', sectors: ['ai-ml', 'manufacturing', 'defense', 'space'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'csis-china', name: 'CSIS China Power', url: 'https://chinapower.csis.org/feed/', country: 'China', country_code: 'CN', region: 'East Asia', sectors: ['defense', 'ai-ml', 'manufacturing', 'space'], type: 'institution', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'china-daily-tech', name: 'China Daily Tech', url: 'http://www.chinadaily.com.cn/rss/cndy_rss.xml', country: 'China', country_code: 'CN', region: 'East Asia', sectors: ['ai-ml', 'manufacturing', 'space', 'renewable-energy'], type: 'news', tier: 2, humanity_impact: 'significant', active: true },
  { id: 'xinhua-sci', name: 'Xinhua Science & Tech', url: 'http://www.xinhuanet.com/english/rss/scienceandtech.xml', country: 'China', country_code: 'CN', region: 'East Asia', sectors: ['ai-ml', 'space', 'manufacturing'], type: 'wire', tier: 2, humanity_impact: 'significant', active: true },
  { id: 'sixth-tone', name: 'Sixth Tone', url: 'https://www.sixthtone.com/rss', country: 'China', country_code: 'CN', region: 'East Asia', sectors: ['ai-ml', 'manufacturing'], type: 'news', tier: 2, humanity_impact: 'moderate', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 1 — ISRAEL DEFENSE TECH
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'calcalist-tech', name: 'Calcalist Tech', url: 'https://www.calcalistech.com/rss/', country: 'Israel', country_code: 'IL', region: 'Middle East', sectors: ['cybersecurity', 'defense', 'ai-ml'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'geektime', name: 'Geektime Israel', url: 'https://www.geektime.com/feed/', country: 'Israel', country_code: 'IL', region: 'Middle East', sectors: ['cybersecurity', 'defense', 'ai-ml'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'israel21c', name: 'Israel21c Innovation', url: 'https://www.israel21c.org/section/technology/feed/', country: 'Israel', country_code: 'IL', region: 'Middle East', sectors: ['ai-ml', 'defense', 'life-sciences', 'agriculture'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 1 — EUROPE
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'the-register', name: 'The Register', url: 'https://www.theregister.com/headlines.atom', country: 'United Kingdom', country_code: 'GB', region: 'Europe', sectors: ['cybersecurity', 'ai-ml', 'quantum'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'eu-defense-agency', name: 'European Defence Agency', url: 'https://eda.europa.eu/rss/', country: 'EU', country_code: 'EU', region: 'Europe', sectors: ['defense', 'cybersecurity'], type: 'government', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'eu-digital', name: 'EU Digital Strategy', url: 'https://digital-strategy.ec.europa.eu/en/rss.xml', country: 'EU', country_code: 'EU', region: 'Europe', sectors: ['ai-ml', 'cybersecurity', 'quantum'], type: 'government', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'sifted', name: 'Sifted EU Startups', url: 'https://sifted.eu/feed', country: 'EU', country_code: 'EU', region: 'Europe', sectors: ['ai-ml', 'renewable-energy', 'manufacturing', 'life-sciences'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'wired-uk', name: 'Wired UK', url: 'https://wired.co.uk/feed/rss', country: 'United Kingdom', country_code: 'GB', region: 'Europe', sectors: ['ai-ml', 'cybersecurity', 'life-sciences'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'euractiv-dig', name: 'Euractiv Digital', url: 'https://www.euractiv.com/section/digital/feed/', country: 'EU', country_code: 'EU', region: 'Europe', sectors: ['ai-ml', 'cybersecurity'], type: 'news', tier: 2, humanity_impact: 'significant', active: true },
  { id: 'cern-news', name: 'CERN News', url: 'https://home.cern/news/news/feed', country: 'Switzerland', country_code: 'CH', region: 'Europe', sectors: ['quantum', 'ai-ml'], type: 'institution', tier: 1, humanity_impact: 'transformative', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 1 — INDIA
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'inc42', name: 'Inc42 India Tech', url: 'https://inc42.com/feed/', country: 'India', country_code: 'IN', region: 'South Asia', sectors: ['ai-ml', 'manufacturing', 'logistics', 'agriculture'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'yourstory', name: 'YourStory', url: 'https://yourstory.com/feed', country: 'India', country_code: 'IN', region: 'South Asia', sectors: ['ai-ml', 'agriculture', 'manufacturing'], type: 'news', tier: 2, humanity_impact: 'significant', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 1 — SOUTH KOREA
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'ked-global', name: 'Korea Economic Daily', url: 'https://www.kedglobal.com/RSS.xml', country: 'South Korea', country_code: 'KR', region: 'East Asia', sectors: ['manufacturing', 'renewable-energy', 'ai-ml'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'korea-herald', name: 'Korea Herald Tech', url: 'https://www.koreaherald.com/common/rss/rss.xml', country: 'South Korea', country_code: 'KR', region: 'East Asia', sectors: ['manufacturing', 'ai-ml', 'renewable-energy'], type: 'news', tier: 2, humanity_impact: 'significant', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 1 — JAPAN
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'nikkei-asia', name: 'Nikkei Asia Tech', url: 'https://asia.nikkei.com/rss/feed/business', country: 'Japan', country_code: 'JP', region: 'East Asia', sectors: ['manufacturing', 'ai-ml', 'renewable-energy', 'space'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 1 — LOGISTICS & SUPPLY CHAIN
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'freightwaves', name: 'FreightWaves', url: 'https://www.freightwaves.com/news/feed', country: 'United States', country_code: 'US', region: 'North America', sectors: ['logistics'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'joc', name: 'Journal of Commerce', url: 'https://www.joc.com/rss', country: 'United States', country_code: 'US', region: 'North America', sectors: ['logistics'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'transport-topics', name: 'Transport Topics', url: 'https://www.ttnews.com/rss.xml', country: 'United States', country_code: 'US', region: 'North America', sectors: ['logistics', 'manufacturing'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'border-report', name: 'Border Report', url: 'https://www.borderreport.com/feed/', country: 'United States', country_code: 'US', region: 'Southwest US', sectors: ['border-tech', 'logistics'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 2 — QUANTUM & MATERIALS
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'quantum-insider', name: 'The Quantum Insider', url: 'https://thequantuminsider.com/feed/', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['quantum'], type: 'news', tier: 2, humanity_impact: 'transformative', active: true },
  { id: 'phys-org', name: 'Phys.org', url: 'https://phys.org/rss-feed/', country: 'United Kingdom', country_code: 'GB', region: 'Global', sectors: ['quantum', 'life-sciences', 'climate-tech', 'space', 'energy'], type: 'institution', tier: 2, humanity_impact: 'transformative', active: true },
  { id: 'physics-world', name: 'Physics World', url: 'https://physicsworld.com/feed/', country: 'United Kingdom', country_code: 'GB', region: 'Europe', sectors: ['quantum', 'energy', 'space'], type: 'journal', tier: 1, humanity_impact: 'transformative', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 2 — LIFE SCIENCES & HEALTH
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'stat-news', name: 'STAT News', url: 'https://www.statnews.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['life-sciences', 'synthetic-bio'], type: 'news', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'science-daily', name: 'Science Daily', url: 'https://www.sciencedaily.com/rss/all.xml', country: 'United States', country_code: 'US', region: 'North America', sectors: ['life-sciences', 'climate-tech', 'ai-ml', 'quantum', 'agriculture'], type: 'institution', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'who-news', name: 'WHO News', url: 'https://www.who.int/feeds/entity/mediacentre/news/en/rss.xml', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['life-sciences'], type: 'government', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'nih-news', name: 'NIH News', url: 'https://www.nih.gov/feeds.xml', country: 'United States', country_code: 'US', region: 'North America', sectors: ['life-sciences', 'synthetic-bio'], type: 'government', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'wellcome-news', name: 'Wellcome Trust', url: 'https://wellcome.org/feeds/news', country: 'United Kingdom', country_code: 'GB', region: 'Europe', sectors: ['life-sciences'], type: 'institution', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'medscape', name: 'Medscape Medical News', url: 'https://www.medscape.com/rss/news', country: 'United States', country_code: 'US', region: 'North America', sectors: ['life-sciences'], type: 'news', tier: 2, humanity_impact: 'significant', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 2 — OCEAN & ENVIRONMENT
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'ocean-health', name: 'Ocean Health Index', url: 'https://www.oceanhealthindex.org/news/rss', country: 'Global', country_code: 'XX', region: 'Global', sectors: ['climate-tech'], type: 'institution', tier: 2, humanity_impact: 'transformative', active: true },
  { id: 'mongabay', name: 'Mongabay Environment', url: 'https://news.mongabay.com/feed/', country: 'United States', country_code: 'US', region: 'Global', sectors: ['climate-tech', 'agriculture'], type: 'news', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'carbon-brief', name: 'Carbon Brief', url: 'https://www.carbonbrief.org/feed', country: 'United Kingdom', country_code: 'GB', region: 'Europe', sectors: ['climate-tech', 'energy'], type: 'news', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'e360-yale', name: 'Yale Environment 360', url: 'https://e360.yale.edu/feed.xml', country: 'United States', country_code: 'US', region: 'North America', sectors: ['climate-tech', 'agriculture', 'energy'], type: 'institution', tier: 1, humanity_impact: 'transformative', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 2 — STARTUP & INNOVATION
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'ycombinator-news', name: 'Y Combinator News', url: 'https://news.ycombinator.com/rss', country: 'United States', country_code: 'US', region: 'North America', sectors: ['ai-ml', 'life-sciences', 'climate-tech'], type: 'startup', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'product-hunt', name: 'Product Hunt', url: 'https://www.producthunt.com/feed', country: 'United States', country_code: 'US', region: 'North America', sectors: ['ai-ml', 'life-sciences'], type: 'startup', tier: 2, humanity_impact: 'moderate', active: true },
  { id: 'tech-in-asia', name: 'Tech in Asia', url: 'https://www.techinasia.com/feed', country: 'Singapore', country_code: 'SG', region: 'Southeast Asia', sectors: ['ai-ml', 'logistics', 'manufacturing', 'agriculture'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 2 — GOVERNMENT RESEARCH
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'doe-news', name: 'DOE Energy News', url: 'https://www.energy.gov/feeds/energy_news.rss', country: 'United States', country_code: 'US', region: 'North America', sectors: ['energy', 'quantum', 'ai-ml'], type: 'government', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'nsf-news', name: 'NSF News', url: 'https://www.nsf.gov/rss/rss_www_discoveries.xml', country: 'United States', country_code: 'US', region: 'North America', sectors: ['ai-ml', 'quantum', 'life-sciences', 'climate-tech'], type: 'government', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'nist-news', name: 'NIST News', url: 'https://www.nist.gov/news-events/news/rss.xml', country: 'United States', country_code: 'US', region: 'North America', sectors: ['quantum', 'cybersecurity', 'ai-ml', 'manufacturing'], type: 'government', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'argonne', name: 'Argonne National Lab', url: 'https://www.anl.gov/content/feed', country: 'United States', country_code: 'US', region: 'North America', sectors: ['energy', 'quantum', 'ai-ml', 'life-sciences'], type: 'institution', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'oak-ridge', name: 'Oak Ridge National Lab', url: 'https://www.ornl.gov/feeds/news', country: 'United States', country_code: 'US', region: 'North America', sectors: ['energy', 'quantum', 'ai-ml', 'manufacturing'], type: 'institution', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'nrc-canada', name: 'NRC Canada', url: 'https://nrc.canada.ca/en/corporate/news/rss.xml', country: 'Canada', country_code: 'CA', region: 'North America', sectors: ['ai-ml', 'energy', 'manufacturing', 'agriculture'], type: 'government', tier: 1, humanity_impact: 'significant', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 2 — EL PASO / BORDERPLEX SPECIFIC
  // ══════════════════════════════════════════════════════════════════════════

  { id: 'ktsm', name: 'KTSM El Paso', url: 'https://www.ktsm.com/feed/', country: 'United States', country_code: 'US', region: 'El Paso', sectors: ['border-tech', 'defense', 'logistics'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'kvia', name: 'KVIA El Paso', url: 'https://kvia.com/feed/', country: 'United States', country_code: 'US', region: 'El Paso', sectors: ['border-tech', 'defense', 'logistics'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'ep-matters', name: 'El Paso Matters', url: 'https://elpasomatters.org/feed/', country: 'United States', country_code: 'US', region: 'El Paso', sectors: ['border-tech', 'defense', 'manufacturing'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'mexico-news-daily', name: 'Mexico News Daily', url: 'https://mexiconewsdaily.com/feed/', country: 'Mexico', country_code: 'MX', region: 'North America', sectors: ['manufacturing', 'logistics', 'border-tech', 'agriculture'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'el-financiero', name: 'El Financiero — Tech', url: 'https://elfinanciero.com.mx/rss/feed/', country: 'Mexico', country_code: 'MX', region: 'North America', sectors: ['manufacturing', 'logistics', 'renewable-energy'], type: 'news', tier: 2, humanity_impact: 'significant', active: true },


  // ══════════════════════════════════════════════════════════════════════════
  // INDUSTRIAL TECH — Smart Factory, IIoT, Robotics, Automation, 3D Printing
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'industry-week', name: 'Industry Week', url: 'https://www.industryweek.com/rss', country: 'United States', country_code: 'US', region: 'North America', sectors: ['manufacturing', 'industrial-tech', 'ai-ml'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'automation-world', name: 'Automation World', url: 'https://www.automationworld.com/rss.xml', country: 'United States', country_code: 'US', region: 'North America', sectors: ['industrial-tech', 'manufacturing'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'control-engineering', name: 'Control Engineering', url: 'https://www.controleng.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['industrial-tech', 'cybersecurity'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'the-robot-report', name: 'The Robot Report', url: 'https://www.therobotreport.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['industrial-tech', 'manufacturing', 'ai-ml'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'robotics-biz', name: 'Robotics Business Review', url: 'https://www.roboticsbusinessreview.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['industrial-tech', 'manufacturing', 'logistics'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'iiot-world', name: 'IIoT World', url: 'https://iiot-world.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['industrial-tech', 'cybersecurity', 'ai-ml'], type: 'news', tier: 2, humanity_impact: 'significant', active: true },
  { id: 'machine-design', name: 'Machine Design', url: 'https://www.machinedesign.com/rss', country: 'United States', country_code: 'US', region: 'North America', sectors: ['industrial-tech', 'manufacturing'], type: 'news', tier: 2, humanity_impact: 'moderate', active: true },
  { id: 'design-news', name: 'Design News', url: 'https://www.designnews.com/rss.xml', country: 'United States', country_code: 'US', region: 'North America', sectors: ['industrial-tech', 'manufacturing'], type: 'news', tier: 2, humanity_impact: 'moderate', active: true },
  { id: '3dp-industry', name: '3D Printing Industry', url: 'https://3dprintingindustry.com/feed/', country: 'United Kingdom', country_code: 'GB', region: 'Europe', sectors: ['industrial-tech', 'manufacturing', 'life-sciences'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'additive-mfg', name: 'Additive Manufacturing Media', url: 'https://www.additivemanufacturing.media/rss', country: 'United States', country_code: 'US', region: 'North America', sectors: ['industrial-tech', 'manufacturing', 'defense'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'manufacturing-dive', name: 'Manufacturing Dive', url: 'https://www.manufacturingdive.com/feeds/news/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['manufacturing', 'industrial-tech', 'logistics'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'iot-analytics', name: 'IoT Analytics Research', url: 'https://iot-analytics.com/feed/', country: 'Germany', country_code: 'DE', region: 'Europe', sectors: ['industrial-tech', 'ai-ml', 'logistics'], type: 'institution', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'siemens-press', name: 'Siemens Press Releases', url: 'https://press.siemens.com/global/en/featuredstorycategories/press-releases?format=rss', country: 'Germany', country_code: 'DE', region: 'Europe', sectors: ['industrial-tech', 'manufacturing', 'energy', 'ai-ml'], type: 'institution', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'abb-press', name: 'ABB News', url: 'https://news.abb.com/rss.xml', country: 'Switzerland', country_code: 'CH', region: 'Europe', sectors: ['industrial-tech', 'energy', 'manufacturing'], type: 'institution', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'fanuc-news', name: 'FANUC Robotics', url: 'https://news.google.com/rss/search?q=FANUC+robotics+automation&hl=en-US&gl=US&ceid=US:en', country: 'Japan', country_code: 'JP', region: 'East Asia', sectors: ['industrial-tech', 'manufacturing'], type: 'institution', tier: 2, humanity_impact: 'moderate', active: true },
  { id: 'kuka-news', name: 'KUKA Robotics', url: 'https://news.google.com/rss/search?q=KUKA+robotics+automation+industrial&hl=en-US&gl=US&ceid=US:en', country: 'Germany', country_code: 'DE', region: 'Europe', sectors: ['industrial-tech', 'manufacturing'], type: 'institution', tier: 2, humanity_impact: 'moderate', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // COMMERCIAL TECH — Retail, E-commerce, Fleet, Warehouse, SaaS, Fintech
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'supply-chain-dive', name: 'Supply Chain Dive', url: 'https://www.supplychaindive.com/feeds/news/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['logistics', 'commercial-tech', 'industrial-tech'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'retail-dive', name: 'Retail Dive', url: 'https://www.retaildive.com/feeds/news/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['commercial-tech', 'logistics', 'ai-ml'], type: 'news', tier: 1, humanity_impact: 'moderate', active: true },
  { id: 'fleet-owner', name: 'Fleet Owner', url: 'https://www.fleetowner.com/rss', country: 'United States', country_code: 'US', region: 'North America', sectors: ['logistics', 'commercial-tech'], type: 'news', tier: 1, humanity_impact: 'moderate', active: true },
  { id: 'dc-velocity', name: 'DC Velocity Warehouse', url: 'https://www.dcvelocity.com/rss.xml', country: 'United States', country_code: 'US', region: 'North America', sectors: ['logistics', 'commercial-tech', 'industrial-tech'], type: 'news', tier: 1, humanity_impact: 'moderate', active: true },
  { id: 'cio-mag', name: 'CIO Magazine', url: 'https://www.cio.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['commercial-tech', 'ai-ml', 'cybersecurity'], type: 'news', tier: 1, humanity_impact: 'moderate', active: true },
  { id: 'pymnts', name: 'PYMNTS Payments Tech', url: 'https://www.pymnts.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['commercial-tech', 'border-tech', 'finance'], type: 'news', tier: 1, humanity_impact: 'moderate', active: true },
  { id: 'global-trade-mag', name: 'Global Trade Magazine', url: 'https://www.globaltrademag.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['logistics', 'commercial-tech', 'border-tech'], type: 'news', tier: 2, humanity_impact: 'significant', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // NEARSHORING & MAQUILADORA — Critical for El Paso / Borderplex
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'mexico-now-mfg', name: 'MexicoNow Manufacturing', url: 'https://mexiconow.com.mx/feed/', country: 'Mexico', country_code: 'MX', region: 'North America', sectors: ['manufacturing', 'logistics', 'industrial-tech', 'border-tech'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'nearshore-americas', name: 'Nearshore Americas', url: 'https://nearshoreamericas.com/feed/', country: 'Global', country_code: 'XX', region: 'North America', sectors: ['manufacturing', 'commercial-tech', 'border-tech'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'maquilaportal', name: 'MaquilaPortal', url: 'https://www.maquilaportal.com/feed/', country: 'Mexico', country_code: 'MX', region: 'North America', sectors: ['manufacturing', 'border-tech', 'industrial-tech'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },
  { id: 'mexico-business-news', name: 'Mexico Business News', url: 'https://mexicobusiness.news/feed/', country: 'Mexico', country_code: 'MX', region: 'North America', sectors: ['manufacturing', 'logistics', 'commercial-tech', 'border-tech'], type: 'news', tier: 1, humanity_impact: 'significant', active: true },

  // ══════════════════════════════════════════════════════════════════════════
  // SEMICONDUCTOR & HARDWARE — Chips, Photonics, Advanced Electronics
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'eetimes', name: 'EE Times', url: 'https://www.eetimes.com/rss.xml', country: 'United States', country_code: 'US', region: 'North America', sectors: ['industrial-tech', 'ai-ml', 'manufacturing'], type: 'news', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'semiconductor-eng', name: 'Semiconductor Engineering', url: 'https://semiengineering.com/feed/', country: 'United States', country_code: 'US', region: 'North America', sectors: ['industrial-tech', 'ai-ml', 'manufacturing'], type: 'news', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'digitimes-semi', name: 'DigiTimes Semiconductors', url: 'https://www.digitimes.com/rss/news.rss', country: 'Taiwan', country_code: 'TW', region: 'East Asia', sectors: ['industrial-tech', 'manufacturing', 'ai-ml'], type: 'news', tier: 1, humanity_impact: 'transformative', active: true },
  { id: 'chips-alliance', name: 'CHIPS Act Industry', url: 'https://news.google.com/rss/search?q=CHIPS+Act+semiconductor+manufacturing&hl=en-US&gl=US&ceid=US:en', country: 'United States', country_code: 'US', region: 'North America', sectors: ['industrial-tech', 'manufacturing', 'defense'], type: 'news', tier: 1, humanity_impact: 'transformative', active: true },

];

// ── Helpers ───────────────────────────────────────────────────────────────────

export const WORLD_SOURCE_COUNT = WORLD_SOURCES.length;

export function getSourcesBySector(sector: string): WorldSource[] {
  return WORLD_SOURCES.filter(s => s.sectors.includes(sector) && s.active);
}

export function getSourcesByRegion(region: string): WorldSource[] {
  return WORLD_SOURCES.filter(s => (s.region === region || s.country_code === region) && s.active);
}

export function getTier1Sources(): WorldSource[] {
  return WORLD_SOURCES.filter(s => s.tier === 1 && s.active);
}

export function getTransformativeSources(): WorldSource[] {
  return WORLD_SOURCES.filter(s => s.humanity_impact === 'transformative' && s.active);
}

export const SOURCE_STATS = {
  total: WORLD_SOURCES.length,
  tier1: WORLD_SOURCES.filter(s => s.tier === 1).length,
  countries: [...new Set(WORLD_SOURCES.map(s => s.country_code))].length,
  transformative: WORLD_SOURCES.filter(s => s.humanity_impact === 'transformative').length,
  by_region: WORLD_SOURCES.reduce((a, s) => ({ ...a, [s.region]: (a[s.region] ?? 0) + 1 }), {} as Record<string, number>),
  by_sector: WORLD_SOURCES.flatMap(s => s.sectors).reduce((a, s) => ({ ...a, [s]: (a[s] ?? 0) + 1 }), {} as Record<string, number>),
};
