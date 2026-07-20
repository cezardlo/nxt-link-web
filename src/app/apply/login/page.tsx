'use client';

// /apply/login — sign in or create an account to manage YOUR vendor
// application (private intake system). This is unrelated to the older
// /vendor-signup, /vendor-login, /vendor/portal system (vendor_profiles
// table) — do not merge with that flow.

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';

type Mode = 'signin' | 'signup';

export default function ApplyLoginPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const supabase = createBrowserSupabaseClient();

      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        if (!data.session) {
          setNotice('Check your email to confirm your account, then sign in.');
          setMode('signin');
          return;
        }
        window.location.href = '/apply/status';
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      window.location.href = '/apply/status';
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="axl-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header className="axl-nav">
        <a href="/" className="axl-brand">
          <span className="axl-mk"><span className="axl-n">N</span></span>
          <b>NXT<i>{'//'}</i>LINK</b>
        </a>
      </header>

      <main className="axl-wrap">
        <div className="axl-card">
          <h1>{mode === 'signin' ? 'Sign in' : 'Create your account'}</h1>
          <p className="axl-sub">
            {mode === 'signin'
              ? 'Manage your application and check its status.'
              : 'Create an account so you can check and update your application later.'}
          </p>

          {notice && <div className="axl-notice">{notice}</div>}
          {error && <div className="axl-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <label className="axl-label" htmlFor="axl-email">Email</label>
            <input
              id="axl-email"
              className="axl-input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />

            <label className="axl-label" htmlFor="axl-password">Password</label>
            <input
              id="axl-password"
              className="axl-input"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <button className="axl-btn" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="axl-switch">
            {mode === 'signin' ? (
              <>
                Don&apos;t have an account?{' '}
                <button type="button" className="axl-link" onClick={() => { setMode('signup'); setError(''); setNotice(''); }}>
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" className="axl-link" onClick={() => { setMode('signin'); setError(''); setNotice(''); }}>
                  Sign in
                </button>
              </>
            )}
          </div>

          <div className="axl-alt">
            Prefer not to create an account? <a href="/apply">Just submit an application →</a>
          </div>
        </div>
      </main>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
.axl-root{--bg:#0A0A0F;--bg2:#111118;--surf:rgba(255,255,255,.04);--surf2:rgba(255,255,255,.07);--ink:#F0F0F5;--ink2:#C0C0D0;--muted:#8080A0;--muted2:#505068;--line:rgba(255,255,255,.08);--p:#7C5CFC;--p2:#A78BFA;--p3:#C4B5FD;--pbg:rgba(124,92,252,.12);--pd:#6344DF;--green:#34D399;--red:#F87171;
  min-height:100vh;background:var(--bg);color:var(--ink);font-family:'Outfit',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.axl-root *{box-sizing:border-box;}
.axl-nav{display:flex;align-items:center;padding:22px 32px;}
.axl-brand{display:flex;align-items:center;gap:10px;font:700 17px/1 'Outfit';color:var(--ink);text-decoration:none;}
.axl-brand b{font-weight:700;letter-spacing:.01em;}
.axl-brand i{color:var(--p2);font-style:normal;}
.axl-mk{width:30px;height:32px;border-radius:9px;background:linear-gradient(135deg,var(--p),var(--pd));display:grid;place-items:center;box-shadow:0 8px 24px rgba(124,92,252,.35);flex-shrink:0;}
.axl-n{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-size:19px;line-height:1;color:#fff;}
.axl-wrap{display:flex;justify-content:center;padding:6vh 20px 10vh;}
.axl-card{width:100%;max-width:420px;background:var(--surf);border:1px solid var(--line);border-radius:22px;padding:38px 34px;backdrop-filter:blur(12px);box-shadow:0 24px 80px rgba(0,0,0,.4);}
.axl-card h1{font:700 26px/1.2 'Outfit';margin:0 0 8px;color:var(--ink);}
.axl-sub{font:400 14px/1.5 'Outfit';color:var(--ink2);margin:0 0 24px;}
.axl-notice{background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.3);color:var(--green);font:500 13px/1.5 'Outfit';padding:12px 14px;border-radius:12px;margin-bottom:18px;}
.axl-error{background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.3);color:var(--red);font:500 13px/1.5 'Outfit';padding:12px 14px;border-radius:12px;margin-bottom:18px;}
.axl-label{display:block;font:600 12px/1 'Outfit';color:var(--muted);letter-spacing:.02em;margin:0 0 8px;}
.axl-input{width:100%;padding:12px 14px;background:var(--bg);border:1px solid var(--line);border-radius:11px;color:var(--ink);font:400 15px 'Outfit';outline:none;margin-bottom:18px;transition:border-color .15s,box-shadow .15s;}
.axl-input:focus{border-color:var(--p);box-shadow:0 0 0 3px var(--pbg);}
.axl-input::placeholder{color:var(--muted2);}
.axl-btn{width:100%;padding:13px 18px;background:var(--p);color:#fff;border:none;border-radius:12px;font:600 15px 'Outfit';cursor:pointer;box-shadow:0 8px 24px rgba(124,92,252,.35);transition:background .15s;}
.axl-btn:hover:not(:disabled){background:var(--pd);}
.axl-btn:disabled{opacity:.6;cursor:not-allowed;}
.axl-switch{text-align:center;font:400 13px/1.5 'Outfit';color:var(--ink2);margin-top:20px;}
.axl-link{background:none;border:none;color:var(--p3);font:600 13px 'Outfit';cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:2px;}
.axl-alt{text-align:center;font:400 13px/1.5 'Outfit';color:var(--muted);margin-top:14px;padding-top:14px;border-top:1px solid var(--line);}
.axl-alt a{color:var(--ink2);text-decoration:underline;text-underline-offset:2px;}
`;
