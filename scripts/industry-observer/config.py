"""
NXT//LINK Industry Observer — Configuration Constants
All tunable parameters live here. No logic.
"""

from pathlib import Path

# ─── Paths ────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "output"
DB_PATH = BASE_DIR / "observer.db"
LOG_DIR = BASE_DIR / "logs"

# ─── Seed RSS Sources per industry ───────────────────────────────────────────
# At least 5 feeds per industry, 8 industries.
# Format: { industry_slug: [feed_url, ...] }

SEED_SOURCES: dict[str, list[str]] = {
    "logistics": [
        "https://www.supplychain247.com/rss",
        "https://www.logisticsmgmt.com/rss/content",
        "https://feeds.feedburner.com/SupplyChainDigest",
        "https://www.inboundlogistics.com/cms/rss",
        "https://www.dcvelocity.com/rss/articles.xml",
        "https://www.moderntiredealer.com/rss/news",
        "https://www.freightwaves.com/news/rss",
        "https://www.fleetowner.com/rss/all",
    ],
    "manufacturing": [
        "https://www.manufacturingtomorrow.com/rss",
        "https://www.industryweek.com/rss",
        "https://www.manufacturing.net/rss/content",
        "https://www.sme.org/rss",
        "https://www.automationworld.com/rss",
        "https://www.assemblymag.com/rss/content",
        "https://www.techbriefs.com/component/rss",
        "https://www.plasticsnews.com/rss",
    ],
    "energy": [
        "https://www.renewableenergyworld.com/feed",
        "https://www.greentechmedia.com/rss/all",
        "https://www.energymonitor.ai/feed",
        "https://www.utilitydive.com/feeds/news",
        "https://www.power-technology.com/feed",
        "https://www.pv-magazine.com/feed",
        "https://www.spglobal.com/commodityinsights/en/rss-feed/natural-gas",
        "https://www.energycentral.com/rss/site",
    ],
    "cybersecurity": [
        "https://feeds.feedburner.com/TheHackersNews",
        "https://www.darkreading.com/rss.xml",
        "https://krebsonsecurity.com/feed",
        "https://www.securityweek.com/feed",
        "https://www.bleepingcomputer.com/feed",
        "https://threatpost.com/feed",
        "https://www.csoonline.com/feed/",
        "https://www.infosecurity-magazine.com/rss/news",
    ],
    "defense": [
        "https://breakingdefense.com/feed",
        "https://www.defensenews.com/rss",
        "https://www.c4isrnet.com/rss",
        "https://aviationweek.com/rss",
        "https://www.defensedaily.com/feed",
        "https://www.nationaldefensemagazine.org/rss",
        "https://www.militaryaerospace.com/rss/content",
        "https://www.janes.com/feeds/news",
    ],
    "healthcare": [
        "https://www.healthcareitnews.com/rss.xml",
        "https://www.modernhealthcare.com/section/feed?sectionId=40",
        "https://www.fiercehealthcare.com/rss/xml",
        "https://hitconsultant.net/feed",
        "https://www.mobihealthnews.com/feed",
        "https://www.beckershospitalreview.com/rss/news",
        "https://www.healthleadersmedia.com/rss.xml",
        "https://www.statnews.com/feed",
    ],
    "border-tech": [
        "https://www.cbp.gov/newsroom/rss-feeds",
        "https://feeds.feedburner.com/HomelandSecurityToday",
        "https://www.securityinfowatch.com/rss/content",
        "https://www.aviationtoday.com/feed",
        "https://biometricupdate.com/feed",
        "https://www.govtech.com/rss",
        "https://federalnewsnetwork.com/feed",
        "https://www.nextgov.com/rss/all",
    ],
    "ai-ml": [
        "https://www.artificialintelligence-news.com/feed",
        "https://venturebeat.com/category/ai/feed",
        "https://feeds.feedburner.com/AITrends",
        "https://www.technologyreview.com/feed",
        "https://syncedreview.com/feed",
        "https://www.unite.ai/feed",
        "https://machinelearningmastery.com/feed",
        "https://towardsdatascience.com/feed",
    ],
}

# ─── Confidence Thresholds ────────────────────────────────────────────────────

CONFIDENCE_THRESHOLDS: dict[str, float] = {
    "vendor_case_study": 0.95,
    "news_mention": 0.80,
    "partner_page": 0.60,
    "weak_mention": 0.30,
}

# ─── Crawl Schedule ───────────────────────────────────────────────────────────

CRAWL_SCHEDULE: dict[str, int] = {
    "approved": 6,     # hours between crawls for approved sources
    "watchlist": 24,   # hours between crawls for watchlist sources
}

# ─── LLM Budget ───────────────────────────────────────────────────────────────

LLM_BUDGET: dict[str, int] = {
    "max_calls_per_day": 100,
}

# ─── Domain Constants ─────────────────────────────────────────────────────────

WAREHOUSE_ZONES: list[str] = [
    "receiving",
    "storage",
    "picking",
    "packing",
    "shipping",
    "inventory",
]

TECH_CATEGORIES: list[str] = [
    "AI/ML",
    "Robotics & Automation",
    "IoT & Sensors",
    "Warehouse Management Systems",
    "Transportation Management Systems",
    "ERP & Integrations",
    "Computer Vision",
    "Predictive Analytics",
    "Autonomous Vehicles",
    "Cybersecurity",
    "Defense Systems",
    "Border Technology",
    "Energy Management",
    "Healthcare Technology",
    "Supply Chain Visibility",
    "Route Optimization",
    "Fleet Management",
    "Additive Manufacturing",
    "Digital Twin",
    "Augmented Reality",
]

# ─── Signal Type Keywords ─────────────────────────────────────────────────────

DEPLOYMENT_VERBS: list[str] = [
    "deploys", "implements", "selects", "adopts", "launches", "rolls out",
    "integrates", "installs", "partners with", "contracts", "awards",
    "chooses", "purchases", "signs", "announces deployment",
]

SIGNAL_TYPE_KEYWORDS: dict[str, list[str]] = {
    "case_study": [
        "case study", "success story", "customer story", "results", "roi",
        "reduced", "improved", "achieved", "saved", "increased efficiency",
    ],
    "product_launch": [
        "launches", "unveils", "announces", "introduces", "releases",
        "new product", "new platform", "new solution", "available now",
    ],
    "partnership": [
        "partnership", "alliance", "agreement", "collaboration", "joint venture",
        "memorandum of understanding", "mou", "teaming agreement",
    ],
    "funding": [
        "funding", "investment", "raises", "series a", "series b", "venture capital",
        "seed round", "grant", "contract award", "sbir", "sttr",
    ],
    "research": [
        "research", "study", "report", "whitepaper", "survey", "analysis",
        "findings", "researchers", "university", "laboratory",
    ],
}

# ─── Source Scoring Thresholds ────────────────────────────────────────────────

SOURCE_SCORE_THRESHOLDS: dict[str, int] = {
    "promote_to_approved": 75,    # watchlist → approved
    "demote_to_watchlist": 30,    # approved → watchlist
    "block": 10,                  # watchlist → blocked
}

# ─── Gemini Config ────────────────────────────────────────────────────────────

GEMINI_MODEL: str = "gemini-2.0-flash"
GEMINI_MAX_TOKENS: int = 1024

# ─── Dedup Settings ───────────────────────────────────────────────────────────

DEDUP_SIMILARITY_THRESHOLD: float = 0.85   # rapidfuzz ratio for title dedup
ENTITY_FUZZY_THRESHOLD: float = 80.0       # rapidfuzz score for entity matching (0-100)
