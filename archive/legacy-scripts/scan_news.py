"""
NEWS SCANNER — Extract signals from free RSS feeds
===================================================

FREE SOURCES:
• TechCrunch, VentureBeat, Wired (tech news)
• Supply Chain Dive, FreightWaves (logistics)
• Google News (any topic)
• Hacker News (tech community)

Usage:
    python scan_news.py                    # Scan all feeds
    python scan_news.py --industry logistics
    python scan_news.py --topic "warehouse automation"
"""

import os
import sys
import re
import json
import hashlib
from datetime import datetime, timezone
from typing import Optional
import httpx

try:
    import feedparser
except ImportError:
    print("Install feedparser: pip install feedparser")
    sys.exit(1)

# ============================================================================
# CONFIG
# ============================================================================

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:14b")

# RSS Feeds — ALL FREE
FEEDS = {
    # Tech News
    "TechCrunch": "https://techcrunch.com/feed/",
    "VentureBeat": "https://venturebeat.com/feed/",
    "Wired": "https://www.wired.com/feed/rss",
    "Ars Technica": "https://feeds.arstechnica.com/arstechnica/index",
    "The Verge": "https://www.theverge.com/rss/index.xml",
    "Hacker News": "https://hnrss.org/frontpage",
    
    # Logistics & Supply Chain
    "Supply Chain Dive": "https://www.supplychaindive.com/feeds/news/",
    "FreightWaves": "https://www.freightwaves.com/news/feed",
    "Logistics Management": "https://www.logisticsmgmt.com/rss/lm_all.xml",
    "Modern Shipper": "https://www.freightwaves.com/modern-shipper/feed",
    
    # Manufacturing
    "Industry Week": "https://www.industryweek.com/rss.xml",
    
    # Business
    "Business Insider": "https://www.businessinsider.com/rss",
    "Forbes": "https://www.forbes.com/innovation/feed/",
}

# Keywords that indicate signal types
SIGNAL_PATTERNS = {
    "funding": [
        r"raises?\s+\$[\d.]+[MBK]",
        r"raised\s+\$[\d.]+",
        r"series\s+[A-F]",
        r"funding\s+round",
        r"venture\s+capital",
        r"investment",
    ],
    "acquisition": [
        r"acquires?",
        r"acquired",
        r"acquisition",
        r"buys?",
        r"bought",
        r"merger",
        r"merges?",
    ],
    "product_launch": [
        r"launches?",
        r"launched",
        r"announces?",
        r"announced",
        r"unveils?",
        r"unveiled",
        r"introduces?",
        r"new\s+product",
        r"releases?",
    ],
    "partnership": [
        r"partners?\s+with",
        r"partnership",
        r"collaboration",
        r"teams?\s+up",
        r"joint\s+venture",
    ],
    "expansion": [
        r"expands?\s+to",
        r"expansion",
        r"opens?\s+new",
        r"new\s+facility",
        r"new\s+warehouse",
        r"new\s+office",
    ],
    "ipo": [
        r"\bipo\b",
        r"goes?\s+public",
        r"public\s+offering",
        r"stock\s+market",
    ],
}

# Industries to tag
INDUSTRY_KEYWORDS = {
    "logistics": ["logistics", "supply chain", "shipping", "freight", "warehouse", "fulfillment", "delivery", "trucking", "fleet"],
    "manufacturing": ["manufacturing", "factory", "production", "assembly", "industrial"],
    "robotics": ["robot", "robotic", "automation", "autonomous", "AMR", "AGV"],
    "ai": ["artificial intelligence", "machine learning", "AI", "ML", "neural", "deep learning", "LLM"],
    "semiconductors": ["semiconductor", "chip", "processor", "NVIDIA", "AMD", "Intel", "TSMC"],
    "fintech": ["fintech", "payment", "banking", "financial", "crypto", "blockchain"],
    "ecommerce": ["ecommerce", "e-commerce", "retail", "online shopping", "marketplace"],
    "ev": ["electric vehicle", "EV", "Tesla", "battery", "charging", "BYD"],
}


# ============================================================================
# FETCH & PARSE FEEDS
# ============================================================================

def fetch_feed(name: str, url: str) -> list:
    """Fetch and parse an RSS feed."""
    try:
        feed = feedparser.parse(url)
        entries = []
        
        for entry in feed.entries[:20]:  # Last 20 items
            entries.append({
                "source": name,
                "title": entry.get("title", ""),
                "link": entry.get("link", ""),
                "summary": entry.get("summary", entry.get("description", ""))[:500],
                "published": entry.get("published", entry.get("updated", "")),
            })
        
        return entries
        
    except Exception as e:
        print(f"  [ERROR] {name}: {e}")
        return []


def fetch_google_news(query: str) -> list:
    """Fetch Google News RSS for a specific topic."""
    url = f"https://news.google.com/rss/search?q={query.replace(' ', '+')}&hl=en-US&gl=US&ceid=US:en"
    return fetch_feed(f"Google News: {query}", url)


# ============================================================================
# CLASSIFY SIGNALS
# ============================================================================

def detect_signal_type(text: str) -> str:
    """Detect what type of signal this is."""
    text_lower = text.lower()
    
    for signal_type, patterns in SIGNAL_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text_lower):
                return signal_type
    
    return "news"  # Default


def detect_industries(text: str) -> list:
    """Detect which industries this relates to."""
    text_lower = text.lower()
    industries = []
    
    for industry, keywords in INDUSTRY_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in text_lower:
                industries.append(industry)
                break
    
    return industries or ["general"]


def extract_funding_amount(text: str) -> Optional[str]:
    """Extract funding amount if mentioned."""
    patterns = [
        r"\$(\d+(?:\.\d+)?)\s*(billion|B)\b",
        r"\$(\d+(?:\.\d+)?)\s*(million|M)\b",
        r"\$(\d+(?:\.\d+)?)\s*(thousand|K)\b",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            amount = match.group(1)
            unit = match.group(2)[0].upper()
            return f"${amount}{unit}"
    
    return None


def extract_companies(text: str) -> list:
    """Extract company names mentioned (simple heuristic)."""
    # Look for capitalized multi-word sequences
    pattern = r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b"
    matches = re.findall(pattern, text)
    
    # Filter out common non-company words
    stopwords = {
        "The", "This", "That", "These", "Those", "What", "When", "Where", "Which",
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
        "January", "February", "March", "April", "May", "June", "July", "August",
        "September", "October", "November", "December", "New York", "San Francisco",
        "Los Angeles", "United States", "North America", "South America",
    }
    
    companies = [m for m in matches if m not in stopwords and len(m) > 2]
    return list(set(companies))[:5]  # Top 5 unique


# ============================================================================
# PROCESS ENTRY INTO SIGNAL
# ============================================================================

def process_entry(entry: dict) -> dict:
    """Process a feed entry into a signal."""
    
    text = f"{entry['title']} {entry['summary']}"
    
    signal = {
        "title": entry["title"][:200],
        "source_name": entry["source"],
        "source_url": entry["link"],
        "summary": entry["summary"][:500],
        "signal_type": detect_signal_type(text),
        "industries": detect_industries(text),
        "companies_mentioned": extract_companies(text),
        "funding_amount": extract_funding_amount(text),
        "published_at": entry["published"],
        "detected_at": datetime.now(timezone.utc).isoformat(),
    }
    
    # Generate unique ID based on URL
    signal["id"] = hashlib.md5(entry["link"].encode()).hexdigest()[:16]
    
    return signal


# ============================================================================
# SAVE TO SUPABASE
# ============================================================================

def save_signal(signal: dict) -> bool:
    """Save signal to Supabase."""
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print(f"  [LOCAL] {signal['signal_type'].upper()}: {signal['title'][:60]}")
        return True
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    
    # Map to intel_signals schema
    industry = signal["industries"][0] if signal["industries"] else "general"
    company = signal["companies_mentioned"][0] if signal["companies_mentioned"] else None
    row = {
        "title": signal["title"],
        "signal_type": signal["signal_type"],
        "industry": industry,
        "source": signal["source_name"],
        "url": signal["source_url"],
        "company": company,
        "evidence": [signal["summary"][:300]] if signal["summary"] else [],
        "tags": [signal["source_name"], signal["signal_type"]],
        "importance_score": 0.65 if signal["signal_type"] != "news" else 0.45,
        "confidence": 0.6,
        "discovered_at": signal["detected_at"],
    }

    try:
        response = httpx.post(
            f"{SUPABASE_URL}/rest/v1/intel_signals",
            headers=headers,
            json=row,
            timeout=10,
        )
        return response.status_code in (200, 201)
        
    except Exception as e:
        print(f"  [ERROR] Save failed: {e}")
        return False


# ============================================================================
# MAIN SCANNER
# ============================================================================

def scan_all_feeds():
    """Scan all configured RSS feeds."""
    
    print("\n[NEWS] SCANNING NEWS FEEDS")
    print("=" * 50)
    
    all_signals = []
    
    for name, url in FEEDS.items():
        print(f"\n[FEED] {name}")
        entries = fetch_feed(name, url)
        print(f"   Found {len(entries)} entries")
        
        for entry in entries:
            signal = process_entry(entry)
            
            # Only save interesting signals (not just generic news)
            if signal["signal_type"] != "news" or signal["industries"] != ["general"]:
                all_signals.append(signal)
                save_signal(signal)
    
    return all_signals


def scan_topic(topic: str):
    """Scan Google News for a specific topic."""
    
    print(f"\n[SCAN] SCANNING: {topic}")
    print("=" * 50)
    
    entries = fetch_google_news(topic)
    print(f"   Found {len(entries)} entries")
    
    signals = []
    for entry in entries:
        signal = process_entry(entry)
        signals.append(signal)
        save_signal(signal)
    
    return signals


def scan_industry(industry: str):
    """Scan for a specific industry."""
    
    # Get keywords for this industry
    keywords = INDUSTRY_KEYWORDS.get(industry, [industry])
    
    print(f"\n[IND] SCANNING INDUSTRY: {industry}")
    print("=" * 50)
    
    all_signals = []
    
    for keyword in keywords[:3]:  # Top 3 keywords
        signals = scan_topic(keyword)
        all_signals.extend(signals)
    
    return all_signals


# ============================================================================
# CLI
# ============================================================================

def main():
    if len(sys.argv) < 2:
        # Default: scan all feeds
        signals = scan_all_feeds()
        
        print("\n" + "=" * 50)
        print(f"[STATS] SUMMARY")
        print(f"   Total signals: {len(signals)}")
        
        # Count by type
        by_type = {}
        for s in signals:
            t = s["signal_type"]
            by_type[t] = by_type.get(t, 0) + 1
        
        for t, count in sorted(by_type.items(), key=lambda x: -x[1]):
            print(f"   • {t}: {count}")
        
        return
    
    arg = sys.argv[1]
    
    if arg == "--topic" and len(sys.argv) > 2:
        topic = " ".join(sys.argv[2:])
        signals = scan_topic(topic)
        
    elif arg == "--industry" and len(sys.argv) > 2:
        industry = sys.argv[2]
        signals = scan_industry(industry)
        
    else:
        # Treat as topic
        signals = scan_topic(arg)
    
    print(f"\n[STATS] Found {len(signals)} signals")


if __name__ == "__main__":
    main()
