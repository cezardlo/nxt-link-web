"""Pipeline configuration — feeds, keywords, Supabase connection."""

import os
import sys

# Add local .pylibs to path for packages installed on D:
_pylibs = os.path.join(os.path.dirname(__file__), ".pylibs")
if os.path.isdir(_pylibs) and _pylibs not in sys.path:
    sys.path.insert(0, _pylibs)

# Load .env from pipeline directory
_env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.isfile(_env_path):
    with open(_env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())

SUPABASE_URL = os.getenv(
    "SUPABASE_URL",
    os.getenv("NEXT_PUBLIC_SUPABASE_URL", "https://yvykselwehxjwsqercjg.supabase.co"),
)
SUPABASE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY",
    os.getenv("SUPABASE_KEY", os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")),
)

# ─── RSS Feeds ────────────────────────────────────────────────────────────────
# (name, url) — supply chain, logistics, manufacturing, border tech
RSS_FEEDS = [
    # Supply chain / logistics
    ("Supply Chain Dive", "https://www.supplychaindive.com/feeds/news/"),
    ("Logistics Management", "https://www.logisticsmgmt.com/rss"),
    ("FreightWaves", "https://www.freightwaves.com/news/rss.xml"),
    ("Material Handling & Logistics", "https://www.mhlnews.com/rss"),
    # Manufacturing / automation
    ("Manufacturing Dive", "https://www.manufacturingdive.com/feeds/news/"),
    ("Automation World", "https://www.automationworld.com/rss"),
    ("Robotics Business Review", "https://www.roboticsbusinessreview.com/feed/"),
    # Defense / border tech
    ("Defense One", "https://www.defenseone.com/rss/all/"),
    ("FedScoop", "https://fedscoop.com/feed/"),
    # General tech (filtered by keywords)
    ("TechCrunch", "https://techcrunch.com/feed/"),
    ("Ars Technica", "https://feeds.arstechnica.com/arstechnica/index"),
    ("Hacker News", "https://hnrss.org/frontpage"),
    ("Reuters Business", "https://www.reutersagency.com/feed/"),
]

# ─── Industry Classification ─────────────────────────────────────────────────
INDUSTRY_KEYWORDS = {
    "manufacturing": [
        "manufactur", "factory", "plant", "production line", "assembly",
        "industrial", "automation", "robotics", "cnc", "3d print", "additive",
    ],
    "logistics": [
        "logistics", "freight", "shipping", "cargo", "port", "container",
        "warehouse", "distribution", "fleet", "trucking", "last mile",
        "cold chain", "fulfillment",
    ],
    "border-tech": [
        "border", "customs", "cbp", "immigration", "surveillance",
        "biometric", "checkpoint", "screening", "detection",
    ],
    "cybersecurity": [
        "cybersecurity", "cyber", "ransomware", "breach", "zero-day",
        "firewall", "encryption", "threat", "vulnerability",
    ],
    "defense": [
        "defense contract", "pentagon", "dod", "military", "darpa",
        "defense tech", "munition", "weapon system",
    ],
    "semiconductors": [
        "semiconductor", "chip", "wafer", "foundry", "tsmc", "intel fab",
        "gpu", "asic", "nand", "dram",
    ],
    "energy": [
        "solar", "wind energy", "battery", "ev charging", "grid",
        "renewable", "hydrogen", "nuclear",
    ],
}

SIGNAL_TYPE_KEYWORDS = {
    "merger_acquisition": ["acqui", "merger", "buyout", "takeover", "deal"],
    "funding_round": ["funding", "series a", "series b", "series c", "raised", "venture", "invest"],
    "regulatory": ["tariff", "regulation", "sanction", "ban", "executive order", "compliance", "policy"],
    "technology": ["patent", "launch", "breakthrough", "innovation", "prototype", "deploy"],
    "market_shift": ["growth", "decline", "surge", "drop", "demand", "shortage", "disruption"],
    "partnership": ["partner", "collaboration", "joint venture", "alliance", "mou"],
    "supply_chain": ["supply chain", "sourcing", "reshoring", "nearshoring", "inventory", "backlog"],
}

# ─── Known Companies (supply chain relevant) ─────────────────────────────────
KNOWN_COMPANIES = [
    "Amazon", "FedEx", "UPS", "DHL", "Maersk", "COSCO", "Flexport", "C.H. Robinson",
    "XPO Logistics", "J.B. Hunt", "Schneider", "Werner", "Old Dominion",
    "Tesla", "Rivian", "TuSimple", "Aurora", "Waymo", "Nuro", "Gatik",
    "Locus Robotics", "6 River Systems", "Fetch Robotics", "Boston Dynamics",
    "Honeywell", "Siemens", "ABB", "Fanuc", "KUKA", "Universal Robots",
    "Palantir", "Anduril", "Shield AI", "L3Harris", "Raytheon", "Lockheed Martin",
    "NVIDIA", "TSMC", "Intel", "Samsung", "Qualcomm", "Broadcom", "AMD",
    "Walmart", "Target", "Home Depot", "Costco",
    "Zebra Technologies", "Impinj", "SATO Holdings",
    "SAP", "Oracle", "Blue Yonder", "Kinaxis", "o9 Solutions", "Coupa",
    "Project44", "FourKites", "Descartes", "E2open",
]

# ─── Regions ──────────────────────────────────────────────────────────────────
REGION_KEYWORDS = {
    "North America": ["united states", "us", "usa", "canada", "mexico", "american", "texas", "california"],
    "East Asia": ["china", "chinese", "taiwan", "japan", "south korea", "korea", "tsmc"],
    "Southeast Asia": ["vietnam", "thailand", "indonesia", "malaysia", "singapore", "philippines"],
    "Europe": ["europe", "eu", "germany", "uk", "france", "netherlands", "italy", "spain"],
    "South Asia": ["india", "bangladesh", "pakistan"],
    "Middle East": ["saudi", "uae", "dubai", "israel", "qatar"],
    "Latin America": ["brazil", "colombia", "chile", "argentina", "latin america"],
    "Africa": ["africa", "nigeria", "kenya", "south africa", "ethiopia"],
}
