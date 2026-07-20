'use client';

// Sign in for every role (replaces the old intel command-center login).
// After login, routes by platform role: admin/operator -> /admin,
// vendor -> /vendor/listings, buyer -> /buyer.

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
  const [demoBusy, setDemoBusy] = useState<'vendor' | 'buyer' | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [magicBusy, setMagicBusy] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [usePassword, setUsePassword] = useState(false);

  // One-click Google (requires the Google provider enabled in Supabase).
  async function google() {
    setOauthBusy(true); setErr('');
    try {
      const next = sp.get('next');
      const sb = createBrowserSupabaseClient();
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}` },
      });
      if (error) { setErr('Google sign-in isn’t enabled yet. Use email below.'); setOauthBusy(false); }
      // On success the browser redirects to Google; nothing else runs here.
    } catch { setErr('Google sign-in unavailable. Use email below.'); setOauthBusy(false); }
  }

  // Passwordless magic link — no password to create or remember.
  async function magicLink() {
    if (!email.trim()) { setErr('Enter your email first.'); return; }
    setMagicBusy(true); setErr('');
    try {
      const next = sp.get('next');
      const sb = createBrowserSupabaseClient();
      const { error } = await sb.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}` },
      });
      if (error) setErr(error.message);
      else setMagicSent(true);
    } catch { setErr('Could not send the link. Try again.'); }
    setMagicBusy(false);
  }

  async function demoLogin(role: 'vendor' | 'buyer') {
    if (demoBusy) return;
    setDemoBusy(role); setErr('');
    try {
      // Ensures the pre-confirmed demo account exists, then signs straight in.
      const res = await fetch('/api/demo/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) });
      const demo = await res.json();
      if (!demo.ok) { setErr(demo.message || 'Demo unavailable'); setDemoBusy(null); return; }
      const sb = createBrowserSupabaseClient();
      const { error } = await sb.auth.signInWithPassword({ email: demo.email, password: demo.password });
      if (error) { setErr(error.message); setDemoBusy(null); return; }
      await fetch('/api/auth/me');
      window.location.href = role === 'vendor' ? '/vendor/leads' : '/buyer';
    } catch {
      setErr('Demo sign-in failed. Try again.');
      setDemoBusy(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(''); setNeedsVerify(false);
    try {
      const sb = createBrowserSupabaseClient();
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        if (/confirm/i.test(error.message)) setNeedsVerify(true);
        else if (/invalid login credentials/i.test(error.message)) setErr('Wrong email or password. Check your password — or use "Forgot password?" below.');
        else setErr(error.message);
        setBusy(false); return;
      }
      const me = await fetch('/api/auth/me').then((r) => r.json()).catch(() => null);
      const role = me?.role || 'client';
      const next = sp.get('next');
      window.location.href = (next && next.startsWith('/') && !next.startsWith('//')) ? next
        : role === 'admin' || role === 'super_admin' ? '/admin'
        : role === 'vendor' ? '/vendor/leads'
        : '/buyer';
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
      <a className="li-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b></a>
      <div className="li-card">
        <h1>Sign in</h1>
        {confirmed && <div className="li-ok">Email confirmed — sign in below.</div>}

        {magicSent ? (
          <div className="li-ok" style={{ marginBottom: 0 }}>
            ✓ Check your email — we sent a secure sign-in link to <b>{email}</b>. Click it to sign in (no password needed). It expires in a few minutes.
          </div>
        ) : (
          <>
            {/* Fast, passwordless options first */}
            <button type="button" className="li-google" onClick={google} disabled={oauthBusy}>
              <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.2C29.3 35 26.8 36 24 36c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.3 5.2C41.1 36.5 44 30.8 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
              {oauthBusy ? 'Connecting…' : 'Continue with Google'}
            </button>
            <button type="button" className="li-magic" onClick={magicLink} disabled={magicBusy}>
              ✉️ {magicBusy ? 'Sending link…' : 'Email me a sign-in link'}
            </button>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" style={{ marginTop: 2 }} />
            {err && !usePassword && <div className="li-err">{err}</div>}
            <button type="button" className="li-usepw" onClick={() => setUsePassword((v) => !v)}>{usePassword ? 'Hide password sign-in' : 'Prefer a password? Sign in that way'}</button>
          </>
        )}

        {usePassword && !magicSent && <form onSubmit={submit}>
          <div className="li-pwrow">
            <input type={showPw ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            <button type="button" className="li-pwtoggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>{showPw ? 'Hide' : 'Show'}</button>
          </div>
          {err && <div className="li-err">{err}</div>}
          {needsVerify && (
            <div className="li-warn">
              Your email is not verified yet. Check your inbox for the confirmation link
              {resent ? ' — sent again.' : <> or <button type="button" onClick={resend}>resend it</button>.</>}
            </div>
          )}
          <button className="li-btn" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <a className="li-forgot" href="/forgot-password">Forgot password?</a>
        </form>}
        <div className="li-demo">
          <div className="li-demolabel">Just exploring? Try the demo — no account needed</div>
          <div className="li-demorow">
            <button type="button" className="li-demobtn" disabled={!!demoBusy} onClick={() => demoLogin('buyer')}>{demoBusy === 'buyer' ? 'Entering…' : 'Demo as Buyer'}</button>
            <button type="button" className="li-demobtn" disabled={!!demoBusy} onClick={() => demoLogin('vendor')}>{demoBusy === 'vendor' ? 'Entering…' : 'Demo as Vendor'}</button>
          </div>
        </div>
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
.li-google{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;font-family:inherit;font-size:14.5px;font-weight:600;padding:12px;border-radius:11px;border:1px solid rgba(255,255,255,.16);background:#fff;color:#1a1a1a;cursor:pointer;margin-bottom:10px;}
.li-google:hover{background:#F3F3F5;}.li-google:disabled{opacity:.7;}
.li-magic{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;font-family:inherit;font-size:14.5px;font-weight:600;padding:12px;border-radius:11px;border:1px solid rgba(124,92,252,.4);background:rgba(124,92,252,.1);color:#C4B5FD;cursor:pointer;margin-bottom:10px;}
.li-magic:hover{background:rgba(124,92,252,.18);}.li-magic:disabled{opacity:.7;}
.li-usepw{background:none;border:none;color:#8080A0;font:inherit;font-size:12.5px;cursor:pointer;text-align:center;margin-top:8px;text-decoration:underline;}
.li-usepw:hover{color:#A78BFA;}
.li-err{color:#FCA5A5;font-size:13px;}
.li-ok{background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.3);color:#6EE7B7;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:12px;}
.li-warn{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.3);color:#FCD34D;border-radius:10px;padding:10px 12px;font-size:13px;line-height:1.5;}
.li-warn button{background:none;border:none;color:#FBBF24;text-decoration:underline;cursor:pointer;font:inherit;padding:0;}
.li-pwrow{position:relative;display:flex;}
.li-pwrow input{flex:1;padding-right:62px !important;}
.li-pwtoggle{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:#8080A0;font:600 12px 'Outfit',sans-serif;cursor:pointer;padding:6px;}
.li-pwtoggle:hover{color:#C4B5FD;}
.li-forgot{color:#8080A0;font-size:12.5px;text-decoration:none;text-align:right;margin-top:-3px;}
.li-forgot:hover{color:#A78BFA;}
.li-demo{margin-top:16px;border-top:1px solid rgba(255,255,255,.08);padding-top:14px;}
.li-demolabel{color:#8080A0;font-size:12.5px;margin-bottom:10px;text-align:center;}
.li-demorow{display:flex;gap:9px;}
.li-demobtn{flex:1;font-family:inherit;font-size:13.5px;font-weight:600;padding:11px;border-radius:10px;border:1px solid rgba(52,211,153,.35);background:rgba(52,211,153,.08);color:#34D399;cursor:pointer;}
.li-demobtn:hover{background:rgba(52,211,153,.15);}
.li-demobtn:disabled{opacity:.6;cursor:wait;}
.li-link{display:block;margin-top:14px;color:#A78BFA;font-size:13.5px;text-decoration:none;}
`;
