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
      <body style={{ margin: 0, backgroundColor: '#000', color: '#fff', fontFamily: "'IBM Plex Mono', monospace" }}>
        {/* Same card design as error.tsx: centered, black bg, red accent, font-mono */}
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{
            maxWidth: '28rem',
            width: '100%',
            border: '1px solid rgba(255,59,48,0.25)',
            backgroundColor: 'rgba(0,0,0,0.92)',
            borderRadius: '2px',
            padding: '2rem'
          }}>
            <div style={{ fontSize: '8px', letterSpacing: '0.3em', color: 'rgba(255,59,48,0.5)', marginBottom: '1rem' }}>
              NXT//LINK — CRITICAL SYSTEM ERROR
            </div>
            <div style={{ fontSize: '13px', letterSpacing: '0.15em', color: '#ff3b30', marginBottom: '1rem' }}>
              SYSTEM FAILURE
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              {error.message || 'An unexpected error occurred. The application could not recover.'}
            </div>
            {error.digest && (
              <div style={{ fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)', marginBottom: '1rem' }}>
                REF: {error.digest}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={reset}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '9px',
                  letterSpacing: '0.2em',
                  color: '#ff3b30',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(255,59,48,0.4)',
                  borderRadius: '2px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                }}
              >
                TRY AGAIN
              </button>
              <a
                href="/map"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '9px',
                  letterSpacing: '0.2em',
                  color: 'rgba(255,255,255,0.3)',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                ← BACK TO MAP
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
