// Default Open Graph image — file convention, auto-wired into every page's
// og:image / twitter:image by Next.js metadata (see layout.tsx metadataBase).
// Design System v1.0 colors, wordmark only. No external assets, no network
// fetch, no new marketing copy — the one line of text below is the exact
// existing metadata title fragment already live in layout.tsx.
import { ImageResponse } from 'next/og';

// Edge runtime: the Node.js ImageResponse runtime resolves its bundled
// default font via a file:// URL built from import.meta.url, which throws
// "Invalid URL" during static prerender on Windows. Edge's fetch-based font
// loading doesn't hit that path-format bug.
export const runtime = 'edge';
export const alt = 'NXT//LINK — Industrial Marketplace';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#141320';
const VIOLET = '#6C5CE0';
const VIOLET_DEEP = '#4A3DB0';
const LILAC = '#A99DF2';
const WARM_WHITE = '#F8F7FB';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `radial-gradient(circle at 78% 8%, ${VIOLET_DEEP} 0%, ${INK} 46%), ${INK}`,
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <div
            style={{
              display: 'flex',
              width: 84,
              height: 84,
              borderRadius: 20,
              background: `linear-gradient(135deg, ${VIOLET}, ${VIOLET_DEEP})`,
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              fontWeight: 700,
              color: WARM_WHITE,
            }}
          >
            N
          </div>
          <div style={{ display: 'flex', fontSize: 88, fontWeight: 700, letterSpacing: -2, color: WARM_WHITE }}>
            NXT<span style={{ color: LILAC }}>{'//'}</span>LINK
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 26,
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: LILAC,
          }}
        >
          The Industrial Supply Chain Marketplace
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 44,
            width: 160,
            height: 4,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${VIOLET}, ${LILAC})`,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
