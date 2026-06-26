import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Droplet } from 'lucide-react';
import { fetchCategories, fetchObjects } from '../api/resources';
import type { CategoriesOut, HydroObjectListItem, Status } from '../types';
import StatusBadge from '../components/StatusBadge';
import ObjectModal from '../components/ObjectModal';
import { Spinner } from '../components/Feedback';

const COLUMN_COLOR: Record<Status, string> = {
  ok: 'border-emerald-500/30', watch: 'border-sky-500/30', repair: 'border-orange-500/30', critical: 'border-rose-500/30',
};

export default function CategoriesPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<CategoriesOut | null>(null);
  const [columns, setColumns] = useState<Record<Status, HydroObjectListItem[]>>({ ok: [], watch: [], repair: [], critical: [] });
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories().then(setCategories);
    (['ok', 'watch', 'repair', 'critical'] as Status[]).forEach((s) => {
      fetchObjects({ status: s, sort_by: 'risk_score', sort_dir: 'desc', page_size: 8 }).then((res) =>
        setColumns((c) => ({ ...c, [s]: res.items }))
      );
    });
  }, []);

  if (!categories) return <Spinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-white">{t('categories_page.title')}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{t('categories_page.subtitle')}</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">{t('categories_page.types_title')}</h3>
        {categories.types.map((tp) => (
          <div key={tp.object_type} className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="flex items-center gap-2 text-sm font-semibold text-white"><Droplet className="w-4 h-4 text-indigo-400" /> {tp.label}</span>
            <span className="text-xs text-slate-500 font-mono">{tp.count}</span>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">{t('categories_page.significance_title')}</h3>
        <div className="space-y-2">
          {categories.significance.map((s) => (
            <div key={s.significance} className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl">
              <div>
                <div className="text-sm font-semibold text-white">{s.label}</div>
                <div className="text-[11px] text-slate-500">{s.description}</div>
              </div>
              <span className="text-base font-black text-white font-mono">{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-1">{t('categories_page.statuses_title')}</h3>
        <p className="text-xs text-slate-500 mb-4">{t('categories_page.kanban_hint')}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.statuses.map((s) => (
            <div key={s.status} className={`bg-slate-950 border ${COLUMN_COLOR[s.status]} rounded-xl p-3.5`}>
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                <StatusBadge status={s.status} />
                <span className="text-lg font-black text-white font-mono">{s.count}</span>
              </div>
              <p className="text-[10.5px] text-slate-500 mb-3 leading-relaxed">
                {t('categories_page.criteria_label')}: {s.criteria}<br />
                {t('categories_page.inspection_label')}: {t('categories_page.every_n_months', { count: s.inspection_months })}
              </p>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {columns[s.status].map((o) => (
                  <div key={o.id} onClick={() => setOpenId(o.id)} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 cursor-pointer hover:border-slate-700">
                    <div className="text-xs font-bold text-indigo-400">{o.code}</div>
                    <div className="text-[11px] text-slate-500">{o.district_raw} · {o.commission_year ?? '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {openId && <ObjectModal objectId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
