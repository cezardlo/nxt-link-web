# enrich_feeds.py
# Problem 4: 1,553 feed items with score=5, sentiment=neutral (unprocessed)
# Add real intelligence scores and sentiment with Gemini
# Uses REST API directly (no supabase-py needed)

import urllib.request
import urllib.parse
import json
import time

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

def supa_get(table, params="", limit=200):
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

def enrich_item(item):
    title = item.get("title") or ""
    description = item.get("description") or ""
    text = f"{title} {description}"[:600]

    prompt = f"""You are an intelligence analyst for NXT LINK.
Analyze this news item and return structured intelligence.

NEWS: {text}

Return ONLY valid JSON, nothing else:
{{
  "score": <importance 1-10, where 10=critical national/industry event>,
  "sentiment": "<positive|negative|neutral>",
  "so_what": "<one sentence: why this matters to a technology buyer>",
  "what_next": "<one sentence: what will likely happen next>"
}}"""

    try:
        text = gemini(prompt).strip()
        text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        return None

def run():
    print("\n" + "━"*50)
    print("FEED ENRICHMENT ENGINE")
    print("Adding intelligence to unscored feed items")
    print("━"*50)

    # get unprocessed items (default score=5)
    items = supa_get("feed_items", "select=id,title,description&score=eq.5&order=pub_date.desc", limit=200)
    print(f"Items to enrich (score=5): {len(items)}\n")

    enriched = 0
    high_value = 0
    score_dist = {}

    for i, item in enumerate(items):
        title = item.get("title") or "no title"
        print(f"[{i+1}/{len(items)}] {str(title)[:60]}")

        result = enrich_item(item)

        if result:
            score = max(1, min(10, result.get("score", 5)))
            sentiment = result.get("sentiment", "neutral")
            so_what = result.get("so_what", "")
            what_next = result.get("what_next", "")

            print(f"  Score: {score}/10  Sentiment: {sentiment}")
            if so_what:
                print(f"  → {so_what[:70]}")

            payload = {"score": score, "sentiment": sentiment}
            supa_patch("feed_items", item["id"], payload)

            enriched += 1
            score_dist[score] = score_dist.get(score, 0) + 1
            if score >= 8:
                high_value += 1
        else:
            print("  [skipped — Gemini error]")

        time.sleep(0.4)

    print("\n" + "━"*50)
    print(f"ENRICHED: {enriched}/{len(items)} items")
    print(f"HIGH VALUE (8-10): {high_value} items")
    print("\nSCORE DISTRIBUTION:")
    for s in sorted(score_dist.keys(), reverse=True):
        bar = "█" * score_dist[s]
        print(f"  {s:>2}/10  {bar} ({score_dist[s]})")
    print("━"*50)

if __name__ == "__main__":
    run()
