'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';

const ACCESS_CODE = '4444';
const STORAGE_KEY = 'nxt-link-private-access';

type AccessGateProps = {
  children: ReactNode;
  title?: string;
};

export function AccessGate({ children, title = 'Private NXT Link workspace' }: AccessGateProps) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setUnlocked(window.localStorage.getItem(STORAGE_KEY) === ACCESS_CODE);
    setReady(true);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.trim() === ACCESS_CODE) {
      window.localStorage.setItem(STORAGE_KEY, ACCESS_CODE);
      setUnlocked(true);
      setError('');
      return;
    }
    setError('Wrong code. Try again.');
  }

  if (!ready) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8f9fd_0%,#eef3ff_52%,#fff7fb_100%)] px-4 py-28 text-[#111641] sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-10rem)] max-w-[920px] place-items-center">
        <div className="w-full max-w-[520px] rounded-[28px] border border-[#e2e6f2] bg-white/90 p-7 shadow-[0_32px_100px_rgba(52,64,110,0.16)] backdrop-blur-xl sm:p-9">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#11155f] text-white shadow-[0_18px_40px_rgba(17,21,95,0.22)]">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#7f86a8]">Access required</p>
          <h1 className="mt-3 text-3xl font-semibold text-[#11155f]">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-[#5c6486]">
            Markets and Signals are for internal research, vendor hunting, and strategy work. Enter the access code to continue.
          </p>
          <form onSubmit={submit} className="mt-7 space-y-3">
            <label className="block text-sm font-semibold text-[#2f365f]" htmlFor="access-code">
              Password
            </label>
            <input
              id="access-code"
              type="password"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="w-full rounded-xl border border-[#d8deef] bg-[#f8f9fd] px-4 py-3 text-lg font-semibold tracking-[0.2em] text-[#11155f] outline-none transition focus:border-[#11155f] focus:bg-white"
              placeholder="••••"
              autoFocus
            />
            {error && <p className="text-sm font-medium text-[#b4235f]">{error}</p>}
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#11155f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d2382]"
            >
              Unlock workspace
              <ShieldCheck className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-5 text-xs leading-6 text-[#7f86a8]">
            This is a lightweight website gate for private viewing, not bank-level security.
          </p>
        </div>
      </div>
    </div>
  );
}
