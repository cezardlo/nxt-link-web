# fix_signals.py
# Problem 3: 300 signals stuck in "general" black hole
# Reclassify with Gemini into real industries
# Uses REST API directly (no supabase-py needed)

import urllib.request
import urllib.parse
import json
import time
import os

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

INDUSTRIES = [
    "manufacturing", "healthcare", "logistics",
    "defense", "energy", "construction", "agriculture",
    "fintech", "cybersecurity", "ai-ml", "border-tech",
    "restaurant", "retail", "education", "government",
    "real-estate", "general"
]

def supa_get(table, params="", limit=400):
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
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status

def gemini(prompt):
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}"
    payload = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode()
    req = urllib.request.Request(endpoint, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as r:
        result = json.loads(r.read())
        return result["candidates"][0]["content"]["parts"][0]["text"]

def classify_signal(signal):
    title = signal.get("title") or ""
    content = signal.get("content") or ""
    text = f"{title} {content}"[:500]

    prompt = f"""Classify this signal into exactly ONE industry category.

SIGNAL: {text}

CATEGORIES: {', '.join(INDUSTRIES)}

Classification rules:
- robots, CNC, factory, plant, production line, assembly = manufacturing
- hospital, medical, health, patient, clinical, pharma, drug = healthcare
- shipping, freight, supply chain, warehouse, fleet, cargo, trucking = logistics
- restaurant, food service, kitchen, POS, dining = restaurant
- border, Juarez, El Paso trade, maquiladora, customs = border-tech
- only use "general" if it truly fits nothing specific

Return ONLY valid JSON:
{{"industry": "<category>", "confidence": <number 0-100>}}"""

    try:
        text = gemini(prompt).strip()
        text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except:
        return {"industry": "general", "confidence": 0}

def run():
    print("\n" + "━"*50)
    print("SIGNAL RECLASSIFICATION")
    print("Rescuing signals from the general black hole")
    print("━"*50)

    general = supa_get("intel_signals", "select=id,title,content&industry=eq.general")
    print(f"General signals to reclassify: {len(general)}\n")

    rescued = {}
    stayed_general = 0

    for i, signal in enumerate(general):
        title = signal.get("title") or signal.get("content") or ""
        print(f"[{i+1}/{len(general)}] {str(title)[:60]}")

        result = classify_signal(signal)
        industry = result.get("industry", "general")
        confidence = result.get("confidence", 0)

        print(f"  → {industry} (confidence: {confidence})")

        if confidence >= 60 and industry != "general":
            supa_patch("intel_signals", signal["id"], {"industry": industry})
            rescued[industry] = rescued.get(industry, 0) + 1
        else:
            stayed_general += 1

        time.sleep(0.3)

    print("\n" + "━"*50)
    print("RESCUED BY INDUSTRY:")
    for ind, n in sorted(rescued.items(), key=lambda x: -x[1]):
        print(f"  {ind:<20} {n}")
    print(f"  {'stayed general':<20} {stayed_general}")
    print(f"\nTotal rescued: {sum(rescued.values())}")
    print("━"*50)

if __name__ == "__main__":
    run()
