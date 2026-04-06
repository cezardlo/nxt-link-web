import os
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv

load_dotenv()
load_dotenv(".env")
load_dotenv(".env.local")
load_dotenv("../.env")
load_dotenv("../.env.local")


def _env(*names: str) -> Optional[str]:
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return None


class Supabase:
    """
    Minimal Supabase REST client (service-role friendly) for Railway runtime.
    """

    def __init__(self) -> None:
        base_url = _env("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL")
        key = _env("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY")

        if not base_url or not key:
            raise RuntimeError(
                "Supabase env missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY)."
            )

        self.base_url = base_url.rstrip("/")
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        self.client = httpx.Client(timeout=15.0)

    def _url(self, table: str) -> str:
        return f"{self.base_url}/rest/v1/{table}"

    def select(self, table: str, params: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
        response = self.client.get(self._url(table), headers=self.headers, params=params or {})
        response.raise_for_status()
        data = response.json()
        return data if isinstance(data, list) else []

    def insert(self, table: str, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        response = self.client.post(
            self._url(table),
            headers={**self.headers, "Prefer": "return=representation"},
            json=data,
        )
        response.raise_for_status()
        result = response.json()
        return result if isinstance(result, list) else []

    def update(
        self,
        table: str,
        data: Dict[str, Any],
        params: Optional[Dict[str, str]] = None,
    ) -> List[Dict[str, Any]]:
        response = self.client.patch(
            self._url(table),
            headers={**self.headers, "Prefer": "return=representation"},
            params=params or {},
            json=data,
        )
        response.raise_for_status()
        result = response.json()
        return result if isinstance(result, list) else []

_db_instance: Supabase | None = None


def get_db() -> Supabase | None:
    global _db_instance
    if _db_instance is not None:
        return _db_instance
    try:
        _db_instance = Supabase()
    except Exception:
        return None
    return _db_instance
