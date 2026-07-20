# Claude Task — Company Directory Stories & Intelligence Layer
_Written by Perplexity Computer — April 7, 2026_

---

## Context

NXT LINK needs to become an Amazon-style directory of tech companies for El Paso.
César wants El Paso operators to be able to browse companies like shopping —
see who they are, what they sell, what's happening with them now, and understand
why they matter to El Paso.

Computer is building the full UI page at `/discover` right now.
**Your job is to write the intelligence layer that makes each company card come alive.**

---

## Task 1 — Write a `/api/discover/directory` API route enhancement

The current vendors table has `company_name`, `company_url`, `description`, `iker_score`, `sector`.
We need to add a `latest_signal` field to each company — what is this company doing RIGHT NOW
based on intel_signals.

Write a new API route at `src/app/api/discover/directory/route.ts` that:

1. Queries the vendors table (paginated, filterable by sector)
2. For each company, find the most recent intel_signal where `company ILIKE '%{company_name}%'`
3. Returns combined payload: vendor data + latest signal title + signal date + signal type
4. Filters arXiv (`source NOT ILIKE '%arxiv%'`)
5. Returns: `{ vendors: [...], total: number, sectors: string[] }`

Each vendor object should have:
```typescript
{
  id: string
  company_name: string
  company_url: string | null
  description: string
  primary_category: string
  iker_score: number
  sector: string
  hq_country: string | null
  hq_city: string | null
  logo_url: string | null  // derive from company_url domain
  latest_signal: {
    title: string
    signal_type: string
    discovered_at: string
  } | null
}
```

For `logo_url`, derive from `company_url`:
```typescript
function getLogoUrl(companyUrl: string | null): string | null {
  if (!companyUrl) return null;
  try {
    const domain = new URL(companyUrl).hostname.replace('www.', '');
    return `https://logo.clearbit.com/${domain}`;
  } catch { return null; }
}
```

**Deliver to:** `_collab/inbox/for-computer/api-discover-directory-route.ts`

---

## Task 2 — Write El Paso relevance "why it matters" for top 20 companies

For these companies (our top IKER-scored vendors), write a 1-sentence "Why El Paso needs to know this":

1. Jacobs Solutions (iker: 100) — Infrastructure, border, Fort Bliss
2. Booz Allen Hamilton (iker: 95) — Defense AI, DoD, CBP
3. Leidos (iker: 95) — Border security, military IT
4. General Dynamics IT (iker: 95) — Army networks, Fort Bliss
5. SAIC (iker: 95) — AI/ML for Army, border tech
6. BAE Systems (iker: 92) — Bradley vehicles, electronic warfare at Fort Bliss
7. TekSynap (iker: 90) — Army IT, Fort Bliss contracts
8. Lockheed Martin Missiles (iker: 90) — THAAD testing at Fort Bliss
9. MesaAI (iker: 90) — El Paso-founded bilingual AI startup
10. Palantir Technologies (iker: 90) — AI platform for 1st Armored Division
11. CrowdStrike Federal (iker: 90) — Cybersecurity for Fort Bliss + CBP
12. Boeing Defense (iker: 90) — Apache helicopter support at Fort Bliss

Format as JSON for easy insertion:
```json
[
  { "company_name": "Jacobs Solutions", "ep_relevance": "Your one sentence here" },
  ...
]
```

**Deliver to:** `_collab/inbox/for-computer/ep-relevance-copy.json`

---

## Task 3 — Write sector discovery summaries (6 sectors)

For each of these 6 El Paso sectors, write:
- **Headline** (8 words max): What's happening in this sector globally right now
- **Why El Paso** (2 sentences): Why this sector matters specifically to El Paso
- **Top opportunity** (1 sentence): The single most actionable thing an El Paso operator could do

Sectors:
1. **Defense** (Fort Bliss, THAAD, C4ISR, 1st Armored Division)
2. **Logistics** (BOTA port, cross-border trucking, supply chain)
3. **Border Tech** (CBP, smart crossing, biometrics, trade compliance)
4. **AI / ML** (bilingual AI, autonomous systems, predictive analytics)
5. **Manufacturing** (nearshoring, Juárez factories, Industry 4.0)
6. **Cybersecurity** (Fort Bliss networks, CBP IT, border data)

**Deliver to:** `_collab/inbox/for-computer/sector-summaries.json`

---

## Tech Context

- Stack: Next.js 14 App Router, TypeScript, Tailwind, Supabase
- Supabase project ID: yvykselwehxjwsqercjg
- vendors table columns: ID, company_name, company_url, description, primary_category, iker_score, sector, hq_country, hq_city, industries[], funding_stage
- intel_signals columns: id, title, signal_type, industry, company, source, discovered_at, importance_score
- Logo API (free, no key): `https://logo.clearbit.com/{domain}`
- Existing vendor query file: `src/db/queries/vendors.ts`
- Existing Supabase client: `import { getSupabaseClient } from '@/lib/supabase/client'`

---

## Deadline

Computer is building the UI now. Drop your files in `_collab/inbox/for-computer/` as soon as they're ready.
Computer will pull them, review, and deploy immediately.
