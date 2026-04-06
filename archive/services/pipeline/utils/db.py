"""Supabase REST client — thin wrapper for pipeline agents."""

import httpx
from pipeline.config import SUPABASE_URL, SUPABASE_KEY
from pipeline.utils.sanitize import validate_table_name


class DB:
    """Minimal Supabase REST client."""

    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set")
        self.base = SUPABASE_URL.rstrip("/")
        self.headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        self.client = httpx.Client(timeout=30.0)

    def _url(self, table: str) -> str:
        if not validate_table_name(table):
            raise ValueError(f"Invalid table name: {table}")
        return f"{self.base}/rest/v1/{table}"

    def select(self, table: str, params: dict | None = None) -> list[dict]:
        r = self.client.get(self._url(table), headers=self.headers, params=params or {})
        r.raise_for_status()
        data = r.json()
        return data if isinstance(data, list) else []

    def insert(self, table: str, rows: list[dict] | dict) -> list[dict]:
        r = self.client.post(
            self._url(table),
            headers={**self.headers, "Prefer": "return=representation"},
            json=rows,
        )
        r.raise_for_status()
        data = r.json()
        return data if isinstance(data, list) else []

    def upsert(self, table: str, rows: list[dict] | dict, on_conflict: str = "id") -> list[dict]:
        r = self.client.post(
            self._url(table),
            headers={
                **self.headers,
                "Prefer": "return=representation,resolution=merge-duplicates",
            },
            params={"on_conflict": on_conflict},
            json=rows,
        )
        r.raise_for_status()
        data = r.json()
        return data if isinstance(data, list) else []

    def update(self, table: str, data: dict, params: dict) -> list[dict]:
        r = self.client.patch(
            self._url(table),
            headers={**self.headers, "Prefer": "return=representation"},
            params=params,
            json=data,
        )
        r.raise_for_status()
        result = r.json()
        return result if isinstance(result, list) else []

    def rpc(self, fn: str, params: dict | None = None) -> dict:
        r = self.client.post(
            f"{self.base}/rest/v1/rpc/{fn}",
            headers=self.headers,
            json=params or {},
        )
        r.raise_for_status()
        return r.json()

    def count(self, table: str, params: dict | None = None) -> int:
        r = self.client.get(
            self._url(table),
            headers={**self.headers, "Prefer": "count=exact"},
            params={**(params or {}), "select": "id", "limit": "0"},
        )
        r.raise_for_status()
        content_range = r.headers.get("content-range", "")
        # format: "0-0/1234" or "*/1234"
        if "/" in content_range:
            return int(content_range.split("/")[-1])
        return 0


_instance: DB | None = None


def get_db() -> DB:
    global _instance
    if _instance is None:
        _instance = DB()
    return _instance
