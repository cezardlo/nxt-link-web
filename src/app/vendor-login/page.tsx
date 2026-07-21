'use client';

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';

export default function VendorLoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

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

  return (
    <div className="vl">
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
              <label className="vl-field"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <label className="vl-field"><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} /></label>
              {mode === 'signup' && (
                <label className="vl-agree">
                  <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); if (e.target.checked) setError(''); }} />
                  <span>
                    I agree to the <a href="/terms" target="_blank" rel="noopener">Terms of Service</a> and{' '}
                    <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>.{' '}
                    <i>Acepto los <a href="/terms" target="_blank" rel="noopener">Términos de Servicio</a> y el{' '}
                    <a href="/privacy" target="_blank" rel="noopener">Aviso de Privacidad</a>.</i>
                  </span>
                </label>
              )}
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
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
.vl{--bg:#0A0A0F;--bg2:#111118;--surf:rgba(255,255,255,.04);--ink:#F0F0F5;--ink2:#C0C0D0;--muted:#8080A0;--muted2:#505068;--line:rgba(255,255,255,.08);--p:#7C5CFC;--p2:#A78BFA;--pbg:rgba(124,92,252,.12);--pd:#6344DF;--green:#34D399;--sans:'Outfit',system-ui,sans-serif;--serif:'Instrument Serif',Georgia,serif;
  min-height:100vh;background:var(--bg);color:var(--ink);font-family:var(--sans);position:relative;overflow-x:hidden;}
.vl *{box-sizing:border-box;}
.vl-mesh{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;}
.vl-mesh span{position:absolute;border-radius:50%;filter:blur(120px);}
.vl-mesh .o1{width:480px;height:480px;background:var(--p);top:-120px;right:-100px;opacity:.2;}
.vl-mesh .o2{width:420px;height:420px;background:#7C3AED;bottom:-140px;left:-100px;opacity:.15;}
.vl-nav{position:relative;z-index:2;padding:18px 32px;}
.vl-brand{display:flex;align-items:center;gap:11px;text-decoration:none;color:var(--ink);}
.vl-mk{width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,var(--p),var(--pd));display:grid;place-items:center;font-family:var(--serif);font-size:19px;color:#fff;}
.vl-brand b{font-size:19px;font-weight:700;letter-spacing:-.02em;}.vl-brand i{color:var(--p2);font-style:normal;}
.vl-wrap{position:relative;z-index:1;display:flex;justify-content:center;padding:60px 24px 100px;}
.vl-card{width:100%;max-width:440px;background:var(--surf);border:1px solid var(--line);border-radius:22px;padding:36px;backdrop-filter:blur(12px);box-shadow:0 24px 80px rgba(0,0,0,.4);}
.vl-eyebrow{display:inline-block;padding:7px 16px;border-radius:99px;background:var(--surf);border:1px solid var(--line);color:var(--p2);font-size:12.5px;font-weight:500;}
.vl-card h1{font-size:27px;font-weight:800;letter-spacing:-.02em;margin:18px 0 8px;}
.vl-sub{color:var(--muted);font-size:14.5px;line-height:1.6;font-weight:300;margin:0 0 26px;}
.vl-field{display:flex;flex-direction:column;gap:8px;font-size:13px;font-weight:500;color:var(--ink2);margin-bottom:16px;}
.vl-field input{font-family:var(--sans);padding:13px 15px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:15px;outline:none;width:100%;}
.vl-field input:focus{border-color:var(--p);box-shadow:0 0 0 3px var(--pbg);}
.vl-btn{width:100%;font-family:var(--sans);border:none;cursor:pointer;font-size:15px;font-weight:600;border-radius:12px;padding:14px;background:var(--p);color:#fff;margin-top:6px;box-shadow:0 4px 20px rgba(124,92,252,.35);}
.vl-btn:hover{background:var(--pd);}.vl-btn:disabled{opacity:.6;}
.vl-err{background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.3);color:#FCA5A5;padding:11px 15px;border-radius:12px;font-size:13.5px;margin-bottom:16px;}
.vl-agree{display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin-bottom:4px;}
.vl-agree input{width:16px;height:16px;margin-top:2px;flex-shrink:0;accent-color:var(--p);cursor:pointer;}
.vl-agree input:focus-visible{outline:2px solid var(--p);outline-offset:2px;}
.vl-agree span{color:var(--muted);font-size:12.5px;line-height:1.55;}
.vl-agree span a{color:var(--p2);}
.vl-agree span i{color:var(--muted2);font-style:normal;}
.vl-sent{background:var(--pbg);border:1px solid rgba(124,92,252,.25);color:var(--p2);padding:14px 16px;border-radius:12px;font-size:14px;line-height:1.5;}
.vl-switch{text-align:center;margin-top:22px;font-size:13.5px;color:var(--muted);}
.vl-switch button{background:none;border:none;color:var(--p2);font:600 13.5px var(--sans);cursor:pointer;}
.vl-alt{display:block;text-align:center;margin-top:16px;color:var(--muted2);font-size:12.5px;text-decoration:none;}
.vl-alt:hover{color:var(--p2);}
`;
