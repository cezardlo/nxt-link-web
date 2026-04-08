export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { requireCronSecret } from '@/lib/http/cron-auth';
import {
  loadUnifiedBrainReport,
  persistUnifiedBrainReport,
} from '@/lib/intelligence/brain-orchestrator';

export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const auth = requireCronSecret(request.headers);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 150), 1), 500);
  const includeObsidian = url.searchParams.get('includeObsidian') !== 'false';

  const report = await loadUnifiedBrainReport({
    signalLimit: limit,
    includeObsidian,
  });
  const persisted = await persistUnifiedBrainReport(report);

  return NextResponse.json({
    ok: true,
    mode: 'cron-sync',
    persisted,
    scannedSignals: report.scannedSignals,
    notesScanned: report.notesScanned,
    warnings: report.warnings,
  });
}
