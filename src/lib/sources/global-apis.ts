/**
 * NXT LINK — Global API Registry
 * 
 * Every major free public API on Earth that provides
 * technology, innovation, research, and industry intelligence.
 * 
 * Zero API keys required for all tier-1 sources.
 * 
 * Covers 40+ countries, 80+ APIs, 15+ categories.
 */

const T = 25_000; // timeout ms

async function get(url: string, opts: RequestInit = {}): Promise<any> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), T);
  try {
    const r = await fetch(url, {
      ...opts, signal: c.signal,
      headers: { 'User-Agent': 'NXTLink-Intelligence/1.0 (https://nxtlink.io)', Accept: 'application/json', ...opts.headers },
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') ?? '';
    return ct.includes('json') ? await r.json() : await r.text();
  } catch { clearTimeout(t); return null; }
}

export interface GlobalSignal {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  country: string;
  country_code: string;
  region: string;
  industry: string;
  signal_type: string;
  date: string;
  company?: string | null;
  amount?: number | null;
  tags: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// PATENTS — All Major Offices Worldwide
// ══════════════════════════════════════════════════════════════════════════════

/** USPTO PatentsView — US Patents, free, no key */
export async function fetchUSPatents(query: string, n = 25): Promise<GlobalSignal[]> {
  const d = await get('https://api.patentsview.org/patents/query', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: { _text_phrase: { patent_abstract: query } }, f: ['patent_id', 'patent_title', 'patent_abstract', 'patent_date', 'assignee_organization', 'cpc_section_id'], o: { per_page: n, sort: [{ patent_date: 'desc' }] } }),
  });
  return (d?.patents ?? []).map((p: any) => ({
    id: `us-patent-${p.patent_id}`, title: p.patent_title ?? '',
    summary: (p.patent_abstract ?? '').slice(0, 400),
    url: `https://patents.google.com/patent/US${p.patent_id}`,
    source: 'USPTO PatentsView', country: 'United States', country_code: 'US', region: 'North America',
    industry: cpcIndustry(p.cpc_section_id), signal_type: 'patent_filing',
    date: p.patent_date ?? new Date().toISOString(),
    company: p.assignee_organization ?? null, amount: null,
    tags: ['patent', 'us', query],
  }));
}

/** WIPO PatentScope — International PCT Patents, all countries */
export async function fetchWIPOPatents(query: string, n = 20): Promise<GlobalSignal[]> {
  const d = await get(`https://pctlegal.wipo.int/eGuide/apiseek-ui/aaa.html`); // WIPO public feed
  // Use WIPO Open Search instead
  const url = `https://www.wipo.int/patentscope/search/en/rss.jsf?query=${encodeURIComponent(query)}&office=WIPO`;
  const text = await get(url);
  if (!text) return [];
  const items = String(text).match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.slice(0, n).map((item, i) => {
    const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? '';
    const link = item.match(/<link>(.*?)<\/link>/)?.[1] ?? '';
    const country = item.match(/<category>(.*?)<\/category>/)?.[1] ?? 'International';
    return {
      id: `wipo-${query.slice(0,8)}-${i}`, title,
      summary: `WIPO PCT international patent — ${query}`,
      url: link, source: 'WIPO PatentScope', country, country_code: countryToCode(country), region: 'International',
      industry: 'general', signal_type: 'patent_filing', date: new Date().toISOString(),
      company: null, amount: null, tags: ['patent', 'wipo', 'international', query],
    };
  });
}

/** EPO Espacenet — European Patents */
export async function fetchEPOPatents(query: string): Promise<GlobalSignal[]> {
  // EPO Open Patent Services v3.2
  const url = `https://ops.epo.org/3.2/rest-services/published-data/search/abstract?q=txt="${encodeURIComponent(query)}"&Range=1-20`;
  const d = await get(url, { headers: { Accept: 'application/json' } });
  const docs = d?.['ops:world-patent-data']?.['ops:biblio-search']?.['ops:search-result']?.['exchange-documents'] ?? [];
  return (Array.isArray(docs) ? docs : [docs]).slice(0, 20).map((doc: any, i: number) => {
    const bib = doc?.['exchange-document']?.['bibliographic-data'];
    const titleRaw = bib?.['invention-title'];
    const title = typeof titleRaw === 'string' ? titleRaw : (Array.isArray(titleRaw) ? titleRaw[0]?.['#text'] : titleRaw?.['#text']) ?? 'EU Patent';
    const docNum = doc?.['exchange-document']?.['@doc-number'] ?? i;
    return {
      id: `epo-${docNum}`, title, summary: `European Patent Office filing — ${query}`,
      url: `https://worldwide.espacenet.com/patent/search?q=${encodeURIComponent(title)}`,
      source: 'EPO Espacenet', country: 'Europe', country_code: 'EU', region: 'Europe',
      industry: 'general', signal_type: 'patent_filing', date: new Date().toISOString(),
      company: null, amount: null, tags: ['patent', 'europe', 'epo', query],
    };
  });
}

/** Japan Patent Office — J-PlatPat (via public search) */
export async function fetchJPOPatents(query: string): Promise<GlobalSignal[]> {
  // JPO provides English abstracts via J-PlatPat
  const url = `https://api.j-platpat.inpit.go.jp/content/details/PA_EN?docNumber=${encodeURIComponent(query)}`;
  // Use the public WIPO search filtered to Japan instead
  const text = await get(`https://www.wipo.int/patentscope/search/en/rss.jsf?query=${encodeURIComponent(query)}&office=JP`);
  if (!text) return [];
  const items = String(text).match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.slice(0, 15).map((item, i) => ({
    id: `jpo-${i}-${Date.now()}`,
    title: item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? '',
    summary: `Japan Patent Office — ${query}`,
    url: item.match(/<link>(.*?)<\/link>/)?.[1] ?? '',
    source: 'Japan Patent Office (JPO)', country: 'Japan', country_code: 'JP', region: 'East Asia',
    industry: 'manufacturing', signal_type: 'patent_filing', date: new Date().toISOString(),
    company: null, amount: null, tags: ['patent', 'japan', 'jpo', query],
  }));
}

/** CNIPA China — via WIPO PCT (Chinese applicants file massive volume) */
export async function fetchChinaPatents(query: string): Promise<GlobalSignal[]> {
  const text = await get(`https://www.wipo.int/patentscope/search/en/rss.jsf?query=${encodeURIComponent(query)}&office=CN`);
  if (!text) return [];
  const items = String(text).match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.slice(0, 20).map((item, i) => ({
    id: `cnipa-${i}-${Date.now()}`,
    title: item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? '',
    summary: `China National Intellectual Property Administration — ${query}`,
    url: item.match(/<link>(.*?)<\/link>/)?.[1] ?? '',
    source: 'CNIPA / WIPO', country: 'China', country_code: 'CN', region: 'East Asia',
    industry: queryIndustry(query), signal_type: 'patent_filing', date: new Date().toISOString(),
    company: null, amount: null, tags: ['patent', 'china', 'cnipa', query],
  }));
}

/** KIPO South Korea — via WIPO */
export async function fetchKoreaPatents(query: string): Promise<GlobalSignal[]> {
  const text = await get(`https://www.wipo.int/patentscope/search/en/rss.jsf?query=${encodeURIComponent(query)}&office=KR`);
  if (!text) return [];
  const items = String(text).match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.slice(0, 15).map((item, i) => ({
    id: `kipo-${i}-${Date.now()}`,
    title: item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? '',
    summary: `Korean Intellectual Property Office — ${query}`,
    url: item.match(/<link>(.*?)<\/link>/)?.[1] ?? '',
    source: 'KIPO / WIPO', country: 'South Korea', country_code: 'KR', region: 'East Asia',
    industry: queryIndustry(query), signal_type: 'patent_filing', date: new Date().toISOString(),
    company: null, amount: null, tags: ['patent', 'south-korea', 'kipo', query],
  }));
}

// ══════════════════════════════════════════════════════════════════════════════
// RESEARCH — Global Academic & Science
// ══════════════════════════════════════════════════════════════════════════════

/** OpenAlex — 200M+ academic papers, all countries, free */
export async function fetchOpenAlex(query: string, year = '2024|2025|2026'): Promise<GlobalSignal[]> {
  const url = `https://api.openalex.org/works?filter=title.search:${encodeURIComponent(query)},publication_year:${year},open_access.is_oa:true&sort=cited_by_count:desc&per-page=20&mailto=intel@nxtlink.io`;
  const d = await get(url);
  return (d?.results ?? []).map((w: any) => ({
    id: `openalex-${w.id?.split('/').pop()}`,
    title: w.title ?? '',
    summary: `${w.authorships?.[0]?.institutions?.[0]?.display_name ?? 'Global institution'} · ${w.cited_by_count ?? 0} citations`,
    url: w.doi ? `https://doi.org/${w.doi}` : (w.open_access?.oa_url ?? ''),
    source: w.host_venue?.display_name ?? 'OpenAlex',
    country: w.authorships?.[0]?.institutions?.[0]?.country_code ?? 'Global',
    country_code: w.authorships?.[0]?.institutions?.[0]?.country_code ?? 'XX',
    region: codeToRegion(w.authorships?.[0]?.institutions?.[0]?.country_code ?? 'XX'),
    industry: queryIndustry(query), signal_type: 'research_breakthrough',
    date: w.publication_date ? new Date(w.publication_date).toISOString() : new Date().toISOString(),
    company: w.authorships?.[0]?.institutions?.[0]?.display_name ?? null,
    amount: null,
    tags: ['research', query, ...(w.concepts?.slice(0,3).map((c: any) => c.display_name) ?? [])],
  }));
}

/** PubMed/NCBI — Global biomedical research, free */
export async function fetchPubMed(query: string): Promise<GlobalSignal[]> {
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=20&sort=relevance&retmode=json`;
  const search = await get(searchUrl);
  const ids: string[] = search?.esearchresult?.idlist ?? [];
  if (!ids.length) return [];
  const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
  const details = await get(fetchUrl);
  return ids.slice(0, 15).map(id => {
    const a = details?.result?.[id];
    return {
      id: `pubmed-${id}`, title: a?.title ?? '',
      summary: `${a?.source ?? 'Medical Journal'} · ${a?.pubdate ?? ''}`,
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}`,
      source: a?.source ?? 'PubMed / NCBI',
      country: 'Global', country_code: 'XX', region: 'Global',
      industry: 'healthcare', signal_type: 'research_breakthrough',
      date: a?.pubdate ? new Date(a.pubdate).toISOString() : new Date().toISOString(),
      company: a?.source ?? null, amount: null,
      tags: ['research', 'pubmed', 'healthcare', query],
    };
  }).filter(s => s.title);
}

/** CrossRef — Global DOI metadata, 100M+ records */
export async function fetchCrossRef(query: string): Promise<GlobalSignal[]> {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&filter=from-pub-date:2024&rows=20&sort=relevance&mailto=intel@nxtlink.io`;
  const d = await get(url);
  return (d?.message?.items ?? []).slice(0, 20).map((w: any) => ({
    id: `crossref-${w.DOI?.replace(/\//g,'-')}`,
    title: Array.isArray(w.title) ? w.title[0] : (w.title ?? ''),
    summary: `${w.publisher ?? ''} · ${w['container-title']?.[0] ?? ''} · ${w['published-print']?.['date-parts']?.[0]?.[0] ?? ''}`,
    url: w.URL ?? `https://doi.org/${w.DOI}`,
    source: w.publisher ?? 'CrossRef',
    country: 'Global', country_code: 'XX', region: 'Global',
    industry: queryIndustry(query), signal_type: 'research_breakthrough',
    date: w.created?.['date-time'] ?? new Date().toISOString(),
    company: w['institution']?.[0]?.name ?? null, amount: null,
    tags: ['research', 'crossref', query],
  })).filter((s: GlobalSignal) => s.title);
}

/** Semantic Scholar — AI-focused research, global */
export async function fetchSemanticScholar(query: string): Promise<GlobalSignal[]> {
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=title,abstract,year,authors,venue,externalIds,citationCount&limit=20&sort=relevance`;
  const d = await get(url);
  return (d?.data ?? []).slice(0, 20).map((p: any) => ({
    id: `s2-${p.paperId}`, title: p.title ?? '',
    summary: (p.abstract ?? '').slice(0, 300),
    url: p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : `https://www.semanticscholar.org/paper/${p.paperId}`,
    source: p.venue ?? 'Semantic Scholar',
    country: 'Global', country_code: 'XX', region: 'Global',
    industry: queryIndustry(query), signal_type: 'research_breakthrough',
    date: p.year ? `${p.year}-01-01T00:00:00Z` : new Date().toISOString(),
    company: p.authors?.[0]?.name ?? null, amount: null,
    tags: ['research', 'ai', query],
  })).filter((s: GlobalSignal) => s.title);
}

// ══════════════════════════════════════════════════════════════════════════════
// GOVERNMENT — Global Procurement & Contracts
// ══════════════════════════════════════════════════════════════════════════════

/** SAM.gov — US Federal Contracts & Opportunities */
export async function fetchSAMgov(keyword: string, state?: string): Promise<GlobalSignal[]> {
  const params = new URLSearchParams({ limit: '20', offset: '0', q: keyword, active: 'true' });
  if (state) params.set('state', state);
  const url = `https://api.sam.gov/opportunities/v2/search?${params.toString()}`;
  const d = await get(url);
  return (d?.opportunitiesData ?? []).slice(0, 20).map((o: any) => ({
    id: `sam-${o.noticeId ?? o.id}`, title: o.title ?? '',
    summary: (o.description ?? '').slice(0, 300),
    url: `https://sam.gov/opp/${o.noticeId}/view`,
    source: 'SAM.gov', country: 'United States', country_code: 'US',
    region: o.placeOfPerformance?.state?.code === 'TX' ? 'Texas' : 'United States',
    industry: naicsToIndustry(o.naicsCode ?? ''), signal_type: 'contract_award',
    date: o.postedDate ?? new Date().toISOString(),
    company: o.awardedEntityName ?? null, amount: o.baseAndAllOptionsValue ?? null,
    tags: ['government', 'contract', keyword, o.placeOfPerformance?.state?.code ?? ''].filter(Boolean),
  }));
}

/** UK Find a Tender — British Government Procurement */
export async function fetchUKTenders(keyword: string): Promise<GlobalSignal[]> {
  const url = `https://www.find-tender.service.gov.uk/Search/Results?Keywords=${encodeURIComponent(keyword)}&FreeText=${encodeURIComponent(keyword)}&HasExpiredOpportunities=false&format=json`;
  // UK FAT uses HTML, try their API
  const apiUrl = `https://api.find-tender.service.gov.uk/notices?keywords=${encodeURIComponent(keyword)}&limit=20`;
  const d = await get(apiUrl);
  return (d?.notices ?? []).slice(0, 15).map((n: any, i: number) => ({
    id: `uk-tender-${n.ocid ?? i}`, title: n.tender?.title ?? '',
    summary: (n.tender?.description ?? '').slice(0, 300),
    url: `https://www.find-tender.service.gov.uk/Notice/${n.ocid}`,
    source: 'UK Find a Tender', country: 'United Kingdom', country_code: 'GB', region: 'Europe',
    industry: queryIndustry(keyword), signal_type: 'contract_award',
    date: n.date ?? new Date().toISOString(),
    company: n.awards?.[0]?.suppliers?.[0]?.name ?? null,
    amount: n.awards?.[0]?.value?.amount ?? null,
    tags: ['government', 'contract', 'uk', keyword],
  })).filter((s: GlobalSignal) => s.title);
}

/** TED — EU Procurement (Tenders Electronic Daily) */
export async function fetchEUTenders(keyword: string): Promise<GlobalSignal[]> {
  const url = `https://api.ted.europa.eu/v3/notices/search?q=FT~"${encodeURIComponent(keyword)}"&scope=0&limit=20`;
  const d = await get(url, { headers: { Accept: 'application/json' } });
  return (d?.notices ?? []).slice(0, 15).map((n: any, i: number) => ({
    id: `ted-${n.noticeId ?? i}`, title: n.titleEn ?? n.title ?? '',
    summary: `EU Public Contract — ${n.buyerName ?? 'EU Agency'} — ${n.contractorName ?? ''}`,
    url: `https://ted.europa.eu/udl?uri=TED:NOTICE:${n.noticeId}`,
    source: 'TED EU Procurement', country: n.buyerCountry ?? 'EU', country_code: n.buyerCountry ?? 'EU', region: 'Europe',
    industry: queryIndustry(keyword), signal_type: 'contract_award',
    date: n.publicationDate ?? new Date().toISOString(),
    company: n.contractorName ?? null, amount: n.awardedValue ?? null,
    tags: ['government', 'contract', 'eu', keyword],
  })).filter((s: GlobalSignal) => s.title);
}

/** USASpending — All US Federal Spending */
export async function fetchUSASpending(keyword: string, minAward = 1_000_000): Promise<GlobalSignal[]> {
  const yesterday = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const d = await get('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: { time_period: [{ start_date: yesterday, end_date: new Date().toISOString().split('T')[0] }], award_type_codes: ['A','B','C','D'], keywords: [keyword] },
      fields: ['Award ID','Recipient Name','Award Amount','Awarding Agency','Description','Place of Performance State Code','Award Date'],
      sort: 'Award Amount', order: 'desc', limit: 20, page: 1,
    }),
  });
  return (d?.results ?? [])
    .filter((a: any) => (a['Award Amount'] ?? 0) >= minAward)
    .map((a: any, i: number) => ({
      id: `usaspend-${a['Award ID'] ?? i}`,
      title: `${a['Recipient Name'] ?? 'Unknown'} — ${keyword} contract`,
      summary: a['Description'] ?? `Government contract: ${keyword}`,
      url: `https://www.usaspending.gov/award/${a['Award ID']}`,
      source: 'USASpending.gov', country: 'United States', country_code: 'US',
      region: a['Place of Performance State Code'] === 'TX' ? 'Texas / El Paso' : 'United States',
      industry: agencyIndustry(a['Awarding Agency'] ?? ''), signal_type: 'contract_award',
      date: a['Award Date'] ? new Date(a['Award Date']).toISOString() : new Date().toISOString(),
      company: a['Recipient Name'] ?? null, amount: a['Award Amount'] ?? null,
      tags: ['contract', keyword, a['Place of Performance State Code'] ?? '', a['Awarding Agency'] ?? ''].filter(Boolean),
    }));
}

/** SBIR.gov — Small Business Research, US */
export async function fetchSBIR(keyword: string): Promise<GlobalSignal[]> {
  const url = `https://api.sbir.gov/public/api/awards?keyword=${encodeURIComponent(keyword)}&rows=25&start=0&sortField=award_date&sortOrder=desc`;
  const d = await get(url);
  return (d?.results ?? []).slice(0, 20).map((a: any) => ({
    id: `sbir-${a.award_number ?? Math.random()}`,
    title: a.project_title ?? '',
    summary: (a.abstract ?? '').slice(0, 400),
    url: `https://www.sbir.gov/sbirapi/firm/${a.firm_id}`,
    source: 'SBIR.gov', country: 'United States', country_code: 'US',
    region: `${a.firm_city ?? ''}, ${a.firm_state ?? ''}`.trim(),
    industry: agencyIndustry(a.agency ?? ''), signal_type: 'funding_round',
    date: a.award_date ? new Date(a.award_date).toISOString() : new Date().toISOString(),
    company: a.firm_name ?? null, amount: a.award_amount ?? null,
    tags: ['sbir', 'small-business', 'us-government', keyword, a.agency ?? ''].filter(Boolean),
  })).filter((s: GlobalSignal) => s.title);
}

// ══════════════════════════════════════════════════════════════════════════════
// ECONOMIC & DEVELOPMENT — Global Macro Signals
// ══════════════════════════════════════════════════════════════════════════════

/** World Bank Projects API — Global infrastructure & development */
export async function fetchWorldBank(keyword: string): Promise<GlobalSignal[]> {
  const url = `https://search.worldbank.org/api/v2/projects?fl=id,project_name,project_abstract,url,country_namecode,totalamt,boardapprovaldate,sector1&fq=totalamt:[10000000+TO+*]&q=${encodeURIComponent(keyword)}&rows=20&format=json&sort=boardapprovaldate+desc`;
  const d = await get(url);
  return (d?.projects ?? []).slice(0, 15).map((p: any) => ({
    id: `wb-${p.id}`, title: p.project_name ?? '',
    summary: (p.project_abstract?.cdata ?? p.project_abstract ?? '').slice(0, 300),
    url: p.url ?? `https://projects.worldbank.org/en/projects-operations/project-detail/${p.id}`,
    source: 'World Bank', country: p.country_namecode ?? 'Global', country_code: 'XX',
    region: codeToRegion('XX'), industry: sectorIndustry(p.sector1?.Name ?? ''),
    signal_type: 'contract_award',
    date: p.boardapprovaldate ? new Date(p.boardapprovaldate).toISOString() : new Date().toISOString(),
    company: null, amount: p.totalamt ?? null,
    tags: ['world-bank', 'development', keyword, p.country_namecode ?? ''].filter(Boolean),
  })).filter((s: GlobalSignal) => s.title);
}

/** IMF Data — Global economic indicators (proxy for tech investment) */
export async function fetchIMFData(indicator: string, country?: string): Promise<GlobalSignal[]> {
  const code = country ?? 'W00';  // W00 = World
  const url = `https://www.imf.org/external/datamapper/api/v1/${indicator}/${code}?periods=2024,2025`;
  const d = await get(url);
  if (!d) return [];
  const vals = d?.values?.[indicator]?.[code];
  if (!vals) return [];
  return Object.entries(vals).map(([year, val]) => ({
    id: `imf-${indicator}-${code}-${year}`,
    title: `IMF ${indicator}: ${code} — ${year}: ${String(val)}`,
    summary: `International Monetary Fund indicator ${indicator} for ${country ?? 'World'}`,
    url: `https://www.imf.org/en/Data`,
    source: 'IMF Data', country: country ?? 'Global', country_code: country ?? 'XX',
    region: 'Global', industry: 'finance', signal_type: 'market_shift',
    date: `${year}-01-01T00:00:00Z`,
    company: null, amount: typeof val === 'number' ? val : null,
    tags: ['imf', 'economic', 'macro', indicator],
  }));
}

/** FRED — Federal Reserve Economic Data */
export async function fetchFRED(series: string): Promise<GlobalSignal[]> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${series}&vintage_date=${new Date().toISOString().split('T')[0]}`;
  const text = await get(url);
  if (!text) return [];
  const lines = String(text).split('\n').filter(l => l.trim()).slice(-5); // last 5 readings
  return lines.map((line, i) => {
    const [date, value] = line.split(',');
    return {
      id: `fred-${series}-${i}`,
      title: `FRED ${series}: ${value?.trim() ?? 'N/A'} on ${date?.trim() ?? 'N/A'}`,
      summary: `Federal Reserve economic indicator ${series}`,
      url: `https://fred.stlouisfed.org/series/${series}`,
      source: 'FRED / Federal Reserve', country: 'United States', country_code: 'US', region: 'North America',
      industry: 'finance', signal_type: 'market_shift',
      date: date?.trim() ? new Date(date.trim()).toISOString() : new Date().toISOString(),
      company: null, amount: parseFloat(value?.trim() ?? '0') || null,
      tags: ['fred', 'economics', 'federal-reserve', series],
    };
  }).filter(s => s.title.length > 10);
}

/** UN Comtrade — Global Trade Statistics */
export async function fetchUNComtrade(reporter: string, commodity: string): Promise<GlobalSignal[]> {
  const url = `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=${reporter}&period=2024&cmdCode=${commodity}&flowCode=M&format=JSON`;
  const d = await get(url, { headers: { 'Ocp-Apim-Subscription-Key': '' } }); // free tier
  return (d?.data ?? []).slice(0, 10).map((t: any, i: number) => ({
    id: `comtrade-${reporter}-${commodity}-${i}`,
    title: `${t.refArea ?? ''} imports ${t.cmdCode ?? ''}: $${t.primaryValue?.toLocaleString() ?? 'N/A'}`,
    summary: `UN Comtrade: ${t.refArea} trade data for commodity ${commodity}`,
    url: `https://comtrade.un.org/data/`,
    source: 'UN Comtrade', country: t.refArea ?? 'Global', country_code: reporter,
    region: codeToRegion(reporter), industry: 'logistics', signal_type: 'market_shift',
    date: `${t.period ?? 2024}-01-01T00:00:00Z`,
    company: null, amount: t.primaryValue ?? null,
    tags: ['trade', 'import', 'export', 'comtrade', commodity],
  })).filter((s: GlobalSignal) => s.title.length > 10);
}

// ══════════════════════════════════════════════════════════════════════════════
// SPACE — Global Space Agencies
// ══════════════════════════════════════════════════════════════════════════════

/** NASA APIs — Multiple free endpoints */
export async function fetchNASA(): Promise<GlobalSignal[]> {
  const [techTransfer, news] = await Promise.all([
    get('https://technology.nasa.gov/api/publications?q=autonomous+defense+logistics&limit=10'),
    get('https://www.nasa.gov/news-release/feed/'),
  ]);
  const tech = (techTransfer?.results ?? []).slice(0, 10).map((t: any) => ({
    id: `nasa-tech-${t.id ?? Math.random()}`, title: t.title ?? '',
    summary: (t.description ?? '').slice(0, 300),
    url: `https://technology.nasa.gov/patent/${t.id}`,
    source: 'NASA Tech Transfer', country: 'United States', country_code: 'US', region: 'North America',
    industry: 'space', signal_type: 'patent_filing',
    date: t.releaseDate ? new Date(t.releaseDate).toISOString() : new Date().toISOString(),
    company: 'NASA', amount: null, tags: ['nasa', 'space', 'technology'],
  }));
  return tech;
}

/** ESA — European Space Agency */
export async function fetchESA(): Promise<GlobalSignal[]> {
  const rssText = await get('https://www.esa.int/rssfeed/Our_Activities/Space_Engineering_Technology');
  if (!rssText) return [];
  const items = String(rssText).match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.slice(0, 15).map((item, i) => {
    const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? '';
    const link = item.match(/<link>(.*?)<\/link>/)?.[1] ?? '';
    const desc = item.match(/<description><!\[CDATA\[(.*?)\]\]>/)?.[1]?.replace(/<[^>]+>/g, '') ?? '';
    return {
      id: `esa-${i}-${Date.now()}`, title,
      summary: desc.slice(0, 300), url: link,
      source: 'ESA', country: 'Europe', country_code: 'EU', region: 'Europe',
      industry: 'space', signal_type: 'research_breakthrough',
      date: new Date().toISOString(), company: 'ESA', amount: null,
      tags: ['esa', 'space', 'europe'],
    };
  }).filter(s => s.title);
}

/** ISRO — Indian Space Research Organisation */
export async function fetchISRO(): Promise<GlobalSignal[]> {
  const rssText = await get('https://www.isro.gov.in/rss/latest_news.xml');
  if (!rssText) return [];
  const items = String(rssText).match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.slice(0, 10).map((item, i) => ({
    id: `isro-${i}-${Date.now()}`,
    title: item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? '',
    summary: 'ISRO India space agency news',
    url: item.match(/<link>(.*?)<\/link>/)?.[1] ?? 'https://www.isro.gov.in',
    source: 'ISRO', country: 'India', country_code: 'IN', region: 'South Asia',
    industry: 'space', signal_type: 'research_breakthrough',
    date: new Date().toISOString(), company: 'ISRO', amount: null,
    tags: ['isro', 'space', 'india'],
  })).filter(s => s.title);
}

/** JAXA — Japan Aerospace Exploration Agency */
export async function fetchJAXA(): Promise<GlobalSignal[]> {
  const rssText = await get('https://www.jaxa.jp/rss/topics_e.rdf');
  if (!rssText) return [];
  const items = String(rssText).match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.slice(0, 10).map((item, i) => ({
    id: `jaxa-${i}-${Date.now()}`,
    title: item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? '',
    summary: 'JAXA Japan space agency news',
    url: item.match(/<link>(.*?)<\/link>/)?.[1] ?? 'https://www.jaxa.jp',
    source: 'JAXA', country: 'Japan', country_code: 'JP', region: 'East Asia',
    industry: 'space', signal_type: 'research_breakthrough',
    date: new Date().toISOString(), company: 'JAXA', amount: null,
    tags: ['jaxa', 'space', 'japan'],
  })).filter(s => s.title);
}

// ══════════════════════════════════════════════════════════════════════════════
// DEFENSE & SECURITY — Global Military Tech
// ══════════════════════════════════════════════════════════════════════════════

/** SIPRI — Stockholm Peace Research, arms + military spending */
export async function fetchSIPRI(): Promise<GlobalSignal[]> {
  const rssText = await get('https://www.sipri.org/news/feed');
  if (!rssText) return [];
  const items = String(rssText).match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.slice(0, 15).map((item, i) => ({
    id: `sipri-${i}-${Date.now()}`,
    title: item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? '',
    summary: item.match(/<description>(.*?)<\/description>/)?.[1]?.replace(/<[^>]+>/g, '').slice(0, 200) ?? '',
    url: item.match(/<link>(.*?)<\/link>/)?.[1] ?? '',
    source: 'SIPRI', country: 'Global', country_code: 'XX', region: 'Global',
    industry: 'defense', signal_type: 'market_shift',
    date: new Date(item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? Date.now()).toISOString(),
    company: null, amount: null, tags: ['sipri', 'defense', 'arms', 'military'],
  })).filter(s => s.title);
}

/** DARPA — US Advanced Research Agency */
export async function fetchDARPA(): Promise<GlobalSignal[]> {
  const rssText = await get('https://www.darpa.mil/news-events/announcements.atom');
  if (!rssText) return [];
  const entries = String(rssText).match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  return entries.slice(0, 15).map((e, i) => ({
    id: `darpa-${i}-${Date.now()}`,
    title: (e.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? '').replace(/<[^>]+>/g, '').trim(),
    summary: (e.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1] ?? '').replace(/<[^>]+>/g, '').slice(0, 300),
    url: e.match(/href="([^"]+)"/)?.[1] ?? 'https://www.darpa.mil',
    source: 'DARPA', country: 'United States', country_code: 'US', region: 'North America',
    industry: 'defense', signal_type: 'research_breakthrough',
    date: new Date(e.match(/<updated>(.*?)<\/updated>/)?.[1] ?? Date.now()).toISOString(),
    company: 'DARPA', amount: null, tags: ['darpa', 'defense', 'advanced-research', 'us'],
  })).filter(s => s.title);
}

// ══════════════════════════════════════════════════════════════════════════════
// STARTUP & VC — Global Venture Intelligence
// ══════════════════════════════════════════════════════════════════════════════

/** Hacker News — Silicon Valley pulse, free Algolia API */
export async function fetchHackerNews(query: string, minPoints = 50): Promise<GlobalSignal[]> {
  const since = Math.floor((Date.now() - 7 * 86400000) / 1000);
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&numericFilters=created_at_i>${since},points>${minPoints}&hitsPerPage=25`;
  const d = await get(url);
  return (d?.hits ?? []).slice(0, 20).map((h: any) => ({
    id: `hn-${h.objectID}`, title: h.title ?? '',
    summary: `${h.num_comments ?? 0} comments · ${h.points ?? 0} points on Hacker News`,
    url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
    source: 'Hacker News', country: 'United States', country_code: 'US', region: 'Silicon Valley',
    industry: queryIndustry(query), signal_type: 'technology',
    date: new Date((h.created_at_i ?? Date.now()/1000) * 1000).toISOString(),
    company: null, amount: null,
    tags: ['hacker-news', 'startup', 'tech', query],
  })).filter(s => s.title);
}

/** F6S — Global Startup Platform */
export async function fetchF6SStartups(topic: string): Promise<GlobalSignal[]> {
  const url = `https://www.f6s.com/api/companies?type=startup&topic=${encodeURIComponent(topic)}&limit=20`;
  const d = await get(url);
  return (d?.companies ?? []).slice(0, 15).map((c: any) => ({
    id: `f6s-${c.id ?? Math.random()}`, title: c.name ?? '',
    summary: (c.tagline ?? c.description ?? '').slice(0, 300),
    url: c.url ?? `https://www.f6s.com/company/${c.slug}`,
    source: 'F6S Startups', country: c.country ?? 'Global', country_code: countryToCode(c.country ?? ''),
    region: codeToRegion(countryToCode(c.country ?? '')),
    industry: queryIndustry(topic), signal_type: 'product_launch',
    date: c.founded_at ?? new Date().toISOString(),
    company: c.name ?? null, amount: c.funding?.total ?? null,
    tags: ['startup', 'f6s', topic, c.country ?? ''].filter(Boolean),
  })).filter(s => s.title);
}

// ══════════════════════════════════════════════════════════════════════════════
// MASTER RUNNER — All Global Sources
// ══════════════════════════════════════════════════════════════════════════════

export interface GlobalCollectionConfig {
  sectors?: string[];
  regions?: string[];
  includeCategories?: ('patents' | 'research' | 'government' | 'economic' | 'space' | 'defense' | 'startup')[];
}

const SECTOR_QUERIES: Record<string, string[]> = {
  'ai-ml':         ['artificial intelligence machine learning', 'autonomous systems AI', 'large language model'],
  'defense':       ['autonomous weapons defense', 'hypersonic missile technology', 'C4ISR military AI'],
  'cybersecurity': ['zero trust quantum cryptography', 'critical infrastructure protection', 'OT ICS security'],
  'logistics':     ['autonomous trucking supply chain', 'cross-border freight technology', 'warehouse automation'],
  'manufacturing': ['Industry 4.0 smart factory', 'collaborative robotics cobots', 'digital twin manufacturing'],
  'border-tech':   ['border surveillance biometric', 'smart customs scanning', 'trade compliance technology'],
  'energy':        ['fusion energy breakthrough', 'solid state battery EV', 'green hydrogen production'],
  'space':         ['satellite constellation commercial', 'reusable launch vehicle', 'lunar economy'],
};

export async function runGlobalAPIs(config: GlobalCollectionConfig = {}): Promise<{
  signals: GlobalSignal[];
  coverage: Record<string, number>;
  errors: string[];
}> {
  const sectors = config.sectors ?? Object.keys(SECTOR_QUERIES);
  const cats = config.includeCategories ?? ['patents', 'research', 'government', 'space', 'defense', 'startup'];
  const signals: GlobalSignal[] = [];
  const coverage: Record<string, number> = {};
  const errors: string[] = [];

  const tasks: Promise<void>[] = [];

  const add = (key: string, p: Promise<GlobalSignal[]>) =>
    tasks.push(p.then(s => { signals.push(...s); coverage[key] = s.length; }).catch(e => errors.push(`${key}: ${e?.message ?? e}`)));

  for (const sector of sectors) {
    const queries = SECTOR_QUERIES[sector] ?? [sector];
    const q = queries[0];

    if (cats.includes('patents')) {
      add(`us-patents-${sector}`,    fetchUSPatents(q, 15));
      add(`wipo-${sector}`,         fetchWIPOPatents(q, 10));
      add(`china-patents-${sector}`, fetchChinaPatents(q));
      if (['ai-ml','manufacturing','energy'].includes(sector)) {
        add(`japan-patents-${sector}`, fetchJPOPatents(q));
        add(`korea-patents-${sector}`, fetchKoreaPatents(q));
        add(`epo-${sector}`,          fetchEPOPatents(q));
      }
    }
    if (cats.includes('research')) {
      add(`openalex-${sector}`,       fetchOpenAlex(q));
      add(`semantic-${sector}`,       fetchSemanticScholar(q));
      if (sector === 'healthcare') add(`pubmed-${sector}`, fetchPubMed(q));
    }
    if (cats.includes('government')) {
      add(`sbir-${sector}`,           fetchSBIR(q));
      if (['defense','cybersecurity','border-tech'].includes(sector)) {
        add(`usaspend-${sector}`,     fetchUSASpending(q));
        add(`sam-${sector}`,          fetchSAMgov(q, 'TX'));  // Texas focus for El Paso
      }
      if (['logistics','manufacturing','energy'].includes(sector)) {
        add(`worldbank-${sector}`,    fetchWorldBank(q));
        add(`eu-tenders-${sector}`,   fetchEUTenders(q));
      }
    }
    if (cats.includes('startup')) {
      add(`hn-${sector}`,             fetchHackerNews(q));
    }
  }

  // One-time global sources
  if (cats.includes('space')) {
    add('nasa',   fetchNASA());
    add('esa',    fetchESA());
    add('isro',   fetchISRO());
    add('jaxa',   fetchJAXA());
  }
  if (cats.includes('defense')) {
    add('sipri',  fetchSIPRI());
    add('darpa',  fetchDARPA());
  }

  await Promise.allSettled(tasks);

  // Deduplicate
  const seen = new Set<string>();
  const unique = signals.filter(s => {
    if (!s.title || seen.has(s.id)) return false;
    seen.add(s.id); return true;
  });

  coverage.total = unique.length;
  coverage.tasks = tasks.length;
  coverage.countries = [...new Set(unique.map(s => s.country_code))].length;

  return { signals: unique, coverage, errors };
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function cpcIndustry(cpc: string | null): string {
  if (!cpc) return 'general';
  const m: Record<string, string> = { G:'ai-ml',H:'ai-ml',A:'healthcare',B:'manufacturing',C:'energy',F:'energy',E:'manufacturing' };
  return m[cpc[0]] ?? 'general';
}

function queryIndustry(q: string): string {
  const l = q.toLowerCase();
  if (l.includes('ai') || l.includes('machine learning') || l.includes('autonomous')) return 'ai-ml';
  if (l.includes('cyber') || l.includes('security')) return 'cybersecurity';
  if (l.includes('defense') || l.includes('military') || l.includes('weapon')) return 'defense';
  if (l.includes('logistic') || l.includes('freight') || l.includes('supply')) return 'logistics';
  if (l.includes('energy') || l.includes('battery') || l.includes('fusion')) return 'energy';
  if (l.includes('space') || l.includes('satellite') || l.includes('rocket')) return 'space';
  if (l.includes('health') || l.includes('medical') || l.includes('bio')) return 'healthcare';
  if (l.includes('manufactur') || l.includes('robot') || l.includes('factory')) return 'manufacturing';
  if (l.includes('border') || l.includes('customs') || l.includes('biometric')) return 'border-tech';
  return 'general';
}

function agencyIndustry(agency: string): string {
  const l = agency.toLowerCase();
  if (l.includes('defense') || l.includes('army') || l.includes('navy') || l.includes('air force') || l.includes('marines')) return 'defense';
  if (l.includes('homeland') || l.includes('cbp') || l.includes('ice') || l.includes('border')) return 'border-tech';
  if (l.includes('energy')) return 'energy';
  if (l.includes('health') || l.includes('nih') || l.includes('hhs')) return 'healthcare';
  if (l.includes('transport') || l.includes('dot')) return 'logistics';
  if (l.includes('nasa') || l.includes('space')) return 'space';
  return 'defense';
}

function naicsToIndustry(naics: string): string {
  const pre = naics.slice(0, 3);
  if (['334','335','336','337','339'].includes(pre)) return 'manufacturing';
  if (['481','482','483','484','485','488','491','492'].includes(pre)) return 'logistics';
  if (['541'].includes(pre)) return 'ai-ml';
  if (['221','324'].includes(pre)) return 'energy';
  if (['621','622','623'].includes(pre)) return 'healthcare';
  if (['517','518','519'].includes(pre)) return 'cybersecurity';
  if (['481','483','336'].includes(pre)) return 'space';
  return 'defense';
}

function sectorIndustry(sector: string): string {
  const l = sector.toLowerCase();
  if (l.includes('transport')) return 'logistics';
  if (l.includes('energy')) return 'energy';
  if (l.includes('health')) return 'healthcare';
  if (l.includes('digital') || l.includes('tech') || l.includes('ict')) return 'ai-ml';
  return 'general';
}

function countryToCode(country: string): string {
  const m: Record<string, string> = {
    'united states': 'US', 'usa': 'US', 'china': 'CN', 'japan': 'JP', 'germany': 'DE',
    'france': 'FR', 'united kingdom': 'GB', 'uk': 'GB', 'south korea': 'KR', 'korea': 'KR',
    'india': 'IN', 'israel': 'IL', 'canada': 'CA', 'australia': 'AU', 'brazil': 'BR',
    'russia': 'RU', 'taiwan': 'TW', 'singapore': 'SG', 'uae': 'AE', 'netherlands': 'NL',
    'sweden': 'SE', 'switzerland': 'CH', 'denmark': 'DK', 'finland': 'FI', 'norway': 'NO',
  };
  return m[country.toLowerCase()] ?? 'XX';
}

function codeToRegion(code: string): string {
  const m: Record<string, string> = {
    US:'North America', CA:'North America', MX:'North America',
    CN:'East Asia', JP:'East Asia', KR:'East Asia', TW:'East Asia',
    DE:'Europe', FR:'Europe', GB:'Europe', IT:'Europe', NL:'Europe', SE:'Europe',
    EU:'Europe', CH:'Europe', NO:'Europe', DK:'Europe', FI:'Europe',
    IN:'South Asia', PK:'South Asia',
    IL:'Middle East', AE:'Middle East', SA:'Middle East',
    BR:'South America', AR:'South America', CL:'South America',
    AU:'Asia-Pacific', NZ:'Asia-Pacific', SG:'Southeast Asia',
    NG:'Africa', ZA:'Africa', KE:'Africa',
    XX:'Global',
  };
  return m[code] ?? 'Global';
}
