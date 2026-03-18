import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';

export const dynamic = 'force-dynamic';

const TTL = 10 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

type ArxivPaper = {
  title: string;
  authors: string[];
  summary: string;
  published: string;
  category: string;
  link: string;
};

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].trim().replace(/\s+/g, ' ') : '';
}

function extractAll(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    results.push(m[1].trim());
  }
  return results;
}

function parseArxivEntry(entryXml: string): ArxivPaper {
  // Title — strip CDATA if present
  const rawTitle = extractTag(entryXml, 'title').replace(/<!\[CDATA\[|\]\]>/g, '').trim();

  // Authors: <author><name>...</name></author>
  const authorBlocks = extractAll(entryXml, 'author');
  const authors = authorBlocks.map((a) => extractTag(a, 'name')).filter(Boolean);

  const summary = extractTag(entryXml, 'summary').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
  const published = extractTag(entryXml, 'published');

  // Primary category
  const catMatch = entryXml.match(/<arxiv:primary_category[^>]*term="([^"]+)"/i)
    ?? entryXml.match(/<category[^>]*term="([^"]+)"/i);
  const category = catMatch ? catMatch[1] : 'cs';

  // Link — prefer alternate
  const linkMatch = entryXml.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i)
    ?? entryXml.match(/<id>([^<]+)<\/id>/i);
  const link = linkMatch ? linkMatch[1].trim() : '';

  return { title: rawTitle, authors, summary, published, category, link };
}

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `intel-research:${ip}`, maxRequests: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json({ ok: true, data: cache.data }, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' },
    });
  }

  try {
    const url = 'https://export.arxiv.org/api/query?search_query=all:el+paso+OR+all:border+technology+OR+all:logistics+automation+OR+all:cybersecurity&start=0&max_results=20&sortBy=submittedDate&sortOrder=descending';

    const res = await fetch(url, {
      headers: { 'User-Agent': 'NXTLink/1.0 (nxtlink@nxtlinktech.com)' },
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) throw new Error(`arXiv HTTP ${res.status}`);

    const xml = await res.text();

    // Split on <entry> blocks
    const entryRe = /<entry>([\s\S]*?)<\/entry>/gi;
    const papers: ArxivPaper[] = [];
    let m: RegExpExecArray | null;
    while ((m = entryRe.exec(xml)) !== null) {
      papers.push(parseArxivEntry(m[1]));
    }

    const data = { papers, total: papers.length };
    cache = { data, ts: Date.now() };

    return NextResponse.json({ ok: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fetch failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
