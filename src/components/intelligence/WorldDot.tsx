type Props = {
  x: number;
  y: number;
  tier: 'P0' | 'P1' | 'P2';
  color: string;
  onClick?: () => void;
};

const SIZE: Record<Props['tier'], number> = {
  P0: 14,
  P1: 10,
  P2: 7,
};

export function WorldDot({ x, y, tier, color, onClick }: Props) {
  const r = SIZE[tier] / 2;
  return (
    <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <circle cx={x} cy={y} r={r + 1.5} fill={`${color}22`} />
      <circle cx={x} cy={y} r={r} fill={color} />
    </g>
  );
}

