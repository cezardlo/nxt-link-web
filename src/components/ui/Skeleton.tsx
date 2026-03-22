'use client';

type SkeletonProps = {
  className?: string;
  lines?: number;
  height?: number;
};

/** Shimmer loading skeleton — uses globals.css .shimmer animation */
export function Skeleton({ className = '', lines = 1, height = 14 }: SkeletonProps) {
  if (lines > 1) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="shimmer rounded-sm"
            style={{ height, width: i === lines - 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  return <div className={`shimmer rounded-sm ${className}`} style={{ height }} />;
}

/** Card-shaped skeleton with accent bar */
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white/[0.02] border border-white/[0.06] rounded-sm p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Skeleton height={8} className="w-16" />
        <Skeleton height={8} className="w-12" />
      </div>
      <Skeleton lines={2} height={12} className="mb-2" />
      <Skeleton height={10} className="w-24" />
    </div>
  );
}
