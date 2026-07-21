// Crisp SVG QR code, generated fully in-app by src/lib/qr.ts (no network,
// no npm package). Always dark-on-white with a 4-module quiet zone so phone
// cameras scan it reliably on any page theme.

import { qrMatrix } from '@/lib/qr';

export default function QRCode({
  value, size = 220, label, className,
}: { value: string; size?: number; label?: string; className?: string }) {
  let matrix: boolean[][];
  try { matrix = qrMatrix(value); } catch { return null; }

  const n = matrix.length;
  const quiet = 4;
  const total = n + quiet * 2;
  let d = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (matrix[y][x]) d += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    }
  }
  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      width={size}
      height={size}
      role="img"
      aria-label={label || `QR code for ${value}`}
      shapeRendering="crispEdges"
      className={className}
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      <rect width={total} height={total} fill="#FFFFFF" />
      <path d={d} fill="#141320" />
    </svg>
  );
}
