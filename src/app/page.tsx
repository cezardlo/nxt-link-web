'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const C = '#00D4FF';
const G = '#00FF88';
const GOLD = '#FFD700';
const P = '#A855F7';

// Live signal count from API
function useSignalCount() {
  const [count, setCount] = useState(0);
  const [sources, setSources] = useState(0);
  useEffect(() => {
    fetch('/api/intel-signals').then(r => r.json()).then(d => {
      setCount(d?.signals?.length ?? d?.total ?? 0);
      setSources(Object.keys(d?.by_industry ?? {}).length);
    }).catch(() => {});
  }, []);
  return { count, sources };
}

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function LandingPage() {
  const { count, sources } = useSignalCount();
  const now = useClock();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setTimeout(() => setEntered(true), 100);
  }, []);

  const time = now?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) ?? '--:--:--';

  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#050508',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'IBM Plex Mono, monospace', overflow: 'hidden', position: 'relative',
    }}>

      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
      }} />

      {/* Radial glow */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Top status bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', borderBottom: '1px solid rgba(0,212,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: G, boxShadow: `0 0 8px ${G}`, animation: 'pulse 2.5s ease-in-out infinite' }} />
          <span style={{ fontSize: 7, color: `${G}88`, letterSpacing: '0.15em' }}>SYSTEM ONLINE</span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <span style={{ fontSize: 8, color: 'rgba(0,212,255,0.3)', letterSpacing: '0.1em' }}>
            {count > 0 ? `${count} SIGNALS ACTIVE` : 'INITIALIZING'}
          </span>
          <span style={{ fontSize: 8, color: 'rgba(0,212,255,0.3)', letterSpacing: '0.1em' }}>
            {sources > 0 ? `${sources} SECTORS` : ''}
          </span>
        </div>
        <span style={{ fontSize: 10, color: `${G}66`, fontVariantNumeric: 'tabular-nums' }}>{time}</span>
      </div>

      {/* Main content */}
      <div style={{
        textAlign: 'center', position: 'relative', zIndex: 1,
        opacity: entered ? 1 : 0, transform: entered ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 8 }}>
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif', fontSize: 48, fontWeight: 700,
            color: C, letterSpacing: '0.08em',
          }}>
            NXT
          </span>
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif', fontSize: 48, fontWeight: 700,
            color: 'rgba(0,212,255,0.25)', letterSpacing: '0.08em',
          }}>
            {'//'}
          </span>
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif', fontSize: 48, fontWeight: 700,
            color: C, letterSpacing: '0.08em',
          }}>
            LINK
          </span>
        </div>

        {/* Tagline */}
        <p style={{
          fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.2em',
          margin: '0 0 40px', textTransform: 'uppercase',
        }}>
          Technology Intelligence Platform
        </p>

        {/* Description */}
        <p style={{
          fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8,
          maxWidth: 520, margin: '0 auto 48px',
        }}>
          Real-time intelligence on technology acquisitions, government contracts,
          patent filings, and market signals — across every industry.
        </p>

        {/* CTA */}
        <Link href="/command-center" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '14px 36px',
          background: `${C}10`, border: `1px solid ${C}40`,
          borderRadius: 2, textDecoration: 'none',
          fontSize: 12, color: C, letterSpacing: '0.15em',
          transition: 'all 0.2s',
          boxShadow: `0 0 30px ${C}11`,
        }}>
          ENTER COMMAND CENTER
          <span style={{ fontSize: 16 }}>→</span>
        </Link>

        {/* Secondary links */}
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 24 }}>
          <Link href="/ask" style={{ fontSize: 9, color: 'rgba(0,212,255,0.35)', textDecoration: 'none', letterSpacing: '0.1em' }}>
            INTELLIGENCE SEARCH
          </Link>
          <Link href="/world" style={{ fontSize: 9, color: 'rgba(0,212,255,0.35)', textDecoration: 'none', letterSpacing: '0.1em' }}>
            GLOBAL MAP
          </Link>
          <Link href="/products" style={{ fontSize: 9, color: 'rgba(0,212,255,0.35)', textDecoration: 'none', letterSpacing: '0.1em' }}>
            PRODUCTS
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        position: 'absolute', bottom: 60, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 48,
        opacity: entered ? 1 : 0, transition: 'opacity 1.2s ease 0.4s',
      }}>
        {[
          { label: 'DATA SOURCES', value: '15', color: C },
          { label: 'INDUSTRIES', value: sources > 0 ? String(sources) : '12', color: G },
          { label: 'VENDORS TRACKED', value: '200+', color: GOLD },
          { label: 'LIVE SIGNALS', value: count > 0 ? String(count) : '—', color: P },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, color: stat.color, fontWeight: 600, lineHeight: 1.2 }}>{stat.value}</div>
            <div style={{ fontSize: 7, color: 'rgba(0,212,255,0.3)', letterSpacing: '0.15em', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderTop: '1px solid rgba(0,212,255,0.06)',
        gap: 8,
      }}>
        <span style={{ fontSize: 7, color: 'rgba(0,212,255,0.2)', letterSpacing: '0.12em' }}>
          EL PASO, TX
        </span>
        <span style={{ fontSize: 7, color: 'rgba(0,212,255,0.1)' }}>·</span>
        <span style={{ fontSize: 7, color: 'rgba(0,212,255,0.2)', letterSpacing: '0.12em' }}>
          IMPARTIAL TECHNOLOGY ACQUISITION INTELLIGENCE
        </span>
      </div>

      {/* Scanline */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.008) 2px, rgba(0,212,255,0.008) 4px)',
      }} />

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; } 50% { opacity:0.3; }
        }
      `}</style>
    </div>
  );
}
