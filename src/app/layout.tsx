import type { Metadata } from 'next';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
import { Analytics } from '@vercel/analytics/react';
// NOTE: The old intel-era global nav (DockNav / MobileNav — Home/Briefing/
// Markets/Signals/Vendors) is intentionally NOT rendered. This is a
// marketplace app; each marketplace surface ships its own nav. The components
// remain in the repo (src/components/DockNav.tsx, MobileBottomNav.tsx) in case
// the intel surfaces are ever revived.

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  weight: ['400', '500', '600'],
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

const siteDescription = 'NXT Link is the industrial supply chain marketplace: technology, hardware, equipment, and services for warehouses, manufacturers, and logistics. Discover, compare, request quotes, pilot before buying — deals run through NXT Link.';

// Same site-URL fallback used elsewhere (src/lib/invites/emails.ts, etc.).
// metadataBase lets the opengraph-image.tsx file convention (and any
// relative OG/twitter URLs) resolve to an absolute URL in shared links.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nxt-link-web.vercel.app').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'NXT Link — The Industrial Supply Chain Marketplace',
  description: siteDescription,
  robots: { index: true, follow: true },
  openGraph: {
    title: 'NXT Link — The Industrial Supply Chain Marketplace',
    description: siteDescription,
    siteName: 'NXT Link',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NXT Link — The Industrial Supply Chain Marketplace',
    description: siteDescription,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NXT//LINK',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} font-grotesk antialiased m-0 p-0 bg-nxt-bg`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[999] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:bg-nxt-card focus:text-nxt-accent focus:border focus:border-nxt-border"
        >
          Skip to content
        </a>
        <main id="main-content">
          {children}
        </main>
        <Analytics />
      </body>
    </html>
  );
}
