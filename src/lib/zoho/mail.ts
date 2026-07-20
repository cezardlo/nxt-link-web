// Zoho Mail — send an email through the connected mailbox.
// Falls back to a "drafted, not sent" result when Zoho is not configured, so
// the UI flow always completes and a human can send manually.

import { getZohoConfig, isZohoMailConfigured, zohoFetch } from './client';

export interface SendMailInput {
  to: string;
  subject: string;
  /** plain text or HTML body */
  body: string;
  cc?: string;
  bcc?: string;
}

export interface SendMailResult {
  ok: boolean;
  sent: boolean;
  provider: 'zoho' | 'fallback';
  zohoId?: string;
  error?: string;
}

export async function sendZohoMail(input: SendMailInput): Promise<SendMailResult> {
  if (!isZohoMailConfigured()) {
    // Degrade gracefully: report a draft so the caller can store + show it.
    return { ok: true, sent: false, provider: 'fallback' };
  }
  const c = getZohoConfig();
  try {
    const res = await zohoFetch(`/mail/v1/accounts/${c.mailAccountId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        fromAddress: c.fromAddress,
        toAddress: input.to,
        ccAddress: input.cc,
        bccAddress: input.bcc,
        subject: input.subject,
        content: input.body,
        mailFormat: 'html',
      }),
    });
    if (!res) return { ok: true, sent: false, provider: 'fallback' };
    const data = (await res.json().catch(() => ({}))) as {
      data?: { messageId?: string };
      status?: { code?: number };
    };
    if (!res.ok) {
      return { ok: false, sent: false, provider: 'zoho', error: `Zoho Mail HTTP ${res.status}` };
    }
    return { ok: true, sent: true, provider: 'zoho', zohoId: data?.data?.messageId };
  } catch (e) {
    return { ok: false, sent: false, provider: 'zoho', error: e instanceof Error ? e.message : 'send failed' };
  }
}
