import type { Metadata } from 'next';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
import { Analytics } from '@vercel/analytics/react';
import { DockNav } from '@/components/DockNav';
import { MobileNav } from '@/components/MobileBottomNav';

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

const siteDescription = 'NXT Link helps industrial and logistics teams hunt down the right technology, narrow the market to 5 vendors, and test before buying.';

export const metadata: Metadata = {
  title: 'NXT Link - We Hunt. You Test. You Buy Smarter.',
  description: siteDescription,
  robots: { index: true, follow: true },
  openGraph: {
    title: 'NXT Link - We Hunt. You Test. You Buy Smarter.',
    description: siteDescription,
    siteName: 'NXT Link',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NXT Link - We Hunt. You Test. You Buy Smarter.',
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
        <DockNav />
        <main id="main-content" className="pt-24 lg:pt-14 pb-16 lg:pb-0">
          {children}
        </main>
        <MobileNav />
        <Analytics />
      </body>
    </html>
  );
}
