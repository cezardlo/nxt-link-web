import { timingSafeEqual } from 'node:crypto';

type CronCheckReason =
  | 'ok'
  | 'missing_config'
  | 'missing_secret'
  | 'invalid_secret';

export type CronSecretCheck = {
  configured: boolean;
  valid: boolean;
  reason: CronCheckReason;
};

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; message: string };

function parseBearerSecret(headers: Headers): string | null {
  const authorization = headers.get('authorization');
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function secureEquals(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

export function checkCronSecret(
  headers: Headers,
  options?: { allowBearer?: boolean },
): CronSecretCheck {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return { configured: false, valid: false, reason: 'missing_config' };
  }

  const provided =
    headers.get('x-cron-secret') ??
    (options?.allowBearer === false ? null : parseBearerSecret(headers));

  if (!provided) {
    return { configured: true, valid: false, reason: 'missing_secret' };
  }

  if (!secureEquals(provided, expected)) {
    return { configured: true, valid: false, reason: 'invalid_secret' };
  }

  return { configured: true, valid: true, reason: 'ok' };
}

export function requireCronSecret(
  headers: Headers,
  options?: { allowBearer?: boolean },
): CronAuthResult {
  const check = checkCronSecret(headers, options);
  if (check.valid) return { ok: true };

  if (!check.configured) {
    return {
      ok: false,
      status: 503,
      message: 'Server misconfigured: CRON_SECRET is not set.',
    };
  }

  return { ok: false, status: 401, message: 'Unauthorized' };
}
