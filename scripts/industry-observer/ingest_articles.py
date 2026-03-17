#!/usr/bin/env python3
"""
NXT LINK Industry Observer — Article Ingestion
Fetches articles from discovered sources, extracts structured facts.
Uses newspaper4k for extraction + spaCy for NLP.
Outputs ingested_articles.json
"""

import json
import re
import time
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse

import requests
import feedparser
from newspaper import Article
from tqdm import tqdm

# ─── Config ────────────────────────────────────────────────────────────────────

INPUT_PATH = Path(__file__).parent / "output" / "discovered_sources.json"
OUTPUT_DIR = Path(__file__).parent / "output"
MAX_ARTICLES_PER_FEED = 20
MAX_TOTAL_PER_INDUSTRY = 100
REQUEST_TIMEOUT = 10

# Keywords for structured extraction
COMPANY_PATTERNS = [
    r"(?:by|from|at|with)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})",
    r"([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+(?:announced|launched|released|deployed|unveiled)",
]

PRODUCT_KEYWORDS = [
    "platform", "solution", "system", "software", "product", "tool", "suite",
    "framework", "module", "engine", "device", "sensor", "robot",
]

PROBLEM_KEYWORDS = [
    "solves", "addresses", "reduces", "eliminates", "improves", "automates",
    "prevents", "detects", "monitors", "optimizes", "streamlines",
]


def extract_article(url: str) -> dict | None:
    """Download and parse a single article."""
    try:
        article = Article(url)
        article.download()
        article.parse()
        article.nlp()

        return {
            "url": url,
            "title": article.title,
            "text": article.text[:5000],  # cap at 5k chars
            "summary": article.summary,
            "keywords": article.keywords,
            "authors": article.authors,
            "publish_date": article.publish_date.isoformat() if article.publish_date else None,
            "domain": urlparse(url).netloc,
        }
    except Exception as e:
        return None


def extract_facts(article: dict) -> dict:
    """Extract structured facts from article text."""
    text = article.get("text", "")
    title = article.get("title", "")
    combined = f"{title} {text}"

    # Extract potential company names
    companies = set()
    for pattern in COMPANY_PATTERNS:
        matches = re.findall(pattern, combined)
        for m in matches:
            name = m.strip()
            if len(name) > 2 and not name.lower() in {"the", "and", "for", "with", "from"}:
                companies.add(name)

    # Extract product mentions
    products = []
    sentences = combined.split(".")
    for sent in sentences:
        sent_lower = sent.lower()
        if any(kw in sent_lower for kw in PRODUCT_KEYWORDS):
            products.append(sent.strip()[:200])

    # Extract problems solved
    problems = []
    for sent in sentences:
        sent_lower = sent.lower()
        if any(kw in sent_lower for kw in PROBLEM_KEYWORDS):
            problems.append(sent.strip()[:200])

    return {
        "companies": list(companies)[:10],
        "product_mentions": products[:5],
        "problems_addressed": problems[:5],
        "keywords": article.get("keywords", []),
    }


def run_ingestion():
    """Main ingestion loop."""
    if not INPUT_PATH.exists():
        print(f"[!] No discovered sources found at {INPUT_PATH}")
        print("    Run discover_sources.py first.")
        return

    with open(INPUT_PATH) as f:
        sources = json.load(f)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    all_articles: dict[str, list[dict]] = {}

    for slug, industry_sources in sources.get("industries", {}).items():
        print(f"\n{'='*60}")
        print(f"  INGESTING: {slug}")
        print(f"{'='*60}")

        articles = []
        feed_urls = []

        # Collect all RSS feed URLs for this industry
        for src in industry_sources:
            feed_urls.extend(src.get("rss_feeds", []))
            # Also add sample URLs as direct articles
            if src.get("sample_url"):
                feed_urls.append(src["sample_url"])

        feed_urls = list(set(feed_urls))[:50]  # dedupe & cap
        print(f"  {len(feed_urls)} unique feed/article URLs")

        article_urls = set()

        # Parse RSS feeds to get article URLs
        for feed_url in tqdm(feed_urls, desc="  Parsing feeds"):
            if feed_url.endswith((".xml", "/feed", "/rss", "/atom")):
                try:
                    feed = feedparser.parse(feed_url)
                    for entry in feed.entries[:MAX_ARTICLES_PER_FEED]:
                        if entry.get("link"):
                            article_urls.add(entry["link"])
                except Exception:
                    pass
            else:
                article_urls.add(feed_url)

            if len(article_urls) >= MAX_TOTAL_PER_INDUSTRY:
                break

        print(f"  {len(article_urls)} article URLs to process")

        # Extract articles
        for url in tqdm(list(article_urls)[:MAX_TOTAL_PER_INDUSTRY], desc="  Extracting"):
            result = extract_article(url)
            if result:
                facts = extract_facts(result)
                result["extracted_facts"] = facts
                articles.append(result)
            time.sleep(0.5)  # rate limit

        all_articles[slug] = articles
        print(f"  Successfully extracted {len(articles)} articles for {slug}")

    # Write output
    output_path = OUTPUT_DIR / "ingested_articles.json"
    with open(output_path, "w") as f:
        json.dump({
            "ingested_at": datetime.utcnow().isoformat(),
            "total_articles": sum(len(a) for a in all_articles.values()),
            "industries": all_articles,
        }, f, indent=2)

    total = sum(len(a) for a in all_articles.values())
    print(f"\nDone! {total} articles ingested → {output_path}")


if __name__ == "__main__":
    run_ingestion()
