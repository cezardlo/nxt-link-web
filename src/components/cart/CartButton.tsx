'use client';

// Quote-cart entry point for the site navs — live item count, EN/ES via the
// shared `nxt_lang` pattern, self-styled for the dark marketplace chrome
// (same self-contained-CSS approach as LanguageToggle).

import Link from 'next/link';
import { useCart } from './useCart';
import { useLang } from '@/components/LanguageToggle';

export default function CartButton({ className }: { className?: string }) {
  const { count } = useCart();
  const [lang] = useLang();
  const label = lang === 'es' ? 'Carrito' : 'Cart';
  return (
    <Link href="/cart" className={`nxcb ${className || ''}`} aria-label={`${label} (${count})`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </svg>
      {label}
      <span className={'nxcb-n' + (count > 0 ? ' has' : '')}>{count}</span>
    </Link>
  );
}

const CSS = `
.nxcb{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:500;color:#C0C0D0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:99px;padding:8px 14px;text-decoration:none;white-space:nowrap;cursor:pointer;}
.nxcb:hover{border-color:rgba(124,92,252,.5);color:#C4B5FD;}
.nxcb:focus-visible{outline:2px solid #7C5CFC;outline-offset:2px;}
.nxcb svg{flex-shrink:0;}
.nxcb-n{font-size:11px;font-weight:700;color:#8080A0;background:rgba(255,255,255,.08);border-radius:99px;padding:1px 7px;min-width:20px;text-align:center;}
.nxcb-n.has{background:#7C5CFC;color:#fff;}
`;
