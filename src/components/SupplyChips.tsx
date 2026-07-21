'use client';

// "What do you supply?" — the one-tap category question on the quick signup
// (fast-signup brief §3: ~8 big tap-target chips + a free-text fallback).
// Chips are the canonical taxonomy's top-level departments, loaded from
// /api/marketplace/categories (bilingual labels included); if the API is
// unreachable the same 8 departments render from a built-in fallback so the
// signup never blocks. Values stored are the English department labels —
// valid vendor_profiles.categories strings the vendor refines later in the
// portal's full CategoryPicker.

import { useEffect, useState } from 'react';
import type { Lang } from '@/components/LanguageToggle';

// The 8 departments shown at signup (canonical functional-group slugs, in
// the taxonomy's own display order — products first, then services).
const QUICK_FGS = [
  'material_handling', 'storage_racking', 'packaging_shipping', 'safety_security',
  'automation_robotics', 'warehouse_tech', 'svc_maintenance', 'svc_transportation',
];

// Fallback labels if the categories API is unavailable — same departments.
const FALLBACK: Record<string, { en: string; es: string }> = {
  material_handling: { en: 'Material Handling', es: 'Manejo de materiales' },
  storage_racking: { en: 'Storage & Racking', es: 'Almacenaje y racks' },
  packaging_shipping: { en: 'Packaging & Shipping', es: 'Empaque y envío' },
  safety_security: { en: 'Safety & Security', es: 'Seguridad industrial' },
  automation_robotics: { en: 'Automation & Robotics', es: 'Automatización y robótica' },
  warehouse_tech: { en: 'Software & Technology', es: 'Software y tecnología' },
  svc_maintenance: { en: 'Maintenance Services', es: 'Servicios de mantenimiento' },
  svc_transportation: { en: 'Transportation & Logistics', es: 'Transporte y logística' },
};

interface Chip { fg: string; en: string; es: string }

export default function SupplyChips({
  selected, onToggle, freeText, onFreeText, lang,
}: {
  selected: string[];
  onToggle: (valueEn: string) => void;
  freeText: string;
  onFreeText: (v: string) => void;
  lang: Lang;
}) {
  const [chips, setChips] = useState<Chip[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/marketplace/categories');
        const j = await r.json();
        if (!alive) return;
        const byFg = new Map<string, { label_en: string; label_es: string }>();
        for (const d of (j.departments || [])) byFg.set(d.fg, { label_en: d.label_en, label_es: d.label_es });
        setChips(QUICK_FGS.map((fg) => {
          const hit = byFg.get(fg);
          return {
            fg,
            en: hit?.label_en || FALLBACK[fg].en,
            es: hit?.label_es || FALLBACK[fg].es,
          };
        }));
      } catch {
        if (alive) setChips(QUICK_FGS.map((fg) => ({ fg, ...FALLBACK[fg] })));
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="sqc">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {chips === null ? (
        <div className="sqc-loading" role="status">
          {lang === 'es' ? 'Cargando categorías…' : 'Loading categories…'}
        </div>
      ) : (
        <div className="sqc-grid">
          {chips.map((c) => {
            const on = selected.includes(c.en);
            return (
              <button
                key={c.fg}
                type="button"
                className={'sqc-chip' + (on ? ' on' : '')}
                aria-pressed={on}
                onClick={() => onToggle(c.en)}
              >
                <span className="sqc-tick" aria-hidden="true">{on ? '✓' : ''}</span>
                {lang === 'es' ? c.es : c.en}
              </button>
            );
          })}
        </div>
      )}
      <label className="sqc-other">
        <span>{lang === 'es' ? '¿Otra cosa? Escríbela' : 'Something else? Type it'}</span>
        <input
          type="text"
          value={freeText}
          maxLength={80}
          onChange={(e) => onFreeText(e.target.value)}
          placeholder={lang === 'es' ? 'p. ej. Uniformes industriales' : 'e.g. Industrial uniforms'}
        />
      </label>
    </div>
  );
}

const CSS = `
.sqc{width:100%;}
.sqc-loading{font-size:13px;color:#615F72;padding:10px 0;}
.sqc-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;}
.sqc-chip{display:flex;align-items:center;gap:8px;font-family:inherit;font-size:13.5px;font-weight:600;line-height:1.25;text-align:left;min-height:52px;padding:10px 12px;border-radius:12px;border:1.5px solid #E2DFEC;background:#fff;color:#3B3A4A;cursor:pointer;}
.sqc-chip:hover{border-color:#A99DF2;}
.sqc-chip.on{border-color:#6C5CE0;background:#F3F1FD;color:#4A3DB0;}
.sqc-chip:focus-visible{outline:2px solid #6C5CE0;outline-offset:2px;}
.sqc-tick{width:20px;height:20px;flex-shrink:0;border-radius:99px;border:1.5px solid #E2DFEC;display:grid;place-items:center;font-size:12px;font-weight:800;color:#fff;background:#fff;}
.sqc-chip.on .sqc-tick{background:#6C5CE0;border-color:#6C5CE0;}
.sqc-other{display:block;margin-top:12px;}
.sqc-other span{display:block;font-size:12.5px;font-weight:600;color:#615F72;margin-bottom:6px;}
.sqc-other input{width:100%;min-height:48px;font-family:inherit;font-size:15px;padding:12px 14px;border-radius:12px;border:1px solid #E2DFEC;background:#F8F7FB;color:#141320;outline:none;box-sizing:border-box;}
.sqc-other input:focus{border-color:#6C5CE0;background:#fff;}
@media (max-width:360px){.sqc-grid{grid-template-columns:1fr;}}
`;
