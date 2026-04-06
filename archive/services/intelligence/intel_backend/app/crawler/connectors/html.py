import re
from urllib.parse import urljoin

import httpx

from app.crawler.connectors.base import BaseConnector, ConnectorResult


class HTMLConnector(BaseConnector):
    async def discover(self, base_url: str, headers: dict[str, str] | None = None) -> ConnectorResult:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            response = await client.get(base_url, headers=headers)
            response.raise_for_status()
        hrefs = re.findall(r'href=["\'](.*?)["\']', response.text, flags=re.IGNORECASE)
        urls = [urljoin(str(response.url), href) for href in hrefs if href and not href.startswith("#")]
        return ConnectorResult(
            urls=list(dict.fromkeys(urls)),
            etag=response.headers.get("etag"),
            last_modified=response.headers.get("last-modified"),
        )

