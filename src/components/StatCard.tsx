import { clsx } from 'clsx';

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'blue' | 'purple' | 'green' | 'yellow' | 'gray';
};

const accentMap: Record<NonNullable<StatCardProps['accent']>, string> = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  purple: 'border-purple-200 bg-purple-50 text-purple-700',
  green: 'border-green-200 bg-green-50 text-green-700',
  yellow: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  gray: 'border-slate-200 bg-slate-50 text-slate-700',
};

export function StatCard({ label, value, hint, accent = 'blue' }: StatCardProps) {
  return (
    <div className={clsx('rounded-lg border p-4 shadow-sm', accentMap[accent])}>
      <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-600">{hint}</p> : null}
    </div>
  );
}
