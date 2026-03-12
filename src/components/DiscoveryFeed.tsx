'use client';

type FeedItem = {
  title: string;
  category: string;
  source: string;
  timeAgo: string;
  url?: string;
};

type Props = {
  items: FeedItem[];
  accentColor: string;
  loading?: boolean;
};

const CATEGORY_COLORS: Record<string, string> = {
  'AI':             '#60a5fa',
  'Energy':         '#ffd700',
  'Defense':        '#ff6400',
  'Healthcare':     '#00ff88',
  'Logistics':      '#ffb800',
  'Cybersecurity':  '#00d4ff',
  'Manufacturing':  '#00d4ff',
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? '#00d4ff';
}

export default function DiscoveryFeed({ items, accentColor, loading = false }: Props) {
  return (
    <div className="flex flex-col bg-black border border-white/[0.06] rounded-sm font-mono">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            backgroundColor: '#00ff88',
            boxShadow: '0 0 6px #00ff88cc',
          }}
        />
        <span
          className="text-[9px] tracking-widest uppercase"
          style={{ color: accentColor }}
        >
          Today in Technology
        </span>
      </div>

      {/* Body */}
      <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex flex-col gap-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 mx-3 my-1.5 rounded-sm bg-white/[0.02] animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-16 px-3">
            <span className="text-[9px] text-white/20 tracking-wide">
              No discoveries yet
            </span>
          </div>
        ) : (
          <ul>
            {items.map((item, i) => {
              const dotColor = getCategoryColor(item.category);
              const inner = (
                <div className="flex items-start gap-2.5 px-3 py-2.5 border-b border-white/[0.03] group cursor-pointer hover:bg-white/[0.03] transition-colors duration-150">
                  {/* Category dot */}
                  <span
                    className="mt-[3px] w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: dotColor,
                      boxShadow: `0 0 6px ${dotColor}cc`,
                    }}
                  />

                  {/* Middle: title + source */}
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="text-[9px] text-white/70 group-hover:text-white/90 transition-colors duration-150 leading-tight line-clamp-2">
                      {item.title}
                    </span>
                    <span className="text-[7px] text-white/20 tracking-wide uppercase truncate">
                      {item.source}
                    </span>
                  </div>

                  {/* Right: timeAgo */}
                  <span className="text-[7px] text-white/15 flex-shrink-0 mt-[3px] tabular-nums">
                    {item.timeAgo}
                  </span>
                </div>
              );

              return (
                <li key={i}>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
