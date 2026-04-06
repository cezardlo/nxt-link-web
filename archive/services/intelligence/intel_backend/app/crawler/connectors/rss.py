import feedparser
import httpx

from app.crawler.connectors.base import BaseConnector, ConnectorResult


class RSSConnector(BaseConnector):
    async def discover(self, base_url: str, headers: dict[str, str] | None = None) -> ConnectorResult:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(base_url, headers=headers)
            response.raise_for_status()
        parsed = feedparser.parse(response.text)
        urls = [entry.link for entry in parsed.entries if getattr(entry, "link", None)]
        return ConnectorResult(
            urls=list(dict.fromkeys(urls)),
            etag=response.headers.get("etag"),
            last_modified=response.headers.get("last-modified"),
            metadata={"feed_title": parsed.feed.get("title")},
        )

