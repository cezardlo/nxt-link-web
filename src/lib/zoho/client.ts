// Zoho OAuth + config. Reads credentials from env. Exchanges a long-lived
// refresh token for a short-lived access token (cached in-process). When Zoho
// is not configured, callers degrade gracefully (no throw) — mirroring the
// rest of the platform's "still works without external services" pattern.

export interface ZohoConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accountsDomain: string; // https://accounts.zoho.com (or .eu/.in/.com.au)
  apiDomain: string;      // https://www.zohoapis.com
  mailAccountId: string;  // Zoho Mail accountId
  fromAddress: string;    // mailbox we send from
  meetingZsoid: string;   // Zoho Meeting org id (for Meeting API)
}

export function getZohoConfig(): ZohoConfig {
  return {
    clientId: process.env.ZOHO_CLIENT_ID || '',
    clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
    refreshToken: process.env.ZOHO_REFRESH_TOKEN || '',
    accountsDomain: process.env.ZOHO_ACCOUNTS_DOMAIN || 'https://accounts.zoho.com',
    apiDomain: process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com',
    mailAccountId: process.env.ZOHO_MAIL_ACCOUNT_ID || '',
    fromAddress: process.env.ZOHO_FROM_ADDRESS || '',
    meetingZsoid: process.env.ZOHO_MEETING_ZSOID || '',
  };
}

/** True when we have enough to mint an access token. */
export function isZohoConfigured(): boolean {
  const c = getZohoConfig();
  return Boolean(c.clientId && c.clientSecret && c.refreshToken);
}

/** True when we can also send mail (needs the mailbox + accountId). */
export function isZohoMailConfigured(): boolean {
  const c = getZohoConfig();
  return isZohoConfigured() && Boolean(c.mailAccountId && c.fromAddress);
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/** Get a valid access token, refreshing if needed. Returns null if unconfigured/failed. */
export async function getZohoAccessToken(): Promise<string | null> {
  if (!isZohoConfigured()) return null;
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) return cachedToken.token;

  const c = getZohoConfig();
  const params = new URLSearchParams({
    refresh_token: c.refreshToken,
    client_id: c.clientId,
    client_secret: c.clientSecret,
    grant_type: 'refresh_token',
  });
  try {
    const res = await fetch(`${c.accountsDomain}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
    if (!res.ok || !data.access_token) return null;
    cachedToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in ? data.expires_in * 1000 : 3_600_000),
    };
    return cachedToken.token;
  } catch {
    return null;
  }
}

/** Authorized fetch against the Zoho API domain. Returns null token-side if unconfigured. */
export async function zohoFetch(path: string, init?: RequestInit): Promise<Response | null> {
  const token = await getZohoAccessToken();
  if (!token) return null;
  const c = getZohoConfig();
  const url = path.startsWith('http') ? path : `${c.apiDomain}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
}
