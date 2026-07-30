'use client';

// Buyer progressive-enrichment card (2026-07-30 matching/onboarding slice,
// workplace/plans/matching-and-onboarding-2026-07-30.md item A). Inline on
// /buyer (no modal) — three quick, OPTIONAL questions (industry, company
// size, primary location) that immediately improve matching via
// src/lib/matching.ts scoreVendors' honest industry boost. Upwork pattern:
// never a forced wizard, dismissible, never blocks the dashboard.
//
// Persistence: saves through the SAME /api/buyer/profile PATCH route
// /buyer/profile already uses — no second save path. All three columns
// (industry, employee_count, city, service_locations) already existed on
// buyer_profiles (live-verified 2026-07-30) — zero migration.
//
// Dismissal ("Maybe later") is LOCAL ONLY (localStorage, scoped per signed-in
// buyer's auth id) — same pattern as the vendor listing-editor's autosave key
// (src/lib/vendor/listing-autosave.ts: `${PREFIX}:${authId}:...`). No DB
// column for "dismissed" per the coordinator's triage rule.

import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Warehouse, Factory, UtensilsCrossed, Truck, ShoppingBag, Pill, Car, ArrowLeftRight, HardHat, Cog,
  Home, Building, Building2, Landmark, Check, Plus, X, MapPin,
} from 'lucide-react';
import type { Lang } from '@/components/LanguageToggle';
import { splitIndustryList } from '@/lib/matching';

export interface BuyerEnrichmentProfile {
  industry: string | null;
  employee_count: string | null;
  city: string | null;
  service_locations: string[] | null;
}

/** The card is done informing matching once all three questions have SOME
 * answer — used by the caller (/buyer/page.tsx) to decide whether to render
 * this at all. Exported so the page and this component can never disagree
 * on what "complete" means. */
export function isEnrichmentComplete(p: BuyerEnrichmentProfile | null | undefined): boolean {
  if (!p) return false;
  return Boolean(p.industry && p.industry.trim()) && Boolean(p.employee_count && p.employee_count.trim()) && Boolean(p.city && p.city.trim());
}

const DISMISS_PREFIX = 'nxt_buyer_enrichment_dismissed_v1';
export function enrichmentDismissKey(authId: string | null | undefined): string {
  return `${DISMISS_PREFIX}:${authId && authId.trim() ? authId.trim() : 'anon'}`;
}
export function isEnrichmentDismissed(authId: string | null | undefined): boolean {
  try { return typeof window !== 'undefined' && window.localStorage.getItem(enrichmentDismissKey(authId)) === '1'; } catch { return false; }
}
export function dismissEnrichment(authId: string | null | undefined): void {
  try { window.localStorage.setItem(enrichmentDismissKey(authId), '1'); } catch { /* best-effort — worst case the card reappears once */ }
}

interface IndustryOption { value: string; es: string; Icon: LucideIcon }
const INDUSTRY_OPTIONS: IndustryOption[] = [
  { value: 'Warehousing & 3PL', es: 'Almacenaje y 3PL', Icon: Warehouse },
  { value: 'Manufacturing', es: 'Manufactura', Icon: Factory },
  { value: 'Food & Beverage', es: 'Alimentos y bebidas', Icon: UtensilsCrossed },
  { value: 'Logistics & Fleet', es: 'Logística y flotillas', Icon: Truck },
  { value: 'Retail', es: 'Comercio minorista', Icon: ShoppingBag },
  { value: 'Pharma', es: 'Farmacéutica', Icon: Pill },
  { value: 'Automotive', es: 'Automotriz', Icon: Car },
  { value: 'Cross-border', es: 'Comercio transfronterizo', Icon: ArrowLeftRight },
  { value: 'Construction', es: 'Construcción', Icon: HardHat },
  { value: 'General Industrial', es: 'Industrial general', Icon: Cog },
];

interface SizeOption { value: string; en: string; es: string; hintEn: string; hintEs: string; Icon: LucideIcon }
const SIZE_OPTIONS: SizeOption[] = [
  { value: 'small', en: 'Small', es: 'Pequeña', hintEn: '1–50 employees', hintEs: '1–50 empleados', Icon: Home },
  { value: 'medium', en: 'Medium', es: 'Mediana', hintEn: '51–500 employees', hintEs: '51–500 empleados', Icon: Building },
  { value: 'large', en: 'Large', es: 'Grande', hintEn: '501–2,000 employees', hintEs: '501–2,000 empleados', Icon: Building2 },
  { value: 'enterprise', en: 'Enterprise', es: 'Empresa grande', hintEn: '2,000+ employees', hintEs: '2,000+ empleados', Icon: Landmark },
];

// Border region examples per the spec — quick-pick chips + native datalist.
// No IP/geolocation detection (triage rule 3): the only prefill is the
// buyer's OWN existing profile city, passed in via props.
const SUGGESTED_CITIES = ['El Paso, TX', 'Ciudad Juárez, Chih.', 'Las Cruces, NM', 'Chihuahua, Chih.'];
const MAX_EXTRA_SITES = 8;

const T: Record<Lang, Record<string, string>> = {
  en: {
    title: 'Help us match you better — 30 seconds',
    subhead: 'A few quick taps — nothing here is required, and it improves who we match you with right away.',
    q1Label: 'What industry are you in?', q1Hint: 'choose up to 3',
    q2Label: 'What size is your company?',
    q3Label: 'Where are you primarily located?',
    cityPh: 'e.g. El Paso, TX',
    addAnotherSite: 'Add another site', addSitePh: 'City or region', addSiteConfirm: 'Add', removeSite: 'Remove',
    save: 'Save', saving: 'Saving…', savedFlash: 'Saved', maybeLater: 'Maybe later',
    saveError: 'Could not save — please try again.',
  },
  es: {
    title: 'Ayúdanos a conectarte mejor — 30 segundos',
    subhead: 'Unos toques rápidos — nada aquí es obligatorio, y mejora con quién te conectamos de inmediato.',
    q1Label: '¿En qué industria trabajas?', q1Hint: 'elige hasta 3',
    q2Label: '¿De qué tamaño es tu empresa?',
    q3Label: '¿Dónde te ubicas principalmente?',
    cityPh: 'ej. El Paso, TX',
    addAnotherSite: 'Agregar otra ubicación', addSitePh: 'Ciudad o región', addSiteConfirm: 'Agregar', removeSite: 'Quitar',
    save: 'Guardar', saving: 'Guardando…', savedFlash: 'Guardado', maybeLater: 'Quizás después',
    saveError: 'No se pudo guardar — inténtalo de nuevo.',
  },
};

export interface BuyerEnrichmentCardProps {
  lang: Lang;
  profile: BuyerEnrichmentProfile;
  onSaved: (profile: BuyerEnrichmentProfile) => void;
  onDismiss: () => void;
}

export default function BuyerEnrichmentCard({ lang, profile, onSaved, onDismiss }: BuyerEnrichmentCardProps) {
  const t = T[lang];
  const [industries, setIndustries] = useState<string[]>(() => splitIndustryList(profile.industry));
  const [size, setSize] = useState(profile.employee_count || '');
  const [city, setCity] = useState(profile.city || '');
  const [extra, setExtra] = useState<string[]>(profile.service_locations || []);
  const [addingSite, setAddingSite] = useState(false);
  const [siteInput, setSiteInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!justSaved) return;
    const id = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(id);
  }, [justSaved]);

  function toggleIndustry(value: string) {
    setError(false);
    setIndustries((cur) => {
      if (cur.includes(value)) return cur.filter((v) => v !== value);
      if (cur.length >= 3) return cur;
      return [...cur, value];
    });
  }

  function addSite() {
    const v = siteInput.trim().slice(0, 120);
    setSiteInput('');
    setAddingSite(false);
    if (!v || extra.includes(v) || extra.length >= MAX_EXTRA_SITES) return;
    setExtra((cur) => [...cur, v]);
  }
  function removeSite(v: string) { setExtra((cur) => cur.filter((x) => x !== v)); }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(false);
    const payload = {
      industry: industries.join(', '),
      employee_count: size,
      city: city.trim(),
      service_locations: extra,
    };
    try {
      const res = await fetch('/api/buyer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) { setError(true); setSaving(false); return; }
      setJustSaved(true);
      onSaved({
        industry: payload.industry || null,
        employee_count: payload.employee_count || null,
        city: payload.city || null,
        service_locations: payload.service_locations,
      });
    } catch {
      setError(true);
    }
    setSaving(false);
  }

  return (
    <section className="bec nxm-in" aria-labelledby="bec-title">
      <style dangerouslySetInnerHTML={{ __html: BUYER_ENRICHMENT_CARD_CSS }} />
      <div className="bec-head">
        <h2 id="bec-title">{t.title}</h2>
        <p>{t.subhead}</p>
      </div>

      <div className="bec-q">
        <div className="bec-qlabel">{t.q1Label} <span className="bec-hint">({t.q1Hint})</span></div>
        <div className="bec-chipgrid">
          {INDUSTRY_OPTIONS.map((opt) => {
            const on = industries.includes(opt.value);
            const disabled = !on && industries.length >= 3;
            return (
              <button
                key={opt.value}
                type="button"
                className={'bec-chip' + (on ? ' on' : '') + (disabled ? ' dim' : '')}
                aria-pressed={on}
                disabled={disabled}
                onClick={() => toggleIndustry(opt.value)}
              >
                <opt.Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                <span>{lang === 'es' ? opt.es : opt.value}</span>
                {on && <Check size={13} strokeWidth={2.75} className="bec-checkmark" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bec-q">
        <div className="bec-qlabel">{t.q2Label}</div>
        <div className="bec-sizegrid">
          {SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={'bec-sizecard' + (size === opt.value ? ' on' : '')}
              aria-pressed={size === opt.value}
              onClick={() => setSize((cur) => (cur === opt.value ? '' : opt.value))}
            >
              <opt.Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              <b>{lang === 'es' ? opt.es : opt.en}</b>
              <small>{lang === 'es' ? opt.hintEs : opt.hintEn}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="bec-q">
        <label className="bec-qlabel" htmlFor="bec-city">{t.q3Label}</label>
        <input
          id="bec-city"
          className="bec-cityinput"
          list="bec-city-list"
          value={city}
          placeholder={t.cityPh}
          onChange={(e) => setCity(e.target.value)}
          autoComplete="off"
        />
        <datalist id="bec-city-list">
          {SUGGESTED_CITIES.map((c) => <option key={c} value={c} />)}
        </datalist>
        <div className="bec-citychips">
          {SUGGESTED_CITIES.map((c) => (
            <button key={c} type="button" className="bec-citychip" onClick={() => setCity(c)}>
              <MapPin size={11} strokeWidth={2} aria-hidden="true" />{c}
            </button>
          ))}
        </div>
        {extra.length > 0 && (
          <div className="bec-sitelist">
            {extra.map((s) => (
              <span key={s} className="bec-sitechip">
                {s}
                <button type="button" aria-label={`${t.removeSite} ${s}`} onClick={() => removeSite(s)}>
                  <X size={11} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}
        {addingSite ? (
          <div className="bec-addsiterow">
            <input
              className="bec-addsiteinput"
              value={siteInput}
              placeholder={t.addSitePh}
              autoFocus
              onChange={(e) => setSiteInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSite(); } }}
            />
            <button type="button" className="bec-addsitebtn" onClick={addSite}>{t.addSiteConfirm}</button>
          </div>
        ) : (
          <button type="button" className="bec-addsite" onClick={() => setAddingSite(true)}>
            <Plus size={13} strokeWidth={2.5} aria-hidden="true" />{t.addAnotherSite}
          </button>
        )}
      </div>

      {error && <p className="bec-error" role="alert">{t.saveError}</p>}
      <div className="bec-actions">
        <button type="button" className="bec-save nxm-press" disabled={saving} onClick={save}>
          {saving ? t.saving : justSaved ? (<><Check size={14} strokeWidth={2.75} aria-hidden="true" /> {t.savedFlash}</>) : t.save}
        </button>
        <button type="button" className="bec-later" onClick={onDismiss}>{t.maybeLater}</button>
      </div>
    </section>
  );
}

export const BUYER_ENRICHMENT_CARD_CSS = `
.bec{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:16px;padding:24px;margin:20px 0;box-shadow:0 4px 12px rgba(124,58,237,.08);}
.bec-head h2{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:18px;font-weight:700;letter-spacing:-.01em;margin:0 0 6px;color:var(--spec-ink,#141320);}
.bec-head p{margin:0 0 20px;font-size:13px;font-weight:500;line-height:1.55;color:var(--spec-text-2nd,#615F72);}
.bec-q{margin-bottom:20px;}
.bec-qlabel{font-size:13px;font-weight:700;color:var(--spec-ink,#141320);margin-bottom:10px;display:block;}
.bec-hint{font-weight:500;color:#706D88;}
.bec-chipgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;}
.bec-chip{position:relative;display:flex;align-items:center;gap:8px;font-family:inherit;font-size:13px;font-weight:500;padding:10px 12px;border-radius:12px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);cursor:pointer;text-align:left;transition:transform .12s ease,border-color .12s ease,background .12s ease;}
.bec-chip:hover:not(:disabled){border-color:var(--spec-violet,#6C5CE0);}
.bec-chip:active:not(:disabled){transform:scale(.97);}
.bec-chip.on{background:rgba(108,92,224,.1);border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);font-weight:700;}
.bec-chip.dim{opacity:.4;cursor:not-allowed;}
.bec-checkmark{position:absolute;top:7px;right:7px;color:var(--spec-violet,#6C5CE0);}
.bec-sizegrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
@media(max-width:560px){.bec-sizegrid{grid-template-columns:repeat(2,1fr);}}
.bec-sizecard{display:flex;flex-direction:column;align-items:flex-start;gap:6px;font-family:inherit;padding:14px;border-radius:12px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);cursor:pointer;transition:transform .12s ease,border-color .12s ease,background .12s ease;}
.bec-sizecard:hover{border-color:var(--spec-violet,#6C5CE0);}
.bec-sizecard:active{transform:scale(.97);}
.bec-sizecard.on{background:rgba(108,92,224,.1);border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.bec-sizecard b{font-size:13px;font-weight:700;}
.bec-sizecard small{font-size:11px;font-weight:500;color:var(--spec-text-2nd,#615F72);}
.bec-sizecard.on small{color:var(--spec-violet-deep,#4A3DB0);}
.bec-cityinput{width:100%;font-family:inherit;font-size:14px;font-weight:500;padding:11px 13px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;box-sizing:border-box;}
.bec-cityinput:focus{border-color:var(--spec-violet,#6C5CE0);box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.bec-citychips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
.bec-citychip{display:inline-flex;align-items:center;gap:5px;font-family:inherit;font-size:11px;font-weight:500;padding:6px 10px;border-radius:99px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:#706D88;cursor:pointer;}
.bec-citychip:hover{border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.bec-sitelist{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}
.bec-sitechip{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:500;padding:6px 10px;border-radius:99px;background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);}
.bec-sitechip button{display:flex;background:none;border:none;color:inherit;cursor:pointer;padding:0;}
.bec-addsite{display:inline-flex;align-items:center;gap:5px;font-family:inherit;font-size:13px;font-weight:700;background:none;border:none;color:var(--spec-violet-deep,#4A3DB0);cursor:pointer;padding:10px 0 0;}
.bec-addsiterow{display:flex;gap:8px;margin-top:10px;}
.bec-addsiteinput{flex:1;font-family:inherit;font-size:13px;font-weight:500;padding:9px 12px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;}
.bec-addsiteinput:focus{border-color:var(--spec-violet,#6C5CE0);box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.bec-addsitebtn{font-family:inherit;font-size:13px;font-weight:700;padding:9px 16px;border-radius:10px;border:none;background:var(--spec-violet,#6C5CE0);color:#fff;cursor:pointer;}
.bec-addsitebtn:hover{background:var(--spec-violet-deep,#4A3DB0);}
.bec-error{font-size:13px;font-weight:500;color:var(--spec-error,#CE4B43);margin:0 0 12px;}
.bec-actions{display:flex;align-items:center;gap:14px;}
.bec-save{display:inline-flex;align-items:center;gap:6px;font-family:inherit;font-size:14px;font-weight:700;padding:12px 22px;border-radius:10px;border:none;background:var(--spec-violet,#6C5CE0);color:#fff;cursor:pointer;}
.bec-save:hover:not(:disabled){background:var(--spec-violet-deep,#4A3DB0);}
.bec-save:disabled{opacity:.65;cursor:default;}
.bec-later{font-family:inherit;font-size:13px;font-weight:700;background:none;border:none;color:#706D88;cursor:pointer;padding:8px 4px;}
.bec-later:hover{color:var(--spec-ink,#141320);}
`;
