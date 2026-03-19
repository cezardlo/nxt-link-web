# audit.py
# The most important file we will ever write
# It answers one question:
# What do we actually have?

import os
import urllib.request
import json
from datetime import datetime

load_dotenv_manually = True

# manually read .env since python-dotenv may not work
env = {}
for fname in [".env", ".env.local"]:
    try:
        with open(fname) as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass

url = env.get("NEXT_PUBLIC_SUPABASE_URL")
key = env.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    exit(1)


def query(table, params="", limit=5, count=False):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if count:
        headers["Prefer"] = "count=exact"
        headers["Range-Unit"] = "items"
        headers["Range"] = "0-0"

    endpoint = f"{url}/rest/v1/{table}?{params}&limit={limit}"
    req = urllib.request.Request(endpoint, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read())
        cr = resp.headers.get("content-range", "")
        raw = cr.split("/")[1] if "/" in cr else ""
        total = int(raw) if raw.isdigit() else None
        return data, total


def audit():
    print("\n" + "━"*50)
    print("NXT LINK DATA AUDIT")
    print(datetime.now().strftime("%B %d %Y %H:%M"))
    print("━"*50)

    # ── SIGNALS ──────────────────────────────────────
    print("\n📡 SIGNALS")
    _, total = query("intel_signals", "select=id", count=True)
    print(f"  Total rows: {total}")

    data, _ = query("intel_signals", "select=industry&limit=1500", limit=1500)
    counts = {}
    for s in data:
        ind = s.get("industry") or "none"
        counts[ind] = counts.get(ind, 0) + 1
    print("\n  BY INDUSTRY:")
    for ind, n in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"    {ind:<20} {n}")

    data, _ = query("intel_signals", "select=id,title,industry,importance_score&order=created_at.desc", limit=5)
    print(f"\n  LAST 5 SIGNALS:")
    for s in data:
        print(f"  ─────────────────────────────")
        print(f"  Title:    {str(s.get('title',''))[:60]}")
        print(f"  Industry: {s.get('industry')}")
        print(f"  Score:    {s.get('importance_score')}")

    # ── VENDORS ──────────────────────────────────────
    print("\n\n🏢 VENDORS")
    _, total = query("vendors", "select=id", count=True)
    print(f"  Total rows: {total}")

    data, _ = query("vendors", "select=company_name,iker_score,sector,status&order=iker_score.desc", limit=10)
    print(f"\n  TOP 10 BY IKER SCORE:")
    for v in data:
        print(f"  ─────────────────────────────")
        print(f"  Name:   {v.get('company_name')}")
        print(f"  IKER:   {v.get('iker_score')}")
        print(f"  Sector: {v.get('sector')}")
        print(f"  Status: {v.get('status')}")

    # iker score distribution
    data, _ = query("vendors", "select=iker_score", limit=300)
    scores = [v.get("iker_score") for v in data if v.get("iker_score") is not None]
    if scores:
        print(f"\n  IKER DISTRIBUTION:")
        print(f"    Min:  {min(scores)}")
        print(f"    Max:  {max(scores)}")
        print(f"    Avg:  {sum(scores)/len(scores):.1f}")
        flat = sum(1 for s in scores if s == 70)
        print(f"    Flat (score=70): {flat}/{len(scores)}")

    # ── FEED ITEMS ───────────────────────────────────
    print("\n\n📰 FEED ITEMS")
    _, total = query("feed_items", "select=id", count=True)
    print(f"  Total rows: {total}")

    data, _ = query("feed_items", "select=score,sentiment&limit=500", limit=500)
    sentiments = {}
    score_sum = 0
    for f in data:
        s = f.get("sentiment") or "none"
        sentiments[s] = sentiments.get(s, 0) + 1
        score_sum += f.get("score") or 0
    print(f"\n  SENTIMENT BREAKDOWN:")
    for s, n in sorted(sentiments.items(), key=lambda x: -x[1]):
        print(f"    {s:<12} {n}")
    if data:
        print(f"  Avg score: {score_sum/len(data):.1f}")

    print("\n" + "━"*50)
    print("AUDIT COMPLETE")
    print("━"*50 + "\n")


if __name__ == "__main__":
    audit()
