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
    // Content-Security-Policy in REPORT-ONLY mode. This does NOT block anything —
    // browsers only log violations to the console (and to a report-uri if one is
    // added later). It lets us watch which real sources the app uses before we
    // ever switch to an enforcing `Content-Security-Policy`. See the source
    // inventory that each directive is based on:
    //   default/base/object/frame-ancestors — hardening + mirror X-Frame-Options.
    //   script-src  'unsafe-inline' — Next.js injects inline hydration scripts
    //                (no nonce); va.vercel-scripts.com — @vercel/analytics loader.
    //   style-src   'unsafe-inline' — styled-jsx + inline <style> blocks
    //                (dangerouslySetInnerHTML) used app-wide; fonts.googleapis.com
    //                — runtime @import of Google Fonts (Outfit/Instrument Serif).
    //   img-src     data:/blob: (inline + next/image); https: — vendor-supplied
    //                listing images come from arbitrary hosts + Supabase storage.
    //   font-src    Supabase-adjacent: self (next/font self-hosted) + gstatic
    //                (fonts loaded by the @import stylesheets) + data:.
    //   connect-src Supabase REST/Auth/Storage + wss (realtime, defensive) +
    //                va.vercel-scripts.com (analytics beacon fallback).
    //   frame-src   OAuth providers (Google/LinkedIn/Azure) + Supabase auth +
    //                YouTube/Vimeo vendor-video embeds (src/lib/vendor/video.ts).
    //   form-action self + OAuth/Supabase (defensive for redirect flows).
    //   worker-src  self + blob: (bundler/library web workers).
    const cspReportOnly = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://yvykselwehxjwsqercjg.supabase.co wss://yvykselwehxjwsqercjg.supabase.co https://va.vercel-scripts.com",
      "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://accounts.google.com https://*.linkedin.com https://login.microsoftonline.com https://yvykselwehxjwsqercjg.supabase.co",
      "form-action 'self' https://accounts.google.com https://*.linkedin.com https://login.microsoftonline.com https://yvykselwehxjwsqercjg.supabase.co",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join('; ');
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
          // HSTS: force HTTPS for a year, incl. subdomains. Safe — Vercel serves
          // HTTPS only. No `preload` flag (opting into the browser preload list
          // is a separate, irreversible-ish step; not doing it here).
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // REPORT-ONLY — logs violations, blocks nothing. Do not switch to a
          // plain `Content-Security-Policy` until the console reports are clean.
          {
            key: 'Content-Security-Policy-Report-Only',
            value: cspReportOnly,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
