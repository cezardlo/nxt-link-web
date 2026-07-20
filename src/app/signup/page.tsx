'use client';

// Create account — two clear steps:
//   1) Choose account type first: Buyer, or Vendor/Supplier (+ business type).
//   2) Enter email + password.
// Operator accounts are granted by the NXT Link team, never self-served.
// Sends the Supabase confirmation email; the account stays limited until
// the email is verified.

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';

type Role = 'client' | 'vendor';
type Step = 'type' | 'details';

// Vendor/supplier business types (maturity + kind) captured at signup and
// stored in user metadata for the vendor's fit profile. See MARKETPLACE_BLUEPRINT §4.
const VENDOR_TYPES = [
  'Manufacturer',
  'Distributor / Supplier',
  'Service provider',
  'System integrator',
  'Consultant',
  'Startup / emerging',
  'Other',
];

export default function SignupPage() {
  const [step, setStep] = useState<Step>('type');
  const [role, setRole] = useState<Role | null>(null);
  const [vendorType, setVendorType] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const canContinue = role === 'client' || (role === 'vendor' && !!vendorType);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setBusy(true); setErr('');
    try {
      const sb = createBrowserSupabaseClient();
      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { role, vendor_type: role === 'vendor' ? vendorType : null },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) { setErr(error.message); setBusy(false); return; }
      if (data.session) {
        // Email confirmation disabled in project settings — go straight in.
        await fetch('/api/auth/me');
        window.location.href = role === 'vendor' ? '/vendor/start' : '/buyer';
        return;
      }
      setSent(true);
    } catch {
      setErr('Could not create the account. Try again.');
    }
    setBusy(false);
  }

  const roleLabel = role === 'vendor' ? (vendorType ? `Vendor · ${vendorType}` : 'Vendor / Supplier') : 'Buyer';

  return (
    <div className="su">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <a className="su-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b></a>

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
      ) : step === 'type' ? (
        <div className="su-card">
          <h1>Create your account</h1>
          <p className="su-sub">First, what brings you to NXT//LINK?</p>

          <div className="su-roles">
            <button type="button" className={'su-role' + (role === 'client' ? ' on' : '')} onClick={() => { setRole('client'); setVendorType(''); }}>
              <b>I&apos;m a Buyer</b>
              <span>Find, compare, and request quotes from verified industrial vendors.</span>
            </button>
            <button type="button" className={'su-role' + (role === 'vendor' ? ' on' : '')} onClick={() => setRole('vendor')}>
              <b>I&apos;m a Vendor / Supplier</b>
              <span>Build a storefront, publish products or services, and receive qualified leads.</span>
            </button>
          </div>

          {role === 'vendor' && (
            <div className="su-vtype">
              <div className="su-vlabel">What type of business are you?</div>
              <div className="su-chips">
                {VENDOR_TYPES.map((t) => (
                  <button type="button" key={t} className={'su-chip' + (vendorType === t ? ' on' : '')} onClick={() => setVendorType(t)}>{t}</button>
                ))}
              </div>
            </div>
          )}

          <button className="su-btn" type="button" disabled={!canContinue} onClick={() => setStep('details')}>
            Continue
          </button>

          <p className="su-hint">
            NXT Link operator? Team accounts are granted internally — <a href="/login">sign in here</a>.
          </p>
          <a className="su-link" href="/login">Already have an account? Sign in</a>
        </div>
      ) : (
        <div className="su-card">
          <button className="su-back" type="button" onClick={() => setStep('type')}>← Change account type</button>
          <h1>Create your account</h1>
          <p className="su-sub">Account type: <b>{roleLabel}</b></p>

          <form onSubmit={submit}>
            <input type="email" placeholder="Work email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus />
            <div className="su-pwrow">
              <input type={showPw ? 'text' : 'password'} placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
              <button type="button" className="su-pwtoggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>{showPw ? 'Hide' : 'Show'}</button>
            </div>
            {err && <div className="su-err">{err}</div>}
            <button className="su-btn" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
            <p className="su-legal">By creating an account you agree to the <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.</p>
          </form>

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
.su-card{width:100%;max-width:460px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:20px;padding:30px;}
.su-card h1{font-size:23px;font-weight:800;letter-spacing:-.02em;}
.su-sub{color:#9A97AF;font-size:14px;line-height:1.6;margin:8px 0 18px;}
.su-sub b{color:#C4B5FD;}
.su-roles{display:flex;flex-direction:column;gap:10px;margin-bottom:16px;}
.su-role{font-family:inherit;text-align:left;background:#111118;border:1.5px solid rgba(255,255,255,.1);border-radius:13px;padding:16px;cursor:pointer;color:#F0F0F5;display:flex;flex-direction:column;gap:6px;}
.su-role:hover{border-color:rgba(124,92,252,.5);}
.su-role.on{border-color:#7C5CFC;background:rgba(124,92,252,.08);}
.su-role b{font-size:15px;}
.su-role span{font-size:12.5px;color:#9A97AF;line-height:1.45;}
.su-vtype{margin-bottom:18px;}
.su-vlabel{font-size:13px;font-weight:600;color:#C0C0D0;margin-bottom:10px;}
.su-chips{display:flex;flex-wrap:wrap;gap:8px;}
.su-chip{font-family:inherit;font-size:12.5px;font-weight:500;padding:8px 13px;border-radius:99px;border:1px solid rgba(255,255,255,.14);background:none;color:#C0C0D0;cursor:pointer;}
.su-chip:hover{border-color:rgba(124,92,252,.5);color:#C4B5FD;}
.su-chip.on{background:rgba(124,92,252,.15);border-color:#7C5CFC;color:#C4B5FD;}
.su-back{background:none;border:none;color:#A78BFA;font:inherit;font-size:13px;cursor:pointer;padding:0;margin-bottom:14px;}
.su-pwrow{position:relative;display:flex;}
.su-pwrow input{flex:1;padding-right:62px !important;width:100%;}
.su-pwtoggle{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:#8080A0;font:600 12px 'Outfit',sans-serif;cursor:pointer;padding:6px;}
.su-pwtoggle:hover{color:#C4B5FD;}
.su-card form{display:flex;flex-direction:column;gap:11px;}
.su-card input{font-family:inherit;font-size:14.5px;padding:12px 14px;border-radius:11px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;color:#F0F0F5;outline:none;}
.su-card input:focus{border-color:#7C5CFC;}
.su-btn{font-family:inherit;font-size:15px;font-weight:700;padding:13px;border-radius:11px;border:none;background:#7C5CFC;color:#fff;cursor:pointer;width:100%;margin-top:4px;}
.su-btn:hover{background:#6344DF;}.su-btn:disabled{opacity:.45;cursor:not-allowed;}
.su-err{color:#FCA5A5;font-size:13px;}
.su-legal{color:#63607A;font-size:11.5px;line-height:1.5;margin:2px 0 0;}
.su-legal a{color:#9A97AF;}
.su-hint{color:#63607A;font-size:12.5px;line-height:1.6;margin:16px 0 0;}
.su-hint a{color:#9A97AF;}
.su-link{display:block;margin-top:12px;color:#A78BFA;font-size:13.5px;text-decoration:none;}
`;
