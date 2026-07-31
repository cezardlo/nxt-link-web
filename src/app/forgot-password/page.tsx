'use client';

// Forgot password: send a reset link. The email link lands on /auth/callback,
// which exchanges the code for a session and forwards to /reset-password.
//
// Design System v1.0 reskin (2026-07-30 polish pass): was stranded on the old
// dark "Outfit" theme (#0A0A0F bg, #7C5CFC purple) — matches nothing else in
// the funnel. Rebuilt light warm-white + brand violet, same CSS-in-JS pattern
// as /login (own IBM Plex Sans + Space Grotesk load, --spec-* tokens).
// Visual/CSS only — the submit handler, Supabase call, and copy are unchanged.

import { useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import { Mail, Check, ArrowLeft } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import { MOTION_CSS } from '@/components/motion/Motion';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-forgotpw',
  display: 'swap',
});

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const sb = createBrowserSupabaseClient();
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) setErr(error.message);
      else setSent(true);
    } catch {
      setErr('Could not send the reset email. Try again.');
    }
    setBusy(false);
  }

  return (
    <div className={`fp ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <a className="fp-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b></a>
      <div className="fp-card nxm-in">
        {sent ? (
          <>
            <div className="fp-successmark" aria-hidden="true"><Check size={20} strokeWidth={3} /></div>
            <h1>Check your email</h1>
            <p className="fp-sub">If an account exists for <b>{email}</b>, a password-reset link is on its way. Open it and choose a new password.</p>
            <a className="fp-link" href="/login"><ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" /> Back to sign in</a>
          </>
        ) : (
          <>
            <h1>Reset your password</h1>
            <p className="fp-sub">Enter your account email and we&apos;ll send you a reset link.</p>
            <form onSubmit={submit}>
              <label className="fp-field" htmlFor="fp-email">
                <span className="fp-fieldicon" aria-hidden="true"><Mail size={16} strokeWidth={1.75} /></span>
                <input
                  id="fp-email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </label>
              {err && <div className="fp-err" role="alert" aria-live="polite">{err}</div>}
              <button className="fp-btn nxm-press" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
            </form>
            <a className="fp-link" href="/login"><ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" /> Back to sign in</a>
          </>
        )}
      </div>
    </div>
  );
}

const CSS = MOTION_CSS + `
.fp{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-forgotpw),'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center;padding:40px 20px;-webkit-font-smoothing:antialiased;}
.fp *{box-sizing:border-box;}
.fp a:focus-visible,.fp button:focus-visible,.fp input:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.fp-brand{color:var(--spec-ink,#141320);text-decoration:none;margin-bottom:26px;}
.fp-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;font-size:19px;font-weight:700;letter-spacing:-.01em;}
.fp-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}
.fp-card{width:100%;max-width:400px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:16px;padding:30px;box-shadow:0 8px 30px rgba(74,61,176,.08);}
.fp-card h1{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;font-size:22px;font-weight:700;letter-spacing:-.01em;margin-bottom:10px;color:var(--spec-ink,#141320);}
.fp-sub{color:var(--spec-text-2nd,#615F72);font-size:14px;line-height:1.6;margin-bottom:18px;}
.fp-sub b{color:var(--spec-violet-deep,#4A3DB0);}
.fp-card form{display:flex;flex-direction:column;gap:11px;}
.fp-field{position:relative;display:block;}
.fp-fieldicon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#8A87A0;display:flex;pointer-events:none;}
.fp-field input{width:100%;font-family:inherit;font-size:14.5px;padding:12px 14px 12px 40px;border-radius:12px;border:1px solid var(--spec-border,#E2DFEC);background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);outline:none;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),box-shadow var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.fp-field input::placeholder{color:#8A87A0;}
.fp-field input:hover{border-color:#C7C2DE;}
.fp-field input:focus{border-color:var(--spec-violet,#6C5CE0);background:#fff;box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.fp-btn{font-family:inherit;font-size:15px;font-weight:700;padding:13px;min-height:48px;border-radius:10px;border:none;background:var(--spec-violet,#6C5CE0);color:#fff;cursor:pointer;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.fp-btn:hover{background:var(--spec-violet-deep,#4A3DB0);}
.fp-btn:disabled{opacity:.6;cursor:wait;}
.fp-err{background:#FDF2F2;border:1px solid #F3C9C9;color:#B04A4A;font-size:13px;border-radius:10px;padding:10px 12px;}
.fp-successmark{width:44px;height:44px;border-radius:14px;background:#E9F7F0;color:#1F7A54;display:grid;place-items:center;margin-bottom:14px;}
.fp-link{display:inline-flex;align-items:center;gap:6px;margin-top:14px;color:#706D88;font-size:13.5px;text-decoration:none;transition:color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.fp-link:hover{color:var(--spec-violet-deep,#4A3DB0);}
`;
