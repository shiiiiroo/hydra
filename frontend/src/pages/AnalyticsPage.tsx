import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fetchAnalytics } from '../api/resources';
import type { AnalyticsOverview } from '../types';
import GaugeChart from '../components/GaugeChart';
import StatusBadge from '../components/StatusBadge';
import ObjectModal from '../components/ObjectModal';
import { Spinner } from '../components/Feedback';

const AXIS_STYLE = { fontSize: 11, fill: '#64748b' };
const TOOLTIP_STYLE = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, fontSize: 12, color: '#f1f5f9' };

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    fetchAnalytics().then(setData);
  }, []);

  if (!data) return <Spinner />;

  const decadeData = data.by_decade.map((d) => ({ name: `${d.decade}s`, count: d.count }));
  const districtData = data.by_district.map((d) => ({
    name: d.anchor_name, critical: d.critical_count, other: d.count - d.critical_count,
  }));
  const kpdData = [{ name: '', design: (data.avg_kpd_design ?? 0) * 100, actual: (data.avg_kpd_actual ?? 0) * 100 }];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-white">{t('analytics_page.title')}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{t('analytics_page.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-1">{t('analytics_page.chart_by_status')}</h3>
          <GaugeChart data={data.by_status} total={data.by_status.reduce((a, b) => a + b.count, 0)} />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3">{t('analytics_page.kpd_title')}</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={kpdData} layout="vertical">
              <XAxis type="number" domain={[0, 100]} tick={AXIS_STYLE} unit="%" />
              <YAxis type="category" dataKey="name" tick={false} width={10} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="design" name={t('analytics_page.kpd_design')} fill="#6366f1" radius={6} barSize={28} />
              <Bar dataKey="actual" name={t('analytics_page.kpd_actual')} fill="#f97316" radius={6} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-slate-500 mt-2">
            {t('analytics_page.reconstruction_title')}: <b className="text-white">{Math.round(data.reconstruction_needed_share * 100)}%</b>
            {data.total_length_km && <> · {t('analytics_page.total_length_title')}: <b className="text-white">{data.total_length_km} км</b></>}
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">{t('analytics_page.chart_by_district')}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={districtData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" tick={AXIS_STYLE} angle={-25} textAnchor="end" height={70} interval={0} />
            <YAxis tick={AXIS_STYLE} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="other" name={t('status_short.ok')} stackId="a" fill="#475569" radius={[0, 0, 0, 0]} />
            <Bar dataKey="critical" name={t('status.critical')} stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">{t('analytics_page.chart_by_decade')}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={decadeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" tick={AXIS_STYLE} />
            <YAxis tick={AXIS_STYLE} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">{t('analytics_page.top_risky_title')}</h3>
        <table className="w-full text-left text-xs">
          <thead className="text-[10.5px] uppercase font-bold text-slate-500">
            <tr>
              <th className="px-3 py-2">{t('objects_page.col_code')}</th>
              <th className="px-3 py-2">{t('objects_page.col_status')}</th>
              <th className="px-3 py-2">{t('objects_page.col_risk')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {data.top_risky.map((o) => (
              <tr key={o.id} className="hover:bg-slate-800/30 cursor-pointer" onClick={() => setOpenId(o.id)}>
                <td className="px-3 py-2.5 font-bold text-indigo-400">{o.code}</td>
                <td className="px-3 py-2.5"><StatusBadge status={o.status} /></td>
                <td className="px-3 py-2.5 font-mono font-bold text-white">{o.risk_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openId && <ObjectModal objectId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
