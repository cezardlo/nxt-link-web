export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-zinc-700 border-t-emerald-500 rounded-full animate-spin mx-auto" />
        <p className="text-zinc-500">Loading Brain Map...</p>
      </div>
    </div>
  );
}
