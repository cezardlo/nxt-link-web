import { NextResponse } from 'next/server';
import { getDb } from '@/lib/supabase/client';
import { askJarvis, parseJarvisJSON } from '@/lib/ai/provider';

const READING_LIST = [
  { name: 'Top Logistics Startups 2026', url: 'https://startus-insights.com/innovators-guide/logistics-startups-and-companies/' },
  { name: 'Top Logistics Startups 2025', url: 'https://startus-insights.com/innovators-guide/logistics-startups/' },
  { name: 'Supply Chain Startups', url: 'https://startus-insights.com/innovators-guide/supply-chain-startups/' },
  { name: 'Manufacturing Startups', url: 'https://startus-insights.com/innovators-guide/manufacturing-startups/' },
  { name: 'AI in Supply Chain Trends', url: 'https://startus-insights.com/innovators-guide/trend-tracking-tools/' },
  { name: 'Industry 4.0 Startups', url: 'https://startus-insights.com/innovators-guide/industries/industry-4-0/' },
];

interface DiscoveredVendor {
  name: string;
  country: string;
  founded_year: number | null;
  problem_solved: string;
  website: string | null;
  sectors: string[];
  nxt_link_fit: 'strong' | 'moderate' | 'weak';
  fit_reason: string;
  skip_reason: string | null;
}

export async function GET(req: Request) {
  try {
    const db = getDb();
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '30'), 100);
    const fit = url.searchParams.get('fit');
    let query = db.from('vendors').select('*').order('created_at', { ascending: false }).limit(limit);
    if (fit) { query = query.eq('nxt_link_fit', fit); }
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ status: 'ok', count: (data || []).length, vendors: data || [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const db = getDb();
    const requestUrl = new URL(req.url);
    const targetUrl = requestUrl.searchParams.get('url');
    const urlsToProcess = targetUrl ? [{ name: 'Custom report', url: targetUrl }] : READING_LIST;
    const allDiscovered: DiscoveredVendor[] = [];
    const errors: string[] = [];

    for (const report of urlsToProcess) {
      try {
        const response = await fetch(report.url, {
          headers: { 'User-Agent': 'NXT-LINK-Discovery/1.0' },
        });
        if (!response.ok) {
          errors.push(`Failed to fetch ${report.name}: ${response.status}`);
          continue;
        }
        const html = await response.text();
        const textContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 15000);

        const aiResponse = await askJarvis({
          agent: 'vendor-discovery',
          systemPrompt: `You are a vendor discovery engine for NXT LINK, a company in El Paso, Texas that connects logistics and manufacturing companies across the US-Mexico border. Extract EVERY company mentioned in the report. For each: 1) Name 2) Country 3) Founded year or null 4) Problem solved (one sentence) 5) Website or null 6) Sectors 7) NXT LINK fit: strong (2018-2024, outside US, logistics/mfg/supply chain), moderate (some criteria), weak (pre-2015, US-dominant, wrong sector) 8) Fit reason 9) Skip reason if weak. SKIP: pre-2015, e-commerce/consumer delivery, US-dominant (Flexport, project44). PRIORITIZE cross-border corridor. Return JSON: { "report_title": "string", "companies_found": number, "vendors": [{ "name": "string", "country": "string", "founded_year": number|null, "problem_solved": "string", "website": "string"|null, "sectors": ["string"], "nxt_link_fit": "strong|moderate|weak", "fit_reason": "string", "skip_reason": null|"string" }] }`,
          userPrompt: `Extract all companies from this StartUs Insights report: "${report.name}"\n\nPage content:\n${textContent}`,
          maxTokens: 3000,
        });
        const parsed = parseJarvisJSON(aiResponse.text, { vendors: [], companies_found: 0 });
        allDiscovered.push(...(parsed.vendors || []));
      } catch (reportErr) {
        errors.push(`Error processing ${report.name}: ${String(reportErr)}`);
      }
    }

    const qualified = allDiscovered.filter((v) => v.nxt_link_fit !== 'weak');
    const strong = allDiscovered.filter((v) => v.nxt_link_fit === 'strong');

    const existingNames = new Set<string>();
    if (qualified.length > 0) {
      const { data: existing } = await db.from('vendors').select('name').in('name', qualified.map((v) => v.name));
      (existing || []).forEach((e) => existingNames.add(e.name.toLowerCase()));
    }

    const newVendors = qualified.filter((v) => !existingNames.has(v.name.toLowerCase()));
    let insertedCount = 0;

    for (const vendor of newVendors) {
      const { error: insertError } = await db.from('vendors').insert({
        name: vendor.name,
        country: vendor.country,
        founded_year: vendor.founded_year,
        description: vendor.problem_solved,
        website: vendor.website,
        sectors: vendor.sectors,
        nxt_link_fit: vendor.nxt_link_fit,
        fit_reason: vendor.fit_reason,
        source: 'startus-insights',
        discovery_method: 'automated',
        status: 'discovered',
      });
      if (!insertError) insertedCount++;
    }

    await db.from('swarm_memory').insert({
      agent_name: 'vendor-discovery',
      entry_type: 'finding',
      topic: `Scanned ${urlsToProcess.length} reports, found ${strong.length} strong-fit vendors`,
      content: {
        reports_scanned: urlsToProcess.length,
        total_found: allDiscovered.length,
        strong_fit: strong.length,
        moderate_fit: qualified.length - strong.length,
        weak_skipped: allDiscovered.length - qualified.length,
        new_inserted: insertedCount,
        already_known: qualified.length - newVendors.length,
        top_strong: strong.slice(0, 5).map((v) => ({ name: v.name, country: v.country, problem: v.problem_solved })),
      },
      confidence: 0.8,
      tags: ['vendor-discovery', 'startus-insights', 'pipeline'],
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return NextResponse.json({
      status: 'ok',
      reports_scanned: urlsToProcess.length,
      total_companies_found: allDiscovered.length,
      strong_fit: strong.length,
      moderate_fit: qualified.length - strong.length,
      weak_skipped: allDiscovered.length - qualified.length,
      new_vendors_added: insertedCount,
      already_in_database: qualified.length - newVendors.length,
      errors: errors.length > 0 ? errors : undefined,
      strong_vendors: strong.map((v) => ({
        name: v.name, country: v.country, founded: v.founded_year,
        problem: v.problem_solved, website: v.website, sectors: v.sectors, fit_reason: v.fit_reason,
      })),
      duration_ms: Date.now() - startTime,
      provider: 'gemini-free',
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
