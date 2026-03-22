"""
EVENTS SCANNER — Find conferences and trade shows
==================================================

Scrapes event listing sites for upcoming conferences.
All free sources.

Usage:
    python scan_events.py                     # Scan all industries
    python scan_events.py logistics           # Specific industry
"""

import os
import sys
import json
import re
import hashlib
from datetime import datetime, timezone
from typing import Optional
import httpx

try:
    import trafilatura
except ImportError:
    print("Install trafilatura: pip install trafilatura")
    sys.exit(1)

# ============================================================================
# CONFIG
# ============================================================================

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:14b")

# Known major events (manually curated — these are important)
KNOWN_EVENTS = [
    {
        "name": "MODEX",
        "url": "https://www.modexshow.com",
        "industry": "logistics",
        "type": "trade_show",
        "city": "Atlanta",
        "state": "GA",
        "country": "USA",
        "description": "Supply chain, manufacturing, and logistics expo",
    },
    {
        "name": "ProMat",
        "url": "https://www.promatshow.com",
        "industry": "logistics",
        "type": "trade_show",
        "city": "Chicago",
        "state": "IL",
        "country": "USA",
        "description": "Material handling and logistics trade show",
    },
    {
        "name": "CES",
        "url": "https://www.ces.tech",
        "industry": "technology",
        "type": "conference",
        "city": "Las Vegas",
        "state": "NV",
        "country": "USA",
        "description": "Consumer Electronics Show",
    },
    {
        "name": "NRF",
        "url": "https://nrfbigshow.nrf.com",
        "industry": "retail",
        "type": "conference",
        "city": "New York",
        "state": "NY",
        "country": "USA",
        "description": "National Retail Federation Big Show",
    },
    {
        "name": "Automate",
        "url": "https://www.automateshow.com",
        "industry": "robotics",
        "type": "trade_show",
        "city": "Detroit",
        "state": "MI",
        "country": "USA",
        "description": "Robotics and automation trade show",
    },
    {
        "name": "CSCMP EDGE",
        "url": "https://cscmpedge.org",
        "industry": "logistics",
        "type": "conference",
        "city": "Various",
        "state": "",
        "country": "USA",
        "description": "Council of Supply Chain Management Professionals",
    },
    {
        "name": "Manifest",
        "url": "https://www.manifestvegas.com",
        "industry": "logistics",
        "type": "conference",
        "city": "Las Vegas",
        "state": "NV",
        "country": "USA",
        "description": "The future of logistics technology",
    },
    {
        "name": "Home Delivery World",
        "url": "https://www.terrapinn.com/conference/home-delivery-world",
        "industry": "logistics",
        "type": "conference",
        "city": "Philadelphia",
        "state": "PA",
        "country": "USA",
        "description": "E-commerce and last-mile delivery",
    },
    {
        "name": "LogiMAT",
        "url": "https://www.logimat-messe.de",
        "industry": "logistics",
        "type": "trade_show",
        "city": "Stuttgart",
        "state": "",
        "country": "Germany",
        "description": "International trade fair for logistics",
    },
    {
        "name": "IMTS",
        "url": "https://www.imts.com",
        "industry": "manufacturing",
        "type": "trade_show",
        "city": "Chicago",
        "state": "IL",
        "country": "USA",
        "description": "International Manufacturing Technology Show",
    },
    {
        "name": "Fabtech",
        "url": "https://www.fabtechexpo.com",
        "industry": "manufacturing",
        "type": "trade_show",
        "city": "Various",
        "state": "",
        "country": "USA",
        "description": "Metal forming, fabricating, welding",
    },
    {
        "name": "AI Summit",
        "url": "https://theaisummit.com",
        "industry": "ai",
        "type": "conference",
        "city": "Various",
        "state": "",
        "country": "USA",
        "description": "Enterprise AI conference",
    },
    {
        "name": "GTC (NVIDIA)",
        "url": "https://www.nvidia.com/gtc",
        "industry": "ai",
        "type": "conference",
        "city": "San Jose",
        "state": "CA",
        "country": "USA",
        "description": "NVIDIA GPU Technology Conference",
    },
    {
        "name": "AWS re:Invent",
        "url": "https://reinvent.awsevents.com",
        "industry": "technology",
        "type": "conference",
        "city": "Las Vegas",
        "state": "NV",
        "country": "USA",
        "description": "Amazon Web Services annual conference",
    },
    {
        "name": "Google Cloud Next",
        "url": "https://cloud.withgoogle.com/next",
        "industry": "technology",
        "type": "conference",
        "city": "San Francisco",
        "state": "CA",
        "country": "USA",
        "description": "Google Cloud annual conference",
    },
]

# Event listing sites to scrape
EVENT_SOURCES = [
    {
        "name": "10times Logistics",
        "url": "https://10times.com/logistics-transportation",
        "industry": "logistics",
    },
    {
        "name": "10times Manufacturing",
        "url": "https://10times.com/manufacturing",
        "industry": "manufacturing",
    },
    {
        "name": "10times AI",
        "url": "https://10times.com/artificial-intelligence",
        "industry": "ai",
    },
]


# ============================================================================
# SCRAPE EVENT SITES
# ============================================================================

def fetch_page(url: str) -> Optional[str]:
    """Fetch a webpage."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = httpx.get(url, headers=headers, timeout=15, follow_redirects=True)
        
        if response.status_code != 200:
            return None
        
        return response.text
        
    except Exception as e:
        print(f"  [ERROR] Failed to fetch {url}: {e}")
        return None


def extract_events_with_ollama(html: str, source: str, industry: str) -> list:
    """Use Ollama to extract events from a page."""
    
    # Get clean text
    text = trafilatura.extract(html, include_links=True)
    
    if not text or len(text) < 100:
        return []
    
    # Truncate if too long
    if len(text) > 10000:
        text = text[:10000]
    
    prompt = f"""Extract upcoming events/conferences from this text.

SOURCE: {source}
INDUSTRY: {industry}

TEXT:
{text}

Return a JSON array of events. Each event should have:
{{
    "name": "Event name",
    "date_text": "March 15-17, 2026",
    "city": "City name",
    "state": "State or empty",
    "country": "Country",
    "description": "Brief description",
    "url": "URL if found"
}}

Return ONLY valid JSON array, no other text. If no events found, return []"""

    try:
        response = httpx.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.1, "num_predict": 2000},
            },
            timeout=120,
        )
        
        if response.status_code != 200:
            return []
        
        result = response.json()
        text = result.get("response", "").strip()
        
        # Clean markdown if present
        if text.startswith("```"):
            text = re.sub(r"```json?\s*", "", text)
            text = re.sub(r"```\s*$", "", text)
        
        events = json.loads(text)
        return events if isinstance(events, list) else []
        
    except Exception as e:
        print(f"  [ERROR] Ollama extraction failed: {e}")
        return []


# ============================================================================
# SAVE TO SUPABASE
# ============================================================================

def save_event(event: dict) -> bool:
    """Save event to Supabase."""
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print(f"  [LOCAL] [EVT] {event.get('name', 'Unknown')} — {event.get('city', '?')}")
        return True
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    
    # Generate ID from name
    event_id = hashlib.md5(event.get("name", "").encode()).hexdigest()[:16]
    
    row = {
        "name": event.get("name"),
        "type": event.get("type", "conference"),
        "industry": event.get("industry"),
        "city": event.get("city"),
        "state": event.get("state"),
        "country": event.get("country", "USA"),
        "description": event.get("description"),
        "website": event.get("url") or event.get("website"),
        "date_text": event.get("date_text"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    try:
        response = httpx.post(
            f"{SUPABASE_URL}/rest/v1/conferences",
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

def scan_known_events():
    """Save all known major events."""
    
    print("\n[EVT] SAVING KNOWN EVENTS")
    print("=" * 50)
    
    for event in KNOWN_EVENTS:
        save_event(event)
        print(f"  [OK] {event['name']} ({event['city']})")
    
    return KNOWN_EVENTS


def scan_event_sources(industry: str = None):
    """Scrape event listing sites."""
    
    print("\n[SCAN] SCRAPING EVENT SITES")
    print("=" * 50)
    
    all_events = []
    
    sources = EVENT_SOURCES
    if industry:
        sources = [s for s in EVENT_SOURCES if s["industry"] == industry]
    
    for source in sources:
        print(f"\n[SRC] {source['name']}")
        
        html = fetch_page(source["url"])
        if not html:
            continue
        
        events = extract_events_with_ollama(html, source["name"], source["industry"])
        print(f"   Found {len(events)} events")
        
        for event in events:
            event["industry"] = source["industry"]
            save_event(event)
            all_events.append(event)
    
    return all_events


def main():
    industry = sys.argv[1] if len(sys.argv) > 1 else None
    
    # Always save known events
    known = scan_known_events()
    
    # Try to scrape more
    scraped = scan_event_sources(industry)
    
    print("\n" + "=" * 50)
    print(f"[STATS] SUMMARY")
    print(f"   Known events: {len(known)}")
    print(f"   Scraped events: {len(scraped)}")
    print(f"   Total: {len(known) + len(scraped)}")


if __name__ == "__main__":
    main()
