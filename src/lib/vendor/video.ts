// Normalize a pasted YouTube/Vimeo URL into an embeddable iframe URL.

export interface ParsedVideo {
  provider: 'youtube' | 'vimeo' | 'other';
  embedUrl: string;
}

export function parseVideoUrl(raw: string): ParsedVideo | null {
  const url = raw.trim();
  if (!url) return null;

  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = u.pathname.startsWith('/shorts/') ? u.pathname.split('/')[2] : u.searchParams.get('v');
      if (id) return { provider: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}` };
    }
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1);
      if (id) return { provider: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}` };
    }
    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return { provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${id}` };
    }
    if (host === 'player.vimeo.com') {
      return { provider: 'vimeo', embedUrl: url };
    }
    // Unknown host — still allow it as a link-only "other" video (no iframe embed guarantee).
    return { provider: 'other', embedUrl: url };
  } catch {
    return null;
  }
}
