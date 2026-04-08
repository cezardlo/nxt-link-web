export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { searchKgTechnologies } from '@/db/queries/kg-technologies';

import { searchKgCompanies } from '@/db/queries/kg-companies';
import { searchKgIndustries } from '@/db/queries/kg-industries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';

  if (!q || q.length < 2) {
    return NextResponse.json({ technologies: [], companies: [], industries: [] });
  }

  const [technologies, companies, industries] = await Promise.all([
    searchKgTechnologies(q, 10),
    searchKgCompanies(q, 10),
    searchKgIndustries(q, 10),
  ]);

  return NextResponse.json({ technologies, companies, industries });
}
