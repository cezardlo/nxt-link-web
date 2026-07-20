"""
nxtlink catalog maintenance — Python version of the /api/admin/* jobs.

Runs three passes against the Supabase `vendors` table:
  1. Mark junk rows (mid-sentence text, sponsor labels, JS variable names)
  2. Mark duplicate rows (same company under multiple URLs)
  3. Import / re-classify Y Combinator companies

Same logic as the deployed Next.js endpoints; provided as a Python script so it
can be run from any machine without going through the web app.

Usage
-----
1. Install Python 3.10+ if you don't have it.
2. From this folder, install the package:
       pip install -r requirements.txt
3. Export two environment variables (or put them in a .env file in this folder):
       SUPABASE_URL=https://yvykselwehxjwsqercjg.supabase.co
       SUPABASE_SERVICE_ROLE_KEY=<your service_role key>
4. Run:
       python run_catalog_jobs.py            # runs all three jobs
       python run_catalog_jobs.py junk       # just the junk cleanup
       python run_catalog_jobs.py dedup      # just dedup
       python run_catalog_jobs.py yc         # just YC import + reclassify

Notes
-----
- This script never touches rows whose status is already 'active' or 'approved'.
- Idempotent — safe to re-run any number of times.
- The service role key is sensitive. Don't commit it. Don't paste it anywhere
  public.
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
import uuid
from typing import Any
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

try:
    from supabase import create_client, Client
except ImportError:
    print("Missing dependency. Run: pip install -r requirements.txt", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

# Optional: load from a .env file sitting beside this script.
def _load_dotenv() -> None:
    here = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(here, ".env")
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://yvykselwehxjwsqercjg.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

YC_APP = os.environ.get("YC_ALGOLIA_APP", "45BWZJ1SGC")
YC_KEY = os.environ.get(
    "YC_ALGOLIA_SEARCH_KEY",
    "NzllNTY5MzJiZGM2OTY2ZTQwMDEzOTNhYWZiZGRjODlhYzVkNjBmOGRjNzJiMWM4ZTU0ZDlhYTZjOTJiMjlhMWFuYWx5dGljc1RhZ3M9eWNkYyZyZXN0cmljdEluZGljZXM9WUNDb21wYW55X3Byb2R1Y3Rpb24lMkNZQ0NvbXBhbnlfQnlfTGF1bmNoX0RhdGVfcHJvZHVjdGlvbiZ0YWdGaWx0ZXJzPSU1QiUyMnljZGNfcHVibGljJTIyJTVE",
)
YC_INDEX = os.environ.get("YC_ALGOLIA_INDEX", "YCCompany_production")


def get_supabase() -> Client:
    if not SUPABASE_SERVICE_ROLE_KEY:
        print(
            "ERROR: SUPABASE_SERVICE_ROLE_KEY is not set. Export it or put it in a "
            ".env file beside this script. Anon key cannot UPDATE the vendors table.",
            file=sys.stderr,
        )
        sys.exit(2)
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def normalize_url(url: str | None) -> str:
    """Strip protocol/www/trailing slash/query string for a stable comparison key."""
    if not url:
        return ""
    s = url.strip()
    if not s:
        return ""
    s = re.sub(r"^https?://", "", s, flags=re.I)
    s = re.sub(r"^www\.", "", s, flags=re.I)
    s = re.sub(r"\?.*$", "", s)
    s = s.rstrip("/")
    return s.lower()


def fetch_all(client: Client, table: str, columns: str, filters: dict | None = None, page: int = 1000) -> list[dict]:
    """Page through a Supabase table, returning every matching row."""
    out: list[dict] = []
    start = 0
    while True:
        q = client.table(table).select(columns)
        for k, v in (filters or {}).items():
            q = q.eq(k, v)
        res = q.range(start, start + page - 1).execute()
        rows = res.data or []
        if not rows:
            break
        out.extend(rows)
        if len(rows) < page:
            break
        start += page
    return out


# ---------------------------------------------------------------------------
# Job 1 — junk cleanup
# ---------------------------------------------------------------------------

STOP_END = re.compile(r"\s(the|and|or|in|on|at|to|for|of|with|from|by|including|during|when|that|this|these|those)\s*$", re.I)
ARTICLE_START = re.compile(r"^(the|a|an)\s+", re.I)
PAGE_CHROME = re.compile(
    r"(during the show|posted on|show floor|exhibit hall|networking break|coffee break|opening reception|"
    r"closing reception|move-?in|move-?out|breakdown|booth setup|press kits|use it to send|take advantage of|"
    r"attend to evaluate|expert support for|boost(s|) your visibility|key prospects)",
    re.I,
)
SPONSOR_LABEL = re.compile(r"^(stand|booth|table|hall|level|silver|gold|bronze|platinum)\s*[-:—]", re.I)
PRICE_TIER = re.compile(r"^\$|—\$|^bronze\s*—|^silver\s*—|^gold\s*—|^platinum\s*—", re.I)
ADMIN_HEADERS = re.compile(
    r"^(meeting cadence|actual date|breakdown|exhibit$|sponsors?\s*&?\s*partners|webinars(\s*&\s*demos)?|"
    r"training events|new exhibitors|regional events|patrocinadora\s+anfitri.+\s+\d{4}|share recent|"
    r"navigate the show|another successful)",
    re.I,
)
STOP_WORDS = {
    "the", "and", "or", "of", "for", "with", "from", "by", "in", "on", "at", "to", "as",
    "is", "are", "was", "were", "breakdown", "breakdown.", "convention", "exhibit", "exhibitor",
    "exhibition", "sponsor", "sponsorship", "event", "events", "free", "professional",
    "enterprise", "startup", "resource", "technology", "engineering", "consulting",
    "consulting.", "government", "mid-market", "small", "medium", "large", "services",
    "provider", "providers", "solution", "solutions", "world", "global", "regional", "local",
    "speakersfeature", "autoselectedcurrency", "dynamic_base", "currentnav",
}


def is_junk_name(raw: str | None) -> bool:
    if not raw:
        return True
    name = raw.strip()
    if not (3 <= len(name) <= 100):
        return True
    if name.isdigit():
        return True
    if re.fullmatch(r"[\W_]+", name):
        return True
    if re.search(r",\s*$", name):
        return True
    if STOP_END.search(name):
        return True
    if ARTICLE_START.search(name):
        return True
    if PAGE_CHROME.search(name):
        return True
    if SPONSOR_LABEL.search(name):
        return True
    if PRICE_TIER.search(name):
        return True
    if ADMIN_HEADERS.search(name):
        return True
    if name.lower() in STOP_WORDS:
        return True
    if re.match(r"^[a-z]", name):
        if " " in name:
            return True
        if len(name) < 4 and re.fullmatch(r"[a-z]+", name):
            return True
    words = name.split()
    if len(words) >= 5 and not re.search(r"[A-Z]{2,}|[A-Z]\w*\s+[A-Z]", name):
        return True
    return False


def clean_junk(client: Client) -> dict[str, Any]:
    print("[junk] fetching all vendor rows ...")
    rows = fetch_all(client, "vendors", "id, company_name, source, status")
    print(f"[junk] inspecting {len(rows)} rows")

    protected = {"active", "approved", "duplicate", "junk"}
    targets: list[str] = []
    skipped_yc = skipped_protected = clean = 0
    for r in rows:
        if r.get("source") == "yc":
            skipped_yc += 1
            continue
        st = r.get("status")
        if st in protected:
            skipped_protected += 1
            continue
        if not is_junk_name(r.get("company_name")):
            clean += 1
            continue
        targets.append(r["id"])

    marked = 0
    for i in range(0, len(targets), 200):
        batch = targets[i : i + 200]
        client.table("vendors").update({"status": "junk"}).in_("id", batch).execute()
        marked += len(batch)
        print(f"[junk] marked {marked}/{len(targets)}")
    return {"inspected": len(rows), "skippedYc": skipped_yc, "skippedProtected": skipped_protected, "cleanRows": clean, "marked": marked}


# ---------------------------------------------------------------------------
# Job 2 — dedup
# ---------------------------------------------------------------------------

def quality_rank(r: dict) -> int:
    n = 0
    if (r.get("description") or "").strip():
        n += 1_000_000
    iker = r.get("iker_score") or 0
    n += min(max(iker, 0), 999) * 1000
    if r.get("tags"):
        n += 100
    if r.get("hq_country"):
        n += 10
    return n


def dedup_vendors(client: Client) -> dict[str, Any]:
    print("[dedup] fetching all vendors with company_url ...")
    rows = fetch_all(
        client,
        "vendors",
        "id, company_url, description, iker_score, tags, hq_country, created_at, status, sector",
    )
    rows = [r for r in rows if r.get("company_url") and r.get("sector")]
    print(f"[dedup] {len(rows)} rows have URL + sector")

    groups: dict[str, list[dict]] = {}
    for r in rows:
        norm = normalize_url(r.get("company_url"))
        if not norm:
            continue
        groups.setdefault(norm, []).append(r)

    losers: list[str] = []
    restore: list[str] = []
    for norm, group in groups.items():
        if len(group) < 2:
            if group[0].get("status") == "duplicate":
                restore.append(group[0]["id"])
            continue
        group.sort(key=lambda r: (quality_rank(r), r.get("created_at") or ""), reverse=True)
        winner = group[0]
        if winner.get("status") == "duplicate":
            restore.append(winner["id"])
        for loser in group[1:]:
            if loser.get("status") != "duplicate":
                losers.append(loser["id"])

    marked = 0
    for i in range(0, len(losers), 200):
        batch = losers[i : i + 200]
        client.table("vendors").update({"status": "duplicate"}).in_("id", batch).execute()
        marked += len(batch)
        print(f"[dedup] marked duplicate: {marked}/{len(losers)}")

    restored = 0
    for i in range(0, len(restore), 200):
        batch = restore[i : i + 200]
        client.table("vendors").update({"status": "discovered"}).in_("id", batch).eq("status", "duplicate").execute()
        restored += len(batch)
    return {"vendorsWithUrl": len(rows), "uniqueUrls": len(groups), "marked": marked, "restored": restored}


# ---------------------------------------------------------------------------
# Job 3 — YC import + reclassify
# ---------------------------------------------------------------------------

YC_INDUSTRY_MAP: dict[str, str] = {
    # Manufacturing
    "Industrials": "manufacturing", "Hardware": "manufacturing", "Robotics": "manufacturing",
    "Aviation and Space": "manufacturing", "Aerospace": "manufacturing",
    "Manufacturing and Robotics": "manufacturing", "Construction": "manufacturing",
    # Healthcare
    "Healthcare": "healthcare", "Healthcare and Diagnostics": "healthcare", "Healthcare IT": "healthcare",
    "Healthcare Services": "healthcare", "Therapeutics": "healthcare", "Drug Discovery": "healthcare",
    "Telehealth": "healthcare", "Medical Devices": "healthcare",
    # Defense
    "Government": "defense", "Defense and National Security": "defense", "Government and Defense": "defense",
    # Cybersecurity
    "Security": "cybersecurity", "Cybersecurity": "cybersecurity",
    # Energy
    "Energy": "energy", "Energy and Environment": "energy", "Climate": "energy", "Sustainability": "energy",
    # Logistics
    "Logistics": "logistics", "Logistics and Supply Chain": "logistics", "Supply Chain": "logistics",
    "Transportation": "logistics", "Transportation and Logistics": "logistics", "Automotive": "logistics",
    # AI/ML
    "B2B": "ai-ml", "Engineering, Product and Design": "ai-ml", "Operations": "ai-ml",
    "Sales": "ai-ml", "Marketing": "ai-ml", "Productivity": "ai-ml", "Analytics": "ai-ml",
    "Data Engineering": "ai-ml", "Infrastructure": "ai-ml", "DevOps and IT": "ai-ml",
    "Generative AI": "ai-ml", "AI": "ai-ml", "Artificial Intelligence": "ai-ml", "Machine Learning": "ai-ml",
}

INDUSTRY_LABELS: dict[str, str] = {
    "ai-ml": "AI/ML", "cybersecurity": "Cybersecurity", "defense": "Defense",
    "border-tech": "Border Tech", "manufacturing": "Manufacturing", "energy": "Energy",
    "healthcare": "Healthcare", "logistics": "Logistics",
}


def pick_industry(hit: dict) -> str | None:
    candidates = list(hit.get("industries") or [])
    for k in ("industry", "subindustry"):
        v = hit.get(k)
        if v:
            candidates.append(v)
    for c in candidates:
        if c in YC_INDUSTRY_MAP:
            return YC_INDUSTRY_MAP[c]
        for key, slug in YC_INDUSTRY_MAP.items():
            if key.lower() == c.lower():
                return slug
    return None


def pick_country(hit: dict) -> str | None:
    c = (hit.get("country") or "").strip()
    if c:
        return c
    for r in hit.get("regions") or []:
        if not r:
            continue
        low = r.lower()
        if low == "remote" or "remote" in low or "america / canada" in low or low == "global":
            continue
        return r
    return None


def bucket_team_size(n: int | None) -> str | None:
    if not n or n <= 0:
        return None
    if n <= 10: return "1-10"
    if n <= 50: return "11-50"
    if n <= 200: return "51-200"
    if n <= 500: return "201-500"
    if n <= 1000: return "501-1000"
    if n <= 5000: return "1001-5000"
    return "5001+"


def fetch_yc_query(params: str) -> dict | None:
    """Fetch from YC's Algolia. Origin/Referer required by their secured key."""
    url = f"https://{YC_APP.lower()}-dsn.algolia.net/1/indexes/{YC_INDEX}/query"
    body = json.dumps({"params": params}).encode("utf-8")
    req = Request(
        url,
        data=body,
        method="POST",
        headers={
            "X-Algolia-Application-Id": YC_APP,
            "X-Algolia-API-Key": YC_KEY,
            "Content-Type": "application/json",
            "Origin": "https://www.ycombinator.com",
            "Referer": "https://www.ycombinator.com/companies",
            "User-Agent": "nxtlink-import/1.0-py",
        },
    )
    try:
        with urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (HTTPError, URLError, json.JSONDecodeError) as e:
        print(f"[yc] Algolia fetch failed: {e}", file=sys.stderr)
        return None


def import_yc(client: Client) -> dict[str, Any]:
    print("[yc] listing batches ...")
    facet_resp = fetch_yc_query("hitsPerPage=0&facets=%5B%22batch%22%5D")
    if not facet_resp:
        return {"error": "Algolia facet fetch failed"}
    batches = list((facet_resp.get("facets", {}).get("batch") or {}).keys())
    print(f"[yc] {len(batches)} batches to fetch")

    all_hits: list[dict] = []
    seen: set[str] = set()
    for batch in batches:
        from urllib.parse import quote
        ff = quote(json.dumps([f"batch:{batch}"]), safe="")
        r = fetch_yc_query(f"hitsPerPage=1000&facetFilters={ff}")
        if not r:
            continue
        for hit in r.get("hits", []):
            key = hit.get("objectID") or f"{hit.get('name')}::{hit.get('website')}"
            if key in seen:
                continue
            seen.add(key)
            all_hits.append(hit)
    print(f"[yc] fetched {len(all_hits)} unique YC companies")

    # Existing URLs (so we know what to skip on insert).
    existing = fetch_all(client, "vendors", "id, company_url, sector, hq_country, source, status")
    existing_norms = {normalize_url(r.get("company_url") or "") for r in existing if r.get("company_url")}
    yc_existing_by_norm: dict[str, dict] = {}
    for r in existing:
        if r.get("source") == "yc":
            n = normalize_url(r.get("company_url") or "")
            if n:
                yc_existing_by_norm[n] = r

    # Find max numeric ID for new inserts.
    max_id_resp = client.table("vendors").select('"ID"').order('"ID"', desc=True).limit(1).execute()
    max_id = 0
    if max_id_resp.data:
        max_id = max_id_resp.data[0].get("ID") or 0
    next_numeric = max_id + 1

    # Build insert list.
    to_insert: list[dict] = []
    skipped_no_url = skipped_closed = skipped_dup = 0
    update_map: dict[str, dict] = {}
    for hit in all_hits:
        if not hit.get("name") or not hit.get("website"):
            skipped_no_url += 1
            continue
        if hit.get("status") and re.match(r"^(dead|acquired|inactive)$", hit["status"], re.I):
            skipped_closed += 1
            continue
        norm = normalize_url(hit.get("website") or "")
        if not norm:
            skipped_no_url += 1
            continue

        slug = pick_industry(hit)
        sector = "Other" if not slug else ("AI/ML" if slug == "ai-ml" else INDUSTRY_LABELS.get(slug, "Other"))
        country = pick_country(hit)

        if norm in existing_norms:
            skipped_dup += 1
            # Capture for reclassify pass.
            update_map[norm] = {"sector": sector, "country": country}
            continue

        existing_norms.add(norm)
        tags = list({
            v for v in (
                [f"YC {hit['batch']}"] if hit.get("batch") else []
            ) + (hit.get("industries") or []) + ([hit.get("industry")] if hit.get("industry") else []) + ([hit.get("subindustry")] if hit.get("subindustry") else []) + (hit.get("tags") or [])
            if v
        })
        to_insert.append({
            "id": str(uuid.uuid4()),
            "ID": next_numeric,
            "company_name": hit["name"],
            "company_url": hit["website"],
            "description": hit.get("long_description") or hit.get("one_liner") or None,
            "sector": sector,
            "primary_category": sector,
            "hq_country": country,
            "hq_city": None,
            "employee_count_range": bucket_team_size(hit.get("team_size")),
            "tags": tags,
            "status": "active",
            "source": "yc",
            "industries": [slug] if slug else None,
        })
        next_numeric += 1

    inserted = 0
    for i in range(0, len(to_insert), 200):
        batch = to_insert[i : i + 200]
        client.table("vendors").insert(batch).execute()
        inserted += len(batch)
        print(f"[yc] inserted {inserted}/{len(to_insert)}")

    # Reclassify pass: update existing source='yc' rows whose sector/country are stale.
    update_groups: dict[tuple[str, str | None], list[str]] = {}
    for norm, row in yc_existing_by_norm.items():
        target = update_map.get(norm)
        if not target:
            continue
        new_sector = target["sector"]
        new_country = target["country"]
        if row.get("sector") == new_sector and row.get("hq_country") == new_country:
            continue
        update_groups.setdefault((new_sector, new_country), []).append(row["id"])

    updated = 0
    for (sector, country), ids in update_groups.items():
        for i in range(0, len(ids), 200):
            batch = ids[i : i + 200]
            client.table("vendors").update({
                "sector": sector,
                "primary_category": sector,
                "hq_country": country,
            }).in_("id", batch).execute()
            updated += len(batch)
    print(f"[yc] reclassified {updated} existing YC rows")

    return {
        "ycCompaniesFetched": len(all_hits),
        "skippedNoUrl": skipped_no_url,
        "skippedClosed": skipped_closed,
        "skippedDuplicate": skipped_dup,
        "inserted": inserted,
        "existingYcReclassified": updated,
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

JOBS = {"junk": clean_junk, "dedup": dedup_vendors, "yc": import_yc}


def main(argv: list[str]) -> None:
    client = get_supabase()
    selected = argv[1:] if len(argv) > 1 else list(JOBS.keys())
    unknown = [j for j in selected if j not in JOBS]
    if unknown:
        print(f"Unknown job(s): {unknown}. Choose from {list(JOBS.keys())}.", file=sys.stderr)
        sys.exit(1)

    overall_start = time.time()
    results: dict[str, Any] = {}
    for name in selected:
        print(f"\n=== {name.upper()} ===")
        t0 = time.time()
        try:
            results[name] = JOBS[name](client)
            results[name]["durationMs"] = int((time.time() - t0) * 1000)
            print(f"[{name}] done in {results[name]['durationMs']} ms")
        except Exception as e:  # noqa: BLE001
            results[name] = {"error": str(e), "durationMs": int((time.time() - t0) * 1000)}
            print(f"[{name}] FAILED: {e}", file=sys.stderr)

    print("\n=== SUMMARY ===")
    print(json.dumps(results, indent=2))
    print(f"Total runtime: {int((time.time() - overall_start) * 1000)} ms")


if __name__ == "__main__":
    main(sys.argv)
