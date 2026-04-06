# fix_iker.py
# Problem 1: All vendors have IKER=70 (flat, fake)
# Uses Gemini to score each vendor based on real signals
# Uses REST API directly (no supabase-py needed)

import urllib.request
import urllib.parse
import json
import time
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
GEMINI_KEY = env.get("GEMINI_API_KEY")

if not GEMINI_KEY:
    print("ERROR: GEMINI_API_KEY not found in .env")
    exit(1)

def supa_get(table, params="", limit=500):
    endpoint = f"{URL}/rest/v1/{table}?{params}&limit={limit}"
    req = urllib.request.Request(endpoint, headers={
        "apikey": KEY, "Authorization": f"Bearer {KEY}"
    })
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())

def supa_patch(table, row_id, payload):
    data = json.dumps(payload).encode()
    endpoint = f"{URL}/rest/v1/{table}?id=eq.{urllib.parse.quote(str(row_id))}"
    req = urllib.request.Request(endpoint, data=data, headers={
        "apikey": KEY, "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }, method="PATCH")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status
    except Exception as e:
        print(f"    Patch error: {e}")
        return 500

def gemini(prompt):
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}"
    payload = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode()
    req = urllib.request.Request(endpoint, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as r:
        result = json.loads(r.read())
        return result["candidates"][0]["content"]["parts"][0]["text"]

def score_vendor(vendor):
    name = vendor.get("company_name") or vendor.get("name") or ""
    website = vendor.get("company_url") or vendor.get("website") or ""
    industry = vendor.get("sector") or vendor.get("primary_category") or ""
    description = vendor.get("description") or ""
    evidence = vendor.get("evidence") or []
    evidence_text = "\n".join(evidence[:5]) if evidence else "none"

    # pull signals mentioning this vendor
    try:
        encoded_name = urllib.parse.quote(name[:30])
        signals = supa_get("intel_signals", f"select=title&title=ilike.*{encoded_name}*", limit=5)
        signal_text = "\n".join([s.get("title","") for s in signals]) or "none found"
    except:
        signal_text = "none found"

    prompt = f"""You are IKER — a vendor legitimacy scoring engine.
Score this vendor from 0 to 100 based on trust signals.

VENDOR:
  Name: {name}
  Industry: {industry}
  Website: {website}
  Description: {description[:200]}

EVIDENCE ON FILE:
{evidence_text}

SIGNALS MENTIONING THIS VENDOR:
{signal_text}

SCORING RULES:
  90-100: Major verified company, strong local presence, multiple confirmed contracts
  70-89:  Established company, some verification, no red flags
  50-69:  Small or regional company, limited signals, plausible but unconfirmed
  30-49:  Minimal information, possible legitimacy concerns
  0-29:   Red flags, likely test data, or missing entirely

Return ONLY valid JSON, nothing else:
{{"score": <number 0-100>, "level": "<TRUSTED|RELIABLE|CAUTION|RISK|UNVERIFIED>", "reason": "<one sentence>"}}"""

    try:
        text = gemini(prompt).strip()
        text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        print(f"    Gemini error: {e}")
        return {"score": 50, "level": "UNVERIFIED", "reason": "Could not score"}

def run():
    print("\n" + "━"*50)
    print("IKER SCORING ENGINE")
    print("Scoring all vendors with Gemini intelligence")
    print("━"*50)

    vendors = supa_get("vendors", "select=*")
    total = len(vendors)
    print(f"Vendors to score: {total}\n")

    for i, vendor in enumerate(vendors):
        name = vendor.get("company_name") or vendor.get("name") or "unknown"
        current_score = vendor.get("iker_score")
        print(f"[{i+1}/{total}] {name} (current: {current_score})")

        result = score_vendor(vendor)
        new_score = result.get("score", 50)
        level = result.get("level", "UNVERIFIED")
        reason = result.get("reason", "")

        print(f"  → {new_score}/100  [{level}]")
        print(f"     {reason[:80]}")

        update = {"iker_score": new_score}
        # only update extra columns if they exist — safe to try
        try:
            supa_patch("vendors", vendor["id"], {**update, "iker_level": level, "iker_reason": reason})
        except:
            supa_patch("vendors", vendor["id"], update)

        time.sleep(0.5)  # stay within Gemini rate limits

    print("\n" + "━"*50)
    print("IKER SCORING COMPLETE")
    print("Run audit.py to see distribution")
    print("━"*50)

if __name__ == "__main__":
    run()
