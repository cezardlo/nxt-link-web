/**
 * GET /api/conferences/[id]/exhibitors
 * Returns companies that exhibited at a specific conference.
 * Joins conference_vendor_links with vendors for full company data.
 */

import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conferenceId } = await params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ exhibitors: [], total: 0, source: 'unavailable' });
  }

  const supabase = createClient();

  // Get vendor links for this conference
  const { data: links, error } = await supabase
    .from('conference_vendor_links')
    .select('id, company_name, match_confidence, technologies, signal_types, vendor_id')
    .eq('conference_id', conferenceId)
    .order('match_confidence', { ascending: false })
    .limit(100);

  if (error || !links?.length) {
    return NextResponse.json({
      exhibitors: [],
      total: 0,
      conference_id: conferenceId,
      source: 'no_data',
      message: 'No exhibitor data scraped yet for this conference.',
    });
  }

  // Enrich with full vendor data where vendor_id is linked
  const vendorIds = links.filter(l => l.vendor_id).map(l => l.vendor_id as string);
  let vendorMap: Record<string, { company_url: string | null; description: string | null; sector: string | null; iker_score: number | null }> = {};

  if (vendorIds.length > 0) {
    const { data: vendors } = await supabase
      .from('vendors')
      .select('"ID", company_name, company_url, description, sector, iker_score')
      .in('"ID"', vendorIds.map(Number).filter(Boolean));

    if (vendors) {
      for (const v of vendors) {
        vendorMap[String(v.ID)] = {
          company_url: v.company_url,
          description: v.description,
          sector: v.sector,
          iker_score: v.iker_score,
        };
      }
    }
  }

  const exhibitors = links.map(link => {
    const vendor = link.vendor_id ? vendorMap[link.vendor_id] : null;
    // Derive logo URL from company name → try to get domain
    const domain = vendor?.company_url
      ? (() => { try { return new URL(vendor.company_url).hostname.replace('www.', ''); } catch { return null; } })()
      : null;

    return {
      id: link.id,
      company_name: link.company_name,
      logo_url: domain ? `https://logo.clearbit.com/${domain}` : null,
      company_url: vendor?.company_url ?? null,
      description: vendor?.description ?? null,
      sector: vendor?.sector ?? null,
      iker_score: vendor?.iker_score ?? null,
      technologies: (link.technologies as string[]) ?? [],
      match_confidence: link.match_confidence,
      has_vendor_profile: !!link.vendor_id,
    };
  });

  return NextResponse.json(
    {
      exhibitors,
      total: exhibitors.length,
      conference_id: conferenceId,
      source: 'database',
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
}
