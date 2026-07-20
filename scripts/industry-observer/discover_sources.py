#!/usr/bin/env python3
"""
NXT LINK Industry Observer — Source Discovery
Finds RSS feeds and news sources for each industry using Bing/Google search.
Outputs discovered_sources.json
"""

import json
import os
import time
from pathlib import Path
from datetime import datetime

import requests
import feedparser

# ─── Config ────────────────────────────────────────────────────────────────────

INDUSTRIES = {
    "ai-ml":          ["artificial intelligence", "machine learning", "generative AI", "edge AI", "MLOps"],
    "cybersecurity":  ["cybersecurity", "zero trust", "endpoint detection", "SIEM", "threat intelligence"],
    "defense":        ["defense technology", "ISR systems", "electronic warfare", "C4ISR", "autonomous weapons"],
    "border-tech":    ["border security technology", "biometrics", "cargo scanning", "RFID tracking"],
    "manufacturing":  ["smart manufacturing", "Industry 4.0", "additive manufacturing", "cobots", "digital twin"],
    "energy":         ["smart grid", "utility solar", "battery storage", "microgrids", "grid AI"],
    "healthcare":     ["health technology", "telemedicine", "EHR systems", "medical imaging AI", "remote patient monitoring"],
    "logistics":      ["logistics technology", "warehouse automation", "fleet management", "supply chain visibility", "route optimization"],
}

BING_API_KEY = os.environ.get("BING_API_KEY", "")
OUTPUT_DIR = Path(__file__).parent / "output"


def search_bing_rss(query: str, count: int = 20) -> list[dict]:
    """Search Bing News RSS for sources related to query."""
    url = f"https://www.bing.com/news/search?q={requests.utils.quote(query)}&format=rss&count={count}"
    try:
        feed = feedparser.parse(url)
        results = []
        for entry in feed.entries[:count]:
            results.append({
                "title": entry.get("title", ""),
                "link": entry.get("link", ""),
                "source": entry.get("source", {}).get("title", "unknown"),
                "published": entry.get("published", ""),
            })
        return results
    except Exception as e:
        print(f"  [!] Bing RSS error for '{query}': {e}")
        return []


def discover_rss_feeds(domain: str) -> list[str]:
    """Try to find RSS feed URLs for a given domain."""
    feed_paths = ["/feed", "/rss", "/feed/rss", "/blog/feed", "/news/feed", "/atom.xml", "/rss.xml", "/feed.xml"]
    found = []
    for path in feed_paths:
        url = f"https://{domain}{path}"
        try:
            resp = requests.head(url, timeout=5, allow_redirects=True)
            if resp.status_code == 200:
                content_type = resp.headers.get("content-type", "")
                if "xml" in content_type or "rss" in content_type or "atom" in content_type:
                    found.append(url)
        except Exception:
            pass
    return found


def run_discovery():
    """Main discovery loop across all industries."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_sources: dict[str, list[dict]] = {}
    seen_domains: set[str] = set()

    for slug, keywords in INDUSTRIES.items():
        print(f"\n{'='*60}")
        print(f"  INDUSTRY: {slug}")
        print(f"{'='*60}")

        industry_sources = []

        for keyword in keywords:
            print(f"  Searching: {keyword}...")
            results = search_bing_rss(keyword)
            print(f"    Found {len(results)} articles")

            for r in results:
                try:
                    domain = requests.utils.urlparse(r["link"]).netloc
                except Exception:
                    continue

                if domain and domain not in seen_domains:
                    seen_domains.add(domain)
                    feeds = discover_rss_feeds(domain)
                    industry_sources.append({
                        "domain": domain,
                        "sample_title": r["title"],
                        "sample_url": r["link"],
                        "source_name": r["source"],
                        "rss_feeds": feeds,
                        "keyword": keyword,
                        "discovered_at": datetime.utcnow().isoformat(),
                    })

            time.sleep(1)  # rate limit

        all_sources[slug] = industry_sources
        print(f"  Total unique domains for {slug}: {len(industry_sources)}")

    # Write output
    output_path = OUTPUT_DIR / "discovered_sources.json"
    with open(output_path, "w") as f:
        json.dump({
            "discovered_at": datetime.utcnow().isoformat(),
            "total_domains": len(seen_domains),
            "industries": all_sources,
        }, f, indent=2)

    print(f"\nDone! {len(seen_domains)} unique domains → {output_path}")


if __name__ == "__main__":
    run_discovery()
