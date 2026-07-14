'use client';

// Grouped, searchable category picker sourced from the canonical taxonomy
// (/api/marketplace/categories). Replaces the old hardcoded flat lists. Stores
// the English label strings (compatible with vendor_profiles.categories), so it
// drops into any place that used a flat string[] chip group.
// Research-backed: vendors see a grouped + type-ahead picker, never a flat wall.

import { useEffect, useMemo, useState } from 'react';

interface Item { slug: string; label_en: string; label_es: string; family: string }
interface Department { fg: string; label_en: string; label_es: string; is_service: boolean; items: Item[] }

export default function CategoryPicker({
  selected, onToggle, lang = 'en',
}: { selected: string[]; onToggle: (label: string) => void; lang?: 'en' | 'es' }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/marketplace/categories');
        const j = await r.json();
        setDepartments(j.departments || []);
      } catch { /* leave empty */ }
    })();
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return departments;
    return departments
      .map((d) => ({ ...d, items: d.items.filter((it) => (it.label_en + ' ' + it.label_es).toLowerCase().includes(q)) }))
      .filter((d) => d.items.length > 0);
  }, [departments, q]);

  const toggleGroup = (fg: string) =>
    setOpenGroups((prev) => { const n = new Set(prev); n.has(fg) ? n.delete(fg) : n.add(fg); return n; });

  const label = (it: Item) => (lang === 'es' ? it.label_es : it.label_en);
  // We store the EN label as the canonical value so data stays consistent.
  const value = (it: Item) => it.label_en;

  if (departments.length === 0) return <div className="cp-loading">Loading categories…</div>;

  return (
    <div className="cp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <input
        className="cp-search" value={query} onChange={(e) => setQuery(e.target.value)}
        placeholder={lang === 'es' ? 'Busca una categoría…' : 'Search a category…'}
      />
      {selected.length > 0 && (
        <div className="cp-selected">
          {selected.map((s) => (
            <button key={s} type="button" className="cp-tag" onClick={() => onToggle(s)}>{s} ✕</button>
          ))}
        </div>
      )}
      <div className="cp-groups">
        {filtered.map((d) => {
          const open = Boolean(q) || openGroups.has(d.fg);
          const chosen = d.items.filter((it) => selected.includes(value(it))).length;
          return (
            <div key={d.fg} className={`cp-group ${d.is_service ? 'svc' : ''}`}>
              <button type="button" className="cp-grouphead" onClick={() => toggleGroup(d.fg)}>
                <span>{lang === 'es' ? d.label_es : d.label_en}{chosen > 0 && <em className="cp-chosen">{chosen}</em>}</span>
                <span className="cp-caret">{open ? '–' : '+'}</span>
              </button>
              {open && (
                <div className="cp-chips">
                  {d.items.map((it) => {
                    const on = selected.includes(value(it));
                    return (
                      <button key={it.slug} type="button" className={`cp-chip ${on ? 'on' : ''}`} onClick={() => onToggle(value(it))}>
                        {label(it)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const CSS = `
.cp{width:100%;}
.cp-loading{color:#8080A0;font-size:13px;padding:10px 0;}
.cp-search{width:100%;font-family:inherit;font-size:14px;padding:11px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0A0A0F;color:#F0F0F5;outline:none;margin-bottom:12px;}
.cp-search:focus{border-color:#7C5CFC;}
.cp-selected{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.cp-tag{font-family:inherit;font-size:12px;font-weight:600;color:#C4B5FD;background:rgba(124,92,252,.16);border:1px solid #7C5CFC;border-radius:99px;padding:5px 11px;cursor:pointer;}
.cp-tag:hover{background:rgba(124,92,252,.26);}
.cp-groups{display:flex;flex-direction:column;gap:8px;}
.cp-group{border:1px solid rgba(255,255,255,.1);border-radius:11px;overflow:hidden;background:#12121B;}
.cp-grouphead{width:100%;display:flex;justify-content:space-between;align-items:center;font-family:inherit;font-size:13.5px;font-weight:700;color:#E8E7F0;background:none;border:none;padding:12px 14px;cursor:pointer;text-align:left;}
.cp-group.svc .cp-grouphead{color:#9FE8C8;}
.cp-chosen{font-style:normal;font-size:11px;font-weight:700;color:#C4B5FD;background:rgba(124,92,252,.16);border-radius:99px;padding:1px 8px;margin-left:9px;}
.cp-caret{color:#8080A0;font-size:18px;}
.cp-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 14px 14px;}
.cp-chip{font-family:inherit;font-size:12.5px;font-weight:500;color:#C0C0D0;background:#0A0A0F;border:1px solid rgba(255,255,255,.12);border-radius:99px;padding:7px 12px;cursor:pointer;}
.cp-chip:hover{border-color:rgba(124,92,252,.5);}
.cp-chip.on{background:rgba(124,92,252,.16);border-color:#7C5CFC;color:#C4B5FD;}
`;
