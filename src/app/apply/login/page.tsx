'use client';

// /apply/login — sign in or create an account to manage YOUR vendor
// application (private intake system). This is unrelated to the older
// /vendor-signup, /vendor-login, /vendor/portal system (vendor_profiles
// table) — do not merge with that flow.
//
// Design System v1.0 reskin (2026-07-30 polish pass): was on the same
// off-brand dark "Outfit"/Instrument Serif theme as /apply and /apply/status
// (#0A0A0F bg, #7C5CFC purple) — matches nothing else in the app. Rebuilt
// light warm-white + brand violet with the site's real fonts, matching
// /login and /signup's CSS-in-JS pattern. Visual/CSS only — every handler,
// state, and the mode/agree/signup logic below are byte-identical.

import { useEffect, useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import { Mail, Lock } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import { MOTION_CSS } from '@/components/motion/Motion';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-applylogin',
  display: 'swap',
});

type Mode = 'signin' | 'signup';

export default function ApplyLoginPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  // Arriving from the post-submit confirmation carries the application email
  // (?email=) — pre-fill it and say WHY, so the account they create uses the
  // same email and the saved application auto-links to it (2026-08-04).
  const [fromApplication, setFromApplication] = useState(false);

  useEffect(() => {
    try {
      const e = new URLSearchParams(window.location.search).get('email');
      if (e && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
        setEmail(e);
        setFromApplication(true);
        setMode('signup');
      }
    } catch { /* ignore */ }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const supabase = createBrowserSupabaseClient();

      if (mode === 'signup') {
        // ONE signup system: account creation goes through the server route
        // so the ToS/Privacy click-wrap is recorded fail-closed.
        const r = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role: 'vendor', terms_accepted: agree }),
        });
        const j = await r.json().catch(() => ({}));
        if (!j.ok) {
          setError(j.message || 'Something went wrong. Please try again.');
          return;
        }
        if (!j.session) {
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
    <div className={`axl-root ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header className="axl-nav">
        <a href="/" className="axl-brand">
          <b>NXT<i>{'//'}</i>LINK</b>
        </a>
      </header>

      <main className="axl-wrap">
        <div className="axl-card nxm-in">
          <h1>{mode === 'signin' ? 'Sign in' : 'Create your account'}</h1>
          <p className="axl-sub">
            {mode === 'signin'
              ? 'Manage your application and check its status.'
              : 'Create an account so you can check and update your application later.'}
          </p>

          {fromApplication && (
            <div className="axl-notice" role="status">
              Your application is saved. {mode === 'signup' ? 'Create your account' : 'Sign in'} with this same email
              and it links automatically — nothing you entered is lost.{' '}
              <i>
                Su solicitud está guardada. {mode === 'signup' ? 'Cree su cuenta' : 'Inicie sesión'} con este mismo
                correo y se vinculará automáticamente — no perderá nada de lo que escribió.
              </i>
            </div>
          )}

          {notice && <div className="axl-notice" role="status">{notice}</div>}
          {error && <div className="axl-error" role="alert" aria-live="polite">{error}</div>}

          <form onSubmit={handleSubmit}>
            <label className="axl-label" htmlFor="axl-email">Email</label>
            <div className="axl-field">
              <span className="axl-fieldicon" aria-hidden="true"><Mail size={16} strokeWidth={1.75} /></span>
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
            </div>

            <label className="axl-label" htmlFor="axl-password">Password</label>
            <div className="axl-field">
              <span className="axl-fieldicon" aria-hidden="true"><Lock size={16} strokeWidth={1.75} /></span>
              <input
                id="axl-password"
                className="axl-input"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                minLength={mode === 'signup' ? 8 : 6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {mode === 'signup' && (
              <label className="axl-agree">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
                <span>
                  I agree to the <a href="/terms" target="_blank" rel="noopener">Terms of Service</a> and{' '}
                  <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>.{' '}
                  <i>Acepto los <a href="/terms" target="_blank" rel="noopener">Términos de Servicio</a> y el{' '}
                  <a href="/privacy" target="_blank" rel="noopener">Aviso de Privacidad</a>.</i>
                </span>
              </label>
            )}

            <button className="axl-btn nxm-press" type="submit" disabled={busy}>
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

const CSS = MOTION_CSS + `
.axl-root{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-applylogin),'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;}
.axl-root *{box-sizing:border-box;}
.axl-root a:focus-visible,.axl-root button:focus-visible,.axl-root input:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.axl-nav{display:flex;align-items:center;padding:22px 32px;}
.axl-brand{display:flex;align-items:center;gap:10px;color:var(--spec-ink,#141320);text-decoration:none;}
.axl-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;font-size:17px;font-weight:700;letter-spacing:-.01em;}
.axl-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}
.axl-wrap{display:flex;justify-content:center;padding:6vh 20px 10vh;}
.axl-card{width:100%;max-width:420px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:16px;padding:32px;box-shadow:0 8px 30px rgba(74,61,176,.08);}
.axl-card h1{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;font-size:24px;font-weight:700;letter-spacing:-.01em;margin:0 0 8px;color:var(--spec-ink,#141320);}
.axl-sub{color:var(--spec-text-2nd,#615F72);font-size:14px;line-height:1.5;margin:0 0 22px;}
.axl-notice{background:#E9F7F0;border:1px solid rgba(47,158,106,.3);color:#1F7A54;font-size:13px;line-height:1.5;padding:12px 14px;border-radius:12px;margin-bottom:16px;}
.axl-notice i{display:block;color:#3E7A5F;font-style:normal;margin-top:4px;}
.axl-error{background:#FDF2F2;border:1px solid #F3C9C9;color:#B04A4A;font-size:13px;line-height:1.5;padding:12px 14px;border-radius:12px;margin-bottom:16px;}
.axl-label{display:block;font-size:12px;font-weight:700;color:var(--spec-text-2nd,#615F72);letter-spacing:.02em;margin:0 0 6px;}
.axl-field{position:relative;margin-bottom:16px;}
.axl-fieldicon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#8A87A0;display:flex;pointer-events:none;}
.axl-input{width:100%;padding:12px 14px 12px 40px;background:var(--spec-warm-white,#F8F7FB);border:1px solid var(--spec-border,#E2DFEC);border-radius:12px;color:var(--spec-ink,#141320);font:400 14.5px/1.4 inherit;outline:none;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),box-shadow var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.axl-input:hover{border-color:#C7C2DE;}
.axl-input:focus{border-color:var(--spec-violet,#6C5CE0);background:#fff;box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.axl-input::placeholder{color:#8A87A0;}
.axl-agree{display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin:0 0 18px;}
.axl-agree input{width:16px;height:16px;margin-top:2px;flex-shrink:0;accent-color:var(--spec-violet,#6C5CE0);cursor:pointer;}
.axl-agree input:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.axl-agree span{color:var(--spec-text-2nd,#615F72);font-size:12.5px;line-height:1.55;}
.axl-agree span a{color:var(--spec-violet-deep,#4A3DB0);}
.axl-agree span i{color:#8A87A0;font-style:normal;}
.axl-btn{width:100%;padding:13px 18px;min-height:48px;background:var(--spec-violet,#6C5CE0);color:#fff;border:none;border-radius:10px;font:700 15px inherit;cursor:pointer;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.axl-btn:hover:not(:disabled){background:var(--spec-violet-deep,#4A3DB0);}
.axl-btn:disabled{opacity:.6;cursor:not-allowed;}
.axl-switch{text-align:center;font-size:13px;line-height:1.5;color:var(--spec-text-2nd,#615F72);margin-top:20px;}
.axl-link{background:none;border:none;color:var(--spec-violet-deep,#4A3DB0);font:600 13px inherit;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:2px;}
.axl-alt{text-align:center;font-size:13px;line-height:1.5;color:#8A87A0;margin-top:14px;padding-top:14px;border-top:1px solid var(--spec-border,#E2DFEC);}
.axl-alt a{color:var(--spec-text-2nd,#615F72);text-decoration:underline;text-underline-offset:2px;}
`;
