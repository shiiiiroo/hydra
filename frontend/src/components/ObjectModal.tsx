import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download, FolderOpen, Pencil } from 'lucide-react';
import { fetchObject, downloadPassport } from '../api/resources';
import type { HydroObjectDetail } from '../types';
import StatusBadge from './StatusBadge';
import { Spinner } from './Feedback';
import { useAuth } from '../auth/AuthContext';

type Tab = 'info' | 'params' | 'documents' | 'history';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm font-medium text-slate-100">{value}</div>
    </div>
  );
}

export default function ObjectModal({
  objectId, onClose, onEdit,
}: { objectId: number; onClose: () => void; onEdit?: (obj: HydroObjectDetail) => void }) {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const [obj, setObj] = useState<HydroObjectDetail | null>(null);
  const [tab, setTab] = useState<Tab>('info');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchObject(objectId).then(setObj).finally(() => setLoading(false));
  }, [objectId]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'info', label: t('object_modal.tab_info') },
    { id: 'params', label: t('object_modal.tab_params') },
    { id: 'documents', label: t('object_modal.tab_documents') },
    { id: 'history', label: t('object_modal.tab_history') },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-slate-900 rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-800 flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !obj ? (
          <div className="p-10"><Spinner /></div>
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 rounded-t-2xl shrink-0">
              <div>
                <div className="text-[11px] font-bold text-slate-500 tracking-wide">{obj.code}</div>
                <div className="flex items-center gap-3 mt-0.5">
                  <h2 className="text-lg font-bold text-white">{obj.display_name}</h2>
                  <StatusBadge status={obj.status} />
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pt-3 border-b border-slate-800 flex gap-5 shrink-0">
              {tabs.map((tb) => (
                <button
                  key={tb.id}
                  onClick={() => setTab(tb.id)}
                  className={`pb-2.5 text-[13px] font-semibold border-b-2 transition-colors ${
                    tab === tb.id ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-300'
                  }`}
                >
                  {tb.label}
                </button>
              ))}
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {tab === 'info' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <Field label={t('object_modal.field_type')} value={t('objects_page.title') ? 'Канал' : '—'} />
                    <Field label={t('object_modal.field_district')} value={obj.district_raw || '—'} />
                    <Field
                      label={t('object_modal.field_coords')}
                      value={obj.lat ? `${obj.lat}, ${obj.lng} (${obj.anchor_name}, ${t('common.approx_coords')})` : '—'}
                    />
                    <Field label={t('object_modal.field_water_source')} value={obj.water_source || '—'} />
                    <Field label={t('object_modal.field_purpose')} value={t('object_modal.field_purpose_value')} />
                    <Field label={t('object_modal.field_owner')} value={t('object_modal.field_owner_value')} />
                    <Field label={t('object_modal.field_year')} value={obj.commission_year ?? '—'} />
                    <Field label={t('object_modal.field_significance')} value={t(`significance.${obj.significance}`)} />
                    <Field
                      label={t('object_modal.field_last_inspection')}
                      value={obj.last_inspection_date || '—'}
                    />
                    <Field
                      label={t('object_modal.field_next_inspection')}
                      value={
                        <>
                          {obj.next_inspection_date || '—'}
                          {obj.next_inspection_date && new Date(obj.next_inspection_date) < new Date() && (
                            <span className="text-rose-400 font-bold ml-1.5">({t('object_modal.overdue')})</span>
                          )}
                        </>
                      }
                    />
                  </div>
                  <div>
                    <div className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                      {t('object_modal.field_description')}
                    </div>
                    <p className="text-sm text-slate-300">{obj.description || t('common.not_specified')}</p>
                  </div>
                </div>
              )}

              {tab === 'params' && (
                <div className="grid grid-cols-2 gap-5">
                  <Field label={t('object_modal.field_capacity')} value={obj.capacity_m3s ?? '—'} />
                  <Field label={t('object_modal.field_length_before')} value={obj.length_before_km ?? '—'} />
                  <Field
                    label={t('object_modal.field_length_after')}
                    value={obj.length_after_km ?? <span className="text-slate-500">{t('object_modal.no_reconstruction')}</span>}
                  />
                  <Field label={t('object_modal.field_area')} value={obj.area_ha ?? '—'} />
                  <Field label={t('object_modal.field_kpd')} value={`${obj.kpd_design ?? '—'} / ${obj.kpd_actual ?? '—'}`} />
                  <Field
                    label={t('object_modal.field_wear')}
                    value={obj.wear_percent != null ? `${obj.wear_percent}%` : <span className="text-slate-500">{t('common.not_specified')}</span>}
                  />
                  <Field label={t('object_modal.field_condition_source')} value={obj.condition_source || '—'} />
                  <Field label={t('object_modal.field_risk_score')} value={<b>{obj.risk_score}</b>} />
                  <Field label={t('object_modal.field_cadastre')} value={obj.cadastre_number || '—'} />
                  <Field label={t('object_modal.field_gosakt')} value={obj.gosakt_number || '—'} />
                </div>
              )}

              {tab === 'documents' && (
                <div className="flex flex-col items-center justify-center text-center py-12 text-slate-500">
                  <FolderOpen className="w-8 h-8 mb-3" />
                  <p className="font-semibold text-slate-300 mb-1">{t('object_modal.documents_empty_title')}</p>
                  <p className="text-xs max-w-sm">{t('object_modal.documents_empty_desc')}</p>
                </div>
              )}

              {tab === 'history' && (
                <div className="space-y-3">
                  {obj.history.length === 0 && <p className="text-slate-500 text-sm">{t('object_modal.history_empty')}</p>}
                  {obj.history.map((h) => (
                    <div key={h.id} className="flex gap-3 pb-3 border-b border-slate-800/60 last:border-0">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <div className="text-sm">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={h.status} />
                          <span className="text-slate-500 text-xs">{new Date(h.changed_at).toLocaleString()}</span>
                        </div>
                        {h.note && <p className="text-slate-400 text-xs mt-1">{h.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-800 flex gap-2.5 shrink-0">
              <button
                onClick={() => downloadPassport(obj.id, obj.code)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500"
              >
                <Download className="w-3.5 h-3.5" />
                {t('object_modal.download_passport')}
              </button>
              {hasRole('admin', 'inspector') && onEdit && (
                <button
                  onClick={() => onEdit(obj)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {t('common.edit')}
                </button>
              )}
              <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white ml-auto">
                {t('common.close')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
