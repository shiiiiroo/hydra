import { useTranslation } from 'react-i18next';
import type { Status } from '../types';

const STYLES: Record<Status, string> = {
  ok: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  watch: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
  repair: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  critical: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
};

const DOT: Record<Status, string> = {
  ok: 'bg-emerald-400', watch: 'bg-sky-400', repair: 'bg-orange-400', critical: 'bg-rose-400',
};

export default function StatusBadge({ status, short = false }: { status: Status; short?: boolean }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${STYLES[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${DOT[status]}`} />
      {t(short ? `status_short.${status}` : `status.${status}`)}
    </span>
  );
}
