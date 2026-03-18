'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const C = '#00D4FF';
const G = '#00FF88';
const R = '#FF3B30';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);

    try {
      const supabase = createClient();

      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/command-center` },
        });
        if (signUpError) throw signUpError;
        setSuccess('Check your email for a confirmation link.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push('/command-center');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#050508',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'IBM Plex Mono, monospace',
    }}>
      {/* Grid bg */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }} />

      <div style={{
        width: 360, padding: 32, position: 'relative',
        background: 'rgba(5,5,12,0.97)', border: '1px solid rgba(0,212,255,0.08)',
        borderRadius: 2,
      }}>
        {/* Top glow */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${C}30, transparent)`,
        }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, fontWeight: 700, color: C, letterSpacing: '0.08em' }}>
            NXT{'/'}{'/'} LINK
          </span>
          <div style={{ fontSize: 8, color: 'rgba(0,212,255,0.3)', letterSpacing: '0.2em', marginTop: 6 }}>
            {mode === 'login' ? 'AUTHENTICATE' : 'CREATE ACCOUNT'}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 7, color: 'rgba(0,212,255,0.4)', letterSpacing: '0.12em', display: 'block', marginBottom: 4 }}>
              EMAIL
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus
              style={{
                width: '100%', height: 36, background: 'rgba(0,212,255,0.03)',
                border: '1px solid rgba(0,212,255,0.1)', borderRadius: 2,
                padding: '0 12px', fontSize: 12, color: C, outline: 'none',
                fontFamily: 'IBM Plex Mono, monospace', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 7, color: 'rgba(0,212,255,0.4)', letterSpacing: '0.12em', display: 'block', marginBottom: 4 }}>
              PASSWORD
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required minLength={6}
              style={{
                width: '100%', height: 36, background: 'rgba(0,212,255,0.03)',
                border: '1px solid rgba(0,212,255,0.1)', borderRadius: 2,
                padding: '0 12px', fontSize: 12, color: C, outline: 'none',
                fontFamily: 'IBM Plex Mono, monospace', boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{ marginBottom: 12, padding: '8px 10px', background: 'rgba(255,59,48,0.06)', border: `1px solid ${R}25`, borderRadius: 2 }}>
              <span style={{ fontSize: 9, color: R }}>{error}</span>
            </div>
          )}

          {success && (
            <div style={{ marginBottom: 12, padding: '8px 10px', background: 'rgba(0,255,136,0.06)', border: `1px solid ${G}25`, borderRadius: 2 }}>
              <span style={{ fontSize: 9, color: G }}>{success}</span>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', height: 40,
              background: loading ? 'rgba(0,212,255,0.05)' : `${C}10`,
              border: `1px solid ${C}40`, borderRadius: 2, cursor: loading ? 'wait' : 'pointer',
              fontSize: 11, color: C, letterSpacing: '0.12em',
              fontFamily: 'IBM Plex Mono, monospace', transition: 'all 0.15s',
            }}
          >
            {loading ? 'PROCESSING...' : mode === 'login' ? 'ENTER' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 9, color: 'rgba(0,212,255,0.35)', letterSpacing: '0.08em',
              fontFamily: 'IBM Plex Mono, monospace',
            }}
          >
            {mode === 'login' ? 'CREATE NEW ACCOUNT →' : '← BACK TO LOGIN'}
          </button>
        </div>

        {/* Skip for now */}
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <a href="/command-center" style={{
            fontSize: 8, color: 'rgba(0,212,255,0.2)', textDecoration: 'none',
            letterSpacing: '0.08em',
          }}>
            CONTINUE WITHOUT LOGIN
          </a>
        </div>
      </div>

      {/* Scanline */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 80,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.008) 2px, rgba(0,212,255,0.008) 4px)',
      }} />
    </div>
  );
}
