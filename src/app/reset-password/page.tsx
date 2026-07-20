'use client';

// Reset password: the email link (via /auth/callback) leaves the user with a
// recovery session; here they choose the new password.

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';

export default function ResetPasswordPage() {
  const [ready, setReady] = useState<'checking' | 'ok' | 'no-session'>('checking');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const sb = createBrowserSupabaseClient();
    sb.auth.getSession().then(({ data }) => setReady(data.session ? 'ok' : 'no-session'));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw1.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    if (pw1 !== pw2) { setErr('Passwords do not match.'); return; }
    setBusy(true); setErr('');
    try {
      const sb = createBrowserSupabaseClient();
      const { error } = await sb.auth.updateUser({ password: pw1 });
      if (error) setErr(error.message);
      else setDone(true);
    } catch {
      setErr('Could not update the password. Try again.');
    }
    setBusy(false);
  }

  return (
    <div className="rp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <a className="rp-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b></a>
      <div className="rp-card">
        {ready === 'checking' ? (
          <p className="rp-sub">Checking your reset link…</p>
        ) : ready === 'no-session' ? (
          <>
            <h1>Link expired</h1>
            <p className="rp-sub">This reset link is invalid or has expired. Request a new one and try again.</p>
            <a className="rp-link" href="/forgot-password">Request a new reset link</a>
          </>
        ) : done ? (
          <>
            <h1>Password updated</h1>
            <p className="rp-sub">Your new password is saved. You&apos;re signed in — head back to your dashboard.</p>
            <a className="rp-btn" href="/login">Continue</a>
          </>
        ) : (
          <>
            <h1>Choose a new password</h1>
            <form onSubmit={submit}>
              <input type="password" placeholder="New password (8+ characters)" value={pw1} onChange={(e) => setPw1(e.target.value)} required minLength={8} autoComplete="new-password" />
              <input type="password" placeholder="Repeat new password" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={8} autoComplete="new-password" />
              {err && <div className="rp-err">{err}</div>}
              <button className="rp-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
.rp{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;padding:40px 20px;-webkit-font-smoothing:antialiased;}
.rp *{box-sizing:border-box;}
.rp-brand{color:#F0F0F5;text-decoration:none;margin-bottom:26px;}
.rp-brand b{font-size:19px;}.rp-brand i{color:#A78BFA;font-style:normal;}
.rp-card{width:100%;max-width:400px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:20px;padding:30px;}
.rp-card h1{font-size:22px;font-weight:800;letter-spacing:-.02em;margin-bottom:12px;}
.rp-sub{color:#9A97AF;font-size:14px;line-height:1.6;margin-bottom:16px;}
.rp-card form{display:flex;flex-direction:column;gap:11px;}
.rp-card input{font-family:inherit;font-size:14.5px;padding:12px 14px;border-radius:11px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;color:#F0F0F5;outline:none;}
.rp-card input:focus{border-color:#7C5CFC;}
.rp-btn{display:inline-block;text-align:center;text-decoration:none;font-family:inherit;font-size:15px;font-weight:700;padding:13px;border-radius:11px;border:none;background:#7C5CFC;color:#fff;cursor:pointer;}
.rp-btn:hover{background:#6344DF;}.rp-btn:disabled{opacity:.6;}
.rp-err{color:#FCA5A5;font-size:13px;}
.rp-link{display:block;margin-top:6px;color:#A78BFA;font-size:13.5px;text-decoration:none;}
`;
