'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';

type Tab = 'login' | 'signup';

export default function AuthPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    const supabase = createBrowserSupabaseClient();

    if (tab === 'login') {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      router.push('/map');
    } else {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      setSuccessMsg('Check your email to confirm your account.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div
        className="max-w-sm w-full bg-black/92 border border-white/8 backdrop-blur-md rounded-sm p-8"
        style={{ boxShadow: '0 0 40px rgba(0,212,255,0.04)' }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <span
            className="font-mono text-[14px] tracking-[0.3em] text-[#00d4ff]/60"
            style={{ fontFamily: 'IBM Plex Mono, monospace' }}
          >
            NXT//LINK
          </span>
        </div>

        {/* Tab toggle */}
        <div className="flex mb-6 gap-1">
          {(['login', 'signup'] as Tab[]).map((t) => {
            const isActive = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={[
                  'flex-1 py-1.5 font-mono text-[8px] tracking-[0.15em] uppercase rounded-sm transition-all duration-150',
                  isActive
                    ? 'border border-[#00d4ff]/50 bg-[#00d4ff]/15 text-[#00d4ff]'
                    : 'border border-white/8 bg-transparent text-white/30 hover:text-white/50 hover:bg-white/5',
                ].join(' ')}
                style={{ fontFamily: 'IBM Plex Mono, monospace' }}
              >
                {t === 'login' ? 'LOGIN' : 'SIGN UP'}
              </button>
            );
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="font-mono text-[8px] tracking-[0.2em] text-white/30 uppercase"
              style={{ fontFamily: 'IBM Plex Mono, monospace' }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.08] font-mono text-[10px] text-white/70 p-3 rounded-sm w-full focus:border-white/20 focus:outline-none transition-colors"
              style={{ fontFamily: 'IBM Plex Mono, monospace' }}
              placeholder="operator@nxtlink.com"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="font-mono text-[8px] tracking-[0.2em] text-white/30 uppercase"
              style={{ fontFamily: 'IBM Plex Mono, monospace' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.08] font-mono text-[10px] text-white/70 p-3 rounded-sm w-full focus:border-white/20 focus:outline-none transition-colors"
              style={{ fontFamily: 'IBM Plex Mono, monospace' }}
              placeholder="••••••••"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 border border-[#ff3b30]/30 bg-[#ff3b30]/[0.06] rounded-sm">
              <p
                className="font-mono text-[9px] text-[#ff3b30]/80"
                style={{ fontFamily: 'IBM Plex Mono, monospace' }}
              >
                {error}
              </p>
            </div>
          )}

          {/* Success */}
          {successMsg && (
            <div className="p-3 border border-[#00ff88]/30 bg-[#00ff88]/[0.06] rounded-sm">
              <p
                className="font-mono text-[9px] text-[#00ff88]/80"
                style={{ fontFamily: 'IBM Plex Mono, monospace' }}
              >
                {successMsg}
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full font-mono text-[9px] tracking-wider py-2.5 rounded-sm font-bold bg-[#00d4ff]/10 border border-[#00d4ff]/50 text-[#00d4ff] hover:bg-[#00d4ff]/20 transition-all duration-150 disabled:opacity-30 mt-1"
            style={{ fontFamily: 'IBM Plex Mono, monospace' }}
          >
            {loading ? (
              <span className="loading-dots">
                {tab === 'login' ? 'AUTHENTICATING' : 'CREATING ACCOUNT'}
              </span>
            ) : tab === 'login' ? (
              'ACCESS PLATFORM'
            ) : (
              'CREATE ACCOUNT'
            )}
          </button>
        </form>

        {/* Footer */}
        <p
          className="font-mono text-[7px] tracking-[0.15em] text-white/15 text-center mt-6 uppercase"
          style={{ fontFamily: 'IBM Plex Mono, monospace' }}
        >
          NXT LINK — Technology Intelligence Platform
        </p>
      </div>
    </div>
  );
}
