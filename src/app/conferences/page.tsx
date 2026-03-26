'use client';

import { useState, useEffect } from 'react';
import { COLORS, FONT } from '@/lib/tokens';

interface Conference {
  id: string;
  name: string;
  category: string;
  city: string;
  country: string;
  start_date: string;
  end_date: string | null;
  website: string;
  description: string;
  relevance_score: number;
  status: 'past' | 'live' | 'upcoming' | 'unknown';
}

const CATEGORY_COLORS: Record<string, string> = {
  Logistics: COLORS.cyan,
  Manufacturing: COLORS.green,
  'Supply Chain': COLORS.gold,
  Robotics: '#a78bfa',
  Technology: COLORS.amber,
  Trade: COLORS.orange,
};

function formatDateRange(start: string, end: string | null): string {
  const s = new Date(start + 'T00:00:00');
  const sm = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (!end) return sm;
  const e = new Date(end + 'T00:00:00');
  if (s.getMonth() === e.getMonth()) return `${sm}–${e.getDate()}, ${e.getFullYear()}`;
  return `${sm} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${e.getFullYear()}`;
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
  const [filter, setFilter] = useState<string>('all');
  const [view, setView] = useState<'upcoming' | 'all'>('upcoming');

  useEffect(() => {
    fetch('/api/conferences').then(r => r.json()).then(data => {
      setConferences(data.conferences || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const categories = [...new Set(conferences.map(c => c.category))].sort();
  const filtered = conferences
    .filter(c => view === 'all' || c.status !== 'past')
    .filter(c => filter === 'all' || c.category === filter);

  const live = filtered.filter(c => c.status === 'live');
  const upcoming = filtered.filter(c => c.status === 'upcoming');
  const past = filtered.filter(c => c.status === 'past');

  if (loading) {
    return (
      <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: FONT, fontSize: '14px', color: COLORS.muted }}>loading events</div>
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '56px', zIndex: 100,
        background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingLeft: '24px', paddingRight: '24px', fontFamily: FONT,
      }}>
        <a href="/briefing" style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '0.05em', color: COLORS.text, textDecoration: 'none' }}>NXT//LINK</a>
        <div style={{ fontSize: '11px', letterSpacing: '0.1em', color: COLORS.cyan }}>SUPPLY CHAIN EVENTS</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="/briefing" style={{ fontSize: '11px', color: COLORS.muted, textDecoration: 'none', letterSpacing: '0.05em' }}>BRIEFING</a>
          <a href="/map" style={{ fontSize: '11px', color: COLORS.muted, textDecoration: 'none', letterSpacing: '0.05em' }}>MAP</a>
          <a href="/conferences" style={{ fontSize: '11px', color: COLORS.cyan, textDecoration: 'none', letterSpacing: '0.05em' }}>EVENTS</a>
        </div>
      </div>

      <div style={{ paddingTop: '80px', paddingLeft: '32px', paddingRight: '32px', paddingBottom: '64px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {/* Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => setFilter('all')} style={{ fontSize: '10px', fontFamily: FONT, padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: filter === 'all' ? COLORS.cyan + '25' : COLORS.card, color: filter === 'all' ? COLORS.cyan : COLORS.muted }}>ALL</button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setFilter(filter === cat ? 'all' : cat)} style={{ fontSize: '10px', fontFamily: FONT, padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: filter === cat ? (CATEGORY_COLORS[cat] || COLORS.cyan) + '25' : COLORS.card, color: filter === cat ? (CATEGORY_COLORS[cat] || COLORS.cyan) : COLORS.muted }}>{cat.toUpperCase()}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setView('upcoming')} style={{ fontSize: '10px', fontFamily: FONT, padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: view === 'upcoming' ? COLORS.surface : COLORS.card, color: view === 'upcoming' ? COLORS.text : COLORS.muted }}>UPCOMING</button>
            <button onClick={() => setView('all')} style={{ fontSize: '10px', fontFamily: FONT, padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: view === 'all' ? COLORS.surface : COLORS.card, color: view === 'all' ? COLORS.text : COLORS.muted }}>ALL</button>
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
            <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.cyan, letterSpacing: '0.12em', marginBottom: '12px' }}>
              UPCOMING — {upcoming.length} EVENTS
            </div>
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

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: COLORS.muted, fontSize: '14px' }}>No events found for this filter.</div>
        )}
      </div>
    </div>
  );
}

function ConferenceCard({ conference: c, isPast = false }: { conference: Conference; isPast?: boolean }) {
  const catColor = CATEGORY_COLORS[c.category] || COLORS.cyan;
  const countdown = !isPast ? daysUntil(c.start_date) : '';

  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
      borderLeft: `3px solid ${isPast ? COLORS.dim : catColor}`,
      borderRadius: '12px', padding: '20px 24px', marginBottom: '10px',
      opacity: isPast ? 0.5 : 1, transition: 'opacity 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '9px', fontFamily: FONT, color: catColor, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{c.category}</span>
            {c.status === 'live' && <span style={{ fontSize: '9px', fontFamily: FONT, color: COLORS.green, fontWeight: 700 }}>LIVE NOW</span>}
            {isPast && <span style={{ fontSize: '9px', fontFamily: FONT, color: COLORS.dim }}>PAST</span>}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: COLORS.text, marginBottom: '6px' }}>
            {c.website ? <a href={c.website} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.text, textDecoration: 'none' }}>{c.name}</a> : c.name}
          </div>
          {c.description && <div style={{ fontSize: '12px', color: COLORS.muted, lineHeight: '1.5', marginBottom: '8px' }}>{c.description}</div>}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontFamily: FONT, color: COLORS.text }}>
              {c.city}{c.country ? `, ${c.country}` : ''}
            </span>
            <span style={{ fontSize: '11px', fontFamily: FONT, color: COLORS.muted }}>
              {formatDateRange(c.start_date, c.end_date)}
            </span>
            {countdown && <span style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.cyan }}>{countdown}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: COLORS.gold, fontFamily: FONT }}>{c.relevance_score}</div>
          <div style={{ fontSize: '8px', fontFamily: FONT, color: COLORS.dim, letterSpacing: '0.08em' }}>RELEVANCE</div>
        </div>
      </div>
    </div>
  );
}
