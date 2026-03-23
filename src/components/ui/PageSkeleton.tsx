import { COLORS } from '@/lib/tokens';

type Props = {
  lines?: number;
  cards?: number;
};

export default function PageSkeleton({ lines = 6, cards = 0 }: Props) {
  const widths = ['100%', '85%', '92%', '70%', '78%', '95%', '60%', '88%'];

  return (
    <div className="flex flex-col gap-4 py-8 px-6 max-w-[640px] mx-auto">
      {/* Line skeletons */}
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={`line-${i}`}
          className="shimmer rounded-lg"
          style={{
            height: i === 0 ? 24 : 14,
            width: widths[i % widths.length],
            background: `linear-gradient(90deg, ${COLORS.card} 0%, ${COLORS.border} 40%, ${COLORS.card} 80%)`,
            backgroundSize: '1200px 100%',
          }}
        />
      ))}

      {/* Card skeletons */}
      {cards > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {Array.from({ length: cards }).map((_, i) => (
            <div
              key={`card-${i}`}
              className="shimmer rounded-2xl"
              style={{
                height: 120,
                background: `linear-gradient(90deg, ${COLORS.card} 0%, ${COLORS.border} 40%, ${COLORS.card} 80%)`,
                backgroundSize: '1200px 100%',
                border: `1px solid ${COLORS.border}`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
