'use client';

// Search-and-chip category picker for VENDOR ONBOARDING ONLY (2026-07-30
// "more visual and interactive" pass + matching/onboarding spec's Tab-2
// "no tree" design). Replaces the embedded browse-tree CategoryPicker on the
// ONE "What do you sell?" card with a search-first flow: type "forklift" ->
// live suggestions from the SAME canonical taxonomy
// (/api/marketplace/categories) -> tap a suggestion to add it as a chip with
// a remove x. A "Popular" row below offers one-tap quick-adds from the same
// vocabulary (a fixed, real subset of category slugs -- never a forked or
// invented list).
//
// Storage contract UNCHANGED: onToggle(label_en) is called exactly like the
// shared CategoryPicker (src/components/CategoryPicker.tsx, untouched by
// this pass -- buyer-side call sites and the vendor portal's own usage keep
// the browse-tree UI). Same field, same values, same shape.
//
// Extracted 2026-07-30 (listing-creation wizard v1) from
// src/app/vendor/onboarding/CategoryChipPicker.tsx to this shared location so
// the vendor listing wizard's category step can reuse it too -- byte-
// identical move, no behavior change; the onboarding "What do you sell?"
// card imports from here now.

import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, X } from 'lucide-react';

interface CategoryItem { slug: string; label_en: string; label_es: string; family: string }
interface Department { fg: string; label_en: string; label_es: string; is_service: boolean; items: CategoryItem[] }

// A fixed, REAL subset of slugs from the canonical taxonomy -- spans
// equipment, storage, staffing, safety, technology, transportation, and
// training so vendors from most departments see at least one relevant
// quick-add. Filtered against the live-loaded vocabulary below, so a
// renamed/removed slug just quietly drops out instead of showing a stale
// label -- this can never drift into a forked category list.
const POPULAR_SLUGS = [
  'forklifts', 'racking', 'pallet_jacks', 'forklift_maintenance', 'staffing',
  'ppe', 'wms', 'freight_brokerage', 'forklift_training', 'cleaning',
];

const MAX_SUGGESTIONS = 6;

export default function CategoryChipPicker({
  selected, onToggle, lang = 'en',
}: { selected: string[]; onToggle: (label: string) => void; lang?: 'en' | 'es' }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/marketplace/categories');
        const j = await r.json();
        setDepartments(j.departments || []);
      } catch { /* leave empty -- search/popular just show nothing */ }
      setLoaded(true);
    })();
  }, []);

  const allItems = useMemo(() => departments.flatMap((d) => d.items), [departments]);
  const label = (it: CategoryItem) => (lang === 'es' ? it.label_es : it.label_en);
  // English label is the canonical stored value (matches shared CategoryPicker).
  const value = (it: CategoryItem) => it.label_en;

  const q = query.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!q) return [];
    return allItems
      .filter((it) => !selected.includes(value(it)))
      .filter((it) => (it.label_en + ' ' + it.label_es).toLowerCase().includes(q))
      .slice(0, MAX_SUGGESTIONS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItems, q, selected]);

  const popular = useMemo(() => {
    const bySlug = new Map(allItems.map((it) => [it.slug, it]));
    return POPULAR_SLUGS
      .map((slug) => bySlug.get(slug))
      .filter((it): it is CategoryItem => !!it && !selected.includes(value(it)));
  }, [allItems, selected]);

  const searchLabel = lang === 'es' ? 'Buscar una categoría, p. ej. "montacargas"' : 'Search a category, e.g. "forklift"';
  const noResults = lang === 'es' ? 'Sin coincidencias — intenta otra palabra.' : 'No matches — try another word.';
  const popularLabel = lang === 'es' ? 'Populares' : 'Popular';
  const loadingLabel = lang === 'es' ? 'Cargando categorías…' : 'Loading categories…';
  // "Add your own" (2026-07-30, per ui-standards addendum: "Custom entries
  // allowed without polluting the canonical taxonomy — store as custom,
  // don't invent new canonical values."). The typed text becomes a plain
  // string appended to the SAME `categories` string[] field as every
  // canonical pick (value() already stores label_en, a plain string) — no
  // schema change, no new API, canonical vocabulary untouched. Marketplace
  // facets just count strings in this array, so an unrecognized one is
  // tolerated exactly like any other (verified 2026-07-30: no call site
  // assumes categories only contains known vocabulary).
  const addCustomLabel = lang === 'es' ? (query: string) => `Agregar "${query}" — agrega la tuya` : (query: string) => `Add "${query}" — add your own`;

  function pick(it: CategoryItem) {
    onToggle(value(it));
    setQuery('');
  }

  function addCustom() {
    const custom = query.trim().slice(0, 60);
    if (!custom) return;
    if (!selected.some((s) => s.toLowerCase() === custom.toLowerCase())) onToggle(custom);
    setQuery('');
  }

  // Suppressed when the typed text exactly matches a canonical suggestion
  // already offered above — no redundant "add your own" next to the same
  // value under its real taxonomy entry.
  const canAddCustom = q.length > 0
    && !selected.some((s) => s.toLowerCase() === q)
    && !suggestions.some((it) => value(it).toLowerCase() === q || it.label_es.toLowerCase() === q);

  return (
    <div className="vo-catpicker">
      {selected.length > 0 && (
        <div className="vo-chips vo-catchips">
          {selected.map((s) => (
            <button key={s} type="button" className="vo-chip on" onClick={() => onToggle(s)}>
              <span>{s}</span>
              <X size={12} strokeWidth={2} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      <div className="vo-catsearch-row">
        <Search size={16} strokeWidth={1.75} className="vo-catsearch-icon" aria-hidden="true" />
        <label className="sr-only" htmlFor="vo-cat-search">{searchLabel}</label>
        <input
          id="vo-cat-search" className="vo-catsearch-input" type="text" autoComplete="off"
          value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchLabel}
        />
      </div>

      {q.length > 0 && (
        <div className="vo-catsuggest" role="region" aria-live="polite">
          {suggestions.length > 0 ? (
            <ul className="vo-catsuglist">
              {suggestions.map((it) => (
                <li key={it.slug}>
                  <button type="button" className="vo-catsugbtn" onClick={() => pick(it)}>
                    <Plus size={13} strokeWidth={2} aria-hidden="true" />
                    {label(it)}
                  </button>
                </li>
              ))}
              {loaded && canAddCustom && (
                <li>
                  <button type="button" className="vo-catsugbtn vo-catcustom" onClick={addCustom}>
                    <Plus size={13} strokeWidth={2} aria-hidden="true" />
                    {addCustomLabel(query.trim())}
                  </button>
                </li>
              )}
            </ul>
          ) : (
            <>
              <p className="vo-catnoresults">{loaded ? noResults : loadingLabel}</p>
              {loaded && canAddCustom && (
                <button type="button" className="vo-catsugbtn vo-catcustom vo-catcustom-standalone" onClick={addCustom}>
                  <Plus size={13} strokeWidth={2} aria-hidden="true" />
                  {addCustomLabel(query.trim())}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {popular.length > 0 && (
        <div className="vo-catpopular">
          <h3 className="vo-catpopular-h">{popularLabel}</h3>
          <div className="vo-chips">
            {popular.map((it) => (
              <button key={it.slug} type="button" className="vo-chip" onClick={() => pick(it)}>
                <Plus size={13} strokeWidth={2} aria-hidden="true" />
                {label(it)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
