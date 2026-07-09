'use client';

// Forgot password: send a reset link. The email link lands on /auth/callback,
// which exchanges the code for a session and forwards to /reset-password.

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';

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
    <div className="fp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <a className="fp-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b></a>
      <div className="fp-card">
        {sent ? (
          <>
            <h1>Check your email</h1>
            <p className="fp-sub">If an account exists for <b>{email}</b>, a password-reset link is on its way. Open it and choose a new password.</p>
            <a className="fp-link" href="/login">Back to sign in</a>
          </>
        ) : (
          <>
            <h1>Reset your password</h1>
            <p className="fp-sub">Enter your account email and we&apos;ll send you a reset link.</p>
            <form onSubmit={submit}>
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              {err && <div className="fp-err">{err}</div>}
              <button className="fp-btn" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
            </form>
            <a className="fp-link" href="/login">Back to sign in</a>
          </>
        )}
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
.fp{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;padding:40px 20px;-webkit-font-smoothing:antialiased;}
.fp *{box-sizing:border-box;}
.fp-brand{color:#F0F0F5;text-decoration:none;margin-bottom:26px;}
.fp-brand b{font-size:19px;}.fp-brand i{color:#A78BFA;font-style:normal;}
.fp-card{width:100%;max-width:400px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:20px;padding:30px;}
.fp-card h1{font-size:22px;font-weight:800;letter-spacing:-.02em;margin-bottom:10px;}
.fp-sub{color:#9A97AF;font-size:14px;line-height:1.6;margin-bottom:18px;}
.fp-sub b{color:#C4B5FD;}
.fp-card form{display:flex;flex-direction:column;gap:11px;}
.fp-card input{font-family:inherit;font-size:14.5px;padding:12px 14px;border-radius:11px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;color:#F0F0F5;outline:none;}
.fp-card input:focus{border-color:#7C5CFC;}
.fp-btn{font-family:inherit;font-size:15px;font-weight:700;padding:13px;border-radius:11px;border:none;background:#7C5CFC;color:#fff;cursor:pointer;}
.fp-btn:hover{background:#6344DF;}.fp-btn:disabled{opacity:.6;}
.fp-err{color:#FCA5A5;font-size:13px;}
.fp-link{display:block;margin-top:14px;color:#A78BFA;font-size:13.5px;text-decoration:none;}
`;
