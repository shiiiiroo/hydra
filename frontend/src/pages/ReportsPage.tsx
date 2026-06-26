import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, ShieldAlert, MapPin, CalendarClock, Download } from 'lucide-react';
import { fetchReportDefinitions, downloadReport, fetchMapPoints } from '../api/resources';
import type { ReportDefinition } from '../types';
import { Spinner } from '../components/Feedback';

const ICONS: Record<string, any> = { summary: FileText, attention: ShieldAlert, district: MapPin, inspection_schedule: CalendarClock };

export default function ReportsPage() {
  const { t } = useTranslation();
  const [reports, setReports] = useState<ReportDefinition[] | null>(null);
  const [anchors, setAnchors] = useState<{ key: string; name: string }[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportDefinitions().then(setReports);
    fetchMapPoints({}).then((points) => {
      const seen = new Map<string, string>();
      points.forEach((p) => { if (p.anchor_key && p.anchor_name) seen.set(p.anchor_key, p.anchor_name); });
      setAnchors(Array.from(seen, ([key, name]) => ({ key, name })).sort((a, b) => a.name.localeCompare(b.name)));
    });
  }, []);

  const handleDownload = async (report: ReportDefinition, format: 'pdf' | 'csv') => {
    if (report.needs_district && !selectedDistrict[report.id]) {
      setError(t('reports_page.district_required'));
      return;
    }
    setError(null);
    setBusy(`${report.id}-${format}`);
    try {
      await downloadReport(report.id, format, selectedDistrict[report.id]);
    } finally {
      setBusy(null);
    }
  };

  if (!reports) return <Spinner />;

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-white">{t('reports_page.title')}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{t('reports_page.subtitle')}</p>
      </div>

      {error && <p className="text-rose-400 text-xs">{error}</p>}

      {reports.map((r) => {
        const Icon = ICONS[r.id] || FileText;
        return (
          <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-white">{t(`reports_page.report_${r.id}_title`)}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{t(`reports_page.report_${r.id}_desc`)}</p>
              <div className="text-[10.5px] text-indigo-400 font-semibold mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> {t('reports_page.live_badge')}
              </div>

              {r.needs_district && (
                <select
                  value={selectedDistrict[r.id] || ''}
                  onChange={(e) => setSelectedDistrict((s) => ({ ...s, [r.id]: e.target.value }))}
                  className="mt-2.5 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white max-w-xs"
                >
                  <option value="">{t('reports_page.select_district')}</option>
                  {anchors.map((a) => (
                    <option key={a.key} value={a.key}>{a.name}</option>
                  ))}
                </select>
              )}

              <div className="flex gap-2 mt-3">
                {r.formats.map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => handleDownload(r, fmt as 'pdf' | 'csv')}
                    disabled={busy === `${r.id}-${fmt}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-50"
                  >
                    <Download className="w-3 h-3" /> {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
