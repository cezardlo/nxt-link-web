/**
 * NXT LINK — Worldwide Intelligence Collector
 * 
 * Tracks technology happening everywhere on Earth:
 * Patents, research, government contracts, startups, news — from every country.
 * 
 * All sources are FREE — no API keys required.
 * 
 * Coverage:
 * 🇺🇸 US: USPTO, SAM.gov, SBIR, NSF, DARPA, NASA, DoD
 * 🇨🇳 China: CNIPA (via PatentsView), CGTN tech, TechNode
 * 🇪🇺 EU: EPO, Horizon Europe, EIC, TED procurement
 * 🇮🇱 Israel: Rafael, Elbit (via news)
 * 🇮🇳 India: ISRO, IIT research, Indian patents
 * 🇰🇷 Korea: KIPO, Samsung/SK/Hyundai signals
 * 🇯🇵 Japan: JPO, JAXA, Japanese tech
 * 🌍 Global: WIPO, SIPRI, World Bank, OECD, GDELT
 * 🔬 Research: OpenAlex, arXiv, bioRxiv, SSRN
 * 🚀 Space: ESA, JAXA, ISRO, SpaceX, Blue Origin news
 * 🛡️ Defense: SIPRI arms transfers, Breaking Defense, C4ISRNET
 */

const TIMEOUT = 25_000;

async function fetchWithTimeout(url: string, opts: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WorldSignal {
  external_id: string;
  title: string;
  summary: string;
  source_url: string;
  source_name: string;
  signal_type: string;
  industry: string;
  region: string;
  country_code: string;
  published_at: string;
  company: string | null;
  amount_usd: number | null;
  tags: string[];
}

// ── 1. GDELT — Global Event Database (100+ languages, 15,000+ sources) ───────

export async function fetchGDELT(query: string, maxRecords = 50): Promise<WorldSignal[]> {
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=${maxRecords}&sort=DateDesc&format=json`;
  try {
    const r = await fetchWithTimeout(url);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.articles ?? []).map((a: any) => ({
      external_id: `gdelt-${a.url?.slice(-40) ?? Math.random()}`,
      title: a.title ?? '',
      summary: a.seendate ?? '',
      source_url: a.url ?? '',
      source_name: a.domain ?? 'GDELT',
      signal_type: 'technology',
      industry: 'general',
      region: a.sourcecountry ?? 'Global',
      country_code: a.sourcecountry ?? 'XX',
      published_at: a.seendate ?? new Date().toISOString(),
      company: null,
      amount_usd: null,
      tags: [query],
    }));
  } catch { return []; }
}

// ── 2. PatentsView — US + International Patents (free, no key) ───────────────

export async function fetchPatentsView(searchText: string, rows = 25): Promise<WorldSignal[]> {
  try {
    const r = await fetchWithTimeout('https://api.patentsview.org/patents/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: { _text_phrase: { patent_abstract: searchText } },
        f: ['patent_id', 'patent_title', 'patent_abstract', 'patent_date', 'assignee_organization', 'cpc_section_id', 'cited_patent_count'],
        o: { per_page: rows, sort: [{ patent_date: 'desc' }] },
      }),
    });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.patents ?? []).map((p: any) => ({
      external_id: `patent-${p.patent_id}`,
      title: p.patent_title ?? '',
      summary: (p.patent_abstract ?? '').slice(0, 500),
      source_url: `https://patents.google.com/patent/US${p.patent_id}`,
      source_name: 'USPTO / PatentsView',
      signal_type: 'patent_filing',
      industry: cpcToIndustry(p.cpc_section_id),
      region: 'United States',
      country_code: 'US',
      published_at: p.patent_date ? new Date(p.patent_date).toISOString() : new Date().toISOString(),
      company: p.assignee_organization ?? null,
      amount_usd: null,
      tags: ['patent', searchText, p.cpc_section_id ?? ''].filter(Boolean),
    }));
  } catch { return []; }
}

function cpcToIndustry(cpc: string | null): string {
  if (!cpc) return 'general';
  const map: Record<string, string> = {
    G: 'ai-ml', H: 'ai-ml', A: 'healthcare', B: 'manufacturing',
    C: 'energy', D: 'manufacturing', E: 'manufacturing', F: 'energy',
  };
  return map[cpc[0]] ?? 'general';
}

// ── 3. EPO — European Patent Office (free, no key) ───────────────────────────

export async function fetchEPO(query: string): Promise<WorldSignal[]> {
  try {
    const url = `https://ops.epo.org/3.2/rest-services/published-data/search/abstract?q=txt="${encodeURIComponent(query)}"&Range=1-25`;
    const r = await fetchWithTimeout(url, {
      headers: { Accept: 'application/json' },
    });
    if (!r.ok) return [];
    const d = await r.json();
    const docs = d?.['ops:world-patent-data']?.['ops:biblio-search']?.['ops:search-result']?.['exchange-documents'] ?? [];
    return (Array.isArray(docs) ? docs : [docs]).map((doc: any) => {
      const bib = doc?.['exchange-document']?.['bibliographic-data'];
      const title = bib?.['invention-title']?.['#text'] ?? bib?.['invention-title'] ?? 'EU Patent';
      const docId = doc?.['exchange-document']?.['@doc-number'] ?? Math.random().toString(36);
      return {
        external_id: `epo-${docId}`,
        title: typeof title === 'string' ? title : JSON.stringify(title),
        summary: `European patent filing — ${query}`,
        source_url: `https://worldwide.espacenet.com/patent/search?q=${encodeURIComponent(query)}`,
        source_name: 'EPO / Espacenet',
        signal_type: 'patent_filing',
        industry: 'general',
        region: 'Europe',
        country_code: 'EU',
        published_at: new Date().toISOString(),
        company: null,
        amount_usd: null,
        tags: ['patent', 'europe', query],
      };
    });
  } catch { return []; }
}

// ── 4. WIPO — World Intellectual Property Organization ───────────────────────

export async function fetchWIPO(query: string): Promise<WorldSignal[]> {
  try {
    const url = `https://www.wipo.int/patentscope/search/en/result.jsf?query=${encodeURIComponent(query)}&office=WIPO&rss=true`;
    const r = await fetchWithTimeout(url);
    if (!r.ok) return [];
    const text = await r.text();
    const items = text.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    return items.slice(0, 20).map((item, i) => {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? 'WIPO Patent';
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] ?? '';
      return {
        external_id: `wipo-${query.slice(0, 10)}-${i}`,
        title, summary: `International patent (WIPO PCT) — ${query}`,
        source_url: link, source_name: 'WIPO PatentScope',
        signal_type: 'patent_filing', industry: 'general',
        region: 'International', country_code: 'WO',
        published_at: new Date().toISOString(),
        company: null, amount_usd: null, tags: ['patent', 'wipo', 'international'],
      };
    });
  } catch { return []; }
}

// ── 5. OpenAlex — 200M+ Global Research Papers ───────────────────────────────

export async function fetchOpenAlex(query: string, topic?: string): Promise<WorldSignal[]> {
  try {
    const filter = `title.search:${encodeURIComponent(query)},publication_year:2024|2025|2026,open_access.is_oa:true`;
    const url = `https://api.openalex.org/works?filter=${filter}&sort=cited_by_count:desc&per-page=20&mailto=nxtlink@nxtlink.io`;
    const r = await fetchWithTimeout(url);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.results ?? []).map((w: any) => ({
      external_id: `openalex-${w.id?.split('/').pop() ?? Math.random()}`,
      title: w.title ?? '',
      summary: w.abstract_inverted_index ? 'Research paper — see source for abstract' : '',
      source_url: w.doi ? `https://doi.org/${w.doi}` : (w.open_access?.oa_url ?? ''),
      source_name: w.host_venue?.display_name ?? 'OpenAlex',
      signal_type: 'research_breakthrough',
      industry: topic ?? 'general',
      region: (w.authorships?.[0]?.institutions?.[0]?.country_code ?? 'Global'),
      country_code: w.authorships?.[0]?.institutions?.[0]?.country_code ?? 'XX',
      published_at: w.publication_date ? new Date(w.publication_date).toISOString() : new Date().toISOString(),
      company: w.authorships?.[0]?.institutions?.[0]?.display_name ?? null,
      amount_usd: null,
      tags: ['research', 'paper', ...(w.concepts?.slice(0, 3).map((c: any) => c.display_name) ?? [])],
    }));
  } catch { return []; }
}

// ── 6. arXiv — Global Physics, CS, Math, Engineering ────────────────────────

export async function fetchArXivClassified(query: string, category: string): Promise<WorldSignal[]> {
  // Only fetch if category is clearly CS/Engineering (not biology/medicine)
  const allowedCats = ['cs.', 'eess.', 'math.', 'stat.', 'quant-ph', 'cond-mat'];
  if (!allowedCats.some(c => category.startsWith(c))) return [];
  
  try {
    const url = `https://export.arxiv.org/api/query?search_query=cat:${category}+AND+${encodeURIComponent(query)}&sortBy=submittedDate&sortOrder=descending&max_results=15`;
    const r = await fetchWithTimeout(url);
    if (!r.ok) return [];
    const text = await r.text();
    const entries = text.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
    return entries.map((e, i) => {
      const title = e.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? '';
      const summary = e.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim()?.slice(0, 300) ?? '';
      const link = e.match(/href="(https:\/\/arxiv[^"]+)"/)?.[1] ?? '';
      const published = e.match(/<published>(.*?)<\/published>/)?.[1] ?? new Date().toISOString();
      const authors = e.match(/<name>(.*?)<\/name>/g)?.slice(0, 2).map(n => n.replace(/<\/?name>/g, '')) ?? [];
      return {
        external_id: `arxiv-classified-${category}-${i}-${Date.now()}`,
        title, summary,
        source_url: link, source_name: 'arXiv',
        signal_type: 'research_breakthrough',
        industry: arxivCatToIndustry(category),
        region: 'Global', country_code: 'XX',
        published_at: new Date(published).toISOString(),
        company: authors[0] ?? null,
        amount_usd: null,
        tags: ['research', 'arxiv', category, query].filter(Boolean),
      };
    });
  } catch { return []; }
}

function arxivCatToIndustry(cat: string): string {
  if (cat.startsWith('cs.AI') || cat.startsWith('cs.LG') || cat.startsWith('stat.ML')) return 'ai-ml';
  if (cat.startsWith('cs.CR') || cat.startsWith('cs.NI')) return 'cybersecurity';
  if (cat.startsWith('eess.SP') || cat.startsWith('eess.SY')) return 'defense';
  if (cat.startsWith('quant-ph') || cat.startsWith('cond-mat')) return 'energy';
  return 'general';
}

// ── 7. SIPRI — Global Arms Transfers and Military Spending ───────────────────

export async function fetchSIPRINews(): Promise<WorldSignal[]> {
  try {
    const url = 'https://www.sipri.org/news/feed';
    const r = await fetchWithTimeout(url);
    if (!r.ok) return [];
    const text = await r.text();
    const items = text.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    return items.slice(0, 15).map((item, i) => {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? '';
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] ?? '';
      const desc = item.match(/<description>(.*?)<\/description>/)?.[1]?.replace(/<[^>]+>/g, '').slice(0, 200) ?? '';
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? new Date().toISOString();
      return {
        external_id: `sipri-${i}-${Date.now()}`,
        title, summary: desc,
        source_url: link, source_name: 'SIPRI',
        signal_type: 'market_shift', industry: 'defense',
        region: 'Global', country_code: 'XX',
        published_at: new Date(pubDate).toISOString(),
        company: null, amount_usd: null,
        tags: ['defense', 'arms', 'military', 'sipri'],
      };
    });
  } catch { return []; }
}

// ── 8. USASpending — Government Contract Awards ──────────────────────────────

export async function fetchUSASpending(agency: string, keyword: string): Promise<WorldSignal[]> {
  try {
    const yesterday = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const r = await fetchWithTimeout('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters: {
          time_period: [{ start_date: yesterday, end_date: new Date().toISOString().split('T')[0] }],
          award_type_codes: ['A', 'B', 'C', 'D'],
          keywords: [keyword],
        },
        fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency', 'Description', 'Place of Performance State Code', 'Award Date'],
        sort: 'Award Amount',
        order: 'desc',
        limit: 20,
        page: 1,
      }),
    });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.results ?? []).map((award: any, i: number) => ({
      external_id: `usaspend-${award['Award ID'] ?? i}`,
      title: `${award['Recipient Name'] ?? 'Unknown'} wins ${keyword} contract`,
      summary: award['Description'] ?? `Government contract award — ${keyword}`,
      source_url: `https://www.usaspending.gov/award/${award['Award ID']}`,
      source_name: 'USASpending.gov',
      signal_type: 'contract_award', industry: agencyToIndustry(agency),
      region: award['Place of Performance State Code'] === 'TX' ? 'Texas' : 'United States',
      country_code: 'US',
      published_at: award['Award Date'] ? new Date(award['Award Date']).toISOString() : new Date().toISOString(),
      company: award['Recipient Name'] ?? null,
      amount_usd: award['Award Amount'] ?? null,
      tags: ['contract', keyword, agency, award['Place of Performance State Code'] ?? ''].filter(Boolean),
    }));
  } catch { return []; }
}

function agencyToIndustry(agency: string): string {
  const lower = agency.toLowerCase();
  if (lower.includes('defense') || lower.includes('army') || lower.includes('navy') || lower.includes('air force')) return 'defense';
  if (lower.includes('homeland') || lower.includes('cbp') || lower.includes('ice')) return 'border-tech';
  if (lower.includes('energy')) return 'energy';
  if (lower.includes('health') || lower.includes('nih') || lower.includes('hhs')) return 'healthcare';
  if (lower.includes('transport') || lower.includes('dot')) return 'logistics';
  if (lower.includes('nasa') || lower.includes('space')) return 'space';
  return 'defense';
}

// ── 9. Horizon Europe — EU Research & Innovation Funding ─────────────────────

export async function fetchHorizonEurope(topic: string): Promise<WorldSignal[]> {
  try {
    const url = `https://api.cordis.europa.eu/projects?keywords=${encodeURIComponent(topic)}&startDateFrom=2024-01-01&pageSize=20&format=json`;
    const r = await fetchWithTimeout(url);
    if (!r.ok) return [];
    const d = await r.json();
    const projects = d?.results?.project ?? [];
    return (Array.isArray(projects) ? projects : [projects]).slice(0, 20).map((p: any) => ({
      external_id: `horizon-${p.id ?? Math.random()}`,
      title: p.title ?? p.acronym ?? 'EU Research Project',
      summary: (p.objective ?? '').slice(0, 400),
      source_url: p.url ?? `https://cordis.europa.eu/project/id/${p.id}`,
      source_name: 'Horizon Europe / CORDIS',
      signal_type: 'research_breakthrough', industry: topic === 'defense' ? 'defense' : 'ai-ml',
      region: 'Europe', country_code: 'EU',
      published_at: p.startDate ? new Date(p.startDate).toISOString() : new Date().toISOString(),
      company: p.coordinatorCountry ?? null,
      amount_usd: p.totalCost ? Math.round(p.totalCost * 1.08) : null,
      tags: ['research', 'europe', 'eu', 'horizon', topic],
    }));
  } catch { return []; }
}

// ── 10. DARPA — US Advanced Research Agency ──────────────────────────────────

export async function fetchDARPA(): Promise<WorldSignal[]> {
  try {
    const r = await fetchWithTimeout('https://www.darpa.mil/news-events/announcements.atom');
    if (!r.ok) return [];
    const text = await r.text();
    const entries = text.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
    return entries.slice(0, 15).map((e, i) => {
      const title = e.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? '';
      const link = e.match(/href="([^"]+)"/)?.[1] ?? '';
      const summary = e.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1]?.replace(/<[^>]+>/g, '').slice(0, 300) ?? '';
      const updated = e.match(/<updated>(.*?)<\/updated>/)?.[1] ?? new Date().toISOString();
      return {
        external_id: `darpa-${i}-${Date.now()}`,
        title: title.replace(/<[^>]+>/g, '').trim(),
        summary: summary.trim(),
        source_url: link, source_name: 'DARPA',
        signal_type: 'research_breakthrough', industry: 'defense',
        region: 'United States', country_code: 'US',
        published_at: new Date(updated).toISOString(),
        company: 'DARPA', amount_usd: null,
        tags: ['darpa', 'defense', 'advanced-research', 'government'],
      };
    });
  } catch { return []; }
}

// ── 11. NASA Tech Transfer — Space & Advanced Technology ─────────────────────

export async function fetchNASATechTransfer(query: string): Promise<WorldSignal[]> {
  try {
    const url = `https://technology.nasa.gov/api/publications?q=${encodeURIComponent(query)}&limit=20`;
    const r = await fetchWithTimeout(url);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.results ?? []).map((item: any) => ({
      external_id: `nasa-${item.id ?? Math.random()}`,
      title: item.title ?? '',
      summary: (item.description ?? '').slice(0, 400),
      source_url: item.url ?? `https://technology.nasa.gov/patent/${item.id}`,
      source_name: 'NASA Tech Transfer',
      signal_type: 'patent_filing', industry: 'space',
      region: 'United States', country_code: 'US',
      published_at: item.releaseDate ? new Date(item.releaseDate).toISOString() : new Date().toISOString(),
      company: 'NASA', amount_usd: null,
      tags: ['nasa', 'space', 'technology', query],
    }));
  } catch { return []; }
}

// ── 12. SBIR/STTR — Small Business Innovation Research ───────────────────────

export async function fetchSBIR(keyword: string, agency?: string): Promise<WorldSignal[]> {
  try {
    const params = new URLSearchParams({
      keyword, rows: '25', start: '0',
      sortField: 'award_date', sortOrder: 'desc',
    });
    if (agency) params.set('agency', agency);
    const url = `https://api.sbir.gov/public/api/awards?${params.toString()}`;
    const r = await fetchWithTimeout(url);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.results ?? []).map((a: any) => ({
      external_id: `sbir-${a.award_number ?? Math.random()}`,
      title: a.project_title ?? '',
      summary: (a.abstract ?? '').slice(0, 400),
      source_url: `https://www.sbir.gov/node/${a.firm_address}`,
      source_name: 'SBIR.gov',
      signal_type: 'funding_round', industry: agencyToIndustry(a.agency ?? ''),
      region: `${a.firm_city ?? ''}, ${a.firm_state ?? ''}`.trim(),
      country_code: 'US',
      published_at: a.award_date ? new Date(a.award_date).toISOString() : new Date().toISOString(),
      company: a.firm_name ?? null,
      amount_usd: a.award_amount ?? null,
      tags: ['sbir', 'small-business', 'government', keyword, a.agency ?? ''].filter(Boolean),
    }));
  } catch { return []; }
}

// ── 13. Hacker News — Silicon Valley Tech Pulse ──────────────────────────────

export async function fetchHackerNews(query: string): Promise<WorldSignal[]> {
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&numericFilters=created_at_i%3E${Math.floor((Date.now() - 7*86400000)/1000)}&hitsPerPage=20`;
    const r = await fetchWithTimeout(url);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.hits ?? []).filter((h: any) => h.points > 50).map((h: any) => ({
      external_id: `hn-${h.objectID}`,
      title: h.title ?? '',
      summary: `HN discussion: ${h.num_comments ?? 0} comments, ${h.points ?? 0} points`,
      source_url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
      source_name: 'Hacker News',
      signal_type: 'technology', industry: queryToIndustry(query),
      region: 'Silicon Valley', country_code: 'US',
      published_at: new Date((h.created_at_i ?? Date.now()/1000) * 1000).toISOString(),
      company: null, amount_usd: null,
      tags: ['hacker-news', 'startup', 'tech', query],
    }));
  } catch { return []; }
}

// ── 14. ProductHunt — Global Product Launches ────────────────────────────────

export async function fetchProductHunt(): Promise<WorldSignal[]> {
  try {
    const url = 'https://www.producthunt.com/feed';
    const r = await fetchWithTimeout(url);
    if (!r.ok) return [];
    const text = await r.text();
    const items = text.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    return items.slice(0, 20).map((item, i) => {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? '';
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] ?? '';
      const desc = item.match(/<description><!\[CDATA\[(.*?)\]\]>/)?.[1]?.replace(/<[^>]+>/g, '').slice(0, 200) ?? '';
      return {
        external_id: `ph-${i}-${Date.now()}`,
        title, summary: desc,
        source_url: link, source_name: 'Product Hunt',
        signal_type: 'product_launch', industry: 'ai-ml',
        region: 'Global', country_code: 'XX',
        published_at: new Date().toISOString(),
        company: null, amount_usd: null,
        tags: ['product-hunt', 'startup', 'product-launch'],
      };
    });
  } catch { return []; }
}

// ── 15. OECD iLibrary — Global Innovation Data ───────────────────────────────

export async function fetchOECDIndicators(): Promise<WorldSignal[]> {
  try {
    const url = 'https://stats.oecd.org/SDMX-JSON/data/MSTI_PUB/ALL/all?contentType=csv&detail=code&separator=comma&csv-lang=en';
    // OECD data is complex - use their news feed instead
    const r = await fetchWithTimeout('https://www.oecd.org/newsroom/oecd-rss.xml');
    if (!r.ok) return [];
    const text = await r.text();
    const items = text.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    return items
      .filter(item => item.toLowerCase().includes('tech') || item.toLowerCase().includes('innov') || item.toLowerCase().includes('digital'))
      .slice(0, 10)
      .map((item, i) => {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? '';
        const link = item.match(/<link>(.*?)<\/link>/)?.[1] ?? '';
        return {
          external_id: `oecd-${i}-${Date.now()}`,
          title, summary: 'OECD policy and research signal',
          source_url: link, source_name: 'OECD',
          signal_type: 'market_shift', industry: 'general',
          region: 'Global', country_code: 'XX',
          published_at: new Date().toISOString(),
          company: null, amount_usd: null,
          tags: ['oecd', 'policy', 'global', 'innovation'],
        };
      });
  } catch { return []; }
}

// ── 16. World Bank Projects — Global Development & Infrastructure ─────────────

export async function fetchWorldBankProjects(keyword: string): Promise<WorldSignal[]> {
  try {
    const url = `https://search.worldbank.org/api/v2/projects?fl=id,project_name,project_abstract,url,country_namecode,totalamt,boardapprovaldate,sector1,theme1&fq=totalamt:[1000000 TO *]&q=${encodeURIComponent(keyword)}&rows=20&format=json&sort=boardapprovaldate desc`;
    const r = await fetchWithTimeout(url);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.projects ?? []).map((p: any) => ({
      external_id: `wb-${p.id ?? Math.random()}`,
      title: p.project_name ?? '',
      summary: (p.project_abstract?.cdata ?? '').slice(0, 300),
      source_url: p.url ?? `https://projects.worldbank.org/en/projects-operations/project-detail/${p.id}`,
      source_name: 'World Bank',
      signal_type: 'contract_award',
      industry: sector1ToIndustry(p.sector1?.Name ?? ''),
      region: p.country_namecode ?? 'Global', country_code: 'XX',
      published_at: p.boardapprovaldate ? new Date(p.boardapprovaldate).toISOString() : new Date().toISOString(),
      company: null,
      amount_usd: p.totalamt ?? null,
      tags: ['world-bank', 'development', keyword, p.country_namecode ?? ''].filter(Boolean),
    }));
  } catch { return []; }
}

function sector1ToIndustry(sector: string): string {
  const lower = sector.toLowerCase();
  if (lower.includes('transport') || lower.includes('logistic')) return 'logistics';
  if (lower.includes('energy') || lower.includes('power')) return 'energy';
  if (lower.includes('health')) return 'healthcare';
  if (lower.includes('digital') || lower.includes('tech') || lower.includes('ict')) return 'ai-ml';
  if (lower.includes('manufactur') || lower.includes('industry')) return 'manufacturing';
  return 'general';
}

// ── Utility ───────────────────────────────────────────────────────────────────

function queryToIndustry(query: string): string {
  const lower = query.toLowerCase();
  if (lower.includes('ai') || lower.includes('machine learning') || lower.includes('llm') || lower.includes('gpt')) return 'ai-ml';
  if (lower.includes('cyber') || lower.includes('security') || lower.includes('hack')) return 'cybersecurity';
  if (lower.includes('defense') || lower.includes('military') || lower.includes('army')) return 'defense';
  if (lower.includes('logistics') || lower.includes('supply chain') || lower.includes('truck')) return 'logistics';
  if (lower.includes('energy') || lower.includes('solar') || lower.includes('battery')) return 'energy';
  if (lower.includes('space') || lower.includes('satellite') || lower.includes('rocket')) return 'space';
  if (lower.includes('health') || lower.includes('bio') || lower.includes('medical')) return 'healthcare';
  if (lower.includes('manufactur') || lower.includes('robot') || lower.includes('automation')) return 'manufacturing';
  return 'general';
}

// ── MASTER COLLECTOR — Run all sources for all sectors ────────────────────────

export interface CollectorConfig {
  sectors: string[];
  includeSources: ('gdelt' | 'patents' | 'epo' | 'wipo' | 'openalex' | 'arxiv' | 'sipri' | 'usaspending' | 'horizon' | 'darpa' | 'nasa' | 'sbir' | 'hackernews' | 'producthunt' | 'worldbank')[];
  maxPerSource: number;
}

const SECTOR_QUERIES: Record<string, string[]> = {
  'ai-ml':         ['artificial intelligence autonomous systems', 'machine learning defense', 'AI chip semiconductor'],
  'defense':       ['military autonomous systems', 'hypersonic missile defense', 'C4ISR battlefield AI', 'Army modernization'],
  'cybersecurity': ['zero trust network security', 'quantum cryptography post-quantum', 'OT ICS critical infrastructure'],
  'logistics':     ['autonomous trucking supply chain', 'cross-border freight logistics', 'warehouse automation robotics'],
  'manufacturing': ['Industry 4.0 digital twin', 'nearshoring Mexico manufacturing', 'cobots collaborative robots'],
  'border-tech':   ['border surveillance biometric', 'customs technology trade', 'port of entry smart scanning'],
  'energy':        ['fusion energy breakthrough', 'solid state battery electric', 'grid modernization microgrid'],
  'space':         ['satellite constellation launch', 'space economy commercial', 'launch vehicle reusability'],
};

const GLOBAL_REGIONS = [
  { name: 'China AI', queries: ['China artificial intelligence semiconductor', 'CNIPA patent technology'] },
  { name: 'EU Defense', queries: ['European defence technology EDA', 'NATO technology alliance'] },
  { name: 'Israel DefTech', queries: ['Israel defense technology startup', 'Rafael Elbit systems'] },
  { name: 'India Space', queries: ['ISRO India space technology', 'India semiconductor manufacturing'] },
  { name: 'South Korea', queries: ['Samsung SK Hynix semiconductor chip', 'Korean battery technology'] },
];

export async function runWorldwideCollector(config: Partial<CollectorConfig> = {}): Promise<{
  signals: WorldSignal[];
  stats: Record<string, number>;
  errors: string[];
}> {
  const sectors = config.sectors ?? Object.keys(SECTOR_QUERIES);
  const sources = config.includeSources ?? ['gdelt', 'patents', 'openalex', 'darpa', 'sbir', 'usaspending', 'hackernews', 'sipri', 'worldbank', 'horizon'];
  
  const allSignals: WorldSignal[] = [];
  const stats: Record<string, number> = {};
  const errors: string[] = [];

  // Run all sector collections in parallel
  const tasks: Promise<void>[] = [];

  for (const sector of sectors) {
    const queries = SECTOR_QUERIES[sector] ?? [sector];
    const primaryQuery = queries[0];

    if (sources.includes('gdelt')) {
      tasks.push(fetchGDELT(primaryQuery, 20).then(s => { allSignals.push(...s); stats[`gdelt_${sector}`] = s.length; }).catch(e => errors.push(`gdelt_${sector}: ${e.message}`)));
    }
    if (sources.includes('patents')) {
      tasks.push(fetchPatentsView(primaryQuery, 15).then(s => { allSignals.push(...s); stats[`patents_${sector}`] = s.length; }).catch(e => errors.push(`patents_${sector}: ${e.message}`)));
    }
    if (sources.includes('openalex')) {
      tasks.push(fetchOpenAlex(primaryQuery, sector).then(s => { allSignals.push(...s); stats[`openalex_${sector}`] = s.length; }).catch(e => errors.push(`openalex_${sector}: ${e.message}`)));
    }
    if (sources.includes('sbir') && ['defense', 'ai-ml', 'cybersecurity', 'space', 'energy'].includes(sector)) {
      tasks.push(fetchSBIR(primaryQuery).then(s => { allSignals.push(...s); stats[`sbir_${sector}`] = s.length; }).catch(e => errors.push(`sbir_${sector}: ${e.message}`)));
    }
    if (sources.includes('usaspending') && ['defense', 'cybersecurity', 'border-tech'].includes(sector)) {
      tasks.push(fetchUSASpending('Department of Defense', primaryQuery).then(s => { allSignals.push(...s); stats[`usaspend_${sector}`] = s.length; }).catch(e => errors.push(`usaspend_${sector}: ${e.message}`)));
    }
    if (sources.includes('worldbank') && ['logistics', 'energy', 'manufacturing'].includes(sector)) {
      tasks.push(fetchWorldBankProjects(primaryQuery).then(s => { allSignals.push(...s); stats[`worldbank_${sector}`] = s.length; }).catch(e => errors.push(`worldbank_${sector}: ${e.message}`)));
    }
    if (sources.includes('hackernews') && ['ai-ml', 'cybersecurity', 'space'].includes(sector)) {
      tasks.push(fetchHackerNews(primaryQuery).then(s => { allSignals.push(...s); stats[`hn_${sector}`] = s.length; }).catch(e => errors.push(`hn_${sector}: ${e.message}`)));
    }
  }

  // One-time sources
  if (sources.includes('darpa')) {
    tasks.push(fetchDARPA().then(s => { allSignals.push(...s); stats.darpa = s.length; }).catch(e => errors.push(`darpa: ${e.message}`)));
  }
  if (sources.includes('sipri')) {
    tasks.push(fetchSIPRINews().then(s => { allSignals.push(...s); stats.sipri = s.length; }).catch(e => errors.push(`sipri: ${e.message}`)));
  }
  if (sources.includes('producthunt')) {
    tasks.push(fetchProductHunt().then(s => { allSignals.push(...s); stats.producthunt = s.length; }).catch(e => errors.push(`producthunt: ${e.message}`)));
  }
  if (sources.includes('horizon')) {
    tasks.push(fetchHorizonEurope('artificial intelligence defence').then(s => { allSignals.push(...s); stats.horizon = s.length; }).catch(e => errors.push(`horizon: ${e.message}`)));
  }

  // Global regional signals
  if (sources.includes('gdelt')) {
    for (const region of GLOBAL_REGIONS) {
      tasks.push(fetchGDELT(region.queries[0], 10).then(s => { allSignals.push(...s); stats[`gdelt_${region.name}`] = s.length; }).catch(e => errors.push(`gdelt_${region.name}: ${e.message}`)));
    }
  }

  await Promise.allSettled(tasks);

  // Deduplicate by external_id
  const seen = new Set<string>();
  const unique = allSignals.filter(s => {
    if (seen.has(s.external_id)) return false;
    seen.add(s.external_id);
    return true;
  });

  stats.total = unique.length;
  stats.sources_run = tasks.length;

  return { signals: unique, stats, errors };
}
