'use client';

// THE shared EN|ES segmented language toggle for every vendor-facing surface
// (experience-design plan Wave 0: "shared LanguageToggle + i18n helper").
// One look, one storage key (`nxt_lang`), light + dark variants. Pages keep
// their own dictionaries; this component only owns the switch + persistence.

import { useEffect, useState } from 'react';

export type Lang = 'en' | 'es';

export function readStoredLang(): Lang | null {
  try {
    const s = localStorage.getItem('nxt_lang');
    return s === 'es' || s === 'en' ? s : null;
  } catch { return null; }
}

/** Language state persisted app-wide in `nxt_lang`. */
export function useLang(initial: Lang = 'en'): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>(initial);
  useEffect(() => {
    const stored = readStoredLang();
    if (stored) setLang(stored);
  }, []);
  const switchLang = (l: Lang) => {
    setLang(l);
    try { localStorage.setItem('nxt_lang', l); } catch { /* private mode */ }
  };
  return [lang, switchLang];
}

export default function LanguageToggle({
  lang, onChange, variant = 'light', className,
}: { lang: Lang; onChange: (l: Lang) => void; variant?: 'light' | 'dark'; className?: string }) {
  return (
    <div className={`nxlt nxlt-${variant} ${className || ''}`} role="group" aria-label="Language / Idioma">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {(['en', 'es'] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          className={lang === l ? 'on' : ''}
          aria-pressed={lang === l}
          onClick={() => onChange(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

const CSS = `
.nxlt{display:inline-flex;border-radius:10px;overflow:hidden;flex-shrink:0;}
.nxlt button{font-family:inherit;font-size:12.5px;font-weight:700;letter-spacing:.04em;padding:8px 14px;min-height:36px;border:none;background:none;cursor:pointer;}
.nxlt button:focus-visible{outline:2px solid #6C5CE0;outline-offset:-2px;}
.nxlt-light{border:1px solid #E2DFEC;background:#fff;}
.nxlt-light button{color:#615F72;}
.nxlt-light button.on{background:#6C5CE0;color:#fff;}
.nxlt-dark{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);}
.nxlt-dark button{color:#8080A0;}
.nxlt-dark button.on{background:rgba(124,92,252,.2);color:#C4B5FD;}
`;
