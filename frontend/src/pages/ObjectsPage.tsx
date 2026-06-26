import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { fetchObjects, deleteObject } from '../api/resources';
import type { HydroObjectListItem, Status } from '../types';
import StatusBadge from '../components/StatusBadge';
import ObjectModal from '../components/ObjectModal';
import ObjectFormModal from '../components/ObjectFormModal';
import { ConfirmDialog, Spinner } from '../components/Feedback';
import { useAuth } from '../auth/AuthContext';

const COLUMNS: { key: string; tkey: string }[] = [
  { key: 'code', tkey: 'col_code' },
  { key: 'district_raw', tkey: 'col_district' },
  { key: 'water_source', tkey: 'col_water_source' },
  { key: 'commission_year', tkey: 'col_year' },
  { key: 'wear_percent', tkey: 'col_wear' },
  { key: 'condition_source', tkey: 'col_condition' },
  { key: 'status', tkey: 'col_status' },
  { key: 'risk_score', tkey: 'col_risk' },
];

export default function ObjectsPage() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(params.get('status') || '');
  const [sortBy, setSortBy] = useState('risk_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [data, setData] = useState<{ items: HydroObjectListItem[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(params.get('open') ? Number(params.get('open')) : null);
  const [editing, setEditing] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    fetchObjects({ search: search || undefined, status: status || undefined, sort_by: sortBy, sort_dir: sortDir, page, page_size: pageSize })
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(load, [search, status, sortBy, sortDir, page]);

  useEffect(() => {
    if (status) setParams({ status }, { replace: true });
  }, []);

  const toggleSort = (key: string) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('desc'); }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  const handleDelete = async () => {
    if (deleteTarget == null) return;
    await deleteObject(deleteTarget);
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">{t('objects_page.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('objects_page.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('common.search')}
              className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white w-64 placeholder:text-slate-600 focus:outline-none focus:border-indigo-600"
            />
          </div>
          {hasRole('admin', 'inspector') && (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl">
              <Plus className="w-4 h-4" /> {t('common.add_object')}
            </button>
          )}
        </div>
      </div>

      {!hasRole('admin', 'inspector') && (
        <p className="text-[11px] text-slate-500 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">{t('objects_page.readonly_note')}</p>
      )}

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => { setStatus(''); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${!status ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
          {t('common.all_statuses')}
        </button>
        {(['ok', 'watch', 'repair', 'critical'] as Status[]).map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${status === s ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
            {t(`status_short.${s}`)}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-[10.5px] uppercase font-bold text-slate-500">
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.key} onClick={() => toggleSort(c.key)} className="px-4 py-3 cursor-pointer hover:text-slate-300 select-none whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      {t(`objects_page.${c.tkey}`)}
                      {sortBy === c.key && (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={9} className="py-10"><Spinner /></td></tr>
              ) : data && data.items.length > 0 ? (
                data.items.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/30 cursor-pointer" onClick={() => setOpenId(o.id)}>
                    <td className="px-4 py-3 font-bold text-indigo-400">{o.code}</td>
                    <td className="px-4 py-3 text-slate-300">{o.district_raw || '—'}</td>
                    <td className="px-4 py-3 text-slate-300">{o.water_source || '—'}</td>
                    <td className="px-4 py-3 text-slate-300 font-mono">{o.commission_year ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-300 font-mono">{o.wear_percent ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-300">{o.condition_source || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 font-mono font-bold text-white">{o.risk_score}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {hasRole('admin') && (
                        <button onClick={() => setDeleteTarget(o.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={9} className="py-10 text-center text-slate-500">{t('objects_page.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {data && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-500">
            <span>{t('common.page')} {page} {t('common.of')} {totalPages} · {data.total}</span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-7 h-7 rounded-lg border border-slate-800 disabled:opacity-40">‹</button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="w-7 h-7 rounded-lg border border-slate-800 disabled:opacity-40">›</button>
            </div>
          </div>
        )}
      </div>

      {openId && (
        <ObjectModal
          objectId={openId}
          onClose={() => setOpenId(null)}
          onEdit={(obj) => { setEditing(obj); setOpenId(null); }}
        />
      )}
      {(showAdd || editing) && (
        <ObjectFormModal
          existing={editing}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSaved={() => { setShowAdd(false); setEditing(null); load(); }}
        />
      )}
      <ConfirmDialog open={deleteTarget != null} message={t('common.confirm_delete')} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
