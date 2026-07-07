'use client';

// Create account: choose Buyer or Vendor (operator accounts are granted by
// the NXT Link team, never self-served). Sends the Supabase confirmation
// email; the account stays limited until the email is verified.

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';

type Role = 'client' | 'vendor';

export default function SignupPage() {
  const [role, setRole] = useState<Role>('client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const sb = createBrowserSupabaseClient();
      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { role },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) { setErr(error.message); setBusy(false); return; }
      if (data.session) {
        // Email confirmation is disabled in project settings — go straight in.
        await fetch('/api/auth/me');
        window.location.href = role === 'vendor' ? '/vendor/listings' : '/marketplace';
        return;
      }
      setSent(true);
    } catch {
      setErr('Could not create the account. Try again.');
    }
    setBusy(false);
  }

  return (
    <div className="su">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <a className="su-brand" href="/"><b>NXT<i>//</i>LINK</b></a>

      {sent ? (
        <div className="su-card">
          <h1>Check your email</h1>
          <p className="su-sub">
            We sent a confirmation link to <b>{email}</b>. Click it to verify your
            account, and you&apos;ll be signed in automatically.
          </p>
          <p className="su-hint">
            Until your email is verified, {role === 'vendor' ? 'you can build listings but not publish them.' : 'some actions stay limited.'}
          </p>
          <a className="su-link" href="/login">Already confirmed? Sign in</a>
        </div>
      ) : (
        <div className="su-card">
          <h1>Create your account</h1>
          <p className="su-sub">Free to join. Choose what you are here to do:</p>

          <div className="su-roles">
            <button type="button" className={'su-role' + (role === 'client' ? ' on' : '')} onClick={() => setRole('client')}>
              <b>Buyer</b>
              <span>Browse, compare, and request quotes from verified vendors.</span>
            </button>
            <button type="button" className={'su-role' + (role === 'vendor' ? ' on' : '')} onClick={() => setRole('vendor')}>
              <b>Vendor</b>
              <span>Build your storefront, publish listings, receive leads.</span>
            </button>
          </div>

          <form onSubmit={submit}>
            <input type="email" placeholder="Work email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <input type="password" placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
            {err && <div className="su-err">{err}</div>}
            <button className="su-btn" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
          </form>

          <p className="su-hint">
            NXT Link operator? Team accounts are granted internally — <a href="/login">sign in here</a>.
          </p>
          <a className="su-link" href="/login">Already have an account? Sign in</a>
        </div>
      )}
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
.su{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;padding:40px 20px;-webkit-font-smoothing:antialiased;}
.su *{box-sizing:border-box;}
.su-brand{color:#F0F0F5;text-decoration:none;margin-bottom:26px;}
.su-brand b{font-size:19px;}.su-brand i{color:#A78BFA;font-style:normal;}
.su-card{width:100%;max-width:440px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:20px;padding:30px;}
.su-card h1{font-size:23px;font-weight:800;letter-spacing:-.02em;}
.su-sub{color:#9A97AF;font-size:14px;line-height:1.6;margin:8px 0 18px;}
.su-roles{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;}
.su-role{font-family:inherit;text-align:left;background:#111118;border:1.5px solid rgba(255,255,255,.1);border-radius:13px;padding:14px;cursor:pointer;color:#F0F0F5;display:flex;flex-direction:column;gap:6px;}
.su-role.on{border-color:#7C5CFC;background:rgba(124,92,252,.08);}
.su-role b{font-size:14.5px;}
.su-role span{font-size:12px;color:#9A97AF;line-height:1.45;}
.su-card form{display:flex;flex-direction:column;gap:11px;}
.su-card input{font-family:inherit;font-size:14.5px;padding:12px 14px;border-radius:11px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;color:#F0F0F5;outline:none;}
.su-card input:focus{border-color:#7C5CFC;}
.su-btn{font-family:inherit;font-size:15px;font-weight:700;padding:13px;border-radius:11px;border:none;background:#7C5CFC;color:#fff;cursor:pointer;}
.su-btn:hover{background:#6344DF;}.su-btn:disabled{opacity:.6;}
.su-err{color:#FCA5A5;font-size:13px;}
.su-hint{color:#63607A;font-size:12.5px;line-height:1.6;margin:16px 0 0;}
.su-hint a{color:#9A97AF;}
.su-link{display:block;margin-top:12px;color:#A78BFA;font-size:13.5px;text-decoration:none;}
`;
