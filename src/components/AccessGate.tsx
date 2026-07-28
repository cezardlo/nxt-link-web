'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { hasPrivateAccess, requestPrivateAccess } from '@/lib/privateAccess';

type AccessGateProps = {
  children: ReactNode;
  title?: string;
};

export function AccessGate({ children, title = 'NXT//LINK Operator Console' }: AccessGateProps) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setUnlocked(hasPrivateAccess());
    setReady(true);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await requestPrivateAccess(code.trim());
    setBusy(false);
    if (result.ok) {
      setUnlocked(true);
      return;
    }
    setError(result.message || 'Wrong code. Try again.');
  }

  if (!ready) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#F8F7FB] px-4 py-28 text-[#141320] sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-10rem)] max-w-[920px] place-items-center">
        <div className="w-full max-w-[520px] rounded-[28px] border border-[#E2DFEC] bg-white/90 p-7 shadow-[0_20px_70px_rgba(20,19,32,0.10)] backdrop-blur-xl sm:p-9">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6C5CE0] text-white shadow-[0_18px_40px_rgba(108,92,224,0.28)]">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#615F72]">Access required</p>
          <h1 className="mt-3 text-3xl font-semibold text-[#141320]">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-[#615F72]">
            Internal tools for reviewing vendors, applications, and deals. Enter the access code to continue.
          </p>
          <form onSubmit={submit} className="mt-7 space-y-3">
            <label className="block text-sm font-semibold text-[#141320]" htmlFor="access-code">
              Password
            </label>
            <input
              id="access-code"
              type="password"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="w-full rounded-xl border border-[#E2DFEC] bg-[#F8F7FB] px-4 py-3 text-lg font-semibold tracking-[0.2em] text-[#141320] outline-none transition focus:border-[#6C5CE0] focus:bg-white focus:ring-2 focus:ring-[#A99DF2]/40"
              placeholder="••••"
              autoFocus
            />
            {error && <p className="text-sm font-medium text-[#CE4B43]">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6C5CE0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4A3DB0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A99DF2] disabled:opacity-60"
            >
              {busy ? 'Checking…' : 'Unlock workspace'}
              <ShieldCheck className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-5 text-xs leading-6 text-[#615F72]">
            The code is verified server-side and never ships with the page.
          </p>
        </div>
      </div>
    </div>
  );
}
