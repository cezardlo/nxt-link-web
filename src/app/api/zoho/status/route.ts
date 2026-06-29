// GET /api/zoho/status — is Zoho connected? (drives the "Connect Zoho" UI state)
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { isZohoConfigured, isZohoMailConfigured, getZohoConfig } from '@/lib/zoho/client';

export async function GET() {
  const c = getZohoConfig();
  return NextResponse.json({
    ok: true,
    configured: isZohoConfigured(),
    mail_ready: isZohoMailConfigured(),
    meeting_ready: isZohoConfigured() && Boolean(c.meetingZsoid),
    from_address: c.fromAddress || null,
  });
}
