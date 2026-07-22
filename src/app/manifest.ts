import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NXT//LINK — Industrial Marketplace',
    short_name: 'NXT//LINK',
    description: 'The Borderplex industrial supply chain marketplace — discover suppliers, request quotes, and manage deals through NXT//LINK.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8F7FB',
    theme_color: '#6C5CE0',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
