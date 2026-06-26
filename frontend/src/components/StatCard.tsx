import type { ReactNode } from 'react';
import clsx from 'clsx';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  colorClass?: string;
  onClick?: () => void;
}

export default function StatCard({ label, value, icon, colorClass = 'text-slate-300 bg-slate-800', onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={clsx(
        'bg-slate-900 border border-slate-800 rounded-2xl p-4 text-left transition-all',
        onClick && 'hover:border-slate-700 hover:-translate-y-0.5 cursor-pointer'
      )}
    >
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</div>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-black text-white font-mono">{value}</span>
        <span className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', colorClass)}>{icon}</span>
      </div>
    </button>
  );
}
