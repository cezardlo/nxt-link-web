"""
VENDOR SCRAPER — Extract company info + products from websites
==============================================================

FREE TOOLS ONLY:
- httpx — fetch pages
- trafilatura — extract clean text
- Ollama — extract structured data (local LLM)
- Supabase — store results

Usage:
    python scrape_vendor.py https://locusrobotics.com
    python scrape_vendor.py urls.txt              # file with URLs
    python scrape_vendor.py --batch logistics     # scan industry
"""

import os
import sys
import json
import re
import httpx
from urllib.parse import urlparse
from datetime import datetime, timezone
from typing import Optional

try:
    import trafilatura
except ImportError:
    print("Install trafilatura: pip install trafilatura")
    sys.exit(1)

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:14b")

PAGES_TO_SCRAPE = [
    "", "about", "about-us", "company", "products", "solutions",
    "services", "platform", "technology", "team", "leadership", "contact",
]


def fetch_page(url: str) -> Optional[str]:
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }
        response = httpx.get(url, headers=headers, timeout=15, follow_redirects=True)
        if response.status_code != 200:
            return None
        return trafilatura.extract(response.text, include_links=False, include_images=False)
    except Exception as e:
        print(f"  [ERROR] Failed to fetch {url}: {e}")
        return None


def fetch_all_pages(base_url: str) -> dict:
    if not base_url.startswith("http"):
        base_url = "https://" + base_url
    base_url = base_url.rstrip("/")
    domain = urlparse(base_url).netloc
    print(f"\n  Scraping: {domain}")
    pages = {}
    for page in PAGES_TO_SCRAPE:
        url = f"{base_url}/{page}" if page else base_url
        text = fetch_page(url)
        if text and len(text) > 100:
            pages[page or "home"] = text[:8000]
            print(f"    + {page or 'home'}: {len(text)} chars")
    return pages


def extract_with_ollama(pages: dict, website: str) -> dict:
    all_text = "\n\n---\n\n".join([f"[{p.upper()}]\n{t}" for p, t in pages.items()])
    if len(all_text) > 12000:
        all_text = all_text[:12000] + "\n...[truncated]"

    prompt = f"""You are extracting company information from a website.

WEBSITE: {website}

CONTENT:
{all_text}

Extract the following as JSON. If you can't find something, use null.

{{
    "name": "Company name",
    "tagline": "One-line description",
    "description": "2-3 sentence description",
    "industry": "Primary industry (Logistics, Manufacturing, AI, etc.)",
    "founded_year": 2020,
    "hq_city": "City",
    "hq_state": "State",
    "hq_country": "Country",
    "employee_estimate": "10-50, 50-200, 200-500, 500-1000, 1000+",
    "products": [{{"name": "Product", "description": "What it does", "category": "Software/Hardware/Service/Platform"}}],
    "technologies": ["AI", "Robotics", "Cloud"],
    "target_customers": ["Warehouses", "Manufacturers"],
    "key_people": [{{"name": "John Smith", "title": "CEO"}}]
}}

Return ONLY valid JSON, no other text."""

    try:
        response = httpx.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "options": {"temperature": 0.1, "num_predict": 2000}},
            timeout=120,
        )
        if response.status_code != 200:
            return {}
        text = response.json().get("response", "").strip()
        if text.startswith("```"):
            text = re.sub(r"```json?\s*", "", text)
            text = re.sub(r"```\s*$", "", text)
        return json.loads(text)
    except (json.JSONDecodeError, Exception) as e:
        print(f"  [ERROR] Ollama: {e}")
        return {}


def extract_simple(pages: dict, website: str) -> dict:
    domain = urlparse(website).netloc
    name = domain.replace("www.", "").split(".")[0].title()
    description = pages.get("home", "")[:200].replace("\n", " ").strip() if "home" in pages else ""
    return {"name": name, "description": description, "website": website, "products": [], "extracted_at": datetime.now(timezone.utc).isoformat()}


def save_vendor(vendor: dict, website: str) -> bool:
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("  [LOCAL] Would save:", json.dumps(vendor, indent=2)[:500])
        return True

    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json", "Prefer": "return=minimal"}
    # Map to vendors table schema
    # Generate a deterministic ID from the company name
    import hashlib as _h
    id_num = int(_h.md5(vendor.get("name", "x").encode()).hexdigest()[:8], 16) % 900000 + 100000
    slug = vendor.get("name", "x").lower().replace(" ", "-").replace(".", "")[:50]
    row = {
        "id": f"disc-{slug}",
        "ID": id_num,
        "company_name": vendor.get("name", "Unknown")[:200],
        "primary_category": vendor.get("industry", "Technology"),
        "sector": vendor.get("industry", "Technology"),
        "description": (vendor.get("description") or vendor.get("tagline") or "")[:500],
        "company_url": website,
        "tags": vendor.get("technologies", [])[:10],
        "status": "discovered",
        "layer": "vendor",
        "extraction_confidence": 0.6,
        "weight": 0.5,
        "confidence": 0.6,
    }
    try:
        resp = httpx.post(f"{SUPABASE_URL}/rest/v1/vendors", headers=headers, json=row, timeout=10)
        if resp.status_code in (200, 201):
            print(f"  Saved: {vendor.get('name')}")
            return True
        print(f"  [ERROR] Save failed: {resp.status_code} {resp.text[:200]}")
        return False
    except Exception as e:
        print(f"  [ERROR] {e}")
        return False


def scrape_vendor(url: str, use_ollama: bool = True) -> dict:
    pages = fetch_all_pages(url)
    if not pages:
        print("  [ERROR] No pages fetched")
        return {}
    if use_ollama:
        print("  Extracting with Ollama...")
        vendor = extract_with_ollama(pages, url)
        if not vendor:
            vendor = extract_simple(pages, url)
    else:
        vendor = extract_simple(pages, url)
    vendor["website"] = url
    save_vendor(vendor, url)
    return vendor


def main():
    if len(sys.argv) < 2:
        print("Usage: python scrape_vendor.py <url_or_file> [--no-ollama]")
        return
    target = sys.argv[1]
    use_ollama = "--no-ollama" not in sys.argv
    if target.endswith(".txt"):
        with open(target) as f:
            urls = [l.strip() for l in f if l.strip() and not l.startswith("#")]
        for url in urls:
            scrape_vendor(url, use_ollama)
    else:
        result = scrape_vendor(target, use_ollama)
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
