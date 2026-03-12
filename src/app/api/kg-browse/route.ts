import { NextResponse } from 'next/server';
import { getKgTechnologies } from '@/db/queries/kg-technologies';

export const dynamic = 'force-dynamic';
import { getKgIndustries } from '@/db/queries/kg-industries';
import { getKgCompanies } from '@/db/queries/kg-companies';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'technologies') {
    const data = await getKgTechnologies({ limit: 100 });
    return NextResponse.json(data);
  }

  if (type === 'industries') {
    const data = await getKgIndustries();
    return NextResponse.json(data);
  }

  if (type === 'companies') {
    const data = await getKgCompanies({ limit: 100 });
    return NextResponse.json(data);
  }

  // Return all
  const [technologies, industries, companies] = await Promise.all([
    getKgTechnologies({ limit: 100 }),
    getKgIndustries(),
    getKgCompanies({ limit: 100 }),
  ]);

  return NextResponse.json({ technologies, industries, companies });
}
