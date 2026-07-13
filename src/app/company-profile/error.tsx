'use client';

export default function CompanyProfileError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-nxt-bg px-6 text-center text-nxt-text">
      <div className="max-w-md rounded-3xl border border-white/[0.08] bg-white/[0.025] p-8">
        <h1 className="text-xl font-semibold text-white">The company profile could not load</h1>
        <p className="mt-3 text-sm leading-6 text-nxt-muted">Reload the form and try saving your marketplace preferences again.</p>
        <button type="button" onClick={reset} className="mt-6 rounded-full bg-nxt-accent px-5 py-2.5 text-sm font-semibold text-white">
          Reload profile
        </button>
      </div>
    </main>
  );
}
