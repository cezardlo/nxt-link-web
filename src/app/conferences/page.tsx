'use client';

import { useState, useEffect, useCallback } from 'react';
import { COLORS, FONT } from '@/lib/tokens';

interface Exhibitor {
  id: string;
  conference_id: string;
  company_name: string;
  role: string;
  signal_type: string;
  title: string;
  description: string;
  technology_cluster: string;
  importance_score: number;
}

interface Conference {
  id: string;
  name: string;
  category: string;
  city: string;
  country: string;
  continent: string;
  start_date: string;
  end_date: string | null;
  website: string;
  description: string;
  relevance_score: number;
  estimated_exhibitors: number | null;
  sector_tags: string[] | null;
  status: 'past' | 'live' | 'upcoming' | 'unknown';
  exhibitors: Exhibitor[];
  exhibitor_count: number;
  vendors_discovered: number;
  new_exhibitors: number;
  trending_technologies: string[];
  top_vendors: Array<{ name: string; confidence: number }>;
  lat?: number;
  lon?: number;
}

interface ContinentStat { name: string; count: number; }
interface CountryStat { name: string; count: number; }

interface Vendor {
  id: string;
  company_name: string;
  company_url: string;
  description: string;
  primary_category: string;
  sector: string;
  hq_country: string;
  hq_city: string;
  continent: string;
  iker_score: number;
  credibility_score: number;
  tags: string[] | null;
  funding_stage: string;
  employee_count_range: string;
}

interface HotZone {
  country: string;
  continent: string;
  conferences: number;
  upcoming: number;
  avg_relevance: number;
  specialization: string[];
  heat: 'extreme' | 'high' | 'medium';
}

interface GlobalStats {
  total_conferences: number;
  total_countries: number;
  total_continents: number;
  upcoming: number;
  upcoming_30d: number;
  hot_zones: HotZone[];
}

const CONTINENT_TABS = [
  { key: 'all', label: 'GLOBAL', icon: '\u{1F30D}' },
  { key: 'North America', label: 'N. AMERICA', icon: '\u{1F30E}' },
  { key: 'Europe', label: 'EUROPE', icon: '\u{1F1EA}\u{1F1FA}' },
  { key: 'Asia', label: 'ASIA', icon: '\u{1F30F}' },
  { key: 'South America', label: 'S. AMERICA', icon: '\u{1F30E}' },
  { key: 'Africa', label: 'AFRICA', icon: '\u{1F30D}' },
  { key: 'Oceania', label: 'OCEANIA', icon: '\u{1F30F}' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Logistics: COLORS.cyan,
  Manufacturing: COLORS.green,
  'Supply Chain': COLORS.gold,
  Robotics: '#a78bfa',
  Technology: COLORS.amber,
  Trade: COLORS.orange,
  Trucking: '#00d4ff',
  'Trucking Technology': '#00d4ff',
  'Logistics Technology': COLORS.cyan,
  'Clean Transportation': COLORS.green,
  Transportation: COLORS.gold,
};

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  exhibitor: { label: 'EXHIBITOR', color: COLORS.cyan },
  speaker: { label: 'SPEAKER', color: COLORS.gold },
  host: { label: 'HOST', color: COLORS.green },
  sponsor: { label: 'SPONSOR', color: COLORS.amber },
};

const SIGNAL_ICONS: Record<string, string> = {
  product_launch: '\u{1F680}',
  product_demo: '\u{1F9EA}',
  keynote: '\u{1F3A4}',
  panel: '\u{1F4AC}',
  technical_session: '\u2699\uFE0F',
};

const HEAT_COLORS: Record<string, string> = {
  extreme: '#ff4444',
  high: COLORS.orange,
  medium: COLORS.gold,
};

function formatDateRange(start: string, end: string | null): string {
  const s = new Date(start + 'T00:00:00');
  const sm = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (!end) return `${sm}, ${s.getFullYear()}`;
  const e = new Date(end + 'T00:00:00');
  if (s.getMonth() === e.getMonth()) return `${sm}\u2013${e.getDate()}, ${e.getFullYear()}`;
  return `${sm} \u2013 ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${e.getFullYear()}`;
}

function daysUntil(date: string): string {
  const d = Math.ceil((new Date(date + 'T00:00:00').getTime() - Date.now()) / 86400000);
  if (d < 0) return '';
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  if (d <= 30) return `in ${d} days`;
  const m = Math.floor(d / 30);
  return `in ${m} month${m > 1 ? 's' : ''}`;
}

export default function ConferencesPage() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [continent, setContinent] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [view, setView] = useState<'upcoming' | 'all'>('upcoming');
  const [sort, setSort] = useState<'date' | 'importance'>('date');
  const [continentStats, setContinentStats] = useState<ContinentStat[]>([]);
  const [countryStats, setCountryStats] = useState<CountryStat[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);

  const fetchConferences = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (continent !== 'all') params.set('continent', continent);
    if (selectedCountry) params.set('country', selectedCountry);
    if (sort) params.set('sort', sort);

    fetch(`/api/conferences?${params.toString()}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(data => {
        setConferences(data.conferences || []);
        if (data.stats) {
          setContinentStats(data.stats.continents || []);
          setCountryStats(data.stats.countries || []);
        }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [continent, selectedCountry, sort]);

  useEffect(() => { fetchConferences(); }, [fetchConferences]);

  // Reset country when continent changes
  useEffect(() => { setSelectedCountry(null); }, [continent]);

  // Fetch global stats (hot zones) when on global view
  useEffect(() => {
    if (continent !== 'all') { setGlobalStats(null); return; }
    fetch('/api/conferences/global')
      .then(r => r.json())
      .then(data => setGlobalStats(data))
      .catch(() => setGlobalStats(null));
  }, [continent]);

  // Fetch vendors when geo context changes
  useEffect(() => {
    if (continent === 'all') { setVendors([]); return; }
    setVendorsLoading(true);
    const params = new URLSearchParams();
    params.set('continent', continent);
    params.set('limit', '12');
    fetch(`/api/vendors?${params.toString()}`)
      .then(r => r.json())
      .then(data => { setVendors(data.vendors || []); setVendorsLoading(false); })
      .catch(() => { setVendors([]); setVendorsLoading(false); });
  }, [continent]);

  const categories = [...new Set(conferences.map(c => c.category).filter(Boolean))].sort();
  const filtered = conferences
    .filter(c => view === 'all' || c.status !== 'past')
    .filter(c => filter === 'all' || c.category === filter);

  const live = filtered.filter(c => c.status === 'live');
  const upcoming = filtered.filter(c => c.status === 'upcoming');
  const past = filtered.filter(c => c.status === 'past');
  const totalExhibitors = conferences.reduce((sum, c) => sum + c.exhibitor_count, 0);

  // Countries for selected continent
  const countriesInView = continent === 'all'
    ? countryStats.filter(c => !['Various', 'Virtual'].includes(c.name))
    : countryStats.filter(c => {
        const conf = conferences.find(cf => cf.country === c.name);
        return conf && conf.continent === continent;
      });

  const continentCount = (key: string) => {
    if (key === 'all') return continentStats.reduce((s, c) => s + c.count, 0);
    return continentStats.find(c => c.name === key)?.count || 0;
  };

  if (loading && conferences.length === 0) {
    return (
      <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: FONT, fontSize: '14px', color: COLORS.muted }}>loading global events...</div>
      </div>
    );
  }

  if (error && conferences.length === 0) {
    return (
      <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontFamily: FONT, fontSize: '14px', color: COLORS.red }}>failed to load events</div>
        <button onClick={fetchConferences} style={{ fontFamily: FONT, fontSize: '11px', padding: '8px 20px', borderRadius: '6px', border: `1px solid ${COLORS.cyan}40`, background: 'transparent', color: COLORS.cyan, cursor: 'pointer', letterSpacing: '0.08em' }}>RETRY</button>
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh' }}>
      {/* Nav Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '56px', zIndex: 100,
        background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingLeft: '24px', paddingRight: '24px', fontFamily: FONT,
      }}>
        <a href="/briefing" style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '0.05em', color: COLORS.text, textDecoration: 'none' }}>{'NXT//LINK'}</a>
        <div style={{ fontSize: '11px', letterSpacing: '0.1em', color: COLORS.cyan }}>GLOBAL EVENTS</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="/briefing" style={{ fontSize: '11px', color: COLORS.muted, textDecoration: 'none', letterSpacing: '0.05em' }}>BRIEFING</a>
          <a href="/map" style={{ fontSize: '11px', color: COLORS.muted, textDecoration: 'none', letterSpacing: '0.05em' }}>MAP</a>
          <a href="/conferences" style={{ fontSize: '11px', color: COLORS.cyan, textDecoration: 'none', letterSpacing: '0.05em' }}>EVENTS</a>
          <a href="/industry" style={{ fontSize: '11px', color: COLORS.muted, textDecoration: 'none', letterSpacing: '0.05em' }}>INDUSTRY</a>
          <a href="/vendors" style={{ fontSize: '11px', color: COLORS.muted, textDecoration: 'none', letterSpacing: '0.05em' }}>VENDORS</a>
        </div>
      </div>

      {/* Continent Tabs */}
      <div style={{
        position: 'fixed', top: '56px', left: 0, right: 0, height: '44px', zIndex: 99,
        background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex', alignItems: 'center', gap: '4px',
        paddingLeft: '24px', paddingRight: '24px', overflowX: 'auto',
      }}>
        {CONTINENT_TABS.map(tab => {
          const cnt = continentCount(tab.key);
          const active = continent === tab.key;
          return (
            <button key={tab.key} onClick={() => setContinent(tab.key)} style={{
              fontSize: '10px', fontFamily: FONT, padding: '6px 14px', borderRadius: '6px',
              border: active ? `1px solid ${COLORS.cyan}50` : '1px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap',
              background: active ? COLORS.cyan + '18' : 'transparent',
              color: active ? COLORS.cyan : COLORS.muted,
              letterSpacing: '0.06em', transition: 'all 0.2s',
            }}>
              {tab.icon} {tab.label} {cnt > 0 && <span style={{ opacity: 0.6 }}>({cnt})</span>}
            </button>
          );
        })}
      </div>

      <div style={{ paddingTop: '124px', paddingLeft: '32px', paddingRight: '32px', paddingBottom: '120px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Hot Zones - Global View */}
        {continent === 'all' && globalStats && globalStats.hot_zones.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.orange, letterSpacing: '0.1em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {'\u{1F525}'} HOT ZONES
              <span style={{ fontSize: '9px', color: COLORS.dim }}>{'|'} {globalStats.total_countries} COUNTRIES {'\u00B7'} {globalStats.total_continents} CONTINENTS {'\u00B7'} {globalStats.upcoming_30d} EVENTS NEXT 30D</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
              {globalStats.hot_zones.map(hz => {
                const heatColor = HEAT_COLORS[hz.heat] || COLORS.gold;
                return (
                  <button key={hz.country} onClick={() => { const cont = CONTINENT_TABS.find(t => t.label.includes(hz.continent.split(' ')[0].toUpperCase().slice(0, 4))); if (cont) setContinent(cont.key); }} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-nxt-accent/5 text-left cursor-pointer" style={{
                    borderLeft: `3px solid ${heatColor}`,
                    padding: '14px 18px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: COLORS.text }}>{hz.country}</div>
                      <div style={{ fontSize: '8px', fontFamily: FONT, color: heatColor, letterSpacing: '0.08em', background: heatColor + '20', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>{hz.heat.toUpperCase()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: COLORS.cyan, fontFamily: FONT }}>{hz.conferences}</div>
                        <div style={{ fontSize: '7px', fontFamily: FONT, color: COLORS.dim, letterSpacing: '0.06em' }}>EVENTS</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: COLORS.green, fontFamily: FONT }}>{hz.upcoming}</div>
                        <div style={{ fontSize: '7px', fontFamily: FONT, color: COLORS.dim, letterSpacing: '0.06em' }}>UPCOMING</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: COLORS.gold, fontFamily: FONT }}>{hz.avg_relevance}</div>
                        <div style={{ fontSize: '7px', fontFamily: FONT, color: COLORS.dim, letterSpacing: '0.06em' }}>AVG SCORE</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {hz.specialization.map(s => (
                        <span key={s} style={{ fontSize: '8px', fontFamily: FONT, color: COLORS.muted, background: COLORS.card, padding: '2px 6px', borderRadius: '4px' }}>{s}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: '8px', fontFamily: FONT, color: COLORS.dim, marginTop: '6px' }}>{hz.continent}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Country Cards */}
        {continent !== 'all' && countriesInView.length > 0 && !selectedCountry && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.dim, letterSpacing: '0.1em', marginBottom: '12px' }}>
              COUNTRIES IN {CONTINENT_TABS.find(t => t.key === continent)?.label || continent.toUpperCase()}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {countriesInView.slice(0, 20).map(c => (
      <button key={c.name} onClick={() => setSelectedCountry(c.name)} style={{
                  fontSize: '11px', fontFamily: FONT, padding: '8px 16px', borderRadius: '8px',
                  border: `1px solid ${COLORS.border}`, background: COLORS.surface,
                  color: COLORS.text, cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  <span style={{ fontSize: '9px', color: COLORS.cyan }}>{c.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Country breadcrumb */}
        {selectedCountry && (
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setSelectedCountry(null)} style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.cyan, background: 'transparent', border: 'none', cursor: 'pointer', letterSpacing: '0.06em', padding: 0 }}>
              {'\u2190'} BACK
            </button>
            <span style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.dim }}>|</span>
            <span style={{ fontSize: '12px', fontFamily: FONT, fontWeight: 600, color: COLORS.text }}>{selectedCountry}</span>
          </div>
        )}

        {/* Top Vendors in Region */}
        {continent !== 'all' && vendors.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.gold, letterSpacing: '0.1em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {'\u{1F3E2}'} TOP VENDORS IN {CONTINENT_TABS.find(t => t.key === continent)?.label || continent.toUpperCase()}
              <a href={`/vendors`} style={{ fontSize: '9px', color: COLORS.cyan, textDecoration: 'none', marginLeft: '8px' }}>{'\u2192'} VIEW ALL</a>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
              {vendors.slice(0, 8).map(v => (
                <div key={v.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-nxt-accent/5" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.text, flex: 1 }}>
                      {v.company_url ? <a href={v.company_url.startsWith('http') ? v.company_url : `https://${v.company_url}`} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.text, textDecoration: 'none' }}>{v.company_name}</a> : v.company_name}
                    </div>
                    {v.iker_score > 0 && <div style={{ fontSize: '14px', fontWeight: 700, color: COLORS.gold, fontFamily: FONT }}>{v.iker_score}</div>}
                  </div>
                  <div style={{ fontSize: '9px', fontFamily: FONT, color: COLORS.cyan, letterSpacing: '0.06em', marginBottom: '4px' }}>{v.sector || v.primary_category}</div>
                  {v.description && <div style={{ fontSize: '11px', color: COLORS.muted, lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{v.description}</div>}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {v.hq_city && <span style={{ fontSize: '9px', fontFamily: FONT, color: COLORS.dim }}>{v.hq_city}{v.hq_country ? `, ${v.hq_country}` : ''}</span>}
                    {v.funding_stage && <span style={{ fontSize: '8px', fontFamily: FONT, color: COLORS.amber, background: COLORS.amber + '15', padding: '1px 5px', borderRadius: '3px' }}>{v.funding_stage}</span>}
                    {v.employee_count_range && <span style={{ fontSize: '8px', fontFamily: FONT, color: COLORS.dim }}>{v.employee_count_range}</span>}
                  </div>
                </div>
              ))}
            </div>
            {vendorsLoading && <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.dim, marginTop: '8px' }}>loading vendors...</div>}
          </div>
        )}

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.muted, letterSpacing: '0.08em' }}>{filtered.length} EVENTS</div>
          {totalExhibitors > 0 && <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.cyan, letterSpacing: '0.08em' }}>{totalExhibitors} EXHIBITOR INTEL</div>}
          {live.length > 0 && <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.green, letterSpacing: '0.08em' }}>{live.length} LIVE NOW</div>}
          {vendors.length > 0 && <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.gold, letterSpacing: '0.08em' }}>{vendors.length} VENDORS</div>}
          {loading && <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.dim }}>updating...</div>}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => setFilter('all')} style={pillStyle(filter === 'all', COLORS.cyan)}>ALL</button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setFilter(filter === cat ? 'all' : cat)} style={pillStyle(filter === cat, CATEGORY_COLORS[cat] || COLORS.cyan)}>{cat.toUpperCase()}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setSort(sort === 'date' ? 'importance' : 'date')} style={pillStyle(false, COLORS.gold)}>{sort === 'date' ? '\u{1F4C5} DATE' : '\u2B50 SCORE'}</button>
            <button onClick={() => setView('upcoming')} style={pillStyle(view === 'upcoming', COLORS.text)}>UPCOMING</button>
            <button onClick={() => setView('all')} style={pillStyle(view === 'all', COLORS.text)}>ALL</button>
          </div>
        </div>

        {/* Live Now */}
        {live.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.green, letterSpacing: '0.12em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: COLORS.green, animation: 'pulse 2s infinite' }} />
              HAPPENING NOW
            </div>
            {live.map(c => <ConferenceCard key={c.id} conference={c} />)}
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.cyan, letterSpacing: '0.12em', marginBottom: '12px' }}>UPCOMING {'\u2014'} {upcoming.length} EVENTS</div>
            {upcoming.map(c => <ConferenceCard key={c.id} conference={c} />)}
          </div>
        )}

        {/* Past */}
        {view === 'all' && past.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.dim, letterSpacing: '0.12em', marginBottom: '12px' }}>PAST</div>
            {past.map(c => <ConferenceCard key={c.id} conference={c} isPast />)}
          </div>
        )}

        {filtered.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '48px', color: COLORS.muted, fontSize: '14px' }}>No events found for this filter.</div>
        )}
      </div>
    </div>
  );
}

function pillStyle(active: boolean, color: string): React.CSSProperties {
  return {
    fontSize: '10px', fontFamily: FONT, padding: '5px 12px', borderRadius: '20px',
    border: 'none', cursor: 'pointer',
    background: active ? color + '25' : COLORS.card,
    color: active ? color : COLORS.muted,
    letterSpacing: '0.06em',
    transition: 'all 0.2s',
  };
}

function ConferenceCard({ conference: c, isPast = false }: { conference: Conference; isPast?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const catColor = CATEGORY_COLORS[c.category] || COLORS.cyan;
  const countdown = !isPast ? daysUntil(c.start_date) : '';
  const hasExhibitors = c.exhibitors && c.exhibitors.length > 0;

  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-nxt-accent/5 ${isPast ? 'opacity-50' : ''}`} style={{
      borderLeft: `3px solid ${isPast ? COLORS.dim : catColor}`,
      padding: '20px 24px', marginBottom: '10px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '9px', fontFamily: FONT, color: catColor, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{c.category}</span>
            {c.continent && c.continent !== 'Global' && <span style={{ fontSize: '8px', fontFamily: FONT, color: COLORS.dim, letterSpacing: '0.05em' }}>{c.continent.toUpperCase()}</span>}
            {c.status === 'live' && <span style={{ fontSize: '9px', fontFamily: FONT, color: COLORS.green, fontWeight: 700 }}>LIVE NOW</span>}
            {isPast && <span style={{ fontSize: '9px', fontFamily: FONT, color: COLORS.dim }}>PAST</span>}
            {hasExhibitors && <span style={{ fontSize: '9px', fontFamily: FONT, color: COLORS.gold, letterSpacing: '0.05em' }}>{c.exhibitor_count} EXHIBITOR{c.exhibitor_count > 1 ? 'S' : ''} TRACKED</span>}
            {c.vendors_discovered > 0 && <span style={{ fontSize: '9px', fontFamily: FONT, color: COLORS.cyan, letterSpacing: '0.05em', background: COLORS.cyan + '12', padding: '1px 6px', borderRadius: '4px' }}>{c.vendors_discovered} VENDOR{c.vendors_discovered > 1 ? 'S' : ''}</span>}
            {c.trending_technologies && c.trending_technologies.length > 0 && <span style={{ fontSize: '9px', fontFamily: FONT, color: COLORS.green, letterSpacing: '0.05em', background: COLORS.green + '12', padding: '1px 6px', borderRadius: '4px' }}>{c.trending_technologies.length} TECH</span>}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: COLORS.text, marginBottom: '6px' }}>
            {c.website ? <a href={c.website} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.text, textDecoration: 'none' }}>{c.name}</a> : c.name}
          </div>
          {c.description && <div style={{ fontSize: '12px', color: COLORS.muted, lineHeight: '1.5', marginBottom: '8px' }}>{c.description}</div>}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontFamily: FONT, color: COLORS.text }}>{c.city}{c.country ? `, ${c.country}` : ''}</span>
            <span style={{ fontSize: '11px', fontFamily: FONT, color: COLORS.muted }}>{formatDateRange(c.start_date, c.end_date)}</span>
            {countdown && <span style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.cyan }}>{countdown}</span>}
            {c.sector_tags && c.sector_tags.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {c.sector_tags.slice(0, 4).map(tag => (
                  <span key={tag} style={{ fontSize: '9px', fontFamily: FONT, color: COLORS.dim, background: COLORS.card, padding: '2px 6px', borderRadius: '4px' }}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: COLORS.gold, fontFamily: FONT }}>{c.relevance_score}</div>
          <div style={{ fontSize: '8px', fontFamily: FONT, color: COLORS.dim, letterSpacing: '0.08em' }}>RELEVANCE</div>
        </div>
      </div>

      {/* Discovery: top vendors + technologies */}
      {(c.top_vendors?.length > 0 || c.trending_technologies?.length > 0) && (
        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {c.top_vendors?.slice(0, 3).map(v => (
            <span key={v.name} style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.cyan, background: COLORS.cyan + '10', padding: '3px 8px', borderRadius: '5px', letterSpacing: '0.03em' }}>{v.name}</span>
          ))}
          {c.trending_technologies?.slice(0, 4).map(t => (
            <span key={t} style={{ fontSize: '9px', fontFamily: FONT, color: COLORS.green, background: COLORS.green + '10', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.03em' }}>{t}</span>
          ))}
        </div>
      )}

      {hasExhibitors && (
        <div style={{ marginTop: '12px', borderTop: `1px solid ${COLORS.border}`, paddingTop: '12px' }}>
          <button onClick={() => setExpanded(!expanded)} style={{
            fontSize: '10px', fontFamily: FONT, letterSpacing: '0.08em', color: COLORS.cyan,
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <span style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s', display: 'inline-block' }}>{'\u25B6'}</span>
            {expanded ? 'HIDE' : 'SHOW'} EXHIBITOR INTEL ({c.exhibitor_count})
          </button>
          {expanded && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {c.exhibitors.map(ex => <ExhibitorRow key={ex.id} exhibitor={ex} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExhibitorRow({ exhibitor: ex }: { exhibitor: Exhibitor }) {
  const roleInfo = ROLE_LABELS[ex.role] || { label: ex.role?.toUpperCase() || 'OTHER', color: COLORS.muted };
  const icon = SIGNAL_ICONS[ex.signal_type] || '\u{1F4CB}';

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]" style={{ padding: '12px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px' }}>{icon}</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: COLORS.text }}>{ex.company_name}</span>
            <span style={{ fontSize: '8px', fontFamily: FONT, color: roleInfo.color, letterSpacing: '0.08em', background: roleInfo.color + '15', padding: '2px 6px', borderRadius: '4px' }}>{roleInfo.label}</span>
            {ex.technology_cluster && <span style={{ fontSize: '8px', fontFamily: FONT, color: COLORS.cyan, letterSpacing: '0.05em', background: COLORS.cyan + '10', padding: '2px 6px', borderRadius: '4px' }}>{ex.technology_cluster}</span>}
          </div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: COLORS.text, marginBottom: '2px' }}>{ex.title}</div>
          <div style={{ fontSize: '11px', color: COLORS.muted, lineHeight: '1.5' }}>{ex.description}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: COLORS.accent, fontFamily: FONT }}>{ex.importance_score}</div>
          <div style={{ fontSize: '7px', fontFamily: FONT, color: COLORS.dim, letterSpacing: '0.06em' }}>SCORE</div>
        </div>
      </div>
    </div>
  );
}
