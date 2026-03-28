'use client';

import { useEffect, useState } from 'react';
import { Component as Globe, RegionData } from '@/components/ui/interactive-globe';
import { COLORS, FONT } from '@/lib/tokens';

interface Signal {
  id: string;
  title: string;
  signal_type: string;
  industry: string;
  relevance_score: number;
  discovered_at: string;
  source: string;
  company: string | null;
}



const REGION_GEO: Record<string, { lat: number; lng: number; continent: string }> = {
  // Core regions (original)
  'United States': { lat: 39.8, lng: -98.5, continent: 'North America' },
  'China': { lat: 35.9, lng: 104.2, continent: 'Asia' },
  'Japan & Korea': { lat: 36.2, lng: 133.0, continent: 'Asia' },
  'Europe': { lat: 50.0, lng: 10.0, continent: 'Europe' },
  'Mexico': { lat: 23.6, lng: -102.6, continent: 'North America' },
  'Southeast Asia': { lat: 5.0, lng: 110.0, continent: 'Asia' },
  'India': { lat: 20.6, lng: 78.9, continent: 'Asia' },
  // Asia-Pacific
  'Japan': { lat: 35.7, lng: 139.7, continent: 'Asia' },
  'South Korea': { lat: 37.6, lng: 127.0, continent: 'Asia' },
  'Taiwan': { lat: 25.0, lng: 121.5, continent: 'Asia' },
  'Singapore': { lat: 1.3, lng: 103.8, continent: 'Asia' },
  'Australia': { lat: -35.3, lng: 149.1, continent: 'Oceania' },
  'Indonesia': { lat: -6.2, lng: 106.8, continent: 'Asia' },
  'Vietnam': { lat: 21.0, lng: 105.8, continent: 'Asia' },
  'Thailand': { lat: 13.8, lng: 100.5, continent: 'Asia' },
  'Philippines': { lat: 14.6, lng: 121.0, continent: 'Asia' },
  'Malaysia': { lat: 3.1, lng: 101.7, continent: 'Asia' },
  'New Zealand': { lat: -41.3, lng: 174.8, continent: 'Oceania' },
  'Pakistan': { lat: 33.7, lng: 73.0, continent: 'Asia' },
  'Bangladesh': { lat: 23.8, lng: 90.4, continent: 'Asia' },
  // Europe (individual countries)
  'Germany': { lat: 52.5, lng: 13.4, continent: 'Europe' },
  'United Kingdom': { lat: 51.5, lng: -0.1, continent: 'Europe' },
  'France': { lat: 48.9, lng: 2.3, continent: 'Europe' },
  'Italy': { lat: 41.9, lng: 12.5, continent: 'Europe' },
  'Spain': { lat: 40.4, lng: -3.7, continent: 'Europe' },
  'Netherlands': { lat: 52.4, lng: 4.9, continent: 'Europe' },
  'Sweden': { lat: 59.3, lng: 18.1, continent: 'Europe' },
  'Switzerland': { lat: 46.9, lng: 7.4, continent: 'Europe' },
  'Norway': { lat: 59.9, lng: 10.7, continent: 'Europe' },
  'Denmark': { lat: 55.7, lng: 12.6, continent: 'Europe' },
  'Finland': { lat: 60.2, lng: 24.9, continent: 'Europe' },
  'Poland': { lat: 52.2, lng: 21.0, continent: 'Europe' },
  'Belgium': { lat: 50.8, lng: 4.4, continent: 'Europe' },
  'Austria': { lat: 48.2, lng: 16.4, continent: 'Europe' },
  'Ireland': { lat: 53.3, lng: -6.3, continent: 'Europe' },
  'Portugal': { lat: 38.7, lng: -9.1, continent: 'Europe' },
  'Czech Republic': { lat: 50.1, lng: 14.4, continent: 'Europe' },
  'Greece': { lat: 37.9, lng: 23.7, continent: 'Europe' },
  'Romania': { lat: 44.4, lng: 26.1, continent: 'Europe' },
  'Ukraine': { lat: 50.4, lng: 30.5, continent: 'Europe' },
  'Turkey': { lat: 39.9, lng: 32.9, continent: 'Europe' },
  'Russia': { lat: 55.8, lng: 37.6, continent: 'Europe' },
  // Middle East
  'Israel': { lat: 31.8, lng: 35.2, continent: 'Asia' },
  'United Arab Emirates': { lat: 24.5, lng: 54.4, continent: 'Asia' },
  'Saudi Arabia': { lat: 24.7, lng: 46.7, continent: 'Asia' },
  'Qatar': { lat: 25.3, lng: 51.5, continent: 'Asia' },
  'Iran': { lat: 35.7, lng: 51.4, continent: 'Asia' },
  'Iraq': { lat: 33.3, lng: 44.4, continent: 'Asia' },
  'Middle East': { lat: 29.0, lng: 47.0, continent: 'Asia' },
  // Americas
  'Canada': { lat: 45.4, lng: -75.7, continent: 'North America' },
  'Brazil': { lat: -15.8, lng: -47.9, continent: 'South America' },
  'Argentina': { lat: -34.6, lng: -58.4, continent: 'South America' },
  'Colombia': { lat: 4.7, lng: -74.1, continent: 'South America' },
  'Chile': { lat: -33.4, lng: -70.7, continent: 'South America' },
  'Peru': { lat: -12.0, lng: -77.0, continent: 'South America' },
  'Central America': { lat: 14.6, lng: -90.5, continent: 'North America' },
  'South America': { lat: -15.0, lng: -60.0, continent: 'South America' },
  'Latin America': { lat: 10.0, lng: -70.0, continent: 'South America' },
  // Africa
  'South Africa': { lat: -25.7, lng: 28.2, continent: 'Africa' },
  'Nigeria': { lat: 9.1, lng: 7.5, continent: 'Africa' },
  'Egypt': { lat: 30.0, lng: 31.2, continent: 'Africa' },
  'Kenya': { lat: -1.3, lng: 36.8, continent: 'Africa' },
  'Ethiopia': { lat: 9.0, lng: 38.7, continent: 'Africa' },
  'Morocco': { lat: 34.0, lng: -6.8, continent: 'Africa' },
  'Africa': { lat: 0.0, lng: 25.0, continent: 'Africa' },
  // Oceania
  'Oceania': { lat: -25.0, lng: 135.0, continent: 'Oceania' },
};

const RISK_COLORS: Record<string, string> = { critical: '#ff4444', high: '#ff8800', elevated: '#ffb800', moderate: '#ffd700', low: '#00ff88' };
const TYPE_COLORS: Record<string, string> = {
  market_shift: COLORS.amber, technology: COLORS.cyan, funding: COLORS.green,
  merger_acquisition: COLORS.red, facility_expansion: COLORS.gold, partnership: '#a78bfa',
  contract_award: COLORS.emerald, discovery: COLORS.orange, funding_round: COLORS.green,
};

function formatDate(d: string): string {
  const date = new Date(d);
  const now = new Date();
  const hours = Math.floor((now.getTime() - date.getTime()) / 3600000);
  if (hours < 1) return 'now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MapPage() {
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<RegionData | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [globeSize, setGlobeSize] = useState(600);

  useEffect(() => {
    const updateSize = () => setGlobeSize(Math.max(280, Math.min(window.innerHeight - 60, window.innerWidth - 440, 700)));
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    fetch('/api/briefing').then(r => r.json()).then(data => {
      const b = data.briefing;
      const rMap: Record<string, RegionData> = {};
      for (const r of (b.regions || [])) {
        const geo = REGION_GEO[r.name];
        if (!geo) {
          console.warn(`[Map] Unknown region "${r.name}" — add to REGION_GEO to display on globe`);
          continue;
        }
        if (!rMap[r.name]) {
          rMap[r.name] = {
            id: r.name.toLowerCase().replace(/[^a-z]/g, '_'), name: r.name,
            lat: geo.lat, lng: geo.lng, continent: geo.continent,
            signal_count: 0, risk_level: r.risk_level || 'low',
            opportunity_score: r.opportunity_score || 0, industries: [],
            top_themes: [], total_investment_usd: 0,
          };
        }
        rMap[r.name].signal_count += r.total_signals;
        rMap[r.name].total_investment_usd += (r.total_investment_usd || 0);
        for (const ind of (r.industries || [])) {
          if (!rMap[r.name].industries.includes(ind)) rMap[r.name].industries.push(ind);
        }
        if (r.risk_level === 'high' || r.risk_level === 'critical') rMap[r.name].risk_level = r.risk_level;
      }
      setRegions(Object.values(rMap));
      setSignals(b.recent_signals || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filteredSignals = filter === 'all' ? signals : signals.filter(s => s.signal_type === filter);
  const signalTypes = [...new Set(signals.map(s => s.signal_type))];

  if (loading) {
    return (
      <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: FONT, fontSize: '14px', color: COLORS.muted }}>loading map</div>
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, height: '100vh', overflow: 'hidden', display: 'flex', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Full-screen Globe */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '56px', zIndex: 10,
          background: `linear-gradient(180deg, ${COLORS.bg}, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingLeft: '24px', paddingRight: '24px', fontFamily: FONT,
        }}>
          <a href="/briefing" style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '0.05em', color: COLORS.text, textDecoration: 'none' }}>NXT//LINK</a>
          <div style={{ fontSize: '11px', letterSpacing: '0.1em', color: COLORS.cyan }}>GLOBAL SUPPLY CHAIN MAP</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="/briefing" style={{ fontSize: '11px', color: COLORS.muted, textDecoration: 'none', letterSpacing: '0.05em' }}>BRIEFING</a>
            <a href="/map" style={{ fontSize: '11px', color: COLORS.cyan, textDecoration: 'none', letterSpacing: '0.05em' }}>MAP</a>
            <a href="/conferences" style={{ fontSize: '11px', color: COLORS.muted, textDecoration: 'none', letterSpacing: '0.05em' }}>EVENTS</a>
          </div>
        </div>

        <Globe
          size={globeSize}
          regions={regions}
          onRegionSelect={(r) => setSelectedRegion(r)}
          selectedRegion={selectedRegion?.id || null}
        />

        {selectedRegion && (
          <div style={{
            position: 'absolute', bottom: '24px', left: '24px', zIndex: 20,
            background: COLORS.surface + 'ee', backdropFilter: 'blur(12px)',
            border: `1px solid ${COLORS.border}`, borderRadius: '16px',
            padding: '20px', minWidth: '280px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{selectedRegion.name}</div>
              <div onClick={() => setSelectedRegion(null)} style={{ cursor: 'pointer', color: COLORS.dim, fontSize: '18px' }}>×</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div style={{ background: COLORS.card, borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '8px', fontFamily: FONT, color: COLORS.dim, letterSpacing: '0.1em' }}>SIGNALS</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: COLORS.cyan, fontFamily: FONT }}>{selectedRegion.signal_count}</div>
              </div>
              <div style={{ background: COLORS.card, borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '8px', fontFamily: FONT, color: COLORS.dim, letterSpacing: '0.1em' }}>RISK</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: RISK_COLORS[selectedRegion.risk_level] || COLORS.green, fontFamily: FONT, textTransform: 'uppercase' }}>{selectedRegion.risk_level}</div>
              </div>
            </div>
            <div style={{ fontSize: '11px', color: COLORS.muted, fontFamily: FONT }}>{selectedRegion.continent} · {selectedRegion.industries.join(', ')}</div>
            {selectedRegion.total_investment_usd > 0 && (
              <div style={{ fontSize: '12px', color: COLORS.gold, fontFamily: FONT, marginTop: '8px' }}>
                {selectedRegion.total_investment_usd >= 1e9 ? `$${(selectedRegion.total_investment_usd / 1e9).toFixed(1)}B` : `$${(selectedRegion.total_investment_usd / 1e6).toFixed(0)}M`} tracked
              </div>
            )}
          </div>
        )}

        <div style={{
          position: 'absolute', bottom: '16px', left: selectedRegion ? '320px' : '24px', right: '24px',
          display: 'flex', gap: '20px', justifyContent: 'center', zIndex: 10,
        }}>
          {regions.sort((a, b) => b.signal_count - a.signal_count).slice(0, 6).map(r => (
            <div
              key={r.id}
              onClick={() => setSelectedRegion(selectedRegion?.id === r.id ? null : r)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', opacity: selectedRegion && selectedRegion.id !== r.id ? 0.35 : 1, transition: 'opacity 0.2s' }}
            >
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: RISK_COLORS[r.risk_level] || COLORS.green }} />
              <span style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.muted }}>{r.name}</span>
              <span style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.text, fontWeight: 600 }}>{r.signal_count}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: '400px', borderLeft: `1px solid ${COLORS.border}`, background: COLORS.surface, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.text, marginBottom: '10px' }}>Live Signal Feed</div>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            <button onClick={() => setFilter('all')} style={{ fontSize: '9px', fontFamily: FONT, padding: '3px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: filter === 'all' ? COLORS.cyan + '30' : COLORS.card, color: filter === 'all' ? COLORS.cyan : COLORS.muted }}>ALL</button>
            {signalTypes.map(t => (
              <button key={t} onClick={() => setFilter(filter === t ? 'all' : t)} style={{ fontSize: '9px', fontFamily: FONT, padding: '3px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: filter === t ? (TYPE_COLORS[t] || COLORS.cyan) + '30' : COLORS.card, color: filter === t ? (TYPE_COLORS[t] || COLORS.cyan) : COLORS.muted }}>{t.replace(/_/g, ' ').toUpperCase()}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
          {filteredSignals.map(s => (
            <div key={s.id} style={{ padding: '10px 12px', borderRadius: '8px', marginBottom: '5px', background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: TYPE_COLORS[s.signal_type] || COLORS.cyan, flexShrink: 0 }} />
                <span style={{ fontSize: '9px', fontFamily: FONT, color: TYPE_COLORS[s.signal_type] || COLORS.cyan, textTransform: 'uppercase' }}>{s.signal_type.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: '9px', fontFamily: FONT, color: COLORS.dim, marginLeft: 'auto' }}>{formatDate(s.discovered_at)}</span>
              </div>
              <div style={{ fontSize: '12px', color: COLORS.text, lineHeight: '1.4', marginBottom: '3px' }}>{s.title}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.dim }}>{s.source} · {s.industry}</span>
                <span style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.gold, fontWeight: 600 }}>{(s.relevance_score * 100).toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
