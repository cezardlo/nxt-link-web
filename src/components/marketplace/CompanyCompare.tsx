'use client';

// Company save/compare shared by the marketplace Companies tab and the public
// company profile. Snapshots live in localStorage so anonymous buyers can
// compare up to four companies side by side; every row is a fact the buyer
// can verify on the profile — no unexplained scores.

import Link from 'next/link';

export interface CompanySnapshot {
  id: string; name: string; city: string | null; verified: boolean; insured: boolean;
  rating: number | null; review_count: number; response_time: string | null;
  year_founded: number | null; listings: number;
  pilot_available: boolean; installation_available: boolean; cross_border: boolean; emergency_available: boolean;
  industries: string[]; main_expertise: string[];
}

export const SAVED_COMPANIES_KEY = 'nxt_saved_companies';
export const COMPARE_COMPANIES_KEY = 'nxt_company_compare';

export function readCompanyList(key: string): CompanySnapshot[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
export function writeCompanyList(key: string, list: CompanySnapshot[]) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* storage full/blocked */ }
}

export function CompareDrawer({ companies, onRemove, onClose }: {
  companies: CompanySnapshot[]; onRemove: (id: string) => void; onClose: () => void;
}) {
  const rows: Array<[string, (c: CompanySnapshot) => string]> = [
    ['City', (c) => c.city || '—'],
    ['Verified', (c) => (c.verified ? '✓' : '—')],
    ['Insured', (c) => (c.insured ? '✓' : '—')],
    ['Rating', (c) => (c.rating != null ? `★ ${c.rating.toFixed(1)} (${c.review_count})` : '—')],
    ['Response time', (c) => c.response_time || '—'],
    ['Founded', (c) => (c.year_founded ? String(c.year_founded) : '—')],
    ['Listings', (c) => String(c.listings)],
    ['Pilot available', (c) => (c.pilot_available ? '✓' : '—')],
    ['Installation', (c) => (c.installation_available ? '✓' : '—')],
    ['Cross-border', (c) => (c.cross_border ? '✓' : '—')],
    ['24/7 emergency', (c) => (c.emergency_available ? '✓' : '—')],
    ['Industries', (c) => c.industries.join(', ') || '—'],
    ['Expertise', (c) => c.main_expertise.join(', ') || '—'],
  ];
  return (
    <div className="ccmp-modal" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ccmp-box">
        <button className="ccmp-close" onClick={onClose} aria-label="Close">✕</button>
        <h3>Compare companies</h3>
        <div className="ccmp-scroll">
          <table className="ccmp-table">
            <thead>
              <tr>
                <th />
                {companies.map((c) => (
                  <th key={c.id}>
                    <Link href={`/marketplace/vendor/${c.id}`}>{c.name}</Link>
                    <button onClick={() => onRemove(c.id)}>remove</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, get]) => (
                <tr key={label}>
                  <td>{label}</td>
                  {companies.map((c) => <td key={c.id}>{get(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.ccmp-modal{position:fixed;inset:0;background:rgba(5,5,10,.72);backdrop-filter:blur(6px);z-index:50;display:grid;place-items:center;padding:18px;font-family:'Outfit',system-ui,sans-serif;}
.ccmp-box{position:relative;width:100%;max-width:860px;max-height:88vh;overflow-y:auto;background:#12121B;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:26px;color:#F0F0F5;}
.ccmp-box h3{font-size:18px;font-weight:800;margin:0 0 10px;padding-right:30px;}
.ccmp-close{position:absolute;top:14px;right:14px;background:none;border:none;color:#8080A0;font-size:15px;cursor:pointer;}
.ccmp-close:hover{color:#F0F0F5;}
.ccmp-scroll{overflow-x:auto;}
.ccmp-table{width:100%;border-collapse:collapse;font-size:13px;}
.ccmp-table th,.ccmp-table td{padding:9px 12px;border-bottom:1px solid rgba(255,255,255,.06);text-align:left;vertical-align:top;}
.ccmp-table th{min-width:150px;}
.ccmp-table th a{color:#C4B5FD;font-size:13.5px;font-weight:700;text-decoration:none;display:block;}
.ccmp-table th button{background:none;border:none;color:#63607A;font-size:11px;cursor:pointer;padding:2px 0;}
.ccmp-table th button:hover{color:#FCA5A5;}
.ccmp-table td:first-child{color:#8080A0;white-space:nowrap;}
`;
