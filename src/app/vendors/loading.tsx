export default function Loading() {
  return (
    <div className="min-h-screen bg-black p-6 animate-pulse">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-10 w-48 bg-zinc-900 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-40 bg-zinc-900 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
