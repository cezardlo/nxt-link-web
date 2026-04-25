'use client';

import { FormEvent, useEffect, useState } from 'react';
import { LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { PRIVATE_ACCESS_CODE, grantPrivateAccess } from '@/lib/privateAccess';

type PrivateAccessPromptProps = {
  open: boolean;
  sectionName?: string;
  onClose: () => void;
  onUnlock: () => void;
};

export function PrivateAccessPrompt({
  open,
  sectionName = 'private section',
  onClose,
  onUnlock,
}: PrivateAccessPromptProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setCode('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.trim() === PRIVATE_ACCESS_CODE) {
      grantPrivateAccess();
      setCode('');
      setError('');
      onUnlock();
      return;
    }

    setError('Wrong password. Try again.');
  }

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-[#070812]/55 px-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Private access password">
      <div className="w-full max-w-[460px] overflow-hidden rounded-[28px] border border-[#e2e6f2] bg-white text-[#111641] shadow-[0_32px_100px_rgba(3,8,21,0.34)]">
        <div className="relative bg-[linear-gradient(135deg,#f8f9fd,#eef3ff_52%,#fff7fb)] p-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-[#dce2f3] bg-white/80 text-[#5c6486] transition hover:text-[#11155f]"
            aria-label="Close password prompt"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#11155f] text-white shadow-[0_18px_40px_rgba(17,21,95,0.22)]">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.24em] text-[#7f86a8]">Password required</p>
          <h2 className="mt-2 text-3xl font-semibold text-[#11155f]">Open {sectionName}</h2>
          <p className="mt-3 text-sm leading-7 text-[#5c6486]">
            This area is for private market signals, vendor hunting, and internal strategy work.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-3 p-6">
          <label className="block text-sm font-semibold text-[#2f365f]" htmlFor="private-access-code">
            Password
          </label>
          <input
            id="private-access-code"
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
            Unlock
            <ShieldCheck className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
