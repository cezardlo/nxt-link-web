type Props = {
  label: string;
};

export function LoadingSkeleton({ label }: Props) {
  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-1 h-1 rounded-full bg-[#00d4ff] animate-pulse" style={{ boxShadow: '0 0 4px #00d4ffcc' }} />
        <span className="font-mono text-[8px] tracking-[0.3em] text-white/20 uppercase">{label}</span>
      </div>
      <div className="h-2 w-full rounded-sm shimmer" />
      <div className="h-2 w-5/6 rounded-sm shimmer" />
      <div className="h-2 w-4/5 rounded-sm shimmer" />
      <div className="mt-2 h-2 w-full rounded-sm shimmer" />
      <div className="h-2 w-3/4 rounded-sm shimmer" />
      <div className="mt-2 h-2 w-full rounded-sm shimmer" />
      <div className="h-2 w-5/6 rounded-sm shimmer" />
    </div>
  );
}
