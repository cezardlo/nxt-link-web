'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 p-6 text-slate-100">
        <div className="mx-auto max-w-2xl rounded-lg border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Application error</h2>
          <p className="mt-2 text-sm text-slate-300">
            {error.message || 'A global error occurred.'}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
