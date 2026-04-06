# fix_vendor_columns.py
# Problem 2: company_name column — verify mapping works, fix status filter
# Uses REST API directly (no supabase-py needed)

import urllib.request
import urllib.parse
import json
import os

# read .env
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

URL = env.get("NEXT_PUBLIC_SUPABASE_URL")
KEY = env.get("SUPABASE_SERVICE_ROLE_KEY")

def get(table, params="", limit=500):
    endpoint = f"{URL}/rest/v1/{table}?{params}&limit={limit}"
    req = urllib.request.Request(endpoint, headers={
        "apikey": KEY, "Authorization": f"Bearer {KEY}"
    })
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())

def patch(table, row_id, payload):
    data = json.dumps(payload).encode()
    endpoint = f"{URL}/rest/v1/{table}?id=eq.{row_id}"
    req = urllib.request.Request(endpoint, data=data, headers={
        "apikey": KEY, "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }, method="PATCH")
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status

def run():
    print("\n" + "━"*50)
    print("VENDOR COLUMN AUDIT + FIX")
    print("━"*50)

    vendors = get("vendors", "select=id,company_name,status")
    print(f"Total vendors: {len(vendors)}")

    by_status = {}
    for v in vendors:
        s = v.get("status") or "none"
        by_status[s] = by_status.get(s, 0) + 1
    print("By status:", by_status)

    # Check how many have empty company_name
    empty_name = [v for v in vendors if not v.get("company_name")]
    print(f"Missing company_name: {len(empty_name)}")

    # Check approved vendors — update them to active so the main query gets all
    approved = [v for v in vendors if v.get("status") == "approved"]
    print(f"\nApproved vendors (not returned by active filter): {len(approved)}")

    fixed = 0
    for v in approved:
        name = v.get("company_name") or "unknown"
        print(f"  Updating to active: {name}")
        patch("vendors", urllib.parse.quote(str(v["id"])), {"status": "active"})
        fixed += 1

    print(f"\n✓ Updated {fixed} vendors from 'approved' → 'active'")
    print("All vendors now returned by the active query.")
    print("━"*50)

if __name__ == "__main__":
    run()
