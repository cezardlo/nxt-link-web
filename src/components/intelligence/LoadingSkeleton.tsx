type Props = {
  rows?: number;
  height?: number;
};

export function LoadingSkeleton({ rows = 3, height = 12 }: Props) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          style={{
            height,
            borderRadius: 4,
            background: 'linear-gradient(90deg, #101010 0%, #1b1b1b 50%, #101010 100%)',
            backgroundSize: '200% 100%',
            animation: 'brain-shimmer 1.5s linear infinite',
          }}
        />
      ))}
      <style>{`
        @keyframes brain-shimmer {
          0% { background-position: 0% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

