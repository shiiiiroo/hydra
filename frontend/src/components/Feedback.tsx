import { useTranslation } from 'react-i18next';
import { Loader2, AlertTriangle } from 'lucide-react';

export function Spinner({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-2 text-slate-500 py-16 text-sm">
      <Loader2 className="w-4 h-4 animate-spin" />
      {label ?? t('common.loading')}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-slate-500 py-16 text-sm">
      <AlertTriangle className="w-6 h-6 text-rose-500" />
      <span>{message ?? t('common.error')}</span>
      {onRetry && (
        <button onClick={onRetry} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-white">
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}

export function ConfirmDialog({
  open, message, onConfirm, onCancel,
}: { open: boolean; message: string; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={onCancel}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-slate-200 mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700">
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm} className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500">
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
