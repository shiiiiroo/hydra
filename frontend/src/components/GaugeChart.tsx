import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import type { StatusCount } from '../types';

const COLORS: Record<string, string> = {
  ok: '#22c55e', watch: '#0ea5e9', repair: '#f97316', critical: '#ef4444',
};

export default function GaugeChart({ data, total }: { data: StatusCount[]; total: number }) {
  const { t } = useTranslation();
  const healthScore = total > 0 ? Math.round(((data.find((d) => d.status === 'ok')?.count ?? 0) / total) * 100) : 0;

  const chartData = data.map((d) => ({ name: t(`status.${d.status}`), value: d.count, status: d.status }));

  return (
    <div className="relative h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            cx="50%"
            cy="78%"
            startAngle={180}
            endAngle={0}
            innerRadius={70}
            outerRadius={105}
            paddingAngle={2}
            stroke="none"
          >
            {chartData.map((entry) => (
              <Cell key={entry.status} fill={COLORS[entry.status]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-x-0 bottom-2 flex flex-col items-center">
        <span className="text-3xl font-black text-white font-mono">{healthScore}%</span>
        <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">{t('status.ok')}</span>
      </div>
      <div className="flex justify-center gap-3 flex-wrap mt-1">
        {data.map((d) => (
          <div key={d.status} className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full" style={{ background: COLORS[d.status] }} />
            {t(`status_short.${d.status}`)} · {d.count}
          </div>
        ))}
      </div>
    </div>
  );
}
