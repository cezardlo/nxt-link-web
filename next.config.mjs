// Last build: 2026-04-07T23:12:00.000Z
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.resolve.alias['object-assign'] = path.resolve(__dirname, 'node_modules/object-assign');
    return config;
  },
  reactStrictMode: false,
  transpilePackages: ['@excalidraw/excalidraw'],
  images: {
    remotePatterns: [
      // Tech logos used by the modern-animated-sign-in demo orbit
      { protocol: 'https', hostname: 'cdn.jsdelivr.net' },
      { protocol: 'https', hostname: 'cdn1.iconfinder.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  // Build-safety ON: type errors now fail the build instead of shipping silently.
  typescript: { ignoreBuildErrors: false },
  // ESLint still non-blocking at build time (style warnings shouldn't block a deploy).
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    // Hide the paused intel-era surfaces: send them to the marketplace before
    // their (now-unwired) pages can render and error. Files are kept in the
    // repo — this is a routing-layer redirect only, fully reversible. See
    // docs/project/START_HERE.md for the active-vs-paused surface list.
    const INTEL_ROUTES = [
      'signals', 'markets', 'intel', 'briefing', 'map', 'command', 'iker',
      'conferences', 'observe', 'discover', 'discoveries', 'explore', 'sector',
      'trajectory', 'industry', 'solve', 'crm', 'dashboard', 'leads',
      'products', 'vendors', 'test-api',
    ];
    const intelRedirects = INTEL_ROUTES.flatMap((r) => [
      { source: `/${r}`, destination: '/marketplace', permanent: false },
      { source: `/${r}/:path*`, destination: '/marketplace', permanent: false },
    ]);
    return [
      ...intelRedirects,
      // Legacy sign-in alias -> the active login page.
      { source: '/sign-in', destination: '/login', permanent: false },
      { source: '/sign-in/:path*', destination: '/login', permanent: false },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ['googleapis', 'googleapis-common', 'google-auth-library', 'qs', 'playwright-core', 'playwright'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
