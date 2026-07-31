'use client';

// Reset password: the email link (via /auth/callback) leaves the user with a
// recovery session; here they choose the new password.
//
// Design System v1.0 reskin (2026-07-30 polish pass): was stranded on the old
// dark "Outfit" theme (#0A0A0F bg, #7C5CFC purple) — matches nothing else in
// the funnel. Rebuilt light warm-white + brand violet, same CSS-in-JS pattern
// as /login. Visual/CSS only — the submit handler and copy are unchanged.

import { useEffect, useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import { Lock, Check } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import { MOTION_CSS } from '@/components/motion/Motion';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-resetpw',
  display: 'swap',
});

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
    <div className={`rp ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <a className="rp-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b></a>
      <div className="rp-card nxm-in">
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
            <div className="rp-successmark" aria-hidden="true"><Check size={20} strokeWidth={3} /></div>
            <h1>Password updated</h1>
            <p className="rp-sub">Your new password is saved. You&apos;re signed in — head back to your dashboard.</p>
            <a className="rp-btn nxm-press" href="/login">Continue</a>
          </>
        ) : (
          <>
            <h1>Choose a new password</h1>
            <form onSubmit={submit}>
              <label className="rp-field" htmlFor="rp-pw1">
                <span className="rp-fieldicon" aria-hidden="true"><Lock size={16} strokeWidth={1.75} /></span>
                <input id="rp-pw1" type="password" placeholder="New password (8+ characters)" value={pw1} onChange={(e) => setPw1(e.target.value)} required minLength={8} autoComplete="new-password" autoFocus />
              </label>
              <label className="rp-field" htmlFor="rp-pw2">
                <span className="rp-fieldicon" aria-hidden="true"><Lock size={16} strokeWidth={1.75} /></span>
                <input id="rp-pw2" type="password" placeholder="Repeat new password" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={8} autoComplete="new-password" />
              </label>
              {err && <div className="rp-err" role="alert" aria-live="polite">{err}</div>}
              <button className="rp-btn nxm-press" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const CSS = MOTION_CSS + `
.rp{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-resetpw),'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center;padding:40px 20px;-webkit-font-smoothing:antialiased;}
.rp *{box-sizing:border-box;}
.rp a:focus-visible,.rp button:focus-visible,.rp input:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.rp-brand{color:var(--spec-ink,#141320);text-decoration:none;margin-bottom:26px;}
.rp-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;font-size:19px;font-weight:700;letter-spacing:-.01em;}
.rp-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}
.rp-card{width:100%;max-width:400px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:16px;padding:30px;box-shadow:0 8px 30px rgba(74,61,176,.08);}
.rp-card h1{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;font-size:22px;font-weight:700;letter-spacing:-.01em;margin-bottom:12px;color:var(--spec-ink,#141320);}
.rp-sub{color:var(--spec-text-2nd,#615F72);font-size:14px;line-height:1.6;margin-bottom:16px;}
.rp-card form{display:flex;flex-direction:column;gap:11px;}
.rp-field{position:relative;display:block;}
.rp-fieldicon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#8A87A0;display:flex;pointer-events:none;}
.rp-field input{width:100%;font-family:inherit;font-size:14.5px;padding:12px 14px 12px 40px;border-radius:12px;border:1px solid var(--spec-border,#E2DFEC);background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);outline:none;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),box-shadow var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.rp-field input::placeholder{color:#8A87A0;}
.rp-field input:hover{border-color:#C7C2DE;}
.rp-field input:focus{border-color:var(--spec-violet,#6C5CE0);background:#fff;box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.rp-btn{display:inline-block;text-align:center;text-decoration:none;font-family:inherit;font-size:15px;font-weight:700;padding:13px;min-height:48px;border-radius:10px;border:none;background:var(--spec-violet,#6C5CE0);color:#fff;cursor:pointer;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.rp-btn:hover{background:var(--spec-violet-deep,#4A3DB0);}
.rp-btn:disabled{opacity:.6;cursor:wait;}
.rp-err{background:#FDF2F2;border:1px solid #F3C9C9;color:#B04A4A;font-size:13px;border-radius:10px;padding:10px 12px;}
.rp-successmark{width:44px;height:44px;border-radius:14px;background:#E9F7F0;color:#1F7A54;display:grid;place-items:center;margin-bottom:14px;}
.rp-link{display:block;margin-top:6px;color:var(--spec-violet-deep,#4A3DB0);font-size:13.5px;text-decoration:none;}
.rp-link:hover{text-decoration:underline;}
`;
