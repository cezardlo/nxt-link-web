'use client';

// THE one ProfileStrengthMeter (engineering process §4: "the ONE shared
// ProfileStrengthMeter" — replaces the portal's inline 6-task meter and
// /vendor/start's separate 7-step meter, which disagreed with each other).
//
// Research-backed mechanics (fast-signup brief §2.5–6):
//   • Starts at 30% — signing up + saying what you supply is pre-credited
//     (endowed progress).
//   • 5 checklist items MAX, each naming the outcome it unlocks — never a
//     generic "complete your profile".
//   • "Get paid" is a placeholder locked until Payments P1 ships; it never
//     blocks 100%.
//   • At 100% the meter disappears (completion is the reward, LinkedIn-style).

import type { Lang } from '@/components/LanguageToggle';

export interface StrengthInput {
  hasLogo: boolean;
  taglineLen: number;
  descriptionLen: number;
  listingCount: number;
  hasWebsite: boolean;
  hasPhone: boolean;
  hasCity: boolean;
  proofCount: number; // certifications + photos + case studies
}

export interface StrengthItem {
  key: string;
  done: boolean;
  locked?: boolean;
  href?: string;
  label: { en: string; es: string };
  unlock: { en: string; es: string };
}

const BASE_PCT = 30; // pre-credited: account + "what you supply" at signup

export function computeProfileStrength(input: StrengthInput, links?: Partial<Record<string, string>>): {
  pct: number; items: StrengthItem[]; doneCount: number; scoredCount: number;
} {
  const detailsDone = [input.hasWebsite, input.hasPhone, input.hasCity].filter(Boolean).length >= 2;
  const items: StrengthItem[] = [
    {
      key: 'identity',
      done: input.hasLogo && (input.taglineLen > 0 || input.descriptionLen >= 40),
      href: links?.identity,
      label: { en: 'Add your logo & a one-line description', es: 'Agrega tu logo y una descripción de una línea' },
      unlock: { en: 'Buyers recognize you in results', es: 'Los compradores te reconocen en los resultados' },
    },
    {
      key: 'listing',
      done: input.listingCount > 0,
      href: links?.listing ?? '/vendor/listings',
      label: { en: 'Create your first listing (drafts are fine)', es: 'Crea tu primera publicación (borrador está bien)' },
      unlock: { en: 'Listings can go live', es: 'Tus publicaciones pueden salir en vivo' },
    },
    {
      key: 'details',
      done: detailsDone,
      href: links?.details,
      label: { en: 'Add business details — website, phone, city', es: 'Agrega datos del negocio — sitio web, teléfono, ciudad' },
      unlock: { en: 'Quote on buyer requests', es: 'Cotiza solicitudes de compradores' },
    },
    {
      key: 'proof',
      done: input.proofCount > 0,
      href: links?.proof,
      label: { en: 'Add proof — a certification, photo, or case study', es: 'Agrega pruebas — certificación, foto o caso de éxito' },
      unlock: { en: 'Verified badge', es: 'Insignia de verificación' },
    },
    {
      key: 'payout',
      done: false,
      locked: true, // Payments P1 not live yet — never blocks 100%
      label: { en: 'Set up how you get paid', es: 'Configura cómo recibes tus pagos' },
      unlock: { en: 'Get paid', es: 'Recibe tus pagos' },
    },
  ];
  const scored = items.filter((i) => !i.locked);
  const doneCount = scored.filter((i) => i.done).length;
  const pct = Math.min(100, Math.round(BASE_PCT + (doneCount / scored.length) * (100 - BASE_PCT)));
  return { pct, items, doneCount, scoredCount: scored.length };
}

const T = {
  en: {
    title: 'Profile strength',
    base: 'Signing up already earned you 30% — nice start.',
    left: (n: number) => `${n} quick ${n === 1 ? 'step' : 'steps'} left. Each one unlocks something real.`,
    unlocks: 'Unlocks:',
    add: 'Add now →',
    soon: 'Coming soon',
  },
  es: {
    title: 'Nivel de perfil',
    base: 'Registrarte ya te dio el 30% — buen comienzo.',
    left: (n: number) => `${n} ${n === 1 ? 'paso rápido' : 'pasos rápidos'} más. Cada uno desbloquea algo real.`,
    unlocks: 'Desbloquea:',
    add: 'Agregar →',
    soon: 'Muy pronto',
  },
} as const;

export default function ProfileStrengthMeter({
  input, lang, links,
}: { input: StrengthInput; lang: Lang; links?: Partial<Record<string, string>> }) {
  const { pct, items, doneCount, scoredCount } = computeProfileStrength(input, links);
  if (pct >= 100) return null; // completion is the reward — the meter retires
  const t = T[lang];
  const remaining = scoredCount - doneCount;

  return (
    <section className="psm" aria-label={t.title}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="psm-head">
        <div>
          <b>{t.title} — {pct}%</b>
          <span>{doneCount === 0 ? t.base : t.left(remaining)}</span>
        </div>
        <div
          className="psm-bar"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${t.title}: ${pct}%`}
        >
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ul className="psm-list">
        {items.map((it) => (
          <li key={it.key} className={'psm-item' + (it.done ? ' done' : '') + (it.locked ? ' locked' : '')}>
            <span className="psm-tick" aria-hidden="true">{it.done ? '✓' : it.locked ? '🔒' : ''}</span>
            <span className="psm-body">
              <span className="psm-label">{it.label[lang]}</span>
              <span className="psm-unlock">
                {it.locked ? `${t.soon} · ` : ''}{t.unlocks} {it.unlock[lang]}
              </span>
            </span>
            {it.href && !it.done && !it.locked && <a className="psm-go" href={it.href}>{t.add}</a>}
          </li>
        ))}
      </ul>
    </section>
  );
}

const CSS = `
.psm{background:linear-gradient(120deg,rgba(108,92,224,.1),rgba(47,158,106,.05));border:1px solid rgba(108,92,224,.25);border-radius:18px;padding:20px 22px;margin-bottom:22px;}
.psm *{box-sizing:border-box;}
.psm-head{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;}
.psm-head b{font-size:16px;font-weight:800;display:block;color:var(--spec-ink,#141320);}
.psm-head span{font-size:13px;color:var(--spec-text-2nd,#615F72);display:block;margin-top:4px;}
.psm-bar{flex:1;min-width:140px;max-width:240px;height:8px;border-radius:99px;background:var(--spec-border,#E2DFEC);overflow:hidden;}
.psm-bar i{display:block;height:100%;background:linear-gradient(90deg,#6C5CE0,#2F9E6A);border-radius:99px;transition:width .4s ease;}
.psm-list{list-style:none;margin:16px 0 0;padding:0;display:flex;flex-direction:column;gap:10px;}
.psm-item{display:flex;align-items:flex-start;gap:10px;font-size:13.5px;color:var(--spec-ink,#141320);}
.psm-item.done{color:var(--spec-text-2nd,#615F72);}
.psm-item.locked{opacity:.6;}
.psm-tick{width:20px;height:20px;flex-shrink:0;margin-top:1px;border-radius:50%;border:1.5px solid #C7C2DE;display:grid;place-items:center;font-size:11px;font-weight:800;color:#fff;}
.psm-item.done .psm-tick{background:var(--spec-success,#2F9E6A);border-color:transparent;}
.psm-item.locked .psm-tick{border-style:dashed;font-size:9px;}
.psm-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;}
.psm-label{font-weight:600;}
.psm-item.done .psm-label{text-decoration:line-through;text-decoration-color:rgba(97,95,114,.5);}
.psm-unlock{font-size:12px;color:var(--spec-text-2nd,#615F72);}
.psm-go{margin-left:auto;flex-shrink:0;color:var(--spec-violet-deep,#4A3DB0);font-size:12.5px;font-weight:700;text-decoration:none;white-space:nowrap;padding:4px 0;}
.psm-go:hover{color:var(--spec-violet,#6C5CE0);}
.psm-go:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;border-radius:4px;}
@media (max-width:520px){.psm{padding:16px;}}
`;
