'use client';

// "Add to cart" toggle used on listing cards and the listing detail page.
// Bilingual labels live here (shared `nxt_lang` pattern); each surface passes
// its own design-system classes so the button matches the page it sits on.

import { useCart } from './useCart';
import { useLang } from '@/components/LanguageToggle';

export interface CartListing {
  id: string;
  kind: 'product' | 'service';
  name: string;
  vendor_id?: string | null;
  vendor_name?: string | null;
}

export default function AddToCartButton({
  listing, className, activeClassName = 'on', showHint = false,
}: {
  listing: CartListing;
  className?: string;
  activeClassName?: string;
  showHint?: boolean;
}) {
  const { has, toggle } = useCart();
  const [lang] = useLang();
  const inCart = has(listing.id);
  const label = inCart
    ? (lang === 'es' ? 'En el carrito ✓' : 'In cart ✓')
    : (lang === 'es' ? 'Añadir al carrito' : 'Add to cart');
  const hint = lang === 'es'
    ? 'Reúne varias publicaciones y envía una sola solicitud de cotización agrupada.'
    : 'Collect several listings and send one bundled quote request.';
  return (
    <>
      <button
        type="button"
        className={`${className || ''}${inCart ? ` ${activeClassName}` : ''}`}
        aria-pressed={inCart}
        onClick={() => toggle({
          id: listing.id,
          kind: listing.kind,
          name: listing.name,
          vendor_id: listing.vendor_id || null,
          vendor_name: listing.vendor_name || null,
        })}
      >
        {label}
      </button>
      {showHint && (
        <p className="nxatc-hint">
          <style dangerouslySetInnerHTML={{ __html: HINT_CSS }} />
          {hint}
        </p>
      )}
    </>
  );
}

const HINT_CSS = `.nxatc-hint{margin:7px 0 0;font-size:12px;color:#8080A0;line-height:1.5;}`;
