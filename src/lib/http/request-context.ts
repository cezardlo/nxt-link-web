function fallbackRequestId(): string {
  const random = Math.random().toString(36).slice(2);
  return `req_${Date.now()}_${random}`;
}

export function getRequestId(headers: Headers): string {
  return headers.get('x-request-id') || globalThis.crypto?.randomUUID?.() || fallbackRequestId();
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }

  return headers.get('x-real-ip') || 'unknown';
}
