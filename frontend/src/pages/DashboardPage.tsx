import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import { Database, ShieldCheck, Eye, Wrench, AlertTriangle, FileText, ShieldAlert, CalendarClock, Info } from 'lucide-react';
import { fetchDashboardStats, fetchMapPoints } from '../api/resources';
import type { DashboardStats, MapPoint } from '../types';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { Spinner, ErrorState } from '../components/Feedback';

const STATUS_COLOR: Record<string, string> = { ok: '#22c55e', watch: '#0ea5e9', repair: '#f97316', critical: '#ef4444' };

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [error, setError] = useState(false);

  const load = () => {
    setError(false);
    Promise.all([fetchDashboardStats(), fetchMapPoints({})])
      .then(([s, p]) => { setStats(s); setPoints(p); })
      .catch(() => setError(true));
  };

  useEffect(load, []);

  if (error) return <ErrorState onRetry={load} />;
  if (!stats) return <Spinner />;

  const goToObjects = (status?: string) => navigate(status ? `/objects?status=${status}` : '/objects');

  const quickReports = [
    { id: 'summary', icon: FileText },
    { id: 'attention', icon: ShieldAlert },
    { id: 'inspection_schedule', icon: CalendarClock },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">{t('dashboard.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('dashboard.subtitle')}</p>
        </div>
      </div>

      <div className="flex items-start gap-2.5 px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 text-[12px]">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        {t('dashboard.data_note')}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label={t('dashboard.stat_total')} value={stats.total} icon={<Database className="w-4.5 h-4.5" />} colorClass="text-slate-300 bg-slate-800" onClick={() => goToObjects()} />
        <StatCard label={t('dashboard.stat_ok')} value={stats.ok} icon={<ShieldCheck className="w-4.5 h-4.5" />} colorClass="text-emerald-400 bg-emerald-500/10" onClick={() => goToObjects('ok')} />
        <StatCard label={t('dashboard.stat_watch')} value={stats.watch} icon={<Eye className="w-4.5 h-4.5" />} colorClass="text-sky-400 bg-sky-500/10" onClick={() => goToObjects('watch')} />
        <StatCard label={t('dashboard.stat_repair')} value={stats.repair} icon={<Wrench className="w-4.5 h-4.5" />} colorClass="text-orange-400 bg-orange-500/10" onClick={() => goToObjects('repair')} />
        <StatCard label={t('dashboard.stat_critical')} value={stats.critical} icon={<AlertTriangle className="w-4.5 h-4.5" />} colorClass="text-rose-400 bg-rose-500/10" onClick={() => goToObjects('critical')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">{t('dashboard.map_preview_title')}</h3>
            <button onClick={() => navigate('/map')} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              {t('dashboard.map_preview_open')} →
            </button>
          </div>
          <div className="h-64 rounded-xl overflow-hidden border border-slate-800 relative isolate">
            <MapContainer center={[43.0, 71.8]} zoom={6} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false} dragging={false} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {points.map((p) => (
                <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={3.5} pathOptions={{ color: STATUS_COLOR[p.status], fillColor: STATUS_COLOR[p.status], fillOpacity: 0.9, weight: 1 }} />
              ))}
            </MapContainer>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3">{t('dashboard.recent_title')}</h3>
          <div className="space-y-2.5 max-h-64 overflow-y-auto">
            {stats.last_updated_objects.map((o) => (
              <div key={o.id} onClick={() => navigate(`/objects?open=${o.id}`)} className="flex items-center justify-between cursor-pointer hover:bg-slate-800/40 rounded-lg px-2 py-1.5 -mx-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{o.code} · {o.district_raw}</div>
                  <div className="text-[11px] text-slate-500">{o.water_source} · {o.commission_year ?? '—'}</div>
                </div>
                <StatusBadge status={o.status} short />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">{t('dashboard.quick_reports_title')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickReports.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/reports?report=${r.id}`)}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-800 bg-slate-950 hover:border-slate-700 text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                <r.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{t(`reports_page.report_${r.id}_title`)}</div>
                <div className="text-[11px] text-slate-500 truncate">{t(`reports_page.report_${r.id}_desc`)}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
