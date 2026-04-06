"""News agent — fetches technology news from RSS feeds."""

import re

import httpx

from ..base import AgentResult, BaseAgent

# Technology keywords for signal detection
TECH_KEYWORDS = [
    "artificial intelligence", "machine learning", "cybersecurity",
    "defense contract", "border technology", "autonomous", "drone",
    "quantum computing", "semiconductor", "5g", "iot", "blockchain",
    "cloud computing", "robotics", "lidar", "radar", "surveillance",
    "biometric", "manufacturing", "supply chain", "logistics",
]

# RSS feeds to monitor
NEWS_FEEDS = [
    ("TechCrunch", "https://techcrunch.com/feed/"),
    ("Defense One", "https://www.defenseone.com/rss/all/"),
    ("FedScoop", "https://fedscoop.com/feed/"),
    ("Ars Technica", "https://feeds.arstechnica.com/arstechnica/index"),
    ("Wired", "https://www.wired.com/feed/rss"),
    ("The Verge", "https://www.theverge.com/rss/index.xml"),
    ("Hacker News", "https://hnrss.org/frontpage"),
]


def _extract_companies(text: str) -> list[str]:
    """Extract potential company names (capitalized multi-word sequences)."""
    # Simple heuristic: sequences of 2-4 capitalized words
    pattern = r"\b([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})\b"
    matches = re.findall(pattern, text)
    # Filter out common non-company phrases
    stopwords = {"The New", "New York", "United States", "Last Year", "This Year"}
    return [m for m in matches if m not in stopwords][:5]


class NewsAgent(BaseAgent):
    """Fetches technology news from RSS feeds and extracts signals.

    Detects company mentions and technology keywords in news articles.
    """

    name = "news"
    description = "Technology news signals from RSS feeds"
    group = "discovery"
    cadence_hours = 1

    async def run(self) -> AgentResult:
        entities: list[dict[str, str | list[str]]] = []
        signals: list[dict[str, str | float | list[str]]] = []

        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            for feed_name, feed_url in NEWS_FEEDS:
                try:
                    resp = await client.get(feed_url)
                    if resp.status_code != 200:
                        self.logger.warning(
                            "Feed %s returned %d", feed_name, resp.status_code
                        )
                        continue

                    # Simple XML title extraction (avoid heavy XML parser dependency)
                    xml = resp.text
                    titles = re.findall(r"<title[^>]*>([^<]+)</title>", xml)

                    for title in titles[:20]:
                        title = title.strip()
                        if not title or title == feed_name:
                            continue

                        # Check for technology keyword matches
                        title_lower = title.lower()
                        matched_keywords = [
                            kw for kw in TECH_KEYWORDS if kw in title_lower
                        ]
                        if not matched_keywords:
                            continue

                        companies = _extract_companies(title)
                        for company in companies:
                            entities.append(
                                {
                                    "name": company,
                                    "source": f"news:{feed_name}",
                                    "keywords": matched_keywords,
                                }
                            )

                        signals.append(
                            {
                                "type": "product_launch",
                                "title": title[:120],
                                "source_feed": feed_name,
                                "keywords": matched_keywords,
                                "confidence": min(0.5 + len(matched_keywords) * 0.1, 0.9),
                            }
                        )
                except httpx.HTTPError as exc:
                    self.logger.warning("Feed %s error: %s", feed_name, exc)

        return AgentResult(
            success=True,
            entities_found=len(entities),
            signals_found=len(signals),
            data={"entities": entities, "signals": signals},
        )
