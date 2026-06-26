import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Info, Layers } from 'lucide-react';
import clsx from 'clsx';
import { fetchMapPoints } from '../api/resources';
import type { MapPoint, Status } from '../types';
import StatusBadge from '../components/StatusBadge';
import ObjectModal from '../components/ObjectModal';
import { Spinner } from '../components/Feedback';

type LayerMode = 'status' | 'wear' | 'year';

const STATUS_COLOR: Record<Status, string> = { ok: '#22c55e', watch: '#0ea5e9', repair: '#f97316', critical: '#ef4444' };

function wearColor(wear: number | null | undefined): string {
  if (wear == null) return '#64748b';
  if (wear <= 25) return '#22c55e';
  if (wear <= 50) return '#eab308';
  if (wear <= 75) return '#f97316';
  return '#ef4444';
}

function yearColor(year: number | null | undefined): string {
  if (!year) return '#64748b';
  if (year < 1950) return '#a855f7';
  if (year < 1980) return '#6366f1';
  return '#14b8a6';
}

export default function MapPage() {
  const { t } = useTranslation();
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [layer, setLayer] = useState<LayerMode>('status');
  const [statusFilter, setStatusFilter] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchMapPoints({ status: statusFilter || undefined }).then((p) => { setPoints(p); setLoading(false); });
  }, [statusFilter]);

  const colorFor = useMemo(() => {
    return (p: MapPoint) => {
      if (layer === 'status') return STATUS_COLOR[p.status];
      if (layer === 'wear') return wearColor(p.wear_percent);
      return yearColor(p.commission_year);
    };
  }, [layer]);

  const layers: { id: LayerMode; label: string }[] = [
    { id: 'status', label: t('map.layer_status') },
    { id: 'wear', label: t('map.layer_wear') },
    { id: 'year', label: t('map.layer_year') },
  ];

  return (
    <div className="space-y-4 animate-fade-in h-full flex flex-col">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">{t('map.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('map.subtitle')} · {points.length} {t('map.shown_count').toLowerCase()}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> {t('map.mode_label')}
          </span>
          {layers.map((l) => (
            <button
              key={l.id}
              onClick={() => setLayer(l.id)}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
                layer === l.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2.5 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-[12px]">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        {t('map.approx_banner')}
      </div>

      <div className="relative isolate flex-1 min-h-[480px] rounded-2xl overflow-hidden border border-slate-800">
        {loading && <div className="absolute inset-0 bg-slate-950/60 z-10 flex items-center justify-center"><Spinner /></div>}
        <MapContainer center={[43.0, 71.8]} zoom={7} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          {points.map((p) => (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={6}
              pathOptions={{ color: colorFor(p), fillColor: colorFor(p), fillOpacity: 0.85, weight: 1.5 }}
            >
              <Popup>
                <div className="text-xs space-y-1 min-w-[160px]">
                  <div className="font-bold">{p.code} — {p.district_raw}</div>
                  <div>{t('objects_page.col_year')}: {p.commission_year ?? '—'}</div>
                  <div>{t('objects_page.col_wear')}: {p.wear_percent ?? '—'}</div>
                  <div className="pt-1"><StatusBadge status={p.status} /></div>
                  <button onClick={() => setOpenId(p.id)} className="mt-1.5 text-[11px] font-semibold text-indigo-600 underline">
                    {t('common.details')}
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        <div className="absolute bottom-4 left-4 z-[500] bg-slate-900/95 border border-slate-800 rounded-xl px-3.5 py-3 text-xs space-y-1.5 backdrop-blur">
          <div className="font-bold text-white mb-1">{t('map.legend_title')}</div>
          {layer === 'status' &&
            (['ok', 'watch', 'repair', 'critical'] as Status[]).map((s) => (
              <div key={s} className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />
                {t(`status_short.${s}`)}
              </div>
            ))}
          {layer === 'wear' && (
            <>
              <LegendDot color="#22c55e" label="0–25%" />
              <LegendDot color="#eab308" label="25–50%" />
              <LegendDot color="#f97316" label="50–75%" />
              <LegendDot color="#ef4444" label="75–100%" />
            </>
          )}
          {layer === 'year' && (
            <>
              <LegendDot color="#a855f7" label="< 1950" />
              <LegendDot color="#6366f1" label="1950–1980" />
              <LegendDot color="#14b8a6" label="> 1980" />
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setStatusFilter('')} className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold', !statusFilter ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800')}>
          {t('common.all_statuses')}
        </button>
        {(['ok', 'watch', 'repair', 'critical'] as Status[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold', statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800')}
          >
            {t(`status_short.${s}`)}
          </button>
        ))}
      </div>

      {openId && <ObjectModal objectId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-300">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {label}
    </div>
  );
}
