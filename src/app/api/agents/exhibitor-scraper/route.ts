// POST /api/agents/exhibitor-scraper — Scrape exhibitor pages from conferences
// GET  /api/agents/exhibitor-scraper — Get exhibitors from DB

import { NextRequest, NextResponse } from 'next/server';
import {
  runExhibitorScraper,
  type ExhibitorScrapeOptions,
} from '@/lib/agents/agents/exhibitor-scraper-agent';
import {

export const dynamic = 'force-dynamic';
  getExhibitors,
  upsertExhibitors,
  type ExhibitorInsert,
} from '@/db/queries/exhibitors';

export async function POST(req: NextRequest) {
  let body: ExhibitorScrapeOptions = {};
  try {
    body = await req.json();
  } catch {
    // use defaults
  }

  const report = await runExhibitorScraper(body);

  // Persist results
  const inserts: ExhibitorInsert[] = [];
  for (const result of report.results) {
    for (const exh of result.exhibitors) {
      const id = `${result.conference_id}::${exh.normalized_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      inserts.push({
        id,
        conference_id: result.conference_id,
        conference_name: result.conference_name,
        raw_name: exh.raw_name,
        normalized_name: exh.normalized_name,
        booth: exh.booth,
        category: exh.category,
        description: exh.description,
        website: exh.website,
        confidence: exh.confidence,
        source_url: result.exhibitor_page_url,
      });
    }
  }

  const persisted = await upsertExhibitors(inserts);

  return NextResponse.json({ ...report, exhibitors_persisted: persisted });
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const data = await getExhibitors({
    conference_id: sp.get('conference_id') ?? undefined,
    search: sp.get('search') ?? undefined,
    limit: Number(sp.get('limit')) || 200,
  });

  return NextResponse.json({ exhibitors: data, total: data.length });
}
