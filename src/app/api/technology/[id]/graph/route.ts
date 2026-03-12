import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { TECHNOLOGY_CATALOG } from '@/lib/data/technology-catalog';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';
import { getKnowledgeNode } from '@/lib/data/technology-knowledge-graph';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `technology-graph:${ip}`, maxRequests: 60, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const tech = TECHNOLOGY_CATALOG.find((t) => t.id === id);
  if (!tech) {
    return NextResponse.json({ ok: false, message: `Technology '${id}' not found.` }, { status: 404 });
  }

  const knowledgeNode = getKnowledgeNode(id);
  if (!knowledgeNode) {
    return NextResponse.json({ ok: false, message: `No knowledge graph for '${id}'.` }, { status: 404 });
  }

  const techCategoryLower = tech.category.toLowerCase();
  const keywordsLower = tech.procurementSignalKeywords.map((k) => k.toLowerCase());

  const localVendors = Object.values(EL_PASO_VENDORS)
    .filter((vendor) => {
      const vc = vendor.category.toLowerCase();
      if (vc.includes(techCategoryLower) || techCategoryLower.includes(vc)) return true;
      return vendor.tags.map(t => t.toLowerCase()).some(
        tag => keywordsLower.some(kw => kw.includes(tag) || tag.includes(techCategoryLower))
      );
    })
    .slice(0, 8)
    .map((v) => ({ name: v.name, vendorId: v.id, category: v.category, ikerScore: v.ikerScore }));

  return NextResponse.json({
    ok: true,
    techId: id,
    techName: tech.name,
    techCategory: tech.category,
    graph: knowledgeNode,
    localVendors,
    _meta: {
      totalNodes: knowledgeNode.discoveredBy.length + knowledgeNode.studiedBy.length + knowledgeNode.builtBy.length + knowledgeNode.usedBy.length + 1,
      generatedAt: new Date().toISOString(),
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
