export default function MarketplaceLoading() {
  return (
    <main className="min-h-screen bg-nxt-bg px-4 py-8 text-nxt-text sm:px-6">
      <div className="mx-auto max-w-[1380px] animate-pulse space-y-5">
        <div className="h-80 rounded-[2rem] border border-white/[0.08] bg-white/[0.025]" />
        <div className="h-24 rounded-3xl border border-white/[0.08] bg-white/[0.025]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-80 rounded-3xl border border-white/[0.08] bg-white/[0.025]" />
          ))}
        </div>
      </div>
    </main>
  );
}
