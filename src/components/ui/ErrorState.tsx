'use client';
import { Button } from './Button';

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

export function EmptyState({ message = 'No data yet.' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <span className="font-mono text-[10px] tracking-[0.15em] text-white/15">
        {message}
      </span>
    </div>
  );
}
