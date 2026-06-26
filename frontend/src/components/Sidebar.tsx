import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Map, Database, FolderKanban, FileText, BarChart3,
  Droplet, Users, LogOut, Shield,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import clsx from 'clsx';

const LANGS = [
  { code: 'ru', label: 'RU' },
  { code: 'kk', label: 'KK' },
  { code: 'en', label: 'EN' },
] as const;

export default function Sidebar() {
  const { t, i18n } = useTranslation();
  const { user, logout, hasRole } = useAuth();

  const menuItems = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard, end: true },
    { to: '/map', label: t('nav.map'), icon: Map },
    { to: '/objects', label: t('nav.objects'), icon: Database },
    { to: '/categories', label: t('nav.categories'), icon: FolderKanban },
    { to: '/reports', label: t('nav.reports'), icon: FileText },
    { to: '/analytics', label: t('nav.analytics'), icon: BarChart3 },
  ];

  return (
    <aside className="w-64 shrink-0 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 h-screen sticky top-0">
      <div className="h-16 flex items-center gap-2.5 px-4 border-b border-slate-800 bg-slate-950">
        <div className="p-2 bg-indigo-600 rounded-xl">
          <Droplet className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight block text-white">{t('app.name')}</span>
          <span className="text-[10px] text-indigo-400 font-medium block">{t('app.tagline')}</span>
        </div>
      </div>

      <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
              )
            }
          >
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {hasRole('admin') && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              clsx(
                'w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
              )
            }
          >
            <Users className="w-[18px] h-[18px] shrink-0" />
            <span>{t('nav.admin')}</span>
          </NavLink>
        )}
      </nav>

      <div className="p-3 border-t border-slate-800 space-y-3">
        <div className="flex gap-1">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => i18n.changeLanguage(l.code)}
              className={clsx(
                'flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors',
                i18n.language === l.code ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              )}
            >
              {l.label}
            </button>
          ))}
        </div>

        {user && (
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">{user.full_name || user.username}</div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                {t(`role.${user.role}`)}
              </div>
            </div>
            <button onClick={logout} title={t('common.logout')} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
