'use client';

import { useEffect, useRef, useState } from 'react';

// YouTube channel IDs — verified March 2026
// live_stream?channel= embeds the active live stream for the channel.
// youtube-nocookie.com is the privacy-enhanced embed domain (no tracking cookies,
// still supports enablejsapi=1 / postMessage control).
const CHANNELS = [
  { id: 'ktsm',       name: 'KTSM 9',     sub: 'NBC',   color: '#ffb800', youtubeId: 'UCofBxyxHTeSF7b05NIlF_lg' },
  { id: 'kfox14',     name: 'KFOX14',     sub: 'FOX',   color: '#f97316', youtubeId: 'UCBb9rQVtamoMEBenqRkCK7A' },
  { id: 'kvia',       name: 'KVIA',       sub: 'ABC 7', color: '#00d4ff', youtubeId: 'UC0VoP8FNPVa5xPt7lGFNWpA' },
  { id: 'ep-matters', name: 'EP Matters', sub: 'LOCAL', color: '#00ff88', youtubeId: 'UCN3c8MKjTzNx9FhQLrMfIVw' },
] as const;

// Mutable copy used at runtime so indexing returns a defined element
const CHANNEL_LIST = CHANNELS as unknown as Array<{ id: string; name: string; sub: string; color: string; youtubeId: string }>;

// Always start muted (mute=1) so autoplay is permitted by browsers.
// Mute/unmute is toggled via postMessage — no iframe reload ever.
// Uses youtube-nocookie.com so the embed is allowed by our CSP frame-src header.
function buildSrc(youtubeId: string): string {
  const params = new URLSearchParams({
    channel:         youtubeId,
    autoplay:        '1',
    mute:            '1',
    controls:        '1',
    rel:             '0',
    modestbranding:  '1',
    enablejsapi:     '1',
    // origin must match the page origin for postMessage to reach the iframe
    origin:          typeof window !== 'undefined' ? window.location.origin : '',
  });
  return `https://www.youtube-nocookie.com/embed/live_stream?${params.toString()}`;
}

export function LiveTVOverlay() {
  const [active,  setActive]  = useState<number>(0);
  const [muted,   setMuted]   = useState<boolean>(true);
  const [paused,  setPaused]  = useState<boolean>(false);
  const [mini,    setMini]    = useState<boolean>(false);
  // Tracks whether the iframe failed to load (channel may not be live right now)
  const [loadErr, setLoadErr] = useState<boolean>(false);

  const iframeRef   = useRef<HTMLIFrameElement>(null);
  const mutedRef    = useRef<boolean>(true);
  const pausedRef   = useRef<boolean>(false);
  const didMount    = useRef<boolean>(false);
  const idleTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  mutedRef.current  = muted;
  pausedRef.current = paused;

  // Send a YouTube IFrame API command via postMessage (requires enablejsapi=1 + origin param)
  const sendCmd = (func: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      '*',
    );
  };

  // Mute toggle — NO iframe reload, just postMessage
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    mutedRef.current = next;
    sendCmd(next ? 'mute' : 'unMute');
  };

  // Play / pause toggle
  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    pausedRef.current = next;
    sendCmd(next ? 'pauseVideo' : 'playVideo');
  };

  // Channel switch: update iframe.src directly, no React remount
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    const iframe = iframeRef.current;
    if (!iframe) return;
    setLoadErr(false);
    setPaused(false);
    iframe.src = buildSrc(CHANNEL_LIST[active]!.youtubeId);
    // New embed always starts muted=1; if user had unmuted, reapply after load settles
    if (!mutedRef.current) {
      const t = setTimeout(() => sendCmd('unMute'), 3500);
      return () => clearTimeout(t);
    }
  }, [active]);

  // Visibility API: pause when tab hidden, resume when visible
  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        sendCmd('pauseVideo');
      } else if (!pausedRef.current) {
        sendCmd('playVideo');
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // Idle detection: auto-pause after 5 min of no interaction
  useEffect(() => {
    const schedule = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        if (!pausedRef.current) {
          sendCmd('pauseVideo');
          setPaused(true);
        }
      }, 5 * 60_000);
    };
    window.addEventListener('mousemove', schedule);
    window.addEventListener('keydown',   schedule);
    schedule();
    return () => {
      window.removeEventListener('mousemove', schedule);
      window.removeEventListener('keydown',   schedule);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  const channel = CHANNEL_LIST[active]!;

  // Minimised pill
  if (mini) {
    return (
      <div className="absolute bottom-10 left-0 md:left-40 z-20">
        <button
          onClick={() => setMini(false)}
          className="flex items-center gap-2 px-3 py-1.5 bg-black/92 border border-white/8 rounded-sm backdrop-blur-md hover:border-white/20 transition-colors"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${paused ? 'bg-white/30' : 'bg-red-500 animate-pulse'}`}
          />
          <span className="font-mono text-[8px] text-white/60">{channel.name} LIVE</span>
          <span className="font-mono text-[7px] text-white/25">expand</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="absolute bottom-10 left-0 md:left-40 z-20 w-[288px] bg-black/92 border border-white/8 rounded-sm backdrop-blur-md shadow-xl"
    >
      {/* ── Header ── */}
      <div className="px-3 py-1.5 border-b border-white/6 flex items-center gap-2">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${paused ? 'bg-white/30' : 'bg-red-500 animate-pulse'}`}
        />
        <span className="font-mono text-[8px] tracking-[0.2em] text-white/50 flex-1">LIVE TV</span>

        {/* Mute toggle */}
        <button
          onClick={toggleMute}
          className="font-mono text-[9px] text-white/30 hover:text-white/70 transition-colors px-1 leading-none"
          title={muted ? 'Unmute' : 'Mute'}
          aria-label={muted ? 'Unmute stream' : 'Mute stream'}
        >
          {muted ? '🔇' : '🔊'}
        </button>

        {/* Play / pause */}
        <button
          onClick={togglePause}
          className="font-mono text-[9px] text-white/30 hover:text-white/70 transition-colors px-1 leading-none"
          title={paused ? 'Resume' : 'Pause'}
          aria-label={paused ? 'Resume stream' : 'Pause stream'}
        >
          {paused ? '▶' : '⏸'}
        </button>

        {/* Minimise */}
        <button
          onClick={() => setMini(true)}
          className="font-mono text-[9px] text-white/30 hover:text-white/70 transition-colors px-1 leading-none"
          title="Minimise"
          aria-label="Minimise Live TV"
        >
          ▾
        </button>
      </div>

      {/* ── Channel switcher ── */}
      <div className="flex border-b border-white/6">
        {CHANNEL_LIST.map((ch, i) => (
          <button
            key={ch.id}
            onClick={() => setActive(i)}
            className="flex-1 flex flex-col items-center py-1.5 transition-all"
            style={{
              background:   active === i ? `${ch.color}10` : 'transparent',
              borderBottom: active === i ? `2px solid ${ch.color}` : '2px solid transparent',
            }}
          >
            <span
              className="font-mono text-[7px] font-bold tracking-wide"
              style={{ color: active === i ? ch.color : 'rgba(255,255,255,0.22)' }}
            >
              {ch.name}
            </span>
            <span
              className="font-mono text-[6px]"
              style={{ color: active === i ? `${ch.color}80` : 'rgba(255,255,255,0.12)' }}
            >
              {ch.sub}
            </span>
          </button>
        ))}
      </div>

      {/* ── Video player ── */}
      <div className="relative" style={{ paddingTop: '56.25%' /* 16:9 */ }}>
        {/* Error / not-live fallback shown when iframe signals a load failure */}
        {loadErr ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80">
            <span className="font-mono text-[8px] text-white/30 tracking-wider">NO LIVE STREAM</span>
            <span className="font-mono text-[7px] text-white/20">{channel.name} is not live right now</span>
            <button
              onClick={() => { setLoadErr(false); if (iframeRef.current) iframeRef.current.src = buildSrc(channel.youtubeId); }}
              className="mt-1 px-3 py-1 bg-white/5 border border-white/8 rounded-sm font-mono text-[7px] text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
            >
              RETRY
            </button>
          </div>
        ) : null}

        <iframe
          ref={iframeRef}
          src={buildSrc(channel.youtubeId)}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          title={`${channel.name} Live`}
          // onError fires if the iframe src itself 404s or network fails
          onError={() => setLoadErr(true)}
        />

        {/* Paused overlay */}
        {paused && !loadErr && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/60 cursor-pointer"
            onClick={togglePause}
          >
            <span className="font-mono text-white/40 text-[10px] tracking-wider">
              PAUSED · click to resume
            </span>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-3 py-1 flex items-center gap-2 border-t border-white/4">
        <span className="font-mono text-[7px] text-white/20 flex-1">
          {channel.name} · {channel.sub} · El Paso
        </span>
        <span className="font-mono text-[6px] text-white/10">youtube</span>
      </div>
    </div>
  );
}
