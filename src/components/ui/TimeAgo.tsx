'use client';

import { useEffect, useState } from 'react';
import { COLORS } from '@/lib/tokens';

// ─── TimeAgo — Live-updating relative time display ───────────────────────────
// Shows "2m ago", "3h ago", "1d ago" and auto-refreshes every 30s.

type Props = {
  date: string | Date;
  className?: string;
  style?: React.CSSProperties;
  live?: boolean; // auto-refresh (default true)
};

function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function getUrgencyColor(date: Date): string {
  const hours = (Date.now() - date.getTime()) / (1000 * 60 * 60);
  if (hours < 1) return COLORS.green;     // Fresh — green
  if (hours < 6) return COLORS.cyan;      // Recent — cyan
  if (hours < 24) return `${COLORS.text}60`; // Today — muted
  return `${COLORS.text}30`;              // Older — very muted
}

export function TimeAgo({ date, className = '', style, live = true }: Props) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const [text, setText] = useState(formatTimeAgo(dateObj));
  const [color, setColor] = useState(getUrgencyColor(dateObj));

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      setText(formatTimeAgo(dateObj));
      setColor(getUrgencyColor(dateObj));
    }, 30_000);
    return () => clearInterval(id);
  }, [dateObj, live]);

  return (
    <span
      className={`font-mono text-[8px] tabular-nums ${className}`}
      style={{ color, ...style }}
      title={dateObj.toISOString()}
    >
      {text}
    </span>
  );
}
