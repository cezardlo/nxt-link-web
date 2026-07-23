'use client';

// Sign in for every role (replaces the old intel command-center login).
// After login, routes by platform role: admin/operator -> /admin,
// vendor -> /vendor/listings, buyer -> /buyer.
//
// Continue with Google / LinkedIn / Microsoft (flags NEXT_PUBLIC_AUTH_GOOGLE,
// _LINKEDIN, _AZURE): these buttons already existed un-gated (Google only),
// which meant a dead click whenever the provider isn't enabled in Supabase —
// now routed through the shared OAuthButton so each only renders behind its
// own flag, like every other screen. This is a pure sign-IN convenience (no
// click-wrap checkbox here — same as the password form below it): an
// existing account signs back in; a brand-new account is auto-provisioned as
// a buyer by Supabase itself, same as it was before this change, hence the
// "by continuing" disclaimer under the button stack.

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IBM_Plex_Sans } from 'next/font/google';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import { safeRelativePath } from '@/lib/auth/oauth';
import GoogleAuthButton from '@/components/GoogleAuthButton';
import OAuthButton from '@/components/OAuthButton';
import { bilingualCopy, OAUTH_CONTINUE_AGREES_MSG, ANY_OAUTH_ENABLED } from '@/lib/auth/oauth';

// Design System v1.0 reskin (2026-07-23): light warm-white + violet, matching
// /signup and /vendor-signup. Visual/CSS only — every handler, state, and
// OAuth flag branch above is unchanged.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-login',
  display: 'swap',
});

// Mirror the server guard in /api/demo/login: the demo buttons mint a shared-
// password account, so they must not show where the route itself 404s. Enabled
// only outside production, or when NEXT_PUBLIC_ALLOW_DEMO_LOGIN==='true'. In
// production (the default) they're hidden — no dead-end "Not found" click.
const DEMO_LOGIN_ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ALLOW_DEMO_LOGIN === 'true';

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
  const [magicBusy, setMagicBusy] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [usePassword, setUsePassword] = useState(false);

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
      // safeRelativePath (not an inline startsWith check): '/\evil.com' passes
      // a '//' test but the browser resolves it protocol-relative — open redirect.
      window.location.href = safeRelativePath(sp.get('next'),
        role === 'admin' || role === 'super_admin' ? '/admin'
          : role === 'vendor' ? '/vendor/leads'
          : '/buyer');
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
    <div className={`li ${ibmPlexSans.variable}`}>
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
            <GoogleAuthButton
              lang="en"
              next={sp.get('next') || undefined}
              from="/login"
              onError={setErr}
              className="li-google"
              bilingualErrors
            />
            <OAuthButton
              provider="linkedin_oidc"
              lang="en"
              next={sp.get('next') || undefined}
              from="/login"
              onError={setErr}
              className="li-google"
              bilingualErrors
            />
            <OAuthButton
              provider="azure"
              lang="en"
              next={sp.get('next') || undefined}
              from="/login"
              onError={setErr}
              className="li-google"
              bilingualErrors
            />
            {ANY_OAUTH_ENABLED && <p className="li-googlenote">{bilingualCopy(OAUTH_CONTINUE_AGREES_MSG)}</p>}
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
        {DEMO_LOGIN_ENABLED && <div className="li-demo">
          <div className="li-demolabel">Just exploring? Try the demo — no account needed</div>
          <div className="li-demorow">
            <button type="button" className="li-demobtn" disabled={!!demoBusy} onClick={() => demoLogin('buyer')}>{demoBusy === 'buyer' ? 'Entering…' : 'Demo as Buyer'}</button>
            <button type="button" className="li-demobtn" disabled={!!demoBusy} onClick={() => demoLogin('vendor')}>{demoBusy === 'vendor' ? 'Entering…' : 'Demo as Vendor'}</button>
          </div>
        </div>}
        <a className="li-link" href="/signup">New here? Create an account</a>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginInner /></Suspense>;
}

const CSS = `
.li{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-login),'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center;padding:40px 20px;-webkit-font-smoothing:antialiased;}
.li *{box-sizing:border-box;}
.li a:focus-visible,.li button:focus-visible,.li input:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.li-brand{color:var(--spec-ink,#141320);text-decoration:none;margin-bottom:26px;}
.li-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;font-size:19px;font-weight:700;letter-spacing:-.01em;}
.li-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}
.li-card{width:100%;max-width:400px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:16px;padding:30px;box-shadow:0 8px 30px rgba(74,61,176,.08);}
.li-card h1{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;font-size:23px;font-weight:700;letter-spacing:-.01em;margin-bottom:16px;color:var(--spec-ink,#141320);}
.li-card form{display:flex;flex-direction:column;gap:11px;}
.li-card input{font-family:inherit;font-size:14.5px;padding:12px 14px;border-radius:12px;border:1px solid var(--spec-border,#E2DFEC);background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);outline:none;}
.li-card input::placeholder{color:#8A87A0;}
.li-card input:focus{border-color:var(--spec-violet,#6C5CE0);background:#fff;box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.li-btn{font-family:inherit;font-size:15px;font-weight:700;padding:13px;min-height:48px;border-radius:10px;border:none;background:var(--spec-violet,#6C5CE0);color:#fff;cursor:pointer;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.li-btn:hover{background:var(--spec-violet-deep,#4A3DB0);}.li-btn:disabled{opacity:.6;cursor:wait;}
.li-google{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;font-family:inherit;font-size:14.5px;font-weight:600;padding:12px;min-height:48px;border-radius:12px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);cursor:pointer;margin-bottom:10px;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease),border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.li-google:hover{background:var(--spec-warm-white,#F8F7FB);border-color:#C7C2DE;}.li-google:disabled{opacity:.7;}
.li-googlenote{color:#8A87A0;font-size:11.5px;line-height:1.5;text-align:center;margin:-4px 0 12px;}
.li-magic{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;font-family:inherit;font-size:14.5px;font-weight:600;padding:12px;min-height:48px;border-radius:12px;border:1px solid rgba(108,92,224,.35);background:rgba(108,92,224,.08);color:var(--spec-violet-deep,#4A3DB0);cursor:pointer;margin-bottom:10px;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.li-magic:hover{background:rgba(108,92,224,.14);}.li-magic:disabled{opacity:.7;}
.li-usepw{background:none;border:none;color:#8A87A0;font:inherit;font-size:12.5px;cursor:pointer;text-align:center;margin-top:8px;text-decoration:underline;transition:color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.li-usepw:hover{color:var(--spec-violet-deep,#4A3DB0);}
.li-err{color:#B04A4A;font-size:13px;}
.li-ok{background:#E9F7F0;border:1px solid rgba(47,158,106,.3);color:#1F7A54;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:12px;}
.li-warn{background:#FBF3E7;border:1px solid #EFD9AE;color:#8A5D14;border-radius:10px;padding:10px 12px;font-size:13px;line-height:1.5;}
.li-warn button{background:none;border:none;color:#8A5D14;text-decoration:underline;cursor:pointer;font:inherit;padding:0;}
.li-pwrow{position:relative;display:flex;}
.li-pwrow input{flex:1;padding-right:62px !important;}
.li-pwtoggle{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:#8A87A0;font:600 12px inherit;cursor:pointer;padding:6px;transition:color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.li-pwtoggle:hover{color:var(--spec-violet-deep,#4A3DB0);}
.li-forgot{color:#8A87A0;font-size:12.5px;text-decoration:none;text-align:right;margin-top:-3px;transition:color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.li-forgot:hover{color:var(--spec-violet-deep,#4A3DB0);}
.li-demo{margin-top:16px;border-top:1px solid var(--spec-border,#E2DFEC);padding-top:14px;}
.li-demolabel{color:#8A87A0;font-size:12.5px;margin-bottom:10px;text-align:center;}
.li-demorow{display:flex;gap:9px;}
.li-demobtn{flex:1;font-family:inherit;font-size:13.5px;font-weight:600;padding:11px;min-height:44px;border-radius:10px;border:1px solid rgba(47,158,106,.35);background:rgba(47,158,106,.08);color:#1F7A54;cursor:pointer;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.li-demobtn:hover{background:rgba(47,158,106,.15);}
.li-demobtn:disabled{opacity:.6;cursor:wait;}
.li-link{display:block;margin-top:14px;color:var(--spec-violet-deep,#4A3DB0);font-size:13.5px;text-decoration:none;text-align:center;transition:color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.li-link:hover{color:var(--spec-violet,#6C5CE0);text-decoration:underline;}
`;
