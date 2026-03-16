import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// NXT LINK Intelligence Agent — lightweight tool-based handler
// Wraps key platform engines as callable tools via JSON POST

type Tool = 'searchIntelligence' | 'getIndustryProfile' | 'getOpportunities' | 'getWhatChanged';

interface IntelRequest {
  tool: Tool;
  params?: Record<string, unknown>;
}

const baseUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

async function callTool(tool: Tool, params: Record<string, unknown> = {}): Promise<unknown> {
  const base = baseUrl();
  switch (tool) {
    case 'searchIntelligence': {
      const res = await fetch(`${base}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: params.query ?? '', depth: params.depth ?? 'quick' }),
      });
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json();
      return {
        summary: data.expertBrief,
        topCompanies: (data.keyPlayers ?? []).slice(0, 5),
        innovations: data.innovationPipeline,
        marketSize: data.market?.size,
      };
    }
    case 'getIndustryProfile': {
      const res = await fetch(`${base}/api/industry/${params.slug}/profile`);
      if (!res.ok) throw new Error('Industry not found');
      return res.json();
    }
    case 'getOpportunities': {
      const res = await fetch(`${base}/api/opportunities`);
      if (!res.ok) throw new Error('Failed to fetch opportunities');
      const data = await res.json();
      return (data.opportunities ?? []).slice(0, (params.limit as number) ?? 10);
    }
    case 'getWhatChanged': {
      const res = await fetch(`${base}/api/what-changed`);
      if (!res.ok) throw new Error('Failed to fetch signals');
      return res.json();
    }
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as IntelRequest;
    const result = await callTool(body.tool, body.params ?? {});
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    agent: 'NXT LINK Intelligence Agent',
    tools: ['searchIntelligence', 'getIndustryProfile', 'getOpportunities', 'getWhatChanged'],
    usage: 'POST with { tool, params }',
  });
}
