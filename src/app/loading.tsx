export default function Loading() {
  return (
    <div className="min-h-screen bg-black p-6 animate-pulse">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Search bar skeleton */}
        <div className="h-14 bg-zinc-900 rounded-xl" />
        {/* Decision cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-48 bg-zinc-900 rounded-xl" />
          ))}
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 bg-zinc-900 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
