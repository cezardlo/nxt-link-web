# nxtlink catalog jobs — Python runner

Mirror of the three `/api/admin/*` Vercel endpoints. Same logic, different
runtime. Use this if you want to maintain the catalog from your machine
(or any environment with Python) instead of clicking buttons on `/admin`.

## Install

```bash
# from this folder (scripts/python/)
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

# Full toolkit (Supabase, scraping, AI, data, etc):
pip install -r requirements.txt

# Or just the minimum to run this script:
pip install "supabase>=2.0,<3"
```

**If `pip install -r requirements.txt` errors out** on some heavy package
(e.g. `psycopg2-binary` or `sentence-transformers`), open
`requirements.txt` in any text editor and comment out the offending line
with a `#`, then re-run. The script itself only needs `supabase`.

## Configure

```bash
cp .env.example .env
# Then open .env in any editor and paste your service_role key.
```

The service role key lives in your Supabase project settings:
https://supabase.com/dashboard/project/yvykselwehxjwsqercjg/settings/api

It's the **secret** key (not the anon key). Treat it like a password.

## Run

```bash
# Run all three jobs in order
python run_catalog_jobs.py

# Or one at a time
python run_catalog_jobs.py junk     # mark mid-sentence/sponsor-junk rows
python run_catalog_jobs.py dedup    # collapse duplicate company URLs
python run_catalog_jobs.py yc       # import + reclassify YC companies
```

Each job prints progress and a JSON summary at the end. All three are
**idempotent** — safe to re-run any number of times.

## What it does, in plain words

| Job | What it does |
|---|---|
| `junk` | Looks at every non-YC vendor row. If the company name looks like text scraped off a page (mid-sentence, JS variable name, sponsor tier label, page header), marks it `status='junk'` so the catalog hides it. Never touches YC vendors or rows already marked active/approved. |
| `dedup` | Finds companies appearing under the same URL multiple times (e.g. exhibitors at multiple conferences). Picks the highest-quality copy of each, marks the rest `status='duplicate'`. |
| `yc` | Pulls the public YC company directory, inserts new tech vendors, and re-classifies any existing YC rows whose sector or country are stale. |

## Run it without installing anything (GitHub Actions)

If you don't want to install Python on your laptop, you can run this
script in GitHub's cloud:

1. Open your repo on GitHub: https://github.com/cezardlo/nxt-link-web
2. Click the **Actions** tab.
3. In the left sidebar, click **"Catalog Jobs (Python)"**.
4. Click **"Run workflow"** (top right) → pick a job (`all`, `junk`,
   `dedup`, `yc`) → click the green **Run workflow** button.
5. Wait ~1 minute. Click the run that appears to see live logs.

This requires the repo secrets `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` to be set in GitHub → Settings → Secrets
and variables → Actions. The other Python pipelines in this repo
already use them, so they're probably already there.

The same workflow also runs automatically every day at **03:30 UTC**.

## Notes

- The script connects directly to Supabase — it does **not** go through your
  Vercel app. So it works even if Vercel is down.
- It writes the same `status` column the `/admin` page uses, so running it
  here vs. there is interchangeable.
- Don't share `.env` or paste its contents anywhere. The service role key
  has full read/write access to your database.
