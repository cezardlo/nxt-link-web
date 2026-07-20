# Claude — All Remaining Tasks — April 7, 2026
_Written by Perplexity Computer — do all of these, drop files in inbox/for-computer/_

Read `_collab/context/nxt-link-state.md` first for full context.

**Stack:** Next.js 14 App Router · TypeScript · Tailwind · Supabase (`createClient` from `@/lib/supabase/client`)
**Drop ALL files in:** `_collab/inbox/for-computer/` with exact filenames below.

---

## TASK 1 — CRITICAL: Build /discover Page (Amazon-style Directory)

This is the most important missing page. El Paso operators need to browse companies, products, conferences, and discoveries like shopping on Amazon.

**File to create:** `src/app/discover/page.tsx`

### What it shows

Four tabs at the top:
- **Companies** (442 vendors from `/api/vendors`)
- **Products** (1,041 from `/api/products`)
- **Conferences** (from `/api/conferences`)
- **Discoveries** (973 from `/api/discoveries`)

### Page layout

```
HEADER
  h1: "Discover"
  subtitle: "Every tech company, product, conference, and breakthrough. Browse. Contact. Buy."

TAB ROW (horizontal)
  [Companies (442)] [Products (1,041)] [Conferences (1,040)] [Discoveries (973)]
  Each tab: label + count badge

SECTOR FILTER CHIPS (horizontal scroll)
  All | Defense | AI/ML | Cybersecurity | Logistics | Manufacturing | Border Tech | Energy | Space

SEARCH BAR
  Full width · placeholder: "Search by name, technology, or sector..."

CARD GRID (3 cols desktop · 2 tablet · 1 mobile)
  Grid of cards based on active tab
```

### Company Card (for Companies tab)

Fetch from `/api/vendors` with params: `sector`, `search`, `limit=24`, `offset`

```tsx
function CompanyCard({ vendor }: { vendor: Vendor }) {
  // Logo with Clearbit + initials fallback
  // company_name bold + large
  // sector badge (colored by sector)
  // IKER score (green badge if >= 85, amber if >= 65, gray else)
  // description truncated to 2 lines
  // latest_signal headline (small, muted, italic)
  // Two buttons: [Visit Website →] (company_url, _blank) [View Profile] (/vendor/[ID])
}
```

Logo component — use this exact pattern:
```tsx
function CompanyLogo({ url, name }: { url: string | null; name: string }) {
  const [imgError, setImgError] = useState(false);
  const domain = url ? (() => { try { return new URL(url).hostname.replace('www.',''); } catch { return null; } })() : null;
  const initials = name.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
  
  if (domain && !imgError) {
    return (
      <img
        src={`https://logo.clearbit.com/${domain}`}
        alt={name}
        className="w-12 h-12 rounded-lg object-contain bg-white p-1"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className="w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold"
         style={{ background: 'rgba(14,165,233,0.15)', color: '#0EA5E9' }}>
      {initials}
    </div>
  );
}
```

Vendor API response shape:
```typescript
{
  id: number // the "ID" column  
  company_name: string
  company_url: string | null
  description: string
  primary_category: string
  sector: string
  iker_score: number | null
  hq_country: string | null
  hq_city: string | null
}
```

### Product Card (for Products tab)

Fetch from `/api/products` with params: `industry`, `search`, `limit=24`, `offset`

```tsx
// category badge + maturity badge (Emerging/Growing/Mature)
// product_name bold
// company name small muted
// description 3 lines
// [Get Demo →] button linking to company_url (_blank)
// [View Details] linking to /products/[id]
```

### Conference Card (for Conferences tab)

Fetch from `/api/conferences`

```tsx
// LIVE NOW badge (if today) OR "In X days" countdown
// conference name bold
// location + dates
// sector badge
// exhibitor count if > 0
// [Register →] (conference website, _blank)
// [See Exhibitors] (internal link)
```

### Discovery Card (for Discoveries tab)

Fetch from `/api/discoveries`

```tsx
// impact score badge (large, colored)
// type badge (BREAKTHROUGH / PAPER / SPINOUT / GRANT)
// title bold
// institution name (if present)
// summary 3 lines
// [Read Source →] (source_url, _blank)
```

### Loading state: skeleton cards (same number as page_size)
### Empty state: "No results found" + Reset filters button
### Pagination: "Load more" button at bottom

**Deliver:** `_collab/inbox/for-computer/page-discover.tsx`

---

## TASK 2 — HIGH: Fix Briefing to Cover All 8 Sectors

**File:** `src/lib/agents/agents/briefing-generator-agent.ts`

Read it. Currently hardcodes or filters to manufacturing + logistics only.

Fix the sector selection so it:
1. Queries ALL 8 sectors from intel_signals (ai-ml, cybersecurity, defense, border-tech, manufacturing, energy, healthcare, logistics)
2. Ranks them by signal count in last 24h (most active first)
3. Always includes defense and border-tech if they have ANY signals
4. Returns top 5 sectors by velocity

**Also fix:** `src/app/api/briefing/route.ts` — find where it filters industries to only 2 and expand to all 8.

Look for any hardcoded `industry = 'manufacturing'` or `['manufacturing', 'logistics']` and replace with all 8 canonical industries.

**Deliver:**
- `_collab/inbox/for-computer/fix-briefing-agent.ts` (the agent file)
- `_collab/inbox/for-computer/fix-briefing-route.ts` (the API route fix)

---

## TASK 3 — HIGH: Fix Top 3 Signal Quality on Home

**File:** `src/app/api/decide/route.ts`

The Top 3 currently shows news articles like "From liquid meth to live pythons, CBP stops smuggling."
These are signal_type = 'connection' or 'market_shift' with no company and low evidence quality.

Fix the scoring to:
1. **Boost** signals with signal_type IN ('technology', 'product_launch', 'patent_filing', 'funding_round', 'contract_award') by +30 points
2. **Penalize** signals with signal_type IN ('connection', 'general') by -40 points
3. **Boost** signals with a company name attached by +20 points
4. **Boost** signals with importance_score > 0.7 by +20 points
5. **Exclude** signals where title contains crime/drug/accident keywords (CBP drug seizure, crash, arrest)

Add this exclusion filter to the Supabase query:
```typescript
.not('title', 'ilike', '%drug%')
.not('title', 'ilike', '%crash%')
.not('title', 'ilike', '%arrest%')
.not('title', 'ilike', '%crime%')
.not('title', 'ilike', '%shooting%')
.not('signal_type', 'eq', 'connection')
```

**Deliver:** `_collab/inbox/for-computer/fix-decide-scoring.ts` (the relevant scoring section)

---

## TASK 4 — HIGH: Add Company Logos to Vendor Cards

**File:** `src/app/vendors/page.tsx`

Currently shows plain text company names. Add the `CompanyLogo` component (same as Task 1) to each vendor card.

Read the current vendor card render. Add logo before the company name.

The logo component is the same Clearbit one from Task 1. Import useState.

**Deliver:** `_collab/inbox/for-computer/fix-vendors-with-logos.tsx`

---

## TASK 5 — MEDIUM: Fix Nav Inconsistency

Two different nav systems exist:
- **Full nav** (Home, Briefing, Signals, Map, Solve, Vendors, Products, Industries, Explore) — used on most pages
- **Minimal nav** (BRIEFING, MAP, EVENTS, DISCOVERIES, VENDORS) — used on Conferences and Discoveries pages

The minimal nav pages are missing: Home, Signals, Solve, Products, Industries, Explore.

**Fix:** Find the component used by Conferences and Discoveries pages that renders the minimal nav. Update it to show the same items as the full nav OR link it to the same `DockNav` component.

The DockNav is at `src/components/DockNav.tsx`. Read it.
The minimal nav appears to be inline in the page files or in a layout.

Check `src/app/conferences/page.tsx` and `src/app/discoveries/page.tsx` for their nav — find what's different and align them.

**Deliver:** `_collab/inbox/for-computer/fix-nav-consistency.md` (what to change and where) OR the fixed page files directly.

---

## TASK 6 — MEDIUM: Write Strategic "What It Means" for Top 10 Signals Today

Pull these signals from the briefing context and write Jarvis-style strategic analysis:

For each of these real signals from today's data:
1. "China seeks homegrown alternative to Nvidia" → industry: AI/ML
2. "Metallium achieves Pentagon gallium contract" → industry: Defense
3. "Cloudflare moves up post-quantum deadline" → industry: Cybersecurity
4. "El Paso County sues ICE over detention center records" → industry: Border Tech
5. "Cybersecurity Funding Surges to $4.62B in Q1 2026" → industry: Cybersecurity
6. "Texas DOT to open dragnet runway truck ramp in El Paso" → industry: Logistics
7. "Argentine Banks Test JPM Coin for Cross-Border Settlements" → industry: Border Tech / Finance
8. "Identy.io joins World Border Security Congress" → industry: Border Tech
9. "Anthropic debuts Mythos in cybersecurity initiative" → industry: AI/ML
10. "Volkswagen + XPENG co-developed model in Anhui" → industry: Manufacturing

For each, write:
```json
{
  "title": "original headline",
  "industry": "canonical sector",
  "meaning": "NOT what happened. What pattern this signals. 1-2 sentences strategic insight.",
  "direction": "growing|stable|declining|emerging|converging",
  "el_paso_angle": "Why this matters specifically to El Paso/Borderplex. 1 sentence."
}
```

**Deliver:** `_collab/inbox/for-computer/signal-meanings-today.json`

---

## Important Notes
- Use `createClient()` from `@/lib/supabase/client` (NOT getSupabaseClient) for all Supabase queries
- Dark theme: bg-[#07090A] background, text-[#D4D8DC], accent #0EA5E9 (sky blue/teal)
- No localStorage/sessionStorage
- External links: target="_blank" rel="noopener noreferrer"
- All buttons use bg-[#0EA5E9] for primary actions (NOT purple/violet/indigo)
- framer-motion is available for animations
- lucide-react for icons
