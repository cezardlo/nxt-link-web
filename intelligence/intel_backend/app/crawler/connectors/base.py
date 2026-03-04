from dataclasses import dataclass
from typing import Any


@dataclass
class ConnectorResult:
    urls: list[str]
    etag: str | None = None
    last_modified: str | None = None
    metadata: dict[str, Any] | None = None


class BaseConnector:
    async def discover(self, base_url: str, headers: dict[str, str] | None = None) -> ConnectorResult:
        raise NotImplementedError

