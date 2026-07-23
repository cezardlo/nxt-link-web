'use client';

// Continue with Google / LinkedIn / Microsoft (flags NEXT_PUBLIC_AUTH_GOOGLE,
// _LINKEDIN, _AZURE): shown in BOTH modes. 'signin' mode has no click-wrap
// checkbox on this page (an existing account signing back in — same
// no-gate rule as /login's buttons). 'signup' mode gates the buttons
// behind the same checkbox the password signup uses (moved above it),
// threads oauth_lane=organic — the same PENDING vendor lane
// /vendor-signup uses — and /auth/callback records the acceptance
// fail-closed. See src/lib/auth/oauth.ts.

import { useEffect, useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import GoogleAuthButton from '@/components/GoogleAuthButton';
import OAuthButton from '@/components/OAuthButton';
import { GOOGLE_TERMS_ERROR_MSG, bilingualCopy, ANY_OAUTH_ENABLED } from '@/lib/auth/oauth';

// Design System v1.0 reskin (2026-07-23): light warm-white + violet, matching
// /vendor-signup. Visual/CSS only — every handler, state, and OAuth flag
// branch above is unchanged.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-vlogin',
  display: 'swap',
});

export default function VendorLoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  // /auth/callback bounces back here with ?err=google_terms when the
  // fail-closed terms recording on the Google path couldn't be written —
  // surface the same bilingual error the email path shows on that failure.
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('err') === 'google_terms') {
        setError(bilingualCopy(GOOGLE_TERMS_ERROR_MSG));
      }
    } catch { /* ignore */ }
  }, []);

  async function submit() {
    if (mode === 'signup' && !agree) {
      setError('Please accept the Terms of Service and Privacy Policy. / Por favor acepta los Términos de Servicio y el Aviso de Privacidad.');
      return;
    }
    setError(''); setBusy(true);
    try {
      const sb = createBrowserSupabaseClient();
      if (mode === 'signup') {
        // ONE signup system: account creation goes through the server route
        // so the ToS/Privacy click-wrap is recorded fail-closed.
        const r = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role: 'vendor', terms_accepted: agree }),
        });
        const j = await r.json().catch(() => ({}));
        if (!j.ok) throw new Error(j.message || 'Something went wrong');
        if (j.session) { window.location.href = '/vendor/portal'; return; }
        setSent(true);
      } else {
        const { error: err } = await sb.auth.signInWithPassword({ email, password });
        if (err) throw err;
        window.location.href = '/vendor/portal';
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally { setBusy(false); }
  }

  // Shared click-wrap checkbox (signup mode only) — rendered ABOVE the
  // Google button when the flag is on, or in its original spot inside the
  // form when the flag is off (unchanged today).
  const agreeCheckbox = (
    <label className="vl-agree">
      <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); if (e.target.checked) setError(''); }} />
      <span>
        I agree to the <a href="/terms" target="_blank" rel="noopener">Terms of Service</a> and{' '}
        <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>.{' '}
        <i>Acepto los <a href="/terms" target="_blank" rel="noopener">Términos de Servicio</a> y el{' '}
        <a href="/privacy" target="_blank" rel="noopener">Aviso de Privacidad</a>.</i>
      </span>
    </label>
  );

  return (
    <div className={`vl ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="vl-mesh"><span className="o1" /><span className="o2" /></div>
      <nav className="vl-nav">
        <a className="vl-brand" href="/"><span className="vl-mk">N</span><b>NXT<i>//</i>LINK</b></a>
      </nav>
      <main className="vl-wrap">
        <div className="vl-card">
          <span className="vl-eyebrow">For vendors</span>
          <h1>{mode === 'signin' ? 'Sign in to your portal' : 'Create your vendor account'}</h1>
          <p className="vl-sub">{mode === 'signin' ? 'Manage your profile, brochures, and videos.' : 'Manage your NXT//LINK profile — the details you already registered can be linked automatically.'}</p>

          {sent ? (
            <div className="vl-sent">Check your email to confirm your account, then sign in.</div>
          ) : (
            <>
              {error && <div className="vl-err">{error}</div>}

              {ANY_OAUTH_ENABLED && (
                <div className="vl-oauth">
                  {mode === 'signup' && agreeCheckbox}
                  <GoogleAuthButton
                    lang="en"
                    next="/vendor/portal"
                    from="/vendor-login"
                    lane={mode === 'signup' ? 'organic' : undefined}
                    disabled={mode === 'signup' && !agree}
                    onError={setError}
                    className="vl-google"
                    bilingualErrors
                  />
                  <OAuthButton
                    provider="linkedin_oidc"
                    lang="en"
                    next="/vendor/portal"
                    from="/vendor-login"
                    lane={mode === 'signup' ? 'organic' : undefined}
                    disabled={mode === 'signup' && !agree}
                    onError={setError}
                    className="vl-google"
                    bilingualErrors
                  />
                  <OAuthButton
                    provider="azure"
                    lang="en"
                    next="/vendor/portal"
                    from="/vendor-login"
                    lane={mode === 'signup' ? 'organic' : undefined}
                    disabled={mode === 'signup' && !agree}
                    onError={setError}
                    className="vl-google"
                    bilingualErrors
                  />
                  <div className="vl-or"><span>or continue with email · o continuar con correo</span></div>
                </div>
              )}

              <label className="vl-field"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <label className="vl-field"><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} /></label>
              {mode === 'signup' && !ANY_OAUTH_ENABLED && agreeCheckbox}
              <button className="vl-btn" disabled={busy} onClick={submit}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
            </>
          )}

          <div className="vl-switch">
            {mode === 'signin' ? <>New here? <button onClick={() => { setMode('signup'); setError(''); }}>Create an account</button></>
              : <>Already registered? <button onClick={() => { setMode('signin'); setError(''); }}>Sign in</button></>}
          </div>
          <a className="vl-alt" href="/vendor-signup">New vendor? Quick signup — under a minute, no password. / ¿Nuevo proveedor? Registro rápido — menos de un minuto, sin contraseña. →</a>
        </div>
      </main>
    </div>
  );
}

const CSS = `
.vl{--bg:#F8F7FB;--bg2:#EFEDF5;--surf:#fff;--ink:#141320;--ink2:#3B3A4A;--muted:#615F72;--muted2:#8A87A0;--line:#E2DFEC;--p:#6C5CE0;--p2:#4A3DB0;--pbg:rgba(108,92,224,.08);--pd:#4A3DB0;--green:#1F7A54;--sans:var(--font-ibm-plex-sans-vlogin),'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',sans-serif;--serif:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;
  min-height:100vh;background:var(--bg);color:var(--ink);font-family:var(--sans);position:relative;overflow-x:hidden;-webkit-font-smoothing:antialiased;}
.vl *{box-sizing:border-box;}
.vl a:focus-visible,.vl button:focus-visible,.vl input:focus-visible{outline:2px solid var(--p);outline-offset:2px;}
.vl-mesh{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;}
.vl-mesh span{position:absolute;border-radius:50%;filter:blur(120px);}
.vl-mesh .o1{width:480px;height:480px;background:var(--p);top:-120px;right:-100px;opacity:.1;}
.vl-mesh .o2{width:420px;height:420px;background:#A99DF2;bottom:-140px;left:-100px;opacity:.1;}
.vl-nav{position:relative;z-index:2;padding:18px 32px;}
.vl-brand{display:flex;align-items:center;gap:11px;text-decoration:none;color:var(--ink);}
.vl-mk{width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,var(--p),var(--pd));display:grid;place-items:center;font-family:var(--serif);font-weight:700;font-size:17px;color:#fff;}
.vl-brand b{font-family:var(--serif);font-size:19px;font-weight:700;letter-spacing:-.02em;}.vl-brand i{color:var(--p);font-style:normal;}
.vl-wrap{position:relative;z-index:1;display:flex;justify-content:center;padding:60px 24px 100px;}
.vl-card{width:100%;max-width:440px;background:var(--surf);border:1px solid var(--line);border-radius:22px;padding:36px;box-shadow:0 24px 60px -30px rgba(20,19,32,.25);}
.vl-eyebrow{display:inline-block;padding:7px 16px;border-radius:99px;background:var(--bg2);border:1px solid var(--line);color:var(--p2);font-size:12.5px;font-weight:600;}
.vl-card h1{font-family:var(--serif);font-size:27px;font-weight:700;letter-spacing:-.02em;margin:18px 0 8px;color:var(--ink);}
.vl-sub{color:var(--muted);font-size:14.5px;line-height:1.6;margin:0 0 26px;}
.vl-field{display:flex;flex-direction:column;gap:8px;font-size:13px;font-weight:600;color:var(--ink2);margin-bottom:16px;}
.vl-field input{font-family:var(--sans);padding:13px 15px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:15px;outline:none;width:100%;}
.vl-field input::placeholder{color:var(--muted2);}
.vl-field input:focus{border-color:var(--p);background:#fff;box-shadow:0 0 0 3px var(--pbg);}
.vl-btn{width:100%;font-family:var(--sans);border:none;cursor:pointer;font-size:15px;font-weight:700;border-radius:10px;padding:14px;min-height:48px;background:var(--p);color:#fff;margin-top:6px;transition:background .15s;}
.vl-btn:hover{background:var(--pd);}.vl-btn:disabled{opacity:.6;cursor:wait;}
.vl-err{background:#FDF2F2;border:1px solid #F3C9C9;color:#B04A4A;padding:11px 15px;border-radius:12px;font-size:13.5px;margin-bottom:16px;}
.vl-agree{display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin-bottom:4px;}
.vl-agree input{width:16px;height:16px;margin-top:2px;flex-shrink:0;accent-color:var(--p);cursor:pointer;}
.vl-agree input:focus-visible{outline:2px solid var(--p);outline-offset:2px;}
.vl-agree span{color:var(--muted);font-size:12.5px;line-height:1.55;}
.vl-agree span a{color:var(--p2);}
.vl-agree span i{color:var(--muted2);font-style:normal;}
.vl-oauth{margin-bottom:18px;}
.vl-oauth .vl-agree{margin-bottom:14px;}
.vl-google{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;font-family:var(--sans);font-size:15px;font-weight:600;padding:13px;min-height:48px;border-radius:12px;border:1px solid var(--line);background:#fff;color:var(--ink);cursor:pointer;}
.vl-google:hover{background:var(--bg);border-color:#C7C2DE;}.vl-google:disabled{opacity:.6;}
.vl-google + .vl-google{margin-top:10px;}
.vl-or{display:flex;align-items:center;gap:10px;margin:16px 0;color:var(--muted2);font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;}
.vl-or::before,.vl-or::after{content:'';flex:1;height:1px;background:var(--line);}
.vl-sent{background:var(--pbg);border:1px solid rgba(108,92,224,.25);color:var(--p2);padding:14px 16px;border-radius:12px;font-size:14px;line-height:1.5;}
.vl-switch{text-align:center;margin-top:22px;font-size:13.5px;color:var(--muted);}
.vl-switch button{background:none;border:none;color:var(--p2);font:700 13.5px var(--sans);cursor:pointer;}
.vl-alt{display:block;text-align:center;margin-top:16px;color:var(--muted2);font-size:12.5px;text-decoration:none;}
.vl-alt:hover{color:var(--p2);}
`;
