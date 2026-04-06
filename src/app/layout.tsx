import type { Metadata } from 'next';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
import { Analytics } from '@vercel/analytics/react';
import { DockNav } from '@/components/DockNav';

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

export const metadata: Metadata = {
  title: 'NXT//LINK | Supply Chain Intelligence',
  description: 'Supply chain intelligence platform for tracking signals, vendors, products, and market opportunities.',
  robots: { index: false, follow: false },
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
        <DockNav />
        <main id="main-content" className="pt-14">
          {children}
        </main>
        <Analytics />
      </body>
    </html>
  );
}
