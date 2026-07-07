'use client';

// Sign in for every role (replaces the old intel command-center login).
// After login, routes by platform role: admin/operator -> /admin,
// vendor -> /vendor/listings, buyer -> /marketplace.

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';

function LoginInner() {
  const sp = useSearchParams();
  const confirmed = sp.get('confirmed') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [resent, setResent] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(''); setNeedsVerify(false);
    try {
      const sb = createBrowserSupabaseClient();
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        if (/confirm/i.test(error.message)) setNeedsVerify(true);
        else setErr(error.message);
        setBusy(false); return;
      }
      const me = await fetch('/api/auth/me').then((r) => r.json()).catch(() => null);
      const role = me?.role || 'client';
      window.location.href = role === 'admin' || role === 'super_admin' ? '/admin'
        : role === 'vendor' ? '/vendor/listings'
        : '/marketplace';
    } catch {
      setErr('Could not sign in. Try again.');
      setBusy(false);
    }
  }

  async function resend() {
    try {
      const sb = createBrowserSupabaseClient();
      await sb.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
      setResent(true);
    } catch { /* ignore */ }
  }

  return (
    <div className="li">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <a className="li-brand" href="/"><b>NXT<i>//</i>LINK</b></a>
      <div className="li-card">
        <h1>Sign in</h1>
        {confirmed && <div className="li-ok">Email confirmed — sign in below.</div>}
        <form onSubmit={submit}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          {err && <div className="li-err">{err}</div>}
          {needsVerify && (
            <div className="li-warn">
              Your email is not verified yet. Check your inbox for the confirmation link
              {resent ? ' — sent again.' : <> or <button type="button" onClick={resend}>resend it</button>.</>}
            </div>
          )}
          <button className="li-btn" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <a className="li-link" href="/signup">New here? Create an account</a>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginInner /></Suspense>;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
.li{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;padding:40px 20px;-webkit-font-smoothing:antialiased;}
.li *{box-sizing:border-box;}
.li-brand{color:#F0F0F5;text-decoration:none;margin-bottom:26px;}
.li-brand b{font-size:19px;}.li-brand i{color:#A78BFA;font-style:normal;}
.li-card{width:100%;max-width:400px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:20px;padding:30px;}
.li-card h1{font-size:23px;font-weight:800;letter-spacing:-.02em;margin-bottom:16px;}
.li-card form{display:flex;flex-direction:column;gap:11px;}
.li-card input{font-family:inherit;font-size:14.5px;padding:12px 14px;border-radius:11px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;color:#F0F0F5;outline:none;}
.li-card input:focus{border-color:#7C5CFC;}
.li-btn{font-family:inherit;font-size:15px;font-weight:700;padding:13px;border-radius:11px;border:none;background:#7C5CFC;color:#fff;cursor:pointer;}
.li-btn:hover{background:#6344DF;}.li-btn:disabled{opacity:.6;}
.li-err{color:#FCA5A5;font-size:13px;}
.li-ok{background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.3);color:#6EE7B7;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:12px;}
.li-warn{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.3);color:#FCD34D;border-radius:10px;padding:10px 12px;font-size:13px;line-height:1.5;}
.li-warn button{background:none;border:none;color:#FBBF24;text-decoration:underline;cursor:pointer;font:inherit;padding:0;}
.li-link{display:block;margin-top:14px;color:#A78BFA;font-size:13.5px;text-decoration:none;}
`;
