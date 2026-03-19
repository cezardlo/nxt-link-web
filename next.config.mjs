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
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
  async redirects() {
    return [
      // Legacy route alias — /command was the original command monitor URL
      { source: '/command', destination: '/map', permanent: false },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ['googleapis', 'googleapis-common', 'google-auth-library', 'qs'],
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
          // CSP removed — was blocking deck.gl / MapLibre WebGL rendering.
          // YouTube embeds work fine without CSP frame-src in modern browsers.
        ],
      },
    ];
  },
};

export default nextConfig;
