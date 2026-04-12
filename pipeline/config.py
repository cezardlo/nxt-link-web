"""Pipeline configuration — loads from .env or environment."""

import os
from pathlib import Path

ENV_FILE = Path(__file__).parent.parent / ".env"
if ENV_FILE.exists():
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, val = line.partition("=")
            os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
MAX_CONCURRENT_REQUESTS = int(os.environ.get("SCRAPE_CONCURRENCY", "5"))
REQUEST_TIMEOUT = int(os.environ.get("SCRAPE_TIMEOUT", "30"))
SITE_URL = os.environ.get("SITE_URL", "http://localhost:3000")
