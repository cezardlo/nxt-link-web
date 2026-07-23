'use client';

// Global error boundary — Design System v1.0 (light warm-white, violet
// accent). Replaces the old red-on-black "SYSTEM ERROR" console look.
// No language toggle on this screen (it can render from a broken layout),
// so copy follows the same "EN / ES" one-string idiom already used by
// other no-toggle screens (see src/lib/auth/oauth.ts bilingualErrors).
// Same two actions as before: Try again (calls reset) + Back to marketplace.

import Link from 'next/link';
import { IBM_Plex_Sans } from 'next/font/google';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-error',
  display: 'swap',
});

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className={`ep ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ep-card">
        <div className="ep-icon" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </div>
        <a className="ep-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b></a>
        <h1>Something went wrong / Algo salió mal</h1>
        <p className="ep-body">
          We hit a snag loading this page. Try again, or head back to the marketplace. /
          Tuvimos un problema al cargar esta página. Intenta de nuevo o vuelve al marketplace.
        </p>
        {error.digest && (
          <p className="ep-ref">Reference / Referencia: {error.digest}</p>
        )}
        <div className="ep-actions">
          <button type="button" onClick={reset} className="ep-btn">
            Try again / Intentar de nuevo
          </button>
          <Link href="/marketplace" className="ep-ghost">
            ← Back to marketplace / Volver al marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.ep{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-error),'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;padding:40px 20px;-webkit-font-smoothing:antialiased;}
.ep *{box-sizing:border-box;}
.ep-card{width:100%;max-width:440px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:16px;padding:32px;text-align:center;box-shadow:0 24px 60px -30px rgba(20,19,32,.25);}
.ep-icon{width:48px;height:48px;margin:0 auto 16px;display:grid;place-items:center;border-radius:50%;background:rgba(206,75,67,.1);color:var(--spec-error,#CE4B43);}
.ep-brand{display:inline-block;color:var(--spec-ink,#141320);text-decoration:none;margin-bottom:18px;}
.ep-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;font-size:16px;font-weight:700;letter-spacing:.02em;}
.ep-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}
.ep h1{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;font-size:21px;font-weight:700;letter-spacing:-.01em;line-height:1.3;margin:0 0 10px;color:var(--spec-ink,#141320);}
.ep-body{font-size:14px;line-height:1.6;color:var(--spec-text-2nd,#615F72);margin:0 0 18px;}
.ep-ref{font-family:var(--font-ibm-plex-mono),'IBM Plex Mono',monospace;font-size:11px;color:var(--spec-text-2nd,#615F72);background:var(--spec-surface,#EFEDF5);border-radius:8px;padding:8px 10px;margin:0 0 20px;word-break:break-all;}
.ep-actions{display:flex;flex-direction:column;gap:10px;}
.ep-btn{font-family:inherit;font-size:14.5px;font-weight:700;padding:13px;min-height:48px;border-radius:10px;border:none;background:var(--spec-violet,#6C5CE0);color:#fff;cursor:pointer;transition:background .15s;}
.ep-btn:hover{background:var(--spec-violet-deep,#4A3DB0);}
.ep-btn:focus-visible{outline:2px solid var(--spec-violet-deep,#4A3DB0);outline-offset:2px;}
.ep-ghost{display:flex;align-items:center;justify-content:center;font-family:inherit;font-size:14px;font-weight:600;padding:12px;min-height:46px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:none;color:var(--spec-text-2nd,#615F72);text-decoration:none;transition:border-color .15s,color .15s;}
.ep-ghost:hover{border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.ep-ghost:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
`;
