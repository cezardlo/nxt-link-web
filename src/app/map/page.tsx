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
  'United States': { lat: 39.8, lng: -98.5, continent: 'North America' },
  'China': { lat: 35.9, lng: 104.2, continent: 'Asia' },
  'Japan & Korea': { lat: 36.2, lng: 133.0, continent: 'Asia' },
  'Europe': { lat: 50.0, lng: 10.0, continent: 'Europe' },
  'Mexico': { lat: 23.6, lng: -102.6, continent: 'North America' },
  'Southeast Asia': { lat: 5.0, lng: 110.0, continent: 'Asia' },
  'India': { lat: 20.6, lng: 78.9, continent: 'Asia' },
  'US': { lat: 39.8, lng: -98.5, continent: 'North America' },
  'EU': { lat: 50.0, lng: 10.0, continent: 'Europe' },
  'Germany': { lat: 51.2, lng: 10.4, continent: 'Europe' },
  'Japan': { lat: 36.2, lng: 138.0, continent: 'Asia' },
  'South Korea': { lat: 37.5, lng: 127.0, continent: 'Asia' },
  'Texas': { lat: 31.0, lng: -99.0, continent: 'North America' },
  'El Paso': { lat: 31.8, lng: -106.4, continent: 'North America' },
  'US-Mexico Border': { lat: 29.0, lng: -103.0, continent: 'North America' },
};



const REGION_MERGE: Record<string, string> = {
  'US': 'United States',
  'EU': 'Europe',
  'Japan': 'Japan & Korea',
  'South Korea': 'Japan & Korea',
  'Texas': 'United States',
  'El Paso': 'United States',
  'US-Mexico Border': 'United States',
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
    const updateSize = () => setGlobeSize(Math.min(window.innerHeight - 60, window.innerWidth - 440, 700));
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
        if (!geo) continue;
        const key = REGION_MERGE[r.name] || r.name;
        const mergedGeo = REGION_GEO[key] || geo;
        if (!rMap[key]) {
          rMap[key] = {
            id: key.toLowerCase().replace(/[^a-z]/g, '_'), name: key,
            lat: mergedGeo.lat, lng: mergedGeo.lng, continent: mergedGeo.continent,
            signal_count: 0, risk_level: r.risk_level || 'low',
            opportunity_score: r.opportunity_score || 0, industries: [],
            top_themes: [], total_investment_usd: 0,
          };
        }
        rMap[key].signal_count += r.total_signals;
        rMap[key].total_investment_usd += (r.total_investment_usd || 0);
        for (const ind of (r.industries || [])) {
          if (!rMap[key].industries.includes(ind)) rMap[key].industries.push(ind);
        }
        if (r.risk_level === 'high' || r.risk_level === 'critical') rMap[key].risk_level = r.risk_level;
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
            <a href="/industry" style={{ fontSize: '11px', color: COLORS.muted, textDecoration: 'none', letterSpacing: '0.05em' }}>INDUSTRY</a>
            <a href="/vendors" style={{ fontSize: '11px', color: COLORS.muted, textDecoration: 'none', letterSpacing: '0.05em' }}>VENDORS</a>
          </div>
        </div>

        <Globe
          size={globeSize}
          regions={regions}
          onRegionSelect={(r) => setSelectedRegion(r)}
          selectedRegion={selectedRegion?.id || null}
        />

        {/* Selected region overlay */}
        {selectedRegion && (
          <div style={{
            position: 'absolute', bottom: '24px', left: '24px', zIndex: 20,
            background: COLORS.surface + 'ee', backdropFilter: 'blur(12px)',
            border: `1px solid ${COLORS.border}`, borderRadius: '16px',
            padding: '20px', minWidth: '280px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{selectedRegion.name}</div>
              <div onClick={() => setSelectedRegion(null)} style={{ cursor: 'pointer', color: COLORS.dim, fontSize: '18px' }}>Ã</div>
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
            <div style={{ fontSize: '11px', color: COLORS.muted, fontFamily: FONT }}>{selectedRegion.continent} Â· {selectedRegion.industries.join(', ')}</div>
            {selectedRegion.total_investment_usd > 0 && (
              <div style={{ fontSize: '12px', color: COLORS.gold, fontFamily: FONT, marginTop: '8px' }}>
                {selectedRegion.total_investment_usd >= 1e9 ? `$${(selectedRegion.total_investment_usd / 1e9).toFixed(1)}B` : `$${(selectedRegion.total_investment_usd / 1e6).toFixed(0)}M`} tracked
              </div>
            )}
          </div>
        )}

        {/* Bottom region bar */}
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

      {/* Signal Feed Sidebar */}
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
                <span style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.dim }}>{s.source} Â· {s.industry}</span>
                <span style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.gold, fontWeight: 600 }}>{(s.relevance_score * 100).toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
