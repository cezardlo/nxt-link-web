'use client';

// Account settings: see who you are, change password, change email, sign out.
// Works for every role; links back to the right dashboard.

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';

export default function AccountPage() {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('client');
  const [verified, setVerified] = useState(false);

  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  const [newEmail, setNewEmail] = useState('');
  const [emBusy, setEmBusy] = useState(false);
  const [emMsg, setEmMsg] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((me) => {
      if (me?.signed_in) {
        setSignedIn(true);
        setEmail(me.email || '');
        setRole(me.role || 'client');
        setVerified(Boolean(me.email_verified));
      }
      setChecking(false);
    }).catch(() => setChecking(false));
  }, []);

  const dashboard = role === 'admin' || role === 'super_admin' ? '/admin' : role === 'vendor' ? '/vendor/listings' : '/buyer';

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw1.length < 8) { setPwMsg('Password must be at least 8 characters.'); return; }
    if (pw1 !== pw2) { setPwMsg('Passwords do not match.'); return; }
    setPwBusy(true); setPwMsg('');
    try {
      const sb = createBrowserSupabaseClient();
      const { error } = await sb.auth.updateUser({ password: pw1 });
      setPwMsg(error ? error.message : 'Password updated.');
      if (!error) { setPw1(''); setPw2(''); }
    } catch { setPwMsg('Could not update the password.'); }
    setPwBusy(false);
  }

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setEmBusy(true); setEmMsg('');
    try {
      const sb = createBrowserSupabaseClient();
      const { error } = await sb.auth.updateUser(
        { email: newEmail.trim() },
        { emailRedirectTo: `${window.location.origin}/auth/callback?next=/account` },
      );
      setEmMsg(error ? error.message : `Confirmation sent to ${newEmail.trim()} — the change applies once you click the link.`);
      if (!error) setNewEmail('');
    } catch { setEmMsg('Could not start the email change.'); }
    setEmBusy(false);
  }

  async function signOut() {
    const sb = createBrowserSupabaseClient();
    await sb.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <div className="ac">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="ac-nav">
        <a className="ac-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b><span>Account</span></a>
        {signedIn && <a className="ac-link" href={dashboard}>My dashboard</a>}
      </nav>

      <main className="ac-wrap">
        {checking ? (
          <div className="ac-empty">Loading…</div>
        ) : !signedIn ? (
          <div className="ac-empty">Sign in to manage your account — <a href="/login">go to sign in</a></div>
        ) : (
          <>
            <h1>Account settings</h1>

            <section className="ac-card">
              <div className="ac-lbl">Who you are</div>
              <div className="ac-row"><span>Email</span><b>{email}</b>{verified ? <em className="ok">verified</em> : <em className="warn">not verified</em>}</div>
              <div className="ac-row"><span>Account type</span><b className="ac-role">{role === 'client' ? 'Buyer' : role}</b></div>
            </section>

            <section className="ac-card">
              <div className="ac-lbl">Change password</div>
              <form onSubmit={changePassword}>
                <input type="password" placeholder="New password (8+ characters)" value={pw1} onChange={(e) => setPw1(e.target.value)} minLength={8} required autoComplete="new-password" />
                <input type="password" placeholder="Repeat new password" value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={8} required autoComplete="new-password" />
                {pwMsg && <div className={pwMsg === 'Password updated.' ? 'ac-ok' : 'ac-err'}>{pwMsg}</div>}
                <button className="ac-btn" type="submit" disabled={pwBusy}>{pwBusy ? 'Saving…' : 'Update password'}</button>
              </form>
            </section>

            <section className="ac-card">
              <div className="ac-lbl">Change email</div>
              <p className="ac-hint">We&apos;ll send a confirmation link to the new address; the change applies when you click it.</p>
              <form onSubmit={changeEmail}>
                <input type="email" placeholder="New email address" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required autoComplete="email" />
                {emMsg && <div className={/Could not|error|invalid/i.test(emMsg) ? 'ac-err' : 'ac-ok'}>{emMsg}</div>}
                <button className="ac-btn" type="submit" disabled={emBusy}>{emBusy ? 'Sending…' : 'Change email'}</button>
              </form>
            </section>

            <section className="ac-card">
              <div className="ac-lbl">Session</div>
              <button className="ac-out" onClick={signOut}>Sign out</button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
.ac{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.ac *{box-sizing:border-box;}
.ac-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(10,10,15,.85);backdrop-filter:blur(20px);z-index:20;}
.ac-brand{display:flex;align-items:baseline;gap:10px;color:#F0F0F5;text-decoration:none;}
.ac-brand b{font-size:17px;}.ac-brand i{color:#A78BFA;font-style:normal;}
.ac-brand span{color:#8080A0;font-size:13px;}
.ac-link{color:#A78BFA;font-size:13.5px;font-weight:600;text-decoration:none;}
.ac-wrap{max-width:560px;margin:0 auto;padding:36px 20px 100px;}
.ac-wrap h1{font-size:26px;font-weight:800;letter-spacing:-.02em;margin-bottom:22px;}
.ac-empty{text-align:center;color:#8080A0;padding:70px 0;}
.ac-empty a{color:#A78BFA;}
.ac-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:22px;margin-bottom:16px;}
.ac-lbl{font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#A78BFA;margin-bottom:14px;}
.ac-row{display:flex;align-items:center;gap:12px;font-size:14px;margin-bottom:10px;flex-wrap:wrap;}
.ac-row span{color:#8080A0;min-width:110px;font-size:13px;}
.ac-role{text-transform:capitalize;}
.ac-row em{font-style:normal;font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;}
.ac-row em.ok{background:rgba(52,211,153,.12);color:#34D399;}
.ac-row em.warn{background:rgba(251,191,36,.12);color:#FBBF24;}
.ac-hint{color:#8080A0;font-size:13px;line-height:1.5;margin:0 0 12px;}
.ac-card form{display:flex;flex-direction:column;gap:10px;}
.ac-card input{font-family:inherit;font-size:14.5px;padding:12px 14px;border-radius:11px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;color:#F0F0F5;outline:none;}
.ac-card input:focus{border-color:#7C5CFC;}
.ac-btn{font-family:inherit;font-size:14px;font-weight:700;padding:12px;border-radius:11px;border:none;background:#7C5CFC;color:#fff;cursor:pointer;align-self:flex-start;padding-left:20px;padding-right:20px;}
.ac-btn:hover{background:#6344DF;}.ac-btn:disabled{opacity:.6;}
.ac-ok{color:#34D399;font-size:13px;}
.ac-err{color:#FCA5A5;font-size:13px;}
.ac-out{font-family:inherit;font-size:14px;font-weight:600;padding:11px 18px;border-radius:10px;border:1px solid rgba(252,165,165,.4);background:rgba(252,165,165,.08);color:#FCA5A5;cursor:pointer;}
.ac-out:hover{background:rgba(252,165,165,.15);}
`;
