// Global route-loading fallback — Design System v1.0 light skeleton
// (was a black bg + zinc-900 skeleton, which flashed dark against the
// light marketplace/homepage it was loading into). Same shapes, spec tokens.
export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--spec-warm-white)] p-6 animate-pulse">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Search bar skeleton */}
        <div className="h-14 rounded-2xl bg-[var(--spec-surface)] border border-[var(--spec-border)]" />
        {/* Decision cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-[var(--spec-surface)] border border-[var(--spec-border)]" />
          ))}
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--spec-surface)] border border-[var(--spec-border)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
