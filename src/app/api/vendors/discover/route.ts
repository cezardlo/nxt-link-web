import { NextResponse } from 'next/server';

import { getClientIp, getRequestId } from '@/lib/http/request-context';
import { checkRateLimit } from '@/lib/http/rate-limit';
import { logger } from '@/lib/observability/logger';
import { discoverVendorFromUrl } from '@/lib/vendor-discovery';

type RequestBody = {
  url?: string;
};

export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);
  const clientIp = getClientIp(request.headers);
  const rateLimit = checkRateLimit({
    key: `vendors-discover:${clientIp}`,
    maxRequests: 10,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      {
        status: 429,
        headers: {
          'x-request-id': requestId,
          'retry-after': String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      },
    );
  }

  logger.info({ event: 'vendors_discover_started', requestId, clientIp });

  try {
    const body = (await request.json()) as RequestBody;
    const url = body.url?.trim();

    if (!url) {
      return NextResponse.json(
        { ok: false, message: 'URL is required.' },
        {
          status: 400,
          headers: { 'x-request-id': requestId },
        },
      );
    }

    const result = await discoverVendorFromUrl(url);

    logger.info({
      event: 'vendors_discover_completed',
      requestId,
      companyName: result.vendor.company_name,
      inserted: result.inserted,
    });

    return NextResponse.json({
      ok: true,
      inserted: result.inserted,
      vendor: result.vendor,
    }, {
      headers: { 'x-request-id': requestId },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected discovery error.';
    const status = message.toLowerCase().includes('url') ? 400 : 500;

    logger.error({
      event: 'vendors_discover_failed',
      requestId,
      error: message,
      status,
    });

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      {
        status,
        headers: { 'x-request-id': requestId },
      },
    );
  }
}
