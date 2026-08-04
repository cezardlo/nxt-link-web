// Unified transactional email sender. Resend first (RESEND_API_KEY), falling
// back to the legacy Zoho outbox when Resend is unavailable. Best-effort by
// design: callers fire-and-forget; a failed email never breaks the action.
//
// BRAND + SENDER (2026-08-04 Batch B): every email we send is NXT//LINK-branded
// (htmlWrap below, on BOTH providers) and the from-address comes from config,
// never hardcoded:
//   - Resend: MAIL_FROM (e.g. "NXT//LINK <contact@nxtlinktech.com>" — the env
//     var + domain verification with the provider is the coordinator's job).
//     Until the domain is verified we degrade to Resend's sandbox sender
//     (onboarding@resend.dev) so owner-inbox delivery still works.
//   - Zoho fallback: ZOHO_FROM_ADDRESS (the connected mailbox's own address).

import { sendZohoMail } from '@/lib/zoho/mail';

const RESEND_URL = 'https://api.resend.com/emails';

function htmlWrap(subject: string, body: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paragraphs = esc(body).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;line-height:1.6;">${p.replace(/\n/g, '<br/>')}</p>`).join('');
  return `<!doctype html><html><body style="margin:0;padding:0;background:#0B0B12;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;font-family:Arial,Helvetica,sans-serif;color:#EDECF5;">
    <div style="font-size:15px;font-weight:bold;letter-spacing:2px;color:#A78BFA;margin-bottom:22px;">NXT<span style="color:#7C5CFC;">//</span>LINK</div>
    <div style="background:#14141F;border:1px solid #26263A;border-radius:14px;padding:24px;font-size:14px;color:#D5D4E0;">
      <div style="font-size:16px;font-weight:bold;color:#F0F0F5;margin-bottom:14px;">${esc(subject)}</div>
      ${paragraphs}
    </div>
    <p style="color:#63607A;font-size:11px;margin-top:18px;line-height:1.6;">Quotes, demos, pilots, and purchases run through NXT//LINK. This is an automated message.</p>
  </div></body></html>`;
}

// Domain-only, for safe-to-log context — never log a full recipient address.
function domainOf(email: string): string {
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1) : '(no-domain)';
}

export async function sendMail(opts: { to: string; subject: string; body: string }): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  let resendError = '';
  if (key) {
    try {
      const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.MAIL_FROM || 'NXT//LINK <onboarding@resend.dev>',
          to: [opts.to],
          subject: opts.subject,
          text: opts.body,
          html: htmlWrap(opts.subject, opts.body),
        }),
      });
      if (res.ok) return;
      // Domain not verified yet (or similar): retry once from the Resend
      // sandbox sender so at least owner-inbox delivery works during setup.
      const err = await res.text();
      resendError = `HTTP ${res.status}`;
      if (/domain|from/i.test(err)) {
        const retry = await fetch(RESEND_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: 'NXT//LINK <onboarding@resend.dev>', to: [opts.to], subject: opts.subject, text: opts.body, html: htmlWrap(opts.subject, opts.body) }),
        });
        if (retry.ok) return;
        resendError = `HTTP ${retry.status} (sandbox retry)`;
      }
    } catch (e) {
      resendError = e instanceof Error ? e.message : 'fetch failed';
    }
  } else {
    resendError = 'RESEND_API_KEY not configured';
  }

  // sendZohoMail never rejects — it resolves { ok, sent, error } even on
  // failure (a bare .catch(() => {}) here would never fire). Read the result
  // instead, and treat "not actually sent" (real Zoho error OR Zoho simply
  // not configured) as the both-providers-failed case the no-silent-errors
  // policy requires we log. The Zoho path gets the SAME branded htmlWrap the
  // Resend path used — Zoho sends mailFormat 'html', so an unwrapped plain
  // body would arrive unbranded (and with collapsed line breaks).
  const result = await sendZohoMail({ to: opts.to, subject: opts.subject, body: htmlWrap(opts.subject, opts.body) }).catch((e) => ({
    ok: false, sent: false, provider: 'zoho' as const, error: e instanceof Error ? e.message : 'send failed',
  }));
  if (!result.sent) {
    // Fire-and-forget contract is unchanged — callers never see this and the
    // request never fails because of it. Domain only (no full address/body)
    // to avoid logging PII.
    console.error(
      `[mail] delivery failed for both providers — to_domain=${domainOf(opts.to)} subject="${opts.subject.slice(0, 80)}" resend="${resendError}" zoho="${result.error || (result.provider === 'fallback' ? 'not configured' : 'failed')}"`,
    );
  }
}
