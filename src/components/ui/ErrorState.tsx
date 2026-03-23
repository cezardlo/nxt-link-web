'use client';
import { Button } from './Button';
import { COLORS } from '@/lib/tokens';
import Link from 'next/link';

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({ message = 'Something went wrong.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
      <span className="font-mono text-[10px] tracking-[0.2em] text-white/20 uppercase">
        CONNECTION LOST
      </span>
      <p className="font-mono text-[12px] text-white/40 max-w-xs">
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          RETRY
        </Button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title?: string;
  message?: string;
  linkHref?: string;
  linkLabel?: string;
}

export function EmptyState({
  title = 'Nothing here yet',
  message = 'Data will appear here once available.',
  linkHref,
  linkLabel = 'Go explore',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 font-mono">
      <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center"
        style={{ background: `${COLORS.text}08`, border: `1px solid ${COLORS.border}` }}>
        <span className="text-[18px]" style={{ color: `${COLORS.text}20` }}>?</span>
      </div>
      <div className="text-[11px] tracking-[0.1em] mb-1" style={{ color: `${COLORS.text}40` }}>
        {title}
      </div>
      <div className="text-[9px] max-w-[280px] text-center leading-relaxed" style={{ color: `${COLORS.text}25` }}>
        {message}
      </div>
      {linkHref && (
        <Link
          href={linkHref}
          className="mt-4 text-[9px] tracking-[0.15em] px-4 py-1.5 rounded-full transition-all"
          style={{
            background: `${COLORS.accent}10`,
            color: `${COLORS.accent}88`,
            border: `1px solid ${COLORS.accent}22`,
          }}
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
