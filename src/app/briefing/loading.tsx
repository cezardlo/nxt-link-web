export default function Loading() {
  return (
    <div className="min-h-screen bg-black p-6 animate-pulse">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-10 w-64 bg-zinc-900 rounded-lg" />
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-32 bg-zinc-900 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
