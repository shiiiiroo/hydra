import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { createObject, updateObject } from '../api/resources';
import { apiErrorMessage } from '../api/client';
import type { HydroObjectDetail } from '../types';

interface Props {
  existing?: HydroObjectDetail | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ObjectFormModal({ existing, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    display_name: existing?.display_name ?? '',
    district_raw: existing?.district_raw ?? '',
    water_source: existing?.water_source ?? '',
    commission_year: existing?.commission_year?.toString() ?? '',
    capacity_m3s: existing?.capacity_m3s?.toString() ?? '',
    area_ha: existing?.area_ha?.toString() ?? '',
    wear_percent: existing?.wear_percent?.toString() ?? '',
    condition_source: existing?.condition_source ?? 'удов.',
    significance: existing?.significance ?? 'medium',
    description: existing?.description ?? '',
  });

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    if (!form.display_name.trim()) {
      setError(t('common.required_field'));
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      display_name: form.display_name,
      district_raw: form.district_raw || null,
      water_source: form.water_source || null,
      commission_year: form.commission_year ? parseInt(form.commission_year) : null,
      capacity_m3s: form.capacity_m3s ? parseFloat(form.capacity_m3s) : null,
      area_ha: form.area_ha ? parseFloat(form.area_ha) : null,
      wear_percent: form.wear_percent ? parseFloat(form.wear_percent) : null,
      condition_source: form.condition_source,
      significance: form.significance,
      description: form.description || null,
    };
    try {
      if (existing) {
        await updateObject(existing.id, payload);
      } else {
        await createObject(payload);
      }
      onSaved();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-600';
  const labelCls = 'block text-xs font-semibold text-slate-400 mb-1.5';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900">
          <h2 className="text-base font-bold text-white">
            {existing ? t('objects_page.edit_modal_title') : t('objects_page.add_modal_title')}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500">{t('objects_page.add_modal_note')}</p>

          <div>
            <label className={labelCls}>{t('form.display_name')} *</label>
            <input className={inputCls} value={form.display_name} onChange={(e) => set('display_name', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('form.district')}</label>
              <input className={inputCls} value={form.district_raw} onChange={(e) => set('district_raw', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('form.water_source')}</label>
              <input className={inputCls} value={form.water_source} onChange={(e) => set('water_source', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('form.year')}</label>
              <input type="number" className={inputCls} value={form.commission_year} onChange={(e) => set('commission_year', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('form.capacity')}</label>
              <input type="number" step="0.1" className={inputCls} value={form.capacity_m3s} onChange={(e) => set('capacity_m3s', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('form.area')}</label>
              <input type="number" className={inputCls} value={form.area_ha} onChange={(e) => set('area_ha', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('form.wear')}</label>
              <input type="number" step="0.1" className={inputCls} value={form.wear_percent} onChange={(e) => set('wear_percent', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('form.condition')}</label>
              <select className={inputCls} value={form.condition_source} onChange={(e) => set('condition_source', e.target.value)}>
                <option value="удов.">{t('form.condition_ok')}</option>
                <option value="не удов.">{t('form.condition_bad')}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('form.significance')}</label>
              <select className={inputCls} value={form.significance} onChange={(e) => set('significance', e.target.value)}>
                <option value="high">{t('significance.high')}</option>
                <option value="medium">{t('significance.medium')}</option>
                <option value="low">{t('significance.low')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>{t('form.description')}</label>
            <textarea className={inputCls} rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          {error && <p className="text-rose-400 text-xs">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={submit}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? t('common.saving') : existing ? t('form.save_changes') : t('form.submit')}
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
