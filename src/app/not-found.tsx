// Branded 404 — helpful exits instead of a dead end.
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', background: '#0A0A0F', color: '#F0F0F5', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 440 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.3em', color: '#7C5CFC', marginBottom: 14 }}>NXT//LINK</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 10 }}>Page not found</h1>
        <p style={{ color: '#9A97AF', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
          This page doesn&apos;t exist or was moved. Try the marketplace instead.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/marketplace" style={{ background: '#7C5CFC', color: '#fff', padding: '12px 20px', borderRadius: 11, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>Browse the marketplace</Link>
          <Link href="/" style={{ border: '1px solid #2A2A35', color: '#C0C0D0', padding: '12px 20px', borderRadius: 11, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Home</Link>
        </div>
      </div>
    </div>
  );
}
