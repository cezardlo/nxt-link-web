'use client';

// /admin/invites — the 3-field vendor invite capture (operator-only, under the
// admin AccessGate via the /admin layout). Type company + contact + email,
// pick the language, hit Send — the vendor gets a bilingual invite email with
// their personal /join/<token> link. Below: the live funnel list (one row per
// invite, status chip, resend / decline / copy-link) and a counts strip.
// Reminders (day 2 / 5 / 9) are automated by /api/cron/invite-reminders.

import { useCallback, useEffect, useMemo, useState } from 'react';

interface Invite {
  id: string; token: string; contact_name: string; company_name: string;
  email: string | null; locale: string; status: string;
  sent_at: string | null; reminded_2_at: string | null; reminded_5_at: string | null;
  reminded_9_at: string | null; clicked_at: string | null; account_created_at: string | null;
  profile_complete_at: string | null; listed_at: string | null;
  expires_at: string; created_at: string; join_url: string;
}

const fmtDate = (s: string | null) => { if (!s) return ''; try { return new Date(s).toLocaleDateString(); } catch { return ''; } };

const LABEL: Record<string, string> = {
  invited: 'Invited', reminded: 'Reminded', clicked: 'Clicked',
  account_created: 'Account', profile_complete: 'Profile done', listed: 'Listed',
  expired: 'Expired', opted_out: 'Unsubscribed', declined: 'Declined', already_vendor: 'Already vendor',
};
const RESENDABLE = ['invited', 'reminded', 'clicked', 'expired'];
const DECLINABLE = ['invited', 'reminded', 'clicked', 'expired'];

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState('');
  const [flashKind, setFlashKind] = useState<'ok' | 'err'>('ok');
  const [company, setCompany] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [locale, setLocale] = useState<'en' | 'es'>('en');
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState('');

  const say = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    setFlash(msg); setFlashKind(kind);
    setTimeout(() => setFlash(''), 6000);
  }, []);

  const load = useCallback(async () => {
    try { const r = await fetch('/api/admin/invites'); const j = await r.json(); if (j.ok) setInvites(j.invites); } catch { /* */ }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      const r = await fetch('/api/admin/invites', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: company, contact_name: contact, email, locale }),
      });
      const j = await r.json().catch(() => ({}));
      if (j.ok && j.already_vendor) say(j.message, 'err');
      else if (j.ok) { say(`✓ Invite sent to ${email}`); setCompany(''); setContact(''); setEmail(''); }
      else say(j.message || 'Could not send the invite.', 'err');
      load();
    } catch { say('Could not send the invite. Try again.', 'err'); }
    setSending(false);
  }

  async function resend(id: string) {
    setBusyId(id);
    try {
      const r = await fetch('/api/admin/invites/resend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const j = await r.json().catch(() => ({}));
      if (j.ok) say(j.reinvited ? '✓ Re-invited with a fresh link (new 30-day window)' : '✓ Invite email re-sent');
      else say(j.message || 'Could not resend.', 'err');
      load();
    } catch { say('Could not resend. Try again.', 'err'); }
    setBusyId('');
  }

  async function decline(id: string) {
    setBusyId(id);
    try {
      const r = await fetch('/api/admin/invites', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'decline' }) });
      const j = await r.json().catch(() => ({}));
      if (j.ok) say('Marked declined — no more emails to them.');
      else say(j.message || 'Could not update.', 'err');
      load();
    } catch { say('Could not update. Try again.', 'err'); }
    setBusyId('');
  }

  async function copyLink(inv: Invite) {
    try { await navigator.clipboard.writeText(inv.join_url); say('✓ Invite link copied — paste it into WhatsApp or a text'); }
    catch { say(inv.join_url); }
  }

  const funnel = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of invites) c[i.status] = (c[i.status] || 0) + 1;
    const invited = invites.filter((i) => !['already_vendor'].includes(i.status)).length;
    const clicked = (c.clicked || 0) + (c.account_created || 0) + (c.profile_complete || 0) + (c.listed || 0);
    const account = (c.account_created || 0) + (c.profile_complete || 0) + (c.listed || 0);
    const complete = (c.profile_complete || 0) + (c.listed || 0);
    return { invited, clicked, account, complete, listed: c.listed || 0, out: (c.opted_out || 0) + (c.declined || 0) + (c.expired || 0) };
  }, [invites]);

  return (
    <div className="iv">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="iv-wrap">
        <h1>Vendor invites</h1>
        <p style={{ margin: '6px 0 0' }}><a href="/admin/vendor-applications" style={{ color: '#A78BFA', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Full vendor applications (/apply) →</a></p>
        <p className="iv-sub">Met a vendor you vouch for? Three fields and they get a personal invite link — their account takes them under a minute, and reminders (day 2, 5, 9) run automatically. Inviting them <b>is</b> the review: they skip the application queue.</p>

        <form className="iv-form" onSubmit={send}>
          <input placeholder="Company name" value={company} onChange={(e) => setCompany(e.target.value)} required />
          <input placeholder="Contact name" value={contact} onChange={(e) => setContact(e.target.value)} required />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div className="iv-langrow">
            <div className="iv-lang">
              <button type="button" className={locale === 'en' ? 'on' : ''} onClick={() => setLocale('en')}>EN</button>
              <button type="button" className={locale === 'es' ? 'on' : ''} onClick={() => setLocale('es')}>ES</button>
            </div>
            <button className="iv-send" type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send invite'}</button>
          </div>
        </form>
        {flash && <div className={`iv-flash ${flashKind}`}>{flash}</div>}

        <div className="iv-counts">
          {[['Invited', funnel.invited], ['Clicked', funnel.clicked], ['Account', funnel.account], ['Profile done', funnel.complete], ['Listed', funnel.listed], ['Out', funnel.out]].map(([l, n]) => (
            <div key={l as string} className="iv-count"><b>{n as number}</b><span>{l as string}</span></div>
          ))}
        </div>

        {loading ? <div className="iv-empty">Loading…</div> : invites.length === 0 ? <div className="iv-empty">No invites yet. Send the first one above.</div> : (
          <div className="iv-list">
            {invites.map((i) => (
              <div key={i.id} className="iv-card">
                <div className="iv-main">
                  <div className="iv-top">
                    <b>{i.company_name}</b>
                    <span className={`iv-badge s-${i.status}`}>{LABEL[i.status] || i.status}</span>
                    <span className="iv-loc">{i.locale.toUpperCase()}</span>
                  </div>
                  <div className="iv-contact">
                    <span>{i.contact_name}</span>
                    {i.email && <a href={`mailto:${i.email}`}>{i.email}</a>}
                    <span className="iv-date">
                      {i.listed_at ? `Listed ${fmtDate(i.listed_at)}`
                        : i.profile_complete_at ? `Profile done ${fmtDate(i.profile_complete_at)}`
                        : i.account_created_at ? `Account ${fmtDate(i.account_created_at)}`
                        : i.clicked_at ? `Clicked ${fmtDate(i.clicked_at)}`
                        : i.sent_at ? `Invited ${fmtDate(i.sent_at)}` : fmtDate(i.created_at)}
                    </span>
                  </div>
                </div>
                <div className="iv-actions">
                  {RESENDABLE.includes(i.status) && <button className="iv-adv" disabled={busyId === i.id} onClick={() => resend(i.id)}>{i.status === 'expired' ? 'Re-invite' : 'Resend'}</button>}
                  {RESENDABLE.includes(i.status) && <button className="iv-ghost" onClick={() => copyLink(i)}>Copy link</button>}
                  {DECLINABLE.includes(i.status) && <button className="iv-decline" disabled={busyId === i.id} onClick={() => decline(i.id)}>Decline</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
.iv{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.iv *{box-sizing:border-box;}
.iv-wrap{max-width:900px;margin:0 auto;padding:34px 20px 90px;}
.iv-wrap h1{font-size:26px;font-weight:800;letter-spacing:-.02em;margin:0;}
.iv-sub{color:#8080A0;font-size:14px;margin:8px 0 20px;line-height:1.55;}
.iv-form{display:grid;grid-template-columns:1fr 1fr;gap:10px;background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px;}
.iv-form input{font-family:inherit;font-size:14.5px;padding:12px 14px;border-radius:11px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;color:#F0F0F5;outline:none;min-height:48px;}
.iv-form input:focus{border-color:#7C5CFC;}
.iv-form input[type=email]{grid-column:1/-1;}
.iv-langrow{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;gap:12px;}
.iv-lang{display:flex;border:1px solid rgba(255,255,255,.12);border-radius:10px;overflow:hidden;}
.iv-lang button{font-family:inherit;font-size:12.5px;font-weight:700;padding:9px 16px;border:none;background:none;color:#8080A0;cursor:pointer;}
.iv-lang button.on{background:rgba(124,92,252,.18);color:#C4B5FD;}
.iv-send{font-family:inherit;font-size:14.5px;font-weight:700;padding:12px 22px;border-radius:11px;border:none;background:#7C5CFC;color:#fff;cursor:pointer;min-height:48px;}
.iv-send:hover{background:#6344DF;}.iv-send:disabled{opacity:.6;}
.iv-flash{font-size:13px;padding:10px 14px;border-radius:10px;margin-top:12px;}
.iv-flash.ok{background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.3);color:#34D399;}
.iv-flash.err{background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);color:#FCD34D;}
.iv-counts{display:flex;gap:9px;flex-wrap:wrap;margin:18px 0;}
.iv-count{flex:1;min-width:86px;background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:11px 8px;text-align:center;}
.iv-count b{display:block;font-size:19px;font-weight:800;}
.iv-count span{font-size:11px;color:#8080A0;}
.iv-empty{color:#8080A0;font-size:14px;padding:34px 0;text-align:center;}
.iv-list{display:flex;flex-direction:column;gap:11px;}
.iv-card{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px 18px;}
.iv-main{min-width:0;flex:1;}
.iv-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.iv-top b{font-size:15.5px;font-weight:700;}
.iv-badge{font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;background:rgba(255,255,255,.06);color:#C0C0D0;}
.iv-badge.s-invited{background:rgba(251,191,36,.14);color:#FBBF24;}
.iv-badge.s-reminded{background:rgba(96,165,250,.14);color:#60A5FA;}
.iv-badge.s-clicked{background:rgba(124,92,252,.14);color:#C4B5FD;}
.iv-badge.s-account_created{background:rgba(52,211,153,.14);color:#34D399;}
.iv-badge.s-profile_complete{background:rgba(52,211,153,.18);color:#6EE7B7;}
.iv-badge.s-listed{background:rgba(52,211,153,.25);color:#A7F3D0;}
.iv-badge.s-expired{background:rgba(255,255,255,.06);color:#8080A0;}
.iv-badge.s-opted_out{background:rgba(248,113,113,.12);color:#FCA5A5;}
.iv-badge.s-declined{background:rgba(248,113,113,.1);color:#F0A0A0;}
.iv-badge.s-already_vendor{background:rgba(96,165,250,.1);color:#93C5FD;}
.iv-loc{font-size:10.5px;font-weight:700;color:#5A5A70;border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:1px 6px;}
.iv-contact{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:8px;font-size:13px;color:#8080A0;}
.iv-contact a{color:#A78BFA;text-decoration:none;}
.iv-contact a:hover{text-decoration:underline;}
.iv-date{margin-left:auto;color:#5A5A70;}
.iv-actions{display:flex;flex-direction:column;gap:8px;flex-shrink:0;}
.iv-adv{font-family:inherit;font-size:12.5px;font-weight:700;padding:9px 14px;border-radius:9px;border:none;background:#7C5CFC;color:#fff;cursor:pointer;white-space:nowrap;}
.iv-adv:hover{background:#6344DF;}.iv-adv:disabled{opacity:.6;}
.iv-ghost{font-family:inherit;font-size:12px;font-weight:600;padding:7px 14px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:none;color:#C0C0D0;cursor:pointer;white-space:nowrap;}
.iv-ghost:hover{border-color:#7C5CFC;color:#C4B5FD;}
.iv-decline{font-family:inherit;font-size:12px;font-weight:600;padding:7px 14px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:none;color:#8080A0;cursor:pointer;}
.iv-decline:hover{color:#FCA5A5;border-color:rgba(248,113,113,.3);}
@media (max-width:640px){.iv-form{grid-template-columns:1fr;}.iv-card{flex-direction:column;}.iv-actions{flex-direction:row;flex-wrap:wrap;}}
`;
