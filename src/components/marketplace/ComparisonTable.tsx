'use client';

import type { MarketplaceProduct } from '@/types/marketplace';

type Props = {
  products: MarketplaceProduct[];
};

const PRICE_ORDER: Record<string, number> = { low: 1, medium: 2, high: 3, enterprise: 4 };
const IMPL_ORDER: Record<string, number> = { easy: 1, moderate: 2, advanced: 3 };

type Row = {
  label: string;
  getValue: (p: MarketplaceProduct) => string | number;
  best: 'max' | 'min' | 'none';
  getNumeric?: (p: MarketplaceProduct) => number;
};

const ROWS: Row[] = [
  {
    label: 'NXT Score',
    getValue: (p) => p.recommendationScore,
    best: 'max',
  },
  {
    label: 'Price',
    getValue: (p) => p.priceEstimate,
    best: 'min',
    getNumeric: (p) => PRICE_ORDER[p.priceEstimate] ?? 2,
  },
  {
    label: 'Deploy Time',
    getValue: (p) => p.deploymentTimeline,
    best: 'none',
  },
  {
    label: 'Difficulty',
    getValue: (p) => p.implementationDifficulty,
    best: 'min',
    getNumeric: (p) => IMPL_ORDER[p.implementationDifficulty] ?? 2,
  },
  {
    label: 'Maturity',
    getValue: (p) => p.maturity,
    best: 'none',
  },
  {
    label: 'Momentum',
    getValue: (p) => p.momentum,
    best: 'none',
  },
  {
    label: 'Best For',
    getValue: (p) => p.bestFor.slice(0, 2).join('; '),
    best: 'none',
  },
  {
    label: 'Features',
    getValue: (p) => p.features.length,
    best: 'max',
  },
];

function findWinnerIdx(products: MarketplaceProduct[], row: Row): number {
  if (row.best === 'none' || products.length < 2) return -1;
  const nums = products.map((p) =>
    row.getNumeric ? row.getNumeric(p) : Number(row.getValue(p)),
  );
  const target = row.best === 'max' ? Math.max(...nums) : Math.min(...nums);
  return nums.indexOf(target);
}

export function ComparisonTable({ products }: Props) {
  if (products.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      {/* Desktop table */}
      <table className="hidden md:table w-full border-collapse">
        <thead>
          <tr>
            <th className="p-3 text-left font-mono text-[9px] tracking-[0.2em] text-white/30 uppercase border-b border-white/[0.06]" />
            {products.map((p) => (
              <th
                key={p.id}
                className="p-3 text-left font-mono text-[11px] font-semibold text-white/80 border-b border-white/[0.06]"
              >
                <div>{p.name}</div>
                <div className="font-normal text-[8px] text-white/30 mt-0.5">
                  {p.company}
                </div>
                {p.isNxtPick && (
                  <span className="inline-block mt-1 px-1.5 py-0.5 text-[7px] tracking-[0.15em] text-[#ffd700] border border-[#ffd700]/30 bg-[#ffd700]/10 rounded-sm">
                    NXT PICK
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => {
            const winnerIdx = findWinnerIdx(products, row);
            return (
              <tr key={row.label} className="border-b border-white/[0.03]">
                <td className="p-3 font-mono text-[9px] tracking-[0.15em] text-white/30 uppercase whitespace-nowrap">
                  {row.label}
                </td>
                {products.map((p, idx) => (
                  <td
                    key={p.id}
                    className="p-3 font-mono text-[11px] capitalize"
                    style={{
                      color:
                        idx === winnerIdx
                          ? '#00ff88'
                          : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {String(row.getValue(p))}
                    {idx === winnerIdx && (
                      <span className="ml-1.5 text-[7px] text-[#00ff88]/60">
                        BEST
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile stacked */}
      <div className="md:hidden flex flex-col gap-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="p-4 bg-white/[0.015] border border-white/[0.06] rounded-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-mono text-[13px] font-semibold text-white/90">
                  {p.name}
                </h4>
                <span className="font-mono text-[9px] text-white/30">
                  {p.company}
                </span>
              </div>
              {p.isNxtPick && (
                <span className="px-1.5 py-0.5 text-[7px] tracking-[0.15em] text-[#ffd700] border border-[#ffd700]/30 bg-[#ffd700]/10 rounded-sm font-mono">
                  NXT PICK
                </span>
              )}
            </div>
            {ROWS.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0"
              >
                <span className="font-mono text-[8px] tracking-[0.15em] text-white/25 uppercase">
                  {row.label}
                </span>
                <span className="font-mono text-[10px] text-white/50 capitalize">
                  {String(row.getValue(p))}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
