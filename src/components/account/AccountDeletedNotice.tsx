'use client';

// A small, self-contained bilingual banner shown on the homepage after a user
// deletes their account (POST /api/account/delete redirects to /?deleted=1).
// Reads the query param on mount, then strips it from the URL so a refresh
// doesn't re-show it. Dismissible. No marketing copy — a short neutral notice.

import { useEffect, useState } from 'react';
import type { Lang } from '@/components/LanguageToggle';

const STR: Record<Lang, { msg: string; close: string }> = {
  en: { msg: 'Your account has been deleted.', close: 'Dismiss' },
  es: { msg: 'Tu cuenta ha sido eliminada.', close: 'Cerrar' },
};

export default function AccountDeletedNotice({ lang }: { lang: Lang }) {
  const [show, setShow] = useState(false);
  const t = STR[lang] || STR.en;

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('deleted') === '1') {
        setShow(true);
        params.delete('deleted');
        const qs = params.toString();
        const url = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
        window.history.replaceState(null, '', url);
      }
    } catch { /* SSR / no window */ }
  }, []);

  if (!show) return null;

  return (
    <div className="adn" role="status" aria-live="polite">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <span className="adn-dot" aria-hidden="true" />
      <span className="adn-msg">{t.msg}</span>
      <button type="button" className="adn-x" onClick={() => setShow(false)} aria-label={t.close}>×</button>
    </div>
  );
}

const CSS = `
.adn{display:flex;align-items:center;gap:12px;max-width:960px;margin:16px auto 0;padding:12px 16px;border-radius:12px;background:#F1EFFA;border:1px solid #D9D3F0;color:#2E2A45;font-size:14px;font-weight:500;}
.adn-dot{width:8px;height:8px;border-radius:50%;background:#6C5CE0;flex-shrink:0;}
.adn-msg{flex:1;}
.adn-x{border:none;background:none;color:#6B6784;font-size:20px;line-height:1;cursor:pointer;padding:0 4px;border-radius:6px;}
.adn-x:hover{color:#2E2A45;}
.adn-x:focus-visible{outline:2px solid #6C5CE0;outline-offset:2px;}
@media (prefers-color-scheme: dark){
  .adn{background:rgba(124,92,252,.12);border-color:rgba(124,92,252,.3);color:#E6E3F5;}
  .adn-x{color:#B5AEd6;}
  .adn-x:hover{color:#fff;}
}
`;
