'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const FONT = "'IBM Plex Mono', 'JetBrains Mono', 'Courier New', monospace";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0e14',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Logo */}
      <div
        style={{
          fontSize: 48,
          fontWeight: 800,
          letterSpacing: '-1px',
          color: '#f9fafb',
          marginBottom: 12,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        {'NXT'}<span style={{ color: '#00d4ff' }}>{'//'}</span>{'LINK'}
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 12,
          fontFamily: FONT,
          letterSpacing: 4,
          color: '#6b7280',
          textTransform: 'uppercase',
          marginBottom: 40,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.8s ease 0.15s, transform 0.8s ease 0.15s',
        }}
      >
        Supply Chain Intelligence
      </div>

      {/* CTA */}
      <Link
        href="/briefing"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '14px 32px',
          borderRadius: 8,
          background: 'rgba(0,212,255,0.1)',
          border: '1px solid rgba(0,212,255,0.25)',
          color: '#00d4ff',
          fontFamily: FONT,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 1,
          textDecoration: 'none',
          textTransform: 'uppercase',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s, background 0.2s',
        }}
      >
        Enter Briefing
        <span style={{ fontSize: 16 }}>&#8594;</span>
      </Link>

      {/* Status indicators */}
      <div
        style={{
          display: 'flex',
          gap: 32,
          marginTop: 48,
          opacity: mounted ? 1 : 0,
          transition: 'opacity 1s ease 0.5s',
        }}
      >
        {[
          { label: 'LIVE SIGNALS', dot: '#22c55e' },
          { label: '70K+ SOURCES', dot: '#f59e0b' },
          { label: 'REAL-TIME', dot: '#00d4ff' },
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: item.dot,
                boxShadow: `0 0 8px ${item.dot}60`,
              }}
            />
            <span style={{ fontSize: 10, fontFamily: FONT, color: '#4b5563', letterSpacing: 1 }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <nav
        style={{
          position: 'absolute',
          bottom: 32,
          display: 'flex',
          gap: 24,
          opacity: mounted ? 0.6 : 0,
          transition: 'opacity 1.2s ease 0.7s',
        }}
      >
        {[
          { href: '/briefing', label: 'Briefing' },
          { href: '/map', label: 'Map' },
          { href: '/conferences', label: 'Events' },
          { href: '/industry', label: 'Industry' },
          { href: '/vendors', label: 'Vendors' },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              fontSize: 11,
              fontFamily: FONT,
              color: '#6b7280',
              textDecoration: 'none',
              letterSpacing: 1,
            }}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
