import httpx

from app.crawler.connectors.base import BaseConnector, ConnectorResult


class APIConnector(BaseConnector):
    async def discover(self, base_url: str, headers: dict[str, str] | None = None) -> ConnectorResult:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(base_url, headers=headers)
            response.raise_for_status()
        payload = response.json()
        urls: list[str] = []
        for item in payload if isinstance(payload, list) else payload.get("items", []):
            if isinstance(item, dict):
                for key in ("url", "link", "html_url"):
                    value = item.get(key)
                    if isinstance(value, str):
                        urls.append(value)
                        break
        return ConnectorResult(urls=list(dict.fromkeys(urls)))

