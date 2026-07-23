// Branded 404 — Design System v1.0 (light warm-white, violet accent).
// Helpful exits instead of a dead end. No language toggle on this screen,
// so copy follows the same "EN / ES" one-string idiom used by other
// no-toggle screens (see src/lib/auth/oauth.ts bilingualErrors).
import Link from 'next/link';
import { IBM_Plex_Sans } from 'next/font/google';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-notfound',
  display: 'swap',
});

export default function NotFound() {
  return (
    <div className={`nf ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="nf-card">
        <a className="nf-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b></a>
        <p className="nf-code">404</p>
        <h1>Page not found / Página no encontrada</h1>
        <p className="nf-body">
          This page doesn&apos;t exist or was moved. Try the marketplace instead. /
          Esta página no existe o fue movida. Prueba el marketplace.
        </p>
        <div className="nf-actions">
          <Link href="/marketplace" className="nf-btn">
            Browse the marketplace / Ver el marketplace
          </Link>
          <Link href="/" className="nf-ghost">
            Home / Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.nf{min-height:70vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-notfound),'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',sans-serif;display:grid;place-items:center;padding:40px 20px;-webkit-font-smoothing:antialiased;}
.nf *{box-sizing:border-box;}
.nf-card{width:100%;max-width:440px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:16px;padding:32px;text-align:center;box-shadow:0 24px 60px -30px rgba(20,19,32,.25);}
.nf-brand{display:inline-block;color:var(--spec-ink,#141320);text-decoration:none;margin-bottom:14px;}
.nf-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;font-size:16px;font-weight:700;letter-spacing:.02em;}
.nf-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}
.nf-code{font-family:var(--font-ibm-plex-mono),'IBM Plex Mono',monospace;font-size:13px;font-weight:600;letter-spacing:.24em;color:var(--spec-violet,#6C5CE0);margin:0 0 6px;}
.nf h1{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;font-size:22px;font-weight:700;letter-spacing:-.01em;line-height:1.3;margin:0 0 10px;color:var(--spec-ink,#141320);}
.nf-body{font-size:14px;line-height:1.6;color:var(--spec-text-2nd,#615F72);margin:0 0 22px;}
.nf-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}
.nf-btn{display:flex;align-items:center;justify-content:center;flex:1 1 200px;font-family:inherit;font-size:14px;font-weight:700;padding:12px 16px;min-height:46px;border-radius:10px;background:var(--spec-violet,#6C5CE0);color:#fff;text-decoration:none;transition:background .15s;}
.nf-btn:hover{background:var(--spec-violet-deep,#4A3DB0);}
.nf-btn:focus-visible{outline:2px solid var(--spec-violet-deep,#4A3DB0);outline-offset:2px;}
.nf-ghost{display:flex;align-items:center;justify-content:center;flex:1 1 120px;font-family:inherit;font-size:14px;font-weight:600;padding:12px 16px;min-height:46px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-text-2nd,#615F72);text-decoration:none;transition:border-color .15s,color .15s;}
.nf-ghost:hover{border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.nf-ghost:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
`;
