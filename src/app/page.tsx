'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FONT } from '@/lib/tokens';

/* ------------------------------------------------------------------ */
/*  MINI GLOBE - canvas-based auto-rotating earth for hero section    */
/* ------------------------------------------------------------------ */
function fibSphere(n: number): [number, number, number][] {
  const pts: [number, number, number][] = [];
  const phi = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * i) / (n - 1);
    const r = Math.sqrt(1 - y * y);
    const th = (2 * Math.PI * i) / phi;
    pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
  }
  return pts;
}

const MARKERS = [
  { lat: 39.8, lng: -98.5, label: 'United States', size: 6 },
  { lat: 35.9, lng: 104.2, label: 'China', size: 5 },
  { lat: 50.0, lng: 10.0, label: 'Europe', size: 4 },
  { lat: 36.2, lng: 133.0, label: 'Japan & Korea', size: 3.5 },
  { lat: 20.6, lng: 78.9, label: 'India', size: 3 },
  { lat: 23.6, lng: -102.6, label: 'Mexico', size: 3 },
  { lat: 5.0, lng: 110.0, label: 'SE Asia', size: 2.5 },
  { lat: -14.2, lng: -51.9, label: 'Brazil', size: 2.5 },
  { lat: 51.5, lng: -0.1, label: 'London', size: 2 },
  { lat: 1.35, lng: 103.8, label: 'Singapore', size: 3 },
];

function toXYZ(lat: number, lng: number): [number, number, number] {
  const la = (lat * Math.PI) / 180;
  const lo = (lng * Math.PI) / 180;
  return [Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo)];
}

function HeroGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dots = fibSphere(800);
    const SIZE = 500;
    const R = 190;
    const CX = SIZE / 2;
    const CY = SIZE / 2;
    canvas.width = SIZE;
    canvas.height = SIZE;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, SIZE, SIZE);
      const ry = rotRef.current;

      // Atmosphere glow
      const atmo = ctx.createRadialGradient(CX, CY, R * 0.9, CX, CY, R * 1.4);
      atmo.addColorStop(0, 'rgba(0,212,255,0.08)');
      atmo.addColorStop(0.5, 'rgba(0,212,255,0.03)');
      atmo.addColorStop(1, 'rgba(0,212,255,0)');
      ctx.fillStyle = atmo;
      ctx.fillRect(0, 0, SIZE, SIZE);

      // Globe fill
      const grd = ctx.createRadialGradient(CX - 40, CY - 40, R * 0.1, CX, CY, R);
      grd.addColorStop(0, 'rgba(30,45,60,0.9)');
      grd.addColorStop(1, 'rgba(10,14,20,0.95)');
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Globe edge
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,212,255,0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Dot grid
      const cosRy = Math.cos(ry);
      const sinRy = Math.sin(ry);

      for (const [x0, y0, z0] of dots) {
        const x = x0 * cosRy + z0 * sinRy;
        const z = -x0 * sinRy + z0 * cosRy;
        if (z < -0.1) continue;
        const px = CX + x * R;
        const py = CY - y0 * R;
        const alpha = 0.15 + z * 0.35;
        ctx.beginPath();
        ctx.arc(px, py, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,212,255,${alpha})`;
        ctx.fill();
      }

      // Markers
      for (const m of MARKERS) {
        const [mx, my, mz] = toXYZ(m.lat, m.lng);
        const rx = mx * cosRy + mz * sinRy;
        const rz = -mx * sinRy + mz * cosRy;
        if (rz < 0.05) continue;
        const px = CX + rx * R;
        const py = CY - my * R;
        const pulse = 1 + Math.sin(Date.now() / 800 + m.lat) * 0.3;

        // Outer glow
        const mg = ctx.createRadialGradient(px, py, 0, px, py, m.size * 3 * pulse);
        mg.addColorStop(0, 'rgba(0,255,136,0.3)');
        mg.addColorStop(1, 'rgba(0,255,136,0)');
        ctx.fillStyle = mg;
        ctx.fillRect(px - m.size * 4, py - m.size * 4, m.size * 8, m.size * 8);

        // Core dot
        ctx.beginPath();
        ctx.arc(px, py, m.size * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,255,136,0.9)';
        ctx.fill();
      }

      // Connection arcs between top markers
      ctx.strokeStyle = 'rgba(0,212,255,0.08)';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 3; i++) {
        const a = MARKERS[i];
        const b = MARKERS[i + 1];
        const [ax, ay, az] = toXYZ(a.lat, a.lng);
        const [bx, by, bz] = toXYZ(b.lat, b.lng);
        const arx = ax * cosRy + az * sinRy;
        const arz = -ax * sinRy + az * cosRy;
        const brx = bx * cosRy + bz * sinRy;
        const brz = -bx * sinRy + bz * cosRy;
        if (arz < 0 || brz < 0) continue;
        const apx = CX + arx * R;
        const apy = CY - ay * R;
        const bpx = CX + brx * R;
        const bpy = CY - by * R;
        const cpx = (apx + bpx) / 2;
        const cpy = Math.min(apy, bpy) - 30;
        ctx.beginPath();
        ctx.moveTo(apx, apy);
        ctx.quadraticCurveTo(cpx, cpy, bpx, bpy);
        ctx.stroke();
      }

      rotRef.current += 0.003;
      frameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: 500,
        height: 500,
        opacity: 0.85,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  TRACKING CATEGORY CARD                                            */
/* ------------------------------------------------------------------ */
interface TrackCard {
  icon: string;
  title: string;
  desc: string;
  signals: string;
  color: string;
  examples: string[];
}

const TRACKS: TrackCard[] = [
  {
    icon: '{}',
    title: 'Tech & Innovation',
    desc: 'AI breakthroughs, automation systems, cybersecurity threats, and emerging technologies reshaping global supply chains.',
    signals: '550+',
    color: '#00d4ff',
    examples: ['AI integration in logistics', 'Autonomous trucking', 'Blockchain supply chain'],
  },
  {
    icon: '$',
    title: 'Startups & Funding',
    desc: 'Venture rounds, acquisitions, IPOs, and emerging companies across logistics, defense tech, and border technology.',
    signals: '200+',
    color: '#00ff88',
    examples: ['Series A-D rounds', 'M&A activity', 'SPAC launches'],
  },
  {
    icon: '!',
    title: 'Policy & Regulation',
    desc: 'Trade policy shifts, tariff changes, sanctions, export controls, and regulatory actions affecting global commerce.',
    signals: '150+',
    color: '#ffb800',
    examples: ['Tariff announcements', 'Trade agreements', 'Export controls'],
  },
  {
    icon: '#',
    title: 'Ports & Trade Routes',
    desc: 'Port congestion, shipping lane disruptions, container volumes, and infrastructure developments at critical chokepoints.',
    signals: '100+',
    color: '#ff6600',
    examples: ['Port delays', 'Route diversions', 'Infrastructure projects'],
  },
];

function TrackingCard({ card, index }: { card: TrackCard; index: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        background: 'rgba(26,30,37,0.6)',
        border: `1px solid ${visible ? card.color + '40' : '#2e3440'}`,
        borderRadius: 16,
        padding: '32px 28px',
        transition: 'all 0.6s ease',
        transitionDelay: `${index * 0.1}s`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.border = `1px solid ${card.color}80`;
        e.currentTarget.style.background = 'rgba(26,30,37,0.9)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.border = `1px solid ${card.color}40`;
        e.currentTarget.style.background = 'rgba(26,30,37,0.6)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: card.color + '15',
          border: `1px solid ${card.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: FONT, fontSize: 18, color: card.color, fontWeight: 700,
        }}>
          {card.icon}
        </div>
        <h3 style={{
          fontFamily: FONT, fontSize: 16, fontWeight: 600,
          color: '#f5f5f5', letterSpacing: '0.02em', margin: 0,
        }}>
          {card.title}
        </h3>
      </div>
      <p style={{
        fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 14, lineHeight: 1.6,
        color: '#8b919a', margin: '0 0 20px 0',
      }}>
        {card.desc}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {card.examples.map((ex) => (
          <span key={ex} style={{
            fontFamily: FONT, fontSize: 11, color: card.color,
            background: card.color + '10', border: `1px solid ${card.color}20`,
            borderRadius: 6, padding: '3px 8px',
          }}>
            {ex}
          </span>
        ))}
      </div>
      <div style={{
        fontFamily: FONT, fontSize: 12, color: card.color,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: card.color, display: 'inline-block',
          animation: 'pulse 2s infinite',
        }} />
        {card.signals} signals tracked
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  LIVE TICKER                                                       */
/* ------------------------------------------------------------------ */
const TICKER_ITEMS = [
  'SpaceX acquires xAI robotics division',
  'EU proposes new AI supply chain regulations',
  'Port of Shanghai reports 12% volume increase',
  'Series B: $40M raised for AI cybersecurity startup',
  'US-Mexico border tech modernization contract awarded',
  'India semiconductor policy attracts $10B investment',
  'Panama Canal drought restrictions eased',
  'South Korea chip export controls updated',
];

function LiveTicker() {
  return (
    <div style={{
      overflow: 'hidden', whiteSpace: 'nowrap',
      borderTop: '1px solid #2e3440', borderBottom: '1px solid #2e3440',
      padding: '14px 0', background: 'rgba(18,21,26,0.8)',
    }}>
      <div style={{
        display: 'inline-block',
        animation: 'ticker 40s linear infinite',
      }}>
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
          <span key={i} style={{
            fontFamily: FONT, fontSize: 13, color: '#8b919a',
            marginRight: 48, letterSpacing: '0.02em',
          }}>
            <span style={{ color: '#00ff88', marginRight: 8 }}>*</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  STATS BAR                                                         */
/* ------------------------------------------------------------------ */
const STATS = [
  { value: '3,377', label: 'Signals Tracked', color: '#00d4ff' },
  { value: '70K+', label: 'Sources Monitored', color: '#00ff88' },
  { value: '15', label: 'Regions Covered', color: '#ffb800' },
  { value: '292', label: 'Vendors Profiled', color: '#ff6600' },
  { value: '4', label: 'Intel Categories', color: '#00d4ff' },
];

/* ------------------------------------------------------------------ */
/*  HOW IT WORKS                                                      */
/* ------------------------------------------------------------------ */
const STEPS = [
  { num: '01', title: 'INGEST', desc: 'We scrape 70K+ sources across news, filings, government databases, and industry feeds worldwide.' },
  { num: '02', title: 'CLASSIFY', desc: 'Every signal is tagged by type, industry, region, and relevance using pattern matching and AI analysis.' },
  { num: '03', title: 'CONNECT', desc: 'Related signals are linked across categories -- a policy change here means a supply chain shift there.' },
  { num: '04', title: 'BRIEF', desc: 'You get a daily intelligence briefing: what happened, why it matters, and where it is heading.' },
];

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                         */
/* ------------------------------------------------------------------ */
export default function HomePage() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ background: '#0a0e14', minHeight: '100vh', color: '#f5f5f5' }}>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(0,212,255,0.3); }
          50% { box-shadow: 0 0 40px rgba(0,212,255,0.6); }
        }
      `}</style>

      {/* ============ NAV ============ */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 40px', borderBottom: '1px solid #1a1e25',
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(10,14,20,0.85)', backdropFilter: 'blur(12px)',
      }}>
        <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
          <span style={{ color: '#f5f5f5' }}>NXT</span>
          <span style={{ color: '#00d4ff' }}>{'\/\/'}</span>
          <span style={{ color: '#f5f5f5' }}>LINK</span>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          {['Briefing', 'Map', 'Industry', 'Vendors'].map((item) => (
            <Link
              key={item}
              href={/$/{item.toLowerCase()}}
              style={{
                fontFamily: FONT, fontSize: 12, color: '#8b919a',
                textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase',
              }}
            >
              {item}
            </Link>
          ))}
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', paddingTop: 60,
      }}>
        {/* Background gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 60% 50%, rgba(0,212,255,0.06) 0%, transparent 60%)',
        }} />

        <div style={{
          display: 'flex', alignItems: 'center', gap: 60,
          maxWidth: 1100, width: '100%', padding: '0 40px',
          position: 'relative', zIndex: 1,
        }}>
          {/* Left: Text */}
          <div style={{
            flex: 1,
            opacity: loaded ? 1 : 0,
            transform: loaded ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.8s ease',
          }}>
            <div style={{
              fontFamily: FONT, fontSize: 12, color: '#00ff88',
              letterSpacing: '0.15em', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: '#00ff88',
                animation: 'pulse 2s infinite',
              }} />
              LIVE INTELLIGENCE SYSTEM
            </div>

            <h1 style={{
              fontFamily: FONT, fontSize: 52, fontWeight: 800,
              lineHeight: 1.1, margin: '0 0 20px 0', letterSpacing: '-0.03em',
            }}>
              <span style={{ color: '#f5f5f5' }}>Global Supply</span><br />
              <span style={{ color: '#f5f5f5' }}>Chain </span>
              <span style={{ color: '#00d4ff' }}>Intelligence</span>
            </h1>

            <p style={{
              fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 18, lineHeight: 1.7,
              color: '#8b919a', margin: '0 0 12px 0', maxWidth: 480,
            }}>
              Track what moves the world. Tech breakthroughs, startup funding,
              trade policy, and port activity -- analyzed, connected, and
              briefed daily from 70,000+ sources.
            </p>

            <p style={{
              fontFamily: FONT, fontSize: 13, color: '#505868',
              margin: '0 0 32px 0',
            }}>
              Covering 15 regions -- 4 intel categories -- updated in real-time
            </p>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <Link
                href="/briefing"
                style={{
                  fontFamily: FONT, fontSize: 14, fontWeight: 600,
                  color: '#0a0e14', background: '#00d4ff',
                  padding: '14px 32px', borderRadius: 10, textDecoration: 'none',
                  letterSpacing: '0.05em', display: 'inline-block',
                  transition: 'all 0.3s ease',
                }}
              >
                ENTER BRIEFING
              </Link>
              <Link
                href="/map"
                style={{
                  fontFamily: FONT, fontSize: 14, fontWeight: 600,
                  color: '#00d4ff', background: 'transparent',
                  padding: '14px 32px', borderRadius: 10, textDecoration: 'none',
                  border: '1px solid rgba(0,212,255,0.3)',
                  letterSpacing: '0.05em', display: 'inline-block',
                  transition: 'all 0.3s ease',
                }}
              >
                VIEW MAP
              </Link>
            </div>
          </div>

          {/* Right: Globe */}
          <div style={{
            flex: '0 0 auto',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 1.2s ease 0.3s',
          }}>
            <HeroGlobe />
          </div>
        </div>
      </section>

      {/* ============ LIVE TICKER ============ */}
      <LiveTicker />

      {/* ============ WHAT WE TRACK ============ */}
      <section style={{
        maxWidth: 1100, margin: '0 auto', padding: '80px 40px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{
            fontFamily: FONT, fontSize: 32, fontWeight: 700,
            color: '#f5f5f5', margin: '0 0 12px 0', letterSpacing: '-0.02em',
          }}>
            What We Track
          </h2>
          <p style={{
            fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 16, color: '#8b919a', margin: 0,
          }}>
            Four intelligence categories. One unified view of global activity.
          </p>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 20,
        }}>
          {TRACKS.map((card, i) => (
            <TrackingCard key={card.title} card={card} index={i} />
          ))}
        </div>
      </section>

      {/* ============ STATS BAR ============ */}
      <section style={{
        borderTop: '1px solid #1a1e25', borderBottom: '1px solid #1a1e25',
        background: 'rgba(18,21,26,0.5)',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '40px',
          display: 'flex', justifyContent: 'space-between',
        }}>
          {STATS.map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: FONT, fontSize: 28, fontWeight: 700,
                color: s.color, marginBottom: 4,
              }}>
                {s.value}
              </div>
              <div style={{
                fontFamily: FONT, fontSize: 11, color: '#505868',
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section style={{
        maxWidth: 1100, margin: '0 auto', padding: '80px 40px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{
            fontFamily: FONT, fontSize: 32, fontWeight: 700,
            color: '#f5f5f5', margin: '0 0 12px 0', letterSpacing: '-0.02em',
          }}>
            How It Works
          </h2>
          <p style={{
            fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 16, color: '#8b919a', margin: 0,
          }}>
            From raw data to decision-ready intelligence in four steps.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          {STEPS.map((step, i) => (
            <div key={step.num} style={{
              position: 'relative', padding: '28px 24px',
              background: 'rgba(26,30,37,0.4)',
              border: '1px solid #2e3440', borderRadius: 14,
            }}>
              <div style={{
                fontFamily: FONT, fontSize: 36, fontWeight: 800,
                color: 'rgba(0,212,255,0.1)', marginBottom: 12,
              }}>
                {step.num}
              </div>
              <div style={{
                fontFamily: FONT, fontSize: 14, fontWeight: 700,
                color: '#00d4ff', letterSpacing: '0.1em', marginBottom: 12,
              }}>
                {step.title}
              </div>
              <p style={{
                fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 13, lineHeight: 1.6,
                color: '#8b919a', margin: 0,
              }}>
                {step.desc}
              </p>
              {i < 3 && (
                <div style={{
                  position: 'absolute', right: -14, top: '50%',
                  color: '#2e3440', fontSize: 20, fontFamily: FONT,
                }}>
                  {'>'}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ============ PORTS & TRADE SPOTLIGHT ============ */}
      <section style={{
        maxWidth: 1100, margin: '0 auto', padding: '0 40px 80px',
      }}>
        <div style={{
          background: 'rgba(26,30,37,0.6)', border: '1px solid #2e344060',
          borderRadius: 20, padding: '48px 40px',
          display: 'flex', gap: 48,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: FONT, fontSize: 12, color: '#ff6600',
              letterSpacing: '0.15em', marginBottom: 12,
            }}>
              PORTS & TRADE ROUTES
            </div>
            <h3 style={{
              fontFamily: FONT, fontSize: 24, fontWeight: 700,
              color: '#f5f5f5', margin: '0 0 16px 0', lineHeight: 1.3,
            }}>
              Critical chokepoints.<br />Monitored in real-time.
            </h3>
            <p style={{
              fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, lineHeight: 1.7,
              color: '#8b919a', margin: '0 0 24px 0',
            }}>
              From the Port of Shanghai to the Panama Canal, we track
              congestion levels, container throughput, route diversions,
              and infrastructure changes that affect global trade flow.
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {['Shanghai', 'Singapore', 'Rotterdam', 'Los Angeles', 'Panama Canal', 'Suez Canal'].map((port) => (
                <span key={port} style={{
                  fontFamily: FONT, fontSize: 12, color: '#ff6600',
                  background: 'rgba(255,102,0,0.08)', border: '1px solid rgba(255,102,0,0.2)',
                  borderRadius: 8, padding: '6px 14px',
                }}>
                  {port}
                </span>
              ))}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: FONT, fontSize: 12, color: '#ffb800',
              letterSpacing: '0.15em', marginBottom: 12,
            }}>
              POLICY & REGULATION
            </div>
            <h3 style={{
              fontFamily: FONT, fontSize: 24, fontWeight: 700,
              color: '#f5f5f5', margin: '0 0 16px 0', lineHeight: 1.3,
            }}>
              Trade policy shifts.<br />Before they hit the news.
            </h3>
            <p style={{
              fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, lineHeight: 1.7,
              color: '#8b919a', margin: '0 0 24px 0',
            }}>
              Tariff announcements, sanctions updates, export controls,
              and trade agreements -- tracked across 15 regions so you
              see the signal before the market reacts.
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {['US Tariffs', 'EU AI Act', 'CHIPS Act', 'Export Controls', 'USMCA', 'Belt & Road'].map((tag) => (
                <span key={tag} style={{
                  fontFamily: FONT, fontSize: 12, color: '#ffb800',
                  background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.2)',
                  borderRadius: 8, padding: '6px 14px',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section style={{
        padding: '80px 40px', textAlign: 'center',
        background: 'radial-gradient(ellipse at center, rgba(0,212,255,0.04) 0%, transparent 60%)',
        borderTop: '1px solid #1a1e25',
      }}>
        <h2 style={{
          fontFamily: FONT, fontSize: 36, fontWeight: 700,
          color: '#f5f5f5', margin: '0 0 16px 0',
        }}>
          See what is happening. Now.
        </h2>
        <p style={{
          fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 16, color: '#8b919a',
          margin: '0 0 32px 0',
        }}>
          Your daily intelligence briefing is ready.
        </p>
        <Link
          href="/briefing"
          style={{
            fontFamily: FONT, fontSize: 16, fontWeight: 700,
            color: '#0a0e14', background: '#00d4ff',
            padding: '16px 48px', borderRadius: 12,
            textDecoration: 'none', letterSpacing: '0.05em',
            display: 'inline-block',
            animation: 'glow 3s ease-in-out infinite',
          }}
        >
          ENTER COMMAND CENTER
        </Link>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{
        padding: '24px 40px', borderTop: '1px solid #1a1e25',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{
          fontFamily: FONT, fontSize: 12, color: '#505868',
        }}>
          NXT{'\/'+'\/'+''}LINK -- Supply Chain Intelligence System
        </div>
        <div style={{
          fontFamily: FONT, fontSize: 11, color: '#505868',
          display: 'flex', gap: 24,
        }}>
          <span>Real-time data</span>
          <span>15 regions</span>
          <span>4 categories</span>
        </div>
      </footer>
    </div>
  );
}
