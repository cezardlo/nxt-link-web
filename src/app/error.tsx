'use client';

import Link from 'next/link';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-mono">
      <div className="w-full max-w-lg border border-[#ff3b30]/25 bg-black/92 backdrop-blur-md rounded-sm p-8">

        {/* Header label */}
        <p className="text-[9px] tracking-[0.2em] text-[#ff3b30]/60 uppercase mb-3">
          NXT//LINK — SYSTEM ERROR
        </p>

        {/* Error heading */}
        <h2 className="text-[#ff3b30] text-sm tracking-widest uppercase font-mono mb-4">
          SOMETHING WENT WRONG
        </h2>

        {/* Divider */}
        <div className="h-px bg-[#ff3b30]/20 mb-4" />

        {/* Error message */}
        <p className="text-white/60 text-[10px] tracking-wide leading-relaxed mb-6">
          {error.message || 'An unexpected error occurred. The operation could not be completed.'}
        </p>

        {/* Digest */}
        {error.digest && (
          <p className="text-[9px] tracking-[0.15em] text-white/30 mb-6 uppercase">
            REF: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 border border-[#ff3b30]/40 text-[#ff3b30] text-[10px] tracking-[0.2em] uppercase hover:bg-[#ff3b30]/10 transition-colors"
          >
            TRY AGAIN
          </button>
          <Link
            href="/map"
            className="px-4 py-2 border border-white/10 text-white/50 text-[10px] tracking-[0.2em] uppercase hover:bg-white/5 hover:text-white/70 transition-colors"
          >
            ← BACK TO MAP
          </Link>
        </div>

      </div>
    </div>
  );
}
