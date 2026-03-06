import type { Metadata } from 'next';
import { IBM_Plex_Mono, Inter, Space_Grotesk } from 'next/font/google';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
import { AppShell } from '@/components/AppShell';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

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
  title: 'NXT//LINK — Technology Intelligence Platform',
  description: 'Discover what technology exists, who builds it, where it deploys, and which vendors are winning contracts in El Paso, TX.',
  openGraph: {
    title: 'NXT//LINK — Technology Intelligence Platform',
    description: 'Live vendor map, IKER scores, CBP border wait times, and federal contract signals for the El Paso–Fort Bliss corridor.',
    siteName: 'NXT//LINK',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NXT//LINK — Technology Intelligence Platform',
    description: 'Live vendor map, IKER scores, CBP border wait times, and federal contract signals for El Paso, TX.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable} font-sans antialiased bg-black text-white`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
